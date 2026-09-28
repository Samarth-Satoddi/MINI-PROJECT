import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../config/api";

function EventDetailsPage({ providers, providersLoaded, bookings, onCreateBooking }) {
    const { providerId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isCustomer, token, user } = useAuth();

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
        if (user) {
            setBookingForm(prev => ({
                ...prev,
                customerName: prev.customerName || user.name || "",
                customerEmail: prev.customerEmail || user.email || ""
            }));
            setReviewForm(prev => ({
                ...prev,
                reviewerName: prev.reviewerName || user.name || ""
            }));
        }
    }, [user]);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            fetch(`${API_URL}/api/providers/${providerId}/availability`).then(response => response.json()),
            fetch(`${API_URL}/api/providers/${providerId}/reviews`).then(response => response.json()),
        ])
            .then(([availableSlots, providerReviews]) => {
                if (isCurrent) {
                    setAvailability(Array.isArray(availableSlots) ? availableSlots : []);
                    setReviews(Array.isArray(providerReviews) ? providerReviews : []);
                }
            })
            .catch(() => {
                if (isCurrent) setFormError("Provider information could not be loaded.");
            });

        return () => {
            isCurrent = false;
        };
    }, [providerId]);

    const availableSlots = (availability || []).filter(slot => slot && slot.isAvailable);
    const completedBookings = (bookings || []).filter(booking => (
        booking.status === "completed" && (booking.provider?._id === providerId || booking.provider === providerId)
    ));
    const services = provider?.services?.length ? provider.services : [provider?.category];

    async function handleBookingSubmit(event) {
        event.preventDefault();
        setFormError("");
        setMessage("");

        // If not logged in, redirect to customer login
        if (!isAuthenticated) {
            navigate("/customer/login", { state: { from: `/providers/${providerId}` } });
            return;
        }

        if (!isCustomer) {
            setFormError("Only customer accounts can book services. Please log in with a customer account.");
            return;
        }

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
            setBookingForm({ customerName: user?.name || "", customerEmail: user?.email || "", service: "", notes: "" });
            setSelectedSlot("");
            setMessage("Booking request submitted successfully! View your appointment under Bookings.");
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

        if (!isAuthenticated || !isCustomer) {
            setFormError("You must be logged in as a customer to submit a review.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/providers/${providerId}/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...reviewForm,
                    rating: Number(reviewForm.rating),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Review could not be submitted.");
            setReviews([data.review, ...reviews]);
            setReviewForm({ bookingId: "", reviewerName: user?.name || "", rating: "5", comment: "" });
            setMessage("Review submitted successfully! Thank you for your feedback.");
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
                <p>The provider you are looking for does not exist or has been removed.</p>
                <Link to="/services">Back to all services</Link>
            </section>
        );
    }

    return (
        <main className="provider-details-page">
            <p className="section-label">{provider.category}</p>
            <h1>{provider.name}</h1>
            <p className="provider-description">{provider.description}</p>

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
                    <p className="empty-message">No available times are listed currently.</p>
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

                {!isAuthenticated && (
                    <p className="auth-notice-banner">
                        🔒 Please <Link to="/customer/login" state={{ from: `/providers/${providerId}` }}>Log In as Customer</Link> to schedule an appointment.
                    </p>
                )}

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
                    <button className="submit-button" type="submit">
                        {isAuthenticated ? "Request booking" : "Log In to Book"}
                    </button>
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
                                <div>
                                    <p><strong>{review.reviewerName}</strong> · {review.rating} / 5</p>
                                    <p>{review.comment}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {completedBookings.length > 0 && isAuthenticated && isCustomer && (
                    <form className="provider-form review-form" onSubmit={handleReviewSubmit}>
                        <h3>Leave a review</h3>
                        <div className="form-group">
                            <label htmlFor="bookingId">Completed booking</label>
                            <select id="bookingId" value={reviewForm.bookingId} onChange={event => setReviewForm({ ...reviewForm, bookingId: event.target.value })} required>
                                <option value="">Select your completed booking</option>
                                {completedBookings.map(item => (
                                    <option key={item._id} value={item._id}>{item.service} on {item.date}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reviewerName">Your name</label>
                            <input id="reviewerName" value={reviewForm.reviewerName} onChange={event => setReviewForm({ ...reviewForm, reviewerName: event.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rating">Rating (1 to 5)</label>
                            <select id="rating" value={reviewForm.rating} onChange={event => setReviewForm({ ...reviewForm, rating: event.target.value })}>
                                <option value="5">5 - Excellent</option>
                                <option value="4">4 - Good</option>
                                <option value="3">3 - Average</option>
                                <option value="2">2 - Poor</option>
                                <option value="1">1 - Terrible</option>
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label htmlFor="comment">Comment</label>
                            <textarea id="comment" value={reviewForm.comment} onChange={event => setReviewForm({ ...reviewForm, comment: event.target.value })} required />
                        </div>
                        <button className="submit-button" type="submit">Submit review</button>
                    </form>
                )}
            </section>
        </main>
    );
}

export default EventDetailsPage;