import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

function BookingsPage({ bookings, onUpdateBookingStatus, onRefreshBookings }) {
    const { isCustomer } = useAuth();
    const [error, setError] = useState("");
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        if (onRefreshBookings) {
            onRefreshBookings();
        }
    }, []);

    async function updateStatus(bookingId, status) {
        setError("");
        setCancellingId(bookingId);
        try {
            await onUpdateBookingStatus(bookingId, status);
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
                <p>Track your scheduled services, cancel upcoming appointments, or leave reviews for completed services.</p>
            </section>

            <section className="providers-section booking-list">
                {error && <p className="form-error">{error}</p>}
                {bookings.length === 0 ? (
                    <div className="empty-message-container" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <p className="empty-message">You do not have any active or past bookings.</p>
                        <Link to="/services" className="submit-button" style={{ display: "inline-block", marginTop: "14px", textDecoration: "none" }}>
                            Browse Services & Book
                        </Link>
                    </div>
                ) : bookings.map(booking => {
                    const providerId = booking.provider?._id || booking.provider;
                    return (
                        <article className="booking-item" key={booking._id}>
                            <div>
                                <p className={`provider-category status-tag status-${booking.status}`}>{booking.status.toUpperCase()}</p>
                                <h2>{booking.service}</h2>
                                <p><strong>Provider:</strong> {booking.provider?.name || "Provider"}</p>
                                <p><strong>Customer:</strong> {booking.customerName} · {booking.customerEmail}</p>
                                <p><strong>When:</strong> {booking.date}, {booking.startTime}–{booking.endTime}</p>
                                {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
                            </div>
                            <div className="booking-actions">
                                {(booking.status === "pending" || booking.status === "confirmed") && (
                                    <button
                                        className="secondary-button"
                                        type="button"
                                        disabled={cancellingId === booking._id}
                                        onClick={() => updateStatus(booking._id, "cancelled")}
                                    >
                                        {cancellingId === booking._id ? "Cancelling..." : "Cancel Booking"}
                                    </button>
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