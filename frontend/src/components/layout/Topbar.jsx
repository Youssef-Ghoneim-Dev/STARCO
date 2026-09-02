import { HiOutlineCheck, HiOutlineMenuAlt2, HiOutlineMoon, HiOutlinePlus, HiOutlineSun, HiOutlineSwitchHorizontal, HiOutlineUserCircle } from "react-icons/hi";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoChevronDown } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import UserAvatar from "./UserAvatar";
import { useTheme } from "../../context/ThemeContext";
import AddAccountModal from "../auth/AddAccountModal";
import { getLinkedAccounts, switchLinkedAccount } from "../../services/linkedAccountsAPI";

function Topbar({ hasSidebar = false, onMenuClick, pending = false }) {
  const { user, reloadProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, pushState, enablePush, readOne, readAll } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState("");
  const notificationShellRef = useRef(null);
  const accountShellRef = useRef(null);
  const canAddAccount = ["OwnerManager", "MarketingManager", "ProductionManager"].includes(user?.role);
  const canOpenAccountMenu = canAddAccount || accounts.length > 1;
  const quickSwitchAccount = accounts.find((account) => !account.current && account.approved);

  useEffect(() => {
    const close = (event) => {
      if (!notificationShellRef.current?.contains(event.target)) setNotificationOpen(false);
      if (!accountShellRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!user?.id && !user?._id) return;
    let active = true;
    setAccountsLoading(true);
    getLinkedAccounts()
      .then(({ data }) => { if (active) setAccounts(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setAccounts([]); })
      .finally(() => { if (active) setAccountsLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?._id]);

  const changeAccount = async (account) => {
    if (account.current || !account.approved) return;
    setSwitchingId(String(account.id));
    try {
      const response = await switchLinkedAccount(account.id);
      const token = response.headers["x-auth-token"] || response.data?.token;
      if (!token) throw new Error("Missing session token");
      localStorage.setItem("token", token);
      await reloadProfile();
      setAccountOpen(false);
      setSwitchingId("");
      navigate("/dashboard", { replace: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر فتح الحساب.");
      setSwitchingId("");
    }
  };

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
          <button type="button" className={`user-info${accountOpen ? " is-open" : ""}`} onClick={() => { if (canOpenAccountMenu) { setAccountOpen((value) => !value); setNotificationOpen(false); } else navigate("/profile"); }} aria-label={canOpenAccountMenu ? "فتح قائمة الحسابات" : "فتح الملف الشخصي"} aria-expanded={canOpenAccountMenu ? accountOpen : undefined}>
            <UserAvatar name={user?.name} />
            <div><h4>{user?.name}</h4><span>{user?.role}</span></div>
            <IoChevronDown />
          </button>
          {accountOpen && <section className="account-switcher-popover" dir="rtl">
            <header><div><span>الحساب الحالي</span><strong>{user?.name}</strong><small>{user?.email}</small></div>{quickSwitchAccount ? <button type="button" className="account-quick-switch" aria-label={`التبديل إلى حساب ${quickSwitchAccount.name}`} title={`التبديل إلى ${quickSwitchAccount.name}`} disabled={Boolean(switchingId)} onClick={() => changeAccount(quickSwitchAccount)}><HiOutlineSwitchHorizontal /></button> : <HiOutlineSwitchHorizontal />}</header>
            <div className="account-switcher-list">
              {accountsLoading ? <p className="account-list-state">جاري تحميل الحسابات...</p> : accounts.map((account) => <button type="button" key={account.id} className={account.current ? "is-active" : ""} onClick={() => changeAccount(account)} disabled={account.current || !account.approved || switchingId === String(account.id)}><UserAvatar name={account.name} /><span><strong>{account.name}</strong><small>{account.email}</small><em>{account.role}</em>{!account.approved && <i>بانتظار الموافقة</i>}</span>{account.current && <HiOutlineCheck />}</button>)}
            </div>
            <footer className={canAddAccount ? "" : "single-action"}><button type="button" onClick={() => { setAccountOpen(false); navigate("/profile"); }}><HiOutlineUserCircle /> الملف الشخصي</button>{canAddAccount && <button type="button" className="account-add-btn" onClick={() => { setAccountOpen(false); setAddAccountOpen(true); }}><HiOutlinePlus /> إضافة حساب</button>}</footer>
          </section>}
        </div>
      </div>
    </header>{addAccountOpen && <AddAccountModal currentUser={user} onClose={() => setAddAccountOpen(false)} onCreated={(account) => setAccounts((current) => [...current, account])} />}</>
  );
}

export default Topbar;
