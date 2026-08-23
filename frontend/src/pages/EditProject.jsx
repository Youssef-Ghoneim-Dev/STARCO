import { useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProjectInfo from "../components/projects/projectEditor/ProjectInfo";
import ProjectPrices from "../components/projects/projectEditor/ProjectPrices";
import PanelsTabs from "../components/projects/projectEditor/PanelsTabs";
import PanelEditor from "../components/projects/projectEditor/PanelEditor";
import SaveActions from "../components/projects/projectEditor/SaveActions";
import { ProjectProvider, useProject } from "../context/ProjectContext";
import WhatsappProjectData from "../components/projects/projectEditor/WhatsappProjectData";
import MarketingProjectEditor from "../components/projects/projectEditor/MarketingProjectEditor";
import { useAuth } from "../context/AuthContext";
import "../styles/ProjectEditor.css";

function QuoteEditor({ readOnly = false, readOnlyMessage = "" }) {
  return <>
    {readOnlyMessage && <div className="project-read-only-notice" dir="rtl">{readOnlyMessage}</div>}
    <fieldset className="project-read-only-fieldset" disabled={readOnly}>
      <ProjectInfo />
      <ProjectPrices />
    </fieldset>
    <PanelsTabs readOnly={readOnly} />
    <fieldset className="project-read-only-fieldset" disabled={readOnly}>
      <PanelEditor />
      <SaveActions />
    </fieldset>
  </>;
}

function StartEditingPanel({ isMarketer }) {
  const { beginEditing, savingProject } = useProject();
  const [starting, setStarting] = useState(false);
  const startEditing = async () => {
    setStarting(true);
    const result = await beginEditing();
    setStarting(false);
    if (result.success) toast.success(result.notification || "تم تحويل المشروع إلى وضع التعديل.");
    else toast.error(result.message || "تعذر تحويل المشروع إلى وضع التعديل.");
  };
  return <section className="start-editing-panel" dir="rtl">
    <h2>{isMarketer ? "هل تريد تعديل بيانات المشروع؟" : "هذا المشروع مكتمل"}</h2>
    <p>{isMarketer ? "اضغط للبدء في تعديل البيانات والمرفقات. سيتم إشعار المهندس المسؤول بالمشروع." : "حوّل المشروع إلى وضع التعديل لتعديل التسعير أو بيانات اللوحات. سيتم إشعار المندوب."}</p>
    <button type="button" className="start-editing-btn" disabled={starting || savingProject} onClick={startEditing}>{starting ? "جاري التحويل..." : "التحويل إلى وضع Editing"}</button>
  </section>;
}

function ProjectWorkspace({ readOnly, isMarketer }) {
  const { project } = useProject();
  const [tab, setTab] = useState("project-data");
  const isWhatsappProject = ["whatsapp", "marketing"].includes(project?.source);
  const isCompleted = project?.status === "completed";
  const editorReadOnly = readOnly || isCompleted;

  const readOnlyMessage = !readOnly && isCompleted
    ? "هذا المشروع مكتمل، لذلك هو للعرض فقط ولا يمكن تعديل تسعيره أو ملف PDF الخاص به."
    : readOnly
      ? "هذا المشروع للعرض فقط. التعديل والتسعير متاحان للمهندس وOwner Manager فقط."
      : "";

  if (isMarketer) {
    if (isCompleted) return <StartEditingPanel isMarketer />;
    return <MarketingProjectEditor />;
  }
  if (isCompleted && !readOnly) return <StartEditingPanel />;
  if (!isWhatsappProject) return <QuoteEditor readOnly={editorReadOnly} readOnlyMessage={readOnlyMessage} />;
  return <>
    <div className="whatsapp-project-tabs" dir="rtl">
      <button className={tab === "project-data" ? "active" : ""} onClick={() => setTab("project-data")}>بيانات المشروع</button>
      <button className={tab === "quote" ? "active" : ""} onClick={() => setTab("quote")}>عرض السعر</button>
    </div>
    {isCompleted && <div className="project-read-only-notice" dir="rtl">هذا المشروع مكتمل، لذلك هو للعرض فقط ولا يمكن تعديل تسعيره أو ملف PDF الخاص به.</div>}
    {tab === "project-data" ? <><PanelsTabs readOnly /><WhatsappProjectData /></> : <QuoteEditor readOnly={editorReadOnly} readOnlyMessage={readOnly ? readOnlyMessage : ""} />}
  </>;
}

function EditProject() {
  const { id } = useParams();
  const { user } = useAuth();
  const isMarketer = user?.role === "Marketer";
  const readOnly = !["OwnerManager", "Engineer", "Marketer"].includes(user?.role);

  return (
    <ProjectProvider projectId={id} readOnly={readOnly}>
      <DashboardLayout notAllowed={false}>
        <div className="project-editor-page">
          <ProjectWorkspace readOnly={readOnly} isMarketer={isMarketer} />
        </div>
      </DashboardLayout>
    </ProjectProvider>
  );
}

export default EditProject;
