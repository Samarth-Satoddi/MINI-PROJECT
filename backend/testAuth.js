const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Provider = require("./models/Provider");
const Booking = require("./models/Booking");
const Review = require("./models/Review");

const API_BASE = "http://localhost:5000";

async function post(path, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function get(path, token) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function put(path, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function testAuth() {
    console.log("=== RUNNING AUTOMATED BACKEND AUTH & CRUD TESTS ===");

    // Clean up test accounts if existing
    const testCustomerEmail = "testcustomer@example.com";
    const testProviderEmail = "testprovider@example.com";
    await User.deleteMany({ email: { $in: [testCustomerEmail, testProviderEmail] } });
    await Provider.deleteMany({ email: testProviderEmail });

    // 1. Customer Register
    const custReg = await post("/api/auth/register", {
        name: "Test Customer",
        email: testCustomerEmail,
        password: "TestCustomer123!",
        role: "customer"
    });
    console.log("Customer Register:", custReg.status === 201 ? "PASS" : "FAIL", custReg.status);

    // 2. Customer Login
    const custLog = await post("/api/auth/login", {
        email: testCustomerEmail,
        password: "TestCustomer123!"
    });
    console.log("Customer Login:", custLog.status === 200 && custLog.data.token ? "PASS" : "FAIL");
    const customerToken = custLog.data.token;

    // 3. Provider Register
    const provReg = await post("/api/auth/register", {
        name: "Test Provider",
        email: testProviderEmail,
        password: "TestProvider123!",
        role: "provider",
        providerDetails: {
            category: "Electrician",
            location: "Bangalore",
            hourlyRate: 350,
            services: ["Wiring", "Repairs"]
        }
    });
    console.log("Provider Register:", provReg.status === 201 && provReg.data.provider.verificationStatus === "pending" ? "PASS" : "FAIL");

    // 4. Provider Login
    const provLog = await post("/api/auth/login", {
        email: testProviderEmail,
        password: "TestProvider123!"
    });
    console.log("Provider Login:", provLog.status === 200 && provLog.data.token ? "PASS" : "FAIL");
    const providerToken = provLog.data.token;

    // 5. JWT Validation
    const noToken = await get("/api/bookings");
    console.log("Missing token rejected:", noToken.status === 401 ? "PASS" : "FAIL");

    const badToken = await get("/api/bookings", "invalid-token-xyz");
    console.log("Invalid token rejected:", badToken.status === 401 ? "PASS" : "FAIL");

    const validCust = await get("/api/auth/me", customerToken);
    console.log("Valid token accepted:", validCust.status === 200 && validCust.data.user.email === testCustomerEmail ? "PASS" : "FAIL");

    // 6. Role Protection
    const custOnProvRoute = await get("/api/providers/me", customerToken);
    console.log("Customer accessing provider-only API rejected:", custOnProvRoute.status === 403 ? "PASS" : "FAIL");

    const provOnCustRoute = await post("/api/bookings", {
        providerId: "6aba2b36d946b81e84ef479a",
        date: "2026-10-25",
        startTime: "10:00",
        endTime: "11:00"
    }, providerToken);
    console.log("Provider accessing customer-only API rejected:", provOnCustRoute.status === 403 ? "PASS" : "FAIL");

    // 7. Public Find Services without login
    const pubProviders = await get("/api/providers");
    console.log("Find Services without login:", pubProviders.status === 200 && Array.isArray(pubProviders.data) ? "PASS" : "FAIL");
    console.log("Total approved providers accessible publicly:", pubProviders.data.length);

    console.log("=== BACKEND AUTH TESTS COMPLETE ===");
    process.exit(0);
}

testAuth().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
