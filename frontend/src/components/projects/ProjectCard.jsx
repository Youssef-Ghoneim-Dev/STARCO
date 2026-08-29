import {
  HiOutlineTrash,
  HiOutlineCalendar,
  HiOutlineClock,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { getPanelNameDirection } from "../../utils/panelNameDirection";

import { deleteProject } from "../../services/projectsAPI";
import projectImage from "../../assets/images/1.svg";

const formatProjectDate = (dateValue) => {
  const date = new Date(dateValue);
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  const days = Math.floor(hours / 24);

  if (hours < 1) return "منذ أقل من ساعة";
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days <= 7) return `منذ ${days} يوم`;

  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
};

const statusDetails = {
  draft: { label: "مسودة", className: "editing" },
  created: { label: "جديد للتسعير", className: "pending" },
  marketingDraft: { label: "مسودة المندوب", className: "editing" },
  editingByMarketing: { label: "يعدله المندوب", className: "editing" },
  editingByEngineer: { label: "يعدله المهندس", className: "in-progress" },
  editingByOwner: { label: "يعدله المدير", className: "in-progress" },
  editing: { label: "قيد التعديل", className: "editing" },
  inProgress: { label: "قيد العمل", className: "in-progress" },
  pending: { label: "قيد الانتظار", className: "pending" },
  quoteCompleted: { label: "عرض سعر مكتمل", className: "completed" },
  executionPdfRequested: { label: "مطلوب PDF تنفيذ", className: "pending" },
  executionPdfReady: { label: "PDF التنفيذ جاهز", className: "in-progress" },
  manufacturingFilesPending: { label: "بانتظار ملفات التصنيع", className: "pending" },
  manufacturingFilesReady: { label: "ملفات التصنيع جاهزة", className: "in-progress" },
  laserFilesDownloaded: { label: "تم التنزيل إلى الليزر", className: "in-progress" },
  executionOrdered: { label: "أمر تنفيذ", className: "in-progress" },
  completed: { label: "مكتمل نهائيًا", className: "completed" },
};

function ProjectCard({ project, setProjects, deletingProjectId, setDeletingProjectId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const firstPanelName = project.panels?.[0]?.panelName?.trim();
  const clientPrefix = project.client?.type === "company" ? "السادة" : "السيد";
  const projectStatus = statusDetails[project.status] || statusDetails.pending;
  const projectNotification = notifications.find((notification) =>
    !notification.readAt && String(notification.projectId) === String(project._id)
  );
  const attentionLabel = projectNotification?.title || "";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleting = deletingProjectId === project._id;
  const deletionBusy = Boolean(deletingProjectId);
  const handleOpen = () => {
    navigate(`/projects/${project._id}`);
  };

  const handleDelete = async () => {
    if (deletionBusy) return;
    setConfirmDelete(false);
    setDeletingProjectId(project._id);
    try {
      await deleteProject(project._id);
      toast.success("تم نقل المشروع إلى سلة المحذوفات.");
      setProjects((prev) => prev.filter((item) => item._id !== project._id));
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر حذف المشروع.");
    } finally {
      setDeletingProjectId("");
    }
  };
  return (
    <div className={`project-card${deleting ? " is-deleting" : ""}`} onClick={deletionBusy ? undefined : handleOpen}>
      <div className="project-image">
        <img src={projectImage} alt="Project" />

        <div className="project-client-badge" dir="auto">
          {clientPrefix} / {project.client?.name}
        </div>

        {(user?.role === "OwnerManager" || (user?.role === "Marketer" && project.status === "draft")) && <button type="button" className="delete-project-btn" aria-label="حذف المشروع" disabled={deletionBusy} onClick={(event) => { event.stopPropagation(); setConfirmDelete(true); }}>
          <HiOutlineTrash />
        </button>}
      </div>

      <div className="project-body">
        <div className="project-title-row">
          <h3 dir="auto">
            {project.client?.name}
            {firstPanelName ? <> (<bdi dir={getPanelNameDirection(firstPanelName)}>{firstPanelName}</bdi>)</> : ""}
          </h3>
          <span className={`project-status-badge ${projectStatus.className}`}>
            {projectStatus.label}
          </span>
        </div>

        {attentionLabel && (
          <div className="project-attention-badge" role="status">
            <span aria-hidden="true" />
            {attentionLabel}
          </div>
        )}

        <div className="project-date">
          <HiOutlineCalendar />

          <span>
            أُنشئ: {formatProjectDate(project.createdAt)}
          </span>
        </div>

        <div className="project-date">
          <HiOutlineClock />

          <span>
            آخر تعديل: {formatProjectDate(project.updatedAt)}
          </span>
        </div>
      </div>
      {deleting && <div className="project-card-delete-progress" role="status">جاري نقل المشروع إلى سلة المحذوفات...</div>}
      {confirmDelete && createPortal(<div className="project-delete-modal-backdrop" dir="rtl" role="dialog" aria-modal="true" aria-labelledby={`delete-project-${project._id}`} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setConfirmDelete(false); }}>
        <div className="project-delete-dialog" dir="rtl" onClick={(event) => event.stopPropagation()}>
          <h2 id={`delete-project-${project._id}`}>حذف المشروع؟</h2>
          <p>سيُنقل مشروع <strong>{project.client?.name || "هذا العميل"}</strong> إلى سلة المحذوفات، ويمكن استعادته لاحقًا.</p>
          <div><button type="button" onClick={() => setConfirmDelete(false)}>إلغاء</button><button type="button" className="danger" onClick={handleDelete}>نقل إلى السلة</button></div>
        </div>
      </div>, document.body)}
    </div>
  );
}

export default ProjectCard;
