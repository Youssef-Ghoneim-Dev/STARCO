import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineClock, HiOutlineCloudUpload, HiOutlineDocumentText, HiOutlineExclamation, HiOutlineExternalLink, HiOutlineFolder, HiOutlineRefresh, HiOutlineTemplate } from "react-icons/hi";
import StyledSelect from "../common/StyledSelect";
import toast from "react-hot-toast";
import DashboardName from "./DashboardName";
import DashboardDonut from "./DashboardDonut";
import DashboardAverage from "./DashboardAverage";
import DashboardTasksModal from "./DashboardTasksModal";
import { currentAction, engineerDeadline, isThisMonth, itemClient, itemCode, itemDate, itemLink, itemName, manufacturingFilesUploadedOn, sameDay, statusLabel, statusMeta, statusProgress, taskOutcome, workflowAverages } from "../../utils/dashboardData";
import { createDashboardNote, deleteDashboardNote, getDashboardNotes } from "../../services/dashboardNotesAPI";

const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDate = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const statusItems = [
  ["new", "جديدة", "#4b79dd"], ["pricing", "قيد التسعير", "#36af78"], ["quote", "عرض السعر جاهز", "#19a2a7"],
  ["pdf", "PDF التنفيذ", "#f0c634"], ["execution", "أوامر تنفيذ", "#9270d5"], ["manufacturing", "ملفات التصنيع", "#f0a23a"],
  ["production", "في الإنتاج", "#248eb1"], ["editing", "قيد التعديل", "#dc6570"], ["completed", "مكتملة", "#53b7ae"],
];

function Metric({ tone, icon, title, value, note }) {
  return <article className={`engineer-metric ${tone}`}><div className="engineer-metric-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
function StatusCard({ counts, total }) {
  const segments = statusItems.map(([key, label, color]) => ({ key, label, color, value: counts[key] || 0 }));
  return <section className="engineer-panel engineer-status-card"><h2>المشاريع حسب الحالة</h2><div className="engineer-status-content"><DashboardDonut className="engineer-donut" segments={segments} total={total} /><div className="engineer-status-list">{statusItems.map(([key, label, color]) => <div key={key}><i style={{ background: color }} /><span>{label}</span><strong>{counts[key] || 0}</strong></div>)}</div></div><Link to="/projects" className="engineer-more-link">عرض جميع المشاريع <HiOutlineExternalLink /></Link></section>;
}
function TaskList({ title, items, onViewAll }) {
  return <section className="engineer-panel engineer-project-list-card"><h2>{title}</h2><div className="engineer-project-list">{items.length ? items.map(({ panel, outcome }) => <Link to={itemLink(panel)} key={panel._id}><div><strong><DashboardName>{itemName(panel)}</DashboardName></strong><span>{itemClient(panel)} · {itemCode(panel)} · {outcome.action}</span></div><small className={`dashboard-task-state ${outcome.state}`}>{outcome.label}</small></Link>) : <p className="engineer-empty">لا توجد طلبات تنتظر إجراءً في هذا التاريخ</p>}</div><button type="button" onClick={onViewAll} className="engineer-more-link">عرض جميع الطلبات <HiOutlineExternalLink /></button></section>;
}

function EngineerDashboard({ name, userId, panels = [], loading, onRefresh }) {
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), [today]);
  const minimumDate = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const [selectedValue, setSelectedValue] = useState(dateValue(today));
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [taskModal, setTaskModal] = useState(null);
  const dateRef = useRef(null);
  useEffect(() => {
    let active = true;
    setNotesLoading(true);
    getDashboardNotes()
      .then(({ data }) => { if (active) setNotes(data?.notes || []); })
      .catch((error) => { if (active) toast.error(error?.response?.data?.message || "تعذر تحميل الملاحظات السريعة."); })
      .finally(() => { if (active) setNotesLoading(false); });
    return () => { active = false; };
  }, [userId]);
  const selectedDate = fromDate(selectedValue);
  const selectedLabel = selectedValue === dateValue(today) ? "اليوم" : selectedValue === dateValue(yesterday) ? "أمس" : selectedDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const preset = selectedValue === dateValue(today) ? "today" : selectedValue === dateValue(yesterday) ? "yesterday" : "custom";
  const sorted = useMemo(() => [...panels].sort((a, b) => itemDate(b) - itemDate(a)), [panels]);
  const counts = panels.reduce((result, panel) => { const group = statusMeta(panel).group; result[group] = (result[group] || 0) + 1; return result; }, Object.fromEntries(statusItems.map(([key]) => [key, 0])));
  const pendingTasksAll = sorted.filter((panel) => currentAction(panel, "Engineer"));
  const selectedPendingTasks = pendingTasksAll.filter((panel) => sameDay(panel.updatedAt || panel.createdAt, selectedDate));
  const tasks = selectedPendingTasks.map((panel) => ({ panel, outcome: taskOutcome(panel, "Engineer") })).slice(0, 6);
  const pendingTasks = pendingTasksAll.slice(0, 5);
  const deadlines = sorted.filter((panel) => engineerDeadline(panel) && sameDay(engineerDeadline(panel), selectedDate)).slice(0, 5);
  const priorities = sorted.filter((panel) => currentAction(panel, "Engineer")).sort((a, b) => (engineerDeadline(a)?.getTime() || Infinity) - (engineerDeadline(b)?.getTime() || Infinity)).slice(0, 4);
  const averages = workflowAverages(panels);
  const selectedPanels = panels.filter((panel) => sameDay(panel.createdAt, selectedDate));
  const previousDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
  const previousPanels = panels.filter((panel) => sameDay(panel.createdAt, previousDate));
  const completedSelected = panels.filter((panel) => panel.status === "completed" && sameDay(itemDate(panel), selectedDate)).length;
  const pdfCount = panels.filter((panel) => panel.executionPdf?.readyAt && sameDay(panel.executionPdf.readyAt, selectedDate)).length;
  const fileCount = manufacturingFilesUploadedOn(panels, selectedDate);
  const addNote = async (event) => {
    event.preventDefault();
    const text = note.trim();
    if (!text || noteSaving) return;
    setNoteSaving(true);
    try {
      const { data } = await createDashboardNote(text);
      setNotes((current) => [data.note, ...current]);
      setNote("");
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حفظ الملاحظة.");
    } finally {
      setNoteSaving(false);
    }
  };
  const removeNote = async (noteId) => {
    try {
      await deleteDashboardNote(noteId);
      setNotes((current) => current.filter((item) => item.id !== noteId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حذف الملاحظة.");
    }
  };
  const openPicker = () => { try { dateRef.current?.showPicker?.(); } catch { dateRef.current?.focus(); } };

  const modalItems = (taskModal === "selected" ? selectedPendingTasks : pendingTasksAll).map((panel) => ({ panel, action: currentAction(panel, "Engineer") }));

  return <><div className="engineer-dashboard" dir="rtl">
    <header className="engineer-dashboard-header"><div><h1>لوحة التحكم - المهندس</h1><p>مرحبًا {name || "بك"}، جميع الأرقام محسوبة من سجل اللوحات الفعلي.</p></div><div className="engineer-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button><label className="engineer-date-input" onClick={openPicker}><HiOutlineCalendar /><input ref={dateRef} type="date" value={selectedValue} min={dateValue(minimumDate)} max={dateValue(today)} onChange={(event) => setSelectedValue(event.target.value)} /></label><div className="engineer-period-select"><StyledSelect value={preset} onChange={(value) => setSelectedValue(value === "today" ? dateValue(today) : value === "yesterday" ? dateValue(yesterday) : selectedValue)} options={[{ value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }, ...(preset === "custom" ? [{ value: "custom", label: "تاريخ محدد" }] : [])]} /></div></div></header>
    <section className="engineer-metrics-grid"><Metric tone="blue" icon={<HiOutlineFolder />} title="اللوحات المتاحة والمسندة" value={loading ? "—" : panels.length} note="حسب صلاحية حسابك" /><Metric tone="green" icon={<HiOutlineCalendar />} title={`طلبات جديدة (${selectedLabel})`} value={loading ? "—" : selectedPanels.length} note={`${selectedPanels.length - previousPanels.length >= 0 ? "+" : ""}${selectedPanels.length - previousPanels.length} مقارنة باليوم السابق`} /><Metric tone="amber" icon={<HiOutlineClock />} title="قيد عرض السعر" value={loading ? "—" : counts.new + counts.pricing + counts.editing} note="تحتاج إجراء هندسي" /><Metric tone="violet" icon={<HiOutlineDocumentText />} title="بانتظار PDF التنفيذ" value={loading ? "—" : counts.pdf} note="من الحالة الفعلية للوحة" /><Metric tone="emerald" icon={<HiOutlineCheckCircle />} title="أوامر تنفيذ" value={loading ? "—" : counts.execution + counts.manufacturing + counts.production} note="مؤكدة أو في الإنتاج" /><Metric tone="indigo" icon={<HiOutlineCloudUpload />} title="ملفات تصنيع اليوم" value={loading ? "—" : fileCount} note="ملفات رُفعت فعليًا" /></section>
    <section className="engineer-main-grid">
      <section className="engineer-panel engineer-quick-actions"><h2>إجراءات سريعة</h2><button type="button" className="primary" onClick={() => setTaskModal("all")}><HiOutlineClock />المهام المنتظرة</button><Link to="/panels?statuses=executionPdfRequested"><HiOutlineCloudUpload />لوحات PDF التنفيذ</Link><Link to="/panels?statuses=manufacturingFilesPending"><HiOutlineFolder />ملفات التصنيع</Link><Link to="/projects"><HiOutlineFolder />مشاريعي</Link><Link to="/configuration"><HiOutlineTemplate />الإعدادات والقوالب</Link></section>
      <TaskList title={`طلبات ${selectedLabel}`} items={tasks} onViewAll={() => setTaskModal("selected")} />
      <section className="engineer-panel engineer-execution-card"><h2>المهام التي تنتظر إجراءك</h2><div>{pendingTasks.map((panel) => <Link to={itemLink(panel)} key={panel._id}><div><strong><DashboardName>{itemName(panel)}</DashboardName></strong><span>{itemCode(panel)} · {currentAction(panel, "Engineer")}</span></div><small>قيد الانتظار</small></Link>)}{!pendingTasks.length && <p className="engineer-empty">أنهيت كل المهام الحالية</p>}</div><button type="button" className="engineer-more-link" onClick={() => setTaskModal("all")}>عرض كل المهام <HiOutlineExternalLink /></button></section>
      <StatusCard counts={counts} total={panels.length} />
      <section className="engineer-panel engineer-performance-card"><h2>أدائي {selectedLabel}</h2><div><span><strong>{selectedPanels.length}</strong>لوحات جديدة</span><span><strong>{completedSelected}</strong>لوحات مكتملة</span><span><strong>{pdfCount}</strong>PDF تنفيذ جاهزة</span><span><strong>{fileCount}</strong>ملفات تصنيع مرفوعة</span></div><p>محسوب من تواريخ الأحداث المسجلة.</p></section>
      <section className="engineer-panel engineer-deadlines"><h2>المواعيد النهائية {selectedLabel}</h2>{deadlines.map((panel) => <Link to={itemLink(panel)} key={panel._id}><div><strong><DashboardName>{itemName(panel)}</DashboardName></strong><span>آخر موعد لرفع ملفات التصنيع</span></div><time>{engineerDeadline(panel).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</time></Link>)}{!deadlines.length && <p className="engineer-empty">لا توجد ملفات تصنيع مستحقة في هذا اليوم</p>}</section>
      <section className="engineer-panel engineer-recent-card"><h2>المشاريع الأخيرة</h2><div className="engineer-table-scroll"><table><thead><tr><th>اللوحة</th><th>الحالة الفعلية</th><th>آخر تحديث</th><th>التقدم</th></tr></thead><tbody>{sorted.slice(0, 6).map((panel) => <tr key={panel._id}><td><DashboardName>{itemName(panel)}</DashboardName></td><td>{statusLabel(panel)}</td><td>{itemDate(panel).toLocaleDateString("ar-EG")}</td><td><span className="engineer-progress" title={`${statusProgress(panel)}%`}><i style={{ width: `${statusProgress(panel)}%` }} /></span></td></tr>)}{!sorted.length && <tr><td className="engineer-table-empty" colSpan="4">لا توجد لوحات حديثة حتى الآن</td></tr>}</tbody></table></div><Link className="engineer-more-link" to="/panels">عرض جميع لوحاتي <HiOutlineExternalLink /></Link></section>
      <section className="engineer-panel engineer-priority-card"><h2>أعلى الأولويات</h2>{priorities.map((panel) => { const due = engineerDeadline(panel); const urgent = due && due <= today; return <Link to={itemLink(panel)} key={panel._id}><div><HiOutlineExclamation /><span><strong><DashboardName>{itemName(panel)}</DashboardName></strong><small>{currentAction(panel, "Engineer")}{due ? ` · آخر موعد ${due.toLocaleDateString("ar-EG")}` : ""}</small></span></div><b className={due ? "high" : "medium"}>{urgent ? "مطلوب اليوم" : due ? "موعد نهائي" : "بانتظارك"}</b></Link>; })}{!priorities.length && <p className="engineer-empty">لا توجد أولويات حاليًا</p>}</section>
      <section className="engineer-panel engineer-notes"><h2>ملاحظات سريعة</h2><form onSubmit={addNote}><input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="اكتب ملاحظة لنفسك..." disabled={noteSaving} /><button type="submit" disabled={noteSaving || !note.trim()}>{noteSaving ? "جاري الحفظ..." : "إضافة"}</button></form><div>{notes.slice(0, 5).map((entry) => <p key={entry.id}><span>{entry.text}</span><button type="button" aria-label="حذف الملاحظة" onClick={() => removeNote(entry.id)}>×</button></p>)}{notesLoading && <p className="engineer-empty">جاري تحميل الملاحظات...</p>}{!notesLoading && !notes.length && <p className="engineer-empty">لا توجد ملاحظات محفوظة</p>}</div></section>
    </section>
    <section className="engineer-kpi-strip"><div><HiOutlineFolder /><span>متوسط رفع ملفات التصنيع</span><DashboardAverage result={averages.manufacturingFiles} /></div><div><HiOutlineDocumentText /><span>متوسط تجهيز PDF التنفيذ</span><DashboardAverage result={averages.executionPdf} /></div><div><HiOutlineClock /><span>متوسط إنجاز عرض السعر</span><DashboardAverage result={averages.quote} /></div><div><HiOutlineCloudUpload /><span>ملفات التصنيع المرفوعة اليوم</span><strong>{manufacturingFilesUploadedOn(panels, today)}</strong></div><div><HiOutlineCheckCircle /><span>اللوحات المكتملة هذا الشهر</span><strong>{panels.filter((panel) => panel.status === "completed" && isThisMonth(itemDate(panel), today)).length}</strong></div></section>
  </div>{taskModal && <DashboardTasksModal title={taskModal === "selected" ? `طلبات ${selectedLabel} المنتظرة` : "كل المهام المنتظرة"} subtitle={taskModal === "selected" ? "الطلبات المسجلة في التاريخ المحدد والتي لم يُستكمل الإجراء المطلوب عليها." : "عروض الأسعار وملفات PDF التنفيذ وملفات التصنيع التي تحتاج إجراءك الآن."} items={modalItems} onClose={() => setTaskModal(null)} />}</>;
}
export default EngineerDashboard;
