const dns = require("dns");
dns.setServers(["8.8.8.8"]);
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Provider = require("./models/Provider");
const Booking = require("./models/Booking");
const Review = require("./models/Review");

dotenv.config();

const API_BASE = "http://localhost:5000";

const results = {
  customerRegister: "PENDING",
  customerLogin: "PENDING",
  providerRegister: "PENDING",
  providerLogin: "PENDING",
  tokenGenerated: "PENDING",
  validTokenAccepted: "PENDING",
  missingTokenRejected: "PENDING",
  invalidTokenRejected: "PENDING",
  expiredTokenRejected: "PENDING",
  customerAccessProviderApi: "PENDING",
  providerAccessCustomerApi: "PENDING",
  findServicesWithoutLogin: "PENDING",
  providerProfileWithoutLogin: "PENDING",
  customerLoggedInBooking: "PENDING",
  customerNotLoggedInBooking: "PENDING",
  customerOwnBookingsOnly: "PENDING",
  providerOwnBookingsOnly: "PENDING",
  reviewAuthCustomerOnly: "PENDING",
  reviewCompletedBookingRequired: "PENDING",
  existingReviewValidationWorks: "PENDING",
  mongoAtlasConnection: "PENDING",
  usersCollection: "PENDING",
  existingProvidersPreserved: "PENDING",
  bookingsPreserved: "PENDING",
  reviewsPreserved: "PENDING",
  adminApproval: "PENDING",
};

async function runTests() {
  console.log("=== STARTING FULL AUTH & FUNCTIONALITY TEST SUITE ===");

  // 1. Database Connection & Initial Counts
  await mongoose.connect(process.env.MONGODB_URI);
  results.mongoAtlasConnection = "PASS";
  console.log("✓ MongoDB Connected");

  const providerCountBefore = await Provider.countDocuments();
  const bookingsCountBefore = await Booking.countDocuments();
  const reviewsCountBefore = await Review.countDocuments();
  console.log(`Provider count BEFORE: ${providerCountBefore}`);
  console.log(`Bookings count BEFORE: ${bookingsCountBefore}`);
  console.log(`Reviews count BEFORE: ${reviewsCountBefore}`);

  // Clean up any test users and bookings from previous runs
  await User.deleteMany({ email: { $in: ["testcustomer@example.com", "testprovider@example.com", "othercust@example.com"] } });
  await Provider.deleteMany({ email: "testprovider@example.com" });
  await Booking.deleteMany({ customerEmail: { $in: ["testcustomer@example.com", "othercust@example.com"] } });

  // 2. Customer Registration
  const custRegRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Customer",
      email: "testcustomer@example.com",
      password: "TestCustomer123!",
      role: "customer",
    }),
  });
  const custRegData = await custRegRes.json();
  if (custRegRes.status === 201 && custRegData.token && custRegData.user?.role === "customer") {
    results.customerRegister = "PASS";
    console.log("✓ Customer Registration: PASS");
  } else {
    results.customerRegister = "FAIL";
    console.error("✗ Customer Registration failed:", custRegData);
  }

  // 3. Customer Login
  const custLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "testcustomer@example.com",
      password: "TestCustomer123!",
    }),
  });
  const custLoginData = await custLoginRes.json();
  let customerToken = custLoginData.token;
  let customerUserId = custLoginData.user?._id;
  if (custLoginRes.status === 200 && customerToken) {
    results.customerLogin = "PASS";
    results.tokenGenerated = "PASS";
    console.log("✓ Customer Login: PASS");
  } else {
    results.customerLogin = "FAIL";
    console.error("✗ Customer Login failed:", custLoginData);
  }

  // 4. Provider Registration
  const provRegRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Provider",
      email: "testprovider@example.com",
      password: "TestProvider123!",
      role: "provider",
      category: "Electrician",
      state: "Karnataka",
      city: "Bangalore",
      experienceYears: 5,
      pricePerHour: 450,
      description: "Professional electrician with 5 years experience.",
    }),
  });
  const provRegData = await provRegRes.json();
  if (provRegRes.status === 201 && provRegData.token && provRegData.user?.role === "provider" && provRegData.provider?.verificationStatus === "pending") {
    results.providerRegister = "PASS";
    console.log("✓ Provider Registration (Pending Approval): PASS");
  } else {
    results.providerRegister = "FAIL";
    console.error("✗ Provider Registration failed:", provRegData);
  }

  // 5. Provider Login
  const provLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "testprovider@example.com",
      password: "TestProvider123!",
    }),
  });
  const provLoginData = await provLoginRes.json();
  let providerToken = provLoginData.token;
  let providerProfile = provLoginData.provider;
  if (provLoginRes.status === 200 && providerToken && provLoginData.user?.role === "provider") {
    results.providerLogin = "PASS";
    console.log("✓ Provider Login: PASS");
  } else {
    results.providerLogin = "FAIL";
    console.error("✗ Provider Login failed:", provLoginData);
  }

  // 6. Token Verification Tests
  // 6a. Valid token
  const meRes = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (meRes.status === 200) {
    results.validTokenAccepted = "PASS";
    console.log("✓ Valid Token Accepted: PASS");
  } else {
    results.validTokenAccepted = "FAIL";
  }

  // 6b. Missing token
  const noTokenRes = await fetch(`${API_BASE}/api/auth/me`);
  if (noTokenRes.status === 401) {
    results.missingTokenRejected = "PASS";
    console.log("✓ Missing Token Rejected: PASS");
  } else {
    results.missingTokenRejected = "FAIL";
  }

  // 6c. Invalid token
  const badTokenRes = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: "Bearer bad.token.value" },
  });
  if (badTokenRes.status === 401) {
    results.invalidTokenRejected = "PASS";
    console.log("✓ Invalid Token Rejected: PASS");
  } else {
    results.invalidTokenRejected = "FAIL";
  }

  // 6d. Expired token
  const expiredSecret = process.env.JWT_SECRET || "fallback_secret";
  const expiredToken = jwt.sign({ userId: customerUserId, role: "customer" }, expiredSecret, { expiresIn: "0s" });
  const expiredRes = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  if (expiredRes.status === 401) {
    results.expiredTokenRejected = "PASS";
    console.log("✓ Expired Token Rejected: PASS");
  } else {
    results.expiredTokenRejected = "FAIL";
  }

  // 7. Role-Based Access Control
  // Customer accessing provider-only endpoint
  const custToProvRes = await fetch(`${API_BASE}/api/providers/me`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (custToProvRes.status === 403) {
    results.customerAccessProviderApi = "PASS";
    console.log("✓ Customer Accessing Provider API: REJECTED (403 Forbidden) PASS");
  } else {
    results.customerAccessProviderApi = "FAIL";
  }

  // Provider accessing customer-only booking endpoint
  const provToCustRes = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      providerId: providerProfile?._id,
      service: "Electrician",
      customerName: "Fake Customer",
      customerEmail: "fake@example.com",
      date: "2026-10-01",
      startTime: "10:00",
      endTime: "11:00",
    }),
  });
  if (provToCustRes.status === 403) {
    results.providerAccessCustomerApi = "PASS";
    console.log("✓ Provider Accessing Customer API: REJECTED (403 Forbidden) PASS");
  } else {
    results.providerAccessCustomerApi = "FAIL";
  }

  // 8. Public Endpoints
  const publicProvidersRes = await fetch(`${API_BASE}/api/providers`);
  const publicProviders = await publicProvidersRes.json();
  if (publicProvidersRes.status === 200 && Array.isArray(publicProviders) && publicProviders.length > 0) {
    results.findServicesWithoutLogin = "PASS";
    console.log(`✓ Find Services without login: PASS (${publicProviders.length} providers returned)`);
  } else {
    results.findServicesWithoutLogin = "FAIL";
  }

  const sampleProviderId = publicProviders[0]._id;
  const publicProfileRes = await fetch(`${API_BASE}/api/providers/${sampleProviderId}`);
  if (publicProfileRes.status === 200) {
    results.providerProfileWithoutLogin = "PASS";
    console.log("✓ Provider Profile without login: PASS");
  } else {
    results.providerProfileWithoutLogin = "FAIL";
  }

  // Find an approved provider that has an available slot that is NOT booked
  const providersWithSlots = await Provider.find({
    verified: true,
    verificationStatus: "approved",
    "availability.isAvailable": true,
  });

  let providerWithSlot = null;
  let testSlot = null;

  for (const prov of providersWithSlots) {
    for (const slot of prov.availability) {
      if (slot.isAvailable) {
        const booked = await Booking.findOne({
          provider: prov._id,
          date: slot.date,
          status: { $in: ["pending", "confirmed"] },
          startTime: { $lt: slot.endTime },
          endTime: { $gt: slot.startTime },
        });
        if (!booked) {
          providerWithSlot = prov;
          testSlot = slot;
          break;
        }
      }
    }
    if (providerWithSlot) break;
  }

  // 9. Booking Flow & Customer Isolation
  // Unauthenticated booking
  const unauthBookingRes = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      providerId: providerWithSlot._id,
      service: providerWithSlot.category,
      customerName: "Anonymous",
      customerEmail: "anon@example.com",
      date: testSlot.date,
      startTime: testSlot.startTime,
      endTime: testSlot.endTime,
    }),
  });
  if (unauthBookingRes.status === 401) {
    results.customerNotLoggedInBooking = "PASS";
    console.log("✓ Customer not logged in booking: LOGIN REQUIRED (401) PASS");
  } else {
    results.customerNotLoggedInBooking = "FAIL";
  }

  // Authenticated customer booking
  const authBookingRes = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      providerId: providerWithSlot._id,
      service: providerWithSlot.category,
      customerName: "Test Customer",
      customerEmail: "testcustomer@example.com",
      customerPhone: "9876543210",
      date: testSlot.date,
      startTime: testSlot.startTime,
      endTime: testSlot.endTime,
    }),
  });
  const authBookingData = await authBookingRes.json();
  let createdBookingId = authBookingData.booking?._id || authBookingData._id;
  if (authBookingRes.status === 201 && createdBookingId) {
    results.customerLoggedInBooking = "PASS";
    console.log("✓ Customer logged in booking: WORKS PASS");
  } else {
    results.customerLoggedInBooking = "FAIL";
    console.error("✗ Booking creation failed:", authBookingData);
  }

  // Customer booking data isolation: Create a second customer and verify neither can see each other's bookings
  const cust2Res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Other Customer",
      email: "othercust@example.com",
      password: "OtherCust123!",
      role: "customer",
    }),
  });
  const cust2Data = await cust2Res.json();
  const cust2Token = cust2Data.token;

  const cust1BookingsRes = await fetch(`${API_BASE}/api/bookings`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const cust1Bookings = await cust1BookingsRes.json();

  const cust2BookingsRes = await fetch(`${API_BASE}/api/bookings`, {
    headers: { Authorization: `Bearer ${cust2Token}` },
  });
  const cust2Bookings = await cust2BookingsRes.json();

  const cust1HasCreatedBooking = cust1Bookings.some(b => b._id === createdBookingId);
  const cust2HasCreatedBooking = cust2Bookings.some(b => b._id === createdBookingId);

  if (cust1HasCreatedBooking && !cust2HasCreatedBooking) {
    results.customerOwnBookingsOnly = "PASS";
    console.log("✓ Customer Own-Bookings Isolation: PASS");
  } else {
    results.customerOwnBookingsOnly = "FAIL";
  }

  // Provider booking isolation: Provider can only see bookings for their own profile
  const provBookingsRes = await fetch(`${API_BASE}/api/bookings`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const provBookings = await provBookingsRes.json();
  // Since createdBookingId was for providerWithSlot (not testprovider), provBookings should NOT include it
  const provHasOtherBooking = provBookings.some(b => b._id === createdBookingId);
  if (!provHasOtherBooking) {
    results.providerOwnBookingsOnly = "PASS";
    console.log("✓ Provider Own-Bookings Isolation: PASS");
  } else {
    results.providerOwnBookingsOnly = "FAIL";
  }

  // 10. Review Security & Validation
  // 10a. Unauthenticated review creation
  const unauthReviewRes = await fetch(`${API_BASE}/api/providers/${providerWithSlot._id}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: createdBookingId,
      rating: 5,
      comment: "Great service!",
    }),
  });
  if (unauthReviewRes.status === 401) {
    results.reviewAuthCustomerOnly = "PASS";
    console.log("✓ Review unauthenticated rejected: PASS");
  } else {
    results.reviewAuthCustomerOnly = "FAIL";
  }

  // 10b. Review with pending booking (not completed)
  const pendingReviewRes = await fetch(`${API_BASE}/api/providers/${providerWithSlot._id}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      bookingId: createdBookingId,
      rating: 5,
      comment: "Great service!",
    }),
  });
  const pendingReviewData = await pendingReviewRes.json();
  if (pendingReviewRes.status === 400 && pendingReviewData.message?.toLowerCase().includes("completed")) {
    results.reviewCompletedBookingRequired = "PASS";
    console.log("✓ Review with uncompleted booking rejected: PASS");
  } else {
    results.reviewCompletedBookingRequired = "FAIL";
    console.error("✗ Review validation unexpected:", pendingReviewData);
  }

  // 10c. Existing review validation: mark booking completed and create review
  await Booking.findByIdAndUpdate(createdBookingId, { status: "completed" });
  const completedReviewRes = await fetch(`${API_BASE}/api/providers/${providerWithSlot._id}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      bookingId: createdBookingId,
      rating: 5,
      comment: "Exceptional service, highly recommend!",
    }),
  });
  if (completedReviewRes.status === 201) {
    results.existingReviewValidationWorks = "PASS";
    console.log("✓ Review with completed booking succeeded: PASS");
  } else {
    results.existingReviewValidationWorks = "FAIL";
    const err = await completedReviewRes.json();
    console.error("✗ Completed review failed:", err);
  }

  // 11. Admin Approval Mechanism
  const adminKey = process.env.ADMIN_API_KEY || "local_admin_secret_key_2026";
  const approveRes = await fetch(`${API_BASE}/api/admin/providers/${providerProfile._id}/verification`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({
      status: "approved",
    }),
  });
  const approveData = await approveRes.json();
  if (approveRes.status === 200 && approveData.provider?.verificationStatus === "approved" && approveData.provider?.verified === true) {
    results.adminApproval = "PASS";
    console.log("✓ Admin Approval Mechanism: PASS");
  } else {
    results.adminApproval = "FAIL";
    console.error("✗ Admin Approval failed:", approveData);
  }

  // Restore the test slot and clean up test review & booking
  await Booking.findByIdAndDelete(createdBookingId);
  await Review.deleteMany({ booking: createdBookingId });
  await Provider.updateOne(
    { _id: providerWithSlot._id, "availability.date": testSlot.date, "availability.startTime": testSlot.startTime },
    { $set: { "availability.$.isAvailable": true } }
  );

  // 12. Final Database Verifications
  const providerCountAfter = await Provider.countDocuments();
  const usersCountAfter = await User.countDocuments();
  const bookingsCountAfter = await Booking.countDocuments();
  const reviewsCountAfter = await Review.countDocuments();

  console.log(`Provider count AFTER: ${providerCountAfter}`);
  console.log(`Users count AFTER: ${usersCountAfter}`);
  console.log(`Bookings count AFTER: ${bookingsCountAfter}`);
  console.log(`Reviews count AFTER: ${reviewsCountAfter}`);

  results.usersCollection = usersCountAfter > 0 ? "PASS" : "FAIL";
  results.existingProvidersPreserved = providerCountAfter >= 102 ? "PASS" : "FAIL";
  results.bookingsPreserved = bookingsCountAfter >= bookingsCountBefore - 1 ? "PASS" : "FAIL";
  results.reviewsPreserved = reviewsCountAfter >= reviewsCountBefore ? "PASS" : "FAIL";

  console.log("\n==================================================");
  console.log("FINAL TEST RESULTS SUMMARY");
  console.log("==================================================");
  console.log(`Customer Registration: ${results.customerRegister}`);
  console.log(`Customer Login: ${results.customerLogin}`);
  console.log(`Provider Registration: ${results.providerRegister}`);
  console.log(`Provider Login: ${results.providerLogin}`);
  console.log(`JWT Generation: ${results.tokenGenerated}`);
  console.log(`JWT Validation: ${results.validTokenAccepted}`);
  console.log(`Missing Token Rejected: ${results.missingTokenRejected}`);
  console.log(`Invalid Token Rejected: ${results.invalidTokenRejected}`);
  console.log(`Expired Token Rejected: ${results.expiredTokenRejected}`);
  console.log(`Customer Access Provider API: ${results.customerAccessProviderApi}`);
  console.log(`Provider Access Customer API: ${results.providerAccessCustomerApi}`);
  console.log(`Find Services without login: ${results.findServicesWithoutLogin}`);
  console.log(`Provider Profile without login: ${results.providerProfileWithoutLogin}`);
  console.log(`Customer Logged In Booking: ${results.customerLoggedInBooking}`);
  console.log(`Customer Not Logged In Booking: ${results.customerNotLoggedInBooking}`);
  console.log(`Customer Own Bookings Only: ${results.customerOwnBookingsOnly}`);
  console.log(`Provider Own Bookings Only: ${results.providerOwnBookingsOnly}`);
  console.log(`Review Auth Customer Only: ${results.reviewAuthCustomerOnly}`);
  console.log(`Review Completed Booking Required: ${results.reviewCompletedBookingRequired}`);
  console.log(`Existing Review Validation Works: ${results.existingReviewValidationWorks}`);
  console.log(`Admin Approval: ${results.adminApproval}`);
  console.log(`MongoDB Atlas Connection: ${results.mongoAtlasConnection}`);
  console.log(`Users Collection: ${results.usersCollection}`);
  console.log(`Existing Providers Preserved: ${results.existingProvidersPreserved}`);
  console.log(`Provider Count Before: ${providerCountBefore}`);
  console.log(`Provider Count After: ${providerCountAfter}`);
  console.log(`Bookings Preserved: ${results.bookingsPreserved}`);
  console.log(`Reviews Preserved: ${results.reviewsPreserved}`);

  // Disconnect mongoose
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
