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
import ExecutionPdfWorkspace from "../components/projects/projectEditor/ExecutionPdfWorkspace";
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
    <div className="project-read-only-fieldset">
      <PanelEditor readOnly={readOnly} />
      <fieldset className="project-read-only-fieldset" disabled={readOnly}>
      <SaveActions />
      </fieldset>
    </div>
  </>;
}

function StartEditingPanel({ isMarketer }) {
  const { beginEditing, savingProject } = useProject();
  const [starting, setStarting] = useState(false);
  const startEditing = async () => {
    setStarting(true);
    const result = await beginEditing();
    setStarting(false);
    if (!result.success) toast.error(result.message || "تعذر تحويل المشروع إلى وضع التعديل.");
  };
  return <section className="start-editing-panel" dir="rtl">
    <h2>{isMarketer ? "هل تريد تعديل بيانات المشروع؟" : "تعديل مشروع مكتمل"}</h2>
    <p>{isMarketer ? "المشروع ظاهر لك الآن للعرض فقط. ابدأ التعديل عندما تكون مستعدًا، وسيُحجز لك وحدك حتى ترسله للمهندس." : "المشروع ظاهر لك الآن للعرض فقط. ابدأ التعديل عندما تكون مستعدًا، وسيُحجز لك وحدك أثناء العمل."}</p>
    <button type="button" className="start-editing-btn" disabled={starting || savingProject} onClick={startEditing}>{starting ? "جاري التحويل..." : "التحويل إلى وضع Editing"}</button>
  </section>;
}

function ProjectWorkspace({ readOnly, isMarketer }) {
  const { project } = useProject();
  const [tab, setTab] = useState("project-data");
  const isWhatsappProject = ["whatsapp", "marketing"].includes(project?.source);
  const isCompleted = project?.status === "completed";
  const isQuoteCompleted = project?.status === "quoteCompleted";
  const isExecutionPhase = ["executionPdfRequested", "executionPdfReady", "executionOrdered"].includes(project?.status);
  const marketerCanEdit = ["marketingDraft", "editingByMarketing"].includes(project?.status);
  const technicalCanEdit = ["inProgress", "editing", "editingByEngineer", "editingByOwner"].includes(project?.status);
  const editorReadOnly = readOnly || !technicalCanEdit;
  const readOnlyMessage = !readOnly && (isQuoteCompleted || isExecutionPhase || isCompleted)
    ? isCompleted ? "هذا المشروع مكتمل نهائيًا وهو متاح للعرض فقط." : "عرض السعر مكتمل ومحفوظ. يمكنك الرجوع إليه دون تعديل أثناء مرحلة التنفيذ."
    : readOnly
      ? "هذا المشروع للعرض فقط. التعديل والتسعير متاحان للمهندس وOwner Manager فقط."
      : "";

  if (isMarketer) {
    if (marketerCanEdit) return <MarketingProjectEditor />;
    const message = isQuoteCompleted
      ? "عرض السعر مكتمل. يمكنك إصدار أمر PDF تنفيذ للوحة المطلوبة، أو تحويل عرض السعر إلى وضع التعديل."
      : isExecutionPhase
        ? "المشروع دخل مرحلة التنفيذ. تابع حالة PDF التنفيذ من البطاقة التالية."
      : isCompleted
      ? "هذا المشروع مكتمل نهائيًا."
      : "هذا المشروع أُرسل للمهندس أو يعمل عليه حاليًا، لذلك بياناته للعرض فقط.";
    return <>
      {isQuoteCompleted && <StartEditingPanel isMarketer />}
      <div className="project-read-only-notice" dir="rtl">{message}</div>
      {(isQuoteCompleted || isExecutionPhase || isCompleted) && <ExecutionPdfWorkspace />}
      <fieldset className="project-read-only-fieldset" disabled><MarketingProjectEditor /></fieldset>
    </>;
  }
  if (isQuoteCompleted || isExecutionPhase || isCompleted) return <>
    {isQuoteCompleted && !readOnly && <StartEditingPanel />}
    <ExecutionPdfWorkspace />
    <details className="quote-reference-details">
      <summary>عرض بيانات التسعير المحفوظة</summary>
      {isWhatsappProject && <><PanelsTabs readOnly /><WhatsappProjectData /></>}
      <QuoteEditor readOnly readOnlyMessage={readOnlyMessage} />
    </details>
  </>;
  if (!isWhatsappProject) return <>
    <QuoteEditor readOnly={editorReadOnly} readOnlyMessage={readOnlyMessage} />
  </>;
  return <>
    <div className="whatsapp-project-tabs" dir="rtl">
      <button className={tab === "project-data" ? "active" : ""} onClick={() => setTab("project-data")}>بيانات المشروع</button>
      <button className={tab === "quote" ? "active" : ""} onClick={() => setTab("quote")}>عرض السعر</button>
    </div>
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
