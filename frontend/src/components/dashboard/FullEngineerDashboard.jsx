import { useState } from "react";
import EngineerDashboard from "./EngineerDashboard";
import ProductionManagerDashboard from "./ProductionManagerDashboard";

function FullEngineerDashboard(props) {
  const [workspace, setWorkspace] = useState("drawing");
  return <div className="full-engineer-dashboard" dir="rtl">
    <nav className="full-engineer-workspace-tabs" aria-label="اختيار مساحة عمل المهندس الشامل">
      <button type="button" className={workspace === "drawing" ? "active" : ""} onClick={() => setWorkspace("drawing")}>مهام الرسم والتسعير</button>
      <button type="button" className={workspace === "production" ? "active" : ""} onClick={() => setWorkspace("production")}>متابعة الإنتاج</button>
    </nav>
    {workspace === "drawing"
      ? <EngineerDashboard {...props} title="Full Engineer — الرسم والتسعير" />
      : <ProductionManagerDashboard {...props} role="FullEngineer" title="Full Engineer — متابعة الإنتاج" />}
  </div>;
}

export default FullEngineerDashboard;

