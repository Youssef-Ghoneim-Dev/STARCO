import { Link } from "react-router-dom";
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationCircle, HiOutlineRefresh } from "react-icons/hi";
import DashboardName from "./DashboardName";
import { itemCode, itemLink, itemName, statusLabel } from "../../utils/dashboardData";
import { ROLE_LABELS, SUPERVISOR_STAGE_BY_ROLE } from "../../utils/roles";

const ROLE_COPY = {
  LaserSupervisor: { title: "مشرف الليزر", stage: "مرحلة الليزر وتنزيل الملفات" },
  ManufacturingSupervisor: { title: "مشرف التصنيع", stage: "مرحلة التصنيع" },
  PaintingSupervisor: { title: "مشرف الرش", stage: "مرحلة الرش والدهان" },
  AssemblySupervisor: { title: "مشرف التجميع", stage: "مرحلة التجميع" },
};
const deadlineFor = (panel) => {
  const status = panel?.status === "manufacturingFilesReady" ? "pendingLaserDownload" : panel?.status;
  return panel?.deliverySchedule?.deadlines?.[status] || panel?.deliverySchedule?.approvedDate || null;
};

function ProductionSupervisorDashboard({ name, role, panels = [], loading, onRefresh }) {
  const allowedStatuses = SUPERVISOR_STAGE_BY_ROLE[role] || [];
  const visible = panels.filter((panel) => allowedStatuses.includes(panel.status));
  const delayed = visible.filter((panel) => (panel.manufacturing?.productionStages || []).some((stage) => stage.status === "active" && stage.delayedAt));
  const copy = ROLE_COPY[role] || { title: ROLE_LABELS[role], stage: "مرحلة الإنتاج" };

  return <div className="production-supervisor-dashboard" dir="rtl">
    <header>
      <div><h1>لوحة التحكم — {copy.title}</h1><p>مرحبًا {name || "بك"}، تظهر هنا اللوحات الخاصة بـ{copy.stage} فقط.</p></div>
      <button type="button" onClick={onRefresh} disabled={loading}><HiOutlineRefresh className={loading ? "dashboard-refresh-spinning" : ""} /> {loading ? "جاري التحديث..." : "تحديث"}</button>
    </header>
    <section className="production-supervisor-metrics">
      <article><HiOutlineClock /><span>تنتظر إجراءك</span><strong>{loading ? "—" : visible.length}</strong></article>
      <article><HiOutlineExclamationCircle /><span>بها مشكلة مسجلة</span><strong>{loading ? "—" : delayed.length}</strong></article>
      <article><HiOutlineCheckCircle /><span>نطاق الصلاحية</span><strong>{copy.stage}</strong></article>
    </section>
    <section className="production-supervisor-tasks">
      <h2>اللوحات في مرحلتك الآن</h2>
      {visible.map((panel) => <Link to={itemLink(panel)} key={panel._id}>
        <span><DashboardName>{itemName(panel)}</DashboardName><small>{itemCode(panel)} · {statusLabel(panel)}</small><small>{deadlineFor(panel) ? `الموعد: ${new Date(deadlineFor(panel)).toLocaleDateString("ar-EG")}` : "الموعد غير محدد"}</small></span>
        <b>فتح المرحلة</b>
      </Link>)}
      {!loading && !visible.length && <p>لا توجد لوحة في مرحلتك حاليًا.</p>}
    </section>
  </div>;
}

export default ProductionSupervisorDashboard;
