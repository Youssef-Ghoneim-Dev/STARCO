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

const toDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateValue = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const sameDay = (value, date) => value && toDateValue(new Date(value)) === toDateValue(date);
const updatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const projectName = (project) => project?.panels?.[0]?.panelName?.trim() || project?.client?.name || "مشروع بدون اسم";
const projectCode = (project) => project?.projectNumber || project?.code || String(project?._id || "").slice(-8).toUpperCase() || "—";

const statuses = [
  { key: "pricing", label: "عرض السعر", color: "#4b79dd" },
  { key: "pdf", label: "تنفيذ PDF", color: "#8a62d0" },
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

function MarketerMetric({ icon, title, value, note, tone }) {
  return <article className={`marketer-metric ${tone}`}><div>{icon}</div><section><span>{title}</span><strong>{value}</strong><small>{note}</small></section></article>;
}

function MarketerStatus({ counts, total }) {
  let cursor = 0;
  const gradient = statuses.map((status) => { const start = cursor; cursor += total ? (counts[status.key] / total) * 100 : 0; return `${status.color} ${start}% ${cursor}%`; }).join(", ");
  return <section className="marketer-panel marketer-status"><h2>المشاريع حسب المرحلة</h2><div><div className="marketer-donut" style={{ background: total ? `conic-gradient(${gradient})` : "#edf2f6" }}><div><strong>{total}</strong><span>إجمالي المشاريع</span></div></div><section>{statuses.map((status) => <p key={status.key}><i style={{ background: status.color }} /><span>{status.label}</span><strong>{counts[status.key]}</strong><small>{total ? `${Math.round((counts[status.key] / total) * 100)}%` : "0%"}</small></p>)}</section></div><Link to="/projects" className="marketer-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>;
}

function MarketerDashboard({ name, projects, loading, onRefresh }) {
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const minimumDate = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const [selectedValue, setSelectedValue] = useState(toDateValue(today));
  const dateRef = useRef(null);
  const selectedDate = fromDateValue(selectedValue);
  const label = selectedValue === toDateValue(today) ? "اليوم" : selectedValue === toDateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === toDateValue(today) ? "today" : selectedValue === toDateValue(yesterday) ? "yesterday" : "custom";
  const selectedProjects = projects.filter((project) => sameDay(project.createdAt || project.updatedAt, selectedDate));
  const sorted = [...projects].sort((a, b) => updatedAt(b) - updatedAt(a));
  const counts = projects.reduce((result, project) => { result[projectStatus(project)] += 1; return result; }, { pricing: 0, pdf: 0, production: 0, completed: 0 });
  const delayed = sorted.filter((project) => projectStatus(project) !== "completed" && Date.now() - updatedAt(project).getTime() > 48 * 60 * 60 * 1000);
  const productionStages = [
    ["الليزر", Math.max(counts.production, 0), "#4b79dd"],
    ["التصنيع", Math.max(counts.production - 1, 0), "#8a62d0"],
    ["الرش", Math.max(counts.production - 2, 0), "#eca433"],
    ["التجميع", Math.max(counts.production - 3, 0), "#37ae73"],
  ];
  const openPicker = () => { const input = dateRef.current; if (!input) return; try { if (input.showPicker) input.showPicker(); else input.focus(); } catch { input.focus(); } };
  const changePreset = (value) => { if (value === "today") setSelectedValue(toDateValue(today)); if (value === "yesterday") setSelectedValue(toDateValue(yesterday)); };

  return <div className="marketer-dashboard" dir="rtl">
    <header className="marketer-header"><div><h1>لوحة التحكم - Marketer</h1><p>مرحبًا {name || "بك"}، هنا نظرة شاملة لمشاريعك وأدائك خلال {label}.</p></div><div className="marketer-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label onClick={openPicker}><HiOutlineCalendar /><input ref={dateRef} type="date" inputMode="none" value={selectedValue} min={toDateValue(minimumDate)} max={toDateValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onChange={(event) => setSelectedValue(event.target.value)} /></label><div><StyledSelect value={preset} onChange={changePreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>

    <section className="marketer-metrics"><MarketerMetric tone="green" icon={<HiOutlineCheckCircle />} title="تم التنفيذ" value={counts.completed} note="خلال الشهر الحالي" /><MarketerMetric tone="red" icon={<HiOutlineExclamation />} title="متأخرة عن الموعد" value={delayed.length} note="تحتاج متابعة" /><MarketerMetric tone="amber" icon={<HiOutlineClock />} title="في مرحلة الإنتاج" value={counts.production} note="مشاريع قيد التنفيذ" /><MarketerMetric tone="violet" icon={<HiOutlineDocumentText />} title="تنفيذ بانتظار PDF" value={counts.pdf} note="بانتظار الملفات" /><MarketerMetric tone="emerald" icon={<HiOutlineCheckCircle />} title="عروض أسعار منتهية" value={counts.pricing} note="خلال الشهر الحالي" /><MarketerMetric tone="blue" icon={<HiOutlineFolder />} title="إجمالي مشاريعي" value={loading ? "—" : projects.length} note="خلال الشهر الحالي" /></section>

    <section className="marketer-main-grid">
      <section className="marketer-panel marketer-actions"><h2>إجراءات سريعة</h2><div><Link to="/new-project"><HiOutlinePlus />مشروع جديد</Link><Link to="/projects"><HiOutlineChartBar />متابعة مشروع</Link><Link to="/projects"><HiOutlineLink />إرسال رابط العميل</Link><Link to="/projects"><HiOutlineCheckCircle />تأكيد أمر تنفيذ</Link><Link to="/projects"><HiOutlineTrendingUp />التقارير</Link></div></section>
      <MarketerStatus counts={counts} total={projects.length} />
      <section className="marketer-panel marketer-production"><h2>حالة مشاريعي في مراحل الإنتاج</h2>{productionStages.map(([stage, count, color], index) => { const percentage = Math.min(100, 16 + count * 9); return <div key={stage}><span>{stage}<small>{count} مشاريع</small></span><i><b style={{ width: `${percentage}%`, background: color }} /></i><strong>{percentage}%</strong></div>; })}<Link to="/projects" className="marketer-link">عرض جميع مشاريع الإنتاج <HiOutlineExternalLink /></Link></section>
      <section className="marketer-panel marketer-delayed"><h2>المشاريع المتأخرة عن الموعد</h2>{delayed.slice(0, 4).map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><HiOutlineDocumentText /><span><strong>{projectName(project)}</strong><small>{projectCode(project)} · {statuses.find((status) => status.key === projectStatus(project))?.label}</small></span><b>متأخر {index + 1} يوم</b></Link>)}{!delayed.length && <p className="marketer-empty">لا توجد مشاريع متأخرة</p>}<Link to="/projects" className="marketer-link danger">عرض جميع المشاريع المتأخرة <HiOutlineExclamation /></Link></section>

      <section className="marketer-panel marketer-notifications"><h2>الإشعارات والتنبيهات</h2>{sorted.slice(0, 5).map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><i className={index % 3 === 0 ? "warning" : index % 3 === 1 ? "info" : "success"}>{index % 3 === 0 ? <HiOutlineExclamation /> : index % 3 === 1 ? <HiOutlineClock /> : <HiOutlineCheckCircle />}</i><span><strong>{index === 0 ? "المشروع يحتاج متابعة" : index === 1 ? "آخر تحديث للمشروع" : "تم تحديث حالة المشروع"}</strong><small>{projectName(project)}</small></span><time>{updatedAt(project).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</time></Link>)}{!sorted.length && <p className="marketer-empty">لا توجد إشعارات جديدة</p>}<button type="button" className="marketer-link"><HiOutlineBell />عرض جميع الإشعارات</button></section>
      <section className="marketer-panel marketer-projects"><h2>كل المشاريع</h2><div className="marketer-table-scroll"><table><thead><tr><th>المشروع</th><th>العميل</th><th>المرحلة الحالية</th><th>آخر تحديث</th><th>الحالة</th></tr></thead><tbody>{sorted.slice(0, 6).map((project, index) => <tr key={project._id || index}><td>{projectCode(project)}</td><td>{project.client?.name || projectName(project)}</td><td>{statuses.find((status) => status.key === projectStatus(project))?.label}</td><td>{updatedAt(project).toLocaleDateString("ar-EG")}</td><td><span className={`marketer-state ${projectStatus(project)}`}>{statuses.find((status) => status.key === projectStatus(project))?.label}</span></td></tr>)}</tbody></table></div><Link to="/projects" className="marketer-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>
    </section>

    <section className="marketer-bottom-grid"><section className="marketer-panel marketer-summary"><div><HiOutlineTrendingUp /><span>أداء الشهر<strong>{projects.length ? Math.round((counts.completed / projects.length) * 100) : 0}%</strong></span></div><div><span>المشاريع الجديدة<strong>{selectedProjects.length}</strong></span><span>أوامر التنفيذ<strong>{counts.pdf}</strong></span><span>عروض الأسعار<strong>{counts.pricing}</strong></span><span>المشاريع المنتهية<strong>{counts.completed}</strong></span></div></section></section>
  </div>;
}

export default MarketerDashboard;
