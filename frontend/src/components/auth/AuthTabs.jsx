import { NavLink } from "react-router-dom";

function AuthTabs() {
  return (
    <div className="auth-tabs">
      <NavLink
        to="/login"
        className={({ isActive }) => (isActive ? "active-tab" : "")}
      >
        Login
      </NavLink>

      <NavLink
        to="/register"
        className={({ isActive }) => (isActive ? "active-tab" : "")}
      >
        Register
      </NavLink>
    </div>
  );
}

export default AuthTabs;
