import { NavLink } from "react-router";

function Navbar() {
  function getNavLinkClass({ isActive }) {
    return isActive ? "nav-link active-link" : "nav-link";
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

        <NavLink className={getNavLinkClass} to="/bookings">
          Bookings
        </NavLink>

        <NavLink className={getNavLinkClass} to="/join">
          For providers
        </NavLink>

        <NavLink className={getNavLinkClass} to="/admin">
          Admin
        </NavLink>

        <NavLink className={getNavLinkClass} to="/about">
          About
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;