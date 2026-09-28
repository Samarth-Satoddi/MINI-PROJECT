import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

function BookingsPage({ bookings, onUpdateBooking, onUpdateBookingStatus, onRefreshBookings }) {
    const { isCustomer } = useAuth();
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [cancellingId, setCancellingId] = useState(null);

    // Edit / Update Booking State
    const [editingBookingId, setEditingBookingId] = useState(null);
    const [editForm, setEditForm] = useState({
        date: "",
        startTime: "",
        endTime: "",
        notes: "",
        customerName: "",
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (onRefreshBookings) {
            onRefreshBookings();
        }
    }, []);

    function handleStartEdit(booking) {
        setEditingBookingId(booking._id);
        setError("");
        setMessage("");
        setEditForm({
            date: booking.date || "",
            startTime: booking.startTime || "",
            endTime: booking.endTime || "",
            notes: booking.notes || "",
            customerName: booking.customerName || "",
        });
    }

    function handleCancelEdit() {
        setEditingBookingId(null);
        setError("");
    }

    async function handleSaveEdit(e) {
        e.preventDefault();
        setError("");
        setMessage("");
        setIsSaving(true);

        try {
            if (editForm.startTime >= editForm.endTime) {
                throw new Error("End time must be after start time.");
            }

            if (onUpdateBooking) {
                await onUpdateBooking(editingBookingId, editForm);
            }
            setMessage("Booking updated successfully!");
            setEditingBookingId(null);
            if (onRefreshBookings) {
                onRefreshBookings();
            }
        } catch (err) {
            setError(err.message || "Failed to update booking.");
        } finally {
            setIsSaving(false);
        }
    }

    async function updateStatus(bookingId, status) {
        setError("");
        setMessage("");
        setCancellingId(bookingId);
        try {
            await onUpdateBookingStatus(bookingId, status);
            setMessage(`Booking ${status} successfully.`);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setCancellingId(null);
        }
    }

    return (
        <main className="page-shell">
            <section className="page-heading">
                <p className="section-label">Customer Portal</p>
                <h1>My Service Bookings</h1>
                <p>Track your scheduled services, update your appointment times or notes, cancel upcoming appointments, or leave reviews for completed services.</p>
            </section>

            {error && <p className="form-error banner-message">{error}</p>}
            {message && <p className="form-success banner-message">{message}</p>}

            <section className="providers-section booking-list">
                {bookings.length === 0 ? (
                    <div className="empty-message-container" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <p className="empty-message">You do not have any active or past bookings.</p>
                        <Link to="/services" className="submit-button" style={{ display: "inline-block", marginTop: "14px", textDecoration: "none" }}>
                            Browse Services & Book
                        </Link>
                    </div>
                ) : bookings.map(booking => {
                    const providerId = booking.provider?._id || booking.provider;
                    const isEditing = editingBookingId === booking._id;

                    return (
                        <article className="booking-item" key={booking._id} style={{ display: "block" }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <p className={`provider-category status-tag status-${booking.status}`}>
                                        {booking.status.toUpperCase()}
                                    </p>
                                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                                        Booked on: {new Date(booking.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <h2>{booking.service}</h2>
                                <p><strong>Provider:</strong> {booking.provider?.name || "Provider"}</p>
                                <p><strong>Customer:</strong> {booking.customerName} · {booking.customerEmail}</p>
                                <p><strong>When:</strong> 📅 {booking.date}, ⏰ {booking.startTime}–{booking.endTime}</p>
                                {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
                            </div>

                            {/* INLINE UPDATE BOOKING FORM */}
                            {isEditing && (
                                <div className="inline-update-box" style={{
                                    marginTop: "16px",
                                    padding: "16px",
                                    background: "var(--surface-soft)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "6px"
                                }}>
                                    <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "var(--primary-dark)" }}>
                                        ✏️ Update Booking Details
                                    </h3>
                                    <form onSubmit={handleSaveEdit}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                            <div className="form-group">
                                                <label htmlFor={`edit-date-${booking._id}`}>Date</label>
                                                <input
                                                    id={`edit-date-${booking._id}`}
                                                    type="date"
                                                    required
                                                    value={editForm.date}
                                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`edit-startTime-${booking._id}`}>From</label>
                                                <input
                                                    id={`edit-startTime-${booking._id}`}
                                                    type="time"
                                                    required
                                                    value={editForm.startTime}
                                                    onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`edit-endTime-${booking._id}`}>To</label>
                                                <input
                                                    id={`edit-endTime-${booking._id}`}
                                                    type="time"
                                                    required
                                                    value={editForm.endTime}
                                                    onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: "12px" }}>
                                            <label htmlFor={`edit-name-${booking._id}`}>Customer Name</label>
                                            <input
                                                id={`edit-name-${booking._id}`}
                                                type="text"
                                                required
                                                value={editForm.customerName}
                                                onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: "16px" }}>
                                            <label htmlFor={`edit-notes-${booking._id}`}>Instructions / Notes</label>
                                            <textarea
                                                id={`edit-notes-${booking._id}`}
                                                rows="2"
                                                value={editForm.notes}
                                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                                placeholder="Add special instructions for the provider..."
                                            />
                                        </div>

                                        <div style={{ display: "flex", gap: "10px" }}>
                                            <button className="submit-button" type="submit" disabled={isSaving}>
                                                {isSaving ? "Saving..." : "💾 Save & Update Booking"}
                                            </button>
                                            <button className="secondary-button" type="button" onClick={handleCancelEdit}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* CARD ACTION BUTTONS */}
                            <div className="booking-actions" style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                                {(booking.status === "pending" || booking.status === "confirmed") && !isEditing && (
                                    <>
                                        <button
                                            className="edit-provider-btn"
                                            type="button"
                                            onClick={() => handleStartEdit(booking)}
                                        >
                                            ✏️ Update Booking
                                        </button>
                                        <button
                                            className="secondary-button"
                                            type="button"
                                            disabled={cancellingId === booking._id}
                                            onClick={() => updateStatus(booking._id, "cancelled")}
                                        >
                                            {cancellingId === booking._id ? "Cancelling..." : "Cancel Booking"}
                                        </button>
                                    </>
                                )}

                                {!isCustomer && booking.status === "pending" && (
                                    <button className="submit-button" type="button" onClick={() => updateStatus(booking._id, "confirmed")}>
                                        Confirm
                                    </button>
                                )}

                                {!isCustomer && booking.status === "confirmed" && (
                                    <button className="submit-button" type="button" onClick={() => updateStatus(booking._id, "completed")}>
                                        Mark completed
                                    </button>
                                )}

                                {booking.status === "completed" && providerId && (
                                    <Link className="details-button" to={`/providers/${providerId}`}>
                                        Review Provider ★
                                    </Link>
                                )}
                            </div>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}

export default BookingsPage;