import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStatistics } from "../../services/dashboardAPI";
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
} from "react-icons/hi";

const statusMeta = [
  { key: "pricing", label: "قيد التسعير", color: "#5b8def" },
  { key: "approval", label: "في انتظار أمر التنفيذ", color: "#43b7b1" },
  { key: "production", label: "قيد التنفيذ", color: "#43b7b1" },
  { key: "editing", label: "قيد التعديل", color: "#f0c34e" },
  { key: "completed", label: "مكتملة", color: "#29a965" },
];

const productionStages = [
  { title: "تجميع", value: 10, delayed: 1 },
  { title: "رش", value: 12, delayed: 0 },
  { title: "تصنيع", value: 16, delayed: 1 },
  { title: "ليزر", value: 18, delayed: 2 },
];

const performanceCards = [
  { title: "أداء الإنتاج (اليوم)", value: 2, unit: "مدراء إنتاج", tone: "purple", items: [["تجميع", 10], ["رش", 12], ["تصنيع", 16], ["ليزر", 18]] },
  { title: "أداء التسويق (اليوم)", value: 3, unit: "مسوقين نشطين", tone: "orange", items: [["تكليفات تنفيذ", 7], ["أوامر تنفيذ", 8], ["مشاريع مسجلة", 17]] },
  { title: "أداء المهندسين (اليوم)", value: 6, unit: "مهندسين نشطين", tone: "green", items: [["طلبات تصنيع", 15], ["PDF تنفيذ", 10], ["تسعير", 25]] },
  { title: "أداء المندوبين (اليوم)", value: 5, unit: "مندوبين نشطين", tone: "blue", items: [["تأكيد تنفيذ", 14], ["أمر تنفيذ", 12], ["مشروع جديد", 17]] },
];

const demoPeople = ["أحمد محمود", "محمد إبراهيم", "كريم علي", "سارة محمد", "محمود حسين"];

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
  let cursor = 0;
  const gradient = segments.map((item) => {
    const start = cursor;
    cursor += total ? (item.value / total) * 100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");
  return <section className="owner-dashboard-card status-overview-card">
    <h2>المشاريع حسب الحالة</h2>
    <div className="status-overview-content">
      <div className="status-donut" style={{ background: total ? `conic-gradient(${gradient})` : "#edf2f6" }}><div><strong>{total}</strong><span>إجمالي المشاريع</span></div></div>
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
      <div className="weekly-chart-days">{days.map((date) => <span key={date.toISOString()}>{date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span>)}</div>
    </div>
    <div className="chart-legend"><span><i className="created" />مشاريع جديدة</span><span><i className="completed" />مشاريع منتهية</span></div>
  </section>;
}

function ProductionOverview() {
  return <section className="owner-dashboard-card production-overview-card">
    <h2>نظرة عامة على مراحل التنفيذ</h2>
    <div className="production-stage-grid">{productionStages.map((stage, index) => <div className="production-stage" key={stage.title}><span>{stage.title}</span><strong>{stage.value}</strong><small>مشروع</small><em>{stage.delayed} متأخرة</em>{index < productionStages.length - 1 && <b>‹</b>}</div>)}</div>
    <div className="production-average"><strong>متوسط مدة إنجاز اللوحة: 3.6 يوم</strong><span>المدة المستهدفة: 4 أيام</span></div>
  </section>;
}

function PerformanceCard({ data }) {
  return <article className={`performance-card ${data.tone}`}>
    <div className="performance-heading"><div className="performance-icon"><HiOutlineChartBar /></div><div><h3>{data.title}</h3><strong>{data.value}</strong><span>{data.unit}</span></div></div>
    <div className="performance-values">{data.items.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <button type="button">عرض التقرير <HiOutlineExternalLink /></button>
  </article>;
}

function DataTable({ title, icon, columns, rows, linkLabel = "عرض الكل" }) {
  return <section className="owner-dashboard-card owner-table-card">
    <h2>{icon}{title}</h2>
    <div className="owner-table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
    <Link className="owner-card-link" to="/projects">{linkLabel} <HiOutlineExternalLink /></Link>
  </section>;
}

function OwnerManagerDashboard({ name, projects, clientsCount, loading, onRefresh }) {
  const today = new Date();
  const minDashboardDate = new Date(today);
  minDashboardDate.setDate(minDashboardDate.getDate() - 29);
  const [selectedDateValue, setSelectedDateValue] = useState(dateInputValue(today));
  const [storedStatistics, setStoredStatistics] = useState(null);
  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateValue.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateValue]);
  const previousDate = new Date(selectedDate);
  previousDate.setDate(previousDate.getDate() - 1);
  const selectedLabel = sameDay(selectedDate, today) ? "اليوم" : sameDay(selectedDate, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const productionStatuses = ["inProgress", "production", "executing"];
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
  const completedForDate = projects.filter((project) => project.status === "completed" && sameDay(project.updatedAt, selectedDate)).length;
  const completedForPreviousDate = projects.filter((project) => project.status === "completed" && sameDay(project.updatedAt, previousDate)).length;
  const inProgressForDate = projects.filter((project) => productionStatuses.includes(project.status) && sameDay(project.updatedAt || project.createdAt, selectedDate)).length;
  const inProgressForPreviousDate = projects.filter((project) => productionStatuses.includes(project.status) && sameDay(project.updatedAt || project.createdAt, previousDate)).length;
  const statusCounts = projectsForSelectedDate.reduce((counts, project) => {
    const status = String(project.status || "");
    let bucket = "pricing";
    if (status === "completed") bucket = "completed";
    else if (status.startsWith("editing")) bucket = "editing";
    else if (productionStatuses.includes(status)) bucket = "production";
    else if (["awaitingExecution", "approved", "readyForExecution"].includes(status)) bucket = "approval";
    counts[bucket] += 1;
    return counts;
  }, { pricing: 0, approval: 0, production: 0, editing: 0, completed: 0 });
  const completedThisMonth = projects.filter((project) => {
    if (project.status !== "completed") return false;
    const date = projectDate(project);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }).length;
  const selectedMetrics = storedStatistics?.selected?.metrics;
  const previousMetrics = storedStatistics?.previous?.metrics;
  const displayedStatusCounts = storedStatistics?.selected?.statusCounts || statusCounts;
  const metricValue = (key, fallback) => selectedMetrics?.[key] ?? fallback;
  const previousMetricValue = (key, fallback) => previousMetrics?.[key] ?? fallback;
  const refreshAll = () => Promise.allSettled([onRefresh?.(), loadStoredStatistics()]);
  const latestProjects = [...projectsForSelectedDate].sort((a, b) => projectDate(b) - projectDate(a)).slice(0, 5);
  const latestRows = latestProjects.length ? latestProjects.map((project, index) => [index + 1, project.client?.name || "عميل غير محدد", demoPeople[index] || "—", formatDate(projectDate(project))]) : [["—", "لا توجد مشاريع بعد", "—", "—"]];
  const delayedRows = latestProjects.slice(0, 5).map((project, index) => [index + 1, project.client?.name || `مشروع ${index + 1}`, productionStages[index % productionStages.length].title, <span className="delay-value" key={project._id || index}>{index % 2 ? "يوم" : "يومان"}</span>]);
  const peopleRows = demoPeople.map((person, index) => [index + 1, person, 6 - index, 4 - Math.floor(index / 2), 3 - Math.floor(index / 2)]);

  return <div className="owner-dashboard" dir="rtl">
    <header className="owner-dashboard-header"><div><h1>لوحة التحكم - Owner Manager</h1><p>مرحبًا {name || "بك"}، إليك نظرة شاملة على أداء الشركة في التاريخ المحدد.</p></div><div className="dashboard-date-tools"><button type="button" onClick={refreshAll} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث البيانات"}</button><label className="dashboard-date-input"><HiOutlineCalendar /><input type="date" value={selectedDateValue} min={dateInputValue(minDashboardDate)} max={dateInputValue(today)} onChange={(event) => setSelectedDateValue(event.target.value)} /></label><select aria-label="الفترة المحددة" value={sameDay(selectedDate, today) ? "today" : sameDay(selectedDate, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) ? "yesterday" : "custom"} onChange={(event) => { if (event.target.value === "today") setSelectedDateValue(dateInputValue(today)); if (event.target.value === "yesterday") setSelectedDateValue(dateInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1))); }}><option value="today">اليوم</option><option value="yesterday">أمس</option>{!sameDay(selectedDate, today) && !sameDay(selectedDate, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) && <option value="custom">تاريخ محدد</option>}</select></div></header>
    <section className="owner-metrics-grid">
      <MetricCard tone="blue" icon={<HiOutlineFolder />} title={`إجمالي المشاريع حتى ${selectedLabel}`} value={loading ? "—" : metricValue("totalProjects", projectsForSelectedDate.length)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("totalProjects", projectsForSelectedDate.length), previousMetricValue("totalProjects", projectsForPreviousDate.length))} />
      <MetricCard tone="green" icon={<HiOutlineCheckCircle />} title={`مشاريع جديدة (${selectedLabel})`} value={loading ? "—" : metricValue("newProjects", createdForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("newProjects", createdForDate), previousMetricValue("newProjects", createdForPreviousDate))} />
      <MetricCard tone="indigo" icon={<HiOutlineChatAlt2 />} title={`طلبات ${selectedLabel} من المندوبين`} value={loading ? "—" : metricValue("marketerRequests", createdForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("marketerRequests", createdForDate), previousMetricValue("marketerRequests", createdForPreviousDate))} />
      <MetricCard tone="amber" icon={<HiOutlineClock />} title={`مشاريع قيد العمل (${selectedLabel})`} value={loading ? "—" : metricValue("inProgress", inProgressForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("inProgress", inProgressForDate), previousMetricValue("inProgress", inProgressForPreviousDate))} />
      <MetricCard tone="emerald" icon={<HiOutlineCheckCircle />} title={`مشاريع منتهية (${selectedLabel})`} value={loading ? "—" : metricValue("completed", completedForDate)} note={loading ? "جاري التحميل" : comparisonNote(metricValue("completed", completedForDate), previousMetricValue("completed", completedForPreviousDate))} />
      <MetricCard tone="violet" icon={<HiOutlineUsers />} title="إجمالي العملاء" value={loading ? "—" : metricValue("totalClients", clientsCount)} />
    </section>
    <section className="owner-analytics-grid"><ProductionOverview /><WeeklyChart projects={projects} endDate={selectedDate} statistics={storedStatistics?.history} /><StatusOverview counts={displayedStatusCounts} total={metricValue("totalProjects", projectsForSelectedDate.length)} /></section>
    <section className="performance-grid">{performanceCards.map((data) => <PerformanceCard data={data} key={data.title} />)}</section>
    <section className="owner-tables-grid">
      <DataTable title="آخر المشاريع المضافة" icon={<HiOutlineFolder />} columns={["#", "اسم المشروع", "المهندس", "تاريخ الإنشاء"]} rows={latestRows} linkLabel="عرض جميع المشاريع" />
      <DataTable title="أكثر المشاريع تأخرًا في التنفيذ" icon={<HiOutlineExclamation />} columns={["#", "اسم المشروع", "المرحلة الحالية", "متأخر منذ"]} rows={delayedRows.length ? delayedRows : [["—", "لا توجد بيانات", "—", "—"]]} linkLabel="عرض المشاريع المتأخرة" />
      <DataTable title="أفضل المهندسين (اليوم)" icon={<HiOutlineUserGroup />} columns={["#", "المهندس", "تسعير", "PDF تنفيذ", "طلبات تصنيع"]} rows={peopleRows} linkLabel="عرض جميع المهندسين" />
      <DataTable title="أفضل المندوبين (اليوم)" icon={<HiOutlineUsers />} columns={["#", "المندوب", "مشروع جديد", "أمر تنفيذ", "تأكيدات"]} rows={peopleRows} linkLabel="عرض جميع المندوبين" />
    </section>
    <section className="owner-kpi-strip"><div><HiOutlineChartBar /><span>المشاريع المكتملة هذا الشهر</span><strong>{completedThisMonth}</strong></div><div><HiOutlineExclamation /><span>أكثر مرحلة تأخير</span><strong>ليزر</strong></div><div><HiOutlineCalendar /><span>متوسط وقت التنفيذ</span><strong>3.6 يوم</strong></div><div><HiOutlineClock /><span>متوسط وقت التسعير</span><strong>1.8 يوم</strong></div><div><HiOutlineCheckCircle /><span>نسبة الإنجاز الكلية</span><strong>{projects.length ? `${Math.round((statusCounts.completed / projects.length) * 100)}%` : "0%"}</strong></div></section>
  </div>;
}

export default OwnerManagerDashboard;
