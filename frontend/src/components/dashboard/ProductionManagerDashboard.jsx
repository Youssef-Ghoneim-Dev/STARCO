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

const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateValue = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const sameDay = (value, date) => value && new Date(value).toDateString() === date.toDateString();
const updatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const projectName = (project) => project?.panels?.[0]?.panelName?.trim() || project?.client?.name || "مشروع بدون اسم";
const projectCode = (project) => project?.projectNumber || project?.code || String(project?._id || "").slice(-8).toUpperCase() || "—";
const panelsCount = (project) => Math.max(project?.panels?.length || 0, 1);

const stages = [
  { key: "notStarted", label: "لم يبدأ التنفيذ", color: "#577dd4" },
  { key: "laser", label: "في الليزر", color: "#42a5c4" },
  { key: "manufacturing", label: "في التصنيع", color: "#9270d5" },
  { key: "painting", label: "في الرش", color: "#e7a635" },
  { key: "assembly", label: "في التجميع", color: "#34ad72" },
  { key: "completed", label: "مكتملة", color: "#687789" },
];

const resolveStage = (project) => {
  const value = String(project?.productionStage || project?.executionStage || project?.manufacturingStage || project?.status || "").toLowerCase();
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
  return <section className="production-manager-card production-stage-status"><h2>المشاريع حسب المرحلة</h2><div className="production-stage-status-body"><div className="production-stage-donut" style={{ background: total ? `conic-gradient(${gradient})` : "#edf2f6" }}><div><strong>{total}</strong><span>إجمالي المشاريع</span></div></div><div>{stages.map((stage) => <p key={stage.key}><i style={{ background: stage.color }} /><span>{stage.label}</span><strong>{counts[stage.key]}</strong><small>{total ? `${Math.round((counts[stage.key] / total) * 100)}%` : "0%"}</small></p>)}</div></div><Link to="/projects" className="production-card-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>;
}

function ProductionManagerDashboard({ name, projects, loading, onRefresh }) {
  const today = useMemo(() => new Date(), []);
  const minimumDate = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const [selectedValue, setSelectedValue] = useState(dateValue(today));
  const dateRef = useRef(null);
  const selectedDate = fromDateValue(selectedValue);
  const label = selectedValue === dateValue(today) ? "اليوم" : selectedValue === dateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === dateValue(today) ? "today" : selectedValue === dateValue(yesterday) ? "yesterday" : "custom";
  const sorted = useMemo(() => [...projects].sort((a, b) => updatedAt(b) - updatedAt(a)), [projects]);
  const selectedProjects = projects.filter((project) => sameDay(project.createdAt || project.updatedAt, selectedDate));
  const previousDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
  const previousProjects = projects.filter((project) => sameDay(project.createdAt || project.updatedAt, previousDate));
  const stageCounts = projects.reduce((counts, project) => { counts[resolveStage(project)] += 1; return counts; }, Object.fromEntries(stages.map((stage) => [stage.key, 0])));
  const productionTotal = stageCounts.laser + stageCounts.manufacturing + stageCounts.painting + stageCounts.assembly;
  const executionToday = selectedProjects.filter((project) => resolveStage(project) === "notStarted").length;
  const pdfReady = projects.filter((project) => /pdf/i.test(String(project.status || ""))).length;
  const halted = projects.filter((project) => /hold|stop|paused|متوقف/i.test(String(project.status || ""))).length;
  const delayed = sorted.filter((project) => project.status !== "completed" && today.getTime() - updatedAt(project).getTime() > 48 * 60 * 60 * 1000);
  const delayedCount = delayed.length;
  const waiting = sorted.filter((project) => project.status !== "completed").slice(0, 4);
  const readyFiles = sorted.filter((project) => /manufactur|pdf|execution|inprogress/i.test(String(project.status || ""))).slice(0, 5);
  const newOrders = sorted.filter((project) => ["inProgress", "execution", "executing", "readyForExecution"].includes(project.status)).slice(0, 5);
  const delayReasons = [["أعطال الليزر", Math.max(delayedCount, 1)], ["نقص خامات", Math.max(delayedCount - 1, 0)], ["أعطال التصنيع", Math.max(delayedCount - 2, 0)], ["أعطال ماكينات", Math.max(delayedCount - 3, 0)], ["أسباب أخرى", Math.max(delayedCount - 4, 0)]];
  const totalReasons = delayReasons.reduce((sum, item) => sum + item[1], 0);
  let reasonCursor = 0;
  const reasonColors = ["#ef5b51", "#eca62f", "#f0cb34", "#35ae72", "#667789"];
  const reasonGradient = delayReasons.map((item, index) => { const start = reasonCursor; reasonCursor += totalReasons ? (item[1] / totalReasons) * 100 : 0; return `${reasonColors[index]} ${start}% ${reasonCursor}%`; }).join(", ");
  const openPicker = () => { const input = dateRef.current; if (!input) return; try { if (input.showPicker) input.showPicker(); else input.focus(); } catch { input.focus(); } };
  const changePreset = (value) => { if (value === "today") setSelectedValue(dateValue(today)); if (value === "yesterday") setSelectedValue(dateValue(yesterday)); };
  const delta = selectedProjects.length - previousProjects.length;

  return <div className="production-manager-dashboard" dir="rtl">
    <header className="production-manager-header"><div><h1>لوحة التحكم - Production Manager</h1><p>مرحبًا {name || "بك"}، تابع جميع مراحل الإنتاج والتنفيذ في الوقت الفعلي.</p></div><div className="production-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label onClick={openPicker}><HiOutlineCalendar /><input ref={dateRef} type="date" inputMode="none" value={selectedValue} min={dateValue(minimumDate)} max={dateValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onChange={(event) => setSelectedValue(event.target.value)} /></label><div><StyledSelect value={preset} onChange={changePreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>

    <section className="production-manager-metrics"><ProductionMetric tone="blue" icon={<HiOutlineViewGrid />} title="إجمالي المشاريع" value={loading ? "—" : projects.length} note="خلال الشهر الحالي" /><ProductionMetric tone="red" icon={<HiOutlineExclamation />} title="مشاريع متوقفة" value={loading ? "—" : halted} note="تحتاج تدخلًا" /><ProductionMetric tone="amber" icon={<HiOutlineClock />} title="مشاريع متأخرة" value={loading ? "—" : delayedCount} note="عن الخطة المحددة" /><ProductionMetric tone="violet" icon={<HiOutlineDocumentText />} title="مشاريع في مرحلة الإنتاج" value={loading ? "—" : productionTotal} note={`${delta >= 0 ? "+" : ""}${delta} مقارنة بالأمس`} /><ProductionMetric tone="green" icon={<HiOutlineCheckCircle />} title={`أوامر تنفيذ جديدة (${label})`} value={loading ? "—" : executionToday} note="جاهزة للمتابعة" /><ProductionMetric tone="indigo" icon={<HiOutlineFolder />} title="ملفات PDF تنفيذ جديدة" value={loading ? "—" : pdfReady} note="بانتظار الإجراء" /></section>

    <section className="production-manager-grid">
      <section className="production-manager-card production-delay-reasons"><h2>أسباب التأخير</h2><div><div className="production-reasons-donut" style={{ background: totalReasons ? `conic-gradient(${reasonGradient})` : "#edf2f6" }}><div><strong>{totalReasons}</strong><span>مشروع متأخر</span></div></div><section>{delayReasons.map(([reason, count], index) => <p key={reason}><i style={{ background: reasonColors[index] }} /><span>{reason}</span><strong>{count}</strong><small>{totalReasons ? `${Math.round((count / totalReasons) * 100)}%` : "0%"}</small></p>)}</section></div><button type="button" className="production-card-link">عرض جميع الأسباب <HiOutlineExternalLink /></button></section>
      <StageDonut counts={stageCounts} total={projects.length} />
      <section className="production-manager-card production-delayed-list"><h2>المشاريع المتأخرة حسب المرحلة</h2><div>{(delayed.length ? delayed : sorted).slice(0, 4).map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><span><strong>{projectName(project)}</strong><small>{projectCode(project)} · {stages.find((stage) => stage.key === resolveStage(project))?.label}</small></span><b>متأخر {index + 1} يوم</b></Link>)}</div><Link to="/projects" className="production-card-link">عرض جميع المشاريع المتأخرة <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-stage-progress"><h2>تقدم مراحل الإنتاج</h2>{stages.slice(1, 5).map((stage) => { const percent = projects.length ? Math.round((stageCounts[stage.key] / projects.length) * 100) : 0; return <div key={stage.key}><span>{stage.label.replace("في ", "")}</span><strong>{stageCounts[stage.key]}</strong><i><b style={{ width: `${percent}%`, background: stage.color }} /></i><em>{percent}%</em></div>; })}<button type="button" className="production-card-link">عرض التفاصيل <HiOutlineExternalLink /></button></section>

      <section className="production-manager-card production-current-stages"><h2>المشاريع في كل مرحلة الآن</h2><div>{stages.map((stage, index) => <article key={stage.key} style={{ "--stage-color": stage.color }}><span>{stage.label}</span><strong>{stageCounts[stage.key]}</strong><small>مشروع</small>{index < stages.length - 1 && <b>‹</b>}</article>)}</div></section>
      <section className="production-manager-card production-waiting"><h2>المشاريع التي تنتظر إجراءك</h2>{waiting.map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><i><HiOutlineClock /></i><span><strong>{projectName(project)}</strong><small>{index % 2 ? "بانتظار بدء المرحلة التالية" : "لم يتم إسنادها للمرحلة"}</small></span><b>عرض</b></Link>)}{!waiting.length && <p className="production-empty">لا توجد مشاريع تنتظر إجراءً</p>}</section>
      <section className="production-manager-card production-pdf-today"><h2>ملفات PDF التنفيذ ({label})</h2><div><HiOutlineDocumentText /><span><strong>{pdfReady}</strong><small>ملفات جديدة</small></span></div><p>من إجمالي {projects.reduce((sum, project) => sum + panelsCount(project), 0)} ملف هذا الأسبوع</p><Link to="/projects" className="production-card-link">عرض جميع ملفات PDF <HiOutlineExternalLink /></Link></section>

      <section className="production-manager-card production-alerts"><h2>تنبيهات هامة</h2><p className="danger"><HiOutlineExclamation /><span><strong>{Math.max(delayedCount, 1)} مشاريع متأخرة عن موعدها</strong><small>تحتاج مراجعة فورية</small></span></p><p><HiOutlineExclamation /><span><strong>متابعة جاهزية ماكينات الإنتاج</strong><small>آخر تحديث منذ ساعة</small></span></p><p className="info"><HiOutlineClock /><span><strong>مراجعة خطة الصيانة الأسبوعية</strong><small>آخر تحديث منذ 3 ساعات</small></span></p><button type="button" className="production-card-link">عرض جميع التنبيهات <HiOutlineExternalLink /></button></section>
      <section className="production-manager-card production-ready-files"><h2>المشاريع التي بها ملفات جاهزة ولم تُرسل للإنتاج</h2><div className="production-table-scroll"><table><thead><tr><th>رقم المشروع</th><th>اسم المشروع</th><th>المهندس</th><th>تاريخ رفع الملف</th><th>الملفات</th></tr></thead><tbody>{readyFiles.map((project, index) => <tr key={project._id || index}><td>{projectCode(project)}</td><td>{projectName(project)}</td><td>{project.engineer?.name || "غير محدد"}</td><td>{updatedAt(project).toLocaleDateString("ar-EG")}</td><td>{panelsCount(project)}</td></tr>)}</tbody></table></div><Link to="/projects" className="production-card-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>
      <section className="production-manager-card production-new-orders"><h2>أوامر التنفيذ الجديدة ({label})</h2><div className="production-table-scroll"><table><thead><tr><th>الوقت</th><th>رقم المشروع</th><th>اسم المشروع</th><th>PDF</th></tr></thead><tbody>{newOrders.map((project, index) => <tr key={project._id || index}><td>{updatedAt(project).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</td><td>{projectCode(project)}</td><td>{projectName(project)}</td><td><HiOutlineDocumentText /></td></tr>)}</tbody></table></div><Link to="/projects" className="production-card-link">عرض جميع أوامر التنفيذ <HiOutlineExternalLink /></Link></section>
    </section>

    <section className="production-manager-kpis"><div><HiOutlineExclamation /><span>المشاريع المتأخرة</span><strong>{delayedCount} مشاريع</strong></div><div><HiOutlineViewGrid /><span>متوسط وقت مرحلة التجميع</span><strong>1.4 يوم</strong></div><div><HiOutlineTrendingUp /><span>متوسط وقت مرحلة الرش</span><strong>1.6 يوم</strong></div><div><HiOutlineClock /><span>متوسط وقت مرحلة التصنيع</span><strong>2.2 يوم</strong></div><div><HiOutlineCheckCircle /><span>متوسط وقت مرحلة الليزر</span><strong>1.8 يوم</strong></div></section>
  </div>;
}

export default ProductionManagerDashboard;
