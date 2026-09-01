import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HiOutlineHome,
  HiOutlineFolder,
  HiOutlineUserGroup,
  HiOutlineUserAdd,
  HiOutlineIdentification,
  HiOutlineTrash,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineX,
  HiOutlineViewGrid,
} from "react-icons/hi";

import logo from "../../assets/images/logo.jpg";

function Sidebar({ isOpen, onClose, isPending = false }) {
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { user } = useAuth();

  const role = user?.role;
  const canUseRecycleBin = Boolean(role);
  const canManageUsers = ["OwnerManager", "MarketingManager", "ProductionManager"].includes(role);
  const canManageClients = ["OwnerManager", "Engineer", "MarketingManager"].includes(role);
  const canManageConfiguration = ["OwnerManager", "Engineer", "ProductionManager", "MarketingManager"].includes(role);
  const canViewProjects = true;

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
              <NavLink to="/projects" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                <HiOutlineFolder />
                Projects
              </NavLink>
              <NavLink to="/panels" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                <HiOutlineViewGrid />
                Panels
              </NavLink>

              {canManageClients && (
                <NavLink to="/clients" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                  <HiOutlineIdentification />
                  Clients
                </NavLink>
              )}
              {canManageUsers && (
                <>
                  <NavLink to="/users" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}><HiOutlineUserGroup />Users</NavLink>
                  <NavLink to="/pending-users" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}><HiOutlineUserAdd />Pending Users</NavLink>
                </>
              )}
              {canUseRecycleBin && (
                <NavLink to="/deleted-projects" className={`sidebar-link${isPending ? " is-disabled" : ""}`} onClick={onClose}>
                  <HiOutlineTrash />
                  Recycle Bin
                </NavLink>
              )}
              {canManageConfiguration && (
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
        {canViewProjects && <NavLink to="/panels" onClick={onClose}><HiOutlineViewGrid /><span>Panels</span></NavLink>}
        {canManageClients && (
          <NavLink className="mobile-client-link" to="/clients" onClick={onClose}><HiOutlineIdentification /><span>Clients</span></NavLink>
        )}
        {canManageUsers && (
          <NavLink to="/pending-users" onClick={onClose}><HiOutlineUserAdd /><span>Pending</span></NavLink>
        )}
        {canManageConfiguration && (
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
