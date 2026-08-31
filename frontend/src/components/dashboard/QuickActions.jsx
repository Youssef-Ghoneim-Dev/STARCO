import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function QuickActions({ canManageClients }) {
  const { user } = useAuth();
  const canCreateProject = ["OwnerManager", "Marketer"].includes(user?.role);

  return (
    <section className="dashboard-card">
      <h2>إجراءات سريعة</h2>
      {canCreateProject && <Link className="action-btn" to="/new-project">+ مشروع جديد</Link>}
      {canManageClients && <Link className="action-btn secondary-action-btn" to="/clients">إدارة العملاء</Link>}
    </section>
  );
}

export default QuickActions;
