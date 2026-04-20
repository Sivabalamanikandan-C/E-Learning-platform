const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    // Stripe
    stripePaymentIntentId: String,
    
    // Razorpay
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    
    // Payment status: pending, completed, failed, cancelled
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    
    paymentMethod: {
      type: String,
      enum: ["stripe", "razorpay"],
      required: true,
    },
    
    errorMessage: String,
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
