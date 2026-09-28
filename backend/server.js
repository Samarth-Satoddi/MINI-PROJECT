require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const dns = require("dns");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Provider = require("./models/Provider");
const Booking = require("./models/Booking");
const Review = require("./models/Review");
const { requireAuth, requireRole } = require("./middleware/auth");

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

function requireAdmin(req, res, next) {
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!adminApiKey) {
        return res.status(503).json({ message: "Admin API is not configured" });
    }

    if (req.get("x-admin-key") !== adminApiKey) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    next();
}

app.get("/", (req, res)=>{
    const databaseConnected = mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ready" : "database_disconnected"
    });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, role, providerDetails } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Name, email, password, and role are required." });
        }

        if (!["customer", "provider"].includes(role)) {
            return res.status(400).json({ message: "Role must be either 'customer' or 'provider'." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role
        });

        let provider = null;
        if (role === "provider") {
            const category = providerDetails?.category || "Other";
            const location = providerDetails?.location || "Bangalore";
            const hourlyRate = Number(providerDetails?.hourlyRate) || 0;
            const services = Array.isArray(providerDetails?.services)
                ? providerDetails.services
                : (typeof providerDetails?.services === "string"
                    ? providerDetails.services.split(",").map(s => s.trim()).filter(Boolean)
                    : [category]);
            const availability = Array.isArray(providerDetails?.availability) && providerDetails.availability.length > 0
                ? providerDetails.availability
                : [
                    { date: "2026-10-15", startTime: "09:00", endTime: "11:00", isAvailable: true },
                    { date: "2026-10-16", startTime: "11:00", endTime: "13:00", isAvailable: true },
                    { date: "2026-10-17", startTime: "14:00", endTime: "16:00", isAvailable: true }
                ];

            provider = await Provider.create({
                name: user.name,
                category,
                description: providerDetails?.description || `Professional ${category} service in ${location}.`,
                location,
                phone: providerDetails?.phone || "",
                email: user.email,
                hourlyRate,
                services,
                verified: false,
                verificationStatus: "pending",
                userId: user._id,
                availability
            });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        return res.status(201).json({
            message: "Registration successful.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            provider
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Registration failed." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        let provider = null;
        if (user.role === "provider") {
            provider = await Provider.findOne({ userId: user._id });
            if (!provider) {
                provider = await Provider.findOne({ email: user.email });
                if (provider && !provider.userId) {
                    provider.userId = user._id;
                    await provider.save();
                }
            }
        }

        return res.json({
            message: "Login successful.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            provider
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Login failed." });
    }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-passwordHash");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        let provider = null;
        if (user.role === "provider") {
            provider = await Provider.findOne({ userId: user._id });
            if (!provider) {
                provider = await Provider.findOne({ email: user.email });
            }
        }

        return res.json({ user, provider });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// ==========================================
// PUBLIC PROVIDER ROUTES (Browse & Filter)
// ==========================================

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
});

// ==========================================
// AUTHENTICATED PROVIDER DASHBOARD PROFILE ROUTE
// ==========================================

app.get("/api/providers/me", requireAuth, requireRole("provider"), async (req, res) => {
    try {
        let provider = await Provider.findOne({ userId: req.user.userId });
        if (!provider) {
            const user = await User.findById(req.user.userId);
            if (user) {
                provider = await Provider.findOne({ email: user.email });
                if (provider && !provider.userId) {
                    provider.userId = user._id;
                    await provider.save();
                }
            }
        }

        if (!provider) {
            return res.status(404).json({ message: "No provider profile linked to this user." });
        }

        return res.json(provider);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

app.get("/api/providers/:id", async (req, res)=>{
    const provider = await Provider.findOne({ _id: req.params.id, verified: true });

    if (!provider) {
        return res.status(404).json({
            message: "Provider Not Found"
        });
    }

    res.json(provider);
});

app.post("/api/providers", async (req, res)=>{
    const provider = await Provider.create({
        ...req.body,
        verified: false,
        verificationStatus: "pending"
    });

    res.json({
        message: "Provider profile submitted for verification",
        provider
    });
});

app.put("/api/providers/:id", requireAuth, requireRole("provider"), async (req, res)=>{
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    if (provider.userId && provider.userId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden. You can only update your own provider profile." });
    }

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

    const updated = await Provider.findByIdAndUpdate(
        req.params.id,
        updates,
        { returnDocument: 'after', runValidators: true }
    );

    res.json({
        message: "Provider Profile Updated Successfully",
        provider: updated
    });
});

app.delete("/api/providers/:id", requireAuth, requireRole("provider"), async (req, res) => {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    if (provider.userId && provider.userId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden. You can only delete your own provider profile." });
    }

    await Provider.findByIdAndDelete(req.params.id);
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

app.put("/api/providers/:id/availability", requireAuth, requireRole("provider"), async (req, res)=>{
    if (!Array.isArray(req.body.availability)) {
        return res.status(400).json({ message: "Availability must be an array" });
    }

    const provider = await Provider.findById(req.params.id);
    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    if (provider.userId && provider.userId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden. You can only update your own availability." });
    }

    const updated = await Provider.findByIdAndUpdate(
        req.params.id,
        { availability: req.body.availability },
        { returnDocument: 'after', runValidators: true }
    );

    res.json({
        message: "Availability Updated Successfully",
        availability: updated.availability
    });
});

// ==========================================
// REVIEWS ROUTES
// ==========================================

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

app.post("/api/providers/:id/reviews", requireAuth, requireRole("customer"), async (req, res)=>{
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
        customer: req.user.userId,
        status: "completed"
    });

    if (!booking) {
        return res.status(400).json({
            message: "A completed booking belonging to your account is required to leave a review"
        });
    }

    const review = await Review.create({
        provider: provider._id,
        booking: booking._id,
        reviewerName: req.body.reviewerName || req.user.name || "Customer",
        rating: req.body.rating,
        comment: req.body.comment
    });

    res.status(201).json({
        message: "Review Added Successfully",
        review
    });
});

// ==========================================
// BOOKINGS ROUTES (PROTECTED)
// ==========================================

app.get("/api/bookings", requireAuth, async (req, res)=>{
    try {
        if (req.user.role === "customer") {
            const bookings = await Booking.find({ customer: req.user.userId })
                .populate("provider", "name category location hourlyRate phone email");
            return res.json(bookings);
        }

        if (req.user.role === "provider") {
            const provider = await Provider.findOne({ userId: req.user.userId });
            if (!provider) {
                return res.json([]);
            }
            const bookings = await Booking.find({ provider: provider._id })
                .populate("provider", "name category location");
            return res.json(bookings);
        }

        return res.status(403).json({ message: "Invalid role." });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

app.post("/api/bookings", requireAuth, requireRole("customer"), async (req, res)=>{
    const { providerId, date, startTime, endTime, service, notes, customerName, customerEmail } = req.body;
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
        { returnDocument: 'after' }
    );

    if (!reservedProvider) {
        return res.status(409).json({ message: "This time is not available" });
    }

    try {
        const user = await User.findById(req.user.userId);
        const booking = await Booking.create({
            provider: provider._id,
            customer: req.user.userId,
            customerName: customerName || user?.name || "Customer",
            customerEmail: customerEmail || user?.email || "customer@example.com",
            service: service || provider.category,
            date,
            startTime,
            endTime,
            notes: notes || "",
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

app.put("/api/bookings/:id/status", requireAuth, async (req, res)=>{
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

    if (req.user.role === "customer") {
        if (!booking.customer || booking.customer.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Forbidden. You can only cancel your own bookings." });
        }
        if (req.body.status !== "cancelled") {
            return res.status(403).json({ message: "Customers are only permitted to cancel bookings." });
        }
    } else if (req.user.role === "provider") {
        const provider = await Provider.findOne({ userId: req.user.userId });
        if (!provider || booking.provider.toString() !== provider._id.toString()) {
            return res.status(403).json({ message: "Forbidden. You can only manage bookings for your own provider profile." });
        }
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

// ==========================================
// ADMIN VERIFICATION ROUTES
// ==========================================

app.get("/api/admin/providers", requireAdmin, async (req, res)=>{
    const status = req.query.status || "pending";
    const providers = await Provider.find({ verificationStatus: status });
    res.json(providers);
});

app.put("/api/admin/providers/:id/verification", requireAdmin, async (req, res)=>{
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const provider = await Provider.findByIdAndUpdate(
        req.params.id,
        { verificationStatus: status, verified: status === "approved" },
        { returnDocument: 'after', runValidators: true }
    );

    if (!provider) {
        return res.status(404).json({ message: "Provider Not Found" });
    }

    res.json({ message: "Provider Verification Updated", provider });
});

app.listen(5000, ()=>{
    console.log("Server is running on port 5000");
});