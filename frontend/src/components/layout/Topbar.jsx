import { HiOutlineCheck, HiOutlineMenuAlt2, HiOutlinePlus, HiOutlineSwitchHorizontal, HiOutlineUserCircle } from "react-icons/hi";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoChevronDown } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import UserAvatar from "./UserAvatar";
import AddAccountModal from "../auth/AddAccountModal";
import { activateAccountSession, canAddAccounts, canUseAccountSwitcher, getAccountSessions, saveAccountSession } from "../../utils/accountSessions";

function Topbar({ hasSidebar = false, onMenuClick, pending = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, pushState, enablePush, readOne, readAll } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accounts, setAccounts] = useState(getAccountSessions);
  const notificationShellRef = useRef(null);
  const accountShellRef = useRef(null);
  const accountSwitcherAllowed = canUseAccountSwitcher(user, accounts);
  const addAccountAllowed = canAddAccounts(user);

  useEffect(() => {
    const close = (event) => {
      if (!notificationShellRef.current?.contains(event.target)) setNotificationOpen(false);
      if (!accountShellRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (user) setAccounts(saveAccountSession(user));
  }, [user]);

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

  const switchAccount = (account) => {
    if (String(account.id) === String(user?.id)) return setAccountOpen(false);
    if (!activateAccountSession(account)) return toast.error("تعذر فتح هذا الحساب.");
    setAccountOpen(false);
    window.location.assign("/dashboard");
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
        <div className="notification-shell" ref={notificationShellRef}>
          <button type="button" className="notification-btn" disabled={pending} onClick={() => { setNotificationOpen((value) => !value); setAccountOpen(false); }} aria-label={`الإشعارات${unreadCount ? `، ${unreadCount} غير مقروء` : ""}`} aria-expanded={notificationOpen}>
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

        <div className="account-switcher-shell" ref={accountShellRef}>
          <button type="button" className={`user-info${accountOpen ? " is-open" : ""}`} onClick={() => accountSwitcherAllowed ? (setAccountOpen((value) => !value), setNotificationOpen(false)) : navigate("/profile")} aria-label={accountSwitcherAllowed ? "فتح قائمة الحسابات" : "فتح الملف الشخصي"} aria-expanded={accountSwitcherAllowed ? accountOpen : undefined}>
            <UserAvatar name={user?.name} />
            <div><h4>{user?.name}</h4><span>{user?.role}</span></div>
            <IoChevronDown />
          </button>
          {accountSwitcherAllowed && accountOpen && <section className="account-switcher-popover" dir="rtl">
            <header><div><span>الحساب الحالي</span><strong>{user?.name}</strong><small>{user?.email}</small></div><HiOutlineSwitchHorizontal /></header>
            <div className="account-switcher-list">
              {accounts.map((account) => {
                const active = String(account.id) === String(user?.id);
                return <button type="button" key={account.id} className={active ? "is-active" : ""} onClick={() => switchAccount(account)} disabled={active}><UserAvatar name={account.name} /><span><strong>{account.name}</strong><small>{account.email}</small><em>{account.role}</em></span>{active && <HiOutlineCheck />}</button>;
              })}
            </div>
            <footer className={addAccountAllowed ? "" : "single-action"}>
              <button type="button" onClick={() => { setAccountOpen(false); navigate("/profile"); }}><HiOutlineUserCircle /> الملف الشخصي</button>
              {addAccountAllowed && <button type="button" className="account-add-btn" onClick={() => { setAccountOpen(false); setAddAccountOpen(true); }}><HiOutlinePlus /> إضافة حساب</button>}
            </footer>
          </section>}
        </div>
      </div>
    </header>{addAccountOpen && <AddAccountModal currentUser={user} onClose={() => setAddAccountOpen(false)} />}</>
  );
}

export default Topbar;
