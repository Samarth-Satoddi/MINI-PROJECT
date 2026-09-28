import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { isAuthenticated, isCustomer, isProvider, user, logout } = useAuth();
  const navigate = useNavigate();

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

        {/* Logged in as Provider: show Dashboard */}
        {isAuthenticated && isProvider && (
          <NavLink className={getNavLinkClass} to="/provider/dashboard">
            Provider Dashboard
          </NavLink>
        )}

        <NavLink className={getNavLinkClass} to="/about">
          About
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