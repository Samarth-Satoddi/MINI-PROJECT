import { useState, useEffect } from "react";
import { Routes, Route } from "react-router";

import "./App.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import AboutPage from "./pages/AboutPage";
import BookingsPage from "./pages/BookingsPage";
import ProviderJoinPage from "./pages/ProviderJoinPage";

import CustomerRegister from "./pages/CustomerRegister";
import CustomerLogin from "./pages/CustomerLogin";
import ProviderRegister from "./pages/ProviderRegister";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderDashboard from "./pages/ProviderDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

const API_URL = "http://localhost:5000";

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "The request could not be completed.");
    }

    return data;
}

function App() {
    const { token } = useAuth();
    const [providers, setProviders] = useState([]);
    const [providersLoaded, setProvidersLoaded] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [loadError, setLoadError] = useState("");

    async function loadProviders() {
        const data = await apiRequest("/api/providers");
        setProviders(data);
        setProvidersLoaded(true);
    }

    async function loadBookings() {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
            setBookings([]);
            return;
        }
        try {
            const data = await apiRequest("/api/bookings");
            setBookings(data);
        } catch {
            setBookings([]);
        }
    }

    useEffect(() => {
        let isCurrent = true;

        apiRequest("/api/providers")
            .then(data => {
                if (!isCurrent) return;
                setProviders(data);
                setProvidersLoaded(true);
            })
            .catch(error => {
                if (isCurrent) setLoadError(error.message);
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        if (token) {
            loadBookings();
        } else {
            setBookings([]);
        }
    }, [token]);

    async function handleAddProvider(provider) {
        const result = await apiRequest("/api/providers", {
            method: "POST",
            body: JSON.stringify(provider),
        });
        await loadProviders();
        return result;
    }

    async function handleUpdateProvider(providerId, updatedData) {
        const result = await apiRequest(`/api/providers/${providerId}`, {
            method: "PUT",
            body: JSON.stringify(updatedData),
        });
        await loadProviders();
        return result;
    }

    async function handleDeleteProvider(providerId) {
        const result = await apiRequest(`/api/providers/${providerId}`, {
            method: "DELETE",
        });
        await loadProviders();
        return result;
    }

    async function handleCreateBooking(booking) {
        const result = await apiRequest("/api/bookings", {
            method: "POST",
            body: JSON.stringify(booking),
        });
        await loadBookings();
        return result;
    }

    async function handleUpdateBookingStatus(bookingId, status) {
        const result = await apiRequest(`/api/bookings/${bookingId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
        await loadBookings();
        return result;
    }

    async function handleUpdateBooking(bookingId, updateData) {
        const result = await apiRequest(`/api/bookings/${bookingId}`, {
            method: "PUT",
            body: JSON.stringify(updateData),
        });
        await loadBookings();
        return result;
    }

    return (
        <div>
            <Navbar />
            {loadError && <p className="api-error">Service data is unavailable: {loadError}. Check the backend and MongoDB configuration.</p>}

            <Routes>
                <Route
                    path="/"
                    element={
                        <HomePage
                            providers={providers}
                        />
                    }
                />

                <Route
                    path="/services"
                    element={
                        <EventsPage
                            providers={providers}
                        />
                    }
                />

                <Route
                    path="/providers/:providerId"
                    element={
                        <EventDetailsPage
                            providers={providers}
                            providersLoaded={providersLoaded}
                            bookings={bookings}
                            onCreateBooking={handleCreateBooking}
                        />
                    }
                />

                {/* Customer Routes */}
                <Route path="/customer/register" element={<CustomerRegister />} />
                <Route path="/customer/login" element={<CustomerLogin />} />

                {/* Protected Customer Bookings */}
                <Route
                    path="/bookings"
                    element={
                        <ProtectedRoute allowedRole="customer">
                            <BookingsPage
                                bookings={bookings}
                                onUpdateBooking={handleUpdateBooking}
                                onUpdateBookingStatus={handleUpdateBookingStatus}
                                onRefreshBookings={loadBookings}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Provider Routes */}
                <Route path="/provider/register" element={<ProviderRegister />} />
                <Route path="/provider/login" element={<ProviderLogin />} />

                {/* Protected Provider Dashboard */}
                <Route
                    path="/provider/dashboard"
                    element={
                        <ProtectedRoute allowedRole="provider">
                            <ProviderDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Provider join/management tab */}
                <Route
                    path="/join"
                    element={
                        <ProviderJoinPage
                            providers={providers}
                            onAddProvider={handleAddProvider}
                            onUpdateProvider={handleUpdateProvider}
                            onDeleteProvider={handleDeleteProvider}
                        />
                    }
                />

                <Route
                    path="/about"
                    element={<AboutPage />}
                />
            </Routes>

            <Footer />
        </div>
    );
}

export default App;