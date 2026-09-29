import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../config/api";

function ProviderDashboard() {
  const { token, user, setProviderProfile, logout } = useAuth();
  const [provider, setProvider] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Edit / Update Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    category: "",
    location: "",
    hourlyRate: "",
    phone: "",
    email: "",
    services: "",
    description: "",
  });

  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: "", startTime: "", endTime: "" });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError("");

    try {
      const [provRes, bookRes, notifRes] = await Promise.all([
        fetch(`${API_URL}/api/providers/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const provData = await provRes.json();
      const bookData = await bookRes.json();
      const notifData = await notifRes.json();

      if (provRes.ok) {
        setProvider(provData);
        setAvailabilitySlots(provData.availability || []);
        setProfileForm({
          name: provData.name || "",
          category: provData.category || "",
          location: provData.location || "",
          hourlyRate: provData.hourlyRate ?? "",
          phone: provData.phone || "",
          email: provData.email || "",
          services: Array.isArray(provData.services) ? provData.services.join(", ") : "",
          description: provData.description || "",
        });
      } else {
        setError(provData.message || "Could not load provider profile.");
      }

      if (bookRes.ok) {
        setBookings(bookData);
      }

      if (notifRes.ok && Array.isArray(notifData)) {
        setNotifications(notifData);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkNotificationRead(notificationId) {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      const res = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  }

  async function handleUpdateProfileSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        name: profileForm.name,
        category: profileForm.category,
        location: profileForm.location,
        hourlyRate: Number(profileForm.hourlyRate),
        phone: profileForm.phone,
        email: profileForm.email,
        description: profileForm.description,
        services: typeof profileForm.services === "string"
          ? profileForm.services.split(",").map(s => s.trim()).filter(Boolean)
          : profileForm.services,
      };

      const res = await fetch(`${API_URL}/api/providers/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setProvider(data.provider);
      if (setProviderProfile) {
        setProviderProfile(data.provider);
      }
      setIsEditingProfile(false);
      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
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

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("Are you sure you want to permanently delete and remove this booking request?")) {
      return;
    }
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not delete booking.");
      }

      setMessage("Booking removed and deleted successfully.");
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProfile() {
    if (!window.confirm("Are you sure you want to permanently delete your provider profile and all associated appointments? This action cannot be undone.")) {
      return;
    }
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/providers/${provider._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete provider profile.");
      }

      alert("Provider profile deleted successfully.");
      logout();
      window.location.href = "/";
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
          <div className="manage-provider-header" style={{ alignItems: "flex-start" }}>
            <div>
              <p className="section-label">Listing Status</p>
              <h2>{provider.name}</h2>
              <p className="manage-location">📍 {provider.location} · <strong>Category:</strong> {provider.category}</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: "700",
                  background: provider.verificationStatus === "approved" ? "#dcfce7" : (provider.verificationStatus === "pending" ? "#fef3c7" : "#fee2e2"),
                  color: provider.verificationStatus === "approved" ? "#15803d" : (provider.verificationStatus === "pending" ? "#b45309" : "#b91c1c")
                }}
              >
                {provider.verificationStatus === "approved" && "✓ Approved & Listed"}
                {provider.verificationStatus === "pending" && "⏳ Pending Admin Approval"}
                {provider.verificationStatus === "rejected" && "✕ Application Rejected"}
              </span>
              <button
                type="button"
                className="edit-provider-btn"
                style={{ padding: "8px 14px", width: "auto" }}
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? "✕ Cancel Edit" : "✏️ Update Profile"}
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ color: "#ef4444", borderColor: "#ef4444", padding: "8px 14px", width: "auto" }}
                onClick={handleDeleteProfile}
              >
                🗑️ Delete Profile
              </button>
            </div>
          </div>

          {/* UPDATE PROFILE FORM */}
          {isEditingProfile ? (
            <div className="provider-form-section" style={{ marginTop: "20px", paddingTop: "20px" }}>
              <p className="section-label">Edit Account Information</p>
              <h3>Update Provider Profile</h3>
              <form className="provider-form" onSubmit={handleUpdateProfileSubmit}>
                <div className="form-group">
                  <label htmlFor="edit-name">Provider Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-category">Service Category</label>
                  <select
                    id="edit-category"
                    required
                    value={profileForm.category}
                    onChange={e => setProfileForm({ ...profileForm, category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    <option>Electrician</option>
                    <option>Plumber</option>
                    <option>Tutor</option>
                    <option>Cleaner</option>
                    <option>Carpenter</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-location">Location (City, State)</label>
                  <input
                    id="edit-location"
                    type="text"
                    required
                    value={profileForm.location}
                    onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-hourlyRate">Hourly Rate ($)</label>
                  <input
                    id="edit-hourlyRate"
                    type="number"
                    min="0"
                    required
                    value={profileForm.hourlyRate}
                    onChange={e => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-phone">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-email">Email Address</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="edit-services">Services Offered (comma separated)</label>
                  <input
                    id="edit-services"
                    type="text"
                    value={profileForm.services}
                    onChange={e => setProfileForm({ ...profileForm, services: e.target.value })}
                    placeholder="E.g. Wiring, Fan Repair, MCB Replacement"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="edit-description">Profile Bio / Description</label>
                  <textarea
                    id="edit-description"
                    rows="3"
                    value={profileForm.description}
                    onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                  />
                </div>

                <div className="provider-form-actions" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px" }}>
                  <button className="submit-button" type="submit">
                    💾 Save & Update Profile
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setIsEditingProfile(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="provider-details">
              <p><strong>Hourly Rate:</strong> ${provider.hourlyRate}/hr</p>
              <p><strong>Phone:</strong> {provider.phone || "Not set"}</p>
              <p><strong>Email:</strong> {provider.email}</p>
              <p><strong>Services:</strong> {provider.services?.join(", ") || "General"}</p>
              {provider.description && <p><strong>Bio:</strong> {provider.description}</p>}
            </div>
          )}

          {provider.verificationStatus === "pending" && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "14px 18px", borderRadius: "6px", marginTop: "16px" }}>
              <strong style={{ fontSize: "15px" }}>⏳ Application Pending Admin Review</strong>
              <p style={{ margin: "4px 0 0", lineHeight: "1.4" }}>
                Your provider profile was registered and is currently under review by our administration team. Once approved, your profile and services will become available in the public search and customers will be able to book your services.
              </p>
            </div>
          )}

          {provider.verificationStatus === "rejected" && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "14px 18px", borderRadius: "6px", marginTop: "16px" }}>
              <strong style={{ fontSize: "15px" }}>✕ Application Rejected</strong>
              <p style={{ margin: "4px 0 0", lineHeight: "1.4" }}>
                Your provider listing application is currently not approved and is hidden from public discovery.
              </p>
            </div>
          )}
        </section>
      )}

      {/* NOTIFICATIONS SECTION */}
      <section className="profile-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <div>
            <p className="section-label">Alerts & Updates</p>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              🔔 Notifications
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span style={{
                  background: "#ef4444",
                  color: "white",
                  fontSize: "13px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "bold"
                }}>
                  {notifications.filter(n => !n.isRead).length} unread
                </span>
              )}
            </h2>
          </div>
          {notifications.some(n => !n.isRead) && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleMarkAllNotificationsRead}
              style={{ fontSize: "13px", padding: "6px 14px" }}
            >
              ✓ Mark All as Read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="empty-message">No booking notifications received yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {notifications.map(n => {
              const meta = n.metadata || {};
              const notifTime = n.createdAt
                ? new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <article
                  key={n._id}
                  style={{
                    background: n.isRead ? "var(--surface)" : "#f0fdf4",
                    border: n.isRead ? "1px solid var(--border)" : "2px solid #22c55e",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    boxShadow: n.isRead ? "var(--shadow)" : "0 4px 14px rgba(34, 197, 94, 0.15)",
                    transition: "0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: "16px", color: n.isRead ? "var(--text)" : "#15803d" }}>
                          🔔 {n.title || "New Booking Received"}
                        </h4>
                        {!n.isRead && (
                          <span style={{
                            background: "#22c55e",
                            color: "white",
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "700",
                            textTransform: "uppercase"
                          }}>
                            New
                          </span>
                        )}
                        {notifTime && (
                          <small style={{ color: "var(--text-muted)" }}>{notifTime}</small>
                        )}
                      </div>

                      <p style={{ margin: "8px 0", fontSize: "15px", fontWeight: n.isRead ? "normal" : "600" }}>
                        {n.message}
                      </p>

                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        background: "var(--surface-soft)",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        marginTop: "8px"
                      }}>
                        {meta.customerName && <div><strong>Customer:</strong> {meta.customerName}</div>}
                        {meta.service && <div><strong>Service:</strong> {meta.service}</div>}
                        {meta.date && <div><strong>Date:</strong> {meta.date}</div>}
                        {meta.startTime && meta.endTime && (
                          <div><strong>Time:</strong> {meta.startTime} – {meta.endTime}</div>
                        )}
                        <div><strong>Status:</strong> {meta.bookingStatus || "Pending"}</div>
                        {n.bookingId && <div><strong>Booking ID:</strong> {n.bookingId}</div>}
                        {meta.notes && <div><strong>Customer Notes:</strong> {meta.notes}</div>}
                      </div>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        className="submit-button"
                        style={{ padding: "6px 12px", fontSize: "12px", background: "var(--primary)" }}
                        onClick={() => handleMarkNotificationRead(n._id)}
                      >
                        ✓ Mark as Read
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
                      <button
                        className="secondary-button"
                        type="button"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleDeleteBooking(b._id)}
                      >
                        Reject & Delete
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <button className="submit-button" type="button" onClick={() => handleUpdateBookingStatus(b._id, "completed")}>
                        Mark Completed
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleDeleteBooking(b._id)}
                      >
                        Cancel & Delete
                      </button>
                    </>
                  )}
                  {b.status === "completed" && (
                    <>
                      <span className="status-completed-badge">✓ Job Completed</span>
                      <button
                        className="secondary-button"
                        type="button"
                        style={{ color: "#ef4444", borderColor: "#ef4444", padding: "6px 12px" }}
                        onClick={() => handleDeleteBooking(b._id)}
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  {b.status === "cancelled" && (
                    <>
                      <span className="status-cancelled-badge">✗ Booking Cancelled</span>
                      <button
                        className="secondary-button"
                        type="button"
                        style={{ color: "#ef4444", borderColor: "#ef4444", padding: "6px 12px" }}
                        onClick={() => handleDeleteBooking(b._id)}
                      >
                        🗑️ Delete
                      </button>
                    </>
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
