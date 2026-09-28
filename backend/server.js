require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const dns = require("dns");
const Provider = require("./models/Provider");
const Booking = require("./models/Booking");
const Review = require("./models/Review");

app.use(cors());
app.use(express.json());
dns.setServers(['8.8.8.8']);

mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    console.log("MongoDB Connected Successfully!");
}).catch((error)=>{
    console.log("MongoDB Connection Error: ", error);
});

app.use("/api", (req, res, next)=>{
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: "Database is not connected"
        });
    }

    next();
});

app.get("/", (req, res)=>{
    const databaseConnected = mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ready" : "database_disconnected"
    });
})
app.get("/api/providers", async (req, res)=>{
    const filters = { verified: true };

    if (req.query.category) {
        filters.category = new RegExp(`^${req.query.category}$`, "i");
    }

    if (req.query.location) {
        filters.location = new RegExp(`^${req.query.location}$`, "i");
    }

    const providers = await Provider.find(filters);
    const ratings = await Review.aggregate([
        { $match: { provider: { $in: providers.map(provider => provider._id) } } },
        {
            $group: {
                _id: "$provider",
                averageRating: { $avg: "$rating" },
                reviewCount: { $sum: 1 }
            }
        }
    ]);
    const ratingsByProvider = new Map(
        ratings.map(rating => [rating._id.toString(), rating])
    );

    res.json(providers.map(provider => ({
        ...provider.toObject(),
        averageRating: ratingsByProvider.get(provider._id.toString())?.averageRating || 0,
        reviewCount: ratingsByProvider.get(provider._id.toString())?.reviewCount || 0
    })));
})

app.get("/api/providers/:id", async (req, res)=>{
    const provider = await Provider.findOne({ _id: req.params.id, verified: true });

    if (!provider) {
        return res.status(404).json({
            message: "Provider Not Found"
        });
    }

    res.json(provider);
})

app.post("/api/providers", async (req, res)=>{
    const provider = await Provider.create({
        ...req.body,
        verified: true,
        verificationStatus: "approved"
    });

    res.json({
        message: "Provider profile created successfully",
        provider
    });
});

app.put("/api/providers/:id", async (req, res)=>{
    const allowedFields = [
        "name", "category", "description", "location", "phone", "email",
        "hourlyRate", "services"
    ];
    const updates = Object.fromEntries(
        allowedFields
            .filter(field => req.body[field] !== undefined)
            .map(field => [field, req.body[field]])
    );
    if (Array.isArray(req.body.availability)) {
        updates.availability = req.body.availability;
    }
    const provider = await Provider.findByIdAndUpdate(
        req.params.id,
        updates,
        { returnDocument: 'after', runValidators: true }
    );

    if (!provider) {
        return res.status(404).json({
            message: "Provider Not Found"
        });
    }

    res.json({
        message: "Provider Profile Updated Successfully",
        provider
    });
});

app.delete("/api/providers/:id", async (req, res) => {
    const provider = await Provider.findByIdAndDelete(req.params.id);

    if (!provider) {
        return res.status(404).json({
            message: "Provider Not Found"
        });
    }

    await Booking.deleteMany({ provider: req.params.id });
    await Review.deleteMany({ provider: req.params.id });

    res.json({
        message: "Provider Deleted Successfully",
        id: req.params.id
    });
});

app.get("/api/providers/:id/availability", async (req, res)=>{
    const provider = await Provider.findOne(
        { _id: req.params.id, verified: true },
        "availability"
    );

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    res.json(provider.availability);
});

app.put("/api/providers/:id/availability", async (req, res)=>{
    if (!Array.isArray(req.body.availability)) {
        return res.status(400).json({ message: "Availability must be an array" });
    }

    const provider = await Provider.findByIdAndUpdate(
        req.params.id,
        { availability: req.body.availability },
        { new: true, runValidators: true }
    );

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    res.json({
        message: "Availability Updated Successfully",
        availability: provider.availability
    });
});

app.get("/api/providers/:id/reviews", async (req, res)=>{
    const provider = await Provider.findOne(
        { _id: req.params.id, verified: true },
        "_id"
    );

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    const reviews = await Review.find({ provider: provider._id }).sort({ createdAt: -1 });
    res.json(reviews);
});

app.post("/api/providers/:id/reviews", async (req, res)=>{
    const provider = await Provider.findOne(
        { _id: req.params.id, verified: true },
        "_id"
    );

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    const booking = await Booking.findOne({
        _id: req.body.bookingId,
        provider: provider._id,
        status: "completed"
    });

    if (!booking) {
        return res.status(400).json({
            message: "A completed booking is required to leave a review"
        });
    }

    const review = await Review.create({
        provider: provider._id,
        booking: booking._id,
        reviewerName: req.body.reviewerName,
        rating: req.body.rating,
        comment: req.body.comment
    });

    res.status(201).json({
        message: "Review Added Successfully",
        review
    });
});

app.get("/api/bookings", async (req, res)=>{
    const filters = {};

    if (req.query.providerId) filters.provider = req.query.providerId;
    if (req.query.customerEmail) filters.customerEmail = req.query.customerEmail;

    const bookings = await Booking.find(filters).populate("provider", "name category location");
    res.json(bookings);
});

app.post("/api/bookings", async (req, res)=>{
    const { providerId, date, startTime, endTime } = req.body;
    const provider = await Provider.findOne({ _id: providerId, verified: true });

    if (!provider) {
        return res.status(404).json({ message: "Verified Provider Not Found" });
    }

    const conflictingBooking = await Booking.findOne({
        provider: provider._id,
        date,
        status: { $in: ["pending", "confirmed"] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
    });

    if (conflictingBooking) {
        return res.status(409).json({ message: "This time is already booked" });
    }

    const reservedProvider = await Provider.findOneAndUpdate(
        {
            _id: provider._id,
            availability: { $elemMatch: { date, startTime, endTime, isAvailable: true } }
        },
        { $set: { "availability.$.isAvailable": false } },
        { new: true }
    );

    if (!reservedProvider) {
        return res.status(409).json({ message: "This time is not available" });
    }

    try {
        const booking = await Booking.create({
            ...req.body,
            provider: provider._id,
            status: "pending"
        });

        return res.status(201).json({
            message: "Booking Created Successfully",
            booking
        });
    } catch (error) {
        await Provider.updateOne(
            { _id: provider._id, "availability.date": date, "availability.startTime": startTime, "availability.endTime": endTime },
            { $set: { "availability.$.isAvailable": true } }
        );
        throw error;
    }
});

app.put("/api/bookings/:id/status", async (req, res)=>{
    const allowedStatuses = ["confirmed", "completed", "cancelled"];

    if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid booking status" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ message: "Booking Not Found" });
    }

    if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Cancelled bookings cannot be changed" });
    }

    booking.status = req.body.status;
    await booking.save();

    if (booking.status === "cancelled") {
        await Provider.updateOne(
            { _id: booking.provider, "availability.date": booking.date, "availability.startTime": booking.startTime, "availability.endTime": booking.endTime },
            { $set: { "availability.$.isAvailable": true } }
        );
    }

    res.json({ message: "Booking Status Updated Successfully", booking });
});

app.listen(5000, ()=>{
    console.log("Server is running on port 5000");
})