import ProductParts from "./ProductParts";
import AdditionalSupplies from "./AdditionalSupplies";
import ManufacturingSettings from "./ManufacturingSettings";
import PriceTables from "./PriceTables";
import PanelName from "./PanelName";
function PanelEditor() {
  return (
    <section className="panel-editor">
        <PanelName />
      <ProductParts />

      <ManufacturingSettings />

      <PriceTables />
      <AdditionalSupplies />
    </section>
  );
}

export default PanelEditor;
