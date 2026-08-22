import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoChevronDown } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "./UserAvatar";

function Topbar({ hasSidebar = false, onMenuClick, pending = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
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
        <button className="notification-btn" disabled={pending}>
          <IoNotificationsOutline />
        </button>

        <button
          type="button"
          className="user-info"
          onClick={() => navigate("/profile")}
          aria-label="فتح الملف الشخصي"
        >
          <UserAvatar name={user?.name} />

          <div>
            <h4>{user?.name}</h4>

            <span>{user?.role}</span>
          </div>

          <IoChevronDown />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
