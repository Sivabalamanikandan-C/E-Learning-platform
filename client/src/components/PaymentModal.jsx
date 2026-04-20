import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import axios from "axios";
import "../styles/PaymentModal.css";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_dummy"
);

export default function PaymentModal({
  course,
  student,
  isOpen,
  onClose,
  onPaymentSuccess,
  onPaymentError,
}) {
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [paymentState, setPaymentState] = useState(null);
  const [error, setError] = useState(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    setStripeReady(true);
  }, []);

  if (!isOpen || !course) return null;

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setError(null);
    setPaymentState(null);
  };

  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.Razorpay) {
        setError("Razorpay is not loaded. Please reload the page.");
        setLoading(false);
        return;
      }

      // Validate course object
      if (!course || !course._id) {
        setError("Course information is missing. Please try again.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      const payloadData = {
        courseId: course._id.toString(),
        paymentMethod: "razorpay",
      };

      console.log("Sending payment request with payload:", payloadData);

      // Create payment order
      const orderResponse = await axios.post(
        "http://localhost:5000/api/payment/create-order",
        payloadData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!orderResponse.data.success) {
        console.error("Order creation failed:", orderResponse.data);
        let errorMsg = orderResponse.data.message;
        
        // Improve error message for payment already in progress
        if (errorMsg.includes("Payment already in progress")) {
          errorMsg = "Previous payment is being retried. Please wait a moment...";
        }
        
        // If Razorpay fails, suggest Stripe as alternative
        if (errorMsg.includes("Razorpay") && !errorMsg.includes("already enrolled")) {
          errorMsg += " Would you like to try Stripe instead?";
        }
        
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const { orderId, paymentId, amount, keyId, courseName } =
        orderResponse.data;

      // Open Razorpay Checkout
      const options = {
        key: keyId,
        amount: amount * 100, // Convert to paise
        currency: "INR",
        name: "E-Learn",
        description: `Payment for ${courseName}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await axios.post(
              "http://localhost:5000/api/payment/verify",
              {
                paymentId: paymentId,
                paymentMethod: "razorpay",
                razorpayDetails: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (verifyResponse.data.success) {
              onPaymentSuccess(verifyResponse.data.enrollment);
              onClose();
            } else {
              setError(verifyResponse.data.message);
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            setError(
              err.response?.data?.message || "Payment verification failed"
            );
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: student?.name || "",
          email: student?.email || "",
        },
        theme: {
          color: "#667eea",
        },
        modal: {
          ondismiss: () => {
            console.log("Payment modal dismissed");
            setLoading(false);
          },
        },
        // Enable multiple payment methods to avoid international card restriction
        method: {
          upi: true,
          netbanking: true,
          card: true,
          wallet: true,
          emandate: false,
        },
        error: (errorResponse) => {
          console.error("Razorpay payment error:", errorResponse);
          setLoading(false);
          
          let errorMsg = "Payment failed. Please try again.";
          
          if (errorResponse && errorResponse.error) {
            const error = errorResponse.error;
            
            // Handle specific error reasons
            if (error.reason === "payment_cancelled") {
              errorMsg = "Payment cancelled. Please try again or use a different payment method.";
            } else if (error.reason === "otp_validation_failed" || error.reason === "otp_incorrect") {
              errorMsg = "OTP verification failed. Please check the OTP and try again.";
            } else if (error.reason === "payment_timeout") {
              errorMsg = "Payment timeout. Please try again.";
            } else if (error.reason === "insufficient_funds") {
              errorMsg = "Insufficient funds in your account. Please check your balance.";
            } else if (error.reason === "card_declined") {
              errorMsg = "Your card was declined. Try a different card or payment method.";
            } else if (error.description) {
              errorMsg = error.description;
            } else if (error.reason) {
              errorMsg = error.reason;
            }
            
            // Handle specific error codes
            if (error.code === "BAD_REQUEST_ERROR" && error.reason === "payment_cancelled") {
              errorMsg = "Payment cancelled during verification. Please retry with the correct OTP.";
            } else if (error.code === "BAD_REQUEST_ERROR") {
              errorMsg = "Invalid payment request. Please verify your card details and try again.";
            } else if (error.code === "GATEWAY_ERROR") {
              errorMsg = "Payment gateway error. Please try again or use Stripe as an alternative.";
            }
            
            // Handle international card error
            if (error.description && error.description.includes("international")) {
              errorMsg = `${error.description}. Try using: UPI, Net Banking, or Debit Card instead.`;
            }
          }
          
          setError(errorMsg);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay payment error:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate course object
      if (!course || !course._id) {
        setError("Course information is missing. Please try again.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      const payloadData = {
        courseId: course._id.toString(),
        paymentMethod: "stripe",
      };

      console.log("Sending Stripe payment request with payload:", payloadData);

      // Create payment order
      const orderResponse = await axios.post(
        "http://localhost:5000/api/payment/create-order",
        payloadData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!orderResponse.data.success) {
        console.error("Stripe order creation failed:", orderResponse.data);
        let errorMsg = orderResponse.data.message;
        
        // Improve error message for payment already in progress
        if (errorMsg.includes("Payment already in progress")) {
          errorMsg = "Previous payment is being retried. Please wait a moment...";
        }
        
        setError(errorMsg);
        setLoading(false);
        return;
      }

      setPaymentState({
        clientSecret: orderResponse.data.clientSecret,
        paymentId: orderResponse.data.paymentId,
      });
    } catch (err) {
      console.error("Stripe payment error:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-modal-header">
          <h2>Complete Your Payment</h2>
          <button className="payment-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Course Summary */}
        <div className="payment-course-summary">
          <div className="payment-course-info">
            <h3>{course.title}</h3>
            <p>Instructor: {course.instructor?.name || "Unknown"}</p>
          </div>
          <div className="payment-price-section">
            <p className="payment-price-label">Total Amount</p>
            <p className="payment-price-amount">₹{course.price}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="payment-error-message">
            <p>{error}</p>
            <small style={{ marginTop: "8px", display: "block", opacity: 0.8 }}>
              💡 Tip: You can retry with a different payment method or card
            </small>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="payment-method-selection">
          <label className="payment-method-option">
            <input
              type="radio"
              value="razorpay"
              checked={paymentMethod === "razorpay"}
              onChange={() => handlePaymentMethodChange("razorpay")}
              disabled={loading}
            />
            <span className="payment-method-label">
              <img
                src="https://www.razorpay.com/favicon.ico"
                alt="Razorpay"
                className="payment-method-icon"
              />
              Razorpay
            </span>
          </label>

          {/* <label className="payment-method-option">
            <input
              type="radio"
              value="stripe"
              checked={paymentMethod === "stripe"}
              onChange={() => handlePaymentMethodChange("stripe")}
              disabled={loading}
            />
            <span className="payment-method-label">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/640px-Stripe_Logo%2C_revised_2016.svg.png"
                alt="Stripe"
                className="payment-method-icon"
              />
              Stripe
            </span>
          </label> */}
        </div>

        {/* Stripe Checkout Form */}
        {paymentMethod === "stripe" && paymentState && (
          <div className="payment-stripe-container">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret: paymentState.clientSecret,
                onComplete: async (response) => {
                  try {
                    const token = localStorage.getItem("token");
                    // Verify the payment
                    const verifyResponse = await axios.post(
                      "http://localhost:5000/api/payment/verify",
                      {
                        paymentId: paymentState.paymentId,
                        paymentMethod: "stripe",
                        stripePaymentIntentId: paymentState.clientSecret,
                      },
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );

                    if (verifyResponse.data.success) {
                      onPaymentSuccess(verifyResponse.data.enrollment);
                      onClose();
                    } else {
                      setError(verifyResponse.data.message);
                    }
                  } catch (err) {
                    console.error("Payment verification error:", err);
                    setError("Payment verification failed");
                  }
                },
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}

        {/* Action Buttons */}
        {!paymentState && (
          <div className="payment-actions">
            <button
              className="payment-pay-btn"
              onClick={
                paymentMethod === "razorpay"
                  ? handleRazorpayPayment
                  : handleStripePayment
              }
              disabled={loading}
            >
              {loading ? "Processing..." : `Pay Now (₹${course.price})`}
            </button>
            <button
              className="payment-cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Terms */}
        <div className="payment-terms">
          <p>
            By completing this payment, you agree to our Terms of Service and
            Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
