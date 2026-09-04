import { useProject } from "../../../context/ProjectContext";
import { useState } from "react";
import AddPartModal from "./AddPartModal";
import { IoClose, IoRefresh } from "react-icons/io5";
import toast from "react-hot-toast";
const legacyAddOptions = ["المراية", "الجلسة", "الكرسي", "أوميجا", "باب"];
const normalizeAdditionalPart = (part) => typeof part === "string"
  ? { name: part, defaultWidth: part === "الكرسي" ? 40 : part === "أوميجا" ? 45.5 : "", defaultHeight: part === "الكرسي" ? 100 : "", defaultQuantity: part === "الكرسي" ? 2 : 1, quantityStep: part === "الكرسي" ? 2 : 1, showQuantityControls: ["الكرسي", "أوميجا"].includes(part) }
  : { name: part?.name || "", defaultWidth: part?.defaultWidth ?? "", defaultHeight: part?.defaultHeight ?? "", defaultQuantity: Number(part?.defaultQuantity) || 1, quantityStep: Number(part?.quantityStep) || 1, showQuantityControls: Boolean(part?.showQuantityControls) };
function ProductParts() {
  const {
    project,
    activePanel,
    updatePartField,
    addPart,
    canDeletePart,
    deletePart,
    increasePartQuantity,
    decreasePartQuantity,
    systemConfig,
    recalculateActivePanelParts,
  } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const panel = project.panels[activePanel] || project.panels[0];
  const panelType = (systemConfig?.panelTypes || []).find(
    (type) => String(type.key) === String(panel.panelTypeKey),
  );
  const additionalParts = (panelType?.additionalParts || legacyAddOptions).map(normalizeAdditionalPart);
  const addOptions = additionalParts.map((part) => ({ id: part.name, label: part.name, config: part }));
  const getQuantityConfig = (partName) => additionalParts.find((part) => partName === part.name || partName.startsWith(`${part.name} `));
  const handlePartChange = (index, field, value) => {
    updatePartField(index, field, value);
  };

  const handleAddPart = () => {
    setShowModal(true);
  };
  const handleSelectPart = (option) => {
    addPart(option.config || option.id);
  };
  const recalculateParts = async () => {
    setRecalculating(true);
    const result = await recalculateActivePanelParts();
    setRecalculating(false);
    if (!result.success) toast.error(result.message || "تعذر إعادة حساب الأجزاء.");
  };

  return (
    <section className="project-editor-card">
      <div className="section-title-row"><h2 className="section-title">بيانات المنتج</h2><button type="button" className="project-icon-refresh" title="إعادة حساب الأجزاء بأحدث المعادلات" aria-label="إعادة حساب الأجزاء بأحدث المعادلات" onClick={recalculateParts} disabled={recalculating}><IoRefresh className={recalculating ? "is-spinning" : ""} /></button></div>

      <div className="parts-grid">
        {panel.parts.map((part, index) => (
          <div className="part-card" key={`${part.name}-${index}`}>
            <div className="part-card-header">
              <h3>{part.name}</h3>

              {getQuantityConfig(part.name)?.showQuantityControls && (
                <div className="part-quantity">
                  <button
                    type="button"
                    onClick={() => decreasePartQuantity(index)}
                    aria-label="تقليل الكمية"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={part.quantity ?? 1}
                    onChange={(e) => {
                      const value = Number(e.target.value);

                      updatePartField(
                        index,
                        "quantity",
                        value >= 1 ? value : 1,
                      );
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => increasePartQuantity(index)}
                    aria-label="زيادة الكمية"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            {canDeletePart(part, panel.parts) && (
              <button
                className={
                  getQuantityConfig(part.name)?.showQuantityControls
                    ? "delete-part-btn x-costum"
                    : "delete-part-btn"
                }
                type="button"
                onClick={() => deletePart(index)}
                title="حذف الجزء"
                aria-label={`حذف ${part.name}`}
              >
                <IoClose />
              </button>
            )}
            <input
              type="number"
              placeholder="العرض"
              value={part.width ?? ""}
              onChange={(e) =>
                handlePartChange(
                  index,
                  "width",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
            />

            <input
              type="number"
              placeholder="الارتفاع"
              value={part.height ?? ""}
              onChange={(e) =>
                handlePartChange(
                  index,
                  "height",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
            />
          </div>
        ))}
      </div>

      <div className="add-part-menu">
        <button type="button" className="add-part-btn" onClick={handleAddPart}>
          + إضافة جزء
        </button>
      </div>
      <AddPartModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleSelectPart}
        options={addOptions}
      />
    </section>
  );
}

export default ProductParts;
