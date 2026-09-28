import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

const API_URL = "http://localhost:5000";

function EventDetailsPage({ providers, providersLoaded, bookings, onCreateBooking }) {
    const { providerId } = useParams();
    const provider = providers.find(item => item._id === providerId);
    const [availability, setAvailability] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [bookingForm, setBookingForm] = useState({
        customerName: "",
        customerEmail: "",
        service: "",
        notes: "",
    });
    const [reviewForm, setReviewForm] = useState({
        bookingId: "",
        reviewerName: "",
        rating: "5",
        comment: "",
    });
    const [formError, setFormError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            fetch(`${API_URL}/api/providers/${providerId}/availability`).then(response => response.json()),
            fetch(`${API_URL}/api/providers/${providerId}/reviews`).then(response => response.json()),
        ])
            .then(([availableSlots, providerReviews]) => {
                if (isCurrent) {
                    setAvailability(availableSlots);
                    setReviews(providerReviews);
                }
            })
            .catch(() => {
                if (isCurrent) setFormError("Provider information could not be loaded.");
            });

        return () => {
            isCurrent = false;
        };
    }, [providerId]);

    const availableSlots = availability.filter(slot => slot.isAvailable);
    const completedBookings = bookings.filter(booking => (
        booking.status === "completed" && booking.provider?._id === providerId
    ));
    const services = provider?.services?.length ? provider.services : [provider?.category];

    async function handleBookingSubmit(event) {
        event.preventDefault();
        setFormError("");
        setMessage("");
        const slot = availableSlots.find(item => (
            `${item.date}|${item.startTime}|${item.endTime}` === selectedSlot
        ));

        if (!slot) {
            setFormError("Choose an available time from the calendar.");
            return;
        }

        try {
            await onCreateBooking({
                providerId,
                ...bookingForm,
                ...slot,
            });
            setBookingForm({ customerName: "", customerEmail: "", service: "", notes: "" });
            setSelectedSlot("");
            setMessage("Booking request submitted.");
            const response = await fetch(`${API_URL}/api/providers/${providerId}/availability`);
            setAvailability(await response.json());
        } catch (error) {
            setFormError(error.message);
        }
    }

    async function handleReviewSubmit(event) {
        event.preventDefault();
        setFormError("");
        setMessage("");

        try {
            const response = await fetch(`${API_URL}/api/providers/${providerId}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...reviewForm,
                    rating: Number(reviewForm.rating),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Review could not be submitted.");
            setReviews([data.review, ...reviews]);
            setReviewForm({ bookingId: "", reviewerName: "", rating: "5", comment: "" });
            setMessage("Review submitted.");
        } catch (error) {
            setFormError(error.message);
        }
    }

    if (!providersLoaded) {
        return <section className="page-heading"><h1>Loading provider...</h1></section>;
    }

    if (!provider) {
        return (
            <section className="page-heading">
                <h1>Provider not found</h1>
                <Link className="details-button" to="/services">Back to services</Link>
            </section>
        );
    }

    return (
        <main className="provider-details-page">
            <Link className="back-link" to="/services">Back to services</Link>
            <p className="provider-category">{provider.category}</p>
            <h1>{provider.name}</h1>
            <p className="provider-description">{provider.description || "Local service provider"}</p>

            <div className="details-box">
                <p><strong>Location:</strong> {provider.location}</p>
                <p><strong>Hourly rate:</strong> ${provider.hourlyRate}</p>
                <p><strong>Rating:</strong> {provider.reviewCount && typeof provider.averageRating === "number" ? `${provider.averageRating.toFixed(1)} / 5 from ${provider.reviewCount} reviews` : "No reviews yet"}</p>
                {provider.phone && <p><strong>Phone:</strong> {provider.phone}</p>}
                {provider.email && <p><strong>Email:</strong> {provider.email}</p>}
                {services.filter(Boolean).length > 0 && <p><strong>Services:</strong> {services.filter(Boolean).join(", ")}</p>}
            </div>

            <section className="profile-section">
                <p className="section-label">Availability calendar</p>
                <h2>Available booking times</h2>
                {availableSlots.length === 0 ? (
                    <p className="empty-message">No available times are listed.</p>
                ) : (
                    <div className="availability-list">
                        {availableSlots.map((slot, index) => {
                            const slotValue = `${slot.date}|${slot.startTime}|${slot.endTime}`;
                            return (
                                <label className={`availability-slot${selectedSlot === slotValue ? " selected-slot" : ""}`} key={`${slotValue}-${index}`}>
                                    <input type="radio" name="availability" value={slotValue} checked={selectedSlot === slotValue} onChange={() => setSelectedSlot(slotValue)} />
                                    <span>{new Date(`${slot.date}T00:00:00`).toLocaleDateString()} · {slot.startTime}–{slot.endTime}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="profile-section">
                <p className="section-label">Request a service</p>
                <h2>Book this provider</h2>
                <form className="provider-form booking-form" onSubmit={handleBookingSubmit}>
                    <div className="form-group">
                        <label htmlFor="customerName">Your name</label>
                        <input id="customerName" value={bookingForm.customerName} onChange={event => setBookingForm({ ...bookingForm, customerName: event.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="customerEmail">Email</label>
                        <input id="customerEmail" type="email" value={bookingForm.customerEmail} onChange={event => setBookingForm({ ...bookingForm, customerEmail: event.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="service">Service</label>
                        <select id="service" value={bookingForm.service} onChange={event => setBookingForm({ ...bookingForm, service: event.target.value })} required>
                            <option value="">Choose a service</option>
                            {services.filter(Boolean).map(service => <option key={service}>{service}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="bookingSlot">Available time</label>
                        <select id="bookingSlot" value={selectedSlot} onChange={event => setSelectedSlot(event.target.value)} required disabled={availableSlots.length === 0}>
                            <option value="">{availableSlots.length === 0 ? "No available times (all booked)" : "Choose a time"}</option>
                            {availableSlots.map((slot, index) => {
                                const slotValue = `${slot.date}|${slot.startTime}|${slot.endTime}`;
                                return <option key={`${slotValue}-${index}`} value={slotValue}>{slot.date}, {slot.startTime}–{slot.endTime}</option>;
                            })}
                        </select>
                    </div>
                    <div className="form-group full-width">
                        <label htmlFor="notes">Notes</label>
                        <textarea id="notes" value={bookingForm.notes} onChange={event => setBookingForm({ ...bookingForm, notes: event.target.value })} />
                    </div>
                    {formError && <p className="form-error">{formError}</p>}
                    {message && <p className="form-success">{message}</p>}
                    <button className="submit-button" type="submit">Request booking</button>
                </form>
            </section>

            <section className="profile-section">
                <p className="section-label">Customer feedback</p>
                <h2>Reviews and ratings</h2>
                {reviews.length === 0 ? (
                    <p className="empty-message">No reviews yet.</p>
                ) : (
                    <div className="review-list">
                        {reviews.map(review => (
                            <article className="review-item" key={review._id}>
                                <div className="review-heading">
                                    <strong>{review.reviewerName}</strong>
                                    <span>{review.rating} / 5</span>
                                </div>
                                <p>{review.comment || "No written comment."}</p>
                            </article>
                        ))}
                    </div>
                )}

                {completedBookings.length > 0 && (
                    <form className="provider-form review-form" onSubmit={handleReviewSubmit}>
                        <h3>Leave a review for a completed booking</h3>
                        <div className="form-group">
                            <label htmlFor="reviewBooking">Completed booking</label>
                            <select id="reviewBooking" value={reviewForm.bookingId} onChange={event => setReviewForm({ ...reviewForm, bookingId: event.target.value })} required>
                                <option value="">Choose a booking</option>
                                {completedBookings.map(booking => <option key={booking._id} value={booking._id}>{booking.date} · {booking.service}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reviewerName">Your name</label>
                            <input id="reviewerName" value={reviewForm.reviewerName} onChange={event => setReviewForm({ ...reviewForm, reviewerName: event.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rating">Rating</label>
                            <select id="rating" value={reviewForm.rating} onChange={event => setReviewForm({ ...reviewForm, rating: event.target.value })}>
                                {[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label htmlFor="comment">Comment</label>
                            <textarea id="comment" value={reviewForm.comment} onChange={event => setReviewForm({ ...reviewForm, comment: event.target.value })} />
                        </div>
                        <button className="submit-button" type="submit">Submit review</button>
                    </form>
                )}
            </section>
        </main>
    );
}

export default EventDetailsPage;