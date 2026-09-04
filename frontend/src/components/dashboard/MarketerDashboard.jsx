import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineBell,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineExclamation,
  HiOutlineExternalLink,
  HiOutlineFolder,
  HiOutlineLink,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTrendingUp,
} from "react-icons/hi";
import StyledSelect from "../common/StyledSelect";
import { useNotifications } from "../../context/NotificationContext";
import DashboardName from "./DashboardName";
import DashboardDonut from "./DashboardDonut";
import DashboardTasksModal from "./DashboardTasksModal";
import { daysLate, isDelayed, statusLabel, statusMeta } from "../../utils/dashboardData";

const toDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateValue = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const sameDay = (value, date) => value && toDateValue(new Date(value)) === toDateValue(date);
const updatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const projectName = (project) => project?.client?.name || project?.panels?.[0]?.panelName?.trim() || "مشروع بدون اسم";
const projectCode = (project) => project?.projectNumber || project?.code || String(project?._id || "").slice(-8).toUpperCase() || "—";

const statuses = [
  { key: "pricing", label: "عرض السعر", color: "#4b79dd" },
  { key: "pdf", label: "بانتظار PDF التنفيذ", color: "#8a62d0" },
  { key: "production", label: "في الإنتاج", color: "#eca433" },
  { key: "completed", label: "مكتملة", color: "#37ae73" },
];

const projectStatus = (project) => {
  const status = String(project?.status || "").toLowerCase();
  if (status.includes("complete")) return "completed";
  if (/production|executing|inprogress/.test(status)) return "production";
  if (/pdf|execution|readyforexecution/.test(status)) return "pdf";
  return "pricing";
};

const panelProjectStatus = (project, panels) => {
  const related = panels.filter((panel) => String(panel?.project?._id || panel?.projectId || "") === String(project?._id || ""));
  if (!related.length) return projectStatus(project);
  const groups = related.map((panel) => statusMeta(panel).group);
  if (groups.every((group) => group === "completed")) return "completed";
  if (groups.some((group) => ["production", "manufacturing", "execution"].includes(group))) return "production";
  if (groups.some((group) => group === "pdf")) return "pdf";
  return "pricing";
};

function MarketerMetric({ icon, title, value, note, tone }) {
  return <article className={`marketer-metric ${tone}`}><div>{icon}</div><section><span>{title}</span><strong>{value}</strong><small>{note}</small></section></article>;
}

function MarketerStatus({ counts, total }) {
  const segments = statuses.map((status) => ({ ...status, value: counts[status.key] || 0 }));
  return <section className="marketer-panel marketer-status"><h2>المشاريع حسب المرحلة</h2><div><DashboardDonut className="marketer-donut" segments={segments} total={total} totalLabel="إجمالي المشاريع" /><section>{statuses.map((status) => <p key={status.key}><i style={{ background: status.color }} /><span>{status.label}</span><strong>{counts[status.key]}</strong><small>{total ? `${Math.round((counts[status.key] / total) * 100)}%` : "0%"}</small></p>)}</section></div><Link to="/projects" className="marketer-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>;
}

function MarketerDashboard({ name, projects, panels = [], loading, onRefresh }) {
  const { notifications, readOne } = useNotifications();
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const minimumDate = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const [selectedValue, setSelectedValue] = useState(toDateValue(today));
  const [panelsModal, setPanelsModal] = useState(null);
  const dateRef = useRef(null);
  const selectedDate = fromDateValue(selectedValue);
  const label = selectedValue === toDateValue(today) ? "اليوم" : selectedValue === toDateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === toDateValue(today) ? "today" : selectedValue === toDateValue(yesterday) ? "yesterday" : "custom";
  const selectedProjects = projects.filter((project) => sameDay(project.createdAt || project.updatedAt, selectedDate));
  const sorted = [...projects].sort((a, b) => updatedAt(b) - updatedAt(a));
  const counts = projects.reduce((result, project) => { result[panelProjectStatus(project, panels)] += 1; return result; }, { pricing: 0, pdf: 0, production: 0, completed: 0 });
  const delayedPanels = panels.filter((panel) => isDelayed(panel, today));
  const productionPanels = panels.filter((panel) => ["laser", "manufacturing", "painting", "assembly"].includes(panel.status));
  const quoteReady = projects.filter((project) => panels.some((panel) => String(panel?.project?._id || panel?.projectId || "") === String(project._id) && ["quote", "pdf", "execution", "manufacturing", "production", "completed"].includes(statusMeta(panel).group))).length;
  const delayedProjectIds = new Set(delayedPanels.map((panel) => String(panel?.project?._id || panel?.projectId || "")));
  const delayed = sorted.filter((project) => delayedProjectIds.has(String(project._id)));
  const productionStageDefinitions = [["laser", "الليزر", "#4b79dd"], ["manufacturing", "التصنيع", "#8a62d0"], ["painting", "الرش", "#eca433"], ["assembly", "التجميع", "#37ae73"]];
  const productionProjectStage = new Map();
  panels.forEach((panel) => {
    const stageIndex = productionStageDefinitions.findIndex(([status]) => status === panel.status);
    if (stageIndex < 0) return;
    const projectId = String(panel?.project?._id || panel?.projectId || "");
    if (!projectId) return;
    const current = productionProjectStage.get(projectId);
    if (!current || stageIndex < current.stageIndex) productionProjectStage.set(projectId, { stageIndex, status: panel.status });
  });
  const totalProductionProjects = productionProjectStage.size;
  const productionStages = productionStageDefinitions.map(([status, label, color]) => {
    const count = [...productionProjectStage.values()].filter((entry) => entry.status === status).length;
    return [label, count, color, totalProductionProjects ? Math.round((count / totalProductionProjects) * 100) : 0];
  });
  const openPicker = () => { const input = dateRef.current; if (!input) return; try { if (input.showPicker) input.showPicker(); else input.focus(); } catch { input.focus(); } };
  const changePreset = (value) => { if (value === "today") setSelectedValue(toDateValue(today)); if (value === "yesterday") setSelectedValue(toDateValue(yesterday)); };

  const modalPanels = panelsModal === "production" ? productionPanels : delayedPanels;
  const modalItems = modalPanels.map((panel) => ({ panel, action: panelsModal === "production" ? statusLabel(panel) : `متأخر ${daysLate(panel, today)} يوم` }));

  return <><div className="marketer-dashboard" dir="rtl">
    <header className="marketer-header"><div><h1>لوحة التحكم - Marketer</h1><p>مرحبًا {name || "بك"}، هنا نظرة شاملة لمشاريعك وأدائك خلال {label}.</p></div><div className="marketer-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label onClick={openPicker}><HiOutlineCalendar /><input ref={dateRef} type="date" inputMode="none" value={selectedValue} min={toDateValue(minimumDate)} max={toDateValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onChange={(event) => setSelectedValue(event.target.value)} /></label><div><StyledSelect value={preset} onChange={changePreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>

    <section className="marketer-metrics"><MarketerMetric tone="green" icon={<HiOutlineCheckCircle />} title="تم التنفيذ" value={loading ? "—" : counts.completed} note="مشاريع مكتملة" /><MarketerMetric tone="red" icon={<HiOutlineExclamation />} title="متأخرة عن الموعد" value={loading ? "—" : delayed.length} note="وفق الموعد المسجل" /><MarketerMetric tone="amber" icon={<HiOutlineClock />} title="في مرحلة الإنتاج" value={loading ? "—" : counts.production} note="مشاريع قيد التنفيذ" /><MarketerMetric tone="violet" icon={<HiOutlineDocumentText />} title="بانتظار PDF التنفيذ" value={loading ? "—" : counts.pdf} note="بانتظار تجهيز الملف" /><MarketerMetric tone="emerald" icon={<HiOutlineCheckCircle />} title="عروض أسعار جاهزة" value={loading ? "—" : quoteReady} note="وصلت لعرض السعر أو بعده" /><MarketerMetric tone="blue" icon={<HiOutlineFolder />} title="إجمالي مشاريعي" value={loading ? "—" : projects.length} note="كل المشاريع المتاحة لك" /></section>

    <section className="marketer-main-grid">
      <section className="marketer-panel marketer-actions"><h2>إجراءات سريعة</h2><div><Link to="/new-project"><HiOutlinePlus />مشروع جديد</Link><Link to="/projects?statuses=created,inProgress"><HiOutlineChartBar />متابعة مشروع</Link><Link to="/panels?statuses=quoteCompleted,executionPdfReady"><HiOutlineLink />إرسال رابط العميل</Link><Link to="/panels?statuses=executionPdfReady"><HiOutlineCheckCircle />تأكيد أمر تنفيذ</Link></div></section>
      <MarketerStatus counts={counts} total={projects.length} />
      <section className="marketer-panel marketer-production"><h2>حالة مشاريعي في مراحل الإنتاج</h2>{productionStages.map(([stage, count, color, percentage]) => <div key={stage}><span>{stage}<small>{count} مشاريع</small></span><i><b style={{ width: `${percentage}%`, background: color }} /></i><strong>{percentage}%</strong></div>)}<button type="button" className="marketer-link" onClick={() => setPanelsModal("production")}>عرض جميع لوحات الإنتاج <HiOutlineExternalLink /></button></section>
      <section className="marketer-panel marketer-delayed"><h2>المشاريع المتأخرة عن الموعد</h2>{delayed.slice(0, 4).map((project, index) => { const late = delayedPanels.find((panel) => String(panel?.project?._id || panel?.projectId || "") === String(project._id)); return <Link to={`/projects/${project._id}`} key={project._id || index}><HiOutlineDocumentText /><span><strong><DashboardName>{projectName(project)}</DashboardName></strong><small>{projectCode(project)} · {statuses.find((status) => status.key === panelProjectStatus(project, panels))?.label}</small></span><b>متأخر {daysLate(late, today)} يوم</b></Link>; })}{!delayed.length && <p className="marketer-empty">لا توجد مشاريع متأخرة</p>}<button type="button" className="marketer-link danger" onClick={() => setPanelsModal("delayed")}>عرض جميع المشاريع المتأخرة <HiOutlineExclamation /></button></section>

      <section className="marketer-panel marketer-notifications"><h2>الإشعارات والتنبيهات</h2>{notifications.slice(0, 5).map((notification, index) => <Link to={notification.link || "/dashboard"} key={notification._id || index} onClick={() => !notification.readAt && readOne(notification._id).catch(() => {})}><i className={notification.readAt ? "info" : "warning"}>{notification.readAt ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}</i><span><strong>{notification.title}</strong><small>{notification.body || "تحديث جديد"}</small></span><time>{updatedAt(notification).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</time></Link>)}{!notifications.length && <p className="marketer-empty">لا توجد إشعارات جديدة</p>}<p className="marketer-link dashboard-notification-hint"><HiOutlineBell />الإشعارات محفوظة في الجرس بالأعلى</p></section>
      <section className="marketer-panel marketer-projects"><h2>كل المشاريع</h2><div className="marketer-table-scroll"><table><thead><tr><th>المشروع</th><th>العميل</th><th>المرحلة الحالية</th><th>آخر تحديث</th><th>الحالة</th></tr></thead><tbody>{sorted.slice(0, 6).map((project, index) => { const state = panelProjectStatus(project, panels); return <tr key={project._id || index}><td>{projectCode(project)}</td><td><DashboardName>{project.client?.name || projectName(project)}</DashboardName></td><td>{statuses.find((status) => status.key === state)?.label}</td><td>{updatedAt(project).toLocaleDateString("ar-EG")}</td><td><span className={`marketer-state ${state}`}>{statuses.find((status) => status.key === state)?.label}</span></td></tr>; })}{!sorted.length && <tr><td className="marketer-table-empty" colSpan="5">لا توجد مشاريع حتى الآن</td></tr>}</tbody></table></div><Link to="/projects" className="marketer-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>
    </section>

    <section className="marketer-bottom-grid"><section className="marketer-panel marketer-summary"><div><HiOutlineTrendingUp /><span>أداء الشهر<strong>{projects.length ? Math.round((counts.completed / projects.length) * 100) : 0}%</strong></span></div><div><span>المشاريع الجديدة<strong>{selectedProjects.length}</strong></span><span>أوامر التنفيذ<strong>{counts.pdf}</strong></span><span>عروض الأسعار<strong>{counts.pricing}</strong></span><span>المشاريع المنتهية<strong>{counts.completed}</strong></span></div></section></section>
  </div>{panelsModal && <DashboardTasksModal eyebrow="تفاصيل اللوحات" title={panelsModal === "production" ? "لوحات الإنتاج" : "المشاريع المتأخرة عن الموعد"} subtitle={panelsModal === "production" ? "اللوحات الموجودة حاليًا في الليزر أو التصنيع أو الرش أو التجميع." : "اللوحات غير المكتملة التي تجاوزت موعد التسليم المعتمد فعليًا."} items={modalItems} emptyMessage={panelsModal === "production" ? "لا توجد لوحات في مراحل الإنتاج حاليًا." : "لا توجد لوحات متأخرة عن الموعد حاليًا."} onClose={() => setPanelsModal(null)} />}</>;
}

export default MarketerDashboard;
