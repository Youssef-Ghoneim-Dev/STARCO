import { useProject } from "../../../context/ProjectContext";
import CopperCalculator from "./CopperCalculator";
import { THICKNESS_OPTIONS } from "../../../utils/thicknessOptions";
import { IoChevronDown } from "react-icons/io5";

function ManufacturingSettings() {
  const { project, activePanel, updateThickness, updatePriceField } =
    useProject();
  const panel = project.panels[activePanel] || project.panels[0];
  const panelPrices = panel.prices || {};
  const selectedThicknesses = (panel.thickness || []).map(String);
  const manufacturingFields = [
    { key: "manufacturing", label: "مصنعية" },
    { key: "locks", label: "كوالين" },
    { key: "hinges", label: "مفصلات" },
    { key: "transport", label: "نقل" },
    { key: "screws", label: "مسامير" },
    { key: "stretch", label: "استرتش" },
    { key: "carton", label: "كرتون" },
    { key: "fiber", label: "فيبر" },
    { key: "rakam", label: "ريكام" },
    { key: "fuse", label: "فيوز" },
  ];

  return (
    <section className="project-editor-card">
      <h2 className="section-title">إعدادات التصنيع</h2>

      <div className="manufacturing-prices-table-wrapper">
        <table className="manufacturing-prices-table">
          <thead>
            <tr>
              {manufacturingFields.map(({ key, label }) => (
                <th key={key} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {manufacturingFields.map(({ key, label }) => (
                <td key={key}>
                  <input
                    aria-label={label}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={panelPrices[key] ?? ""}
                    onChange={(e) => updatePriceField(key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="extra-price">
        <label htmlFor="additional-price">التكلفة الإضافية</label>

        <input
          id="additional-price"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={panelPrices.additionalPrice ?? ""}
          onChange={(e) => updatePriceField("additionalPrice", e.target.value)}
        />
      </div>

      <details className="copper-calculator-collapse">
        <summary><span>حساب النحاس</span><IoChevronDown aria-hidden="true" /></summary>
        <CopperCalculator />
      </details>

      <div className="thickness-section">
        <label>سمك الصاج</label>

        <div className="thickness-grid">
          {THICKNESS_OPTIONS.map((item) => (
            <label key={item} className="thickness-item">
              <input
                type="checkbox"
                value={item}
                checked={selectedThicknesses.includes(item)}
                onChange={() => updateThickness(item)}
              />
              {item} mm
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ManufacturingSettings;
