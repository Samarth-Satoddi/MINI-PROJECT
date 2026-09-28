const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider",
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "cancelled"],
        default: "pending"
    },
    notes: String
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);