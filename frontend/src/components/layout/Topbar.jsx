import { HiOutlineCheck, HiOutlineMenuAlt2, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoChevronDown } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import UserAvatar from "./UserAvatar";
import { useTheme } from "../../context/ThemeContext";

function Topbar({ hasSidebar = false, onMenuClick, pending = false }) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, pushState, enablePush, readOne, readAll } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationShellRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!notificationShellRef.current?.contains(event.target)) setNotificationOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const openNotification = async (notification) => {
    if (!notification.readAt) await readOne(notification._id).catch(() => {});
    setNotificationOpen(false);
    navigate(notification.link || "/dashboard");
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("project:refresh", {
      detail: { projectId: notification.projectId },
    })), 0);
  };

  const activateDeviceNotifications = async () => {
    try {
      const result = await enablePush();
      result.success ? toast.success("تم تفعيل إشعارات الجهاز.") : toast.error(result.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر تفعيل إشعارات الجهاز.");
    }
  };

  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString()
      ? date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  return (
    <><header className="topbar">
      <button
        type="button"
        className="menu-btn"
        aria-label="فتح أو إغلاق القائمة الجانبية"
        onClick={onMenuClick}
        disabled={!hasSidebar}
      >
        <HiOutlineMenuAlt2 />
      </button>

      <div className="topbar-right">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
        </button>
        <div className="notification-shell" ref={notificationShellRef}>
          <button type="button" className="notification-btn" disabled={pending} onClick={() => setNotificationOpen((value) => !value)} aria-label={`الإشعارات${unreadCount ? `، ${unreadCount} غير مقروء` : ""}`} aria-expanded={notificationOpen}>
            <IoNotificationsOutline />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>
          {notificationOpen && <section className="notification-popover" dir="rtl">
            <header><div><h3>الإشعارات</h3><span>{unreadCount ? `${unreadCount} غير مقروء` : "لا توجد إشعارات جديدة"}</span></div>{unreadCount > 0 && <button type="button" onClick={() => readAll().catch(() => {})}><HiOutlineCheck /> قراءة الكل</button>}</header>
            {pushState !== "granted" && pushState !== "unsupported" && <button type="button" className="enable-push-btn" onClick={activateDeviceNotifications}><IoNotificationsOutline /> تفعيل الإشعارات والموقع مغلق</button>}
            <div className="notification-list">
              {loading && !notifications.length ? <p className="notification-empty">جاري تحميل الإشعارات...</p> : notifications.length ? notifications.map((notification) => <button type="button" key={notification._id} className={`notification-item${notification.readAt ? " is-read" : " is-unread"}`} onClick={() => openNotification(notification)}><i><IoNotificationsOutline /></i><span><strong>{notification.title}</strong>{notification.body && <small>{notification.body}</small>}<time>{formatTime(notification.createdAt)}</time></span>{!notification.readAt && <b aria-label="غير مقروء" />}</button>) : <p className="notification-empty">لا توجد إشعارات حتى الآن.</p>}
            </div>
          </section>}
        </div>

        <div className="account-switcher-shell">
          <button type="button" className="user-info" onClick={() => navigate("/profile")} aria-label="فتح الملف الشخصي">
            <UserAvatar name={user?.name} />
            <div><h4>{user?.name}</h4><span>{user?.role}</span></div>
            <IoChevronDown />
          </button>
        </div>
      </div>
    </header></>
  );
}

export default Topbar;
