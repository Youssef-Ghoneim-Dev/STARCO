import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { currentAction, daysLate, formatAverage, isDelayed, itemName, realDelayReasons, statusLabel, workflowAverages } from "../../utils/dashboardData";

const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateValue = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const sameDay = (value, date) => value && new Date(value).toDateString() === date.toDateString();
const updatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const projectName = (project) => itemName(project);
const projectCode = (project) => project?.panelCode || project?.project?.projectCode || project?.projectNumber || project?.code || String(project?._id || "").slice(-8).toUpperCase() || "—";
const panelsCount = (project) => Math.max(project?.panels?.length || 0, 1);
const itemLink = (item) => item?.project?._id && item?._id ? `/projects/${item.project._id}/panels/${item._id}` : `/projects/${item?._id}`;

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
  let cursor = 0;
  const gradient = stages.map((stage) => { const start = cursor; cursor += total ? (counts[stage.key] / total) * 100 : 0; return `${stage.color} ${start}% ${cursor}%`; }).join(", ");
  return <section className="production-manager-card production-stage-status"><h2>اللوحات حسب المرحلة</h2><div className="production-stage-status-body"><div className="production-stage-donut" title={`إجمالي اللوحات: ${total}`} style={{ background: total ? `conic-gradient(${gradient})` : "#edf2f6" }}><div><strong>{total}</strong><span>إجمالي اللوحات</span></div></div><div>{stages.map((stage) => <p className="dashboard-status-row" data-tooltip={`${stage.label}: ${counts[stage.key]} لوحة`} title={`${stage.label}: ${counts[stage.key]} لوحة`} key={stage.key}><i style={{ background: stage.color }} /><span>{stage.label}</span><strong>{counts[stage.key]}</strong><small>{total ? `${Math.round((counts[stage.key] / total) * 100)}%` : "0%"}</small></p>)}</div></div><Link to="/panels" className="production-card-link">عرض جميع اللوحات <HiOutlineExternalLink /></Link></section>;
}

function ProductionManagerDashboard({ name, panels = [], loading, onRefresh }) {
  const today = useMemo(() => new Date(), []);
  const minimumDate = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const [selectedValue, setSelectedValue] = useState(dateValue(today));
  const dateRef = useRef(null);
  const selectedDate = fromDateValue(selectedValue);
  const label = selectedValue === dateValue(today) ? "اليوم" : selectedValue === dateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === dateValue(today) ? "today" : selectedValue === dateValue(yesterday) ? "yesterday" : "custom";
  const productionItems = panels;
  const sorted = useMemo(() => [...productionItems].sort((a, b) => updatedAt(b) - updatedAt(a)), [productionItems]);
  const selectedProjects = productionItems.filter((project) => sameDay(project.createdAt || project.updatedAt, selectedDate));
  const previousDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
  const previousProjects = productionItems.filter((project) => sameDay(project.createdAt || project.updatedAt, previousDate));
  const stageCounts = productionItems.reduce((counts, project) => { counts[resolveStage(project)] += 1; return counts; }, Object.fromEntries(stages.map((stage) => [stage.key, 0])));
  const productionTotal = stageCounts.laser + stageCounts.manufacturing + stageCounts.painting + stageCounts.assembly;
  const executionToday = selectedProjects.filter((project) => resolveStage(project) === "notStarted").length;
  const pdfReady = productionItems.filter((project) => ["executionPdfRequested", "executionPdfReady"].includes(project.status)).length;
  const halted = productionItems.filter((project) => /hold|stop|paused|متوقف/i.test(String(project.status || "")) || project.deliverySchedule?.status === "rejected").length;
  const delayed = sorted.filter((project) => isDelayed(project, today));
  const delayedCount = delayed.length;
  const waiting = sorted.filter((project) => currentAction(project, "ProductionManager")).slice(0, 4);
  const readyFiles = sorted.filter((project) => ["manufacturingFilesReady", "pendingLaserDownload"].includes(project.status)).slice(0, 5);
  const newOrders = sorted.filter((project) => ["executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending"].includes(project.status)).slice(0, 5);
  const delayReasons = realDelayReasons(productionItems);
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

    <section className="production-manager-metrics"><ProductionMetric tone="blue" icon={<HiOutlineViewGrid />} title="إجمالي اللوحات" value={loading ? "—" : productionItems.length} note="اللوحات التي وصلت للتنفيذ" /><ProductionMetric tone="red" icon={<HiOutlineExclamation />} title="لوحات متوقفة" value={loading ? "—" : halted} note="تحتاج تدخلًا" /><ProductionMetric tone="amber" icon={<HiOutlineClock />} title="لوحات متأخرة" value={loading ? "—" : delayedCount} note="عن الخطة المحددة" /><ProductionMetric tone="violet" icon={<HiOutlineDocumentText />} title="لوحات في مرحلة الإنتاج" value={loading ? "—" : productionTotal} note={`${delta >= 0 ? "+" : ""}${delta} مقارنة بالأمس`} /><ProductionMetric tone="green" icon={<HiOutlineCheckCircle />} title={`أوامر تنفيذ جديدة (${label})`} value={loading ? "—" : executionToday} note="جاهزة للمتابعة" /><ProductionMetric tone="indigo" icon={<HiOutlineFolder />} title="ملفات PDF تنفيذ جديدة" value={loading ? "—" : pdfReady} note="بانتظار الإجراء" /></section>

    <section className="production-manager-grid">
      <section className="production-manager-card production-delay-reasons"><h2>أسباب التأخير المسجلة</h2><div><div className="production-reasons-donut" title={`أسباب مسجلة: ${totalReasons}`} style={{ background: totalReasons ? `conic-gradient(${reasonGradient})` : "#edf2f6" }}><div><strong>{totalReasons}</strong><span>سبب مسجل</span></div></div><section>{delayReasons.map(([reason, count], index) => <p className="dashboard-status-row" data-tooltip={`${reason}: ${count}`} key={reason}><i style={{ background: reasonColors[index % reasonColors.length] }} /><span>{reason}</span><strong>{count}</strong><small>{totalReasons ? `${Math.round((count / totalReasons) * 100)}%` : "0%"}</small></p>)}{!delayReasons.length && <p className="production-empty">لا توجد أسباب تأخير مسجلة</p>}</section></div><Link to="/panels" className="production-card-link">عرض اللوحات <HiOutlineExternalLink /></Link></section>
      <StageDonut counts={stageCounts} total={productionItems.length} />
      <section className="production-manager-card production-delayed-list"><h2>اللوحات المتأخرة حسب المرحلة</h2><div>{delayed.slice(0, 4).map((project, index) => <Link to={itemLink(project)} key={project._id || index}><span><strong><DashboardName>{projectName(project)}</DashboardName></strong><small>{projectCode(project)} · {statusLabel(project)}</small></span><b>{daysLate(project, today) ? `متأخر ${daysLate(project, today)} يوم` : "سبب تأخير مسجل"}</b></Link>)}{!delayed.length && <p className="production-empty">لا توجد لوحات متأخرة</p>}</div><Link to="/panels" className="production-card-link">عرض جميع اللوحات المتأخرة <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-stage-progress"><h2>تقدم مراحل الإنتاج</h2>{stages.slice(1, 5).map((stage) => { const percent = productionItems.length ? Math.round((stageCounts[stage.key] / productionItems.length) * 100) : 0; return <div key={stage.key}><span>{stage.label.replace("في ", "")}</span><strong>{stageCounts[stage.key]}</strong><i><b style={{ width: `${percent}%`, background: stage.color }} /></i><em>{percent}%</em></div>; })}<Link to="/panels" className="production-card-link">عرض التفاصيل <HiOutlineExternalLink /></Link></section>

      <section className="production-manager-card production-current-stages"><h2>المشاريع في كل مرحلة الآن</h2><div>{stages.map((stage, index) => <article key={stage.key} style={{ "--stage-color": stage.color }}><span>{stage.label}</span><strong>{stageCounts[stage.key]}</strong><small>مشروع</small>{index < stages.length - 1 && <b>‹</b>}</article>)}</div></section>
      <section className="production-manager-card production-waiting"><h2>اللوحات التي تنتظر إجراءك</h2>{waiting.map((project, index) => <Link to={itemLink(project)} key={project._id || index}><i><HiOutlineClock /></i><span><strong><DashboardName>{projectName(project)}</DashboardName></strong><small>{currentAction(project, "ProductionManager")}</small></span><b>عرض</b></Link>)}{!waiting.length && <p className="production-empty">لا توجد لوحات تنتظر إجراءً</p>}</section>
      <section className="production-manager-card production-pdf-today"><h2>ملفات PDF التنفيذ ({label})</h2><div><HiOutlineDocumentText /><span><strong>{pdfReady}</strong><small>ملفات جديدة</small></span></div><p>من إجمالي {productionItems.reduce((sum, project) => sum + panelsCount(project), 0)} ملف هذا الأسبوع</p><Link to="/panels" className="production-card-link">عرض جميع ملفات PDF <HiOutlineExternalLink /></Link></section>

      <section className="production-manager-card production-alerts"><h2>تنبيهات هامة</h2>{delayedCount ? <p className="danger"><HiOutlineExclamation /><span><strong>{delayedCount} لوحات متأخرة عن موعدها</strong><small>محسوبة من الموعد المسجل أو سبب التأخير</small></span></p> : <p className="info"><HiOutlineCheckCircle /><span><strong>لا توجد لوحات متأخرة</strong><small>لا توجد تنبيهات تشغيلية حقيقية الآن</small></span></p>}<Link to="/panels" className="production-card-link">عرض اللوحات <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-ready-files"><h2>المشاريع التي بها ملفات جاهزة ولم تُرسل للإنتاج</h2><div className="production-table-scroll"><table><thead><tr><th>رقم المشروع</th><th>اسم المشروع</th><th>المهندس</th><th>تاريخ رفع الملف</th><th>الملفات</th></tr></thead><tbody>{readyFiles.map((project, index) => <tr key={project._id || index}><td>{projectCode(project)}</td><td>{projectName(project)}</td><td>{project.engineer?.name || "غير محدد"}</td><td>{updatedAt(project).toLocaleDateString("ar-EG")}</td><td>{panelsCount(project)}</td></tr>)}</tbody></table></div><Link to="/projects" className="production-card-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-new-orders"><h2>أوامر التنفيذ الجديدة ({label})</h2><div className="production-table-scroll"><table><thead><tr><th>الوقت</th><th>رقم المشروع</th><th>اسم المشروع</th><th>PDF</th></tr></thead><tbody>{newOrders.map((project, index) => <tr key={project._id || index}><td>{updatedAt(project).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</td><td>{projectCode(project)}</td><td>{projectName(project)}</td><td><HiOutlineDocumentText /></td></tr>)}</tbody></table></div><Link to="/projects" className="production-card-link">عرض جميع أوامر التنفيذ <HiOutlineExternalLink /></Link></section>
    </section>

    <section className="production-manager-kpis"><div><HiOutlineExclamation /><span>اللوحات المتأخرة</span><strong>{delayedCount} لوحة</strong></div><div><HiOutlineViewGrid /><span>متوسط وقت مرحلة التجميع</span><strong>{formatAverage(averages.stage("assembly"))}</strong></div><div><HiOutlineTrendingUp /><span>متوسط وقت مرحلة الرش</span><strong>{formatAverage(averages.stage("painting"))}</strong></div><div><HiOutlineClock /><span>متوسط وقت مرحلة التصنيع</span><strong>{formatAverage(averages.stage("manufacturing"))}</strong></div><div><HiOutlineCheckCircle /><span>متوسط وقت مرحلة الليزر</span><strong>{formatAverage(averages.stage("laser"))}</strong></div></section>
  </div>;
}

export default ProductionManagerDashboard;
