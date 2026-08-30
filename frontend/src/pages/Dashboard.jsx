import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatCard from "../components/dashboard/StatCard";
import RecentProjects from "../components/dashboard/RecentProjects";
import QuickActions from "../components/dashboard/QuickActions";
import OwnerManagerDashboard from "../components/dashboard/OwnerManagerDashboard";
import EngineerDashboard from "../components/dashboard/EngineerDashboard";
import MarketingManagerDashboard from "../components/dashboard/MarketingManagerDashboard";
import ProductionManagerDashboard from "../components/dashboard/ProductionManagerDashboard";
import MarketerDashboard from "../components/dashboard/MarketerDashboard";
import { useAuth } from "../context/AuthContext";
import { getAllPanels, getProjects } from "../services/projectsAPI";
import { getAllClients } from "../services/clientsAPI";
import toast from "react-hot-toast";
import { FaWhatsapp } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import "../styles/dashboardHome.css";

function Dashboard() {
  const { loading, accountStatus, user, reloadProfile, refreshing } = useAuth();
  const [projects, setProjects] = useState([]);
  const [panels, setPanels] = useState([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const canManageClients = ["OwnerManager", "Engineer", "Marketer", "MarketingManager", "ProductionManager"].includes(user?.role);

  const loadDashboard = useCallback(() => {
    if (loading || !user || accountStatus === "pending" || accountStatus === "whatsappPending" || accountStatus === "deleted") {
      setDashboardLoading(false);
      return;
    }
    setDashboardLoading(true);
    const requests = [getProjects(), getAllPanels(), canManageClients ? getAllClients() : Promise.resolve(null)];
    return Promise.all(requests).then(([projectsResponse, panelsResponse, clientsResponse]) => {
      setProjects(Array.isArray(projectsResponse.data) ? projectsResponse.data : []);
      setPanels(Array.isArray(panelsResponse.data) ? panelsResponse.data : []);
      setClientsCount(clientsResponse?.data?.clients?.length || 0);
    }).catch((error) => toast.error(error?.response?.data?.message || "تعذر تحميل ملخص لوحة التحكم.")).finally(() => setDashboardLoading(false));
  }, [loading, user, canManageClients, accountStatus]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const today = new Date();
    const isToday = (value) => value && new Date(value).toDateString() === today.toDateString();
    return {
      pending: projects.filter((project) => project.status === "pending").length,
      inProgress: projects.filter((project) => project.status === "inProgress").length,
      today: projects.filter((project) => isToday(project.createdAt)).length,
      pendingProjects: projects.filter((project) => project.status === "pending").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
    };
  }, [projects]);

  if (loading) {
    return (
    <DashboardLayout notAllowed pending>
        <div className="pending-message">
          <h2>جاري التحقق من حسابك...</h2>
          <p>يرجى الانتظار أثناء التحقق من حالة الحساب.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (accountStatus === "pending" || accountStatus === "deleted") {
    return (
      <DashboardLayout notAllowed pending={accountStatus === "pending"}>
        <div className="pending-message" dir="rtl">
          <h2>{accountStatus === "pending" ? "حسابك بانتظار موافقة المدير" : "حالة الحساب تحتاج إلى مراجعة"}</h2>
          {accountStatus === "pending" && (
            <p>سيتم إشعارك بمجرد اعتماد الحساب.</p>
          )}
          {accountStatus === "deleted" && (
            <p>
              إذا كان هذا بالخطأ، تواصل مع الإدارة لاستعادة الحساب.
            </p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (accountStatus === "whatsappPending") {
    return (
      <DashboardLayout notAllowed pending>
        <div className="whatsapp-activation" dir="rtl">
          <div className="whatsapp-activation-icon"><FaWhatsapp /></div>
          <h2>فعّل حسابك برسالة WhatsApp</h2>
          <p>
            أرسل أي رسالة من نفس الرقم المسجل في حسابك، وبعد وصولها سيتأكد النظام من الرقم ويفعّل دخولك تلقائيًا.
          </p>
          <div className="whatsapp-activation-number">
            <span>الرقم المسجل</span>
            <strong dir="ltr">+{user?.phoneNumber}</strong>
          </div>
          {user?.whatsappActivationUrl ? (
            <a className="whatsapp-activation-button" href={user.whatsappActivationUrl} target="_blank" rel="noreferrer">
              <FaWhatsapp /> فتح WhatsApp وإرسال الرسالة
            </a>
          ) : (
            <p className="whatsapp-activation-error">رقم WhatsApp الخاص بالشركة غير مضبوط حاليًا. تواصل مع الإدارة.</p>
          )}
          <button
            type="button"
            className="whatsapp-activation-refresh"
            onClick={() => reloadProfile({ background: true })}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? "dashboard-refresh-spinning" : ""} />
            {refreshing ? "جاري التحقق..." : "أرسلت الرسالة، تحقّق الآن"}
          </button>
          <small>يتم التحقق تلقائيًا أيضًا خلال ثوانٍ قليلة.</small>
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role === "OwnerManager") {
    return <DashboardLayout notAllowed><OwnerManagerDashboard name={user?.name} projects={projects} panels={panels} clientsCount={clientsCount} loading={dashboardLoading} onRefresh={loadDashboard} /></DashboardLayout>;
  }

  if (user?.role === "Engineer") {
    return <DashboardLayout notAllowed><EngineerDashboard name={user?.name} projects={projects} panels={panels} loading={dashboardLoading} onRefresh={loadDashboard} /></DashboardLayout>;
  }

  if (user?.role === "MarketingManager") {
    return <DashboardLayout notAllowed><MarketingManagerDashboard name={user?.name} projects={projects} panels={panels} loading={dashboardLoading} onRefresh={loadDashboard} /></DashboardLayout>;
  }

  if (user?.role === "ProductionManager") {
    return <DashboardLayout notAllowed><ProductionManagerDashboard name={user?.name} projects={projects} panels={panels} loading={dashboardLoading} onRefresh={loadDashboard} /></DashboardLayout>;
  }

  if (user?.role === "Marketer") {
    return <DashboardLayout notAllowed><MarketerDashboard name={user?.name} projects={projects} panels={panels} loading={dashboardLoading} onRefresh={loadDashboard} /></DashboardLayout>;
  }

  return (
    <DashboardLayout notAllowed>
      <DashboardHeader name={user?.name} />

      <section className="stats-grid">
        <StatCard title="مشاريع معلّقة" value={dashboardLoading ? "—" : summary.pending} />
        <StatCard title="قيد العمل" value={dashboardLoading ? "—" : summary.inProgress} />
        <StatCard title="طلبات اليوم" value={dashboardLoading ? "—" : summary.today} />
        <StatCard title="العملاء" value={canManageClients ? (dashboardLoading ? "—" : clientsCount) : "—"} />
      </section>

      <section className="dashboard-grid">
        <RecentProjects projects={summary.pendingProjects} loading={dashboardLoading} />

        <QuickActions canManageClients={canManageClients} />
      </section>
    </DashboardLayout>
  );
}

export default Dashboard;
