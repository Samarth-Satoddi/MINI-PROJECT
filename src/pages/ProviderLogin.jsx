import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../config/api";

function ProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/provider/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (data.user.role !== "provider") {
        throw new Error("This login is for service providers. Please use the Customer Login.");
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
        <p className="section-label">Provider Portal</p>
        <h1>Provider Login</h1>
        <p>Log in to access your provider dashboard, manage bookings, and update availability.</p>
      </section>

      <section className="provider-form-section auth-form-section">
        <form className="provider-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="form-group full-width">
            <label htmlFor="provider-login-email">Email Address</label>
            <input
              id="provider-login-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ramesh@example.com"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="provider-login-password">Password</label>
            <input
              id="provider-login-password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In as Provider"}
          </button>

          <p className="auth-switch-text">
            Not registered yet? <Link to="/provider/register">Register as a Provider</Link>
          </p>
          <p className="auth-switch-text secondary">
            Are you a customer? <Link to="/customer/login">Customer Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default ProviderLogin;
