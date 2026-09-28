const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider",
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        unique: true
    },
    reviewerName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);