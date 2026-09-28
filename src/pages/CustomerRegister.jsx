import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../config/api";

function CustomerRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/services";

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
          role: "customer",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-heading">
        <p className="section-label">Customer Portal</p>
        <h1>Create Customer Account</h1>
        <p>Sign up to book verified local services, track your requests, and share reviews.</p>
      </section>

      <section className="provider-form-section auth-form-section">
        <form className="provider-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="form-group full-width">
            <label htmlFor="customer-name">Full Name</label>
            <input
              id="customer-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="customer-email">Email Address</label>
            <input
              id="customer-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="rahul@example.com"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="customer-password">Password (min. 6 characters)</label>
            <input
              id="customer-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Register as Customer"}
          </button>

          <p className="auth-switch-text">
            Already have an account? <Link to="/customer/login">Customer Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default CustomerRegister;
