import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineClipboardCopy, HiOutlineCloudDownload, HiOutlineCloudUpload, HiOutlineClock, HiOutlineColorSwatch, HiOutlineCube, HiOutlineDocumentText, HiOutlineEye, HiOutlineExclamationCircle, HiOutlineFolder, HiOutlineLightningBolt, HiOutlinePhotograph, HiOutlinePuzzle, HiOutlineUser, HiOutlineViewGrid, HiOutlineX } from "react-icons/hi";
import { IoChevronDown } from "react-icons/io5";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import PanelEditAction from "../PanelEditAction";
import { getPanelNameDirection } from "../../../utils/panelNameDirection";
import { addEgyptWorkingDays, egyptDateValue, isEgyptNonWorkingDate } from "../../../utils/egyptWorkingDays";
import {
  finishExecutionPdf,
  deleteExecutionPdfFile,
  finishManufacturingFiles,
  confirmProjectExecution,
  getExecutionPdfFile,
  getManufacturingArchive,
  getManufacturingFile,
  requestExecutionPdf,
  requestPanelDeliverySchedule,
  respondPanelDeliverySchedule,
  saveExecutionPdfDesign,
  skipExecutionPdf,
  uploadExecutionPdfFile,
  uploadManufacturingFile,
  updateManufacturingStage,
} from "../../../services/projectsAPI";
import { createExecutionPdf } from "../../../utils/executionPdf";

const quoteFinishedStatuses = [
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

const productionTrackingStatuses = new Set([
  "manufacturingFilesReady",
  "pendingLaserDownload",
  "laser",
  "manufacturing",
  "painting",
  "assembly",
  "completed",
]);

const productionStageDefinitions = [
  { key: "awaitingLaserDownload", title: "تنزيل الملفات إلى الليزر", description: "إرسال ملفات اللوحة إلى ماكينة الليزر" },
  { key: "laser", title: "الانتهاء من العمل على الليزر", description: "إتمام قص أجزاء اللوحة على الليزر" },
  { key: "manufacturing", title: "الانتهاء من التصنيع", description: "تصنيع وتجهيز أجزاء اللوحة" },
  { key: "painting", title: "الانتهاء من رش/دهان اللوحة", description: "إتمام تجهيز السطح والدهان" },
  { key: "assembly", title: "الانتهاء من التجميع", description: "إتمام تجميع اللوحة بالكامل" },
];
const EXECUTION_DESIGN_AUTOSAVE_DELAY = 900;

const productionDelayReasons = {
  laser: ["عطل في ماكينة الليزر", "ازدحام/ضغط على الليزر", "مشكلة في ملفات DXF", "نقص خامات/صاج", "انتظار تعديل من المهندس", "انقطاع كهرباء", "أخرى"],
  manufacturing: ["عطل في ماكينة/معدات التصنيع", "نقص خامات", "نقص عمالة", "تأخر اللوحة من مرحلة الليزر", "إعادة تصنيع جزء بسبب خطأ", "ضغط أعمال", "أخرى"],
  painting: ["عطل أو صيانة في معدات الرش", "نقص دهان/خامات", "انتظار تجهيز السطح", "ازدحام جدول الرش", "تأخر من مرحلة التصنيع", "إعادة رش بسبب مشكلة في الجودة", "أخرى"],
  assembly: ["نقص مكونات كهربائية", "نقص إكسسوارات/قطع", "نقص عمالة", "تأخر وصول أجزاء اللوحة", "مشكلة اكتُشفت أثناء التجميع", "إعادة عمل/تعديل", "تأخر من المرحلة السابقة", "أخرى"],
};

// Temporary test mode: manufacturing attachments are images only until the
// storage layer is moved to Cloudflare R2.
const isManufacturingTestImage = (file) => {
  if (!file?.name) return false;
  if (String(file.type || "").startsWith("image/")) return true;
  return /\.(?:jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
};

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

const formatFileSize = (size) => {
  const bytes = Number(size) || 0;
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const manufacturingFileType = (file) => {
  const extension = String(file?.fileName || "").split(".").pop()?.toUpperCase();
  if (extension && extension.length <= 5) return extension;
  if (String(file?.mimeType || "").startsWith("image/")) return "IMG";
  return "FILE";
};

const dateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const minimumDeliveryDateValue = () => {
  return egyptDateValue(addEgyptWorkingDays(new Date(), 5));
};
const formatDeliveryPickerDate = (value) => {
  if (!value) return "اختر الموعد";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "اختر الموعد";
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

function ExecutionStatusCard({ tone = "info", icon, title, description }) {
  return <div className={`execution-status-card ${tone}`} role="status">
    <span className="execution-status-card-icon">{icon}</span>
    <div><strong>{title}</strong><span>{description}</span></div>
    <i aria-hidden="true" />
  </div>;
}

const defaultExecutionDesign = (panel, workflow) => {
  const dimensions = panel?.dimensions || panel?.pricing?.dimensions || {};
  const centimeters = [dimensions.length, dimensions.width, dimensions.depth]
    .map((value) => Number(value) ? Number(value) / 10 : "")
    .filter((value) => value !== "")
    .join(" × ");
  return {
    panelSize: workflow?.design?.panelSize || (centimeters ? `${centimeters} cm` : ""),
    steelThickness: workflow?.design?.steelThickness || workflow?.steelThickness || "",
    paint: workflow?.design?.paint || "Electrostatic paint",
    page3Text: workflow?.design?.page3Text || "",
    page4Lines: workflow?.design?.page4Lines?.length ? workflow.design.page4Lines : ["4 Metal Lock", "Lock unit", "Iron hinges", "Ground bar for collecting cables"],
    assignments: workflow?.design?.assignments || { page2: "", page3: "", page4: "", gallery: [] },
    transforms: workflow?.design?.transforms || {},
  };
};

function ExecutionSelect({ value, options, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));
  useEffect(() => {
    const close = (event) => { if (!controlRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <div className="copper-select-control execution-select-control" ref={controlRef}>
    <button type="button" className="copper-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span className={selected ? "" : "copper-select-placeholder"}>{selected?.label || placeholder}</span><IoChevronDown className="copper-select-chevron" />
    </button>
    {open && <div className="copper-select-menu" role="listbox">
      {options.map((option) => <button type="button" role="option" aria-selected={String(option.value) === String(value)} className={String(option.value) === String(value) ? "is-selected" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}
    </div>}
  </div>;
}

function ExecutionPdfWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, setProject, activePanel, savingProject, beginEditing } = useProject();
  const [busy, setBusy] = useState(false);
  const [uploadingExecution, setUploadingExecution] = useState(false);
  const [generatingExecution, setGeneratingExecution] = useState(false);
  const [previewingExecution, setPreviewingExecution] = useState(false);
  const [uploadingManufacturing, setUploadingManufacturing] = useState(false);
  const [finishingManufacturing, setFinishingManufacturing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const executionInputRefs = useRef({});
  const loadedExecutionDesignKey = useRef("");
  const lastSavedExecutionDesignRef = useRef("");
  const latestExecutionDesignRef = useRef("");
  const executionDesignRetryTimerRef = useRef(null);
  const executionDesignSaveInFlightRef = useRef(false);
  const manufacturingInputRef = useRef(null);
  const panel = project.panels?.[activePanel];
  const executionPdfState = panel?.executionPdf;
  const workflow = useMemo(() => executionPdfState || { status: "notRequested", files: [] }, [executionPdfState]);
  const files = useMemo(() => workflow.files || [], [workflow.files]);
  const manufacturing = panel?.manufacturing || { status: "notStarted", files: [], notes: "" };
  const deliverySchedule = panel?.deliverySchedule || { status: "none" };
  const manufacturingFiles = useMemo(() => manufacturing.files || [], [manufacturing.files]);
  const [engineerFileNotes, setEngineerFileNotes] = useState(manufacturing.engineerNotes || manufacturing.notes || "");
  const [manufacturingNotes, setManufacturingNotes] = useState(manufacturing.productionNotes || "");
  const [stageDecision, setStageDecision] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [delayDetails, setDelayDetails] = useState("");
  const [stageSavedFeedback, setStageSavedFeedback] = useState(null);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(() => dateInputValue(deliverySchedule.requestedDate) || minimumDeliveryDateValue());
  const [deliveryResponseNote, setDeliveryResponseNote] = useState("");
  const stageSavedTimerRef = useRef(null);
  const [selectedSteelThickness, setSelectedSteelThickness] = useState(workflow.steelThickness || "");
  const [executionDesign, setExecutionDesign] = useState(() => defaultExecutionDesign(panel, workflow));
  const [executionDesignSaveState, setExecutionDesignSaveState] = useState("idle");
  const [executionDesignRetry, setExecutionDesignRetry] = useState(0);
  const [executionPreviews, setExecutionPreviews] = useState({});
  const [cropFileId, setCropFileId] = useState("");
  const canIssueOrder = user?.role === "OwnerManager"
    || user?.role === "MarketingManager"
    || user?.role === "Marketer"
    || (user?.role === "Engineer" && project?.source === "manual");
  const canPreparePdf = ["Engineer", "OwnerManager"].includes(user?.role);
  const canReviewPdf = ["Marketer", "MarketingManager", "OwnerManager"].includes(user?.role)
    || (project?.source === "manual" && user?.role === "Engineer");
  const canPrepareManufacturing = ["Engineer", "OwnerManager"].includes(user?.role);
  const canDownloadManufacturing = ["Engineer", "OwnerManager", "ProductionManager"].includes(user?.role);
  const canManageProductionStages = ["OwnerManager", "ProductionManager"].includes(user?.role);
  const deliveryScheduleStatuses = new Set(["executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"]);
  const deliveryScheduleAvailable = deliveryScheduleStatuses.has(panel?.status);
  const canRequestDeliverySchedule = ["Marketer", "MarketingManager", "OwnerManager"].includes(user?.role) && deliveryScheduleAvailable;
  const canRespondDeliverySchedule = ["ProductionManager", "OwnerManager"].includes(user?.role) && deliveryScheduleAvailable;
  const executionDesignStorageKey = project?._id && panel?.panelId
    ? `starco:execution-pdf-draft:${project._id}:${panel.panelId}:${workflow.requestedAt || "initial"}`
    : "";
  const withProjectMetadata = (nextProject, updatedByName = project.lastUpdatedByName) => ({
    ...nextProject,
    marketingRepresentative: project.marketingRepresentative || nextProject.marketingRepresentative,
    assignedEngineer: project.assignedEngineer || nextProject.assignedEngineer,
    lastUpdatedByName: updatedByName || nextProject.lastUpdatedByName,
  });

  useEffect(() => {
    setEngineerFileNotes(manufacturing.engineerNotes || manufacturing.notes || "");
    setManufacturingNotes(manufacturing.productionNotes || "");
    setStageDecision("");
    setDelayReason("");
    setDelayDetails("");
  }, [panel?.panelId, manufacturing.engineerNotes, manufacturing.notes, manufacturing.productionNotes, manufacturing.currentStage]);

  useEffect(() => {
    setRequestedDeliveryDate(dateInputValue(deliverySchedule.requestedDate) || minimumDeliveryDateValue());
    setDeliveryResponseNote(deliverySchedule.responseNote || "");
  }, [panel?.panelId, deliverySchedule.requestedDate, deliverySchedule.responseNote]);

  useEffect(() => () => {
    window.clearTimeout(stageSavedTimerRef.current);
    window.clearTimeout(executionDesignRetryTimerRef.current);
  }, []);

  useEffect(() => {
    const designKey = `${panel?.panelId || ""}:${workflow.status || ""}:${workflow.requestedAt || ""}`;
    if (loadedExecutionDesignKey.current === designKey) return;
    loadedExecutionDesignKey.current = designKey;
    setSelectedSteelThickness(workflow.steelThickness || "");
    const serverDesign = defaultExecutionDesign(panel, workflow);
    const serverSerialized = JSON.stringify(serverDesign);
    let restoredDesign = null;
    if (executionDesignStorageKey && workflow.status === "requested") {
      try {
        const localDraft = JSON.parse(window.localStorage.getItem(executionDesignStorageKey) || "null");
        if (localDraft?.design && typeof localDraft.design === "object") restoredDesign = { ...serverDesign, ...localDraft.design };
      } catch { window.localStorage.removeItem(executionDesignStorageKey); }
    }
    lastSavedExecutionDesignRef.current = serverSerialized;
    const nextDesign = restoredDesign || serverDesign;
    latestExecutionDesignRef.current = JSON.stringify(nextDesign);
    setExecutionDesign(nextDesign);
    setExecutionDesignSaveState(restoredDesign ? "pending" : workflow?.design && Object.keys(workflow.design).length ? "saved" : "idle");
  }, [executionDesignStorageKey, panel, workflow]);

  useEffect(() => {
    if (!executionDesignStorageKey || workflow.status !== "requested" || !canPreparePdf) return undefined;
    const serialized = JSON.stringify(executionDesign);
    latestExecutionDesignRef.current = serialized;
    if (serialized === lastSavedExecutionDesignRef.current) {
      window.localStorage.removeItem(executionDesignStorageKey);
      return undefined;
    }
    window.localStorage.setItem(executionDesignStorageKey, JSON.stringify({ design: executionDesign, updatedAt: new Date().toISOString() }));
    setExecutionDesignSaveState("pending");
    const timer = window.setTimeout(async () => {
      if (executionDesignSaveInFlightRef.current) {
        window.clearTimeout(executionDesignRetryTimerRef.current);
        executionDesignRetryTimerRef.current = window.setTimeout(() => setExecutionDesignRetry((value) => value + 1), 250);
        return;
      }
      executionDesignSaveInFlightRef.current = true;
      let saveCompleted = false;
      setExecutionDesignSaveState("saving");
      try {
        await saveExecutionPdfDesign(project._id, panel.panelId, executionDesign);
        saveCompleted = true;
        lastSavedExecutionDesignRef.current = serialized;
        if (latestExecutionDesignRef.current === serialized) {
          window.localStorage.removeItem(executionDesignStorageKey);
          setExecutionDesignSaveState("saved");
        }
      } catch (error) {
        setExecutionDesignSaveState(error?.response ? "error" : "offline");
        if (!error?.response) {
          window.clearTimeout(executionDesignRetryTimerRef.current);
          executionDesignRetryTimerRef.current = window.setTimeout(() => setExecutionDesignRetry((value) => value + 1), 4000);
        }
      } finally {
        executionDesignSaveInFlightRef.current = false;
        if (saveCompleted && latestExecutionDesignRef.current !== serialized) {
          window.clearTimeout(executionDesignRetryTimerRef.current);
          executionDesignRetryTimerRef.current = window.setTimeout(() => setExecutionDesignRetry((value) => value + 1), 50);
        }
      }
    }, EXECUTION_DESIGN_AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [canPreparePdf, executionDesign, executionDesignRetry, executionDesignStorageKey, panel?.panelId, project?._id, workflow.status]);

  const productionStages = useMemo(() => {
    const currentKey = productionStageDefinitions.some((stage) => stage.key === manufacturing.currentStage)
      ? manufacturing.currentStage
      : "awaitingLaserDownload";
    const currentIndex = productionStageDefinitions.findIndex((stage) => stage.key === currentKey);
    const stored = new Map((manufacturing.productionStages || []).map((stage) => [
      stage.key === "pendingLaserDownload" ? "awaitingLaserDownload" : stage.key,
      stage,
    ]));
    return productionStageDefinitions.map((definition, index) => ({
      ...definition,
      ...(stored.get(definition.key) || {}),
      status: stored.get(definition.key)?.status || (index < currentIndex ? "completed" : index === currentIndex ? "active" : "pending"),
    }));
  }, [manufacturing.currentStage, manufacturing.productionStages]);
  const activeProductionStage = productionStages.find((stage) => stage.status === "active");
  const manufacturingNotesChanged = manufacturingNotes !== String(manufacturing.productionNotes || "");
  const productionHistory = useMemo(() => manufacturing.productionHistory || [], [manufacturing.productionHistory]);
  const latestProductionUpdate = productionHistory[productionHistory.length - 1];
  const assignedEngineer = panel.assignedEngineer || project.assignedEngineer || null;
  const lastProductionUpdater = latestProductionUpdate?.actorName || assignedEngineer?.name || "غير محدد";
  const lastProductionUpdateAt = latestProductionUpdate?.createdAt || panel.updatedAt || project.updatedAt;
  const stageHasUnsavedChanges = Boolean(stageDecision || manufacturingNotesChanged || delayReason || delayDetails.trim());
  const panelReferenceCode = panel?.panelCode || project?.projectCode || "—";
  const productionStageTitle = (key) => productionStageDefinitions.find((stage) => stage.key === key)?.title || "مرحلة الإنتاج";
  const stageIcon = (key) => ({
    awaitingLaserDownload: <HiOutlineCloudDownload />,
    laser: <HiOutlineLightningBolt />,
    manufacturing: <HiOutlinePuzzle />,
    painting: <HiOutlineColorSwatch />,
    assembly: <HiOutlineCube />,
  }[key] || <HiOutlineViewGrid />);
  const formatProjectDate = (value, withTime = false) => {
    if (!value) return "غير محدد";
    const options = withTime
      ? { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }
      : { day: "numeric", month: "long", year: "numeric" };
    return new Date(value).toLocaleString("ar-EG", options);
  };

  const copyId = async () => {
    await navigator.clipboard.writeText(panelReferenceCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const issueOrder = async () => {
    setBusy(true);
    try {
      if (!selectedSteelThickness) return toast.error("اختر سمك الصاج الذي أكده العميل أولًا.");
      const { data } = await requestExecutionPdf(project._id, panel.panelId, { steelThickness: Number(selectedSteelThickness) });
      setProject({
        ...data.project,
        marketingRepresentative: project.marketingRepresentative || data.project.marketingRepresentative,
        assignedEngineer: project.assignedEngineer || data.project.assignedEngineer,
        lastUpdatedByName: user?.name || project.lastUpdatedByName || data.project.lastUpdatedByName,
      });
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر إصدار أمر PDF التنفيذ.");
    } finally { setBusy(false); }
  };

  const uploadFiles = async (selectedFiles, purpose) => {
    // Some Android pickers omit the MIME type or expose the selected file as
    // application/octet-stream. Keep the picker restriction here and let the
    // backend verify the actual file contents before storing it.
    const filesToUpload = Array.from(selectedFiles || []).filter((file) => file?.size > 0);
    if (!filesToUpload.length) return toast.error("اختر صورة أولًا.");
    setUploadingExecution(true);
    try {
      let latestProject = project;
      for (const file of filesToUpload) {
        const { data } = await uploadExecutionPdfFile(project._id, panel.panelId, file, purpose);
        latestProject = data.project;
      }
      setProject(latestProject);
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر رفع الملف.");
    } finally { setUploadingExecution(false); }
  };

  const executionImageFiles = useMemo(() => files.filter((file) => file.purpose !== "generatedPdf" && (String(file.mimeType || "").startsWith("image/") || /\.(?:jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.fileName || ""))), [files]);

  useEffect(() => {
    let active = true;
    const urls = [];
    const loadPreviews = async () => {
      const entries = await Promise.all(executionImageFiles.map(async (file) => {
        try {
          const { data } = await getExecutionPdfFile(project._id, panel.panelId, file._id);
          const url = URL.createObjectURL(data);
          urls.push(url);
          return [String(file._id), url];
        } catch { return [String(file._id), ""]; }
      }));
      if (active) setExecutionPreviews(Object.fromEntries(entries));
    };
    loadPreviews();
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [executionImageFiles, project._id, panel.panelId]);

  const isImageAssigned = (fileId, destination) => {
    const id = String(fileId);
    return destination === "gallery"
      ? (executionDesign.assignments.gallery || []).map(String).includes(id)
      : String(executionDesign.assignments[destination] || "") === id;
  };

  const toggleImageAssignment = (fileId, destination) => {
    const id = String(fileId);
    setExecutionDesign((current) => {
      const next = { page2: current.assignments.page2, page3: current.assignments.page3, page4: current.assignments.page4, gallery: [...(current.assignments.gallery || [])] };
      if (["page2", "page3", "page4"].includes(destination)) next[destination] = String(next[destination] || "") === id ? "" : id;
      if (destination === "gallery") {
        if (next.gallery.map(String).includes(id)) next.gallery = next.gallery.filter((assignedId) => String(assignedId) !== id);
        else {
        if (next.gallery.length >= 3) { toast.error("صفحة الصور تقبل ثلاث صور فقط."); return current; }
        next.gallery.push(id);
        }
      }
      return {
        ...current,
        assignments: next,
        transforms: current.transforms[id] ? current.transforms : { ...current.transforms, [id]: { cropX: 50, zoom: 1, positionX: 50, positionY: 50 } },
      };
    });
  };

  const updateTransform = (fileId, key, value) => setExecutionDesign((current) => ({
    ...current,
    transforms: { ...current.transforms, [fileId]: { cropX: 50, zoom: 1, positionX: 50, positionY: 50, ...(current.transforms[fileId] || {}), [key]: Number(value) } },
  }));

  const buildExecutionPdf = async (design = executionDesign) => {
    const generationUrls = [];
    try {
      const assignedIds = [...new Set([
        design.assignments.page2,
        design.assignments.page3,
        design.assignments.page4,
        ...(design.assignments.gallery || []),
      ].filter(Boolean).map(String))];
      const images = {};
      for (const fileId of assignedIds) {
        const file = executionImageFiles.find((item) => String(item._id) === fileId);
        if (!file) throw new Error("تعذر العثور على إحدى الصور المختارة. أعد اختيار الصور وحاول مرة أخرى.");
        const { data } = await getExecutionPdfFile(project._id, panel.panelId, file._id);
        const url = URL.createObjectURL(data);
        generationUrls.push(url);
        images[fileId] = url;
      }
      return await createExecutionPdf({ ...design, images });
    } finally {
      generationUrls.forEach((url) => URL.revokeObjectURL(url));
    }
  };

  const generateAndFinish = async () => {
    const validationError = validateExecutionDesign();
    if (validationError) return toast.error(validationError);
    setGeneratingExecution(true);
    try {
      await saveExecutionPdfDesign(project._id, panel.panelId, executionDesign);
      const savedDesign = JSON.stringify(executionDesign);
      lastSavedExecutionDesignRef.current = savedDesign;
      latestExecutionDesignRef.current = savedDesign;
      if (executionDesignStorageKey) window.localStorage.removeItem(executionDesignStorageKey);
      setExecutionDesignSaveState("saved");
      // Generate once locally to verify the persisted design. The resulting
      // PDF is intentionally not uploaded; it is rebuilt on demand.
      await buildExecutionPdf(executionDesign);
      const { data: finishData } = await finishExecutionPdf(project._id, panel.panelId);
      setProject(withProjectMetadata(finishData.project, user?.name || project.lastUpdatedByName));
      toast.success("تم إنشاء PDF التنفيذ وإرساله للمراجعة بنجاح.");
      if (finishData.notification?.includes("تعذر")) toast.error(finishData.notification);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "تعذر إنشاء PDF التنفيذ.");
    } finally {
      setGeneratingExecution(false);
    }
  };

  function validateExecutionDesign() {
    const { assignments } = executionDesign;
    if (!assignments.page2 || !assignments.page3 || !assignments.page4) return "اختر صورة لكل صفحة من الصفحات الثانية والثالثة والرابعة.";
    if ((assignments.gallery || []).length !== 3) return "اختر ثلاث صور لصفحة الصور.";
    if (!executionDesign.page3Text.trim()) return "اكتب محتوى الصفحة الثالثة أولًا.";
    if (!executionDesign.panelSize.trim() || !String(executionDesign.steelThickness).trim() || !executionDesign.paint.trim()) return "أكمل مقاس اللوحة والسمك ونوع الدهان أولًا.";
    if (!(executionDesign.page4Lines || []).filter((line) => line.trim()).length) return "أضف بيانات الصفحة الرابعة أولًا.";
    return "";
  }

  const previewExecutionPdf = async () => {
    const validationError = validateExecutionDesign();
    if (validationError) return toast.error(validationError);
    const previewWindow = window.open("", "_blank");
    setPreviewingExecution(true);
    try {
      const pdf = await buildExecutionPdf(executionDesign);
      const url = URL.createObjectURL(pdf);
      if (previewWindow) previewWindow.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      toast.error(error.response?.data?.message || error.message || "تعذر معاينة PDF التنفيذ.");
    } finally {
      setPreviewingExecution(false);
    }
  };

  const removeExecutionFile = async (file) => {
    setBusy(true);
    try {
      const { data } = await deleteExecutionPdfFile(project._id, panel.panelId, file._id);
      setProject(withProjectMetadata(data.project));
      const removedId = String(file._id);
      setExecutionDesign((current) => ({
        ...current,
        assignments: {
          page2: String(current.assignments.page2 || "") === removedId ? "" : current.assignments.page2,
          page3: String(current.assignments.page3 || "") === removedId ? "" : current.assignments.page3,
          page4: String(current.assignments.page4 || "") === removedId ? "" : current.assignments.page4,
          gallery: (current.assignments.gallery || []).filter((id) => String(id) !== removedId),
        },
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر حذف الملف.");
    } finally { setBusy(false); }
  };

  const skip = async () => {
    setBusy(true);
    try {
      const { data } = await skipExecutionPdf(project._id, panel.panelId);
      setProject(data.project);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر تخطي المرحلة."); }
    finally { setBusy(false); }
  };

  const confirmExecution = async () => {
    setBusy(true);
    try {
      const { data } = await confirmProjectExecution(project._id, panel.panelId);
      setProject(data.project);
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر تأكيد التنفيذ."); }
    finally { setBusy(false); }
  };

  const requestDeliveryDate = async () => {
    if (!requestedDeliveryDate) return toast.error("اختر موعد انتهاء اللوحة أولًا.");
    if (requestedDeliveryDate < minimumDeliveryDateValue()) return toast.error("يجب أن يكون الموعد بعد خمسة أيام عمل على الأقل من تاريخ الطلب.");
    if (isEgyptNonWorkingDate(requestedDeliveryDate)) return toast.error("لا يمكن اختيار يوم الجمعة أو عطلة رسمية موعدًا للتسليم.");
    setBusy(true);
    try {
      const { data } = await requestPanelDeliverySchedule(project._id, panel.panelId, requestedDeliveryDate);
      setProject(withProjectMetadata(data.project, user?.name || project.lastUpdatedByName));
      toast.success(data.message || "تم إرسال الموعد لمدير التنفيذ.");
    } catch (error) { toast.error(error.response?.data?.message || "تعذر إرسال الموعد."); }
    finally { setBusy(false); }
  };

  const respondToDeliveryDate = async (decision) => {
    setBusy(true);
    try {
      const { data } = await respondPanelDeliverySchedule(project._id, panel.panelId, decision, deliveryResponseNote);
      setProject(withProjectMetadata(data.project, user?.name || project.lastUpdatedByName));
      toast.success(data.message || "تم حفظ قرار الموعد.");
    } catch (error) { toast.error(error.response?.data?.message || "تعذر حفظ قرار الموعد."); }
    finally { setBusy(false); }
  };

  const uploadManufacturingFiles = async (selectedFiles) => {
    const incoming = Array.from(selectedFiles || []).filter((file) => file?.name);
    const selected = incoming.filter(isManufacturingTestImage);
    if (!selected.length) return toast.error("اختر ملفًا واحدًا على الأقل.");
    if (selected.length !== incoming.length) {
      toast.error("مرحلة التجربة تقبل الصور فقط حاليًا.");
      return;
    }
    setUploadingManufacturing(true);
    try {
      let latestProject = project;
      for (const file of selected) {
        const { data } = await uploadManufacturingFile(project._id, panel.panelId, file);
        latestProject = data.project;
      }
      setProject(latestProject);
    } catch (error) { toast.error(error.response?.data?.message || error.message || "تعذر رفع ملف التصنيع."); }
    finally { setUploadingManufacturing(false); }
  };

  const finishManufacturing = async () => {
    setFinishingManufacturing(true);
    try {
      const { data } = await finishManufacturingFiles(project._id, panel.panelId, engineerFileNotes);
      setProject(withProjectMetadata(data.project, user?.name || project.lastUpdatedByName));
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر إتمام ملفات التصنيع."); }
    finally { setFinishingManufacturing(false); }
  };

  const downloadManufacturingFile = async (file) => {
    try {
      const { data } = await getManufacturingFile(project._id, panel.panelId, file._id);
      saveBlob(data, file.fileName || "manufacturing-file");
    } catch (error) { toast.error(error.response?.data?.message || "تعذر تنزيل الملف."); }
  };

  const downloadAllManufacturingFiles = async () => {
    try {
      const { data } = await getManufacturingArchive(project._id, panel.panelId);
      saveBlob(data, `${panel.panelName || "panel"}-files.zip`);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر تنزيل الملفات مجمعة."); }
  };

  const assignmentOptions = [
    { value: "page2", label: "المقاس والسمك" },
    { value: "page3", label: "صفحة النص" },
    { value: "page4", label: "المواصفات" },
    { value: "gallery", label: "صفحة الصور" },
  ];
  const cropFile = executionImageFiles.find((file) => String(file._id) === String(cropFileId));
  const cropTransform = cropFile ? { cropX: 50, zoom: 1, positionX: 50, positionY: 50, ...(executionDesign.transforms[String(cropFile._id)] || {}) } : null;

  const saveProductionStage = async () => {
    if (!stageDecision && !manufacturingNotesChanged) return toast.error("اختر حالة المرحلة أو عدّل الملاحظات أولًا.");
    if (stageDecision && !activeProductionStage) return toast.error("لا توجد مرحلة إنتاج نشطة حاليًا.");
    if (stageDecision === "delayed" && activeProductionStage.key !== "awaitingLaserDownload" && !delayReason) {
      return toast.error("اختر سبب التأخير أولًا.");
    }
    if (stageDecision === "delayed" && delayReason === "أخرى" && !delayDetails.trim()) {
      return toast.error("اكتب سبب التأخير أولًا.");
    }
    setBusy(true);
    try {
      const { data } = await updateManufacturingStage(project._id, {
        panelId: panel.panelId,
        stageKey: activeProductionStage?.key || manufacturing.currentStage,
        action: stageDecision || "notes",
        reason: delayReason,
        details: delayDetails,
        notes: manufacturingNotes,
      });
      setProject(withProjectMetadata(data.project, user?.name || project.lastUpdatedByName));
      const savedMessage = stageDecision === "completed"
        ? "تم حفظ اكتمال المرحلة والانتقال للمرحلة التالية بنجاح."
        : stageDecision === "delayed"
          ? "تم حفظ حالة التأخير وسببها بنجاح."
          : "تم حفظ الملاحظات العامة بنجاح.";
      setStageSavedFeedback({ message: savedMessage, savedAt: new Date().toISOString() });
      window.clearTimeout(stageSavedTimerRef.current);
      stageSavedTimerRef.current = window.setTimeout(() => setStageSavedFeedback(null), 5000);
      toast.success("تم حفظ تحديث المرحلة بنجاح.");
      setStageDecision("");
      setDelayReason("");
      setDelayDetails("");
    } catch (error) { toast.error(error.response?.data?.message || "تعذر حفظ تحديث مرحلة الإنتاج."); }
    finally { setBusy(false); }
  };

  // The execution workflow belongs to the panel, while the project folder
  // intentionally remains `inProgress` until every panel is fully completed.
  if (!quoteFinishedStatuses.includes(panel?.status)) return null;

  const isProductionTracking = ["filesReady", "downloadedToLaser"].includes(manufacturing.status)
    || productionTrackingStatuses.has(panel?.status);

  const deliveryStatusLabels = { none: "لم يُحدد موعد", pending: "بانتظار قرار مدير التنفيذ", accepted: "تم اعتماد الموعد", rejected: "الموعد غير مناسب" };
  const renderDeliverySchedule = () => {
    if (!deliveryScheduleAvailable) return null;
    if (!canRequestDeliverySchedule && !canRespondDeliverySchedule && deliverySchedule.status === "none") return null;
    return <section className={`panel-delivery-schedule ${deliverySchedule.status || "none"}`}>
      <header>
        <span><HiOutlineCalendar /></span>
        <div><h3>موعد انتهاء اللوحة</h3><p>تحديد واعتماد الموعد المتوقع لتسليم اللوحة.</p></div>
        <b>{deliveryStatusLabels[deliverySchedule.status] || deliveryStatusLabels.none}</b>
      </header>
      <div className="panel-delivery-schedule-body">
        <div className="panel-delivery-date-summary"><small>الموعد المطلوب</small><strong>{deliverySchedule.requestedDate ? formatProjectDate(deliverySchedule.requestedDate) : "لم يتم تحديده"}</strong>{deliverySchedule.respondedAt && <span>آخر قرار: {formatProjectDate(deliverySchedule.respondedAt, true)}</span>}</div>
        {canRequestDeliverySchedule && <div className="panel-delivery-request">
          <label className="panel-delivery-date-picker">
            <span className="panel-delivery-date-icon"><HiOutlineCalendar /></span>
            <span><small>موعد التسليم المقترح</small><strong>{formatDeliveryPickerDate(requestedDeliveryDate)}</strong></span>
            <em>متاح من {formatDeliveryPickerDate(minimumDeliveryDateValue())}</em>
            <input
              aria-label="اختيار موعد انتهاء اللوحة"
              type="date"
              inputMode="none"
              min={minimumDeliveryDateValue()}
              value={requestedDeliveryDate}
              onKeyDown={(event) => event.preventDefault()}
              onBeforeInput={(event) => event.preventDefault()}
              onPaste={(event) => event.preventDefault()}
              onDrop={(event) => event.preventDefault()}
              onChange={(event) => {
                if (isEgyptNonWorkingDate(event.target.value)) {
                  toast.error("الجمعة والعطلات الرسمية غير متاحة لاختيار موعد التسليم.");
                  return;
                }
                setRequestedDeliveryDate(event.target.value);
              }}
            />
          </label>
          <button type="button" onClick={requestDeliveryDate} disabled={busy || !requestedDeliveryDate}><HiOutlineCalendar />{deliverySchedule.status === "pending" ? "تحديث الموعد وإعادة الإرسال" : "إرسال الموعد لمدير التنفيذ"}</button>
        </div>}
        {canRespondDeliverySchedule && deliverySchedule.status === "pending" && <div className="panel-delivery-response"><label>ملاحظة القرار <small>(اختياري)</small><textarea value={deliveryResponseNote} onChange={(event) => setDeliveryResponseNote(event.target.value)} placeholder="اكتب توضيحًا للمندوب عند الحاجة..." /></label><div><button type="button" className="accept" onClick={() => respondToDeliveryDate("accepted")} disabled={busy}><HiOutlineCheckCircle /> نعم، يمكن التنفيذ</button><button type="button" className="reject" onClick={() => respondToDeliveryDate("rejected")} disabled={busy}><HiOutlineX /> لا، الموعد غير مناسب</button></div></div>}
        {deliverySchedule.responseNote && deliverySchedule.status !== "pending" && <aside><b>ملاحظة مدير التنفيذ</b><p>{deliverySchedule.responseNote}</p></aside>}
      </div>
    </section>;
  };

  if (isProductionTracking) return <section className="production-tracking-page" dir="rtl">
    <header className="production-tracking-titlebar">
      <h1>متابعة مراحل الإنتاج</h1>
      <button type="button" onClick={() => navigate("/projects")}><HiOutlineArrowLeft /> الرجوع للمشاريع</button>
    </header>

    <section className="production-project-overview">
      <div className="production-project-identity">
        <span className="production-panel-illustration"><HiOutlineViewGrid /></span>
        <div>
          <h2><bdi dir={getPanelNameDirection(panel.panelName)}>{panel.panelName}</bdi> - مشروع {project.client?.name || "غير محدد"}</h2>
          <button type="button" onClick={copyId} className="production-code-copy" title="نسخ رقم اللوحة"><HiOutlineClipboardCopy /><bdi dir="ltr">{panelReferenceCode}</bdi></button>
          <p>العميل: {project.client?.name || "غير محدد"}<i />المهندس: {assignedEngineer?.name || "غير محدد"}<i />تاريخ إنشاء المشروع: {formatProjectDate(project.createdAt)}</p>
        </div>
      </div>
      <div className={`production-project-facts ${canManageProductionStages ? "" : "compact"}`}>
        <div><span><HiOutlineUser /> آخر تحديث بواسطة</span><b>{lastProductionUpdater}</b></div>
        <div><span><HiOutlineClock /> تاريخ آخر تحديث</span><b>{formatProjectDate(lastProductionUpdateAt, true)}</b></div>
        {canManageProductionStages && <><div><span><HiOutlinePuzzle /> مرحلة المشروع</span><b className="production-phase-badge">{activeProductionStage?.title || "مكتمل"}</b></div>
        <div><span>الحالة الحالية</span><b className="production-state-badge">في الإنتاج</b></div></>}
      </div>
    </section>

    {renderDeliverySchedule()}

    <details className="production-files-accordion" open>
      <summary><span><HiOutlineFolder /><b>ملفات التصنيع</b><small>جميع الملفات المرفوعة من قبل المهندس</small></span><IoChevronDown className="production-files-chevron" /></summary>
      <div className="production-files-content">
        <div className="manufacturing-download-grid">
          {manufacturingFiles.map((file) => <article className="manufacturing-file-card" key={file._id || file.storageFileId}>
            <div className="manufacturing-file-card-heading">
              <span className={`manufacturing-file-icon ${manufacturingFileType(file).toLowerCase()}`}>
                {String(file.mimeType || "").startsWith("image/") ? <HiOutlinePhotograph /> : <HiOutlineDocumentText />}
              </span>
              <div><b title={file.fileName}>{file.fileName}</b><small>{formatFileSize(file.fileSize)} · {manufacturingFileType(file)}</small></div>
            </div>
            <div className="manufacturing-file-card-actions">
              <button type="button" className="manufacturing-file-download" onClick={() => downloadManufacturingFile(file)} disabled={!canDownloadManufacturing}><HiOutlineCloudDownload /> تحميل</button>
            </div>
          </article>)}
        </div>
        {(manufacturing.engineerNotes || manufacturing.notes) && <aside className="manufacturing-engineer-note"><b>ملاحظات المهندس مع الملفات</b><p>{manufacturing.engineerNotes || manufacturing.notes}</p></aside>}
        {canDownloadManufacturing && <button type="button" className="manufacturing-download-all" onClick={downloadAllManufacturingFiles}><HiOutlineCloudDownload /> تحميل جميع الملفات ZIP</button>}
      </div>
    </details>

    {canManageProductionStages && <section className="production-stages-board production-stages-redesign">
      <header><div><h2><HiOutlineViewGrid /> مراحل الإنتاج</h2><p>المرحلة الحالية فقط متاحة للتحديث، وباقي المراحل تتحرك تلقائيًا.</p></div></header>

      <div className="production-stage-stepper" aria-label="تقدم مراحل الإنتاج">
        {productionStages.map((stage, index) => <article key={stage.key} className={`production-stage-step stage-${index + 1} ${stage.status}`} aria-current={stage.status === "active" ? "step" : undefined}>
          <span className="production-stage-step-number">{stage.status === "completed" ? <HiOutlineCheckCircle /> : index + 1}</span>
          <span className="production-stage-step-icon">{stageIcon(stage.key)}</span>
          <div><b>{stage.title}</b><small>{stage.status === "completed" ? "تمت" : stage.status === "active" ? "المرحلة الحالية" : "لم تبدأ"}</small></div>
        </article>)}
      </div>

      {stageSavedFeedback && <div className="production-save-success" role="status"><HiOutlineCheckCircle /><div><b>تم الحفظ بنجاح</b><span>{stageSavedFeedback.message}</span></div></div>}

      {activeProductionStage ? <section className="production-active-stage-panel">
        <div className="production-active-stage-main">
          <header>
            <span className="production-active-stage-icon">{stageIcon(activeProductionStage.key)}</span>
            <div><small>المرحلة الحالية</small><h3>{activeProductionStage.title}</h3><p>{activeProductionStage.description}</p></div>
          </header>

          <div className="production-stage-decision-grid">
            <button type="button" className={stageDecision === "completed" ? "selected completed" : ""} onClick={() => { setStageDecision("completed"); setDelayReason(""); setDelayDetails(""); setStageSavedFeedback(null); }}><HiOutlineCheckCircle /><span><b>تمت المرحلة</b><small>حفظ الإتمام والانتقال للمرحلة التالية</small></span></button>
            <button type="button" className={stageDecision === "delayed" ? "selected delayed" : ""} onClick={() => { setStageDecision("delayed"); setStageSavedFeedback(null); }}><HiOutlineExclamationCircle /><span><b>لم تتم</b><small>تسجيل تأخير مع توضيح السبب</small></span></button>
          </div>

          {stageDecision === "delayed" && activeProductionStage.key === "awaitingLaserDownload" && <div className="production-fixed-warning"><HiOutlineExclamationCircle /> برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة</div>}
          {stageDecision === "delayed" && activeProductionStage.key !== "awaitingLaserDownload" && <div className="production-delay-fields production-active-delay-fields">
            <label>سبب التأخير<ExecutionSelect value={delayReason} placeholder="اختر سبب التأخير" onChange={(value) => { setDelayReason(value); if (value !== "أخرى") setDelayDetails(""); }} options={(productionDelayReasons[activeProductionStage.key] || []).map((reason) => ({ value: reason, label: reason }))} /></label>
            {delayReason === "أخرى" && <label>اكتب سبب التأخير<textarea value={delayDetails} onChange={(event) => setDelayDetails(event.target.value)} placeholder="وضح سبب التأخير..." /></label>}
          </div>}
        </div>

        <aside className="production-active-stage-side">
          <label><span>ملاحظات عامة <small>(اختياري)</small></span><textarea value={manufacturingNotes} onChange={(event) => { setManufacturingNotes(event.target.value); setStageSavedFeedback(null); }} placeholder="اكتب أي ملاحظات إضافية هنا..." /></label>
          {stageHasUnsavedChanges && <p className="production-unsaved-note"><span /> توجد تعديلات لم تُحفظ بعد</p>}
          <button type="button" className="production-save-button" onClick={saveProductionStage} disabled={busy || !stageHasUnsavedChanges}>{busy ? "جاري حفظ التحديث..." : !stageDecision && manufacturingNotesChanged ? "حفظ الملاحظات" : "حفظ تحديث المرحلة"}</button>
          {!stageDecision && manufacturingNotesChanged && <small className="production-notes-only-help">يمكن حفظ الملاحظات وحدها دون اختيار تمت أو لم تتم.</small>}
          <small className="production-last-update">{latestProductionUpdate?.createdAt ? `آخر تحديث محفوظ: ${new Date(latestProductionUpdate.createdAt).toLocaleString("ar-EG")}` : "لم يُحفظ تحديث لهذه المرحلة بعد"}</small>
        </aside>
      </section> : <div className="production-all-complete"><HiOutlineCheckCircle /><div><h3>اكتملت جميع مراحل الإنتاج</h3><p>تم إنهاء تنفيذ هذه اللوحة بالكامل.</p></div></div>}

      <details className="production-history-disclosure">
        <summary><span><HiOutlineClock /><span><b>سجل تحديثات المراحل</b><small>عرض الحالات والأسباب والملاحظات التي تم حفظها</small></span></span><span className="production-history-count">{productionHistory.length} تحديث <IoChevronDown /></span></summary>
        <div className="production-history-list">{productionHistory.length === 0 ? <p>لا توجد تحديثات مسجلة حتى الآن.</p> : [...productionHistory].reverse().map((item, index) => <article key={`${item.createdAt}-${index}`}>
          <span className={`production-history-mark ${item.action}`} />
          <div><b>{item.action === "completed" ? "تمت المرحلة" : item.action === "delayed" ? "تم تسجيل تأخير" : "تم تحديث الملاحظات"}</b><small>{productionStageTitle(item.stageKey)}</small>{(item.reason || item.details) && <p>{item.reason === "أخرى" ? item.details : item.reason || item.details}</p>}{item.notes && <p className="production-history-notes">ملاحظات: {item.notes}</p>}</div>
          <div className="production-history-meta"><span>{item.actorName || "مستخدم النظام"}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleString("ar-EG") : ""}</time></div>
        </article>)}</div>
      </details>
    </section>}
  </section>;

  return <section className="execution-pdf-workspace" dir="rtl">
    <header className="execution-pdf-heading">
      <div>
        <span className="execution-phase-label">مرحلة التنفيذ</span>
        <h2>PDF التنفيذ — <bdi dir={getPanelNameDirection(panel?.panelName)}>{panel?.panelName}</bdi></h2>
        <p>عرض السعر محفوظ، وهذه المساحة مخصصة لملفات اعتماد تنفيذ اللوحة.</p>
      </div>
      <button type="button" className="project-id-copy" onClick={copyId} title="نسخ رقم اللوحة">
        <HiOutlineClipboardCopy />
        <span><small>{copied ? "تم النسخ" : "رقم اللوحة"}</small><bdi dir="ltr">{panelReferenceCode}</bdi></span>
      </button>
    </header>

    {renderDeliverySchedule()}

    {workflow.status === "notRequested" && <div className="execution-order-card">
      <div><h3>لم يصدر أمر PDF تنفيذ لهذه اللوحة بعد</h3><p>اختر سمك الصاج الذي أكده العميل، ثم أصدر أمر التنفيذ.</p></div>
      {canIssueOrder && <div className="execution-order-controls">
        <label>سمك الصاج المؤكد
          <ExecutionSelect value={selectedSteelThickness} placeholder="اختر السمك" options={(panel?.thickness || []).map((thickness) => ({ value: thickness, label: `${thickness} mm` }))} onChange={setSelectedSteelThickness} />
        </label>
        <button type="button" onClick={issueOrder} disabled={busy || savingProject || !selectedSteelThickness}>{busy ? "جاري الإصدار..." : "إصدار أمر PDF تنفيذ"}</button>
      </div>}
    </div>}

    {workflow.status === "requested" && canPreparePdf && <>
      <section className="execution-pdf-builder">
        <header><span className="execution-phase-label">إنشاء الملف</span><h3>محرر PDF التنفيذ</h3><p>ارفع الصور مرة واحدة، ثم اختر مكان كل صورة واضبط القص قبل إنشاء الملف.</p><div className={`execution-draft-save-status ${executionDesignSaveState}`}>{executionDesignSaveState === "saved" ? <HiOutlineCheckCircle /> : executionDesignSaveState === "error" || executionDesignSaveState === "offline" ? <HiOutlineExclamationCircle /> : <HiOutlineCloudUpload />}<span>{executionDesignSaveState === "saving" ? "جاري حفظ مسودة PDF التنفيذ..." : executionDesignSaveState === "pending" ? "توجد تعديلات في انتظار الحفظ..." : executionDesignSaveState === "saved" ? "تم حفظ مسودة PDF التنفيذ" : executionDesignSaveState === "offline" ? "لا يوجد اتصال — المسودة محفوظة على هذا الجهاز وستُرفع تلقائيًا" : executionDesignSaveState === "error" ? "تعذر الحفظ على الخادم — المسودة محفوظة على هذا الجهاز" : "سيتم حفظ أي تعديل تلقائيًا"}</span></div></header>
        <div className="execution-builder-summary editable">
          <label><b>Panel size</b><input dir="ltr" value={executionDesign.panelSize} onChange={(event) => setExecutionDesign((current) => ({ ...current, panelSize: event.target.value }))} /></label>
          <label><b>Steel thickness</b><input dir="ltr" value={executionDesign.steelThickness} onChange={(event) => setExecutionDesign((current) => ({ ...current, steelThickness: event.target.value }))} /></label>
          <label><b>Paint</b><input dir="ltr" value={executionDesign.paint} onChange={(event) => setExecutionDesign((current) => ({ ...current, paint: event.target.value }))} /></label>
        </div>
        <section className={`execution-image-library ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); uploadFiles(event.dataTransfer.files, "gallery"); }}>
          <div className="execution-library-heading"><div><h4>صور PDF التنفيذ</h4><p>القص الافتراضي يحذف 25% من اليمين و25% من اليسار مع توسيط الصورة.</p></div><button type="button" onClick={() => executionInputRefs.current.gallery?.click()} disabled={uploadingExecution}><HiOutlineCloudUpload /> {uploadingExecution ? "جاري رفع الصور..." : "رفع الصور"}</button></div>
          {uploadingExecution && <div className="section-loading-overlay" role="status"><span className="route-spinner" /> جاري رفع وتجهيز الصور...</div>}
          <input ref={(node) => { executionInputRefs.current.gallery = node; }} type="file" accept="image/*" multiple hidden onChange={(event) => { const selected = Array.from(event.target.files || []); event.target.value = ""; uploadFiles(selected, "gallery"); }} />
          {executionImageFiles.length === 0 ? <div className="execution-library-empty"><HiOutlinePhotograph /><b>ارفع خمس أو ست صور للبدء</b></div> : <div className="execution-library-grid">
            {executionImageFiles.map((file) => <article key={file._id} className="execution-library-card">
              <button type="button" className="execution-library-preview" onClick={() => setCropFileId(String(file._id))}>
                {executionPreviews[String(file._id)] ? <img src={executionPreviews[String(file._id)]} alt={file.fileName} style={{ clipPath: `inset(0 ${(executionDesign.transforms[String(file._id)]?.cropX ?? 50) / 2}% 0 ${(executionDesign.transforms[String(file._id)]?.cropX ?? 50) / 2}%)`, transform: `translate(-50%, -50%) scale(${executionDesign.transforms[String(file._id)]?.zoom ?? 1})`, transformOrigin: `${executionDesign.transforms[String(file._id)]?.positionX ?? 50}% ${executionDesign.transforms[String(file._id)]?.positionY ?? 50}%` }} /> : <HiOutlinePhotograph />}
                <span>تعديل القص</span>
              </button>
              <div className="execution-image-assignments">{assignmentOptions.map((option) => <button type="button" key={option.value} className={isImageAssigned(file._id, option.value) ? "selected" : ""} onClick={() => toggleImageAssignment(file._id, option.value)}>{option.label}</button>)}</div>
              <button type="button" className="execution-library-delete" onClick={() => removeExecutionFile(file)} disabled={busy}><HiOutlineX /> حذف</button>
            </article>)}
          </div>}
        </section>
        <div className="execution-builder-grid inputs-only">
          <article className="execution-builder-content-card"><label>نص الصفحة الثالثة<textarea value={executionDesign.page3Text} onChange={(event) => setExecutionDesign((current) => ({ ...current, page3Text: event.target.value }))} placeholder="اكتب وصف اللوحة والملاحظات الفنية التي ستظهر في الصفحة..." /></label></article>
          <article className="execution-builder-content-card">
            <div className="execution-page4-heading"><h4>بيانات الصفحة الرابعة</h4><button type="button" onClick={() => setExecutionDesign((current) => ({ ...current, page4Lines: [...current.page4Lines, ""] }))}>+ إضافة سطر</button></div>
            <div className="execution-page4-lines">{executionDesign.page4Lines.map((line, index) => <div key={index}><input dir="ltr" value={line} onChange={(event) => setExecutionDesign((current) => ({ ...current, page4Lines: current.page4Lines.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} /><button type="button" onClick={() => setExecutionDesign((current) => ({ ...current, page4Lines: current.page4Lines.filter((_, itemIndex) => itemIndex !== index) }))}><HiOutlineX /></button></div>)}</div>
          </article>
        </div>
      </section>
      {cropFile && <div className="execution-crop-modal" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setCropFileId(""); }}>
        <section><header><div><h3>ضبط قص الصورة</h3><p>{cropFile.fileName}</p></div><button type="button" onClick={() => setCropFileId("")}><HiOutlineX /></button></header>
          <div className="execution-crop-preview">{executionPreviews[String(cropFile._id)] && <img src={executionPreviews[String(cropFile._id)]} alt="معاينة القص" style={{ clipPath: `inset(0 ${cropTransform.cropX / 2}% 0 ${cropTransform.cropX / 2}%)`, transform: `translate(-50%, -50%) scale(${cropTransform.zoom})`, transformOrigin: `${cropTransform.positionX}% ${cropTransform.positionY}%` }} />}</div>
          <div className="execution-crop-controls">
            <label>القص الأفقي: {cropTransform.cropX}%<input type="range" min="0" max="75" step="1" value={cropTransform.cropX} onChange={(event) => updateTransform(String(cropFile._id), "cropX", event.target.value)} /></label>
            <label>التكبير: {Number(cropTransform.zoom).toFixed(1)}×<input type="range" min="1" max="3" step="0.1" value={cropTransform.zoom} onChange={(event) => updateTransform(String(cropFile._id), "zoom", event.target.value)} /></label>
            <label>الموضع أفقيًا<input type="range" min="0" max="100" value={cropTransform.positionX} onChange={(event) => updateTransform(String(cropFile._id), "positionX", event.target.value)} /></label>
            <label>الموضع رأسيًا<input type="range" min="0" max="100" value={cropTransform.positionY} onChange={(event) => updateTransform(String(cropFile._id), "positionY", event.target.value)} /></label>
          </div>
          <button type="button" className="execution-crop-done" onClick={() => setCropFileId("")}>تم</button>
        </section>
      </div>}
      <div className="execution-pdf-actions">
        <button type="button" className="skip-execution-btn" onClick={skip} disabled={busy || generatingExecution || previewingExecution}>تخطي هذه المرحلة</button>
        <button type="button" className="preview-execution-pdf-btn" onClick={previewExecutionPdf} disabled={generatingExecution || previewingExecution}><HiOutlineEye /> {previewingExecution ? "جاري تجهيز المعاينة..." : "معاينة PDF التنفيذ"}</button>
        <button type="button" className="finish-execution-pdf-btn" onClick={generateAndFinish} disabled={generatingExecution || previewingExecution}>{generatingExecution ? "جاري إنشاء الملف..." : "إنشاء PDF التنفيذ وإرساله للمراجعة"}</button>
      </div>
    </>}

    {workflow.status === "requested" && !canPreparePdf && <ExecutionStatusCard tone="info" icon={<HiOutlineClock />} title="تم إصدار أمر PDF التنفيذ" description="اللوحة الآن بانتظار تجهيز الملف من المهندس المسؤول." />}
    {workflow.status === "ready" && <>
      <ExecutionStatusCard tone="success" icon={<HiOutlineCheckCircle />} title="ملف التنفيذ جاهز للمراجعة" description="راجع الملف، ثم اختر تعديل اللوحة أو تأكيد التنفيذ." />
      {canReviewPdf && <div className="execution-review-actions">
        <PanelEditAction panel={panel} onStart={(options) => beginEditing(panel._id || panel.panelId, options)} className="request-changes-btn" label="تعديل اللوحة" />
        <button type="button" className="confirm-execution-btn" onClick={confirmExecution} disabled={busy}>تأكيد التنفيذ</button>
      </div>}
    </>}
    {workflow.status === "changesRequested" && <ExecutionStatusCard tone="attention" icon={<HiOutlineExclamationCircle />} title="تم إرسال طلب التعديل" description="فُتحت بيانات التسعير للمهندس مع الاحتفاظ بجميع القيم الحالية." />}
    {workflow.status === "skipped" && <ExecutionStatusCard tone="info" icon={<HiOutlineLightningBolt />} title="تم تخطي ملف PDF التنفيذ" description="انتقلت اللوحة مباشرةً إلى مرحلة رفع ملفات التصنيع." />}
    {workflow.status === "confirmed" && manufacturing.status !== "awaitingFiles" && <ExecutionStatusCard tone="success" icon={<HiOutlineCheckCircle />} title="تم تأكيد التنفيذ" description="فُتحت مرحلة ملفات التصنيع بنجاح." />}

    {manufacturing.status === "awaitingFiles" && canPrepareManufacturing && <section className="manufacturing-files-section">
      <div>
        <span className="execution-phase-label">ملفات التصنيع</span>
        <h3>رفع صور اختبار مرحلة التصنيع</h3>
        <p>مؤقتًا ارفع صورة أو أكثر لاختبار دورة التنفيذ كاملة. سنفعّل ملفات DXF وDWG بعد الانتقال إلى Cloudflare R2.</p>
      </div>
      <div
        className={`execution-dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); uploadManufacturingFiles(event.dataTransfer.files); }}
        onClick={() => manufacturingInputRef.current?.click()}
      >
        {uploadingManufacturing && <div className="section-loading-overlay" role="status"><span className="route-spinner" /> جاري رفع ملفات التصنيع...</div>}
        <HiOutlineCloudUpload />
        <h3>اسحب صور التصنيع هنا</h3>
        <p>أو اضغط لاختيار صورة أو أكثر من الجهاز.</p>
        <input
          ref={manufacturingInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files || []);
            event.target.value = "";
            uploadManufacturingFiles(selectedFiles);
          }}
        />
      </div>
      {manufacturingFiles.length > 0 && <div className="manufacturing-download-grid manufacturing-uploaded-grid">
        {manufacturingFiles.map((file) => <article className="manufacturing-file-card" key={file._id || file.storageFileId}>
          <div className="manufacturing-file-card-heading">
            <span className={`manufacturing-file-icon ${manufacturingFileType(file).toLowerCase()}`}>
              {String(file.mimeType || "").startsWith("image/") ? <HiOutlinePhotograph /> : <HiOutlineDocumentText />}
            </span>
            <div><b title={file.fileName}>{file.fileName}</b><small>{formatFileSize(file.fileSize)} · {manufacturingFileType(file)}</small></div>
          </div>
          <div className="manufacturing-file-card-actions">
            <button type="button" className="manufacturing-file-download" onClick={() => downloadManufacturingFile(file)}><HiOutlineCloudDownload /> تحميل</button>
          </div>
        </article>)}
      </div>}
      <label className="manufacturing-notes-label">معلومات إضافية للملفات
        <textarea value={engineerFileNotes} onChange={(event) => setEngineerFileNotes(event.target.value)} placeholder="اكتب أي تعليمات أو معلومات يحتاجها مدير التنفيذ..." />
      </label>
      <button type="button" className="finish-execution-pdf-btn" onClick={finishManufacturing} disabled={finishingManufacturing || uploadingManufacturing || manufacturingFiles.length === 0}>{finishingManufacturing ? "جاري حفظ البيانات..." : "حفظ وإتمام رفع ملفات التصنيع"}</button>
    </section>}

    {manufacturing.status === "awaitingFiles" && !canPrepareManufacturing && <ExecutionStatusCard tone="info" icon={<HiOutlineClock />} title="تم تأكيد التنفيذ" description="اللوحة الآن بانتظار رفع المهندس لملفات التصنيع." />}

  </section>;
}

export default ExecutionPdfWorkspace;
