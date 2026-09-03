import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { HiOutlineExternalLink, HiOutlineX } from "react-icons/hi";
import DashboardName from "./DashboardName";
import { itemClient, itemCode, itemLink, itemName, statusLabel } from "../../utils/dashboardData";

function DashboardTasksModal({ title, subtitle, eyebrow = "المهام المطلوبة", items = [], emptyMessage = "لا توجد مهام تنتظر إجراءً حاليًا.", onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [onClose]);

  return createPortal(<div className="dashboard-tasks-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dashboard-tasks-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-tasks-title" dir="rtl">
      <header><div><span>{eyebrow}</span><h2 id="dashboard-tasks-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="إغلاق"><HiOutlineX /></button></header>
      <div className="dashboard-tasks-list">{items.length ? items.map(({ panel, action }) => <Link to={itemLink(panel)} onClick={onClose} key={panel._id}>
        <div><strong><DashboardName>{itemName(panel)}</DashboardName></strong><span>{itemClient(panel)} · {itemCode(panel)} · {statusLabel(panel)}</span></div>
        <b>{action}</b><HiOutlineExternalLink />
      </Link>) : <p className="dashboard-tasks-empty">{emptyMessage}</p>}</div>
    </section>
  </div>, document.body);
}

export default DashboardTasksModal;
