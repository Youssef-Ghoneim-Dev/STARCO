import { useMemo } from "react";
import { useProject } from "../../../context/ProjectContext";
import {
  getAllPriceRows,
  getSheetPriceAndWeightRows,
  THICKNESS_OPTIONS,
} from "../../../utils/priceCalculator";

function AdditionalSupplies() {
  const {
    project,
    prices,
    activePanel,
    showWeight,
    setShowWeight,
    showAllPrices,
    setShowAllPrices,
    systemConfig,
  } = useProject();
  const panel = project.panels[activePanel] || project.panels[0];

  const allPriceRows = useMemo(
    () => getAllPriceRows(panel, prices, systemConfig?.copperConfiguration),
    [panel, prices, systemConfig],
  );
  const sheetPriceAndWeightRows = useMemo(
    () => getSheetPriceAndWeightRows(panel, prices),
    [panel, prices],
  );

  return (
    <section className="project-editor-card">
      <h2 className="section-title">المستلزمات الإضافية</h2>

      <div className="supplies-grid">
        <label className="check-card">
          <input
            type="checkbox"
            checked={showWeight}
            onChange={(e) => setShowWeight(e.target.checked)}
          />
          <span>إظهار الوزن</span>
        </label>

        <label className="check-card">
          <input
            type="checkbox"
            checked={showAllPrices}
            onChange={(e) => setShowAllPrices(e.target.checked)}
          />
          <span>إظهار جميع الأسعار</span>
        </label>
      </div>

      {showAllPrices && (
        <div className="supply-price-output">
          <h3 className="supply-output-title">جميع الأسعار</h3>

          <div className="all-prices-table-wrapper">
            <table className="all-prices-table">
              <tbody>
                <tr>
                  <th className="all-prices-section-heading" rowSpan={2}>
                    السعر
                  </th>
                  <th className="all-prices-row-label" scope="row">
                    السمك
                  </th>
                  {THICKNESS_OPTIONS.map((thickness) => (
                    <td key={thickness}>{thickness}</td>
                  ))}
                </tr>
                <tr>
                  <th className="all-prices-row-label" scope="row">
                    السعر
                  </th>
                  {allPriceRows[0].values.map((price, index) => (
                    <td key={`base-${THICKNESS_OPTIONS[index]}`}>{price}</td>
                  ))}
                </tr>
                {allPriceRows.slice(1).map((row, rowIndex) => (
                  <tr className="all-prices-rate-row" key={row.label}>
                    {rowIndex === 0 && (
                      <th
                        className="all-prices-section-heading"
                        rowSpan={allPriceRows.length - 1}
                      >
                        السعر بالنسبة
                      </th>
                    )}
                    <th className="all-prices-row-label" scope="row">
                      {row.label}
                    </th>
                    {row.values.map((price, index) => (
                      <td key={`${row.label}-${THICKNESS_OPTIONS[index]}`}>
                        {price}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showWeight && (
        <div className="supply-price-output">
          <h3 className="supply-output-title">سعر القطعة والوزن</h3>

          <div className="weight-table-wrapper">
            <table className="weight-details-table">
              <thead>
                <tr>
                  {sheetPriceAndWeightRows.map((row) => (
                    <th key={row.thickness}>{row.thickness}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {sheetPriceAndWeightRows.map((row) => (
                    <td key={`sheet-price-${row.thickness}`}>
                      {row.sheetPrice.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  {sheetPriceAndWeightRows.map((row) => (
                    <td key={`weight-${row.thickness}`}>
                      {row.weight.toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdditionalSupplies;
