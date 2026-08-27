import {
  HiOutlineTrash,
  HiOutlineCalendar,
  HiOutlineClock,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
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

function ProjectCard({ project, setProjects }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstPanelName = project.panels?.[0]?.panelName?.trim();
  const clientPrefix = project.client?.type === "company" ? "السادة" : "السيد";
  const projectStatus = statusDetails[project.status] || statusDetails.pending;
  const handleOpen = () => {
    navigate(`/projects/${project._id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();

    try {
      await deleteProject(project._id);

      toast.success("Project deleted successfully");
      setProjects((prev) => prev.filter((item) => item._id !== project._id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };
  return (
    <div className="project-card" onClick={handleOpen}>
      <div className="project-image">
        <img src={projectImage} alt="Project" />

        <div className="project-client-badge" dir="auto">
          {clientPrefix} / {project.client?.name}
        </div>

        {(user?.role === "OwnerManager" || (user?.role === "Marketer" && project.status === "draft")) && <button className="delete-project-btn" onClick={handleDelete}>
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
    </div>
  );
}

export default ProjectCard;
