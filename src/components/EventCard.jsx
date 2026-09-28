import { Link } from "react-router";

function EventCard({ provider }) {
  return (
    <article className="provider-card">
      <p className="provider-category">{provider.category}</p>
      <h3>{provider.name}</h3>
      <p className="provider-description">
        {provider.description || "Local service provider"}
      </p>

      <div className="provider-details">
        <p><strong>Location:</strong> {provider.location}</p>
        <p><strong>Rate:</strong> ${provider.hourlyRate}/hour</p>
        <p>
          <strong>Rating:</strong>{" "}
          {provider.reviewCount > 0
            ? `${provider.averageRating.toFixed(1)} / 5 (${provider.reviewCount})`
            : "No reviews yet"}
        </p>
      </div>

      <Link className="details-button" to={`/providers/${provider._id}`}>
        View profile and availability
      </Link>
    </article>
  );
}

export default EventCard;