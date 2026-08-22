import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import StyledSelect from "../../common/StyledSelect";

function PanelName() {
  const { project, activePanel, updatePanelName, systemConfig, applyPanelType, updatePanelDimensions } = useProject();
  const [pendingPanelType, setPendingPanelType] = useState("");

  const panel = project.panels[activePanel] || project.panels[0];

  const choosePanelType = (nextType) => {
    const isWhatsappPanel = project?.source === "whatsapp" && panel.panelTypeKey;
    if (isWhatsappPanel && nextType !== panel.panelTypeKey) {
      setPendingPanelType(nextType);
      return;
    }
    applyPanelType(nextType);
  };

  return (
    <section className="project-editor-card panel-name-card">
      <label htmlFor="panel-name">اسم اللوحة</label>

      <textarea
        id="panel-name"
        dir="auto"
        value={panel.panelName ?? ""}
        onChange={(e) => updatePanelName(e.target.value)}
        placeholder="اسم اللوحة"
      />

      <div className="panel-setup-grid">
        <label>نوع اللوحة
          <StyledSelect value={panel.panelTypeKey || ""} placeholder="اختر نوع اللوحة" onChange={choosePanelType} options={(systemConfig?.panelTypes || []).map((type) => ({ value: type.key, label: type.name }))} />
        </label>
        {[['length', 'الطول'], ['width', 'العرض'], ['depth', 'العمق']].map(([key, label]) => (
          <label key={key}>{label}
            <input type="number" min="0" value={panel.dimensions?.[key] ?? ""} onChange={(event) => updatePanelDimensions(key, event.target.value === "" ? undefined : Number(event.target.value))} />
          </label>
        ))}
      </div>
      {pendingPanelType && <div className="panel-type-confirmation" role="alert">
        <strong>تأكيد تغيير نوع اللوحة</strong>
        <p>هذا النوع حدده المندوب. تغييرُه سيعيد ضبط الأجزاء وإعدادات التصنيع حسب النوع الجديد.</p>
        <div><button type="button" className="secondary-button" onClick={() => setPendingPanelType("")}>إلغاء</button><button type="button" className="primary-button" onClick={() => { applyPanelType(pendingPanelType); setPendingPanelType(""); }}>تغيير النوع</button></div>
      </div>}
    </section>
  );
}

export default PanelName;
