import { useState } from "react";
import EventCard from "./EventCard";

function EventSection({ providers, title = "Find a local professional" }) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [locationText, setLocationText] = useState("");

  const filteredProviders = providers.filter(provider => {
    const search = searchText.toLowerCase();
    const location = locationText.toLowerCase();
    const matchesSearch = [provider.name, provider.category, ...(provider.services || [])]
      .some(value => value.toLowerCase().includes(search));
    const matchesCategory = selectedCategory === "All" || provider.category === selectedCategory;
    const matchesLocation = provider.location.toLowerCase().includes(location);
    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <section id="services" className="providers-section">
      <div className="section-heading">
        <div>
          <p className="section-label">Verified local professionals</p>
          <h2>{title}</h2>
        </div>
        <p>{filteredProviders.length} providers</p>
      </div>

      <div className="search-filter-bar">
        <input
          type="search"
          aria-label="Search providers and services"
          value={searchText}
          onChange={event => setSearchText(event.target.value)}
          placeholder="Electrician, tutor, cleaner..."
        />
        <select
          aria-label="Filter by service category"
          value={selectedCategory}
          onChange={event => setSelectedCategory(event.target.value)}
        >
          <option value="All">All services</option>
          <option>Electrician</option>
          <option>Tutor</option>
          <option>Cleaner</option>
          <option>Plumber</option>
          <option>Carpenter</option>
          <option>Other</option>
        </select>
        <input
          type="search"
          aria-label="Filter by location"
          value={locationText}
          onChange={event => setLocationText(event.target.value)}
          placeholder="City or neighborhood"
        />
      </div>

      {filteredProviders.length === 0 ? (
        <p className="empty-message">No verified providers match those filters yet.</p>
      ) : (
        <div className="provider-grid">
          {filteredProviders.map(provider => (
            <EventCard key={provider._id} provider={provider} />
          ))}
        </div>
      )}
    </section>
  );
}

export default EventSection;