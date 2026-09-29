const dns = require("dns");
dns.setServers(["8.8.8.8"]);
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const Provider = require("./models/Provider");
const User = require("./models/User");
const Booking = require("./models/Booking");
const Notification = require("./models/Notification");

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_KEY = process.env.ADMIN_API_KEY || "admin123";

async function runTests() {
    console.log("==================================================");
    console.log("RUNNING COMPLETE TEST SUITE FOR ADMIN APPROVAL & NOTIFICATIONS");
    console.log("==================================================");

    await mongoose.connect(process.env.MONGODB_URI);
    const initialProviderCount = await Provider.countDocuments();
    console.log(`Starting Provider Count in DB: ${initialProviderCount}`);

    // Start server on dedicated test port
    server = app.listen(PORT);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const testEmails = {
        providerA: `prov_a_${Date.now()}@testflow.com`,
        providerB: `prov_b_${Date.now()}@testflow.com`,
        customer: `cust_${Date.now()}@testflow.com`
    };

    let tokenProviderA = "";
    let providerAUser = null;
    let providerADoc = null;

    let tokenProviderB = "";
    let providerBUser = null;
    let providerBDoc = null;

    let tokenCustomer = "";
    let customerUser = null;

    let testBookingDoc = null;
    let createdNotificationId = null;

    try {
        // --------------------------------------------------
        // TEST 1: Create a new provider account (Provider A)
        // --------------------------------------------------
        console.log("\n--- TEST 1: Register New Provider (Provider A) ---");
        const regResA = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Alpha Repairs & Electric",
                email: testEmails.providerA,
                password: "Password123!",
                role: "provider",
                providerDetails: {
                    category: "Electrician",
                    location: "Bangalore",
                    hourlyRate: 400,
                    phone: "9876543210",
                    services: ["Wiring", "Appliance Fix"],
                    description: "Top certified electrician in Bangalore."
                }
            })
        });

        const regDataA = await regResA.json();
        if (regResA.status !== 201) {
            throw new Error(`Test 1 Failed: Registration returned status ${regResA.status}: ${JSON.stringify(regDataA)}`);
        }

        tokenProviderA = regDataA.token;
        providerAUser = regDataA.user;
        providerADoc = regDataA.provider;

        if (providerADoc.verificationStatus !== "pending") {
            throw new Error(`Test 1 Failed: Expected verificationStatus === 'pending', got '${providerADoc.verificationStatus}'`);
        }
        if (providerADoc.verified !== false) {
            throw new Error(`Test 1 Failed: Expected verified === false, got '${providerADoc.verified}'`);
        }

        // Check that Provider A does NOT appear in public provider search
        const publicSearchRes1 = await fetch(`${BASE_URL}/api/providers`);
        const publicProviders1 = await publicSearchRes1.json();
        const foundInPublic = publicProviders1.some(p => p._id.toString() === providerADoc._id.toString());
        if (foundInPublic) {
            throw new Error("Test 1 Failed: Pending provider appeared in public search results!");
        }
        console.log("✓ TEST 1 PASSED: Provider A registered with verificationStatus = 'pending', verified = false, and hidden from public search.");

        // --------------------------------------------------
        // TEST 2: Admin Login & Pending Applications in Dashboard
        // --------------------------------------------------
        console.log("\n--- TEST 2: Admin Dashboard Check for Pending Provider ---");
        // Verify admin key endpoint
        const adminVerifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-admin-key": ADMIN_KEY
            }
        });
        if (adminVerifyRes.status !== 200) {
            throw new Error(`Test 2 Failed: Admin verify endpoint failed with status ${adminVerifyRes.status}`);
        }

        // Fetch pending providers
        const adminPendingRes = await fetch(`${BASE_URL}/api/admin/providers?status=pending`, {
            headers: { "x-admin-key": ADMIN_KEY }
        });
        const pendingList = await adminPendingRes.json();
        const foundPending = pendingList.some(p => p._id.toString() === providerADoc._id.toString());
        if (!foundPending) {
            throw new Error("Test 2 Failed: Provider A was not found in admin pending providers list!");
        }
        console.log("✓ TEST 2 PASSED: Admin successfully authenticated and found Provider A in Pending Provider Applications.");

        // --------------------------------------------------
        // TEST 3: Admin Approves Provider A
        // --------------------------------------------------
        console.log("\n--- TEST 3: Admin Approves Provider A ---");
        const approveRes = await fetch(`${BASE_URL}/api/admin/providers/${providerADoc._id}/verification`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-admin-key": ADMIN_KEY
            },
            body: JSON.stringify({ status: "approved" })
        });
        const approveData = await approveRes.json();
        if (approveRes.status !== 200) {
            throw new Error(`Test 3 Failed: Approve returned status ${approveRes.status}: ${JSON.stringify(approveData)}`);
        }
        if (approveData.provider.verificationStatus !== "approved" || approveData.provider.verified !== true) {
            throw new Error(`Test 3 Failed: Expected verificationStatus === 'approved' and verified === true, got ${JSON.stringify(approveData.provider)}`);
        }

        // Check that Provider A now DOES appear in public provider search
        const publicSearchRes2 = await fetch(`${BASE_URL}/api/providers`);
        const publicProviders2 = await publicSearchRes2.json();
        const foundInPublicNow = publicProviders2.some(p => p._id.toString() === providerADoc._id.toString());
        if (!foundInPublicNow) {
            throw new Error("Test 3 Failed: Approved provider did NOT appear in public search results!");
        }
        console.log("✓ TEST 3 PASSED: Provider A successfully approved, verified = true, and now discoverable in public search.");

        // --------------------------------------------------
        // TEST 4: Customer Books Provider A & Notification Created
        // --------------------------------------------------
        console.log("\n--- TEST 4: Customer Registers and Books Provider A ---");
        const custRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Samarth Customer",
                email: testEmails.customer,
                password: "Password123!",
                role: "customer"
            })
        });
        const custRegData = await custRegRes.json();
        tokenCustomer = custRegData.token;
        customerUser = custRegData.user;

        // Fetch Provider A's availability slots
        const provAUpdated = await Provider.findById(providerADoc._id);
        const slot = provAUpdated.availability.find(s => s.isAvailable);
        if (!slot) {
            throw new Error("Test 4 Failed: No available slot found for Provider A");
        }

        // Customer books Provider A
        const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenCustomer}`
            },
            body: JSON.stringify({
                providerId: providerADoc._id.toString(),
                service: "Electrical Repair",
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                notes: "Please call on arrival.",
                customerName: customerUser.name,
                customerEmail: customerUser.email
            })
        });
        const bookData = await bookRes.json();
        if (bookRes.status !== 201) {
            throw new Error(`Test 4 Failed: Booking failed with status ${bookRes.status}: ${JSON.stringify(bookData)}`);
        }
        testBookingDoc = bookData.booking;

        // Check Notification created in DB
        const notificationsForA = await Notification.find({ providerId: providerADoc._id });
        if (notificationsForA.length !== 1) {
            throw new Error(`Test 4 Failed: Expected exactly 1 notification for Provider A, got ${notificationsForA.length}`);
        }
        createdNotificationId = notificationsForA[0]._id;
        console.log("✓ TEST 4 PASSED: Booking created successfully. Exactly 1 notification generated for Provider A.");

        // --------------------------------------------------
        // TEST 5: Login as Provider A & View Notification
        // --------------------------------------------------
        console.log("\n--- TEST 5: Provider A Views Notification in Dashboard ---");
        const notifResA = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { "Authorization": `Bearer ${tokenProviderA}` }
        });
        const notifListA = await notifResA.json();
        if (notifResA.status !== 200 || !Array.isArray(notifListA) || notifListA.length === 0) {
            throw new Error(`Test 5 Failed: Could not fetch notifications for Provider A: ${JSON.stringify(notifListA)}`);
        }
        const notifA = notifListA[0];
        if (notifA.title !== "New Booking Received") {
            throw new Error(`Test 5 Failed: Expected title 'New Booking Received', got '${notifA.title}'`);
        }
        if (!notifA.message.includes("Samarth Customer") || !notifA.message.includes("Electrical Repair")) {
            throw new Error(`Test 5 Failed: Notification message did not contain customer name or service: '${notifA.message}'`);
        }
        if (notifA.isRead !== false) {
            throw new Error(`Test 5 Failed: Expected isRead === false, got '${notifA.isRead}'`);
        }
        console.log(`✓ TEST 5 PASSED: Provider A sees notification: "${notifA.title}" - "${notifA.message}"`);

        // --------------------------------------------------
        // TEST 6: Register/Login as Provider B & Confirm Isolation
        // --------------------------------------------------
        console.log("\n--- TEST 6: Provider B Isolation (Cannot see Provider A's notification) ---");
        const regResB = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Beta Plumbing Services",
                email: testEmails.providerB,
                password: "Password123!",
                role: "provider",
                providerDetails: {
                    category: "Plumber",
                    location: "Bangalore",
                    hourlyRate: 300,
                    phone: "9123456789",
                    services: ["Pipe Leak", "Tap Repair"],
                    description: "Reliable plumber in Bangalore."
                }
            })
        });
        const regDataB = await regResB.json();
        tokenProviderB = regDataB.token;
        providerBUser = regDataB.user;
        providerBDoc = regDataB.provider;

        // Provider B queries notifications
        const notifResB = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { "Authorization": `Bearer ${tokenProviderB}` }
        });
        const notifListB = await notifResB.json();
        if (notifListB.length !== 0) {
            throw new Error(`Test 6 Failed: Provider B saw ${notifListB.length} notifications, expected 0!`);
        }

        // Provider B attempts to mark Provider A's notification as read (forbidden)
        const illegalMarkRes = await fetch(`${BASE_URL}/api/notifications/${createdNotificationId}/read`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenProviderB}`
            }
        });
        if (illegalMarkRes.status !== 403) {
            throw new Error(`Test 6 Failed: Expected 403 Forbidden when Provider B marks Provider A's notification as read, got ${illegalMarkRes.status}`);
        }
        console.log("✓ TEST 6 PASSED: Provider B sees 0 notifications, and is forbidden (403) from marking Provider A's notification.");

        // --------------------------------------------------
        // TEST 7: Provider A Marks Notification as Read
        // --------------------------------------------------
        console.log("\n--- TEST 7: Provider A Marks Notification as Read ---");
        // Check unread count before
        const unreadBeforeRes = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
            headers: { "Authorization": `Bearer ${tokenProviderA}` }
        });
        const unreadBefore = await unreadBeforeRes.json();
        if (unreadBefore.unreadCount !== 1) {
            throw new Error(`Test 7 Failed: Expected 1 unread notification before, got ${unreadBefore.unreadCount}`);
        }

        // Provider A marks it as read
        const markReadRes = await fetch(`${BASE_URL}/api/notifications/${createdNotificationId}/read`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenProviderA}`
            }
        });
        if (markReadRes.status !== 200) {
            throw new Error(`Test 7 Failed: Mark as read returned status ${markReadRes.status}`);
        }

        // Check unread count after
        const unreadAfterRes = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
            headers: { "Authorization": `Bearer ${tokenProviderA}` }
        });
        const unreadAfter = await unreadAfterRes.json();
        if (unreadAfter.unreadCount !== 0) {
            throw new Error(`Test 7 Failed: Expected 0 unread notifications after, got ${unreadAfter.unreadCount}`);
        }
        console.log("✓ TEST 7 PASSED: Provider A marked notification as read. Unread count decreased to 0.");

        // --------------------------------------------------
        // TEST 8: Admin Rejects Provider B
        // --------------------------------------------------
        console.log("\n--- TEST 8: Admin Rejects Provider B ---");
        const rejectRes = await fetch(`${BASE_URL}/api/admin/providers/${providerBDoc._id}/verification`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-admin-key": ADMIN_KEY
            },
            body: JSON.stringify({ status: "rejected" })
        });
        const rejectData = await rejectRes.json();
        if (rejectRes.status !== 200 || rejectData.provider.verificationStatus !== "rejected" || rejectData.provider.verified !== false) {
            throw new Error(`Test 8 Failed: Reject returned ${rejectRes.status}: ${JSON.stringify(rejectData)}`);
        }

        // Check public search does NOT show Provider B
        const publicSearchRes3 = await fetch(`${BASE_URL}/api/providers`);
        const publicProviders3 = await publicSearchRes3.json();
        const foundBInPublic = publicProviders3.some(p => p._id.toString() === providerBDoc._id.toString());
        if (foundBInPublic) {
            throw new Error("Test 8 Failed: Rejected provider appeared in public search results!");
        }

        // Confirm Provider B document was NOT deleted
        const providerBDocInDb = await Provider.findById(providerBDoc._id);
        if (!providerBDocInDb) {
            throw new Error("Test 8 Failed: Provider B document was deleted instead of retained as rejected!");
        }
        console.log("✓ TEST 8 PASSED: Provider B rejected, preserved in DB with verificationStatus = 'rejected', and hidden from public search.");

        console.log("\n==================================================");
        console.log("ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
        console.log("==================================================");
    } finally {
        // Clean up ONLY the test documents created in this run
        console.log("\nCleaning up test-generated records...");
        if (providerADoc) await Provider.findByIdAndDelete(providerADoc._id);
        if (providerBDoc) await Provider.findByIdAndDelete(providerBDoc._id);
        if (providerAUser) await User.findByIdAndDelete(providerAUser._id);
        if (providerBUser) await User.findByIdAndDelete(providerBUser._id);
        if (customerUser) await User.findByIdAndDelete(customerUser._id);
        if (testBookingDoc) await Booking.findByIdAndDelete(testBookingDoc._id);
        if (createdNotificationId) await Notification.findByIdAndDelete(createdNotificationId);

        const finalProviderCount = await Provider.countDocuments();
        console.log(`Final Provider Count in DB: ${finalProviderCount}`);
        console.log(`Original Providers Preserved: ${finalProviderCount === initialProviderCount ? 'YES (100% Intact)' : 'COUNT CHANGED'}`);

        server.close();
        await mongoose.disconnect();
    }
}

runTests().catch(err => {
    console.error("Test runner failed:", err);
    if (server) server.close();
    process.exit(1);
});
