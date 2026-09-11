import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamation, HiOutlineExclamationCircle, HiOutlineExternalLink, HiOutlineRefresh, HiOutlineViewGrid } from "react-icons/hi";
import DashboardName from "./DashboardName";
import { currentAction, itemCode, itemLink, itemName } from "../../utils/dashboardData";
import { ROLE_LABELS, SUPERVISOR_STAGE_BY_ROLE } from "../../utils/roles";

const ROLE_COPY = {
  LaserSupervisor: { title: "مشرف الليزر", stage: "مرحلة الليزر وتنزيل الملفات", shortStage: "الليزر", color: "#42a5c4" },
  ManufacturingSupervisor: { title: "مشرف التصنيع", stage: "مرحلة التصنيع", shortStage: "التصنيع", color: "#9270d5" },
  PaintingSupervisor: { title: "مشرف الرش", stage: "مرحلة الرش والدهان", shortStage: "الرش", color: "#e7a635" },
  AssemblySupervisor: { title: "مشرف التجميع", stage: "مرحلة التجميع", shortStage: "التجميع", color: "#34ad72" },
};
const deadlineFor = (panel) => {
  const status = panel?.status === "manufacturingFilesReady" ? "pendingLaserDownload" : panel?.status;
  return panel?.deliverySchedule?.currentStageDueAt || panel?.deliverySchedule?.deadlines?.[status] || panel?.deliverySchedule?.approvedDate || panel?.deliverySchedule?.requestedDate || null;
};

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const sameDay = (first, second) => first && second && first.toDateString() === second.toDateString();
const stageDaysLate = (panel, now = new Date()) => {
  const activeStage = (panel?.manufacturing?.productionStages || []).find((stage) => stage.status === "active");
  const delayedAt = validDate(activeStage?.delayedAt);
  if (!delayedAt) return 0;
  return Math.max(1, Math.ceil((now - delayedAt) / 86400000));
};

function SupervisorMetric({ icon, title, value, note, tone = "blue" }) {
  return <article className={`production-manager-metric ${tone}`}><div>{icon}</div><section><span>{title}</span><strong>{value}</strong><small>{note}</small></section></article>;
}

function StageSupervisorDashboard({ name, role, panels, loading, onRefresh }) {
  const today = new Date();
  const copy = ROLE_COPY[role] || { title: ROLE_LABELS[role], stage: "مرحلة الإنتاج", shortStage: "الإنتاج", color: "#376d88" };
  const allowedStatuses = SUPERVISOR_STAGE_BY_ROLE[role] || [];
  const visible = panels
    .filter((panel) => allowedStatuses.includes(panel.status))
    .sort((first, second) => new Date(deadlineFor(first) || first.updatedAt || 0) - new Date(deadlineFor(second) || second.updatedAt || 0));
  const delayed = visible.filter((panel) => stageDaysLate(panel, today) > 0);
  const dueToday = visible.filter((panel) => sameDay(validDate(deadlineFor(panel)), today));
  const scheduled = visible.filter((panel) => validDate(deadlineFor(panel)));
  const onSchedule = Math.max(0, visible.length - delayed.length);
  const onSchedulePercent = visible.length ? Math.round((onSchedule / visible.length) * 100) : 0;

  return <div className="production-manager-dashboard manufacturing-supervisor-dashboard" dir="rtl">
    <header className="production-manager-header">
      <div><h1>لوحة التحكم — {copy.title}</h1><p>مرحبًا {name || "بك"}، تابع لوحات {copy.stage} وحدّث حالتها من مكان واحد</p></div>
      <div className="production-date-tools"><button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} />{loading ? "جاري التحديث..." : "تحديث"}</button></div>
    </header>

    <section className="production-manager-metrics manufacturing-supervisor-metrics">
      <SupervisorMetric icon={<HiOutlineViewGrid />} title={`اللوحات في مرحلة ${copy.shortStage}`} value={loading ? "—" : visible.length} note="نطاق العمل المتاح لك الآن" />
      <SupervisorMetric tone="amber" icon={<HiOutlineClock />} title="متابعة مطلوبة اليوم" value={loading ? "—" : dueToday.length} note="حسب بداية المرحلة الفعلية" />
      <SupervisorMetric tone="red" icon={<HiOutlineExclamationCircle />} title="لوحات متأخرة" value={loading ? "—" : delayed.length} note="تجاوزت الموعد ولم تكتمل" />
      <SupervisorMetric tone="green" icon={<HiOutlineCheckCircle />} title="داخل الموعد" value={loading ? "—" : `${onSchedulePercent}%`} note={`${onSchedule} من ${visible.length} لوحة`} />
    </section>

    <section className="production-manager-grid">
      <section className="production-manager-card production-waiting manufacturing-supervisor-queue">
        <h2>اللوحات التي تنتظر إجراءك</h2>
        {visible.slice(0, 5).map((panel) => <Link to={itemLink(panel)} key={panel._id}>
          <i><HiOutlineClock /></i>
          <span><strong><DashboardName>{itemName(panel)}</DashboardName></strong><small><bdi>{itemCode(panel)}</bdi> · {currentAction(panel, role) || `تحديث مرحلة ${copy.shortStage}`}</small></span>
          <b>فتح اللوحة</b>
        </Link>)}
        {!loading && !visible.length && <p className="production-empty">لا توجد لوحة في مرحلة {copy.shortStage} حاليًا</p>}
        <Link to={`/panels?statuses=${allowedStatuses.join(",")}`} className="production-card-link">عرض كل لوحات {copy.shortStage} <HiOutlineExternalLink /></Link>
      </section>

      <section className="production-manager-card production-delayed-list manufacturing-supervisor-deadlines">
        <h2>المواعيد الأقرب</h2>
        <div>{visible.slice(0, 5).map((panel) => {
          const deadline = validDate(deadlineFor(panel));
          const lateDays = stageDaysLate(panel, today);
          return <Link to={itemLink(panel)} key={panel._id}>
            <span><strong><DashboardName>{itemName(panel)}</DashboardName></strong><small><bdi>{itemCode(panel)}</bdi>{deadline ? ` · موعد المتابعة ${deadline.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}` : ""}</small></span>
            <b className={lateDays ? "is-late" : "is-on-time"}>{lateDays ? `متأخر ${lateDays} يوم` : "داخل الموعد"}</b>
          </Link>;
        })}</div>
        {!loading && !visible.length && <p className="production-empty">لا توجد مواعيد لعرضها</p>}
        <Link to="/projects?statuses=inProgress" className="production-card-link">عرض المشاريع قيد التنفيذ <HiOutlineExternalLink /></Link>
      </section>

      <section className="production-manager-card production-current-stages manufacturing-supervisor-summary">
        <h2>ملخص مرحلة {copy.shortStage}</h2>
        <div>
          <article style={{ "--stage-color": copy.color }}><HiOutlineViewGrid /><span>إجمالي المرحلة</span><strong>{loading ? "—" : visible.length}</strong><small>لوحة</small></article>
          <article style={{ "--stage-color": "#2aa969" }}><HiOutlineCheckCircle /><span>داخل الموعد</span><strong>{loading ? "—" : onSchedule}</strong><small>لوحة</small></article>
          <article style={{ "--stage-color": "#dda12e" }}><HiOutlineCalendar /><span>متابعتها اليوم</span><strong>{loading ? "—" : dueToday.length}</strong><small>لوحة</small></article>
        </div>
      </section>

      <section className="production-manager-card production-alerts manufacturing-supervisor-alerts">
        <h2>تنبيهات مرحلة {copy.shortStage}</h2>
        {delayed.length ? <p className="danger"><HiOutlineExclamation /><span><strong>{delayed.length} لوحة تحتاج متابعة عاجلة</strong><small>تجاوزت مهلة مرحلتها الحالية ولم تكتمل.</small></span></p> : <p className="info"><HiOutlineCheckCircle /><span><strong>لا توجد لوحات متأخرة حاليًا</strong><small>اللوحات الموجودة في المرحلة ما زالت داخل مواعيدها.</small></span></p>}
        {!delayed.length && scheduled.length > 0 && <p><HiOutlineCalendar /><span><strong>المواعيد المحسوبة متاحة لكل لوحة</strong><small>يُحسب الموعد من بداية المرحلة الفعلية ويتغير عند الانتقال للمرحلة التالية.</small></span></p>}
      </section>
    </section>
  </div>;
}

function ProductionSupervisorDashboard({ name, role, panels = [], loading, onRefresh }) {
  return <StageSupervisorDashboard name={name} role={role} panels={panels} loading={loading} onRefresh={onRefresh} />;
}

export default ProductionSupervisorDashboard;
