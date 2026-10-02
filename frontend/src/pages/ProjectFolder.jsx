import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { showWhatsAppNotificationErrorToast } from "../utils/whatsappErrorToast";
import {
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
} from "react-icons/fi";
import DashboardLayout from "../components/layout/DashboardLayout";
import PanelCard from "../components/projects/PanelCard";
import {
  acquireProjectSetupLock,
  completeProject,
  completeProjectSetup,
  createPanel,
  deletePanelRecord,
  getProject,
  startProjectEditing,
  submitMarketingProject,
} from "../services/projectsAPI";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getSystemConfiguration } from "../services/systemConfigurationAPI";
import StyledSelect from "../components/common/StyledSelect";
import { useActivityAction } from "../components/common/activity/ActivityContext";
import { showApiErrorToast } from "../utils/errorToast";
import { findSimilarClients } from "../services/clientsAPI";
import "../styles/ProjectEditor.css";
const projectStates = {
  draft: "مسودة",
  created: "تم الإرسال",
  inProgress: "قيد العمل",
  completed: "مكتمل نهائيًا",
};

function ProjectSetup({ project, onComplete }) {
  const runActivity = useActivityAction();
  const [client, setClient] = useState({ ...project.client });
  const [prices, setPrices] = useState({ ...project.prices });
  const [review, setReview] = useState({ ...(project.clientNameReview || {}) });
  const [selectedClient, setSelectedClient] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      acquireProjectSetupLock(project._id),
      getSystemConfiguration(),
    ])
      .then(([, configuration]) => {
        if (!active) return;
        setPrices((current) => ({
          sheetPrice:
            current.sheetPrice === null || current.sheetPrice === ""
              ? (configuration.data?.sheetPrice ?? "")
              : current.sheetPrice,
          paintPrice:
            current.paintPrice === null || current.paintPrice === ""
              ? (configuration.data?.paintPrice ?? "")
              : current.paintPrice,
        }));
        setReady(true);
      })
      .catch((error) => showApiErrorToast(error, "تعذر تجهيز بيانات المشروع."));
    return () => {
      active = false;
    };
  }, [project._id]);
  useEffect(() => {
    const clientName = String(client.name || "").trim();
    if (
      project.source !== "whatsapp" ||
      client.id ||
      review.resolved ||
      review.candidates?.length ||
      clientName.length < 2
    )
      return undefined;

    let active = true;
    findSimilarClients(clientName)
      .then(({ data }) => {
        if (!active) return;
        const candidates = data?.candidates || [];
        if (!candidates.length) return;
        setReview((current) =>
          current.resolved || current.candidates?.length
            ? current
            : {
                ...current,
                enteredName: current.enteredName || clientName,
                candidates,
              },
        );
      })
      .catch(() => {
        // The backend guard still prevents duplicate client records when it has a review.
      });

    return () => {
      active = false;
    };
  }, [
    client.id,
    client.name,
    project.source,
    review.candidates?.length,
    review.resolved,
  ]);
  const candidates = review.resolved ? [] : review.candidates || [];
  const chooseExisting = () => {
    const match = candidates.find(
      (item) => String(item.clientId || item._id) === selectedClient,
    );
    if (!match) return;
    setClient((current) => ({
      ...current,
      id: match.clientId || match._id,
      name: match.name,
      type: match.type,
      profitPercentage: match.profitPercentage,
    }));
    setReview((current) => ({
      ...current,
      resolved: true,
      resolution: "existing",
    }));
  };
  const chooseNew = () =>
    setReview((current) => ({ ...current, resolved: true, resolution: "new" }));
  const save = async () => {
    setSaving(true);
    try {
      const operation = await runActivity(
        "complete-project-setup",
        {
          title: "حفظ بيانات المشروع",
          message: "يتم حفظ بيانات العميل والأسعار...",
          type: "save",
          successMessage: "تم حفظ بيانات المشروع.",
          errorMessage: "تعذر حفظ بيانات المشروع.",
        },
        () =>
          completeProjectSetup(project._id, {
            client,
            prices,
            clientNameReview: review,
          }),
      );
      if (operation.skipped) return;
      const { data } = operation.value;
      onComplete(data.project);
    } catch (error) {
      showApiErrorToast(error, "تعذر حفظ بيانات المشروع.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="project-setup-gate project-folder-setup" dir="rtl">
      <div>
        <h1>تأكيد بيانات المشروع</h1>
        <p>
          أنت أول مهندس فتح المشروع. راجع البيانات المشتركة ثم افتح اللوحات
          للتسعير.
        </p>
      </div>
      <section className="project-editor-card">
        <div className="project-info-grid">
          <label className="project-field">
            <span>اسم العميل</span>
            <input value={client.name || ""} readOnly />
          </label>
          <label className="project-field">
            <span>نوع العميل</span>
            <StyledSelect
              value={client.type || ""}
              placeholder="اختر النوع"
              onChange={(value) =>
                setClient((current) => ({ ...current, type: value }))
              }
              options={[
                { value: "person", label: "فرد" },
                { value: "company", label: "شركة" },
              ]}
            />
          </label>
        </div>
        <div className="profit-section">
          <label>هامش الربح</label>
          <div className="profit-grid">
            {[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((value) => (
              <button
                key={value}
                type="button"
                className={
                  Number(client.profitPercentage) === value
                    ? "profit-btn active"
                    : "profit-btn"
                }
                onClick={() =>
                  setClient((current) => ({
                    ...current,
                    profitPercentage: value,
                  }))
                }
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
        {candidates.length > 0 && (
          <aside className="client-match-card">
            <p>هل «{client.name}» هو أحد العملاء التاليين؟</p>
            <StyledSelect
              value={selectedClient}
              placeholder="اختر العميل المشابه"
              onChange={setSelectedClient}
              options={candidates.map((item) => ({
                value: item.clientId || item._id,
                label: `${item.name} — تشابه ${item.similarity}%`,
              }))}
            />
            <div>
              <button
                type="button"
                onClick={chooseExisting}
                disabled={!selectedClient}
              >
                نعم، هو نفسه
              </button>
              <button type="button" onClick={chooseNew}>
                لا، عميل جديد
              </button>
            </div>
          </aside>
        )}
      </section>
      <section className="project-editor-card project-prices">
        <h2 className="section-title">الأسعار</h2>
        <div className="project-prices-grid">
          <label className="price-field">
            <span>سعر الصاج</span>
            <input
              type="number"
              min="0"
              value={prices.sheetPrice ?? ""}
              onChange={(event) =>
                setPrices((current) => ({
                  ...current,
                  sheetPrice:
                    event.target.value === "" ? "" : Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="price-field">
            <span>سعر الدهان</span>
            <input
              type="number"
              min="0"
              value={prices.paintPrice ?? ""}
              onChange={(event) =>
                setPrices((current) => ({
                  ...current,
                  paintPrice:
                    event.target.value === "" ? "" : Number(event.target.value),
                }))
              }
            />
          </label>
        </div>
      </section>
      <button type="button" onClick={save} disabled={!ready || saving}>
        {saving
          ? "جاري حفظ البيانات وفتح المشروع..."
          : ready
            ? "تأكيد وفتح اللوحات للتسعير"
            : "جاري تجهيز بيانات المشروع..."}
      </button>
    </section>
  );
}
export default function ProjectFolder() {
  const runActivity = useActivityAction();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, readProject } = useNotifications();
  const hasUnreadProjectNotification = notifications.some(
    (item) => !item.readAt && String(item.projectId) === String(id),
  );
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addingPanel, setAddingPanel] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSubmitError, setShowSubmitError] = useState(false);
  const submitErrorTimer = useRef(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getProject(id);
      setProject(data);
    } catch (error) {
      showApiErrorToast(error, "تعذر فتح المشروع.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (id) readProject(id);
  }, [hasUnreadProjectNotification, id, readProject]);
  useEffect(() => () => window.clearTimeout(submitErrorTimer.current), []);
  if (loading || !project)
    return (
      <DashboardLayout notAllowed={false}>
        <div className="route-loading">جاري تحميل المشروع...</div>
      </DashboardLayout>
    );
  const isOwner = user?.role === "OwnerManager";
  const marketerDraft = user?.role === "Marketer" && project.status === "draft";
  const manualEngineer =
    ["Engineer", "FullEngineer"].includes(user?.role) &&
    project.source === "manual";
  const canAdd =
    marketerDraft || manualEngineer || (isOwner && project.status === "draft");
  const visiblePanels = (project.panels || []).filter(
    (panel) =>
      !query.trim() ||
      `${panel.panelName} ${panel.panelCode}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const add = async () => {
    setShowSubmitError(false);
    setAddingPanel(true);
    try {
      const operation = await runActivity(
        "folder-add-panel",
        {
          title: "إضافة لوحة للمشروع",
          message: "يتم إنشاء اللوحة...",
          type: "save",
          successMessage: "تمت إضافة اللوحة بنجاح.",
          errorMessage: "تعذر إضافة اللوحة.",
        },
        () => createPanel(id, {}),
      );
      if (operation.skipped) return;
      const { data } = operation.value;
      navigate(`/projects/${id}/panels/${data.panel._id}`);
    } catch (error) {
      showApiErrorToast(error, "تعذر إضافة اللوحة.");
    } finally {
      setAddingPanel(false);
    }
  };
  const remove = async (panel) => {
    try {
      const operation = await runActivity(
        `folder-delete-panel-${panel._id}`,
        {
          title: "حذف اللوحة",
          message: "يتم حذف اللوحة من المشروع...",
          type: "delete",
          successMessage: "تم حذف اللوحة.",
          errorMessage: "تعذر حذف اللوحة.",
        },
        () => deletePanelRecord(id, panel._id),
      );
      if (operation.skipped) return;
      setProject((current) => ({
        ...current,
        panels: current.panels.filter((item) => item._id !== panel._id),
      }));
    } catch (error) {
      showApiErrorToast(error, "تعذر حذف اللوحة.");
    }
  };
  const submit = async () => {
    setSubmittingProject(true);
    try {
      const operation = await runActivity(
        "submit-marketing-project-folder",
        {
          title: "إرسال المشروع للمهندسين",
          message: "يتم إرسال المشروع...",
          type: "save",
          successMessage: "تم إرسال المشروع للمهندسين.",
          errorMessage: "تعذر إرسال المشروع.",
        },
        () => submitMarketingProject(id),
      );
      if (operation.skipped) return;
      const { data } = operation.value;
      setProject(data.project);
      if (data.notificationFailed > 0) {
        showWhatsAppNotificationErrorToast(data.notificationErrors);
      }
    } catch (error) {
      showApiErrorToast(error, "تعذر إرسال المشروع.");
    } finally {
      setSubmittingProject(false);
    }
  };
  const beginPanelEdit = async (panel, options) => {
    try {
      const operation = await runActivity(
        `folder-begin-edit-${panel._id}`,
        {
          title: "فتح اللوحة للتعديل",
          message: "يتم تجهيز جلسة التعديل...",
          type: "save",
          successMessage: "أصبحت اللوحة جاهزة للتعديل.",
          errorMessage: "تعذر فتح اللوحة للتعديل.",
        },
        () => startProjectEditing(id, panel._id, options),
      );
      if (operation.skipped) return { success: false, skipped: true };
      const { data } = operation.value;
      navigate(`/projects/${id}/panels/${panel._id}`);
      return {
        success: true,
        notification: data.notification,
        activityVisible: operation.visible,
      };
    } catch (error) {
      return {
        success: false,
        code: error.response?.data?.code || "",
        error,
        message: error.response?.data?.message || "تعذر فتح اللوحة للتعديل.",
      };
    }
  };
  const quoteReadyStatuses = [
    "quoteCompleted",
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
    "completed",
  ];
  const canGeneratePreview =
    ["Engineer", "FullEngineer", "OwnerManager"].includes(user?.role) &&
    !project.previewGeneratedAt &&
    project.panels?.length > 0 &&
    project.panels.every((panel) => quoteReadyStatuses.includes(panel.status));
  const generatePreview = async () => {
    setGeneratingPreview(true);
    try {
      const operation = await runActivity(
        "generate-project-preview",
        {
          title: "إنشاء رابط معاينة المشروع",
          message: "يتم حفظ المشروع وإنشاء رابط المعاينة...",
          type: "generate",
          successMessage: "تم إنشاء رابط معاينة المشروع.",
          errorMessage: "تعذر حفظ المشروع وإرساله للمندوب.",
        },
        () => completeProject(id),
      );
      if (operation.skipped) return;
      const { data } = operation.value;
      await navigator.clipboard.writeText(data.previewUrl);
      toast.success(
        data.notified
          ? "تم حفظ المشروع وإرساله للمندوب بنجاح."
          : "تم حفظ المشروع وإصدار رابط المعاينة بنجاح.",
      );
      if (data.notificationMessage)
        toast.error(data.notificationMessage, { duration: 7000 });
      await load();
    } catch (error) {
      showApiErrorToast(error, "تعذر حفظ المشروع وإرساله للمندوب.");
    } finally {
      setGeneratingPreview(false);
    }
  };
  const needsSetup =
    project.status === "created" &&
    ["Engineer", "FullEngineer", "OwnerManager"].includes(user?.role);
  const copyProjectCode = async () => {
    try {
      await navigator.clipboard.writeText(project.projectCode);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1600);
    } catch {
      toast.error("تعذر نسخ رقم المشروع.");
    }
  };
  const panelsList = project.panels || [];
  const hasSavedPanels =
    panelsList.length > 0 && panelsList.every((panel) => panel.marketerSaved);
  const submitErrorMessage =
    panelsList.length === 0
      ? "يجب إضافة لوحة واحدة على الأقل وحفظ بياناتها قبل الإرسال."
      : "يجب حفظ بيانات جميع اللوحات قبل إرسال المشروع للمهندسين.";
  const showTimedSubmitError = () => {
    window.clearTimeout(submitErrorTimer.current);
    setShowSubmitError(true);
    submitErrorTimer.current = window.setTimeout(
      () => setShowSubmitError(false),
      3000,
    );
  };
  const trySubmit = () => {
    if (!hasSavedPanels) {
      showTimedSubmitError();
      return;
    }
    setShowSubmitError(false);
    submit();
  };
  return (
    <DashboardLayout notAllowed={false}>
      <main className="project-folder-page" dir="rtl">
        <button
          type="button"
          className="project-folder-back"
          onClick={() => navigate("/projects")}
        >
          <FiArrowRight /> الرجوع للمشاريع
        </button>
        {needsSetup ? (
          <ProjectSetup project={project} onComplete={setProject} />
        ) : (
          <>
            <header className="project-folder-header">
              <div>
                <button
                  type="button"
                  className="project-folder-code-wrap"
                  onClick={copyProjectCode}
                  aria-label={`نسخ رقم المشروع ${project.projectCode}`}
                >
                  {codeCopied ? <FiCheck /> : <FiCopy />}
                  <bdi className="project-folder-code" dir="ltr">
                    {project.projectCode}
                  </bdi>
                </button>
                <h1>{project.client?.name || "مشروع بدون عميل"}</h1>
                <p>
                  {project.panelCount || 0} لوحة ·{" "}
                  {projectStates[project.status]}
                </p>
              </div>
              <div className="project-folder-actions">
                <button
                  type="button"
                  onClick={load}
                  disabled={
                    addingPanel || submittingProject || generatingPreview
                  }
                >
                  <FiRefreshCw /> تحديث
                </button>
                {canAdd && (
                  <button
                    type="button"
                    className="primary"
                    onClick={add}
                    disabled={addingPanel}
                  >
                    <FiPlus />{" "}
                    {addingPanel ? "جاري إضافة اللوحة..." : "لوحة جديدة"}
                  </button>
                )}
                {canGeneratePreview && (
                  <button
                    type="button"
                    className="primary"
                    onClick={generatePreview}
                    disabled={generatingPreview}
                  >
                    <FiSend />{" "}
                    {generatingPreview
                      ? "جاري حفظ المشروع وإرساله..."
                      : "حفظ المشروع وإرساله للمندوب"}
                  </button>
                )}
                {marketerDraft && (
                  <span className="project-submit-action">
                    <button
                      type="button"
                      className={`submit${!hasSavedPanels ? " is-disabled" : ""}`}
                      onClick={trySubmit}
                      disabled={submittingProject}
                      aria-disabled={!hasSavedPanels}
                      aria-describedby={
                        showSubmitError && !hasSavedPanels
                          ? "project-submit-error"
                          : undefined
                      }
                    >
                      <FiSend />{" "}
                      {submittingProject
                        ? "جاري إرسال المشروع..."
                        : "إرسال المشروع للمهندسين"}
                    </button>
                    {showSubmitError && !hasSavedPanels && (
                      <small
                        id="project-submit-error"
                        className="form-field-error"
                      >
                        {submitErrorMessage}
                      </small>
                    )}
                  </span>
                )}
              </div>
            </header>
            {marketerDraft && (
              <aside className="project-submit-reminder">
                بعد الانتهاء من إضافة اللوحات اضغط «إرسال المشروع للمهندسين». لن
                يظهر المشروع للمهندسين قبل الإرسال.
              </aside>
            )}
            <div className="project-panels-toolbar">
              <h2>Panels</h2>
              <label>
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث باسم أو رقم اللوحة"
                />
              </label>
            </div>
            {visiblePanels.length ? (
              <section className="panel-folder-grid">
                {visiblePanels.map((panel) => (
                  <PanelCard
                    key={panel._id}
                    panel={panel}
                    quotePublished={Boolean(project.previewGeneratedAt)}
                    onOpen={() =>
                      navigate(`/projects/${id}/panels/${panel._id}`)
                    }
                    onEdit={
                      ["Marketer", "OwnerManager"].includes(user?.role) &&
                      !panel.quotePublicationPending
                        ? (options) => beginPanelEdit(panel, options)
                        : null
                    }
                    canDelete={
                      isOwner || (marketerDraft && panel.status === "draft")
                    }
                    onDelete={() => remove(panel)}
                  />
                ))}
              </section>
            ) : (
              <section className="empty-panel-folder">
                <h2>لا توجد لوحات داخل المشروع</h2>
                <p>ابدأ بإضافة أول لوحة، ثم احفظ بياناتها قبل إرسال المشروع.</p>
                {canAdd && (
                  <button type="button" onClick={add}>
                    <FiPlus /> إضافة لوحة
                  </button>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
