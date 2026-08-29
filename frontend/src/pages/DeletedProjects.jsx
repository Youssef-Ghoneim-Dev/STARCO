import { useEffect, useState } from "react";
import { HiOutlineRefresh, HiOutlineTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import DeletedUsersList from "../components/users/DeletedUsersList";
import { useAuth } from "../context/AuthContext";
import { getDeletedProjects, permanentlyDeleteProject, restoreProject } from "../services/projectsAPI";
import "../styles/management.css";

function DeletedProjects() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [confirmationProject, setConfirmationProject] = useState(null);

  useEffect(() => {
    getDeletedProjects()
      .then(({ data }) => setProjects(data))
      .catch((error) => toast.error(error?.response?.data?.message || "تعذر تحميل سلة المحذوفات."))
      .finally(() => setLoading(false));
  }, []);

  const restore = async (project) => {
    setRestoringId(project._id);
    try {
      await restoreProject(project._id);
      setProjects((current) => current.filter((item) => item._id !== project._id));
      toast.success("تمت استعادة المشروع.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذرت استعادة المشروع.");
    } finally {
      setRestoringId("");
    }
  };

  const deleteForever = async () => {
    if (!confirmationProject) return;
    const projectId = confirmationProject._id;
    setDeletingId(projectId);
    // Close the confirmation immediately. The affected row keeps showing its
    // own progress state, so the user is never trapped behind a blocking modal.
    setConfirmationProject(null);
    try {
      await permanentlyDeleteProject(projectId);
      setProjects((current) => current.filter((item) => item._id !== projectId));
      toast.success("تم حذف المشروع نهائيًا.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حذف المشروع نهائيًا.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <DashboardLayout notAllowed>
      <section className="management-page" dir="rtl">
        <div className="management-heading">
          <div>
            <h1>سلة المحذوفات</h1>
            <p>{activeTab === "projects" ? "المشاريع المحذوفة مؤقتًا ويمكن استعادتها." : "المستخدمون المحذوفون ويمكن استعادتها أو حذفها نهائيًا."}</p>
          </div>
        </div>

        {user?.role === "OwnerManager" && <div className="recycle-bin-tabs"><button type="button" className={activeTab === "projects" ? "active" : ""} onClick={() => setActiveTab("projects")}>المشاريع</button><button type="button" className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>المستخدمون</button></div>}

        {activeTab === "users" ? <DeletedUsersList /> : loading ? <p className="management-empty">جاري التحميل...</p> : projects.length === 0 ? (
          <p className="management-empty">لا توجد مشاريع محذوفة.</p>
        ) : (
          <div className="management-list">
            {projects.map((project) => (
              <article className="management-row" key={project._id}>
                <div>
                  <h2>{project.client?.name || "عميل غير محدد"}</h2>
                  <p>عدد اللوحات: {(project.panels || []).length} · الحالة السابقة: {project.status}</p>
                </div>
                <div className="recycle-bin-actions">
                  <button type="button" onClick={() => restore(project)} disabled={restoringId === project._id || deletingId === project._id}><HiOutlineRefresh />{restoringId === project._id ? "جاري الاستعادة..." : "استعادة"}</button>
                  <button type="button" className="permanent-delete-btn" onClick={() => setConfirmationProject(project)} disabled={restoringId === project._id || deletingId === project._id}><HiOutlineTrash />{deletingId === project._id ? "جاري الحذف..." : "حذف نهائي"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
        {confirmationProject && <div className="management-modal-backdrop" role="dialog" aria-modal="true">
          <div className="management-modal delete-project-confirmation">
            <div className="management-modal-heading"><h2>حذف نهائي</h2></div>
            <p>سيتم حذف مشروع <strong>{confirmationProject.client?.name || "هذا العميل"}</strong> وجميع مرفقاته نهائيًا، ولا يمكن استعادته بعد ذلك.</p>
            <div className="management-confirmation-actions"><button type="button" className="management-cancel-btn" onClick={() => setConfirmationProject(null)} disabled={Boolean(deletingId)}>إلغاء</button><button type="button" className="permanent-delete-btn" onClick={deleteForever} disabled={Boolean(deletingId)}>حذف نهائيًا</button></div>
          </div>
        </div>}
      </section>
    </DashboardLayout>
  );
}

export default DeletedProjects;
