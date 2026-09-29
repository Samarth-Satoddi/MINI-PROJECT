import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";

/* ─── tiny helpers ─────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    approved: { label: "✓ Approved & Listed",      cls: "vbadge vbadge--approved" },
    pending:  { label: "⏳ Pending Approval",        cls: "vbadge vbadge--pending"  },
    rejected: { label: "✕ Rejected",                cls: "vbadge vbadge--rejected" },
  };
  const { label, cls } = map[status] || map.pending;
  return <span className={cls}>{label}</span>;
}

function BookingStatusBadge({ status }) {
  return <span className={`bstatus bstatus--${status}`}>{status}</span>;
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="db-stat-card">
      <div className="db-stat-icon">{icon}</div>
      <div className="db-stat-body">
        <p className="db-stat-label">{label}</p>
        <p className="db-stat-value">{value}</p>
        {sub && <p className="db-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────── */
function ProviderDashboard() {
  const { token, user, setProviderProfile, logout } = useAuth();

  const [provider,           setProvider]           = useState(null);
  const [bookings,           setBookings]           = useState([]);
  const [notifications,      setNotifications]      = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState("");
  const [message,            setMessage]            = useState("");
  const [isEditingProfile,   setIsEditingProfile]   = useState(false);
  const [activeTab,          setActiveTab]          = useState("overview"); // overview | bookings | availability | notifications
  const [profileForm,        setProfileForm]        = useState({
    name: "", category: "", location: "", hourlyRate: "",
    phone: "", email: "", services: "", description: "",
  });
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [newSlot,           setNewSlot]           = useState({ date: "", startTime: "", endTime: "" });

  useEffect(() => { loadDashboardData(); }, []);

  async function loadDashboardData() {
    setLoading(true); setError("");
    try {
      const [provRes, bookRes, notifRes] = await Promise.all([
        fetch(`${API_URL}/api/providers/me`,   { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/bookings`,        { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/notifications`,   { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const provData  = await provRes.json();
      const bookData  = await bookRes.json();
      const notifData = await notifRes.json();

      if (provRes.ok) {
        setProvider(provData);
        setAvailabilitySlots(provData.availability || []);
        setProfileForm({
          name:        provData.name        || "",
          category:    provData.category    || "",
          location:    provData.location    || "",
          hourlyRate:  provData.hourlyRate  ?? "",
          phone:       provData.phone       || "",
          email:       provData.email       || "",
          services:    Array.isArray(provData.services) ? provData.services.join(", ") : "",
          description: provData.description || "",
        });
      } else { setError(provData.message || "Could not load provider profile."); }

      if (bookRes.ok)                              setBookings(bookData);
      if (notifRes.ok && Array.isArray(notifData)) setNotifications(notifData);
    } catch (err) { setError(err.message || "Failed to load dashboard."); }
    finally        { setLoading(false); }
  }

  /* ── notifications ──────────────────────────────────── */
  async function handleMarkNotificationRead(id) {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error("Mark-read failed", err); }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      const res = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error("Mark-all-read failed", err); }
  }

  /* ── profile update ─────────────────────────────────── */
  async function handleUpdateProfileSubmit(e) {
    e.preventDefault(); setError(""); setMessage("");
    try {
      const payload = {
        name: profileForm.name, category: profileForm.category,
        location: profileForm.location, hourlyRate: Number(profileForm.hourlyRate),
        phone: profileForm.phone, email: profileForm.email,
        description: profileForm.description,
        services: typeof profileForm.services === "string"
          ? profileForm.services.split(",").map(s => s.trim()).filter(Boolean)
          : profileForm.services,
      };
      const res  = await fetch(`${API_URL}/api/providers/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile.");
      setProvider(data.provider);
      if (setProviderProfile) setProviderProfile(data.provider);
      setIsEditingProfile(false);
      setMessage("Profile updated successfully!");
    } catch (err) { setError(err.message); }
  }

  /* ── bookings ───────────────────────────────────────── */
  async function handleUpdateBookingStatus(bookingId, status) {
    setError(""); setMessage("");
    try {
      const res  = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update booking status.");
      setMessage(`Booking marked as ${status}.`);
      loadDashboardData();
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("Permanently delete this booking request?")) return;
    setError(""); setMessage("");
    try {
      const res  = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not delete booking.");
      setMessage("Booking deleted.");
      loadDashboardData();
    } catch (err) { setError(err.message); }
  }

  /* ── delete profile ─────────────────────────────────── */
  async function handleDeleteProfile() {
    if (!window.confirm("Permanently delete your provider profile and all appointments? This cannot be undone.")) return;
    setError(""); setMessage("");
    try {
      const res  = await fetch(`${API_URL}/api/providers/${provider._id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete provider profile.");
      alert("Provider profile deleted.");
      logout(); window.location.href = "/";
    } catch (err) { setError(err.message); }
  }

  /* ── availability ───────────────────────────────────── */
  async function handleSaveAvailability(updatedSlots) {
    if (!provider) return; setError(""); setMessage("");
    try {
      const res  = await fetch(`${API_URL}/api/providers/${provider._id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: updatedSlots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update availability.");
      setAvailabilitySlots(data.availability);
      setMessage("Availability updated.");
    } catch (err) { setError(err.message); }
  }

  function handleAddSlot(e) {
    e.preventDefault();
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return;
    if (newSlot.startTime >= newSlot.endTime) { setError("End time must be after start time."); return; }
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

  /* ── derived stats ──────────────────────────────────── */
  const unreadCount    = notifications.filter(n => !n.isRead).length;
  const openSlots      = availabilitySlots.filter(s => s.isAvailable).length;
  const upcomingBooks  = bookings.filter(b => b.status === "pending" || b.status === "confirmed");

  /* ── loading ────────────────────────────────────────── */
  if (loading) {
    return (
      <main className="db-shell">
        <div className="db-loading">
          <div className="db-spinner" />
          <p>Loading your dashboard…</p>
        </div>
      </main>
    );
  }

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <main className="db-shell">

      {/* ── HEADER ──────────────────────────────────────── */}
      <header className="db-header">
        <div className="db-header-left">
          <p className="db-header-eyebrow">Provider Dashboard</p>
          <h1 className="db-header-title">
            Welcome back, {provider?.name || user?.name} 👋
          </h1>
          <p className="db-header-sub">
            Manage your services, bookings and availability from one place.
          </p>
        </div>
        <div className="db-header-right">
          {unreadCount > 0 && (
            <button
              className="db-notif-bell"
              onClick={() => setActiveTab("notifications")}
              title="View notifications"
            >
              🔔 <span className="db-notif-count">{unreadCount}</span>
            </button>
          )}
          {provider && <StatusBadge status={provider.verificationStatus} />}
        </div>
      </header>

      {/* ── BANNERS ─────────────────────────────────────── */}
      {error   && <div className="db-banner db-banner--error">{error}</div>}
      {message && <div className="db-banner db-banner--success">{message}</div>}

      {/* ── APPROVAL NOTICE ─────────────────────────────── */}
      {provider?.verificationStatus === "pending" && (
        <div className="db-notice db-notice--warn">
          <strong>⏳ Pending Admin Review</strong>
          <p>Your profile is under review. Once approved your services will appear in public search and customers can book you.</p>
        </div>
      )}
      {provider?.verificationStatus === "rejected" && (
        <div className="db-notice db-notice--danger">
          <strong>✕ Application Rejected</strong>
          <p>Your listing is not approved and is hidden from public discovery. Update your profile and contact support.</p>
        </div>
      )}

      {/* ── STATS CARDS ─────────────────────────────────── */}
      <section className="db-stats-grid">
        <StatCard icon="📅" label="Total Bookings"  value={bookings.length}          sub={`${upcomingBooks.length} upcoming`} />
        <StatCard icon="🕐" label="Available Slots" value={openSlots}                 sub={`of ${availabilitySlots.length} total`} />
        <StatCard icon="⭐" label="Rating"           value={provider?.rating ? `${provider.rating} / 5` : "—"}  sub={provider?.rating ? "Average rating" : "No ratings yet"} />
        <StatCard icon="💰" label="Hourly Rate"      value={provider?.hourlyRate ? `$${provider.hourlyRate}/hr` : "—"} />
      </section>

      {/* ── TABS ────────────────────────────────────────── */}
      <nav className="db-tabs">
        {[
          { id: "overview",       label: "Overview"       },
          { id: "bookings",       label: `Bookings (${bookings.length})` },
          { id: "availability",   label: "Availability"   },
          { id: "notifications",  label: unreadCount > 0 ? `Notifications 🔴${unreadCount}` : "Notifications" },
        ].map(t => (
          <button
            key={t.id}
            className={`db-tab${activeTab === t.id ? " db-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="db-grid-2">

          {/* PROFILE CARD */}
          <div className="db-card">
            <div className="db-card-head">
              <h2 className="db-card-title">My Profile</h2>
              <div className="db-card-actions">
                <button
                  className="db-btn db-btn--primary"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                >
                  {isEditingProfile ? "✕ Cancel" : "✏️ Edit Profile"}
                </button>
                <button className="db-btn db-btn--danger" onClick={handleDeleteProfile}>
                  🗑️ Delete
                </button>
              </div>
            </div>

            {isEditingProfile ? (
              <form className="db-profile-form" onSubmit={handleUpdateProfileSubmit}>
                <div className="db-form-grid">
                  <div className="form-group">
                    <label htmlFor="edit-name">Provider Name</label>
                    <input id="edit-name" type="text" required value={profileForm.name}
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-category">Category</label>
                    <select id="edit-category" required value={profileForm.category}
                      onChange={e => setProfileForm({ ...profileForm, category: e.target.value })}>
                      <option value="">Select category</option>
                      <option>Electrician</option><option>Plumber</option>
                      <option>Tutor</option><option>Cleaner</option>
                      <option>Carpenter</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-location">Location</label>
                    <input id="edit-location" type="text" required value={profileForm.location}
                      onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-hourlyRate">Hourly Rate ($)</label>
                    <input id="edit-hourlyRate" type="number" min="0" required value={profileForm.hourlyRate}
                      onChange={e => setProfileForm({ ...profileForm, hourlyRate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-phone">Phone</label>
                    <input id="edit-phone" type="tel" value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-email">Email</label>
                    <input id="edit-email" type="email" value={profileForm.email}
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="edit-services">Services (comma-separated)</label>
                    <input id="edit-services" type="text" value={profileForm.services}
                      placeholder="e.g. Wiring, Fan Repair, MCB Replacement"
                      onChange={e => setProfileForm({ ...profileForm, services: e.target.value })} />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="edit-description">Bio / Description</label>
                    <textarea id="edit-description" rows="3" value={profileForm.description}
                      onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} />
                  </div>
                </div>
                <div className="db-form-actions">
                  <button className="db-btn db-btn--primary" type="submit">💾 Save Profile</button>
                  <button className="db-btn db-btn--ghost" type="button" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="db-profile-info">
                <div className="db-profile-row">
                  <span className="db-profile-label">📍 Location</span>
                  <span>{provider?.location || "—"}</span>
                </div>
                <div className="db-profile-row">
                  <span className="db-profile-label">🔧 Category</span>
                  <span>{provider?.category || "—"}</span>
                </div>
                <div className="db-profile-row">
                  <span className="db-profile-label">💰 Hourly Rate</span>
                  <span>{provider?.hourlyRate ? `$${provider.hourlyRate}/hr` : "—"}</span>
                </div>
                <div className="db-profile-row">
                  <span className="db-profile-label">📞 Phone</span>
                  <span>{provider?.phone || "Not set"}</span>
                </div>
                <div className="db-profile-row">
                  <span className="db-profile-label">✉️ Email</span>
                  <span>{provider?.email || "—"}</span>
                </div>
                <div className="db-profile-row">
                  <span className="db-profile-label">🛠 Services</span>
                  <span>{provider?.services?.join(", ") || "General"}</span>
                </div>
                {provider?.description && (
                  <div className="db-profile-row db-profile-row--col">
                    <span className="db-profile-label">📝 Bio</span>
                    <p className="db-profile-bio">{provider.description}</p>
                  </div>
                )}
                <div className="db-profile-row">
                  <span className="db-profile-label">✅ Status</span>
                  <StatusBadge status={provider?.verificationStatus} />
                </div>
              </div>
            )}
          </div>

          {/* QUICK ACTIONS + MINI NOTIFICATION PREVIEW */}
          <div className="db-col-right">

            {/* Quick Actions */}
            <div className="db-card db-quick-actions">
              <h2 className="db-card-title">Quick Actions</h2>
              <div className="db-qa-grid">
                <button className="db-qa-btn" onClick={() => { setIsEditingProfile(true); setActiveTab("overview"); }}>
                  <span className="db-qa-icon">✏️</span>
                  <span>Update Profile</span>
                </button>
                <button className="db-qa-btn" onClick={() => setActiveTab("availability")}>
                  <span className="db-qa-icon">📅</span>
                  <span>Manage Availability</span>
                </button>
                <button className="db-qa-btn" onClick={() => setActiveTab("bookings")}>
                  <span className="db-qa-icon">📋</span>
                  <span>View Bookings</span>
                </button>
                <button className="db-qa-btn" onClick={() => setActiveTab("notifications")}>
                  <span className="db-qa-icon">🔔</span>
                  <span>Notifications{unreadCount > 0 && <span className="db-qa-badge">{unreadCount}</span>}</span>
                </button>
              </div>
            </div>

            {/* Upcoming Bookings mini-preview */}
            <div className="db-card">
              <h2 className="db-card-title">Upcoming Bookings</h2>
              {upcomingBooks.length === 0 ? (
                <div className="db-empty-state">
                  <p className="db-empty-icon">📋</p>
                  <p className="db-empty-title">No upcoming bookings</p>
                  <p className="db-empty-sub">New customer bookings will appear here.</p>
                </div>
              ) : (
                <div className="db-upcoming-list">
                  {upcomingBooks.slice(0, 4).map(b => (
                    <div className="db-upcoming-item" key={b._id}>
                      <div>
                        <p className="db-upcoming-name">{b.customerName}</p>
                        <p className="db-upcoming-meta">{b.service} · {b.date} {b.startTime}–{b.endTime}</p>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  ))}
                  {upcomingBooks.length > 4 && (
                    <button className="db-view-all-btn" onClick={() => setActiveTab("bookings")}>
                      View all {upcomingBooks.length} bookings →
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: BOOKINGS
      ══════════════════════════════════════════════════ */}
      {activeTab === "bookings" && (
        <div className="db-card">
          <div className="db-card-head">
            <h2 className="db-card-title">📋 Booking Requests</h2>
            <span className="db-count-pill">{bookings.length} total</span>
          </div>

          {bookings.length === 0 ? (
            <div className="db-empty-state">
              <p className="db-empty-icon">📋</p>
              <p className="db-empty-title">No booking requests yet</p>
              <p className="db-empty-sub">New customer bookings will appear here once customers discover your profile.</p>
            </div>
          ) : (
            <div className="db-booking-list">
              {bookings.map(b => (
                <article className="db-booking-card" key={b._id}>
                  <div className="db-booking-top">
                    <div>
                      <BookingStatusBadge status={b.status} />
                      <h3 className="db-booking-service">{b.service}</h3>
                      <p className="db-booking-meta">
                        👤 {b.customerName} &nbsp;·&nbsp; ✉️ {b.customerEmail}
                      </p>
                      <p className="db-booking-meta">
                        📅 {b.date} &nbsp;·&nbsp; ⏰ {b.startTime}–{b.endTime}
                      </p>
                      {b.notes && <p className="db-booking-notes">📝 {b.notes}</p>}
                    </div>
                    <div className="db-booking-actions">
                      {b.status === "pending" && (
                        <>
                          <button className="db-btn db-btn--primary" onClick={() => handleUpdateBookingStatus(b._id, "confirmed")}>
                            ✓ Confirm
                          </button>
                          <button className="db-btn db-btn--danger-ghost" onClick={() => handleDeleteBooking(b._id)}>
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {b.status === "confirmed" && (
                        <>
                          <button className="db-btn db-btn--primary" onClick={() => handleUpdateBookingStatus(b._id, "completed")}>
                            ✓ Complete
                          </button>
                          <button className="db-btn db-btn--danger-ghost" onClick={() => handleDeleteBooking(b._id)}>
                            Cancel
                          </button>
                        </>
                      )}
                      {(b.status === "completed" || b.status === "cancelled") && (
                        <button className="db-btn db-btn--danger-ghost" onClick={() => handleDeleteBooking(b._id)}>
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: AVAILABILITY
      ══════════════════════════════════════════════════ */}
      {activeTab === "availability" && (
        <div className="db-card">
          <div className="db-card-head">
            <h2 className="db-card-title">📅 Availability Schedule</h2>
            <span className="db-count-pill">{openSlots} open slot{openSlots !== 1 ? "s" : ""}</span>
          </div>

          {/* Add slot form */}
          <div className="db-add-slot-wrap">
            <h3 className="db-subsection-title">Add New Time Slot</h3>
            <form className="db-add-slot-form" onSubmit={handleAddSlot}>
              <label className="db-slot-label">
                Date
                <input type="date" required value={newSlot.date}
                  onChange={e => setNewSlot({ ...newSlot, date: e.target.value })} />
              </label>
              <label className="db-slot-label">
                From
                <input type="time" required value={newSlot.startTime}
                  onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })} />
              </label>
              <label className="db-slot-label">
                To
                <input type="time" required value={newSlot.endTime}
                  onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })} />
              </label>
              <button className="db-btn db-btn--primary" type="submit">+ Add Slot</button>
            </form>
          </div>

          {/* Slot list */}
          {availabilitySlots.length === 0 ? (
            <div className="db-empty-state">
              <p className="db-empty-icon">🗓️</p>
              <p className="db-empty-title">No time slots added</p>
              <p className="db-empty-sub">Customers cannot book you until you add available slots above.</p>
            </div>
          ) : (
            <div className="db-slots-list">
              {availabilitySlots.map((slot, index) => (
                <div className={`db-slot-item${slot.isAvailable ? "" : " db-slot-item--booked"}`} key={index}>
                  <div className="db-slot-info">
                    <span className="db-slot-date">📅 {slot.date}</span>
                    <span className="db-slot-time">⏰ {slot.startTime} – {slot.endTime}</span>
                    <span className={`db-slot-status${slot.isAvailable ? "" : " db-slot-status--booked"}`}>
                      {slot.isAvailable ? "Open" : "Booked"}
                    </span>
                  </div>
                  <button className="db-btn db-btn--danger-ghost db-slot-remove" onClick={() => handleRemoveSlot(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: NOTIFICATIONS
      ══════════════════════════════════════════════════ */}
      {activeTab === "notifications" && (
        <div className="db-card">
          <div className="db-card-head">
            <h2 className="db-card-title">
              🔔 Notifications
              {unreadCount > 0 && <span className="db-unread-pill">{unreadCount} unread</span>}
            </h2>
            {notifications.some(n => !n.isRead) && (
              <button className="db-btn db-btn--ghost" onClick={handleMarkAllNotificationsRead}>
                ✓ Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="db-empty-state">
              <p className="db-empty-icon">🔔</p>
              <p className="db-empty-title">No notifications yet</p>
              <p className="db-empty-sub">New booking requests will appear here as notifications.</p>
            </div>
          ) : (
            <div className="db-notif-list">
              {notifications.map(n => {
                const meta = n.metadata || {};
                const time = n.createdAt
                  ? new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <article key={n._id} className={`db-notif-item${n.isRead ? " db-notif-item--read" : ""}`}>
                    <div className="db-notif-dot" />
                    <div className="db-notif-body">
                      <div className="db-notif-top">
                        <span className="db-notif-title">{n.title || "New Booking"}</span>
                        {!n.isRead && <span className="db-new-pill">NEW</span>}
                        {time && <span className="db-notif-time">{time}</span>}
                      </div>
                      <p className="db-notif-msg">{n.message}</p>
                      <div className="db-notif-meta-grid">
                        {meta.customerName && <span>👤 {meta.customerName}</span>}
                        {meta.service      && <span>🛠 {meta.service}</span>}
                        {meta.date         && <span>📅 {meta.date}</span>}
                        {meta.startTime && meta.endTime && <span>⏰ {meta.startTime}–{meta.endTime}</span>}
                        {meta.bookingStatus && <span>Status: {meta.bookingStatus}</span>}
                        {meta.notes        && <span>📝 {meta.notes}</span>}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        className="db-btn db-btn--ghost db-notif-read-btn"
                        onClick={() => handleMarkNotificationRead(n._id)}
                      >
                        ✓ Read
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

    </main>
  );
}

export default ProviderDashboard;
