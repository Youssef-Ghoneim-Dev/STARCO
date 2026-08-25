import ProductParts from "./ProductParts";
import AdditionalSupplies from "./AdditionalSupplies";
import ManufacturingSettings from "./ManufacturingSettings";
import PriceTables from "./PriceTables";
import PanelName from "./PanelName";
function PanelEditor({ readOnly = false }) {
  return (
    <section className="panel-editor">
      <fieldset className="project-read-only-fieldset" disabled={readOnly}>
        <PanelName />
        <ProductParts />
        <ManufacturingSettings />
        <PriceTables />
      </fieldset>
      <AdditionalSupplies />
    </section>
  );
}

export default PanelEditor;
