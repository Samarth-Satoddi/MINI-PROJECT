import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000";

function ProviderDashboard() {
  const { token, user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: "", startTime: "", endTime: "" });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError("");

    try {
      const [provRes, bookRes] = await Promise.all([
        fetch(`${API_URL}/api/providers/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const provData = await provRes.json();
      const bookData = await bookRes.json();

      if (provRes.ok) {
        setProvider(provData);
        setAvailabilitySlots(provData.availability || []);
      } else {
        setError(provData.message || "Could not load provider profile.");
      }

      if (bookRes.ok) {
        setBookings(bookData);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateBookingStatus(bookingId, status) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update booking status.");
      }

      setMessage(`Booking status updated to ${status}.`);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveAvailability(updatedSlots) {
    if (!provider) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/providers/${provider._id}/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ availability: updatedSlots }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update availability.");
      }

      setAvailabilitySlots(data.availability);
      setMessage("Availability schedule updated successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAddSlot(e) {
    e.preventDefault();
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return;
    if (newSlot.startTime >= newSlot.endTime) {
      setError("End time must be after start time.");
      return;
    }

    const updated = [...availabilitySlots, { ...newSlot, isAvailable: true }];
    setAvailabilitySlots(updated);
    setNewSlot({ date: "", startTime: "", endTime: "" });
    handleSaveAvailability(updated);
  }

  function handleRemoveSlot(index) {
    const updated = availabilitySlots.filter((_, i) => i !== index);
    setAvailabilitySlots(updated);
    handleSaveAvailability(updated);
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p className="empty-message">Loading provider dashboard...</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-heading">
        <p className="section-label">Provider Dashboard</p>
        <h1>Welcome, {user?.name}</h1>
        <p>Manage your professional profile, client appointment requests, and bookable time slots.</p>
      </section>

      {error && <p className="form-error banner-message">{error}</p>}
      {message && <p className="form-success banner-message">{message}</p>}

      {provider && (
        <section className="profile-section">
          <div className="manage-provider-header">
            <div>
              <p className="section-label">Listing Status</p>
              <h2>{provider.name}</h2>
              <p className="manage-location">📍 {provider.location} · <strong>Category:</strong> {provider.category}</p>
            </div>
            <div>
              <span className={`provider-category ${provider.verified ? "verified-tag" : "pending-tag"}`}>
                {provider.verificationStatus === "approved" ? "Verified & Listed" : "Pending Verification"}
              </span>
            </div>
          </div>

          <div className="provider-details">
            <p><strong>Hourly Rate:</strong> ${provider.hourlyRate}/hr</p>
            <p><strong>Phone:</strong> {provider.phone || "Not set"}</p>
            <p><strong>Email:</strong> {provider.email}</p>
            <p><strong>Services:</strong> {provider.services?.join(", ") || "General"}</p>
          </div>

          {provider.verificationStatus === "pending" && (
            <p className="pending-notice">
              ℹ️ Your profile is submitted and pending admin verification before appearing publicly in search.
            </p>
          )}
        </section>
      )}

      {/* BOOKING REQUESTS */}
      <section className="profile-section">
        <p className="section-label">Client Appointments</p>
        <h2>Booking Requests ({bookings.length})</h2>

        {bookings.length === 0 ? (
          <p className="empty-message">No booking requests received yet.</p>
        ) : (
          <div className="booking-list">
            {bookings.map(b => (
              <article className="booking-item" key={b._id}>
                <div>
                  <span className={`provider-category ${b.status}`}>{b.status}</span>
                  <h3>{b.service}</h3>
                  <p><strong>Customer:</strong> {b.customerName} · {b.customerEmail}</p>
                  <p><strong>Appointment Time:</strong> {b.date}, {b.startTime}–{b.endTime}</p>
                  {b.notes && <p><strong>Notes:</strong> {b.notes}</p>}
                </div>
                <div className="booking-actions">
                  {b.status === "pending" && (
                    <>
                      <button className="submit-button" type="button" onClick={() => handleUpdateBookingStatus(b._id, "confirmed")}>
                        Confirm Booking
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleUpdateBookingStatus(b._id, "cancelled")}>
                        Cancel
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <button className="submit-button" type="button" onClick={() => handleUpdateBookingStatus(b._id, "completed")}>
                        Mark Completed
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleUpdateBookingStatus(b._id, "cancelled")}>
                        Cancel
                      </button>
                    </>
                  )}
                  {b.status === "completed" && (
                    <span className="status-completed-badge">✓ Job Completed</span>
                  )}
                  {b.status === "cancelled" && (
                    <span className="status-cancelled-badge">✗ Booking Cancelled</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* AVAILABILITY CALENDAR */}
      <section className="profile-section">
        <p className="section-label">Schedule Management</p>
        <h2>Your Bookable Time Slots</h2>

        <form className="add-slot-form" onSubmit={handleAddSlot}>
          <div className="slot-inputs">
            <label>
              Date
              <input
                type="date"
                required
                value={newSlot.date}
                onChange={e => setNewSlot({ ...newSlot, date: e.target.value })}
              />
            </label>
            <label>
              From
              <input
                type="time"
                required
                value={newSlot.startTime}
                onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
              />
            </label>
            <label>
              To
              <input
                type="time"
                required
                value={newSlot.endTime}
                onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
              />
            </label>
            <button className="submit-button" type="submit">
              + Add Slot
            </button>
          </div>
        </form>

        <div className="slots-table-container">
          {availabilitySlots.length === 0 ? (
            <p className="empty-message">No time slots added. Clients will not be able to book you until you add slots.</p>
          ) : (
            <div className="availability-list">
              {availabilitySlots.map((slot, index) => (
                <div className={`availability-slot ${slot.isAvailable ? "" : "slot-booked"}`} key={index}>
                  <span>
                    📅 {slot.date} · ⏰ {slot.startTime}–{slot.endTime} ·{" "}
                    <strong>{slot.isAvailable ? "Open" : "Booked"}</strong>
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => handleRemoveSlot(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ProviderDashboard;
