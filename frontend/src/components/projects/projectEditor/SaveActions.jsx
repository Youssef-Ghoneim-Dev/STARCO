import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useProject } from "../../../context/ProjectContext";
import { createProjectPdf } from "../../../utils/projectPdf";

function SaveActions() {
  const navigate = useNavigate();
  const { saveProject, savingProject, saveProjectError, project, prices, systemConfig } = useProject();
  const [generatingPdf, setGeneratingPdf] = useState(false);
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

  const complete = async () => {
    const result = await saveProject({ complete: true });
    if (result.success) {
      toast.success("تم إتمام المشروع وإرسال رابط المعاينة للمندوب.");
      navigate("/projects");
    } else toast.error(result.message || saveProjectError || "تعذر إتمام المشروع.");
  };

  return <section className="project-editor-card">
    <div className="save-actions save-actions-two">
      <button className="secondary-btn" type="button" onClick={previewPdf} disabled={!canSubmit || generatingPdf || savingProject}>{generatingPdf ? "جاري إنشاء PDF..." : "معاينة PDF"}</button>
      <button className="complete-project-btn" type="button" onClick={complete} disabled={!canSubmit || savingProject || generatingPdf}>إتمام المشروع وإرسال رابط المعاينة</button>
    </div>
    {!canSubmit && <ul className="save-validation-list">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
  </section>;
}

export default SaveActions;
