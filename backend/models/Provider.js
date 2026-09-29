const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema({
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true }
});

const providerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: String,
    location: { type: String, required: true, trim: true },
    phone: String,
    email: String,
    hourlyRate: { type: Number, min: 0 },
    services: [String],
    verified: { type: Boolean, default: false },
    verificationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    availability: [availabilitySchema]
}, { timestamps: true });

module.exports = mongoose.model("Provider", providerSchema);