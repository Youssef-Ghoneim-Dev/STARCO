import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import DashboardLayout from "../components/layout/DashboardLayout";
import PanelCard from "../components/projects/PanelCard";
import { getAllPanels } from "../services/projectsAPI";
import "../styles/projects.css";

export default function Panels() {
  const navigate = useNavigate(); const [panels, setPanels] = useState([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState("");
  const load = async () => { setLoading(true); try { const { data } = await getAllPanels(); setPanels(data || []); } catch (error) { toast.error(error.response?.data?.message || "تعذر تحميل اللوحات."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => panels.filter((panel) => `${panel.panelName} ${panel.panelCode} ${panel.project?.client?.name || ""}`.toLowerCase().includes(query.trim().toLowerCase())), [panels, query]);
  return <DashboardLayout notAllowed={false}><main className="project-folder-page panels-index-page" dir="rtl"><header className="project-folder-header"><div><h1>Panels</h1><p>كل لوحة مستقلة بمسارها وحالتها والمسؤول عنها.</p></div><div className="project-folder-actions"><button type="button" onClick={load} disabled={loading}><FiRefreshCw /> تحديث</button></div></header><div className="project-panels-toolbar"><h2>{visible.length} لوحة</h2><label><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم اللوحة أو المشروع أو العميل" /></label></div>{loading ? <div className="route-loading">جاري تحميل اللوحات...</div> : visible.length ? <section className="panel-folder-grid">{visible.map((panel) => <PanelCard key={panel._id} panel={panel} onOpen={() => navigate(`/projects/${panel.projectId}/panels/${panel._id}`)} />)}</section> : <section className="empty-panel-folder"><h2>لا توجد لوحات متاحة حاليًا</h2></section>}</main></DashboardLayout>;
}
