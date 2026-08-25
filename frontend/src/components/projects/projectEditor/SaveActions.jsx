import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import { createProjectPdf, getProjectPdfFilename } from "../../../utils/projectPdf";

function SaveActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveProject, savingProject, saveProjectError, project, prices, systemConfig } = useProject();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [defaultNamesConfirmation, setDefaultNamesConfirmation] = useState(false);
  const validationErrors = useMemo(() => {
    const errors = [];
    const client = project?.client || {};
    if (!client.name?.trim()) errors.push("يرجى إدخال اسم العميل.");
    if (!client.type) errors.push("يرجى تحديد نوع العميل.");
    if (client.profitPercentage === "" || client.profitPercentage == null || Number(client.profitPercentage) <= 0) errors.push("يرجى تحديد نسبة الربح.");
    if (prices.sheetPrice === "") errors.push("يرجى إدخال سعر الصاج.");
    if (prices.paintPrice === "") errors.push("يرجى إدخال سعر الدهان.");
    project.panels.forEach((panel, index) => {
      const panelLabel = panel.panelName?.trim() || `لوحة ${index + 1}`;
      if (!panel.panelName?.trim()) errors.push(`يرجى إدخال اسم ${panelLabel}.`);
      if (!Array.isArray(panel.thickness) || panel.thickness.length === 0) errors.push(`يرجى اختيار سمك الصاج في ${panelLabel}.`);
      if (panel.hasCopper || panel.copper?.enabled) {
        const copper = panel.copper || {};
        if (!Number(copper.pricePerKg)) errors.push(`يرجى إدخال سعر النحاس في ${panelLabel}.`);
        if (!copper.main?.optionKey) errors.push(`يرجى اختيار أمبير النحاس الرئيسي في ${panelLabel}.`);
        if (!Number(copper.main?.length)) errors.push(`يرجى إدخال طول النحاس الرئيسي في ${panelLabel}.`);
        (copper.branches || []).forEach((branch, branchIndex) => {
          if (!branch.optionKey) errors.push(`يرجى اختيار أمبير الفرعي ${branchIndex + 1} في ${panelLabel}.`);
        });
      }
      const hasSizedPart = (panel.parts || []).some((part) => part.width !== "" && part.height !== "" && part.width != null && part.height != null);
      if (!hasSizedPart) errors.push(`يرجى إدخال عرض وارتفاع لجزء واحد على الأقل في ${panelLabel}.`);
    });
    return errors;
  }, [project, prices]);
  const canSubmit = validationErrors.length === 0;

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      return await createProjectPdf({ project, prices, copperConfiguration: systemConfig?.copperConfiguration });
    } catch (error) {
      console.error(error);
      toast.error("تعذر إنشاء ملف PDF.");
      return null;
    } finally { setGeneratingPdf(false); }
  };

  const previewPdf = async () => {
    const previewWindow = window.open("", "_blank");
    const pdf = await generatePdf();
    if (!pdf) return previewWindow?.close();
    const url = URL.createObjectURL(pdf);
    if (previewWindow) previewWindow.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadPdf = async () => {
    const pdf = await generatePdf();
    if (!pdf) return;

    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = getProjectPdfFilename(project);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const defaultPanelNames = project.panels
    .map((panel, index) => panel.panelName?.trim() || `لوحة ${index + 1}`)
    .filter((name) => /^لوحة\s*\d+$/u.test(name));

  const complete = async ({ confirmedDefaultNames = false } = {}) => {
    if (!confirmedDefaultNames && defaultPanelNames.length > 0) {
      setDefaultNamesConfirmation(true);
      return;
    }
    const result = await saveProject({ complete: true });
    if (result.success) {
      navigate("/projects");
    } else toast.error(result.message || saveProjectError || "تعذر إتمام المشروع.");
  };

  return <section className="project-editor-card">
    <div className={`save-actions ${user?.role === "Engineer" && project?.source === "manual" ? "save-actions-three" : "save-actions-two"}`}>
      {user?.role === "Engineer" && project?.source === "manual" && <button className="secondary-btn" type="button" onClick={downloadPdf} disabled={!canSubmit || generatingPdf || savingProject}>{generatingPdf ? "جاري إنشاء PDF..." : "تحميل PDF"}</button>}
      <button className="secondary-btn" type="button" onClick={previewPdf} disabled={!canSubmit || generatingPdf || savingProject}>{generatingPdf ? "جاري إنشاء PDF..." : "معاينة PDF"}</button>
      <button className="complete-project-btn" type="button" onClick={() => complete()} disabled={!canSubmit || savingProject || generatingPdf}>إتمام المشروع وإرسال رابط المعاينة</button>
    </div>
    {!canSubmit && <ul className="save-validation-list">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
    {defaultNamesConfirmation && <div className="panel-name-warning-backdrop" role="presentation" onMouseDown={() => setDefaultNamesConfirmation(false)}>
      <div className="panel-name-warning-dialog" role="dialog" aria-modal="true" aria-labelledby="panel-name-warning-title" dir="rtl" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="panel-name-warning-title">تأكيد أسماء اللوحات</h2>
        <p>الأسماء التالية ما زالت بالأسماء التلقائية:</p>
        <ul>{defaultPanelNames.map((name) => <li key={name}>{name}</li>)}</ul>
        <p>هل أنت متأكد من إتمام المشروع بهذه الأسماء؟</p>
        <div>
          <button type="button" className="panel-name-warning-review" onClick={() => setDefaultNamesConfirmation(false)}>مراجعة الأسماء</button>
          <button type="button" className="panel-name-warning-confirm" onClick={() => { setDefaultNamesConfirmation(false); complete({ confirmedDefaultNames: true }); }}>نعم، إتمام المشروع</button>
        </div>
      </div>
    </div>}
  </section>;
}

export default SaveActions;
