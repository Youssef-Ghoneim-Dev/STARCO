import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProjectsHeader from "../components/projects/ProjectsHeader";
import PanelIndexCard from "../components/projects/PanelIndexCard";
import { getAllPanels } from "../services/projectsAPI";
import { matchesSearchText } from "../utils/textSearch";
import { currentAction, isDelayed } from "../utils/dashboardData";
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
  const navigate = useNavigate(); const [searchParams] = useSearchParams(); const [panels, setPanels] = useState([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(""); const [status, setStatus] = useState(() => searchParams.get("statuses")?.split(",").filter(Boolean).length === 1 ? searchParams.get("statuses") : "all");
  const load = async () => { setLoading(true); try { const { data } = await getAllPanels(); setPanels(data || []); } catch (error) { toast.error(error.response?.data?.message || "تعذر تحميل اللوحات."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const view = searchParams.get("view") || "";
  const requestedStatuses = useMemo(() => new Set((searchParams.get("statuses") || "").split(",").filter(Boolean)), [searchParams]);
  useEffect(() => {
    const [onlyStatus] = [...requestedStatuses];
    if (requestedStatuses.size === 1 && panelStatuses.some((option) => option.value === onlyStatus)) setStatus(onlyStatus);
    if (!requestedStatuses.size) setStatus("all");
  }, [requestedStatuses]);
  const requestedDate = searchParams.get("date");
  const requestedDateEnd = useMemo(() => {
    if (!requestedDate) return null;
    const [year, month, day] = requestedDate.split("-").map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }, [requestedDate]);
  const sameDate = (value) => {
    if (!requestedDate || !value) return !requestedDate;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const localValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return localValue === requestedDate;
  };
  const matchesDashboardView = (panel) => {
    if (requestedStatuses.size > 1 && !requestedStatuses.has(panel.status)) return false;
    if (searchParams.get("delayed") === "true") {
      if (!isDelayed(panel, requestedDateEnd || new Date())) return false;
    }
    if (searchParams.get("production") === "true" && !["executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"].includes(panel.status)) return false;
    if (view === "engineerTasks" && !currentAction(panel, "Engineer")) return false;
    if (view === "productionTasks" && !currentAction(panel, "ProductionManager")) return false;
    if (requestedDate) {
      const eventValue = view === "executionOrders"
        ? panel.executionPdf?.confirmedAt
        : view === "delayed" ? null
        : panel.updatedAt || panel.createdAt;
      if (view !== "delayed" && !sameDate(eventValue)) return false;
    }
    return true;
  };
  const visible = useMemo(() => panels.filter((panel) => {
    const matchesStatus = status === "all" || panel.status === status;
    const searchable = `${panel.panelName || ""} ${panel.panelCode || ""} ${panel.project?.projectCode || ""} ${panel.project?.client?.name || ""}`;
    return matchesDashboardView(panel) && matchesStatus && (!query.trim() || matchesSearchText(searchable, query));
  // searchParams represents the dashboard filter URL and intentionally refreshes this list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [panels, query, status, searchParams]);
  const viewCopy = {
    engineerTasks: ["المهام التي تنتظر إجراءك", "اللوحات التي تحتاج إجراءً هندسيًا منك الآن."],
    requests: ["طلبات التاريخ المحدد", "كل الطلبات المسجلة في التاريخ الذي اخترته من لوحة التحكم."],
    production: ["تفاصيل مراحل الإنتاج", "كل اللوحات التي دخلت دورة الإنتاج الفعلية."],
    delayed: ["اللوحات المتأخرة", "اللوحات غير المكتملة التي تجاوزت موعد التسليم المعتمد فعليًا."],
    readyFiles: ["ملفات جاهزة للإنتاج", "اللوحات التي أصبحت ملفات تصنيعها جاهزة ولم تبدأ الإنتاج بعد."],
    executionOrders: ["أوامر التنفيذ", "أوامر التنفيذ المطابقة للفترة والحالة المختارتين."],
    executionPdfs: ["ملفات PDF التنفيذ", "اللوحات الموجودة في مرحلة PDF التنفيذ."],
    manufacturingFiles: ["ملفات التصنيع", "اللوحات التي تنتظر رفع ملفات التصنيع أو أصبحت ملفاتها جاهزة."],
    productionTasks: ["مهام مدير الإنتاج", "اللوحات التي تنتظر إجراءً منك الآن."],
  }[view];
  return <DashboardLayout notAllowed>
    <ProjectsHeader query={query} onQueryChange={setQuery} status={status} onStatusChange={setStatus} onRefresh={load} refreshing={loading} title={viewCopy?.[0] || "Panels"} subtitle={viewCopy?.[1] || "Manage all your panels in one place."} searchPlaceholder="Search by panel name..." statusOptions={panelStatuses} showCreate={false} />
    {loading ? <div className="empty-projects">Loading...</div> : visible.length ? <section className="projects-grid panels-index-grid">{visible.map((panel) => <PanelIndexCard key={panel._id} panel={panel} onOpen={() => navigate(`/projects/${panel.project?._id || panel.projectId}/panels/${panel._id}`)} />)}</section> : <div className="empty-projects">No panels found</div>}
  </DashboardLayout>;
}
