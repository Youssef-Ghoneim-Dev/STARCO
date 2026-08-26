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

const formatExactDate = (value) => value ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "medium" }).format(new Date(value)) : "غير محدد";

function ProjectAuditSummary({ showMarketer = false, showEngineer = false }) {
  const { project } = useProject();
  return <section className="project-audit-summary" dir="rtl">
    {showMarketer && <div><span>المندوب المسؤول</span><strong>{project?.marketingRepresentative?.name || "غير محدد"}</strong></div>}
    {showEngineer && <div><span>المهندس المسؤول عن عرض السعر</span><strong>{project?.assignedEngineer?.name || "غير محدد"}</strong></div>}
    <div><span>تاريخ إنشاء المشروع</span><strong>{formatExactDate(project?.createdAt)}</strong></div>
    <div><span>آخر تحديث</span><strong>{formatExactDate(project?.updatedAt)}</strong></div>
  </section>;
}

function ProjectPreviewLink() {
  const { project } = useProject();
  const link = project?.clientPreviewToken ? `${window.location.origin}/p/${project.clientPreviewToken}` : "";
  if (!link) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); }
    catch { return toast.error("تعذر نسخ الرابط."); }
  };
  return <section className="project-preview-link-card" dir="rtl"><div><span>رابط معاينة عرض السعر</span><a href={link} target="_blank" rel="noreferrer">{link}</a></div><button type="button" onClick={copy}>نسخ الرابط</button></section>;
}

function ProjectWorkspace({ readOnly, isMarketer }) {
  const { user } = useAuth();
  const { project } = useProject();
  const [tab, setTab] = useState("project-data");
  const isWhatsappProject = ["whatsapp", "marketing"].includes(project?.source);
  const isCompleted = project?.status === "completed";
  const isQuoteCompleted = project?.status === "quoteCompleted";
  const isExecutionPhase = ["executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded"].includes(project?.status);
  const marketerCanEdit = ["marketingDraft", "editingByMarketing"].includes(project?.status);
  const technicalCanEdit = ["inProgress", "editing", "editingByEngineer", "editingByOwner"].includes(project?.status);
  const claimedByAnotherEngineer = user?.role === "Engineer" && project?.readOnlyForCurrentUser;
  const editorReadOnly = readOnly || claimedByAnotherEngineer || !technicalCanEdit;
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
      {isQuoteCompleted && <ProjectAuditSummary />}
      {isQuoteCompleted && <ProjectPreviewLink />}
      {(isQuoteCompleted || isExecutionPhase || isCompleted) && <ExecutionPdfWorkspace />}
      <fieldset className="project-read-only-fieldset" disabled><MarketingProjectEditor /></fieldset>
    </>;
  }
  if (isQuoteCompleted) {
    if (["ProductionManager", "MarketingManager"].includes(user?.role)) return <>
      <div className="project-read-only-notice" dir="rtl">{user.role === "ProductionManager" ? "لا يمكنك التعديل على هذا المشروع لأنه لم يصل إلى مرحلة التنفيذ بعد. بيانات طلب المندوب متاحة للعرض فقط." : "بيانات طلب المندوب متاحة للعرض فقط."}</div>
      <ProjectAuditSummary showEngineer={user.role === "ProductionManager"} showMarketer={user.role === "MarketingManager"} />
      <ProjectPreviewLink />
      <PanelsTabs readOnly />
      <WhatsappProjectData />
    </>;
    return <>
      {!claimedByAnotherEngineer && <StartEditingPanel />}
      {claimedByAnotherEngineer && <div className="project-read-only-notice" dir="rtl">هذا المشروع يعمل عليه {project.workingEngineerName || project.assignedEngineer?.name || "مهندس آخر"}، لذلك يظهر لك للمعاينة فقط.</div>}
      <ProjectAuditSummary showMarketer={user?.role === "OwnerManager"} showEngineer={user?.role === "OwnerManager"} />
      <ProjectPreviewLink />
      {(user?.role === "OwnerManager" || (user?.role === "Engineer" && project?.source === "manual")) && <ExecutionPdfWorkspace />}
      <div className="whatsapp-project-tabs" dir="rtl"><button className={tab === "project-data" ? "active" : ""} onClick={() => setTab("project-data")}>بيانات المشروع</button><button className={tab === "quote" ? "active" : ""} onClick={() => setTab("quote")}>عرض السعر</button></div>
      {tab === "project-data" ? <><PanelsTabs readOnly /><WhatsappProjectData /></> : <QuoteEditor readOnly readOnlyMessage={claimedByAnotherEngineer ? "المشروع للمعاينة فقط لأنه محجوز لمهندس آخر." : readOnlyMessage} />}
    </>;
  }
  if (isExecutionPhase || isCompleted) return <><ExecutionPdfWorkspace /><details className="quote-reference-details"><summary>{isWhatsappProject ? "عرض بيانات المشروع والمندوب" : "عرض بيانات التسعير المحفوظة"}</summary>{isWhatsappProject ? <><PanelsTabs readOnly /><WhatsappProjectData /></> : <QuoteEditor readOnly readOnlyMessage={readOnlyMessage} />}</details></>;
  if (!isWhatsappProject) return <>
    <QuoteEditor readOnly={editorReadOnly} readOnlyMessage={readOnlyMessage} />
  </>;
  return <>
    {claimedByAnotherEngineer && <div className="project-read-only-notice" dir="rtl">هذا المشروع يعمل عليه {project.workingEngineerName || project.assignedEngineer?.name || "مهندس آخر"}، لذلك يظهر لك للمعاينة فقط.</div>}
    <div className="whatsapp-project-tabs" dir="rtl">
      <button className={tab === "project-data" ? "active" : ""} onClick={() => setTab("project-data")}>بيانات المشروع</button>
      <button className={tab === "quote" ? "active" : ""} onClick={() => setTab("quote")}>عرض السعر</button>
    </div>
    {tab === "project-data" ? <><PanelsTabs readOnly /><WhatsappProjectData /></> : <QuoteEditor readOnly={editorReadOnly} readOnlyMessage={readOnly || claimedByAnotherEngineer ? (claimedByAnotherEngineer ? "المشروع للمعاينة فقط لأنه محجوز لمهندس آخر." : readOnlyMessage) : ""} />}
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
