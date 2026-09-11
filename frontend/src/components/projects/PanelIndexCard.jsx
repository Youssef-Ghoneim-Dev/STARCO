import { HiOutlineCalendar, HiOutlineClock, HiOutlineFolder, HiOutlineViewGrid } from "react-icons/hi";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { getPanelNameDirection } from "../../utils/panelNameDirection";
import { isProductionSupervisorRole } from "../../utils/roles";

const statusDetails = {
  draft: ["Draft", "editing"],
  pendingPricing: ["Pending pricing", "pending"],
  pricing: ["Pricing", "in-progress"],
  editing: ["Editing", "editing"],
  quoteCompleted: ["Quote ready", "completed"],
  executionPdfRequested: ["Execution PDF requested", "pending"],
  executionPdfReady: ["Execution PDF ready", "in-progress"],
  executionConfirmed: ["Execution confirmed", "in-progress"],
  manufacturingFilesPending: ["Manufacturing files pending", "pending"],
  manufacturingFilesReady: ["Manufacturing files ready", "in-progress"],
  pendingLaserDownload: ["Pending laser download", "pending"],
  laser: ["Laser", "in-progress"],
  manufacturing: ["Manufacturing", "in-progress"],
  painting: ["Painting", "in-progress"],
  assembly: ["Assembly", "in-progress"],
  completed: ["Completed", "completed"],
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

export default function PanelIndexCard({ panel, onOpen }) {
  const { user } = useAuth();
  const isProductionSupervisor = isProductionSupervisorRole(user?.role);
  const { notifications } = useNotifications();
  const panelId = String(panel._id || panel.panelId || "");
  const unreadNotification = notifications.find((notification) =>
    !notification.readAt && panelId && String(notification.panelId || "") === panelId
  );
  const [statusLabel, statusClass] = panel.quotePublicationPending
    ? ["Pending project approval", "pending"]
    : (statusDetails[panel.status] || [panel.status || "Unknown", "pending"]);
  const name = panel.panelName || panel.panelCode || "Panel";
  const clientName = panel.project?.client?.name || "Client not specified";
  return <article className="panel-index-card" onClick={onOpen} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }}>
    {unreadNotification && <span className="panel-unread-indicator" role="status" aria-label="توجد إشعارات جديدة لهذه اللوحة" title={unreadNotification.title || "إشعار جديد"} />}
    <header className="panel-index-card-header">
      <span className="panel-index-card-icon"><HiOutlineViewGrid /></span>
      <span className={`project-status-badge ${statusClass}`}>{statusLabel}</span>
    </header>
    <div className="panel-index-card-title">
      <h3><bdi dir={getPanelNameDirection(name)}>{name}</bdi></h3>
      <code>{panel.panelCode || "—"}</code>
    </div>
    <div className="panel-index-card-project">
      <HiOutlineFolder />
      <div><span>Project / Client</span><strong dir="auto">{panel.project?.projectCode || "—"} · {clientName}</strong></div>
    </div>
    <footer className="panel-index-card-dates">
      {!isProductionSupervisor && <div><HiOutlineCalendar /><span>Created: {formatDate(panel.createdAt)}</span></div>}
      <div><HiOutlineClock /><span>Last updated: {formatDate(panel.updatedAt)}</span></div>
    </footer>
  </article>;
}
