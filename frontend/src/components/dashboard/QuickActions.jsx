import { Link } from "react-router-dom";

function QuickActions({ canManageClients }) {
  return (
    <section className="dashboard-card">
      <h2>إجراءات سريعة</h2>
      <Link className="action-btn" to="/new-project">+ مشروع جديد</Link>
      {canManageClients && <Link className="action-btn secondary-action-btn" to="/clients">إدارة العملاء</Link>}
    </section>
  );
}

export default QuickActions;
