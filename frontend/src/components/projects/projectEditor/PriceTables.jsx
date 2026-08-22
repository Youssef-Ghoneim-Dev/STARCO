import { useMemo } from "react";
import { useProject } from "../../../context/ProjectContext";
import { getPriceTableRows } from "../../../utils/priceCalculator";

function PriceTables() {
  const { project, prices, activePanel, systemConfig } = useProject();
  const panel = project.panels[activePanel] || project.panels[0];

  const profitPercentage = Number(project?.client?.profitPercentage) || 0;
  const hasProfitPercentage = profitPercentage > 0;

  const rows = useMemo(
    () => hasProfitPercentage ? getPriceTableRows(panel, prices, profitPercentage, systemConfig?.copperConfiguration) : [],
    [panel, prices, profitPercentage, hasProfitPercentage, systemConfig],
  );

  return (
    <section className="project-editor-card">
      <div className="price-table-header">
        <h2 className="section-title">جدول الأسعار</h2>
        <p className="price-calculation-note">
          {hasProfitPercentage ? `ملحوظة: يتم الحساب باستخدام نسبة الربح المحددة بالأعلى (${profitPercentage}%).` : "اختر نسبة الربح أولًا لإظهار الأسعار."}
        </p>
      </div>

      <div className="price-summary-table-wrapper">
        <table className="prices-table price-summary-table">
          <tbody>
            <tr>
              <th scope="row">السمك</th>
              {rows.map((row, index) => (
                <td key={`thickness-${row.thickness}-${index}`}>
                  {row.thickness}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">السعر</th>
              {rows.map((row, index) => (
                <td key={`price-${row.thickness}-${index}`}>
                  {row.price === null ? "---" : row.price}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PriceTables;
