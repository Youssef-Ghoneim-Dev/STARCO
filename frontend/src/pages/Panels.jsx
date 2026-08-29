import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProjectsHeader from "../components/projects/ProjectsHeader";
import PanelIndexCard from "../components/projects/PanelIndexCard";
import { getAllPanels } from "../services/projectsAPI";
import { matchesSearchText } from "../utils/textSearch";
import "../styles/projects.css";

const panelStatuses = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pendingPricing", label: "Pending pricing" },
  { value: "pricing", label: "Pricing" },
  { value: "editing", label: "Editing" },
  { value: "quoteCompleted", label: "Quote ready" },
  { value: "executionPdfRequested", label: "Execution PDF requested" },
  { value: "executionPdfReady", label: "Execution PDF ready" },
  { value: "executionConfirmed", label: "Execution confirmed" },
  { value: "manufacturingFilesPending", label: "Manufacturing files pending" },
  { value: "manufacturingFilesReady", label: "Manufacturing files ready" },
  { value: "pendingLaserDownload", label: "Pending laser download" },
  { value: "laser", label: "Laser" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "painting", label: "Painting" },
  { value: "assembly", label: "Assembly" },
  { value: "completed", label: "Completed" },
];

export default function Panels() {
  const navigate = useNavigate(); const [panels, setPanels] = useState([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const load = async () => { setLoading(true); try { const { data } = await getAllPanels(); setPanels(data || []); } catch (error) { toast.error(error.response?.data?.message || "تعذر تحميل اللوحات."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => panels.filter((panel) => {
    const matchesStatus = status === "all" || panel.status === status;
    const searchable = `${panel.panelName || ""} ${panel.panelCode || ""} ${panel.project?.projectCode || ""} ${panel.project?.client?.name || ""}`;
    return matchesStatus && (!query.trim() || matchesSearchText(searchable, query));
  }), [panels, query, status]);
  return <DashboardLayout notAllowed>
    <ProjectsHeader query={query} onQueryChange={setQuery} status={status} onStatusChange={setStatus} onRefresh={load} refreshing={loading} title="Panels" subtitle="Manage all your panels in one place." searchPlaceholder="Search by panel name..." statusOptions={panelStatuses} showCreate={false} />
    {loading ? <div className="empty-projects">Loading...</div> : visible.length ? <section className="projects-grid">{visible.map((panel) => <PanelIndexCard key={panel._id} panel={panel} onOpen={() => navigate(`/projects/${panel.projectId}/panels/${panel._id}`)} />)}</section> : <div className="empty-projects">No panels found</div>}
  </DashboardLayout>;
}
