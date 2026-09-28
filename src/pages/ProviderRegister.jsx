import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../config/api";

function ProviderRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("Electrician");
  const [location, setLocation] = useState("Bangalore");
  const [hourlyRate, setHourlyRate] = useState(350);
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: "provider",
          providerDetails: {
            category,
            location,
            hourlyRate: Number(hourlyRate),
            phone,
            services: services.split(",").map(s => s.trim()).filter(Boolean),
            description,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      login(data);
      navigate("/provider/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-heading">
        <p className="section-label">Provider Portal</p>
        <h1>Register as a Service Provider</h1>
        <p>Offer your skills and services to customers. Set your rates, location, and manage availability.</p>
      </section>

      <section className="provider-form-section auth-form-section">
        <form className="provider-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="form-group">
            <label htmlFor="provider-name">Business / Professional Name</label>
            <input
              id="provider-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ramesh Electricals"
            />
          </div>

          <div className="form-group">
            <label htmlFor="provider-email">Email Address (Login)</label>
            <input
              id="provider-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ramesh@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="provider-password">Password (min. 6 characters)</label>
            <input
              id="provider-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label htmlFor="provider-category">Primary Category</label>
            <select
              id="provider-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option>Electrician</option>
              <option>Plumber</option>
              <option>Tutor</option>
              <option>Cleaner</option>
              <option>Carpenter</option>
              <option>Painter</option>
              <option>AC Technician</option>
              <option>Appliance Repair</option>
              <option>Barber</option>
              <option>Gardener</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="provider-location">City / Location</label>
            <input
              id="provider-location"
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Bangalore"
            />
          </div>

          <div className="form-group">
            <label htmlFor="provider-rate">Hourly Rate ($ or ₹)</label>
            <input
              id="provider-rate"
              type="number"
              min="0"
              required
              value={hourlyRate}
              onChange={e => setHourlyRate(e.target.value)}
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="provider-phone">Contact Phone</label>
            <input
              id="provider-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="9876543210"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="provider-services">Specific Services (comma separated)</label>
            <input
              id="provider-services"
              type="text"
              value={services}
              onChange={e => setServices(e.target.value)}
              placeholder="Wiring, Fuse Replacement, Fan Fitting"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="provider-description">Profile Description</label>
            <textarea
              id="provider-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your expertise and service experience..."
            />
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "Registering..." : "Submit Provider Registration"}
          </button>

          <p className="auth-switch-text">
            Already registered as a provider? <Link to="/provider/login">Provider Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default ProviderRegister;
