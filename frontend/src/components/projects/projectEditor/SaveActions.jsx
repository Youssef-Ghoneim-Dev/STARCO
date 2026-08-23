import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useProject } from "../../../context/ProjectContext";
import {
  createProjectPdf,
  getProjectPdfFilename,
} from "../../../utils/projectPdf";

function SaveActions() {
  const navigate = useNavigate();
  const { saveProject, savingProject, saveProjectError, project, prices, systemConfig } =
    useProject();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPreviewChoice, setShowPreviewChoice] = useState(false);

  const validationErrors = useMemo(() => {
    const errors = [];
    const client = project?.client || {};
    if (!client.name?.trim()) {
      errors.push("يرجى إدخال اسم العميل.");
    }
    if (!client.type) {
      errors.push("يرجى تحديد نوع العميل.");
    }
    if (client.profitPercentage === "" || client.profitPercentage == null || Number(client.profitPercentage) <= 0) {
      errors.push("يرجى تحديد نسبة الربح.");
    }
    if (prices.sheetPrice === "") {
      errors.push("يرجى إدخال سعر الصاج.");
    }
    if (prices.paintPrice === "") {
      errors.push("يرجى إدخال سعر الدهان.");
    }

    project.panels.forEach((panel, index) => {
      const panelLabel = panel.panelName?.trim() || `لوحة ${index + 1}`;
      if (!panel.panelName?.trim()) {
        errors.push(`يرجى إدخال اسم ${panelLabel}.`);
      }
      if (!Array.isArray(panel.thickness) || panel.thickness.length === 0) {
        errors.push(`يرجى اختيار سمك الصاج في ${panelLabel}.`);
      }
      if (panel.hasCopper || panel.copper?.enabled) {
        const copper = panel.copper || {};
        if (!Number(copper.pricePerKg)) errors.push(`يرجى إدخال سعر كيلو النحاس في ${panelLabel}.`);
        if (!copper.main?.optionKey) errors.push(`يرجى اختيار أمبير النحاس الرئيسي في ${panelLabel}.`);
        if (!Number(copper.main?.length)) errors.push(`يرجى إدخال طول النحاس الرئيسي في ${panelLabel}.`);
        (copper.branches || []).forEach((branch, branchIndex) => {
          if (!branch.optionKey) errors.push(`يرجى اختيار أمبير الفرعي ${branchIndex + 1} في ${panelLabel}.`);
        });
      }

      const partsWithOneDimension = (panel.parts || []).filter(
        (part) =>
          (part.width !== "" && part.width != null) ||
          (part.height !== "" && part.height != null),
      );
      const hasSizedPart = (panel.parts || []).some(
        (part) =>
          part.width !== "" &&
          part.height !== "" &&
          part.width != null &&
          part.height != null,
      );

      if (!hasSizedPart && partsWithOneDimension.length === 0) {
        errors.push(`يرجى إدخال عرض وارتفاع لجزء واحد على الأقل في ${panelLabel}.`);
      } else if (!hasSizedPart) {
        partsWithOneDimension.forEach((part) => {
          if (part.width === "" || part.width == null) {
            errors.push(`يرجى إدخال عرض الجزء ${part.name} في ${panelLabel}.`);
          }
          if (part.height === "" || part.height == null) {
            errors.push(`يرجى إدخال ارتفاع الجزء ${part.name} في ${panelLabel}.`);
          }
        });
      }
    });

    return errors;
  }, [project, prices]);
  const canSubmit = validationErrors.length === 0;

  const saveCurrentProject = async ({ complete = false, returnToProjects = false } = {}) => {
    const result = await saveProject({ complete });
    if (result.success) {
      toast.success(complete ? "تم إتمام المشروع وإرسال إشعار للمندوب." : "تم حفظ التعديلات.");
      if (returnToProjects) navigate("/projects");
      return true;
    } else {
      toast.error(
        result.message || saveProjectError || "تعذر حفظ المشروع.",
      );
      return false;
    }
  };

  const handleSave = async () => {
    await saveCurrentProject();
  };

  const handleComplete = async () => {
    await saveCurrentProject({ complete: true, returnToProjects: true });
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      return await createProjectPdf({ project, prices, copperConfiguration: systemConfig?.copperConfiguration });
    } catch (error) {
      console.error(error);
      toast.error("تعذر إنشاء ملف PDF.");
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const openPdfPreview = (pdf, previewWindow) => {
    const url = URL.createObjectURL(pdf);
    if (previewWindow) {
      previewWindow.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handlePreviewOnly = async () => {
    const previewWindow = window.open("", "_blank");
    setShowPreviewChoice(false);
    const pdf = await generatePdf();
    if (!pdf) {
      previewWindow?.close();
      return;
    }
    openPdfPreview(pdf, previewWindow);
  };

  const handleSaveAndPreview = async () => {
    const previewWindow = window.open("", "_blank");
    setShowPreviewChoice(false);
    const pdf = await generatePdf();
    if (!pdf) {
      previewWindow?.close();
      return;
    }

    const saved = await saveCurrentProject();
    if (!saved) {
      previewWindow?.close();
      return;
    }

    openPdfPreview(pdf, previewWindow);
  };

  const handleDownload = async () => {
    const pdf = await generatePdf();
    if (!pdf) return;

    const filename = getProjectPdfFilename(project);
    const saved = await saveCurrentProject();
    if (!saved) return;

    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <section className="project-editor-card">
      <div className="save-actions">
        <button
          className="secondary-btn"
          type="button"
          onClick={handleDownload}
          disabled={!canSubmit || generatingPdf || savingProject}
        >
          {generatingPdf ? "جاري إنشاء PDF..." : "تحميل PDF"}
        </button>

        <button
          className="secondary-btn"
          type="button"
          onClick={() => setShowPreviewChoice(true)}
          disabled={!canSubmit || generatingPdf || savingProject}
        >
          معاينة PDF
        </button>

        <button
          className="primary-btn"
          type="button"
          onClick={handleSave}
          disabled={!canSubmit || savingProject || generatingPdf}
        >
          {savingProject ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
        <button
          className="complete-project-btn"
          type="button"
          onClick={handleComplete}
          disabled={!canSubmit || savingProject || generatingPdf}
        >
          إتمام المشروع وإرسال رابط المعاينة
        </button>
      </div>
      {!canSubmit && (
        <ul className="save-validation-list">
          {validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {showPreviewChoice && (
        <div
          className="pdf-choice-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-choice-title"
        >
          <div className="pdf-choice-dialog">
            <h2 id="pdf-choice-title">معاينة PDF</h2>
            <p>هل تريد حفظ التعديلات قبل فتح ملف PDF أم رؤية الملف فقط؟</p>
            <div className="pdf-choice-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={handlePreviewOnly}
                disabled={generatingPdf || savingProject}
              >
                رؤية PDF فقط
              </button>
              <button
                className="primary-btn"
                type="button"
                onClick={handleSaveAndPreview}
                disabled={generatingPdf || savingProject}
              >
                حفظ التعديلات والمعاينة
              </button>
            </div>
            <button
              className="pdf-choice-cancel"
              type="button"
              onClick={() => setShowPreviewChoice(false)}
              disabled={generatingPdf || savingProject}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default SaveActions;
