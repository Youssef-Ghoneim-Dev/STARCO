import { Link } from "react-router-dom";

function RecentProjects({ projects = [], loading }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-heading"><div><h2>مشاريع بانتظار العمل</h2><p>أحدث الطلبات التي تحتاج متابعة.</p></div><Link to="/projects">كل المشاريع</Link></div>
      {loading ? <div className="empty-state">جاري تحميل المشاريع...</div> : projects.length === 0 ? <div className="empty-state">لا توجد مشاريع معلّقة الآن.</div> : <div className="dashboard-project-list">{projects.map((project) => <Link className="dashboard-project-row" to={`/projects/${project._id}`} key={project._id}><div><strong>{project.client?.name || "عميل غير محدد"}</strong><span>{(project.panels || []).length} لوحة</span></div><time>{new Date(project.createdAt).toLocaleDateString("ar-EG")}</time></Link>)}</div>}
    </section>
  );
}

export default RecentProjects;
