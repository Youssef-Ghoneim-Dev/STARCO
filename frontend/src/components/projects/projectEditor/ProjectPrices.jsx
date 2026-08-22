import { useProject } from "../../../context/ProjectContext";

function ProjectPrices() {
  const { prices, updatePrices } = useProject();

  const handlePriceChange = (field, value) => {
    updatePrices(field, value === "" ? "" : Number(value));
  };

  return (
    <section className="project-editor-card project-prices">
      <h2 className="section-title">الأسعار</h2>

      <div className="project-prices-grid">
        <div className="price-field">
          <label htmlFor="sheet-price">سعر الصاج</label>

          <input
            id="sheet-price"
            type="number"
            min="0"
            value={prices.sheetPrice ?? ""}
            onChange={(e) =>
              handlePriceChange("sheetPrice", e.target.value)
            }
          />
        </div>

        <div className="price-field">
          <label htmlFor="paint-price">سعر الدهان</label>

          <input
            id="paint-price"
            type="number"
            min="0"
            value={prices.paintPrice ?? ""}
            onChange={(e) =>
              handlePriceChange("paintPrice", e.target.value)
            }
          />
        </div>
      </div>
    </section>
  );
}

export default ProjectPrices;
