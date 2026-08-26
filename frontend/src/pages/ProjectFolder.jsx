import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiPlus, FiRefreshCw, FiSearch, FiSend } from "react-icons/fi";
import DashboardLayout from "../components/layout/DashboardLayout";
import PanelCard from "../components/projects/PanelCard";
import { completeProject, createPanel, deletePanelRecord, getProject, submitMarketingProject } from "../services/projectsAPI";
import { useAuth } from "../context/AuthContext";
const projectStates = { draft: "مسودة", created: "تم الإرسال", inProgress: "قيد العمل", completed: "مكتمل نهائيًا" };
export default function ProjectFolder() {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [project, setProject] = useState(null); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await getProject(id); setProject(data); } catch (error) { toast.error(error.response?.data?.message || "تعذر فتح المشروع."); } finally { setLoading(false); } }, [id]);
  useEffect(() => { load(); }, [load]);
  if (loading || !project) return <DashboardLayout notAllowed={false}><div className="route-loading">جاري تحميل المشروع...</div></DashboardLayout>;
  const isOwner = user?.role === "OwnerManager"; const marketerDraft = user?.role === "Marketer" && project.status === "draft"; const manualEngineer = user?.role === "Engineer" && project.source === "manual"; const canAdd = isOwner || marketerDraft || manualEngineer || project.marketingEditSession?.active;
  const visiblePanels = (project.panels || []).filter((panel) => !query.trim() || `${panel.panelName} ${panel.panelCode}`.toLowerCase().includes(query.trim().toLowerCase()));
  const add = async () => { setBusy(true); try { const { data } = await createPanel(id, {}); navigate(`/projects/${id}/panels/${data.panel._id}`); } catch (error) { toast.error(error.response?.data?.message || "تعذر إضافة اللوحة."); } finally { setBusy(false); } };
  const remove = async (panel) => { try { await deletePanelRecord(id, panel._id); setProject((current) => ({ ...current, panels: current.panels.filter((item) => item._id !== panel._id) })); } catch (error) { toast.error(error.response?.data?.message || "تعذر حذف اللوحة."); } };
  const submit = async () => { setBusy(true); try { const { data } = await submitMarketingProject(id); setProject(data.project); if (data.notified === 0) toast.error("تم إرسال المشروع، لكن لم تصل رسالة WhatsApp لأي مهندس."); } catch (error) { toast.error(error.response?.data?.message || "تعذر إرسال المشروع."); } finally { setBusy(false); } };
  const quoteReadyStatuses = ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"];
  const canGeneratePreview = ["Engineer", "OwnerManager"].includes(user?.role) && project.panels?.length > 0 && project.panels.every((panel) => quoteReadyStatuses.includes(panel.status));
  const generatePreview = async () => { setBusy(true); try { const { data } = await completeProject(id); await navigator.clipboard.writeText(data.previewUrl); toast.success("تم إصدار PDF المجمع ونسخ رابط المعاينة."); await load(); } catch (error) { toast.error(error.response?.data?.message || "تعذر إصدار عرض السعر المجمع."); } finally { setBusy(false); } };
  return <DashboardLayout notAllowed={false}><main className="project-folder-page" dir="rtl"><header className="project-folder-header"><div><span className="project-folder-code">{project.projectCode}</span><h1>{project.client?.name || "مشروع بدون عميل"}</h1><p>{project.panelCount || 0} لوحة · {projectStates[project.status]}</p></div><div className="project-folder-actions"><button type="button" onClick={load}><FiRefreshCw /> تحديث</button>{canAdd && <button type="button" className="primary" onClick={add} disabled={busy}><FiPlus /> لوحة جديدة</button>}{canGeneratePreview && <button type="button" className="primary" onClick={generatePreview} disabled={busy}>إصدار PDF مجمع</button>}{marketerDraft && <button type="button" className="submit" onClick={submit} disabled={busy || !project.panels?.length}><FiSend /> إرسال المشروع للمهندسين</button>}</div></header>
    {marketerDraft && <aside className="project-submit-reminder">بعد الانتهاء من إضافة اللوحات اضغط «إرسال المشروع للمهندسين». لن يظهر المشروع للمهندسين قبل الإرسال.</aside>}
    <div className="project-panels-toolbar"><h2>Panels</h2><label><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم أو رقم اللوحة" /></label></div>
    {visiblePanels.length ? <section className="panel-folder-grid">{visiblePanels.map((panel) => <PanelCard key={panel._id} panel={panel} onOpen={() => navigate(`/projects/${id}/panels/${panel._id}`)} canDelete={isOwner || (marketerDraft && panel.status === "draft")} onDelete={() => remove(panel)} />)}</section> : <section className="empty-panel-folder"><h2>لا توجد لوحات داخل المشروع</h2><p>ابدأ بإضافة أول لوحة، ثم احفظ بياناتها قبل إرسال المشروع.</p>{canAdd && <button type="button" onClick={add}><FiPlus /> إضافة لوحة</button>}</section>}
  </main></DashboardLayout>;
}
