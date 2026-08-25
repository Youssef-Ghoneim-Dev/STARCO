import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCloudUpload,
  HiOutlineDocumentText,
  HiOutlineExclamation,
  HiOutlineExternalLink,
  HiOutlineFolder,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTemplate,
} from "react-icons/hi";
import StyledSelect from "../common/StyledSelect";

const dateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateFromValue = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const sameDay = (value, target) => {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
};

const projectName = (project) => project?.panels?.[0]?.panelName?.trim() || project?.client?.name || "مشروع بدون اسم";
const projectCode = (project) => project?.projectNumber || project?.code || String(project?._id || "").slice(-8).toUpperCase() || "—";
const projectUpdatedAt = (project) => new Date(project?.updatedAt || project?.createdAt || Date.now());
const isStatus = (project, values) => values.includes(String(project?.status || ""));

const statusItems = [
  { key: "new", label: "جديدة", color: "#4b79dd" },
  { key: "pricing", label: "قيد التسعير", color: "#36af78" },
  { key: "pdf", label: "في انتظار PDF تنفيذ", color: "#f0c634" },
  { key: "execution", label: "أوامر تنفيذ", color: "#9270d5" },
  { key: "manufacturing", label: "ملفات للتصنيع", color: "#f0a23a" },
  { key: "completed", label: "مكتملة", color: "#53b7ae" },
];

function EngineerMetric({ tone, icon, title, value, note }) {
  return <article className={`engineer-metric ${tone}`}>
    <div className="engineer-metric-icon">{icon}</div>
    <div><span>{title}</span><strong>{value}</strong><small>{note}</small></div>
  </article>;
}

function EngineerStatusCard({ counts, total }) {
  let cursor = 0;
  const gradient = statusItems.map((item) => {
    const start = cursor;
    cursor += total ? ((counts[item.key] || 0) / total) * 100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");

  return <section className="engineer-panel engineer-status-card">
    <h2>المشاريع حسب الحالة</h2>
    <div className="engineer-status-content">
      <div className="engineer-donut" style={{ background: total ? `conic-gradient(${gradient})` : "#edf2f6" }}><div><strong>{total}</strong><span>إجمالي المشاريع</span></div></div>
      <div className="engineer-status-list">{statusItems.map((item) => <div key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{counts[item.key] || 0}</strong></div>)}</div>
    </div>
    <Link to="/projects" className="engineer-more-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link>
  </section>;
}

function ProjectMiniList({ title, projects, emptyText, actionLabel }) {
  return <section className="engineer-panel engineer-project-list-card">
    <h2>{title}</h2>
    <div className="engineer-project-list">
      {projects.length ? projects.map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}>
        <div><strong>{projectName(project)}</strong><span>{project.client?.name || "عميل غير محدد"} · {projectCode(project)}</span></div>
        <small>{project.status === "pending" ? "جديد" : "عرض سعر"}</small>
      </Link>) : <p className="engineer-empty">{emptyText}</p>}
    </div>
    <Link to="/projects" className="engineer-more-link">{actionLabel} <HiOutlineExternalLink /></Link>
  </section>;
}

function EngineerDashboard({ name, projects, loading, onRefresh }) {
  const today = useMemo(() => new Date(), []);
  const minimumDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 29);
    return date;
  }, [today]);
  const [selectedDateValue, setSelectedDateValue] = useState(dateValue(today));
  const dateInputRef = useRef(null);
  const selectedDate = dateFromValue(selectedDateValue);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const isToday = dateValue(selectedDate) === dateValue(today);
  const isYesterday = dateValue(selectedDate) === dateValue(yesterday);
  const selectedLabel = isToday ? "اليوم" : isYesterday ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = isToday ? "today" : isYesterday ? "yesterday" : "custom";
  const selectedProjects = projects.filter((project) => sameDay(project.createdAt || project.updatedAt, selectedDate));
  const yesterdayProjects = projects.filter((project) => sameDay(project.createdAt || project.updatedAt, new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1)));

  const counts = useMemo(() => projects.reduce((result, project) => {
    const status = String(project.status || "");
    if (status === "completed") result.completed += 1;
    else if (/manufactur/i.test(status)) result.manufacturing += 1;
    else if (/pdf/i.test(status)) result.pdf += 1;
    else if (["inProgress", "execution", "executing", "executionOrdered"].includes(status)) result.execution += 1;
    else if (["pending", "marketingDraft"].includes(status)) result.new += 1;
    else result.pricing += 1;
    return result;
  }, { new: 0, pricing: 0, pdf: 0, execution: 0, manufacturing: 0, completed: 0 }), [projects]);

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => projectUpdatedAt(b) - projectUpdatedAt(a)), [projects]);
  const todayRequests = sortedProjects.filter((project) => sameDay(project.createdAt, selectedDate)).slice(0, 5);
  const executionOrders = sortedProjects.filter((project) => isStatus(project, ["executionPdfRequested", "executionPdfReady", "executionOrdered", "execution", "executing"])).slice(0, 3);
  const priorityProjects = sortedProjects.filter((project) => project.status !== "completed").slice(0, 4);
  const completedToday = selectedProjects.filter((project) => project.status === "completed").length;
  const previousCompleted = yesterdayProjects.filter((project) => project.status === "completed").length;
  const delta = selectedProjects.length - yesterdayProjects.length;
  const completedThisMonth = projects.filter((project) => {
    const date = projectUpdatedAt(project);
    return project.status === "completed" && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }).length;

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

  const setPreset = (value) => {
    if (value === "today") setSelectedDateValue(dateValue(today));
    if (value === "yesterday") setSelectedDateValue(dateValue(yesterday));
  };

  return <div className="engineer-dashboard" dir="rtl">
    <header className="engineer-dashboard-header">
      <div><h1>لوحة التحكم - المهندس</h1><p>مرحبًا {name || "بك"}، إليك نظرة سريعة على أعمالك في التاريخ المحدد.</p></div>
      <div className="engineer-date-tools">
        <button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button>
        <label className="engineer-date-input" onClick={openDatePicker}><HiOutlineCalendar /><input ref={dateInputRef} type="date" aria-label="اختيار تاريخ لوحة المهندس" inputMode="none" value={selectedDateValue} min={dateValue(minimumDate)} max={dateValue(today)} onKeyDown={(event) => event.preventDefault()} onBeforeInput={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onChange={(event) => setSelectedDateValue(event.target.value)} /></label>
        <div className="engineer-period-select"><StyledSelect value={preset} onChange={setPreset} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div>
      </div>
    </header>

    <section className="engineer-metrics-grid">
      <EngineerMetric tone="blue" icon={<HiOutlineFolder />} title="إجمالي مشاريعي" value={loading ? "—" : projects.length} note={`${delta >= 0 ? "+" : ""}${delta} مقارنة بالأمس`} />
      <EngineerMetric tone="green" icon={<HiOutlineCalendar />} title={`طلبات جديدة (${selectedLabel})`} value={loading ? "—" : selectedProjects.length} note={`${selectedProjects.length - yesterdayProjects.length >= 0 ? "+" : ""}${selectedProjects.length - yesterdayProjects.length} مقارنة بالأمس`} />
      <EngineerMetric tone="amber" icon={<HiOutlineClock />} title="قيد عرض السعر" value={loading ? "—" : counts.pricing + counts.new} note={`${counts.pricing + counts.new} مشروع يحتاج مراجعة`} />
      <EngineerMetric tone="violet" icon={<HiOutlineDocumentText />} title="في انتظار PDF تنفيذ" value={loading ? "—" : counts.pdf} note="طلبات جاهزة للرفع" />
      <EngineerMetric tone="emerald" icon={<HiOutlineCheckCircle />} title="أوامر تنفيذ" value={loading ? "—" : counts.execution} note="جاهزة للعمل عليها" />
      <EngineerMetric tone="indigo" icon={<HiOutlineCloudUpload />} title="ملفات للتصنيع" value={loading ? "—" : counts.manufacturing} note="بانتظار رفع الملفات" />
    </section>

    <section className="engineer-main-grid">
      <aside className="engineer-side-stack">
        <section className="engineer-panel engineer-quick-actions"><h2>إجراءات سريعة</h2><Link className="primary" to="/new-project"><HiOutlinePlus />مشروع جديد</Link><Link to="/projects"><HiOutlineCloudUpload />رفع ملفات التنفيذ PDF</Link><Link to="/projects"><HiOutlineFolder />رفع ملفات التصنيع</Link><Link to="/projects"><HiOutlineFolder />مشاريعي</Link><Link to="/configuration"><HiOutlineTemplate />الإعدادات والقوالب</Link></section>
        <section className="engineer-panel engineer-deadlines"><h2>المواعيد النهائية اليوم</h2>{priorityProjects.slice(0, 3).map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><div><strong>{projectName(project)}</strong><span>{index === 0 ? "تسليم عرض السعر" : index === 1 ? "رفع PDF التنفيذ" : "رفع ملفات التصنيع"}</span></div><time>{index + 4}:00 م</time></Link>)}{!priorityProjects.length && <p className="engineer-empty">لا توجد مواعيد اليوم</p>}<Link className="engineer-more-link" to="/projects">عرض جميع المواعيد <HiOutlineExternalLink /></Link></section>
        <section className="engineer-panel engineer-notes"><h2>ملاحظات سريعة</h2><p>لا توجد ملاحظات جديدة</p><button type="button"><HiOutlinePlus />إضافة ملاحظة</button></section>
      </aside>

      <div className="engineer-content-grid">
        <section className="engineer-panel engineer-execution-card"><h2>أوامر التنفيذ الجاهزة للعمل عليها</h2><div>{executionOrders.length ? executionOrders.map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><div><strong>{projectName(project)}</strong><span>{project.client?.name || "عميل غير محدد"} · {projectCode(project)}</span></div><small>أمر تنفيذ</small></Link>) : <p className="engineer-empty">لا توجد أوامر تنفيذ جاهزة</p>}</div><Link className="engineer-more-link" to="/projects">عرض جميع أوامر التنفيذ <HiOutlineExternalLink /></Link></section>
        <EngineerStatusCard counts={counts} total={projects.length} />
        <ProjectMiniList title={`طلبات ${selectedLabel}`} projects={todayRequests} emptyText="لا توجد طلبات في هذا التاريخ" actionLabel="عرض جميع الطلبات" />
        <section className="engineer-panel engineer-priority-card"><h2>أعلى الأولويات</h2>{priorityProjects.map((project, index) => <Link to={`/projects/${project._id}`} key={project._id || index}><div><HiOutlineExclamation /><span><strong>{projectName(project)}</strong><small>{index < 2 ? "مستحق خلال ساعات" : "مستحق اليوم"}</small></span></div><b className={index < 2 ? "high" : "medium"}>{index < 2 ? "عالية" : "متوسطة"}</b></Link>)}{!priorityProjects.length && <p className="engineer-empty">لا توجد أولويات حاليًا</p>}<Link className="engineer-more-link" to="/projects">عرض جميع الأولويات <HiOutlineExternalLink /></Link></section>
        <section className="engineer-panel engineer-recent-card"><h2>المشاريع الأخيرة</h2><div className="engineer-table-scroll"><table><thead><tr><th>المشروع</th><th>الحالة</th><th>آخر تحديث</th><th>التقدم</th></tr></thead><tbody>{sortedProjects.slice(0, 5).map((project, index) => <tr key={project._id || index}><td>{projectName(project)}</td><td>{project.status === "completed" ? "مكتمل" : project.status === "inProgress" ? "أمر تنفيذ" : "عرض سعر"}</td><td>{projectUpdatedAt(project).toLocaleDateString("ar-EG")}</td><td><span className="engineer-progress"><i style={{ width: `${project.status === "completed" ? 100 : 30 + index * 12}%` }} /></span></td></tr>)}</tbody></table></div><Link className="engineer-more-link" to="/projects">عرض جميع مشاريعي <HiOutlineExternalLink /></Link></section>
        <section className="engineer-panel engineer-performance-card"><h2>أدائي {selectedLabel}</h2><div><span><strong>{selectedProjects.length}</strong>مشاريع جديدة</span><span><strong>{completedToday}</strong>عروض أسعار مكتملة</span><span><strong>{counts.pdf}</strong>PDF تنفيذ مرفوعة</span><span><strong>{counts.manufacturing}</strong>ملفات تصنيع مرفوعة</span></div><p>{completedToday - previousCompleted >= 0 ? "+" : ""}{completedToday - previousCompleted} مقارنة بالأمس</p></section>
      </div>
    </section>

    <section className="engineer-kpi-strip"><div><HiOutlineFolder /><span>متوسط وقت رفع ملفات التصنيع</span><strong>1.5 يوم</strong></div><div><HiOutlineDocumentText /><span>متوسط وقت رفع PDF التنفيذ</span><strong>2.3 يوم</strong></div><div><HiOutlineClock /><span>متوسط وقت إنجاز عرض السعر</span><strong>1.8 يوم</strong></div><div><HiOutlineCloudUpload /><span>ملفات التصنيع المرفوعة اليوم</span><strong>{counts.manufacturing}</strong></div><div><HiOutlineCheckCircle /><span>المشاريع المكتملة هذا الشهر</span><strong>{completedThisMonth}</strong></div></section>
  </div>;
}

export default EngineerDashboard;
