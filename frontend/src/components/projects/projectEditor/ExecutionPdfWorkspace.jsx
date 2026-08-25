import { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineClipboardCopy, HiOutlineCloudDownload, HiOutlineCloudUpload, HiOutlineDocumentText, HiOutlinePhotograph } from "react-icons/hi";
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
  markManufacturingDownloadedToLaser,
  recordManufacturingDelay,
  requestExecutionPdf,
  requestExecutionPdfChanges,
  skipExecutionPdf,
  uploadExecutionPdfFile,
  uploadManufacturingFile,
} from "../../../services/projectsAPI";

const quoteFinishedStatuses = ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"];

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
  const [delayReason, setDelayReason] = useState(manufacturing.delayReason || "");
  const canIssueOrder = ["Marketer", "MarketingManager", "OwnerManager", "Engineer"].includes(user?.role);
  const canPreparePdf = ["Engineer", "OwnerManager"].includes(user?.role);
  const canReviewPdf = ["Marketer", "MarketingManager", "OwnerManager"].includes(user?.role)
    || (project?.source === "manual" && user?.role === "Engineer");
  const canPrepareManufacturing = ["Engineer", "OwnerManager"].includes(user?.role);
  const canDownloadManufacturing = ["Engineer", "OwnerManager", "ProductionManager"].includes(user?.role);

  useEffect(() => {
    setManufacturingNotes(manufacturing.notes || "");
    setDelayReason(manufacturing.delayReason || "");
  }, [panel?.panelId, manufacturing.notes, manufacturing.delayReason]);

  const copyId = async () => {
    await navigator.clipboard.writeText(project._id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const issueOrder = async () => {
    setBusy(true);
    try {
      const { data } = await requestExecutionPdf(project._id, panel.panelId);
      setProject(data.project);
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
    const selected = Array.from(selectedFiles || []).filter((file) => file?.name);
    if (!selected.length) return toast.error("اختر ملفًا واحدًا على الأقل.");
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

  const downloadedToLaser = async () => {
    setBusy(true);
    try {
      const { data } = await markManufacturingDownloadedToLaser(project._id, panel.panelId);
      setProject(data.project);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر تسجيل تنزيل الملفات إلى الليزر."); }
    finally { setBusy(false); }
  };

  const saveDelayReason = async () => {
    if (!delayReason) return toast.error("اختر سبب التأخير أولًا.");
    setBusy(true);
    try {
      const { data } = await recordManufacturingDelay(project._id, panel.panelId, delayReason);
      setProject(data.project);
    } catch (error) { toast.error(error.response?.data?.message || "تعذر تسجيل سبب التأخير."); }
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
        <h3>رفع ملفات DXF وملفات التشغيل</h3>
        <p>يمكنك رفع DXF أو DWG أو أي ملف تشغيل، بالإضافة إلى الصور عند الحاجة.</p>
      </div>
      <div
        className={`execution-dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); uploadManufacturingFiles(event.dataTransfer.files); }}
        onClick={() => manufacturingInputRef.current?.click()}
      >
        <HiOutlineCloudUpload />
        <h3>اسحب ملفات التصنيع هنا</h3>
        <p>أو اضغط لاختيار ملف أو أكثر من الجهاز.</p>
        <input
          ref={manufacturingInputRef}
          type="file"
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
        {manufacturingFiles.map((file) => <span key={file._id || file.storageFileId}><HiOutlineDocumentText />{file.fileName}</span>)}
      </div>}
      <label className="manufacturing-notes-label">معلومات إضافية للملفات
        <textarea value={manufacturingNotes} onChange={(event) => setManufacturingNotes(event.target.value)} placeholder="اكتب أي تعليمات أو معلومات يحتاجها مدير التنفيذ..." />
      </label>
      <button type="button" className="finish-execution-pdf-btn" onClick={finishManufacturing} disabled={busy || manufacturingFiles.length === 0}>{busy ? "جاري الحفظ..." : "حفظ وإتمام رفع ملفات التصنيع"}</button>
    </section>}

    {manufacturing.status === "awaitingFiles" && !canPrepareManufacturing && <div className="execution-status-notice waiting">تم تأكيد التنفيذ، واللوحة الآن بانتظار رفع المهندس لملفات التصنيع.</div>}

    {["filesReady", "downloadedToLaser"].includes(manufacturing.status) && <section className="manufacturing-files-section">
      <div><span className="execution-phase-label">ملفات التصنيع جاهزة</span><h3>{panel.panelName}</h3>{manufacturing.notes && <p>{manufacturing.notes}</p>}</div>
      <div className="manufacturing-download-grid">
        {manufacturingFiles.map((file) => <button type="button" key={file._id || file.storageFileId} onClick={() => downloadManufacturingFile(file)} disabled={!canDownloadManufacturing}>
          <HiOutlineCloudDownload /><span>{file.fileName}</span>
        </button>)}
      </div>
      {canDownloadManufacturing && <div className="manufacturing-ready-actions">
        <button type="button" onClick={downloadAllManufacturingFiles}><HiOutlineCloudDownload /> تنزيل كل الملفات ZIP</button>
        {manufacturing.status === "filesReady" && ["OwnerManager", "ProductionManager"].includes(user?.role) && <button type="button" className="confirm-execution-btn" onClick={downloadedToLaser} disabled={busy}>تم تنزيل الملفات إلى الليزر</button>}
      </div>}
      {manufacturing.status === "filesReady" && ["OwnerManager", "ProductionManager"].includes(user?.role) && <div className="manufacturing-delay-form">
        <select value={delayReason} onChange={(event) => setDelayReason(event.target.value)}>
          <option value="">اختر سبب التأخير عند الحاجة</option>
          <option value="عدم تنزيل الملفات إلى الليزر">عدم تنزيل الملفات إلى الليزر</option>
          <option value="أعطال الليزر">أعطال الليزر</option>
          <option value="نقص خامات">نقص خامات</option>
          <option value="أعطال التصنيع">أعطال التصنيع</option>
          <option value="مراجعة العميل">مراجعة العميل</option>
          <option value="أخرى">أخرى</option>
        </select>
        <button type="button" onClick={saveDelayReason} disabled={busy || !delayReason}>تسجيل سبب التأخير</button>
      </div>}
      {manufacturing.status === "downloadedToLaser" && <div className="execution-status-notice ready">تم تسجيل تنزيل الملفات إلى الليزر، وستبدأ متابعة مرحلة الليزر في اليوم التالي.</div>}
    </section>}
  </section>;
}

export default ExecutionPdfWorkspace;
