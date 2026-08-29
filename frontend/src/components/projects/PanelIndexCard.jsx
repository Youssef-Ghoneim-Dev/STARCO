import { HiOutlineCalendar, HiOutlineClock } from "react-icons/hi";
import { getPanelNameDirection } from "../../utils/panelNameDirection";
import projectImage from "../../assets/images/1.svg";

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
  return <article className="project-card panel-index-card" onClick={onOpen} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }}>
    <div className="project-image">
      <img src={projectImage} alt="Panel" />
      <div className="project-client-badge" dir="auto">{clientName}</div>
    </div>
    <div className="project-body">
      <div className="project-title-row">
        <h3><bdi dir={getPanelNameDirection(name)}>{name}</bdi></h3>
        <span className={`project-status-badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <code className="panel-index-card-code">{panel.panelCode}</code>
      <div className="project-date"><HiOutlineCalendar /><span>Created: {formatDate(panel.createdAt)}</span></div>
      <div className="project-date"><HiOutlineClock /><span>Last updated: {formatDate(panel.updatedAt)}</span></div>
    </div>
  </article>;
}
