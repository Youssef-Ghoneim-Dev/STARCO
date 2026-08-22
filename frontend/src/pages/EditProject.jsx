import { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProjectInfo from "../components/projects/projectEditor/ProjectInfo";
import ProjectPrices from "../components/projects/projectEditor/ProjectPrices";
import PanelsTabs from "../components/projects/projectEditor/PanelsTabs";
import PanelEditor from "../components/projects/projectEditor/PanelEditor";
import SaveActions from "../components/projects/projectEditor/SaveActions";
import { ProjectProvider, useProject } from "../context/ProjectContext";
import WhatsappProjectData from "../components/projects/projectEditor/WhatsappProjectData";
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

function ProjectWorkspace({ readOnly }) {
  const { project } = useProject();
  const [tab, setTab] = useState("project-data");
  const isWhatsappProject = project?.source === "whatsapp";
  const isCompleted = project?.status === "completed";
  const editorReadOnly = readOnly || isCompleted;

  const readOnlyMessage = !readOnly && isCompleted
    ? "هذا المشروع مكتمل، لذلك هو للعرض فقط ولا يمكن تعديل تسعيره أو ملف PDF الخاص به."
    : readOnly
      ? "هذا المشروع للعرض فقط. التعديل والتسعير متاحان للمهندس وOwner Manager فقط."
      : "";

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
  const readOnly = !["OwnerManager", "Engineer"].includes(user?.role);

  return (
    <ProjectProvider projectId={id} readOnly={readOnly}>
      <DashboardLayout notAllowed={false}>
        <div className="project-editor-page">
          <ProjectWorkspace readOnly={readOnly} />
        </div>
      </DashboardLayout>
    </ProjectProvider>
  );
}

export default EditProject;
