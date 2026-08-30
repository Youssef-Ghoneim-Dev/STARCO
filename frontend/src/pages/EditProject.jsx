import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import PanelsTabs from "../components/projects/projectEditor/PanelsTabs";
import PanelEditor from "../components/projects/projectEditor/PanelEditor";
import SaveActions from "../components/projects/projectEditor/SaveActions";
import { ProjectProvider, useProject } from "../context/ProjectContext";
import WhatsappProjectData from "../components/projects/projectEditor/WhatsappProjectData";
import MarketingProjectEditor from "../components/projects/projectEditor/MarketingProjectEditor";
import ExecutionPdfWorkspace from "../components/projects/projectEditor/ExecutionPdfWorkspace";
import { useAuth } from "../context/AuthContext";
import { claimPanel, getProject } from "../services/projectsAPI";
import { getPanelNameDirection } from "../utils/panelNameDirection";
import { useNotifications } from "../context/NotificationContext";
import PanelEditAction from "../components/projects/PanelEditAction";
import PanelEditSummary from "../components/projects/PanelEditSummary";
import { panelMarketingEditableStatuses } from "../utils/panelEditing";
import "../styles/ProjectEditor.css";

function QuoteEditor({
  readOnly = false,
  readOnlyMessage = "",
  allowPanelEditing = false,
}) {
  const { project, activePanel } = useProject();
  const [openedPanel, setOpenedPanel] = useState(activePanel);
  const panel = project?.panels?.[activePanel];
  const activePanelReadOnly =
    readOnly ||
    !["draft", "inProgress", "editing"].includes(panel?.quoteStatus);
  const canStartPanelEditing =
    panelMarketingEditableStatuses.has(panel?.status) && (allowPanelEditing || !readOnly);
  return (
    <>
      {readOnlyMessage && (
        <div className="project-read-only-notice" dir="rtl">
          {readOnlyMessage}
        </div>
      )}
      <PanelsTabs
        readOnly={readOnly}
        openedPanel={openedPanel}
        onOpenPanel={(index) =>
          setOpenedPanel((current) => (current === index ? null : index))
        }
      />
      {openedPanel !== null && (
        <div className="project-read-only-fieldset panel-detail-shell">
          <div className="panel-detail-heading">
            <h2><bdi dir={getPanelNameDirection(panel?.panelName)}>
              {panel?.panelName || `لوحة ${activePanel + 1}`}
            </bdi></h2>
            <div className="panel-detail-heading-actions">
              {canStartPanelEditing && (
                <StartEditingButton />
              )}
              <button type="button" onClick={() => setOpenedPanel(null)}>
                العودة إلى اللوحات
              </button>
            </div>
          </div>
          <PanelEditSummary panel={panel} />
          {activePanelReadOnly && !readOnly && (
            <div className="project-read-only-notice">
              هذه اللوحة للعرض فقط؛ التعديل مفتوح للوحة المحددة وحدها.
            </div>
          )}
          <PanelEditor readOnly={activePanelReadOnly} />
        </div>
      )}
      <div className="project-read-only-fieldset">
        <fieldset className="project-read-only-fieldset" disabled={readOnly}>
          <SaveActions />
        </fieldset>
      </div>
    </>
  );
}

function StartEditingButton() {
  const { beginEditing, project, activePanel } = useProject();
  const panel = project?.panels?.[activePanel];
  return <PanelEditAction panel={panel} onStart={(options) => beginEditing(panel?._id || panel?.panelId, options)} className="panel-inline-edit-btn" />;
}

const formatExactDate = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "full",
        timeStyle: "medium",
      }).format(new Date(value))
    : "غير محدد";

function ProjectAuditSummary({ showMarketer = false, showEngineer = false }) {
  const { project, activePanel } = useProject();
  const panel = project?.panels?.[activePanel];
  return (
    <section className="project-audit-summary" dir="rtl">
      {showMarketer && (
        <div>
          <span>المندوب المسؤول</span>
          <strong>
            {project?.marketingRepresentative?.name || "غير محدد"}
          </strong>
        </div>
      )}
      {showEngineer && (
        <div>
          <span>المهندس المسؤول عن عرض السعر</span>
          <strong>{panel?.assignedEngineer?.name || "غير محدد"}</strong>
        </div>
      )}
      <div>
        <span>تاريخ إنشاء المشروع</span>
        <strong>{formatExactDate(project?.createdAt)}</strong>
      </div>
      <div>
        <span>آخر تحديث</span>
        <strong>{formatExactDate(project?.updatedAt)}</strong>
      </div>
    </section>
  );
}

function ProjectPreviewLink() {
  const { project } = useProject();
  const includesExecutionPdf = (project?.panels || []).some((panel) =>
    ["ready", "confirmed"].includes(panel.executionPdf?.status),
  );
  const link = project?.clientPreviewToken
    ? `${window.location.origin}/p/${project.clientPreviewToken}`
    : "";
  if (!link) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      return toast.error("تعذر نسخ الرابط.");
    }
  };
  return (
    <section className="project-preview-link-card" dir="rtl">
      <div>
        <span>{includesExecutionPdf ? "رابط معاينة عرض السعر وPDF التنفيذ" : "رابط معاينة عرض السعر"}</span>
        <a href={link} target="_blank" rel="noreferrer">
          {link}
        </a>
      </div>
      <button type="button" onClick={copy}>
        نسخ الرابط
      </button>
    </section>
  );
}

function CompletedMarketingProject({ message, showExecution }) {
  const { project, activePanel } = useProject();
  const [openedPanel, setOpenedPanel] = useState(activePanel);
  const panel = project?.panels?.[activePanel];
  useEffect(() => { setOpenedPanel(activePanel); }, [activePanel]);
  return (
    <>
      {message && (
        <div className="project-read-only-notice" dir="rtl">
          {message}
        </div>
      )}
      <ProjectAuditSummary />
      <ProjectPreviewLink />
      {showExecution && <ExecutionPdfWorkspace />}
      <PanelsTabs
        readOnly
        openedPanel={openedPanel}
        onOpenPanel={(index) =>
          setOpenedPanel((current) => (current === index ? null : index))
        }
      />
      {openedPanel !== null && (
        <div className="panel-detail-shell">
          <div className="panel-detail-heading">
            <h2><bdi dir={getPanelNameDirection(panel?.panelName)}>
              {panel?.panelName || `لوحة ${activePanel + 1}`}
            </bdi></h2>
            <div className="panel-detail-heading-actions">
              {panelMarketingEditableStatuses.has(panel?.status) && (
                <StartEditingButton />
              )}
              <button type="button" onClick={() => setOpenedPanel(null)}>
                العودة إلى اللوحات
              </button>
            </div>
          </div>
          <PanelEditSummary panel={panel} />
          <WhatsappProjectData />
        </div>
      )}
    </>
  );
}

function ProjectWorkspace({ readOnly, isMarketer }) {
  const { user } = useAuth();
  const { project } = useProject();
  const [tab, setTab] = useState("project-data");
  const activePanel =
    project?.panels?.find(
      (panel) =>
        String(panel._id || panel.panelId) ===
        String(window.location.pathname.split("/").pop()),
    ) || project?.panels?.[0];
  const isWhatsappProject = ["whatsapp", "marketing"].includes(project?.source);
  const isCompleted = project?.status === "completed";
  const isQuoteCompleted = activePanel?.status === "quoteCompleted";
  const hasPanelExecution = (project?.panels || []).some(
    (panel) =>
      (panel.executionPdf?.status &&
        panel.executionPdf.status !== "notRequested") ||
      (panel.manufacturing?.status &&
        panel.manufacturing.status !== "notStarted"),
  );
  const hasEditableQuotePanels = (project?.panels || []).some((panel) =>
    ["draft", "pending", "inProgress", "editing"].includes(panel.quoteStatus),
  );
  const isExecutionPhase =
    [
      "executionPdfRequested",
      "executionPdfReady",
      "executionConfirmed",
      "manufacturingFilesPending",
      "manufacturingFilesReady",
      "pendingLaserDownload",
      "laser",
      "manufacturing",
      "painting",
      "assembly",
    ].includes(activePanel?.status) || hasPanelExecution;
  const marketingPanelEditing = Boolean(
    activePanel?.marketingEditSession?.active &&
    ["Marketer", "OwnerManager"].includes(user?.role),
  );
  const marketerCanEdit = project?.status === "draft" || marketingPanelEditing;
  const technicalCanEdit = ["pricing", "editing"].includes(activePanel?.status);
  const claimedByAnotherEngineer =
    user?.role === "Engineer" && project?.readOnlyForCurrentUser;
  const editorReadOnly =
    readOnly || claimedByAnotherEngineer || !technicalCanEdit;
  const readOnlyMessage =
    !readOnly && isCompleted
      ? "هذا المشروع مكتمل نهائيًا وهو متاح للعرض فقط."
      : readOnly && user?.role !== "MarketingManager"
        ? "هذا المشروع للعرض فقط. التعديل والتسعير متاحان للمهندس وOwner Manager فقط."
        : "";
  const canViewQuoteReference = ["Engineer", "OwnerManager"].includes(user?.role);

  if (marketingPanelEditing) return <MarketingProjectEditor />;
  if (isMarketer) {
    if (marketerCanEdit) return <MarketingProjectEditor />;
    const message = isQuoteCompleted
      ? ""
      : isExecutionPhase
        ? ""
        : isCompleted
          ? "هذا المشروع مكتمل نهائيًا."
          : "هذا المشروع أُرسل للمهندس أو يعمل عليه حاليًا، لذلك بياناته للعرض فقط.";
    return (
      <CompletedMarketingProject
        message={message}
        showExecution={isQuoteCompleted || isExecutionPhase || isCompleted}
      />
    );
  }
  if (isQuoteCompleted) {
    if (["ProductionManager", "MarketingManager"].includes(user?.role))
      return (
        <>
          {user.role === "ProductionManager" && (
            <div className="project-read-only-notice" dir="rtl">
              لا يمكنك التعديل على هذا المشروع لأنه لم يصل إلى مرحلة التنفيذ
              بعد. بيانات طلب المندوب متاحة للعرض فقط.
            </div>
          )}
          <ProjectAuditSummary
            showEngineer={user.role === "ProductionManager"}
            showMarketer={user.role === "MarketingManager"}
          />
          <ProjectPreviewLink />
          <PanelEditSummary panel={activePanel} />
          {user.role === "MarketingManager" && <ExecutionPdfWorkspace />}
          <PanelsTabs readOnly />
          <WhatsappProjectData />
        </>
      );
    return (
      <>
        {claimedByAnotherEngineer && (
          <div className="project-read-only-notice" dir="rtl">
            هذا المشروع يعمل عليه{" "}
            {project.workingEngineerName ||
              project.assignedEngineer?.name ||
              "مهندس آخر"}
            ، لذلك يظهر لك للمعاينة فقط.
          </div>
        )}
        <ProjectAuditSummary
          showMarketer={user?.role === "OwnerManager"}
          showEngineer={user?.role === "OwnerManager"}
        />
        <ProjectPreviewLink />
        <PanelEditSummary panel={activePanel} />
        {(user?.role === "OwnerManager" ||
          (user?.role === "Engineer" && project?.source === "manual")) && (
          <ExecutionPdfWorkspace />
        )}
        <div className="whatsapp-project-tabs" dir="rtl">
          <button
            className={tab === "project-data" ? "active" : ""}
            onClick={() => setTab("project-data")}
          >
            بيانات المشروع
          </button>
          <button
            className={tab === "quote" ? "active" : ""}
            onClick={() => setTab("quote")}
          >
            عرض السعر
          </button>
        </div>
        {tab === "project-data" ? (
          <>
            <PanelsTabs readOnly />
            <WhatsappProjectData />
          </>
        ) : (
          <QuoteEditor
            readOnly
            readOnlyMessage={
              claimedByAnotherEngineer
                ? "المشروع للمعاينة فقط لأنه محجوز لمهندس آخر."
                : readOnlyMessage
            }
            allowPanelEditing={!claimedByAnotherEngineer}
          />
        )}
      </>
    );
  }
  if ((isExecutionPhase || isCompleted) && !hasEditableQuotePanels)
    return (
      <>
        <ProjectPreviewLink />
        <ExecutionPdfWorkspace />
        <PanelEditSummary panel={activePanel} />
        <details className="quote-reference-details">
          <summary>
            {isWhatsappProject
              ? canViewQuoteReference
                ? "عرض بيانات المشروع وعرض السعر"
                : "عرض بيانات المشروع والمندوب"
              : "عرض بيانات التسعير المحفوظة"}
          </summary>
          {isWhatsappProject ? (
            canViewQuoteReference ? <>
              <div className="whatsapp-project-tabs quote-reference-tabs" dir="rtl">
                <button className={tab === "project-data" ? "active" : ""} onClick={() => setTab("project-data")}>بيانات المشروع</button>
                <button className={tab === "quote" ? "active" : ""} onClick={() => setTab("quote")}>عرض السعر</button>
              </div>
              {tab === "project-data" ? <><PanelsTabs readOnly /><WhatsappProjectData /></> : <QuoteEditor readOnly readOnlyMessage={readOnlyMessage} />}
            </> : <><PanelsTabs readOnly /><WhatsappProjectData /></>
          ) : (
            <QuoteEditor readOnly readOnlyMessage={readOnlyMessage} />
          )}
        </details>
      </>
    );
  if (!isWhatsappProject)
    return (
      <>
        {isExecutionPhase && <ExecutionPdfWorkspace />}
        <QuoteEditor
          readOnly={editorReadOnly}
          readOnlyMessage={readOnlyMessage}
        />
      </>
    );
  return (
    <>
      {claimedByAnotherEngineer && (
        <div className="project-read-only-notice" dir="rtl">
          هذا المشروع يعمل عليه{" "}
          {project.workingEngineerName ||
            project.assignedEngineer?.name ||
            "مهندس آخر"}
          ، لذلك يظهر لك للمعاينة فقط.
        </div>
      )}
      {isExecutionPhase && <ExecutionPdfWorkspace />}
      <div className="whatsapp-project-tabs" dir="rtl">
        <button
          className={tab === "project-data" ? "active" : ""}
          onClick={() => setTab("project-data")}
        >
          بيانات المشروع
        </button>
        <button
          className={tab === "quote" ? "active" : ""}
          onClick={() => setTab("quote")}
        >
          عرض السعر
        </button>
      </div>
      {tab === "project-data" ? (
        <>
          <PanelsTabs readOnly />
          <WhatsappProjectData />
        </>
      ) : (
        <QuoteEditor
          readOnly={editorReadOnly}
          readOnlyMessage={
            readOnly || claimedByAnotherEngineer
              ? claimedByAnotherEngineer
                ? "المشروع للمعاينة فقط لأنه محجوز لمهندس آخر."
                : readOnlyMessage
              : ""
          }
        />
      )}
    </>
  );
}

function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, readProject } = useNotifications();
  const latestWorkflowNotification = notifications.find((item) => String(item.projectId) === String(id));
  const latestWorkflowNotificationId = latestWorkflowNotification?._id;
  useEffect(() => {
    if (!latestWorkflowNotificationId) return;
    window.dispatchEvent(new CustomEvent("project:refresh", { detail: { projectId: id } }));
  }, [id, latestWorkflowNotificationId]);
  useEffect(() => {
    if (user?.role !== "Engineer") return;
    const stopNotification = notifications.find((item) => !item.readAt && item.type === "panelMarketingEditStarted" && String(item.projectId) === String(id));
    if (!stopNotification) return;
    toast.error(stopNotification.title || "توقف عن العمل؛ المندوب يعدّل اللوحة الآن.", { duration: 7000 });
    navigate("/projects", { replace: true });
  }, [id, navigate, notifications, user?.role]);
  useEffect(() => { readProject(id); }, [id, readProject]);
  const isMarketer = user?.role === "Marketer";
  const readOnly = !["OwnerManager", "Engineer", "Marketer"].includes(
    user?.role,
  );

  return (
    <ProjectProvider projectId={id} readOnly={readOnly}>
      <DashboardLayout notAllowed={false}>
        <div className="project-editor-page">
          <PanelRouteGate readOnly={readOnly} isMarketer={isMarketer} />
        </div>
      </DashboardLayout>
    </ProjectProvider>
  );
}

function PanelRouteGate({ readOnly, isMarketer }) {
  const { panelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, setProject, activePanel, setActivePanel } =
    useProject();
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    const index = (project?.panels || []).findIndex(
      (panel) => String(panel._id || panel.panelId) === String(panelId),
    );
    if (index >= 0 && index !== activePanel) setActivePanel(index);
  }, [activePanel, panelId, project?.panels, setActivePanel]);

  useEffect(() => {
    if (project?.status === "created" && ["Engineer", "OwnerManager"].includes(user?.role)) navigate(`/projects/${project._id}`, { replace: true });
  }, [navigate, project?._id, project?.status, user?.role]);

  const panel = project?.panels?.[activePanel];
  useEffect(() => {
    if (user?.role !== "Engineer" || !panel?._id) return undefined;
    let active = true;
    const checkForMarketingEdit = async () => {
      try {
        const { data } = await getProject(project._id);
        if (!active) return;
        const remotePanel = (data?.panels || []).find((item) =>
          String(item._id || item.panelId) === String(panel._id || panel.panelId),
        );
        if (remotePanel?.marketingEditSession?.active) {
          toast.error("المندوب طلب تعديل هذه اللوحة. تم إيقاف العمل وإعادتك إلى المشاريع.", { duration: 7000 });
          navigate("/projects", { replace: true });
        }
      } catch {
        // The regular notification refresh remains the fallback.
      }
    };
    checkForMarketingEdit();
    const interval = window.setInterval(checkForMarketingEdit, 1500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [navigate, panel?._id, panel?.panelId, project?._id, user?.role]);
  useEffect(() => {
    if (user?.role === "Engineer" && panel?.marketingEditSession?.active) {
      toast.error("المندوب يعدّل هذه اللوحة حاليًا. تم إيقاف العمل عليها مؤقتًا.", { duration: 7000 });
      navigate("/projects", { replace: true });
    }
  }, [navigate, panel?.marketingEditSession?.active, user?.role]);
  useEffect(() => {
    if (
      !panel?._id ||
      panel.status !== "pendingPricing" ||
      !["Engineer", "OwnerManager"].includes(user?.role) ||
      project.status !== "inProgress" ||
      locking
    )
      return;
    setLocking(true);
    claimPanel(project._id, panel._id)
      .then(({ data }) =>
        setProject((current) => ({
          ...current,
          panels: current.panels.map((item) =>
            item._id === panel._id
              ? { ...item, ...data.panel, quoteStatus: "inProgress" }
              : item,
          ),
        })),
      )
      .catch((error) =>
        toast.error(error.response?.data?.message || "تعذر حجز اللوحة."),
      )
      .finally(() => setLocking(false));
  }, [
    locking,
    panel?._id,
    panel?.status,
    project._id,
    project.status,
    setProject,
    user?.role,
  ]);

  if (project?.status === "created" && ["Engineer", "OwnerManager"].includes(user?.role)) return <div className="route-loading">جاري فتح بيانات المشروع...</div>;
  if (!panel)
    return (
      <div className="route-loading" dir="rtl">
        اللوحة غير موجودة داخل هذا المشروع.
      </div>
    );
  return <ProjectWorkspace readOnly={readOnly} isMarketer={isMarketer} />;
}

export default EditProject;
