import { useProject } from "../../../context/ProjectContext";
import { useState } from "react";
import AddPartModal from "./AddPartModal";
import { IoClose } from "react-icons/io5";
const legacyAddOptions = ["المراية", "الجلسة", "الكرسي", "أوميجا", "باب"];
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
  } = useProject();
  const [showModal, setShowModal] = useState(false);
  const panel = project.panels[activePanel] || project.panels[0];
  const panelType = (systemConfig?.panelTypes || []).find((type) => type.key === panel.panelTypeKey);
  const addOptions = (panelType?.additionalParts || legacyAddOptions).map((name) => ({ id: name, label: name }));
  const handlePartChange = (index, field, value) => {
    updatePartField(index, field, value);
  };

  const handleAddPart = () => {
    setShowModal(true);
  };
  const handleSelectPart = (type) => {
    addPart(type);
  };

  return (
    <section className="project-editor-card">
      <h2 className="section-title">بيانات المنتج</h2>

      <div className="parts-grid">
        {panel.parts.map((part, index) => (
          <div className="part-card" key={`${part.name}-${index}`}>
            <div className="part-card-header">
              <h3>{part.name}</h3>

              {["الكرسي", "أوميجا"].includes(part.name) && (
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
                  ["الكرسي", "أوميجا"].includes(part.name)
                    ? "delete-part-btn x-costum"
                    : "delete-part-btn"
                }
                type="button"
                onClick={() => deletePart(index)}
                title="حذف الجزء"
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
