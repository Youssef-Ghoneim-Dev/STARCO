import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../context/AuthContext";
import "../../styles/dashboard.css";

function DashboardLayout({ children, notAllowed, pending = false }) {
  const { pending: accountPending } = useAuth();
  const isPending = pending || accountPending;
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 1100,
  );

  useEffect(() => {
    const syncSidebarForViewport = () => {
      setIsSidebarOpen(window.innerWidth > 1100);
    };

    window.addEventListener("resize", syncSidebarForViewport);
    return () => window.removeEventListener("resize", syncSidebarForViewport);
  }, []);

  return (
    <div
      className={`dashboard-layout${
        notAllowed && isSidebarOpen ? " sidebar-is-open" : ""
      }`}
    >
      {notAllowed && (
        <>
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isPending={isPending}
          />
          {isSidebarOpen && (
            <button
              type="button"
              className="sidebar-backdrop"
              aria-label="إغلاق القائمة الجانبية"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </>
      )}
      <div className="dashboard-main">
        <Topbar
          hasSidebar={notAllowed}
          onMenuClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
          pending={isPending}
        />

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
