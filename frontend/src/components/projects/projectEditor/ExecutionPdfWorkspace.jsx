import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineClipboardCopy, HiOutlineCloudDownload, HiOutlineCloudUpload, HiOutlineClock, HiOutlineColorSwatch, HiOutlineCube, HiOutlineDocumentText, HiOutlineFolder, HiOutlineLightningBolt, HiOutlinePhotograph, HiOutlinePuzzle, HiOutlineUser, HiOutlineViewGrid, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import { getPanelNameDirection } from "../../../utils/panelNameDirection";
import {
  finishExecutionPdf,
  deleteExecutionPdfFile,
  finishManufacturingFiles,
  confirmProjectExecution,
  getExecutionPdfFile,
  getManufacturingArchive,
  getManufacturingFile,
  requestExecutionPdf,
  requestExecutionPdfChanges,
  saveExecutionPdfDesign,
  skipExecutionPdf,
  uploadExecutionPdfFile,
  uploadManufacturingFile,
  updateManufacturingStage,
} from "../../../services/projectsAPI";
import { createExecutionPdf } from "../../../utils/executionPdf";

const quoteFinishedStatuses = ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"];

const productionStageDefinitions = [
  { key: "awaitingLaserDownload", title: "تنزيل الملفات إلى الليزر", description: "إرسال ملفات اللوحة إلى ماكينة الليزر" },
  { key: "laser", title: "الانتهاء من العمل على الليزر", description: "إتمام قص أجزاء اللوحة على الليزر" },
  { key: "manufacturing", title: "الانتهاء من التصنيع", description: "تصنيع وتجهيز أجزاء اللوحة" },
  { key: "painting", title: "الانتهاء من رش/دهان اللوحة", description: "إتمام تجهيز السطح والدهان" },
  { key: "assembly", title: "الانتهاء من التجميع", description: "إتمام تجميع اللوحة بالكامل" },
];

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

function ExecutionPdfWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, setProject, activePanel, savingProject } = useProject();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const executionInputRefs = useRef({});
  const manufacturingInputRef = useRef(null);
  const panel = project.panels?.[activePanel];
  const workflow = panel?.executionPdf || { status: "notRequested", files: [] };
  const files = useMemo(() => workflow.files || [], [workflow.files]);
  const manufacturing = panel?.manufacturing || { status: "notStarted", files: [], notes: "" };
  const manufacturingFiles = useMemo(() => manufacturing.files || [], [manufacturing.files]);
  const [manufacturingNotes, setManufacturingNotes] = useState(manufacturing.notes || "");
  const [stageDecision, setStageDecision] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [delayDetails, setDelayDetails] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSteelThickness, setSelectedSteelThickness] = useState(workflow.steelThickness || "");
  const [executionDesign, setExecutionDesign] = useState({ page3Text: "", metalLockCount: 4, includeGroundBar: true });
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
  const withProjectMetadata = (nextProject, updatedByName = project.lastUpdatedByName) => ({
    ...nextProject,
    marketingRepresentative: project.marketingRepresentative || nextProject.marketingRepresentative,
    assignedEngineer: project.assignedEngineer || nextProject.assignedEngineer,
    lastUpdatedByName: updatedByName || nextProject.lastUpdatedByName,
  });

  useEffect(() => {
    setManufacturingNotes(manufacturing.notes || "");
    setStageDecision("");
    setDelayReason("");
    setDelayDetails("");
  }, [panel?.panelId, manufacturing.notes, manufacturing.currentStage]);

  useEffect(() => {
    setSelectedSteelThickness(workflow.steelThickness || "");
    setExecutionDesign({
      page3Text: workflow.design?.page3Text || "",
      metalLockCount: workflow.design?.metalLockCount ?? 4,
      includeGroundBar: workflow.design?.includeGroundBar !== false,
    });
  }, [panel?.panelId, workflow.steelThickness, workflow.design?.page3Text, workflow.design?.metalLockCount, workflow.design?.includeGroundBar]);

  const productionStages = useMemo(() => {
    const currentKey = productionStageDefinitions.some((stage) => stage.key === manufacturing.currentStage)
      ? manufacturing.currentStage
      : "awaitingLaserDownload";
    const currentIndex = productionStageDefinitions.findIndex((stage) => stage.key === currentKey);
    const stored = new Map((manufacturing.productionStages || []).map((stage) => [stage.key, stage]));
    return productionStageDefinitions.map((definition, index) => ({
      ...definition,
      ...(stored.get(definition.key) || {}),
      status: stored.get(definition.key)?.status || (index < currentIndex ? "completed" : index === currentIndex ? "active" : "pending"),
    }));
  }, [manufacturing.currentStage, manufacturing.productionStages]);
  const activeProductionStage = productionStages.find((stage) => stage.status === "active");
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
    await navigator.clipboard.writeText(project._id);
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
    setBusy(true);
    try {
      let latestProject = project;
      for (const file of filesToUpload) {
        const { data } = await uploadExecutionPdfFile(project._id, panel.panelId, file, purpose);
        latestProject = data.project;
      }
      setProject(latestProject);
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر رفع الملف.");
    } finally { setBusy(false); }
  };

  const executionFilesByPurpose = useMemo(() => files.reduce((groups, file) => {
    const purpose = file.purpose || "legacy";
    groups[purpose] = [...(groups[purpose] || []), file];
    return groups;
  }, {}), [files]);

  const generateAndFinish = async () => {
    const requiredPurposes = ["page2", "page3", "page4"];
    const missing = requiredPurposes.find((purpose) => !executionFilesByPurpose[purpose]?.length);
    if (missing) return toast.error("أضف صور الصفحات الثانية والثالثة والرابعة أولًا.");
    if (!executionFilesByPurpose.gallery?.length) return toast.error("أضف صورة واحدة على الأقل لصفحة الصور.");
    if (!executionDesign.page3Text.trim()) return toast.error("اكتب محتوى الصفحة الثالثة أولًا.");
    setBusy(true);
    const objectUrls = [];
    try {
      const { data: designData } = await saveExecutionPdfDesign(project._id, panel.panelId, executionDesign);
      setProject(withProjectMetadata(designData.project, user?.name || project.lastUpdatedByName));
      const images = {};
      for (const purpose of ["page2", "page3", "page4", "gallery"]) {
        images[purpose] = [];
        for (const file of executionFilesByPurpose[purpose] || []) {
          const { data } = await getExecutionPdfFile(project._id, panel.panelId, file._id);
          const url = URL.createObjectURL(data);
          objectUrls.push(url);
          images[purpose].push(url);
        }
      }
      const pdfBlob = await createExecutionPdf({
        panel,
        steelThickness: workflow.steelThickness,
        ...executionDesign,
        images,
      });
      const generatedFile = new File([pdfBlob], `${panel.panelName || panel.panelCode || "panel"}-execution.pdf`, { type: "application/pdf" });
      const { data: uploadData } = await uploadExecutionPdfFile(project._id, panel.panelId, generatedFile, "generatedPdf");
      setProject(withProjectMetadata(uploadData.project, user?.name || project.lastUpdatedByName));
      const { data: finishData } = await finishExecutionPdf(project._id, panel.panelId);
      setProject(withProjectMetadata(finishData.project, user?.name || project.lastUpdatedByName));
      toast.success("تم إنشاء PDF التنفيذ وإرساله للمراجعة بنجاح.");
      if (finishData.notification?.includes("تعذر")) toast.error(finishData.notification);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "تعذر إنشاء PDF التنفيذ.");
    } finally {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      setBusy(false);
    }
  };

  const openFile = async (file) => {
    try {
      const { data } = await getExecutionPdfFile(project._id, panel.panelId, file._id);
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر فتح الملف."); }
  };

  const removeExecutionFile = async (file) => {
    setBusy(true);
    try {
      const { data } = await deleteExecutionPdfFile(project._id, panel.panelId, file._id);
      setProject(withProjectMetadata(data.project));
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

  const requestChanges = async () => {
    setBusy(true);
    try {
      const { data } = await requestExecutionPdfChanges(project._id, panel.panelId);
      setProject(data.project);
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر فتح المشروع للتعديل."); }
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

  const uploadManufacturingFiles = async (selectedFiles) => {
    const incoming = Array.from(selectedFiles || []).filter((file) => file?.name);
    const selected = incoming.filter(isManufacturingTestImage);
    if (!selected.length) return toast.error("اختر ملفًا واحدًا على الأقل.");
    if (selected.length !== incoming.length) {
      toast.error("مرحلة التجربة تقبل الصور فقط حاليًا.");
      return;
    }
    setBusy(true);
    try {
      let latestProject = project;
      for (const file of selected) {
        const { data } = await uploadManufacturingFile(project._id, panel.panelId, file);
        latestProject = data.project;
      }
      setProject(latestProject);
    } catch (error) { toast.error(error.response?.data?.message || error.message || "تعذر رفع ملف التصنيع."); }
    finally { setBusy(false); }
  };

  const finishManufacturing = async () => {
    setBusy(true);
    try {
      const { data } = await finishManufacturingFiles(project._id, panel.panelId, manufacturingNotes);
      setProject(withProjectMetadata(data.project, user?.name || project.lastUpdatedByName));
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر إتمام ملفات التصنيع."); }
    finally { setBusy(false); }
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

  const renderExecutionImageSlot = (purpose, title, description, multiple = false) => {
    const purposeFiles = executionFilesByPurpose[purpose] || [];
    return <article className="execution-builder-upload-card">
      <div><span className="execution-builder-page-icon"><HiOutlinePhotograph /></span><h4>{title}</h4><p>{description}</p></div>
      {purposeFiles.length > 0 && <div className="execution-builder-files">
        {purposeFiles.map((file) => <span key={file._id || file.storageFileId}>
          <button type="button" onClick={() => openFile(file)} title={file.fileName}>{file.fileName}</button>
          <button type="button" onClick={() => removeExecutionFile(file)} disabled={busy} aria-label="حذف الصورة"><HiOutlineX /></button>
        </span>)}
      </div>}
      <button type="button" className="execution-builder-pick" onClick={() => executionInputRefs.current[purpose]?.click()} disabled={busy}>
        <HiOutlineCloudUpload /> {multiple ? "إضافة صور" : purposeFiles.length ? "تغيير الصورة" : "اختيار صورة"}
      </button>
      <input ref={(node) => { executionInputRefs.current[purpose] = node; }} type="file" accept="image/*" multiple={multiple} hidden onChange={(event) => {
        const selected = Array.from(event.target.files || []);
        event.target.value = "";
        uploadFiles(selected, purpose);
      }} />
    </article>;
  };

  const saveProductionStage = async () => {
    if (!activeProductionStage) return;
    if (!stageDecision) return toast.error("اختر تمت أو لم تتم أولًا.");
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
        stageKey: activeProductionStage.key,
        action: stageDecision,
        reason: delayReason,
        details: delayDetails,
        notes: manufacturingNotes,
      });
      setProject(withProjectMetadata(data.project, user?.name || project.lastUpdatedByName));
      setStageDecision("");
      setDelayReason("");
      setDelayDetails("");
    } catch (error) { toast.error(error.response?.data?.message || "تعذر حفظ تحديث مرحلة الإنتاج."); }
    finally { setBusy(false); }
  };

  // The execution workflow belongs to the panel, while the project folder
  // intentionally remains `inProgress` until every panel is fully completed.
  if (!quoteFinishedStatuses.includes(panel?.status)) return null;

  if (["filesReady", "downloadedToLaser"].includes(manufacturing.status)) return <section className="production-tracking-page" dir="rtl">
    <header className="production-tracking-titlebar">
      <h1>متابعة مراحل الإنتاج</h1>
      <button type="button" onClick={() => navigate("/projects")}><HiOutlineArrowLeft /> الرجوع للمشاريع</button>
    </header>

    <section className="production-project-overview">
      <div className="production-project-identity">
        <span className="production-panel-illustration"><HiOutlineViewGrid /></span>
        <div>
          <h2><bdi dir={getPanelNameDirection(panel.panelName)}>{panel.panelName}</bdi> - مشروع {project.client?.name || "غير محدد"}</h2>
          <button type="button" onClick={copyId} className="production-code-copy"><HiOutlineClipboardCopy /><b dir="ltr">PRJ-{String(project._id || "").slice(-6).toUpperCase()}</b></button>
          <p>العميل: {project.client?.name || "غير محدد"}<i />المهندس: {project.assignedEngineer?.name || "غير محدد"}<i />تاريخ إنشاء المشروع: {formatProjectDate(project.createdAt)}</p>
        </div>
      </div>
      <div className={`production-project-facts ${canManageProductionStages ? "" : "compact"}`}>
        <div><span><HiOutlineUser /> آخر تحديث بواسطة</span><b>{project.lastUpdatedByName || project.assignedEngineer?.name || "غير محدد"}</b></div>
        <div><span><HiOutlineClock /> تاريخ آخر تحديث</span><b>{formatProjectDate(project.updatedAt, true)}</b></div>
        {canManageProductionStages && <><div><span><HiOutlinePuzzle /> مرحلة المشروع</span><b className="production-phase-badge">{activeProductionStage?.title || "مكتمل"}</b></div>
        <div><span>الحالة الحالية</span><b className="production-state-badge">في الإنتاج</b></div></>}
      </div>
    </section>

    <details className="production-files-accordion" open>
      <summary><span><HiOutlineFolder /><b>ملفات التصنيع</b><small>جميع الملفات المرفوعة من قبل المهندس</small></span><span className="production-files-chevron">⌄</span></summary>
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
        {canDownloadManufacturing && <button type="button" className="manufacturing-download-all" onClick={downloadAllManufacturingFiles}><HiOutlineCloudDownload /> تحميل جميع الملفات ZIP</button>}
      </div>
    </details>

    {canManageProductionStages && <section className="production-stages-board">
      <header><div><h2><HiOutlineViewGrid /> مراحل الإنتاج</h2><p>قم بتحديث حالة كل مرحلة يوميًا</p></div></header>
      <div className="production-stages-track">
        {productionStages.map((stage, index) => <article key={stage.key} className={`production-stage-card stage-${index + 1} ${stage.status}`}>
          <span className="production-stage-number">{index + 1}</span>
          <div className="production-stage-title"><span className="production-stage-icon">{stageIcon(stage.key)}</span><div><h4>{stage.title}</h4><p>{stage.description}</p></div></div>
          <div className="production-stage-choice-line">
            <label><input type="radio" disabled={stage.status !== "active"} checked={stage.status === "completed" || (stage.status === "active" && stageDecision === "completed")} onChange={() => setStageDecision("completed")} /> تمت</label>
            <label><input type="radio" disabled={stage.status !== "active"} checked={stage.status === "active" && stageDecision === "delayed"} onChange={() => setStageDecision("delayed")} /> لم تتم</label>
          </div>
          {stage.status === "active" && stageDecision === "delayed" && stage.key === "awaitingLaserDownload" && <div className="production-fixed-warning">برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة</div>}
          {stage.status === "active" && stageDecision === "delayed" && stage.key !== "awaitingLaserDownload" && <div className="production-delay-fields">
            <label>سبب التأخير<select value={delayReason} onChange={(event) => { setDelayReason(event.target.value); if (event.target.value !== "أخرى") setDelayDetails(""); }}><option value="">اختر سبب التأخير</option>{(productionDelayReasons[stage.key] || []).map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>
            {delayReason === "أخرى" && <label>سبب التأخير<textarea value={delayDetails} onChange={(event) => setDelayDetails(event.target.value)} placeholder="اكتب سبب التأخير..." /></label>}
          </div>}
        </article>)}
      </div>
    </section>}

    {canManageProductionStages && <section className="production-footer-controls">
      <label><span>ملاحظات عامة (اختياري)</span><textarea value={manufacturingNotes} onChange={(event) => setManufacturingNotes(event.target.value)} placeholder="اكتب أي ملاحظات إضافية هنا..." /></label>
      <div><button type="button" className="production-history-toggle" onClick={() => setHistoryOpen((value) => !value)}><HiOutlineClock /> عرض سجل التحديثات</button><button type="button" className="production-save-button" onClick={saveProductionStage} disabled={busy || !activeProductionStage || !stageDecision}>{busy ? "جاري الحفظ..." : "حفظ التحديثات"}</button></div>
      {historyOpen && <div className="production-history-list">{(manufacturing.productionHistory || []).length === 0 ? <p>لا توجد تحديثات مسجلة حتى الآن.</p> : [...manufacturing.productionHistory].reverse().map((item, index) => <div key={`${item.createdAt}-${index}`}><b>{item.action === "completed" ? "تمت المرحلة" : item.action === "delayed" ? "تم تسجيل تأخير" : "تم تحديث الملاحظات"}</b><span>{item.reason === "أخرى" ? item.details : item.reason || item.details || ""}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleString("ar-EG") : ""}</time></div>)}</div>}
    </section>}
  </section>;

  return <section className="execution-pdf-workspace" dir="rtl">
    <header className="execution-pdf-heading">
      <div>
        <span className="execution-phase-label">مرحلة التنفيذ</span>
        <h2>PDF التنفيذ — <bdi dir={getPanelNameDirection(panel?.panelName)}>{panel?.panelName}</bdi></h2>
        <p>عرض السعر محفوظ، وهذه المساحة مخصصة لملفات اعتماد تنفيذ اللوحة.</p>
      </div>
      <button type="button" className="project-id-copy" onClick={copyId} title="نسخ ID المشروع">
        <HiOutlineClipboardCopy />
        <span><small>{copied ? "تم النسخ" : "رقم المشروع"}</small><b dir="ltr">{project._id}</b></span>
      </button>
    </header>

    {workflow.status === "notRequested" && <div className="execution-order-card">
      <div><h3>لم يصدر أمر PDF تنفيذ لهذه اللوحة بعد</h3><p>اختر سمك الصاج الذي أكده العميل، ثم أصدر أمر التنفيذ.</p></div>
      {canIssueOrder && <div className="execution-order-controls">
        <label>سمك الصاج المؤكد
          <select value={selectedSteelThickness} onChange={(event) => setSelectedSteelThickness(event.target.value)}>
            <option value="">اختر السمك</option>
            {(panel?.thickness || []).map((thickness) => <option key={thickness} value={thickness}>{thickness} mm</option>)}
          </select>
        </label>
        <button type="button" onClick={issueOrder} disabled={busy || savingProject || !selectedSteelThickness}>{busy ? "جاري الإصدار..." : "إصدار أمر PDF تنفيذ"}</button>
      </div>}
    </div>}

    {workflow.status === "requested" && canPreparePdf && <>
      <section className="execution-pdf-builder">
        <header><span className="execution-phase-label">إنشاء الملف</span><h3>تجهيز صفحات PDF التنفيذ</h3><p>الغلاف والصفحة الأخيرة ثابتان. أضف محتوى الصفحات المتغيرة ثم أنشئ الملف النهائي.</p></header>
        <div className="execution-builder-summary">
          <span><b>Panel size</b>{panel?.dimensions?.length || "—"} × {panel?.dimensions?.width || "—"} × {panel?.dimensions?.depth || "—"} mm</span>
          <span><b>Steel thickness</b>{workflow.steelThickness || "—"} mm</span>
          <span><b>Paint</b>Electrostatic paint</span>
        </div>
        <div className="execution-builder-grid">
          {renderExecutionImageSlot("page2", "الصفحة الثانية", "صورة اللوحة الأساسية بجانب المقاس والسمك والدهان.")}
          <article className="execution-builder-content-card">
            {renderExecutionImageSlot("page3", "الصفحة الثالثة", "الصورة الخاصة بشرح المهندس.")}
            <label>نص الصفحة الثالثة<textarea value={executionDesign.page3Text} onChange={(event) => setExecutionDesign((current) => ({ ...current, page3Text: event.target.value }))} placeholder="اكتب وصف اللوحة والملاحظات الفنية التي ستظهر في الصفحة..." /></label>
          </article>
          <article className="execution-builder-content-card">
            {renderExecutionImageSlot("page4", "الصفحة الرابعة", "الصورة المقابلة لمواصفات الأقفال والمفصلات.")}
            <div className="execution-builder-specs">
              <label>عدد Metal Lock<input type="number" min="0" max="999" value={executionDesign.metalLockCount} onChange={(event) => setExecutionDesign((current) => ({ ...current, metalLockCount: Number(event.target.value) }))} /></label>
              <span>Lock unit</span><span>Iron hinges</span>
              <label className="execution-ground-bar"><input type="checkbox" checked={executionDesign.includeGroundBar} onChange={(event) => setExecutionDesign((current) => ({ ...current, includeGroundBar: event.target.checked }))} /> Ground bar for collecting cables</label>
            </div>
          </article>
          {renderExecutionImageSlot("gallery", "الصفحة الخامسة", "ارفع من صورة إلى خمس صور وسيتم توزيعها تلقائيًا داخل الصفحة.", true)}
        </div>
      </section>
      <div className="execution-pdf-actions">
        <button type="button" className="skip-execution-btn" onClick={skip} disabled={busy}>تخطي هذه المرحلة</button>
        <button type="button" className="finish-execution-pdf-btn" onClick={generateAndFinish} disabled={busy}>{busy ? "جاري إنشاء الملف..." : "إنشاء PDF التنفيذ وإرساله للمراجعة"}</button>
      </div>
    </>}

    {workflow.status === "requested" && !canPreparePdf && <div className="execution-status-notice waiting">تم إصدار أمر PDF التنفيذ، وهو الآن بانتظار تجهيز المهندس.</div>}
    {workflow.status === "ready" && <>
      <div className="execution-status-notice ready">تم تجهيز PDF التنفيذ لهذه اللوحة، وهو الآن بانتظار قرار التنفيذ.</div>
      {executionFilesByPurpose.generatedPdf?.[0] && <button type="button" className="execution-generated-pdf" onClick={() => openFile(executionFilesByPurpose.generatedPdf[0])}><HiOutlineDocumentText /> فتح PDF التنفيذ</button>}
      {canReviewPdf && <div className="execution-review-actions">
        <button type="button" className="request-changes-btn" onClick={requestChanges} disabled={busy}>إرسال بعض التعديلات</button>
        <button type="button" className="confirm-execution-btn" onClick={confirmExecution} disabled={busy}>تأكيد التنفيذ</button>
      </div>}
    </>}
    {workflow.status === "changesRequested" && <div className="execution-status-notice waiting">تم طلب تعديلات وفتح بيانات التسعير للمهندس مع الاحتفاظ بالقيم الحالية.</div>}
    {workflow.status === "skipped" && <div className="execution-status-notice skipped">تم تخطي PDF التنفيذ والانتقال مباشرةً إلى رفع ملفات التصنيع.</div>}
    {workflow.status === "confirmed" && <div className="execution-status-notice ready">تم تأكيد التنفيذ وفتح مرحلة ملفات التصنيع.</div>}

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
      {manufacturingFiles.length > 0 && <div className="manufacturing-files-list">
        {manufacturingFiles.map((file) => <span key={file._id || file.storageFileId}><HiOutlinePhotograph />{file.fileName}</span>)}
      </div>}
      <label className="manufacturing-notes-label">معلومات إضافية للملفات
        <textarea value={manufacturingNotes} onChange={(event) => setManufacturingNotes(event.target.value)} placeholder="اكتب أي تعليمات أو معلومات يحتاجها مدير التنفيذ..." />
      </label>
      <button type="button" className="finish-execution-pdf-btn" onClick={finishManufacturing} disabled={busy || manufacturingFiles.length === 0}>{busy ? "جاري الحفظ..." : "حفظ وإتمام رفع ملفات التصنيع"}</button>
    </section>}

    {manufacturing.status === "awaitingFiles" && !canPrepareManufacturing && <div className="execution-status-notice waiting">تم تأكيد التنفيذ، واللوحة الآن بانتظار رفع المهندس لملفات التصنيع.</div>}

  </section>;
}

export default ExecutionPdfWorkspace;
