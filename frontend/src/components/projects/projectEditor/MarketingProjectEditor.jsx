import toast from "react-hot-toast";
import StyledSelect from "../../common/StyledSelect";
import PanelsTabs from "./PanelsTabs";
import WhatsappProjectData from "./WhatsappProjectData";
import { useProject } from "../../../context/ProjectContext";

const toThicknesses = (value) => String(value || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

function MarketingProjectEditor() {
  const {
    project,
    activePanel,
    updateClient,
    updatePanel,
    deletePanel,
    saveProject,
    savingProject,
    systemConfig,
  } = useProject();
  const panel = project.panels?.[activePanel] || project.panels?.[0] || {};
  const panelTypes = systemConfig?.panelTypes || [];

  const patchPanel = (patch) => updatePanel(activePanel, (current) => ({ ...current, ...patch }));
  const chooseType = (key) => {
    const type = panelTypes.find((item) => item.key === key);
    if (!type) return;
    patchPanel({ panelTypeKey: type.key, panelType: type.name });
  };
  const setCopperDetail = (field, value) => patchPanel({
    copperDetails: { ...(panel.copperDetails || {}), [field]: value },
  });
  const save = async () => {
    const result = await saveProject();
    if (result.success) toast.success("تم حفظ بيانات المشروع.");
    else toast.error(result.message || "تعذر حفظ بيانات المشروع.");
  };

  return <section className="marketing-project-editor" dir="rtl">
    <div className="marketing-editor-heading">
      <div><h2>بيانات المشروع</h2><p>أضف بيانات طلب العميل ومرفقاته. عرض السعر مخصص للمهندس.</p></div>
      <button type="button" className="primary-btn" onClick={save} disabled={savingProject}>{savingProject ? "جاري الحفظ..." : "حفظ بيانات المشروع"}</button>
    </div>

    <section className="project-editor-card marketing-client-card">
      <label>اسم العميل<input value={project.client?.name || ""} onChange={(event) => updateClient({ name: event.target.value })} placeholder="اكتب اسم العميل" /></label>
      <label>نوع العميل<StyledSelect value={project.client?.type || "person"} onChange={(value) => updateClient({ type: value })} options={[{ value: "person", label: "فرد" }, { value: "company", label: "شركة" }]} /></label>
    </section>

    <PanelsTabs readOnly={false} />
    <section className="project-editor-card marketing-panel-card">
      <div className="marketing-panel-title"><h3>بيانات {panel.panelName || `اللوحة ${activePanel + 1}`}</h3>{activePanel > 0 && <button type="button" className="delete-panel-data-btn" onClick={() => deletePanel(activePanel)}>حذف اللوحة</button>}</div>
      <div className="marketing-data-grid">
        <label>اسم اللوحة<input value={panel.panelName || ""} onChange={(event) => patchPanel({ panelName: event.target.value })} /></label>
        <label>السمك المطلوب<input value={(panel.thickness || []).join(", ")} onChange={(event) => patchPanel({ thickness: toThicknesses(event.target.value) })} placeholder="0.7, 1, 1.5" /></label>
        <label>نوع اللوحة<StyledSelect value={panel.panelTypeKey || ""} placeholder="اختر نوع اللوحة" onChange={chooseType} options={panelTypes.map((type) => ({ value: type.key, label: type.name }))} /></label>
        <label>هل يوجد نحاس<StyledSelect value={panel.hasCopper === true ? "yes" : panel.hasCopper === false ? "no" : ""} placeholder="اختر الإجابة" onChange={(value) => patchPanel({ hasCopper: value === "yes" })} options={[{ value: "yes", label: "نعم" }, { value: "no", label: "لا" }]} /></label>
      </div>
      {panel.panelTypeKey === "control" && <label className="marketing-full-field">تركيب لوحة الكنترول<input value={panel.controlInstallation || ""} onChange={(event) => patchPanel({ controlInstallation: event.target.value })} placeholder="دفن أو عادية" /></label>}
      {panel.hasCopper === true && <div className="marketing-copper-fields"><h3>بيانات النحاس</h3><div className="marketing-data-grid"><label>نوع المفاتيح<input value={panel.copperDetails?.switches || ""} onChange={(event) => setCopperDetail("switches", event.target.value)} /></label><label>الرئيسي<input value={panel.copperDetails?.main || ""} onChange={(event) => setCopperDetail("main", event.target.value)} /></label><label>الفرعيات<input value={panel.copperDetails?.branches || ""} onChange={(event) => setCopperDetail("branches", event.target.value)} placeholder="مثال: 4 × 600 أمبير" /></label></div></div>}
      <label className="marketing-full-field">تفاصيل إضافية<textarea value={panel.additionalDetails || ""} onChange={(event) => patchPanel({ additionalDetails: event.target.value })} placeholder="اكتب أي تفاصيل إضافية" /></label>
    </section>
    <WhatsappProjectData editable />
  </section>;
}

export default MarketingProjectEditor;
