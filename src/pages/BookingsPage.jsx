import { useState } from "react";
import { Link } from "react-router";

function BookingsPage({ bookings, onUpdateBookingStatus }) {
    const [error, setError] = useState("");

    async function updateStatus(bookingId, status) {
        setError("");
        try {
            await onUpdateBookingStatus(bookingId, status);
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <main className="page-shell">
            <section className="page-heading">
                <p className="section-label">Booking system</p>
                <h1>Service bookings</h1>
                <p>Review requests and update a booking as it moves from pending to completed.</p>
            </section>

            <section className="providers-section booking-list">
                {error && <p className="form-error">{error}</p>}
                {bookings.length === 0 ? (
                    <p className="empty-message">No bookings have been made.</p>
                ) : bookings.map(booking => (
                    <article className="booking-item" key={booking._id}>
                        <div>
                            <p className="provider-category">{booking.status}</p>
                            <h2>{booking.service}</h2>
                            <p><strong>Provider:</strong> {booking.provider?.name || "Provider"}</p>
                            <p><strong>Customer:</strong> {booking.customerName} · {booking.customerEmail}</p>
                            <p><strong>When:</strong> {booking.date}, {booking.startTime}–{booking.endTime}</p>
                            {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
                        </div>
                        <div className="booking-actions">
                            {booking.status === "pending" && (
                                <>
                                    <button className="submit-button" type="button" onClick={() => updateStatus(booking._id, "confirmed")}>Confirm</button>
                                    <button className="secondary-button" type="button" onClick={() => updateStatus(booking._id, "cancelled")}>Cancel</button>
                                </>
                            )}
                            {booking.status === "confirmed" && (
                                <>
                                    <button className="submit-button" type="button" onClick={() => updateStatus(booking._id, "completed")}>Mark completed</button>
                                    <button className="secondary-button" type="button" onClick={() => updateStatus(booking._id, "cancelled")}>Cancel</button>
                                </>
                            )}
                            {booking.status === "completed" && booking.provider?._id && (
                                <Link className="details-button" to={`/providers/${booking.provider._id}`}>Review provider</Link>
                            )}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}

export default BookingsPage;