const mongoose = require("mongoose");

const suspensionInquirySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  userRole: {
    type: String,
    enum: ["Student", "Instructor"],
    required: false,
  },
  message: {
    type: String,
    default: "",
    required: true,
  },
  adminReply: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "replied"],
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("SuspensionInquiry", suspensionInquirySchema);
