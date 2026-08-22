import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HiOutlineHome,
  HiOutlineFolder,
  HiOutlineUsers,
  HiOutlineTrash,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineX,
} from "react-icons/hi";

import logo from "../../assets/images/logo.jpg";

function Sidebar({ isOpen, onClose, isPending = false }) {
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { user } = useAuth();

  const role = user?.role;
  const canUseRecycleBin = ["OwnerManager", "Engineer", "Marketer", "MarketingManager"].includes(role);
  const canViewProjects = role !== "ProductionManager";

  const logout = () => {
    setLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.setTimeout(() => navigate("/login", { replace: true }), 350);
  };

  return (
    <>
      <aside className={`sidebar${isOpen ? " open" : ""}`}>
        <div>
          <div className="sidebar-logo">
            <img src={logo} alt="Starco" />

            <h2>Starco</h2>

            <button
              type="button"
              className="sidebar-close-btn"
              aria-label="إغلاق القائمة"
              onClick={onClose}
            >
              <HiOutlineX />
            </button>
          </div>

          <nav>
            {isPending ? <span className="sidebar-link is-disabled"><HiOutlineHome />Dashboard</span> : <NavLink to="/dashboard" className="sidebar-link" onClick={onClose}>
              <HiOutlineHome />
              Dashboard
            </NavLink>}

          {canViewProjects && (
            <>
              {role === "OwnerManager" && (
                <>
                  <NavLink to="/users" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}><HiOutlineUsers />Users</NavLink>
                  <NavLink to="/pending-users" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}><HiOutlineUsers />Pending Users</NavLink>
                </>
              )}

              <NavLink to="/projects" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                <HiOutlineFolder />
                Projects
              </NavLink>

              {(role === "Engineer" || role === "OwnerManager") && (
                <NavLink to="/clients" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                  <HiOutlineUsers />
                  Clients
                </NavLink>
              )}
              {canUseRecycleBin && (
                <NavLink to="/deleted-projects" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                  <HiOutlineTrash />
                  Recycle Bin
                </NavLink>
              )}
              {(role === "Engineer" || role === "OwnerManager") && (
                <NavLink to="/configuration" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                  <HiOutlineCog />
                  Configuration
                </NavLink>
              )}
            </>
          )}
          </nav>
        </div>

        <button className="logout-btn" onClick={() => setLogoutConfirmOpen(true)}>
          <HiOutlineLogout />
          Logout
        </button>
      </aside>

      {logoutConfirmOpen && <div className="logout-confirm-backdrop" role="dialog" aria-modal="true">
        <div className="logout-confirm-card" dir="rtl">
          <div className="logout-confirm-icon"><HiOutlineLogout /></div>
          <h2>تسجيل الخروج؟</h2>
          <p>سيتم إنهاء جلستك الحالية، ويمكنك تسجيل الدخول مرة أخرى في أي وقت.</p>
          <div><button type="button" className="logout-cancel-btn" onClick={() => setLogoutConfirmOpen(false)} disabled={loggingOut}>إلغاء</button><button type="button" className="logout-confirm-btn" onClick={logout} disabled={loggingOut}>{loggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</button></div>
        </div>
      </div>}

      {!isPending && <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        <NavLink to="/dashboard" onClick={onClose}>
          <HiOutlineHome />
          <span>Dashboard</span>
        </NavLink>
        {canViewProjects && (
          <NavLink to="/projects" onClick={onClose}>
            <HiOutlineFolder />
            <span>Projects</span>
          </NavLink>
        )}
        {(role === "Engineer" || role === "OwnerManager") && (
          <NavLink className="mobile-client-link" to="/clients" onClick={onClose}><HiOutlineUsers /><span>Clients</span></NavLink>
        )}
        {role === "OwnerManager" && (
          <NavLink to="/pending-users" onClick={onClose}><HiOutlineUsers /><span>Pending</span></NavLink>
        )}
        {(role === "Engineer" || role === "OwnerManager") && (
          <NavLink to="/configuration" onClick={onClose}>
            <HiOutlineCog />
            <span>Settings</span>
          </NavLink>
        )}
      </nav>}
    </>
  );
}

export default Sidebar;
