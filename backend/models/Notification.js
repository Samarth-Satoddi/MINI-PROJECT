const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider",
        required: true,
        index: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true
    },
    type: {
        type: String,
        default: "NEW_BOOKING"
    },
    title: {
        type: String,
        required: true,
        default: "New Booking Received"
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        customerName: { type: String, default: "" },
        service: { type: String, default: "" },
        date: { type: String, default: "" },
        startTime: { type: String, default: "" },
        endTime: { type: String, default: "" },
        bookingStatus: { type: String, default: "pending" },
        notes: { type: String, default: "" }
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
