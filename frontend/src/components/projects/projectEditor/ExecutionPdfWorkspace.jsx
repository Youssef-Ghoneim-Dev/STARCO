import { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineClipboardCopy, HiOutlineCloudDownload, HiOutlineCloudUpload, HiOutlineClock, HiOutlineDocumentText, HiOutlineDotsHorizontal, HiOutlineFolder, HiOutlinePhotograph, HiOutlineXCircle } from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import {
  finishExecutionPdf,
  finishManufacturingFiles,
  confirmProjectExecution,
  getExecutionPdfFile,
  getManufacturingArchive,
  getManufacturingFile,
  requestExecutionPdf,
  requestExecutionPdfChanges,
  skipExecutionPdf,
  uploadExecutionPdfFile,
  uploadManufacturingFile,
  updateManufacturingStage,
} from "../../../services/projectsAPI";

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
  const { user } = useAuth();
  const { project, setProject, activePanel, setActivePanel, savingProject } = useProject();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
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
  const canIssueOrder = user?.role === "OwnerManager"
    || user?.role === "MarketingManager"
    || user?.role === "Marketer"
    || (user?.role === "Engineer" && project?.source === "manual");
  const canPreparePdf = ["Engineer", "OwnerManager"].includes(user?.role);
  const canReviewPdf = ["Marketer", "MarketingManager", "OwnerManager"].includes(user?.role)
    || (project?.source === "manual" && user?.role === "Engineer");
  const canPrepareManufacturing = ["Engineer", "OwnerManager"].includes(user?.role);
  const canDownloadManufacturing = ["Engineer", "OwnerManager", "ProductionManager"].includes(user?.role);

  useEffect(() => {
    setManufacturingNotes(manufacturing.notes || "");
    setStageDecision("");
    setDelayReason("");
    setDelayDetails("");
  }, [panel?.panelId, manufacturing.notes, manufacturing.currentStage]);

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

  const copyId = async () => {
    await navigator.clipboard.writeText(project._id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const issueOrder = async () => {
    setBusy(true);
    try {
      const { data } = await requestExecutionPdf(project._id, panel.panelId);
      setProject({ ...data.project, marketingRepresentative: project.marketingRepresentative || data.project.marketingRepresentative });
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر إصدار أمر PDF التنفيذ.");
    } finally { setBusy(false); }
  };

  const uploadFiles = async (selectedFiles) => {
    // Some Android pickers omit the MIME type or expose the selected file as
    // application/octet-stream. Keep the picker restriction here and let the
    // backend verify the actual file contents before storing it.
    const filesToUpload = Array.from(selectedFiles || []).filter((file) => file?.size > 0);
    if (!filesToUpload.length) return toast.error("اختر ملف PDF أو صورة.");
    setBusy(true);
    try {
      let latestProject = project;
      for (const file of filesToUpload) {
        const { data } = await uploadExecutionPdfFile(project._id, panel.panelId, file);
        latestProject = data.project;
      }
      setProject(latestProject);
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر رفع الملف.");
    } finally { setBusy(false); }
  };

  const openFile = async (file) => {
    try {
      const { data } = await getExecutionPdfFile(project._id, panel.panelId, file._id);
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر فتح الملف."); }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const { data } = await finishExecutionPdf(project._id, panel.panelId);
      setProject(data.project);
      if (data.notification?.includes("تعذر")) toast.error(data.notification);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر إتمام PDF التنفيذ."); }
    finally { setBusy(false); }
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
      setProject(data.project);
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
      setProject({ ...data.project, marketingRepresentative: project.marketingRepresentative || data.project.marketingRepresentative });
      setStageDecision("");
      setDelayReason("");
      setDelayDetails("");
    } catch (error) { toast.error(error.response?.data?.message || "تعذر حفظ تحديث مرحلة الإنتاج."); }
    finally { setBusy(false); }
  };

  if (!quoteFinishedStatuses.includes(project.status)) return null;

  return <section className="execution-pdf-workspace" dir="rtl">
    <header className="execution-pdf-heading">
      <div>
        <span className="execution-phase-label">مرحلة التنفيذ</span>
        <h2>PDF التنفيذ — {panel?.panelName}</h2>
        <p>عرض السعر محفوظ، وهذه المساحة مخصصة لملفات اعتماد تنفيذ اللوحة.</p>
      </div>
      <button type="button" className="project-id-copy" onClick={copyId} title="نسخ ID المشروع">
        <HiOutlineClipboardCopy />
        <span><small>{copied ? "تم النسخ" : "رقم المشروع"}</small><b dir="ltr">{project._id}</b></span>
      </button>
    </header>

    {project.panels.length > 1 && <div className="execution-panel-switcher" aria-label="اختيار اللوحة">
      {project.panels.map((item, index) => <button
        type="button"
        key={item.panelId || index}
        className={index === activePanel ? "active" : ""}
        onClick={() => setActivePanel(index)}
      >{item.panelName || `لوحة ${index + 1}`}</button>)}
    </div>}

    {workflow.status === "notRequested" && <div className="execution-order-card">
      <div><h3>لم يصدر أمر PDF تنفيذ لهذه اللوحة بعد</h3><p>يمكن إصدار الأمر من الموقع، أو عبر WhatsApp باستخدام رقم المشروع ورقم اللوحة.</p></div>
      {canIssueOrder && <button type="button" onClick={issueOrder} disabled={busy || savingProject}>{busy ? "جاري الإصدار..." : "إصدار أمر PDF تنفيذ"}</button>}
    </div>}

    {workflow.status === "requested" && canPreparePdf && <>
      <div
        className={`execution-dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); uploadFiles(event.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <HiOutlineCloudUpload />
        <h3>اسحب ملفات PDF أو الصور هنا</h3>
        <p>أو اضغط لاختيار الملفات من الجهاز — يمكن رفع أكثر من ملف.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf,image/*"
          multiple
          hidden
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files || []);
            event.target.value = "";
            uploadFiles(selectedFiles);
          }}
        />
      </div>
      {files.length > 0 && <div className="execution-files-grid">
        {files.map((file) => <button type="button" key={file._id || file.storageFileId} onClick={() => openFile(file)}>
          {file.mimeType === "application/pdf" ? <HiOutlineDocumentText /> : <HiOutlinePhotograph />}
          <span>{file.fileName}</span>
        </button>)}
      </div>}
      <div className="execution-pdf-actions">
        <button type="button" className="skip-execution-btn" onClick={skip} disabled={busy}>تخطي هذه المرحلة</button>
        <button type="button" className="finish-execution-pdf-btn" onClick={finish} disabled={busy || files.length === 0}>{busy ? "جاري الحفظ..." : "حفظ البيانات وإتمام PDF التنفيذ"}</button>
      </div>
    </>}

    {workflow.status === "requested" && !canPreparePdf && <div className="execution-status-notice waiting">تم إصدار أمر PDF التنفيذ، وهو الآن بانتظار تجهيز المهندس.</div>}
    {workflow.status === "ready" && <>
      <div className="execution-status-notice ready">تم تجهيز PDF التنفيذ لهذه اللوحة، وهو الآن بانتظار قرار التنفيذ.</div>
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

    {["filesReady", "downloadedToLaser"].includes(manufacturing.status) && <section className="production-workspace">
      <details className="production-project-details">
        <summary>عرض تفاصيل المشروع <HiOutlineChevronDown /></summary>
        <div className="production-project-details-body">
          <div><small>اسم اللوحة</small><b>{panel.panelName}</b></div>
          <div><small>اسم العميل</small><b>{project.client?.name || "غير محدد"}</b></div>
          <div><small>مصدر المشروع</small><b>{project.source === "marketing" ? "المندوب" : project.source === "whatsapp" ? "WhatsApp" : "يدوي"}</b></div>
          <div><small>رقم المشروع</small><b dir="ltr">{project._id}</b></div>
          {project.marketingRepresentative && <>
            <div><small>اسم المندوب</small><b>{project.marketingRepresentative.name || "غير محدد"}</b></div>
            <div><small>رقم المندوب</small><b dir="ltr">{project.marketingRepresentative.phoneNumber || "غير محدد"}</b></div>
          </>}
          {files.length > 0 && <div className="production-execution-files">
            <small>ملفات PDF التنفيذ</small>
            {files.map((file) => <button type="button" key={file._id || file.storageFileId} onClick={() => openFile(file)}>
              {file.mimeType === "application/pdf" ? <HiOutlineDocumentText /> : <HiOutlinePhotograph />}
              <span>{file.fileName}</span>
            </button>)}
          </div>}
          {manufacturing.notes && <p>{manufacturing.notes}</p>}
        </div>
      </details>

      <section className="production-files-card">
        <header>
          <div><h3><HiOutlineFolder /> ملفات التصنيع</h3><p>جميع الملفات المرفوعة لهذه اللوحة بواسطة المهندس.</p></div>
        </header>
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
              <button type="button" className="manufacturing-file-more" aria-label="خيارات الملف" title="خيارات الملف"><HiOutlineDotsHorizontal /></button>
            </div>
          </article>)}
        </div>
        {canDownloadManufacturing && <button type="button" className="manufacturing-download-all" onClick={downloadAllManufacturingFiles}>
          <HiOutlineCloudDownload /> تنزيل كل الملفات ZIP
        </button>}
      </section>

      <section className="production-stages-section">
        <header><div><h3>مراحل الإنتاج</h3><p>يتم فتح كل مرحلة بعد إتمام المرحلة السابقة.</p></div></header>
        <div className="production-stages-track">
          {productionStages.map((stage, index) => <article key={stage.key} className={`production-stage-card ${stage.status}`}>
            <span className="production-stage-number">{index + 1}</span>
            <div className="production-stage-title"><h4>{stage.title}</h4><p>{stage.description}</p></div>
            {stage.status === "completed" && <div className="production-stage-state completed"><HiOutlineCheckCircle /> تمت</div>}
            {stage.status === "pending" && <div className="production-stage-state"><HiOutlineClock /> لم تبدأ</div>}
            {stage.status === "active" && <div className="production-stage-decision">
              <label className={stageDecision === "completed" ? "selected done" : ""}><input type="radio" name="stage-decision" value="completed" checked={stageDecision === "completed"} onChange={() => setStageDecision("completed")} /><HiOutlineCheckCircle /> تمت</label>
              <label className={stageDecision === "delayed" ? "selected delayed" : ""}><input type="radio" name="stage-decision" value="delayed" checked={stageDecision === "delayed"} onChange={() => setStageDecision("delayed")} /><HiOutlineXCircle /> لم تتم</label>
            </div>}
            {stage.status === "active" && stageDecision === "delayed" && stage.key === "awaitingLaserDownload" && <div className="production-fixed-warning">برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة</div>}
            {stage.status === "active" && stageDecision === "delayed" && stage.key !== "awaitingLaserDownload" && <div className="production-delay-fields">
              <label>سبب التأخير
                <select value={delayReason} onChange={(event) => { setDelayReason(event.target.value); if (event.target.value !== "أخرى") setDelayDetails(""); }}>
                  <option value="">اختر سبب التأخير</option>
                  {(productionDelayReasons[stage.key] || []).map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </label>
              {delayReason === "أخرى" && <label>سبب التأخير
                <textarea value={delayDetails} onChange={(event) => setDelayDetails(event.target.value)} placeholder="اكتب سبب التأخير..." />
              </label>}
            </div>}
          </article>)}
        </div>
      </section>

      {["OwnerManager", "ProductionManager"].includes(user?.role) && <section className="production-update-panel">
        <label>ملاحظات عامة (اختياري)
          <textarea value={manufacturingNotes} onChange={(event) => setManufacturingNotes(event.target.value)} placeholder="اكتب أي ملاحظات إضافية هنا..." />
        </label>
        <div className="production-update-actions">
          <button type="button" className="production-history-toggle" onClick={() => setHistoryOpen((value) => !value)}><HiOutlineClock /> عرض سجل التحديثات</button>
          <button type="button" className="production-save-button" onClick={saveProductionStage} disabled={busy || !activeProductionStage || !stageDecision}>{busy ? "جاري الحفظ..." : "حفظ التعديلات"}</button>
        </div>
        {historyOpen && <div className="production-history-list">
          {(manufacturing.productionHistory || []).length === 0
            ? <p>لا توجد تحديثات مسجلة حتى الآن.</p>
            : [...manufacturing.productionHistory].reverse().map((item, index) => <div key={`${item.createdAt}-${index}`}>
              <b>{item.action === "completed" ? "تمت المرحلة" : item.action === "delayed" ? "تم تسجيل تأخير" : "تم تحديث الملاحظات"}</b>
              <span>{item.reason === "أخرى" ? item.details : item.reason || item.details || ""}</span>
              <time>{item.createdAt ? new Date(item.createdAt).toLocaleString("ar-EG") : ""}</time>
            </div>)}
        </div>}
      </section>}
    </section>}
  </section>;
}

export default ExecutionPdfWorkspace;
