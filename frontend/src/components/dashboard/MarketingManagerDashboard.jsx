import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineExternalLink,
  HiOutlineRefresh,
  HiOutlineShoppingBag,
  HiOutlineUsers,
} from "react-icons/hi";
import StyledSelect from "../common/StyledSelect";
import DashboardName from "./DashboardName";
import DashboardDonut from "./DashboardDonut";
import DashboardTasksModal from "./DashboardTasksModal";
import MarketingTeamModal from "./MarketingTeamModal";
import { daysLate, isDelayed, realDelayReasons, statusMeta } from "../../utils/dashboardData";

const toDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateValue = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const sameDate = (value, date) => value && toDateValue(new Date(value)) === toDateValue(date);
const updatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const displayName = (project) => project?.panels?.[0]?.panelName?.trim() || project?.client?.name || "مشروع بدون اسم";
const projectGroup = (project, panels) => {
  const related = panels.filter((panel) => String(panel?.project?._id || panel?.projectId || "") === String(project?._id || ""));
  if (!related.length) return "pricing";
  const groups = related.map((panel) => statusMeta(panel).group);
  if (groups.every((group) => group === "completed")) return "completed";
  if (groups.some((group) => ["production", "manufacturing"].includes(group))) return "production";
  if (groups.some((group) => ["execution", "pdf"].includes(group))) return "execution";
  if (groups.some((group) => ["quote", "editing"].includes(group))) return "client";
  return "pricing";
};

const statusDefinitions = [
  { key: "pricing", label: "عرض سعر", color: "#4b79dd" },
  { key: "client", label: "بانتظار العميل", color: "#53b7ae" },
  { key: "execution", label: "أمر تنفيذ", color: "#35ad71" },
  { key: "production", label: "قيد التنفيذ", color: "#f2c638" },
  { key: "completed", label: "مكتملة", color: "#687789" },
];

function MarketingMetric({ icon, title, value, note, tone }) {
  return <article className={`marketing-metric ${tone}`}><div className="marketing-metric-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function MarketingStatus({ counts, total }) {
  const segments = statusDefinitions.map((item) => ({ ...item, value: counts[item.key] || 0 }));
  return <section className="marketing-panel marketing-status"><h2>المشاريع حسب الحالة</h2><div className="marketing-status-body"><DashboardDonut className="marketing-donut" segments={segments} total={total} totalLabel="إجمالي المشاريع" /><div>{statusDefinitions.map((item) => <p key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{counts[item.key]}</strong><small>{total ? `${Math.round((counts[item.key] / total) * 100)}%` : "0%"}</small></p>)}</div></div><Link to="/projects" className="marketing-card-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>;
}

function MarketingTrend({ projects, selectedDate }) {
  const [activePoint, setActivePoint] = useState(null);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(selectedDate); date.setDate(date.getDate() - (6 - index)); return date; });
  const created = days.map((date) => projects.filter((project) => sameDate(project.createdAt, date)).length);
  const execution = days.map((date) => projects.filter((project) => ["inProgress", "execution", "executing"].includes(project.status) && sameDate(project.updatedAt, date)).length);
  const max = Math.max(4, ...created, ...execution);
  const pointX = (index) => 24 + index * 61;
  const pointY = (value) => 142 - (value / max) * 105;
  const points = (values) => values.map((value, index) => `${pointX(index)},${pointY(value)}`).join(" ");
  const showPoint = (value, index) => setActivePoint({ index, x: pointX(index), y: pointY(value), created: created[index], execution: execution[index] });
  const pointProps = (type, value, index) => ({
    tabIndex: 0,
    role: "button",
    "aria-label": `${days[index].toLocaleDateString("ar-EG")}: ${value} ${type}`,
    onMouseEnter: () => showPoint(value, index),
    onMouseLeave: () => setActivePoint(null),
    onFocus: () => showPoint(value, index),
    onBlur: () => setActivePoint(null),
    onClick: () => showPoint(value, index),
  });

  return <section className="marketing-panel marketing-trend"><h2>المشاريع الجديدة وأوامر التنفيذ خلال آخر 7 أيام</h2><div className="marketing-trend-chart"><svg viewBox="0 0 420 175" role="img" aria-label="المشاريع وأوامر التنفيذ خلال آخر سبعة أيام">{[0, 1, 2, 3].map((line) => <line key={line} x1="20" y1={36 + line * 35} x2="402" y2={36 + line * 35} />)}<polyline points={points(created)} className="new" /><polyline points={points(execution)} className="execution" />{created.map((value, index) => <circle key={`new-${index}`} cx={pointX(index)} cy={pointY(value)} r="5" {...pointProps("مشاريع جديدة", value, index)} />)}{execution.map((value, index) => <circle className="execution-point" key={`execution-${index}`} cx={pointX(index)} cy={pointY(value)} r="5" {...pointProps("أوامر تنفيذ", value, index)} />)}{activePoint && <g className="dashboard-chart-tooltip" transform={`translate(${Math.min(activePoint.x + 8, 285)} ${Math.max(activePoint.y - 62, 8)})`}><rect width="128" height="57" rx="8" /><text x="64" y="17" textAnchor="middle">{days[activePoint.index].toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}</text><text x="64" y="34" textAnchor="middle">{`جديدة: ${activePoint.created}`}</text><text x="64" y="49" textAnchor="middle">{`أوامر تنفيذ: ${activePoint.execution}`}</text></g>}</svg><div className="marketing-trend-days">{days.map((date) => <span key={date.toISOString()}>{date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span>)}</div></div><footer><span><i />مشاريع جديدة</span><span><i />أوامر تنفيذ</span></footer></section>;
}

function MarketingManagerDashboard({ name, projects, panels = [], users = [], loading, onRefresh }) {
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => { const value = new Date(today); value.setDate(value.getDate() - 29); return value; }, [today]);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const [selectedValue, setSelectedValue] = useState(toDateValue(today));
  const [showDelayedPanels, setShowDelayedPanels] = useState(false);
  const [showMarketingTeam, setShowMarketingTeam] = useState(false);
  const dateRef = useRef(null);
  const selectedDate = fromDateValue(selectedValue);
  const label = selectedValue === toDateValue(today) ? "اليوم" : selectedValue === toDateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === toDateValue(today) ? "today" : selectedValue === toDateValue(yesterday) ? "yesterday" : "custom";
  const currentProjects = projects.filter((project) => sameDate(project.createdAt || project.updatedAt, selectedDate));
  const previousDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
  const previousProjects = projects.filter((project) => sameDate(project.createdAt || project.updatedAt, previousDate));
  const statusCounts = projects.reduce((counts, project) => { counts[projectGroup(project, panels)] += 1; return counts; }, { pricing: 0, client: 0, execution: 0, production: 0, completed: 0 });
  const sorted = [...projects].sort((a, b) => updatedAt(b) - updatedAt(a));
  const newToday = currentProjects.filter((project) => sameDate(project.createdAt, selectedDate)).length;
  const conversion = projects.length ? Math.round((statusCounts.completed / projects.length) * 100) : 0;
  const marketers = users.filter((user) => user.role === "Marketer");
  const marketerRows = marketers.map((person) => {
    const personProjects = projects.filter((project) => String(project.marketingId?._id || project.marketingId || project.createdBy?._id || project.createdBy || "") === String(person._id));
    const finished = personProjects.filter((project) => projectGroup(project, panels) === "completed").length;
    return [person.name, personProjects.filter((project) => sameDate(project.createdAt, selectedDate)).length, personProjects.length, finished, `${personProjects.length ? Math.round((finished / personProjects.length) * 100) : 0}%`];
  });
  const delayReasons = realDelayReasons(panels);
  const delayedPanels = panels.filter((panel) => isDelayed(panel, today));
  const productionStages = [["تجميع", panels.filter((panel) => panel.status === "assembly").length, "#35ad71"], ["رش", panels.filter((panel) => panel.status === "painting").length, "#e5a532"], ["تصنيع", panels.filter((panel) => panel.status === "manufacturing").length, "#8a67d2"], ["ليزر", panels.filter((panel) => panel.status === "laser").length, "#42a5c4"]];
  const delayedItems = delayedPanels.map((panel) => ({ panel, action: `متأخر ${Math.max(daysLate(panel, today), 1)} يوم` }));
  const openPicker = () => { const input = dateRef.current; if (!input) return; try { if (input.showPicker) input.showPicker(); else input.focus(); } catch { input.focus(); } };
  const changePreset = (value) => { if (value === "today") setSelectedValue(toDateValue(today)); if (value === "yesterday") setSelectedValue(toDateValue(yesterday)); };

  return <><div className="marketing-dashboard" dir="rtl">
    <header className="marketing-dashboard-header"><div><h1>لوحة التحكم - Marketing Manager</h1><p>مرحبًا {name || "بك"}، إليك نظرة شاملة على أداء فريق التسويق والمشاريع.</p></div><div className="marketing-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label className="marketing-date-input" onClick={openPicker}><HiOutlineCalendar /><input ref={dateRef} aria-label="اختيار تاريخ لوحة مدير التسويق" type="date" inputMode="none" value={selectedValue} min={toDateValue(minDate)} max={toDateValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onChange={(event) => setSelectedValue(event.target.value)} /></label><div className="marketing-period-select"><StyledSelect value={preset} onChange={changePreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>
    <section className="marketing-metrics-grid"><MarketingMetric tone="green" icon={<HiOutlineCheckCircle />} title="مشاريع مكتملة" value={loading ? "—" : statusCounts.completed} note="حسب الحالة الفعلية" /><MarketingMetric tone="purple" icon={<HiOutlineChartBar />} title="مشاريع تحت التنفيذ" value={loading ? "—" : statusCounts.production} note="من مراحل اللوحات" /><MarketingMetric tone="amber" icon={<HiOutlineClock />} title="أوامر تنفيذ قيد الانتظار" value={loading ? "—" : statusCounts.execution} note="تحتاج متابعة" /><MarketingMetric tone="cyan" icon={<HiOutlineShoppingBag />} title={`طلبات العملاء (${label})`} value={loading ? "—" : currentProjects.length} note={`${currentProjects.length - previousProjects.length >= 0 ? "+" : ""}${currentProjects.length - previousProjects.length} مقارنة باليوم السابق`} /><MarketingMetric tone="emerald" icon={<HiOutlineBriefcase />} title={`المشاريع الجديدة (${label})`} value={loading ? "—" : newToday} note="مشاريع مسجلة" /><MarketingMetric tone="blue" icon={<HiOutlineUsers />} title="إجمالي المسوقين" value={loading ? "—" : marketers.length} note="من قائمة المستخدمين" /></section>

    <section className="marketing-layout">
      <section className="marketing-panel marketing-delay"><h2>أسباب التأخير المسجلة</h2>{delayReasons.slice(0, 5).map(([reason, count]) => <div key={reason}><b>{count}</b><span><strong>{reason}</strong><small>{count} تسجيل</small></span></div>)}{!delayReasons.length && <p className="marketing-empty">لا توجد أسباب تأخير مسجلة</p>}<button type="button" onClick={() => setShowDelayedPanels(true)} className="marketing-card-link">عرض اللوحات المتأخرة <HiOutlineExternalLink /></button></section>
      <MarketingTrend projects={projects} selectedDate={selectedDate} />
      <section className="marketing-panel marketing-funnel"><h2>سير العمل (قمع المبيعات)</h2><div className="marketing-funnel-visual"><span style={{ width: "100%" }}>مشاريع جديدة <b>{projects.length}</b></span><span style={{ width: "82%" }}>عرض سعر <b>{statusCounts.pricing}</b></span><span style={{ width: "66%" }}>بانتظار العميل <b>{statusCounts.client}</b></span><span style={{ width: "49%" }}>أمر تنفيذ <b>{statusCounts.execution}</b></span><span style={{ width: "34%" }}>مكتملة <b>{statusCounts.completed}</b></span></div><p>معدل التحويل الكلي <strong>{conversion}%</strong></p></section>
      <MarketingStatus counts={statusCounts} total={projects.length} />

      <section className="marketing-panel marketing-production"><h2>اللوحات في مراحل الإنتاج</h2><div>{productionStages.map(([stage, count, color]) => <article key={stage} style={{ "--production-stage-color": color }}><span>{stage}</span><strong>{count}</strong><small>لوحة</small></article>)}</div>{delayedPanels.length ? <p className="is-delayed"><HiOutlineExclamation />لوحات متأخرة وفق البيانات المسجلة <strong>{delayedPanels.length}</strong></p> : <p className="is-clear"><HiOutlineCheckCircle />لا توجد لوحات متأخرة حاليًا</p>}</section>
      <section className="marketing-panel marketing-team"><h2>أداء المسوقين ({label})</h2><div className="marketing-table-scroll"><table><thead><tr><th>المسوق</th><th>مشاريع جديدة</th><th>إجمالي المشاريع</th><th>مكتملة</th><th>معدل الإكمال</th></tr></thead><tbody>{marketerRows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div><button type="button" className="marketing-card-link" onClick={() => setShowMarketingTeam(true)}>عرض فريق التسويق <HiOutlineExternalLink /></button></section>

      <section className="marketing-panel marketing-alerts"><h2>تنبيهات مهمة</h2>{delayedPanels.length ? <p><HiOutlineExclamation />{delayedPanels.length} لوحات متأخرة وتحتاج متابعة</p> : <p><HiOutlineCheckCircle />لا توجد تنبيهات تأخير حقيقية الآن</p>}<button type="button" className="marketing-card-link" onClick={() => setShowDelayedPanels(true)}><HiOutlineBell />عرض اللوحات المتأخرة</button></section>
      <section className="marketing-panel marketing-clients"><h2>آخر العملاء نشاطًا</h2>{sorted.slice(0, 5).map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><b>{index + 1}</b><span><DashboardName>{project.client?.name || displayName(project)}</DashboardName></span><small>{updatedAt(project).toLocaleDateString("ar-EG")}</small></Link>)}{!sorted.length && <p className="marketing-empty">لا توجد بيانات عملاء</p>}<Link to="/clients" className="marketing-card-link">عرض جميع العملاء <HiOutlineExternalLink /></Link></section>
      <section className="marketing-panel marketing-best"><h2>أعلى المسوقين إكمالًا</h2>{[...marketerRows].sort((a, b) => b[3] - a[3]).slice(0, 4).map((row, index) => <div key={row[0]}><b>{index + 1}</b><span>{row[0]}</span><small>{row[3]} مكتملة</small></div>)}<button type="button" className="marketing-card-link" onClick={() => setShowMarketingTeam(true)}>عرض فريق التسويق <HiOutlineExternalLink /></button></section>
      <section className="marketing-panel marketing-activity"><h2>آخر الأنشطة</h2>{sorted.slice(0, 5).map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><span>تم تحديث المشروع <strong><DashboardName>{displayName(project)}</DashboardName></strong></span><time>{updatedAt(project).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</time></Link>)}{!sorted.length && <p className="marketing-empty">لا توجد أنشطة حديثة</p>}</section>
    </section>
  </div>{showDelayedPanels && <DashboardTasksModal eyebrow="تنبيهات التأخير" title="اللوحات المتأخرة" subtitle="اللوحات غير المكتملة التي تجاوزت موعد التسليم المعتمد فعليًا." items={delayedItems} emptyMessage="لا توجد لوحات متأخرة حاليًا." onClose={() => setShowDelayedPanels(false)} />}{showMarketingTeam && <MarketingTeamModal rows={marketerRows} label={label} onClose={() => setShowMarketingTeam(false)} />}</>;
}

export default MarketingManagerDashboard;
