import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineExclamation,
  HiOutlineExternalLink,
  HiOutlineFolder,
  HiOutlineRefresh,
  HiOutlineTrendingUp,
  HiOutlineViewGrid,
} from "react-icons/hi";
import StyledSelect from "../common/StyledSelect";
import DashboardName from "./DashboardName";
import DashboardDonut from "./DashboardDonut";
import DashboardAverage from "./DashboardAverage";
import { currentAction, daysLate, itemName, realDelayReasons, statusLabel, workflowAverages } from "../../utils/dashboardData";

const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateValue = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const sameDay = (value, date) => value && new Date(value).toDateString() === date.toDateString();
const updatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const projectName = (project) => itemName(project);
const projectCode = (project) => project?.panelCode || project?.project?.projectCode || project?.projectNumber || project?.code || String(project?._id || "").slice(-8).toUpperCase() || "—";
const panelsCount = (project) => Math.max(project?.panels?.length || 0, 1);
const itemLink = (item) => {
  const projectId = item?.project?._id || item?.projectId;
  return projectId && item?._id ? `/projects/${projectId}/panels/${item._id}` : `/projects/${item?._id}`;
};
const productionStatuses = new Set(["executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"]);
const panelEventOn = (panel, date, values = []) => values.some((value) => sameDay(value, date));
const productionActivityOn = (panel, date) => {
  const stages = panel?.manufacturing?.productionStages || panel?.manufacturing?.stages || [];
  return stages.some((stage) => panelEventOn(panel, date, [stage.startedAt, stage.completedAt, stage.delayedAt]))
    || (panel?.manufacturing?.productionHistory || []).some((entry) => sameDay(entry.createdAt, date));
};
const delayedOn = (panel, date) => {
  const stages = panel?.manufacturing?.productionStages || panel?.manufacturing?.stages || [];
  return stages.some((stage) => sameDay(stage.delayedAt, date))
    || (panel?.manufacturing?.productionHistory || []).some((entry) => entry.action === "delayed" && sameDay(entry.createdAt, date));
};

const stages = [
  { key: "notStarted", label: "لم يبدأ التنفيذ", color: "#577dd4" },
  { key: "laser", label: "في الليزر", color: "#42a5c4" },
  { key: "manufacturing", label: "في التصنيع", color: "#9270d5" },
  { key: "painting", label: "في الرش", color: "#e7a635" },
  { key: "assembly", label: "في التجميع", color: "#34ad72" },
  { key: "completed", label: "مكتملة", color: "#687789" },
];

const resolveStage = (project) => {
  const rawStatus = String(project?.status || "");
  if (rawStatus === "laser") return "laser";
  if (rawStatus === "manufacturing") return "manufacturing";
  if (rawStatus === "painting") return "painting";
  if (rawStatus === "assembly") return "assembly";
  if (rawStatus === "completed") return "completed";
  const value = String(project?.productionStage || project?.executionStage || project?.manufacturingStage || "").toLowerCase();
  if (value.includes("complete") || value.includes("مكتمل")) return "completed";
  if (value.includes("assembl") || value.includes("تجميع")) return "assembly";
  if (value.includes("paint") || value.includes("spray") || value.includes("رش")) return "painting";
  if (value.includes("manufactur") || value.includes("تصنيع")) return "manufacturing";
  if (value.includes("laser") || value.includes("ليزر")) return "laser";
  return "notStarted";
};

function ProductionMetric({ icon, title, value, note, tone }) {
  return <article className={`production-manager-metric ${tone}`}><div>{icon}</div><section><span>{title}</span><strong>{value}</strong><small>{note}</small></section></article>;
}

function StageDonut({ counts, total }) {
  const segments = stages.map((stage) => ({ ...stage, value: counts[stage.key] || 0 }));
  return <section className="production-manager-card production-stage-status"><h2>اللوحات حسب المرحلة</h2><div className="production-stage-status-body"><DashboardDonut className="production-stage-donut" segments={segments} total={total} /><div>{stages.map((stage) => <p key={stage.key}><i style={{ background: stage.color }} /><span>{stage.label}</span><strong>{counts[stage.key]}</strong><small>{total ? `${Math.round((counts[stage.key] / total) * 100)}%` : "0%"}</small></p>)}</div></div><Link to="/panels?view=production&production=true" className="production-card-link">عرض جميع اللوحات <HiOutlineExternalLink /></Link></section>;
}

function ProductionManagerDashboard({ name, panels = [], loading, onRefresh }) {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const minimumDate = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const [selectedValue, setSelectedValue] = useState(dateValue(today));
  const dateRef = useRef(null);
  const selectedDate = fromDateValue(selectedValue);
  const label = selectedValue === dateValue(today) ? "اليوم" : selectedValue === dateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === dateValue(today) ? "today" : selectedValue === dateValue(yesterday) ? "yesterday" : "custom";
  const productionItems = useMemo(() => {
    const unique = new Map();
    panels.filter((panel) => productionStatuses.has(panel.status)).forEach((panel) => {
      const key = String(panel?.panelCode || panel?._id || `${panel?.projectId || panel?.project?._id}-${panel?.panelName}`);
      if (!unique.has(key)) unique.set(key, panel);
    });
    return [...unique.values()];
  }, [panels]);
  const sorted = useMemo(() => [...productionItems].sort((a, b) => updatedAt(b) - updatedAt(a)), [productionItems]);
  const selectedProjects = productionItems.filter((panel) => sameDay(panel.executionPdf?.confirmedAt, selectedDate));
  const previousDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
  const previousProjects = productionItems.filter((panel) => sameDay(panel.executionPdf?.confirmedAt, previousDate));
  const stageCounts = productionItems.reduce((counts, project) => { counts[resolveStage(project)] += 1; return counts; }, Object.fromEntries(stages.map((stage) => [stage.key, 0])));
  const productionTotal = productionItems.filter((panel) => productionActivityOn(panel, selectedDate)).length;
  const executionToday = selectedProjects.length;
  const pdfReady = panels.filter((panel) => sameDay(panel.executionPdf?.requestedAt, selectedDate)).length;
  const scheduleRequests = productionItems.filter((panel) => sameDay(panel.deliverySchedule?.requestedAt, selectedDate)).length;
  const delayed = sorted.filter((panel) => delayedOn(panel, selectedDate));
  const delayedCount = delayed.length;
  const waiting = sorted.filter((project) => currentAction(project, "ProductionManager")).slice(0, 4);
  const readyFiles = sorted.filter((project) => ["manufacturingFilesReady", "pendingLaserDownload"].includes(project.status)).slice(0, 5);
  const newOrders = [...productionItems].sort((a, b) => updatedAt(b) - updatedAt(a)).filter((panel) => sameDay(panel.executionPdf?.confirmedAt, selectedDate)).slice(0, 5);
  const delayReasons = realDelayReasons(productionItems.map((panel) => ({ ...panel, manufacturing: { ...(panel.manufacturing || {}), productionStages: (panel.manufacturing?.productionStages || []).filter((stage) => sameDay(stage.delayedAt, selectedDate)) } })));
  const totalReasons = delayReasons.reduce((sum, item) => sum + item[1], 0);
  let reasonCursor = 0;
  const reasonColors = ["#ef5b51", "#eca62f", "#f0cb34", "#35ae72", "#667789"];
  const reasonGradient = delayReasons.map((item, index) => { const start = reasonCursor; reasonCursor += totalReasons ? (item[1] / totalReasons) * 100 : 0; return `${reasonColors[index % reasonColors.length]} ${start}% ${reasonCursor}%`; }).join(", ");
  const openPicker = () => { const input = dateRef.current; if (!input) return; try { if (input.showPicker) input.showPicker(); else input.focus(); } catch { input.focus(); } };
  const changePreset = (value) => { if (value === "today") setSelectedValue(dateValue(today)); if (value === "yesterday") setSelectedValue(dateValue(yesterday)); };
  const delta = selectedProjects.length - previousProjects.length;
  const averages = workflowAverages(productionItems);

  return <div className="production-manager-dashboard" dir="rtl">
    <header className="production-manager-header"><div><h1>لوحة التحكم - Production Manager</h1><p>مرحبًا {name || "بك"}، تابع جميع مراحل الإنتاج والتنفيذ في الوقت الفعلي.</p></div><div className="production-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label onClick={openPicker}><HiOutlineCalendar /><input ref={dateRef} type="date" inputMode="none" value={selectedValue} min={dateValue(minimumDate)} max={dateValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onChange={(event) => setSelectedValue(event.target.value)} /></label><div><StyledSelect value={preset} onChange={changePreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>

    <section className="production-manager-metrics"><ProductionMetric tone="blue" icon={<HiOutlineViewGrid />} title={`لوحات وصلت للتنفيذ (${label})`} value={loading ? "—" : selectedProjects.length} note="من تاريخ تأكيد التنفيذ" /><ProductionMetric tone="red" icon={<HiOutlineCalendar />} title={`طلبات مواعيد جديدة (${label})`} value={loading ? "—" : scheduleRequests} note="تحتاج قرار مدير التنفيذ" /><ProductionMetric tone="amber" icon={<HiOutlineClock />} title={`تأخيرات مسجلة (${label})`} value={loading ? "—" : delayedCount} note="من سجل مراحل الإنتاج" /><ProductionMetric tone="violet" icon={<HiOutlineDocumentText />} title={`نشاط مرحلة الإنتاج (${label})`} value={loading ? "—" : productionTotal} note={`${delta >= 0 ? "+" : ""}${delta} أوامر مقارنة باليوم السابق`} /><ProductionMetric tone="green" icon={<HiOutlineCheckCircle />} title={`أوامر تنفيذ جديدة (${label})`} value={loading ? "—" : executionToday} note="تم تأكيدها في هذا التاريخ" /><ProductionMetric tone="indigo" icon={<HiOutlineFolder />} title={`طلبات PDF تنفيذ (${label})`} value={loading ? "—" : pdfReady} note="طُلبت فعليًا في هذا التاريخ" /></section>

    <section className="production-manager-grid">
      <section className="production-manager-card production-delay-reasons"><h2>أسباب التأخير المسجلة</h2><div><div className="production-reasons-donut" title={`أسباب مسجلة: ${totalReasons}`} style={{ background: totalReasons ? `conic-gradient(${reasonGradient})` : "#edf2f6" }}><div><strong>{totalReasons}</strong><span>سبب مسجل</span></div></div><section>{delayReasons.map(([reason, count], index) => <p className="dashboard-status-row" data-tooltip={`${reason}: ${count}`} key={reason}><i style={{ background: reasonColors[index % reasonColors.length] }} /><span>{reason}</span><strong>{count}</strong><small>{totalReasons ? `${Math.round((count / totalReasons) * 100)}%` : "0%"}</small></p>)}{!delayReasons.length && <div className="production-empty production-empty-reasons">لا توجد أسباب تأخير مسجلة</div>}</section></div><Link to={`/panels?view=delayed&production=true&delayed=true&date=${selectedValue}`} className="production-card-link">عرض اللوحات <HiOutlineExternalLink /></Link></section>
      <StageDonut counts={stageCounts} total={productionItems.length} />
      <section className="production-manager-card production-delayed-list"><h2>اللوحات المتأخرة حسب المرحلة</h2><div>{delayed.slice(0, 4).map((project, index) => <Link to={itemLink(project)} key={project._id || index}><span><strong><DashboardName>{projectName(project)}</DashboardName></strong><small>{projectCode(project)} · {statusLabel(project)}</small></span><b>{daysLate(project, today) ? `متأخر ${daysLate(project, today)} يوم` : "سبب تأخير مسجل"}</b></Link>)}{!delayed.length && <p className="production-empty">لا توجد لوحات متأخرة</p>}</div><Link to={`/panels?view=delayed&production=true&delayed=true&date=${selectedValue}`} className="production-card-link">عرض جميع اللوحات المتأخرة <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-stage-progress"><h2>تقدم مراحل الإنتاج</h2>{stages.slice(1, 5).map((stage) => { const percent = productionItems.length ? Math.round((stageCounts[stage.key] / productionItems.length) * 100) : 0; return <div key={stage.key}><span>{stage.label.replace("في ", "")}</span><strong>{stageCounts[stage.key]}</strong><i><b style={{ width: `${percent}%`, background: stage.color }} /></i><em>{percent}%</em></div>; })}<Link to="/panels?view=production&production=true" className="production-card-link">عرض التفاصيل <HiOutlineExternalLink /></Link></section>

      <section className="production-manager-card production-current-stages"><h2>المشاريع في كل مرحلة الآن</h2><div>{stages.map((stage, index) => <article key={stage.key} style={{ "--stage-color": stage.color }}><span>{stage.label}</span><strong>{stageCounts[stage.key]}</strong><small>مشروع</small>{index < stages.length - 1 && <b>‹</b>}</article>)}</div></section>
      <section className="production-manager-card production-waiting"><h2>اللوحات التي تنتظر إجراءك</h2>{waiting.map((project, index) => <Link to={itemLink(project)} key={project._id || index}><i><HiOutlineClock /></i><span><strong><DashboardName>{projectName(project)}</DashboardName></strong><small>{currentAction(project, "ProductionManager")}</small></span><b>عرض</b></Link>)}{!waiting.length && <p className="production-empty">لا توجد لوحات تنتظر إجراءً</p>}<Link to="/panels?view=productionTasks" className="production-card-link">عرض كل المهام <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-pdf-today"><h2>ملفات PDF التنفيذ ({label})</h2><div><HiOutlineDocumentText /><span><strong>{pdfReady}</strong><small>ملفات جديدة</small></span></div><p>من إجمالي {productionItems.reduce((sum, project) => sum + panelsCount(project), 0)} ملف هذا الأسبوع</p><Link to="/panels?view=executionPdfs&statuses=executionPdfRequested,executionPdfReady" className="production-card-link">عرض جميع ملفات PDF <HiOutlineExternalLink /></Link></section>

      <section className="production-manager-card production-alerts"><h2>تنبيهات هامة</h2>{delayedCount ? <p className="danger"><HiOutlineExclamation /><span><strong>{delayedCount} تأخيرات مسجلة {label}</strong><small>محسوبة من سجل مراحل الإنتاج في التاريخ المختار</small></span></p> : <p className="info"><HiOutlineCheckCircle /><span><strong>لا توجد تأخيرات مسجلة {label}</strong><small>لا توجد أحداث تأخير في التاريخ المختار</small></span></p>}<Link to="/panels?view=delayed&production=true&delayed=true" className="production-card-link">عرض اللوحات <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-ready-files production-table-card"><h2>المشاريع التي بها ملفات جاهزة ولم تُرسل للإنتاج</h2><div className="production-table-scroll"><table><thead><tr><th>رقم المشروع</th><th>اسم المشروع</th><th>المهندس</th><th>تاريخ رفع الملف</th><th>الملفات</th></tr></thead><tbody>{readyFiles.map((project, index) => <tr className="production-clickable-row" tabIndex="0" role="link" onClick={() => navigate(itemLink(project))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(itemLink(project)); }} key={project._id || index}><td>{projectCode(project)}</td><td>{projectName(project)}</td><td>{project.engineer?.name || project.engineerId?.name || "غير محدد"}</td><td>{updatedAt(project).toLocaleDateString("ar-EG")}</td><td>{panelsCount(project)}</td></tr>)}</tbody></table>{!readyFiles.length && <p className="production-table-empty">لا توجد ملفات جاهزة تنتظر الإرسال</p>}</div><Link to="/panels?view=readyFiles&statuses=manufacturingFilesReady,pendingLaserDownload" className="production-card-link">عرض جميع اللوحات <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-new-orders production-table-card"><h2>أوامر التنفيذ الجديدة ({label})</h2><div className="production-table-scroll"><table><thead><tr><th>الوقت</th><th>رقم المشروع</th><th>اسم المشروع</th><th>PDF</th></tr></thead><tbody>{newOrders.map((project, index) => <tr className="production-clickable-row" tabIndex="0" role="link" onClick={() => navigate(itemLink(project))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(itemLink(project)); }} key={project._id || index}><td>{updatedAt(project).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</td><td>{projectCode(project)}</td><td>{projectName(project)}</td><td><HiOutlineDocumentText /></td></tr>)}</tbody></table>{!newOrders.length && <p className="production-table-empty">لا توجد أوامر تنفيذ في هذا التاريخ</p>}</div><Link to={`/panels?view=executionOrders&statuses=executionPdfRequested,executionPdfReady,executionConfirmed,manufacturingFilesPending&date=${selectedValue}`} className="production-card-link">عرض جميع أوامر التنفيذ <HiOutlineExternalLink /></Link></section>
    </section>

    <section className="production-manager-kpis"><div><HiOutlineExclamation /><span>التأخيرات المسجلة {label}</span><strong>{delayedCount} لوحة</strong></div><div><HiOutlineViewGrid /><span>متوسط وقت مرحلة التجميع</span><DashboardAverage result={averages.stage("assembly")} /></div><div><HiOutlineTrendingUp /><span>متوسط وقت مرحلة الرش</span><DashboardAverage result={averages.stage("painting")} /></div><div><HiOutlineClock /><span>متوسط وقت مرحلة التصنيع</span><DashboardAverage result={averages.stage("manufacturing")} /></div><div><HiOutlineCheckCircle /><span>متوسط وقت مرحلة الليزر</span><DashboardAverage result={averages.stage("laser")} /></div></section>
  </div>;
}

export default ProductionManagerDashboard;
