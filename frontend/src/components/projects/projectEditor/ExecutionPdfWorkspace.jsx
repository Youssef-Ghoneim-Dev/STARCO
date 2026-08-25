import { useMemo, useRef, useState } from "react";
import { HiOutlineClipboardCopy, HiOutlineCloudUpload, HiOutlineDocumentText, HiOutlinePhotograph } from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import {
  finishExecutionPdf,
  getExecutionPdfFile,
  requestExecutionPdf,
  skipExecutionPdf,
  uploadExecutionPdfFile,
} from "../../../services/projectsAPI";

const quoteFinishedStatuses = ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "completed"];

function ExecutionPdfWorkspace() {
  const { user } = useAuth();
  const { project, setProject, activePanel, setActivePanel, savingProject } = useProject();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const panel = project.panels?.[activePanel];
  const workflow = panel?.executionPdf || { status: "notRequested", files: [] };
  const files = useMemo(() => workflow.files || [], [workflow.files]);
  const canIssueOrder = ["Marketer", "MarketingManager", "OwnerManager", "Engineer"].includes(user?.role);
  const canPreparePdf = ["Engineer", "OwnerManager"].includes(user?.role);

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
    const allowed = [...selectedFiles].filter((file) => file.type === "application/pdf" || file.type.startsWith("image/"));
    if (!allowed.length) return toast.error("اختر ملف PDF أو صورة.");
    setBusy(true);
    try {
      let latestProject = project;
      for (const file of allowed) {
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
        <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple hidden onChange={(event) => uploadFiles(event.target.files)} />
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
    {workflow.status === "ready" && <div className="execution-status-notice ready">تم تجهيز PDF التنفيذ لهذه اللوحة وحفظ الملفات بنجاح.</div>}
    {workflow.status === "skipped" && <div className="execution-status-notice skipped">تم تخطي PDF التنفيذ لهذه اللوحة والانتقال إلى أمر التنفيذ.</div>}
  </section>;
}

export default ExecutionPdfWorkspace;
