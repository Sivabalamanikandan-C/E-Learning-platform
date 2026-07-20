const express = require("express");
const router = express.Router();
const stripe = require("stripe");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { authenticate, authorizeStudent } = require("../middleware/auth");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// Initialize Stripe and Razorpay
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

// Validate Razorpay configuration
const validateRazorpayKeys = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  // Check if keys are set and not placeholder values
  if (!keyId || !keySecret || keyId === "rzp_test_dummy" || keySecret === "test_dummy") {
    console.warn("⚠️ WARNING: Razorpay keys are not properly configured!");
    console.warn("Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
    return false;
  }
  
  // Validate key format (test keys start with rzp_test_, live keys start with rzp_live_)
  if (!keyId.match(/^rzp_(test|live)_/)) {
    console.warn("⚠️ WARNING: RAZORPAY_KEY_ID format is invalid!");
    return false;
  }
  
  return true;
};

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "test_dummy",
});

const isRazorpayConfigured = validateRazorpayKeys();

/**
 * POST /api/payment/create-order
 * Create a payment order (either Stripe or Razorpay)
 * Requires authentication
 */
router.post("/create-order", authenticate, authorizeStudent, async (req, res) => {
  try {
    let { courseId, paymentMethod } = req.body;
    const studentId = req.user._id;

    // Convert courseId to string if it's an object
    if (courseId && typeof courseId === 'object' && courseId._id) {
      courseId = courseId._id;
    }
    if (courseId) {
      courseId = courseId.toString();
    }

    console.log("Create order request:", { courseId, paymentMethod, studentId, bodyReceived: req.body });

    // Validate inputs
    if (!courseId || !paymentMethod) {
      console.log("Missing required fields:", { courseId, paymentMethod });
      return res.status(400).json({
        success: false,
        message: "Course ID and payment method are required",
      });
    }

    if (!["stripe", "razorpay"].includes(paymentMethod)) {
      console.log("Invalid payment method:", paymentMethod);
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // Clean up stale pending payments (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stalePendingPayments = await Payment.find({
      student: studentId,
      course: courseId,
      status: "pending",
      createdAt: { $lt: thirtyMinutesAgo },
    });

    if (stalePendingPayments.length > 0) {
      console.log("Removing stale pending payments:", stalePendingPayments.map(p => p._id));
      await Payment.deleteMany({
        student: studentId,
        course: courseId,
        status: "pending",
        createdAt: { $lt: thirtyMinutesAgo },
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    // Check if payment is already pending - if so, update it instead of rejecting
    let payment = await Payment.findOne({
      student: studentId,
      course: courseId,
      status: "pending",
    });

    const amount = course.price * 100; // Convert to smallest currency unit (paise for INR)

    if (payment) {
      // Update existing pending payment with new method and details
      console.log("Updating existing pending payment:", payment._id);
      payment.paymentMethod = paymentMethod;
      payment.createdAt = new Date(); // Reset timestamp
    } else {
      // Create new payment record
      payment = new Payment({
        student: studentId,
        course: courseId,
        amount: course.price,
        currency: "INR",
        paymentMethod,
        status: "pending",
      });
    }

    if (paymentMethod === "stripe") {
      // Create Stripe Payment Intent
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amount,
        currency: "inr",
        metadata: {
          paymentId: payment._id.toString(),
          studentId: studentId.toString(),
          courseId: courseId.toString(),
        },
      });

      payment.stripePaymentIntentId = paymentIntent.id;
      await payment.save();

      return res.status(200).json({
        success: true,
        paymentMethod: "stripe",
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id,
        amount: course.price,
        courseName: course.title,
      });
    } else if (paymentMethod === "razorpay") {
      // Check if Razorpay is properly configured
      if (!isRazorpayConfigured) {
        console.error("Razorpay is not properly configured");
        return res.status(500).json({
          success: false,
          message: "Razorpay payment gateway is not available at the moment. Please try Stripe or contact support.",
          error: "Razorpay configuration error",
        });
      }

      // Create Razorpay Order
      try {
        const order = await razorpayInstance.orders.create({
          amount: amount,
          currency: "INR",
          receipt: `order_${payment._id}`,
          notes: {
            paymentId: payment._id.toString(),
            studentId: studentId.toString(),
            courseId: courseId.toString(),
          },
        });

        payment.razorpayOrderId = order.id;
        await payment.save();

        return res.status(200).json({
          success: true,
          paymentMethod: "razorpay",
          orderId: order.id,
          paymentId: payment._id,
          amount: course.price,
          courseName: course.title,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      } catch (razorpayError) {
        console.error("Razorpay error:", razorpayError);
        payment.status = "failed";
        payment.errorMessage = razorpayError.message;
        await payment.save();

        // Provide specific error messages for common Razorpay issues
        let userMessage = "Failed to create Razorpay order";
        
        if (razorpayError.statusCode === 401 || razorpayError.statusCode === 403) {
          userMessage = "Invalid Razorpay credentials. Please contact support.";
        } else if (razorpayError.statusCode === 500) {
          userMessage = "Razorpay service error. Please try again later or use Stripe.";
        } else if (razorpayError.message.includes("ERR_INVALID_KEY")) {
          userMessage = "Razorpay API key is invalid. Please contact support.";
        }

        return res.status(500).json({
          success: false,
          message: userMessage,
          error: razorpayError.message,
        });
      }
    }
  } catch (err) {
    console.error("Error creating payment order:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: err.message,
    });
  }
});

/**
 * POST /api/payment/verify
 * Verify payment and create enrollment
 * Requires authentication
 */
router.post("/verify", authenticate, authorizeStudent, async (req, res) => {
  try {
    const { paymentId, paymentMethod, stripePaymentIntentId, razorpayDetails } =
      req.body;
    const studentId = req.user._id;

    if (!paymentId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and method are required",
      });
    }

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Verify student owns this payment
    if (payment.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    let isPaymentValid = false;

    if (paymentMethod === "stripe") {
      // Verify Stripe Payment Intent
      try {
        const paymentIntent = await stripeClient.paymentIntents.retrieve(
          stripePaymentIntentId
        );

        if (paymentIntent.status === "succeeded") {
          isPaymentValid = true;
          payment.stripePaymentIntentId = paymentIntent.id;
        } else {
          payment.status = "failed";
          payment.errorMessage = `Payment not succeeded. Status: ${paymentIntent.status}`;
        }
      } catch (stripeError) {
        console.error("Stripe verification error:", stripeError);
        payment.status = "failed";
        payment.errorMessage = stripeError.message;
      }
    } else if (paymentMethod === "razorpay") {
      // Verify Razorpay Payment Signature
      if (!razorpayDetails || !razorpayDetails.razorpay_payment_id) {
        return res.status(400).json({
          success: false,
          message: "Razorpay payment details are required",
        });
      }

      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
        razorpayDetails;

      console.log("Verifying Razorpay signature:", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: razorpay_signature ? "provided" : "missing",
      });

      try {
        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const secret = process.env.RAZORPAY_KEY_SECRET || "test_dummy";
        const expectedSignature = crypto
          .createHmac("sha256", secret)
          .update(body)
          .digest("hex");

        console.log("Signature verification:", {
          expectedSignature,
          providedSignature: razorpay_signature,
          match: expectedSignature === razorpay_signature,
        });

        if (expectedSignature === razorpay_signature) {
          isPaymentValid = true;
          payment.razorpayPaymentId = razorpay_payment_id;
          payment.razorpaySignature = razorpay_signature;
          console.log("✅ Razorpay signature verified successfully");
        } else {
          payment.status = "failed";
          payment.errorMessage = "Invalid payment signature. Please contact support.";
          console.error("❌ Razorpay signature mismatch!");
        }
      } catch (razorpayError) {
        console.error("Razorpay verification error:", razorpayError);
        payment.status = "failed";
        payment.errorMessage = razorpayError.message;
      }
    }

    if (!isPaymentValid) {
      await payment.save();
      return res.status(400).json({
        success: false,
        message: payment.errorMessage || "Payment verification failed",
      });
    }

    // Payment is valid - mark as completed
    payment.status = "completed";
    payment.completedAt = new Date();
    await payment.save();
    console.log("Payment marked as completed:", paymentId);

    // Create enrollment
    try {
      console.log("Creating enrollment for student:", studentId, "course:", payment.course);
      
      // Check if enrollment already exists
      const existingEnrollment = await Enrollment.findOne({
        student: studentId,
        course: payment.course,
      });

      if (existingEnrollment) {
        console.log("Enrollment already exists:", existingEnrollment._id);
        return res.status(200).json({
          success: true,
          message: "Already enrolled in this course",
          enrollment: {
            _id: existingEnrollment._id,
            courseId: existingEnrollment.course,
            studentId: existingEnrollment.student,
            status: existingEnrollment.status,
            progress: existingEnrollment.progress,
          },
        });
      }

      const enrollment = new Enrollment({
        student: studentId,
        course: payment.course,
        payment: paymentId,
        status: "active",
        progress: 0,
      });

      await enrollment.save();
      console.log("Enrollment created successfully:", enrollment._id);

      res.status(200).json({
        success: true,
        message: "Payment verified and enrollment created",
        enrollment: {
          _id: enrollment._id,
          courseId: enrollment.course,
          studentId: enrollment.student,
          status: enrollment.status,
          progress: enrollment.progress,
        },
      });
    } catch (enrollmentError) {
      console.error("Error creating enrollment:", enrollmentError);
      
      // Check if it's a duplicate key error
      if (enrollmentError.code === 11000) {
        console.log("Enrollment already exists (duplicate key error)");
        const existingEnrollment = await Enrollment.findOne({
          student: studentId,
          course: payment.course,
        });
        
        if (existingEnrollment) {
          return res.status(200).json({
            success: true,
            message: "Already enrolled in this course",
            enrollment: {
              _id: existingEnrollment._id,
              courseId: existingEnrollment.course,
              studentId: existingEnrollment.student,
              status: existingEnrollment.status,
              progress: existingEnrollment.progress,
            },
          });
        }
      }

      res.status(500).json({
        success: false,
        message: "Payment verified but enrollment creation failed",
        error: enrollmentError.message,
      });
    }
  } catch (err) {
    console.error("Error verifying payment:", err);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: err.message,
    });
  }
});

/**
 * GET /api/payment/:paymentId
 * Get payment details
 * Requires authentication
 */
router.get("/:paymentId", authenticate, authorizeStudent, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const studentId = req.user._id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Verify student owns this payment
    if (payment.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
      },
    });
  } catch (err) {
    console.error("Error fetching payment:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: err.message,
    });
  }
});

/**
 * POST /api/payment/cancel
 * Mark a payment as cancelled (user cancelled during auth)
 * Requires authentication
 */
router.post("/cancel", authenticate, authorizeStudent, async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    const studentId = req.user._id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find and update payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Verify student owns this payment
    if (payment.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Only cancel if payment is still pending
    if (payment.status === "pending") {
      payment.status = "cancelled";
      payment.errorMessage = reason || "User cancelled payment";
      await payment.save();
      console.log("Payment cancelled:", paymentId, "Reason:", reason);

      return res.status(200).json({
        success: true,
        message: "Payment cancelled successfully. You can retry anytime.",
      });
    } else if (payment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed. Check your courses.",
      });
    } else if (payment.status === "cancelled") {
      return res.status(200).json({
        success: true,
        message: "Payment already cancelled. You can retry.",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel payment with status: ${payment.status}`,
      });
    }
  } catch (err) {
    console.error("Error cancelling payment:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cancel payment",
      error: err.message,
    });
  }
});

module.exports = router;
