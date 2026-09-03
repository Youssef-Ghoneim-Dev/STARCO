import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getDashboardStatistics } from "../../services/dashboardAPI";
import StyledSelect from "../common/StyledSelect";
import DashboardName from "./DashboardName";
import DashboardDonut from "./DashboardDonut";
import DashboardAverage from "./DashboardAverage";
import { daysLate, deliveryDate, formatAverage, isDelayed, itemName, realDelayReasons, statusMeta as panelStatusMeta, workflowAverages } from "../../utils/dashboardData";
import {
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineChatAlt2,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineExternalLink,
  HiOutlineFolder,
  HiOutlineRefresh,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineX,
} from "react-icons/hi";

const statusMeta = [
  { key: "pricing", label: "قيد التسعير", color: "#5b8def" },
  { key: "approval", label: "في انتظار أمر التنفيذ", color: "#43b7b1" },
  { key: "production", label: "قيد التنفيذ", color: "#43b7b1" },
  { key: "editing", label: "قيد التعديل", color: "#f0c34e" },
  { key: "completed", label: "مكتملة", color: "#29a965" },
];

const projectGroup = (project, panels) => {
  const related = panels.filter((panel) => String(panel?.project?._id || panel?.projectId || "") === String(project?._id || ""));
  if (!related.length) return "pricing";
  const groups = related.map((panel) => panelStatusMeta(panel).group);
  if (groups.every((group) => group === "completed")) return "completed";
  if (groups.some((group) => group === "editing")) return "editing";
  if (groups.some((group) => ["production", "manufacturing", "execution"].includes(group))) return "production";
  if (groups.some((group) => ["pdf", "quote"].includes(group))) return "approval";
  return "pricing";
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const sameDay = (value, date) => value && startOfDay(new Date(value)).getTime() === startOfDay(date).getTime();
const projectDate = (project) => new Date(project.updatedAt || project.createdAt || Date.now());
const formatDate = (value) => new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(value);
const dateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const comparisonNote = (current, previous) => {
  const delta = current - previous;
  return `${delta > 0 ? "+" : ""}${delta} مقارنة بالأمس`;
};

function MetricCard({ icon, title, value, note, tone }) {
  return <article className={`owner-metric-card ${tone}`}>
    <div className="owner-metric-icon">{icon}</div>
    <div><span>{title}</span><strong>{value}</strong>{note && <small className={note.startsWith("-") ? "negative" : ""}>{note}</small>}</div>
  </article>;
}

function StatusOverview({ counts, total }) {
  const segments = statusMeta.map((item) => ({ ...item, value: counts[item.key] || 0 }));
  return <section className="owner-dashboard-card status-overview-card">
    <h2>المشاريع حسب الحالة</h2>
    <div className="status-overview-content">
      <DashboardDonut className="status-donut" segments={segments} total={total} totalLabel="إجمالي المشاريع" />
      <div className="status-legend">{segments.map((item) => <div key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong><small>{total ? `${Math.round((item.value / total) * 100)}%` : "0%"}</small></div>)}</div>
    </div>
    <Link className="owner-card-link" to="/projects">عرض جميع المشاريع <HiOutlineExternalLink /></Link>
  </section>;
}

function WeeklyChart({ projects, endDate, statistics = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const snapshotFor = (date) => statistics.find((snapshot) => snapshot.dateKey === dateInputValue(date));
  const created = days.map((date) => snapshotFor(date)?.metrics?.newProjects ?? projects.filter((project) => sameDay(project.createdAt, date)).length);
  const completed = days.map((date) => snapshotFor(date)?.metrics?.completed ?? projects.filter((project) => project.status === "completed" && sameDay(project.updatedAt, date)).length);
  const max = Math.max(4, ...created, ...completed);
  const points = (values) => values.map((value, index) => `${24 + index * 61},${142 - (value / max) * 105}`).join(" ");
  return <section className="owner-dashboard-card weekly-chart-card">
    <h2>المشاريع خلال آخر 7 أيام</h2>
    <div className="weekly-chart-wrap">
      <svg viewBox="0 0 420 175" role="img" aria-label="رسم المشاريع خلال آخر سبعة أيام">
        {[0, 1, 2, 3].map((line) => <line key={line} x1="20" y1={36 + line * 35} x2="402" y2={36 + line * 35} className="chart-grid-line" />)}
        <polyline points={points(created)} className="chart-line chart-line-created" />
        <polyline points={points(completed)} className="chart-line chart-line-completed" />
        {created.map((value, index) => <circle key={`created-${index}`} cx={24 + index * 61} cy={142 - (value / max) * 105} r="6" className="chart-point-created dashboard-chart-point" onMouseEnter={() => setTooltip({ x: 24 + index * 61, y: 142 - (value / max) * 105, date: days[index], created: value, completed: completed[index] })} onMouseLeave={() => setTooltip(null)} onClick={() => setTooltip({ x: 24 + index * 61, y: 142 - (value / max) * 105, date: days[index], created: value, completed: completed[index] })}><title>{`${days[index].toLocaleDateString("ar-EG")}: ${value} مشاريع جديدة`}</title></circle>)}
        {completed.map((value, index) => <circle key={`completed-${index}`} cx={24 + index * 61} cy={142 - (value / max) * 105} r="6" className="chart-point-completed dashboard-chart-point" onMouseEnter={() => setTooltip({ x: 24 + index * 61, y: 142 - (value / max) * 105, date: days[index], created: created[index], completed: value })} onMouseLeave={() => setTooltip(null)} onClick={() => setTooltip({ x: 24 + index * 61, y: 142 - (value / max) * 105, date: days[index], created: created[index], completed: value })}><title>{`${days[index].toLocaleDateString("ar-EG")}: ${value} مشاريع منتهية`}</title></circle>)}
        {tooltip && <g className="dashboard-chart-tooltip" transform={`translate(${Math.min(tooltip.x + 8, 285)} ${Math.max(tooltip.y - 62, 8)})`}><rect width="128" height="57" rx="8" /><text x="64" y="17" textAnchor="middle">{tooltip.date.toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}</text><text x="64" y="34" textAnchor="middle">{`جديدة: ${tooltip.created}`}</text><text x="64" y="49" textAnchor="middle">{`منتهية: ${tooltip.completed}`}</text></g>}
      </svg>
      <div className="weekly-chart-days">{days.map((date) => <span key={date.toISOString()}><span className="weekly-date-full">{date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span><span className="weekly-date-mobile">{date.toLocaleDateString("ar-EG", { day: "numeric" })}</span></span>)}</div>
    </div>
    <div className="chart-legend"><span><i className="created" />مشاريع جديدة</span><span><i className="completed" />مشاريع منتهية</span></div>
  </section>;
}

function ProductionOverview({ stages, averages }) {
  return <section className="owner-dashboard-card production-overview-card">
    <h2>نظرة عامة على مراحل التنفيذ</h2>
    <div className="production-stage-grid">{stages.map((stage, index) => <div className="production-stage" key={stage.title}><span>{stage.title}</span><strong>{stage.value}</strong><small>لوحة</small><em>{stage.delayed} متأخرة</em>{index < stages.length - 1 && <b>‹</b>}</div>)}</div>
    <div className="production-average"><strong>متوسطات المراحل من السجل الفعلي</strong><span>ليزر {formatAverage(averages.stage("laser"))} · تصنيع {formatAverage(averages.stage("manufacturing"))}</span></div>
  </section>;
}

function PerformanceCard({ data, onReport }) {
  return <article className={`performance-card ${data.tone}`}>
    <div className="performance-heading"><div className="performance-icon"><HiOutlineChartBar /></div><div className="performance-title"><h3>{data.title}</h3><p><strong>{data.value}</strong><span>{data.unit}</span></p></div></div>
    <div className="performance-values">{data.items.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <button type="button" className="performance-report-button" onClick={() => onReport(data)}>عرض التقرير <HiOutlineExternalLink /></button>
  </article>;
}

function DataTable({ title, icon, columns, rows, linkLabel = "عرض الكل", to = "/projects", onAction }) {
  return <section className="owner-dashboard-card owner-table-card">
    <h2>{icon}{title}</h2>
    <div className="owner-table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
    {onAction ? <button type="button" className="owner-card-link" onClick={onAction}>{linkLabel} <HiOutlineExternalLink /></button> : <Link className="owner-card-link" to={to}>{linkLabel} <HiOutlineExternalLink /></Link>}
  </section>;
}

function OwnerDashboardModal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [onClose]);

  return createPortal(<div className="owner-report-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="owner-report-modal" role="dialog" aria-modal="true" aria-labelledby="owner-report-title" dir="rtl">
      <header><div><span>تقرير تفصيلي</span><h2 id="owner-report-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="إغلاق التقرير"><HiOutlineX /></button></header>
      <div className="owner-report-body">{children}</div>
    </section>
  </div>, document.body);
}

function PerformanceReport({ data, selectedLabel, onClose }) {
  const maximum = Math.max(1, ...data.items.map(([, value]) => Number(value) || 0));
  const itemTotal = data.items.reduce((total, [, value]) => total + (Number(value) || 0), 0);
  return <OwnerDashboardModal title={data.title} subtitle={`ملخص الأداء المسجل خلال ${selectedLabel}`} onClose={onClose}>
    <div className={`owner-report-hero ${data.tone}`}><div><HiOutlineChartBar /></div><span>إجمالي الفريق<strong>{data.value}</strong><small>{data.unit}</small></span><span>إجمالي النشاط<strong>{itemTotal}</strong><small>عملية مسجلة</small></span></div>
    <div className="owner-report-bars">{data.items.map(([label, value]) => <div key={label}><div><span>{label}</span><strong>{value}</strong></div><i><b style={{ width: `${Math.max(Number(value) ? 8 : 0, ((Number(value) || 0) / maximum) * 100)}%` }} /></i></div>)}</div>
    <p className="owner-report-note">الأرقام مبنية على الحالة الحالية وسجل العمليات في التاريخ المحدد، ويمكن مقارنة البنود بصريًا من أطوال المؤشرات.</p>
  </OwnerDashboardModal>;
}

function OwnerManagerDashboard({ name, projects, panels = [], users = [], clientsCount, loading, onRefresh }) {
  const today = new Date();
  const dateInputRef = useRef(null);
  const minDashboardDate = new Date(today);
  minDashboardDate.setDate(minDashboardDate.getDate() - 29);
  const [selectedDateValue, setSelectedDateValue] = useState(dateInputValue(today));
  const [storedStatistics, setStoredStatistics] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [showDelayedPanels, setShowDelayedPanels] = useState(false);
  const [peopleModal, setPeopleModal] = useState(null);
  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateValue.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateValue]);
  const previousDate = new Date(selectedDate);
  previousDate.setDate(previousDate.getDate() - 1);
  const selectedLabel = sameDay(selectedDate, today) ? "اليوم" : sameDay(selectedDate, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const datePreset = sameDay(selectedDate, today) ? "today" : sameDay(selectedDate, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) ? "yesterday" : "custom";
  const changeDatePreset = (value) => {
    if (value === "today") setSelectedDateValue(dateInputValue(today));
    if (value === "yesterday") setSelectedDateValue(dateInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)));
  };
  const loadStoredStatistics = useCallback(async () => {
    try {
      const response = await getDashboardStatistics(selectedDateValue);
      setStoredStatistics(response.data || null);
    } catch {
      setStoredStatistics(null);
    }
  }, [selectedDateValue]);
  useEffect(() => { loadStoredStatistics(); }, [loadStoredStatistics]);
  const projectsForSelectedDate = projects.filter((project) => new Date(project.createdAt || 0) <= endOfDay(selectedDate));
  const projectsForPreviousDate = projects.filter((project) => new Date(project.createdAt || 0) <= endOfDay(previousDate));
  const createdForDate = projects.filter((project) => sameDay(project.createdAt, selectedDate)).length;
  const createdForPreviousDate = projects.filter((project) => sameDay(project.createdAt, previousDate)).length;
  const completedForDate = projects.filter((project) => projectGroup(project, panels) === "completed" && sameDay(project.updatedAt, selectedDate)).length;
  const completedForPreviousDate = projects.filter((project) => projectGroup(project, panels) === "completed" && sameDay(project.updatedAt, previousDate)).length;
  const inProgressForDate = projects.filter((project) => projectGroup(project, panels) === "production" && sameDay(project.updatedAt || project.createdAt, selectedDate)).length;
  const inProgressForPreviousDate = projects.filter((project) => projectGroup(project, panels) === "production" && sameDay(project.updatedAt || project.createdAt, previousDate)).length;
  const statusCounts = projectsForSelectedDate.reduce((counts, project) => {
    const bucket = projectGroup(project, panels);
    counts[bucket] += 1;
    return counts;
  }, { pricing: 0, approval: 0, production: 0, editing: 0, completed: 0 });
  const completedThisMonth = projects.filter((project) => {
    if (projectGroup(project, panels) !== "completed") return false;
    const date = projectDate(project);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }).length;
  const selectedMetrics = storedStatistics?.selected?.metrics;
  const previousMetrics = storedStatistics?.previous?.metrics;
  const displayedStatusCounts = statusCounts;
  const metricValue = (key, fallback) => selectedMetrics?.[key] ?? fallback;
  const previousMetricValue = (key, fallback) => previousMetrics?.[key] ?? fallback;
  const refreshAll = () => Promise.allSettled([onRefresh?.(), loadStoredStatistics()]);
  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") input.showPicker();
      else input.focus();
    } catch {
      input.focus();
    }
  };
  const latestProjects = [...projectsForSelectedDate].sort((a, b) => projectDate(b) - projectDate(a)).slice(0, 5);
  const userMap = new Map(users.map((person) => [String(person._id), person.name]));
  const projectPanels = (project) => panels.filter((panel) => String(panel?.project?._id || panel?.projectId || "") === String(project?._id || ""));
  const latestRows = latestProjects.length ? latestProjects.map((project, index) => {
    const engineerIds = [...new Set(projectPanels(project).map((panel) => String(panel.engineerId?._id || panel.engineerId || "")).filter(Boolean))];
    return [index + 1, <DashboardName key={project._id}>{project.client?.name || "عميل غير محدد"}</DashboardName>, engineerIds.map((id) => userMap.get(id)).filter(Boolean).join("، ") || "غير مسند", formatDate(projectDate(project))];
  }) : [["—", "لا توجد مشاريع بعد", "—", "—"]];
  const delayedPanels = panels.filter((panel) => isDelayed(panel, today)).sort((a, b) => daysLate(b, today) - daysLate(a, today));
  const delayedRows = delayedPanels.slice(0, 5).map((panel, index) => [index + 1, <DashboardName key={panel._id}>{itemName(panel)}</DashboardName>, panelStatusMeta(panel).label, <span className="delay-value" key={panel._id}>{daysLate(panel, today)} يوم</span>]);
  const engineers = users.filter((person) => person.role === "Engineer");
  const marketers = users.filter((person) => person.role === "Marketer");
  const engineerRows = engineers.slice(0, 3).map((person, index) => {
    const owned = panels.filter((panel) => String(panel.engineerId?._id || panel.engineerId || "") === String(person._id));
    return [index + 1, person.name, owned.filter((panel) => ["pendingPricing", "pricing", "quoteCompleted"].includes(panel.status)).length, owned.filter((panel) => panel.executionPdf?.readyAt).length, owned.filter((panel) => (panel.manufacturing?.files || []).length).length];
  });
  const marketerRows = marketers.slice(0, 3).map((person, index) => {
    const owned = projects.filter((project) => String(project.marketingId?._id || project.marketingId || project.createdBy?._id || project.createdBy || "") === String(person._id));
    return [index + 1, person.name, owned.filter((project) => sameDay(project.createdAt, selectedDate)).length, owned.filter((project) => projectPanels(project).some((panel) => panel.executionPdf?.requestedAt)).length, owned.filter((project) => projectPanels(project).some((panel) => panel.executionPdf?.confirmedAt)).length];
  });
  const averages = workflowAverages(panels);
  const stageDefinitions = [["تجميع", "assembly"], ["رش", "painting"], ["تصنيع", "manufacturing"], ["ليزر", "laser"]];
  const stages = stageDefinitions.map(([title, key]) => ({ title, value: panels.filter((panel) => panel.status === key).length, delayed: delayedPanels.filter((panel) => panel.status === key).length }));
  const delayReasons = realDelayReasons(panels);
  const performanceCards = [
    { title: "أداء الإنتاج", value: users.filter((person) => person.role === "ProductionManager").length, unit: "مدراء إنتاج", tone: "purple", to: "/panels", items: stages.map((stage) => [stage.title, stage.value]) },
    { title: "أداء التسويق", value: marketers.length, unit: "مسوقين", tone: "orange", to: "/projects", items: [["مشاريع اليوم", createdForDate], ["أوامر تنفيذ", panels.filter((panel) => sameDay(panel.executionPdf?.requestedAt, selectedDate)).length], ["مكتملة", completedForDate]] },
    { title: "أداء المهندسين", value: engineers.length, unit: "مهندسين", tone: "green", to: "/panels", items: [["ملفات تصنيع", panels.filter((panel) => sameDay(panel.manufacturing?.files?.[0]?.uploadedAt, selectedDate)).length], ["PDF تنفيذ", panels.filter((panel) => sameDay(panel.executionPdf?.readyAt, selectedDate)).length], ["تسعير", panels.filter((panel) => sameDay(panel.quoteCompletedAt, selectedDate)).length]] },
    { title: "أداء المندوبين", value: marketers.length, unit: "مندوبين", tone: "blue", to: "/projects", items: [["تأكيد تنفيذ", panels.filter((panel) => sameDay(panel.executionPdf?.confirmedAt, selectedDate)).length], ["أمر تنفيذ", panels.filter((panel) => sameDay(panel.executionPdf?.requestedAt, selectedDate)).length], ["مشروع جديد", createdForDate]] },
  ];

  return <><div className="owner-dashboard" dir="rtl">
    <header className="owner-dashboard-header"><div><h1>لوحة التحكم - Owner Manager</h1><p>مرحبًا {name || "بك"}، إليك نظرة شاملة على أداء الشركة في التاريخ المحدد.</p></div><div className="dashboard-date-tools"><button type="button" onClick={refreshAll} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label className="dashboard-date-input" onClick={openDatePicker}><HiOutlineCalendar aria-hidden="true" /><input ref={dateInputRef} aria-label="اختيار تاريخ الإحصائيات" type="date" inputMode="none" value={selectedDateValue} min={dateInputValue(minDashboardDate)} max={dateInputValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onChange={(event) => setSelectedDateValue(event.target.value)} /></label><div className="dashboard-period-select"><StyledSelect value={datePreset} onChange={changeDatePreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(datePreset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>
    <section className="owner-metrics-grid">
      <MetricCard tone="blue" icon={<HiOutlineFolder />} title={`إجمالي المشاريع حتى ${selectedLabel}`} value={loading ? "—" : metricValue("totalProjects", projectsForSelectedDate.length)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("totalProjects", projectsForSelectedDate.length), previousMetricValue("totalProjects", projectsForPreviousDate.length))} />
      <MetricCard tone="green" icon={<HiOutlineCheckCircle />} title={`مشاريع جديدة (${selectedLabel})`} value={loading ? "—" : metricValue("newProjects", createdForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("newProjects", createdForDate), previousMetricValue("newProjects", createdForPreviousDate))} />
      <MetricCard tone="indigo" icon={<HiOutlineChatAlt2 />} title={`طلبات المندوبين (${selectedLabel})`} value={loading ? "—" : metricValue("marketerRequests", createdForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("marketerRequests", createdForDate), previousMetricValue("marketerRequests", createdForPreviousDate))} />
      <MetricCard tone="amber" icon={<HiOutlineClock />} title={`مشاريع قيد العمل (${selectedLabel})`} value={loading ? "—" : metricValue("inProgress", inProgressForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("inProgress", inProgressForDate), previousMetricValue("inProgress", inProgressForPreviousDate))} />
      <MetricCard tone="emerald" icon={<HiOutlineCheckCircle />} title={`مشاريع منتهية (${selectedLabel})`} value={loading ? "—" : metricValue("completed", completedForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("completed", completedForDate), previousMetricValue("completed", completedForPreviousDate))} />
      <MetricCard tone="violet" icon={<HiOutlineUsers />} title="إجمالي العملاء" value={loading ? "—" : metricValue("totalClients", clientsCount)} />
    </section>
    <section className="owner-insights-grid">
      <ProductionOverview stages={stages} averages={averages} />
      <StatusOverview counts={displayedStatusCounts} total={projectsForSelectedDate.length} />
      <WeeklyChart projects={projects} endDate={selectedDate} statistics={storedStatistics?.history} />
      <PerformanceCard data={performanceCards[0]} onReport={setActiveReport} />
      <PerformanceCard data={performanceCards[1]} onReport={setActiveReport} />
      <PerformanceCard data={performanceCards[2]} onReport={setActiveReport} />
      <PerformanceCard data={performanceCards[3]} onReport={setActiveReport} />
    </section>
    <section className="owner-tables-grid">
      <DataTable title="آخر المشاريع المضافة" icon={<HiOutlineFolder />} columns={["#", "اسم المشروع", "المهندس", "تاريخ الإنشاء"]} rows={latestRows} linkLabel="عرض جميع المشاريع" />
      <DataTable title="أكثر اللوحات تأخرًا في التنفيذ" icon={<HiOutlineExclamation />} columns={["#", "اسم اللوحة", "المرحلة الحالية", "متأخر منذ"]} rows={delayedRows.length ? delayedRows : [["—", "لا توجد لوحات متأخرة", "—", "—"]]} linkLabel="عرض اللوحات المتأخرة" onAction={() => setShowDelayedPanels(true)} />
      <DataTable title="أداء المهندسين" icon={<HiOutlineUserGroup />} columns={["#", "المهندس", "تسعير", "PDF تنفيذ", "طلبات تصنيع"]} rows={engineerRows.length ? engineerRows : [["—", "لا توجد بيانات", "—", "—", "—"]]} linkLabel="عرض جميع المهندسين" onAction={() => setPeopleModal("engineers")} />
      <DataTable title="أداء المندوبين" icon={<HiOutlineUsers />} columns={["#", "المندوب", "مشروع جديد", "أمر تنفيذ", "تأكيدات"]} rows={marketerRows.length ? marketerRows : [["—", "لا توجد بيانات", "—", "—", "—"]]} linkLabel="عرض جميع المندوبين" onAction={() => setPeopleModal("marketers")} />
    </section>
    <section className="owner-kpi-strip"><div><HiOutlineChartBar /><span>المشاريع المكتملة هذا الشهر</span><strong>{completedThisMonth}</strong></div><div><HiOutlineExclamation /><span>أكثر سبب تأخير</span><strong className={delayReasons[0]?.[0] ? "owner-delay-result" : ""}>{delayReasons[0]?.[0] || "لا يوجد"}</strong></div><div><HiOutlineCalendar /><span>متوسط تجهيز PDF التنفيذ</span><DashboardAverage result={averages.executionPdf} /></div><div><HiOutlineClock /><span>متوسط وقت التسعير</span><DashboardAverage result={averages.quote} /></div><div><HiOutlineCheckCircle /><span>نسبة الإنجاز الكلية</span><strong>{projects.length ? `${Math.round((statusCounts.completed / projects.length) * 100)}%` : "0%"}</strong></div></section>
  </div>
  {activeReport && <PerformanceReport data={activeReport} selectedLabel={selectedLabel} onClose={() => setActiveReport(null)} />}
  {showDelayedPanels && <OwnerDashboardModal title="اللوحات المتأخرة فعليًا" subtitle="لوحات غير مكتملة تجاوزت موعد التسليم المعتمد" onClose={() => setShowDelayedPanels(false)}>
    <div className="owner-delayed-modal-list">{delayedPanels.length ? delayedPanels.map((panel) => <article key={panel._id}><div><DashboardName>{itemName(panel)}</DashboardName><span>{panelStatusMeta(panel).label}</span></div><div><small>موعد التسليم</small><strong>{deliveryDate(panel)?.toLocaleDateString("ar-EG") || "غير محدد"}</strong></div><b>{daysLate(panel, today)} يوم</b></article>) : <p className="owner-report-empty">لا توجد لوحات متأخرة عن موعد التسليم حاليًا.</p>}</div>
  </OwnerDashboardModal>}
  {peopleModal && <OwnerDashboardModal title={peopleModal === "engineers" ? "جميع المهندسين" : "جميع المندوبين"} subtitle={peopleModal === "engineers" ? `${engineers.length} مهندس مسجل مع ملخص العمل الحالي` : `${marketers.length} مندوب مسجل مع ملخص نشاط ${selectedLabel}`} onClose={() => setPeopleModal(null)}>
    <div className="owner-people-modal-list">{peopleModal === "engineers" ? (engineers.length ? engineers.map((person) => {
      const owned = panels.filter((panel) => String(panel.engineerId?._id || panel.engineerId || "") === String(person._id));
      return <article key={person._id}><div className="owner-person-avatar">{person.name?.trim()?.charAt(0) || "م"}</div><div className="owner-person-identity"><strong>{person.name || "مهندس بدون اسم"}</strong><span>{person.email || "لا يوجد بريد إلكتروني"}</span></div><div className="owner-person-stats"><span><b>{owned.filter((panel) => ["pendingPricing", "pricing", "quoteCompleted"].includes(panel.status)).length}</b> تسعير</span><span><b>{owned.filter((panel) => panel.executionPdf?.readyAt).length}</b> PDF تنفيذ</span><span><b>{owned.filter((panel) => (panel.manufacturing?.files || []).length).length}</b> ملفات تصنيع</span></div></article>;
    }) : <p className="owner-report-empty">لا يوجد مهندسون مسجلون.</p>) : (marketers.length ? marketers.map((person) => {
      const owned = projects.filter((project) => String(project.marketingId?._id || project.marketingId || project.createdBy?._id || project.createdBy || "") === String(person._id));
      return <article key={person._id}><div className="owner-person-avatar">{person.name?.trim()?.charAt(0) || "م"}</div><div className="owner-person-identity"><strong>{person.name || "مندوب بدون اسم"}</strong><span>{person.email || "لا يوجد بريد إلكتروني"}</span></div><div className="owner-person-stats"><span><b>{owned.filter((project) => sameDay(project.createdAt, selectedDate)).length}</b> مشروع جديد</span><span><b>{owned.filter((project) => projectPanels(project).some((panel) => panel.executionPdf?.requestedAt)).length}</b> أمر تنفيذ</span><span><b>{owned.filter((project) => projectPanels(project).some((panel) => panel.executionPdf?.confirmedAt)).length}</b> تأكيد</span></div></article>;
    }) : <p className="owner-report-empty">لا يوجد مندوبون مسجلون.</p>)}</div>
  </OwnerDashboardModal>}
  </>;
}

export default OwnerManagerDashboard;
