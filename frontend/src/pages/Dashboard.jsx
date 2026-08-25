import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatCard from "../components/dashboard/StatCard";
import RecentProjects from "../components/dashboard/RecentProjects";
import QuickActions from "../components/dashboard/QuickActions";
import OwnerManagerDashboard from "../components/dashboard/OwnerManagerDashboard";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../services/projectsAPI";
import { getAllClients } from "../services/clientsAPI";
import toast from "react-hot-toast";
import "../styles/dashboardHome.css";

function Dashboard() {
  const { loading, accountStatus, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const canManageClients = ["OwnerManager", "Engineer"].includes(user?.role);

  const loadDashboard = useCallback(() => {
    if (loading || !user || accountStatus === "pending" || accountStatus === "deleted") {
      setDashboardLoading(false);
      return;
    }
    setDashboardLoading(true);
    const requests = [getProjects()];
    if (canManageClients) requests.push(getAllClients());
    return Promise.all(requests).then(([projectsResponse, clientsResponse]) => {
      setProjects(Array.isArray(projectsResponse.data) ? projectsResponse.data : []);
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

  if (user?.role === "OwnerManager") {
    return <DashboardLayout notAllowed><OwnerManagerDashboard name={user?.name} projects={projects} clientsCount={clientsCount} loading={dashboardLoading} onRefresh={loadDashboard} /></DashboardLayout>;
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
