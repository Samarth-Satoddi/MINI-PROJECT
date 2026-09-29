import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";

function Navbar() {
  const { isAuthenticated, isCustomer, isProvider, user, token, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let isCurrent = true;
    if (isAuthenticated && isProvider && token) {
      fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (isCurrent && typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, isProvider, token]);

  function getNavLinkClass({ isActive }) {
    return isActive ? "nav-link active-link" : "nav-link";
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <NavLink className="brand-name" to="/">
        Local Services
      </NavLink>

      <div className="nav-links">
        <NavLink className={getNavLinkClass} to="/">
          Home
        </NavLink>

        <NavLink className={getNavLinkClass} to="/services">
          Find services
        </NavLink>

        {/* Customer bookings link */}
        {isAuthenticated && isCustomer && (
          <NavLink className={getNavLinkClass} to="/bookings">
            My Bookings
          </NavLink>
        )}

        {/* Not logged in: show customer & provider access */}
        {!isAuthenticated && (
          <>
            <NavLink className={getNavLinkClass} to="/bookings">
              Bookings
            </NavLink>
            <NavLink className={getNavLinkClass} to="/provider/login">
              For providers
            </NavLink>
            <NavLink className={getNavLinkClass} to="/customer/login">
              Customer Login
            </NavLink>
          </>
        )}

        {/* Logged in as Provider: show Dashboard & Notification Badge */}
        {isAuthenticated && isProvider && (
          <NavLink className={getNavLinkClass} to="/provider/dashboard">
            Provider Dashboard {unreadCount > 0 && <span style={{
              marginLeft: "6px",
              background: "#ef4444",
              color: "white",
              padding: "2px 7px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700"
            }}>🔔 {unreadCount}</span>}
          </NavLink>
        )}

        <NavLink className={getNavLinkClass} to="/about">
          About
        </NavLink>

        <NavLink className={getNavLinkClass} to="/admin">
          Admin
        </NavLink>

        {/* User badge and Logout button */}
        {isAuthenticated && (
          <div className="nav-auth-group">
            <span className="nav-user-greeting">
              👤 {user?.name} ({user?.role})
            </span>
            <button
              type="button"
              className="secondary-button nav-logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;