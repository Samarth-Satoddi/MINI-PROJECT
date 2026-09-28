import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000";

function CustomerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/bookings";

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

      if (data.user.role !== "customer") {
        throw new Error("This login is for customers. Please use the Provider Login.");
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
        <h1>Customer Login</h1>
        <p>Log in to access your booked services, schedule new appointments, or write reviews.</p>
      </section>

      <section className="provider-form-section auth-form-section">
        <form className="provider-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="form-group full-width">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="rahul@example.com"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In as Customer"}
          </button>

          <p className="auth-switch-text">
            Don't have a customer account? <Link to="/customer/register">Register as Customer</Link>
          </p>
          <p className="auth-switch-text secondary">
            Are you a service provider? <Link to="/provider/login">Provider Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default CustomerLogin;
