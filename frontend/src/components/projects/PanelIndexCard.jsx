import { HiOutlineCalendar, HiOutlineClock, HiOutlineFolder, HiOutlineViewGrid } from "react-icons/hi";
import { getPanelNameDirection } from "../../utils/panelNameDirection";

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
  const [statusLabel, statusClass] = statusDetails[panel.status] || [panel.status || "Unknown", "pending"];
  const name = panel.panelName || panel.panelCode || "Panel";
  const clientName = panel.project?.client?.name || "Client not specified";
  return <article className="panel-index-card" onClick={onOpen} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }}>
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
      <div><HiOutlineCalendar /><span>Created: {formatDate(panel.createdAt)}</span></div>
      <div><HiOutlineClock /><span>Last updated: {formatDate(panel.updatedAt)}</span></div>
    </footer>
  </article>;
}
