import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import StyledSelect from "../../common/StyledSelect";
import PanelsTabs from "./PanelsTabs";
import WhatsappProjectData from "./WhatsappProjectData";
import { useProject } from "../../../context/ProjectContext";
import { resolveCopperConfiguration } from "../../../utils/copperDefaults";
import { THICKNESS_OPTIONS } from "../../../utils/thicknessOptions";
import { searchClients } from "../../../services/clientsAPI";

function MarketingProjectEditor() {
  const navigate = useNavigate();
  const {
    project,
    activePanel,
    updateClient,
    updatePanel,
    deletePanel,
    submitMarketingProject,
    savingProject,
    systemConfig,
  } = useProject();
  const [clientQuery, setClientQuery] = useState(project.client?.name || "");
  const [clientResults, setClientResults] = useState([]);
  const [clientSearchActive, setClientSearchActive] = useState(false);
  const [searchingClients, setSearchingClients] = useState(false);
  const clientSearchRef = useRef(0);
  const panel = project.panels?.[activePanel] || project.panels?.[0] || {};
  const panelTypes = systemConfig?.panelTypes || [];
  const copperConfiguration = resolveCopperConfiguration(systemConfig?.copperConfiguration);
  const amperageOptions = (copperConfiguration.catalog || []).map((item) => ({ value: item.key, label: item.name }));
  const branchGroups = Array.isArray(panel.copperDetails?.branchGroups) ? panel.copperDetails.branchGroups : [];

  useEffect(() => { setClientQuery(project.client?.name || ""); }, [project.client?.name]);
  useEffect(() => {
    const term = clientQuery.trim();
    const requestId = ++clientSearchRef.current;
    if (!clientSearchActive || !term) { setClientResults([]); setSearchingClients(false); return undefined; }
    const timer = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const { data } = await searchClients(term);
        if (requestId === clientSearchRef.current) setClientResults(data.clients || []);
      } catch {
        if (requestId === clientSearchRef.current) setClientResults([]);
      } finally {
        if (requestId === clientSearchRef.current) setSearchingClients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientQuery, clientSearchActive]);

  const patchPanel = (patch) => updatePanel(activePanel, (current) => ({ ...current, ...patch }));
  const toggleThickness = (thickness) => {
    const selected = (panel.thickness || []).map(String);
    patchPanel({
      thickness: selected.includes(thickness)
        ? selected.filter((item) => item !== thickness)
        : [...selected, thickness],
    });
  };
  const chooseType = (key) => {
    const type = panelTypes.find((item) => item.key === key);
    if (!type) return;
    patchPanel({ panelTypeKey: type.key, panelType: type.name });
  };
  const setCopperDetail = (field, value) => patchPanel({
    copperDetails: { ...(panel.copperDetails || {}), [field]: value },
  });
  const setBranchGroups = (nextGroups) => {
    const validGroups = nextGroups.map((group) => ({
      id: group.id || `branch-group-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      optionKey: group.optionKey || "",
      count: Math.max(1, Number(group.count) || 1),
    }));
    const branches = validGroups.flatMap((group) => Array.from({ length: group.count }, (_, index) => ({
      branchId: `${group.id}-${index + 1}`,
      branchGroupId: group.id,
      optionKey: group.optionKey,
      direction: "one",
      barCount: 1,
    })));
    patchPanel({
      copperDetails: { ...(panel.copperDetails || {}), branchGroups: validGroups },
      copper: { ...(panel.copper || {}), enabled: true, main: { ...(panel.copper?.main || {}), optionKey: panel.copperDetails?.mainKey || "" }, branches },
    });
  };
  const setCopperMain = (optionKey) => {
    const option = copperConfiguration.catalog?.find((item) => item.key === optionKey);
    patchPanel({
      copperDetails: { ...(panel.copperDetails || {}), mainKey: optionKey, main: option?.name || "" },
      copper: { ...(panel.copper || {}), enabled: true, main: { ...(panel.copper?.main || {}), optionKey } },
    });
  };
  const save = async () => {
    const result = await submitMarketingProject();
    if (result.success) {
      toast.success("تم حفظ المشروع.");
      navigate("/projects");
    }
    else toast.error(result.message || "تعذر حفظ بيانات المشروع.");
  };
  const selectClient = (client) => {
    updateClient({ id: client._id, name: client.name, type: client.type, profitPercentage: client.profitPercentage });
    setClientQuery(client.name);
    setClientResults([]);
    setClientSearchActive(false);
  };

  return <section className="marketing-project-editor" dir="rtl">
    <div className="marketing-editor-heading"><div><h2>بيانات المشروع</h2><p>أضف بيانات طلب العميل ومرفقاته. عرض السعر مخصص للمهندس.</p></div></div>

    <section className="project-editor-card marketing-client-card">
      <div className="marketing-client-search">
        <label>اسم العميل<input value={clientQuery} onFocus={() => setClientSearchActive(true)} onChange={(event) => { const name = event.target.value; setClientQuery(name); setClientSearchActive(true); updateClient({ id: null, name }); }} placeholder="ابحث باسم العميل أو اكتب اسمًا جديدًا" /></label>
        {clientSearchActive && (searchingClients || clientResults.length > 0) && <div className="client-suggestions marketing-client-suggestions">
          {searchingClients && <p className="search-loading">جاري البحث...</p>}
          {clientResults.map((client) => <button key={client._id} type="button" className="suggestion-item" onMouseDown={(event) => { event.preventDefault(); selectClient(client); }}>{client.name} — {client.type === "company" ? "شركة" : "فرد"}</button>)}
        </div>}
      </div>
    </section>

    <PanelsTabs readOnly={false} />
    <section className="project-editor-card marketing-panel-card">
      <div className="marketing-panel-title"><h3>بيانات اللوحة {activePanel + 1}</h3>{activePanel > 0 && <button type="button" className="delete-panel-data-btn" onClick={() => deletePanel(activePanel)}>حذف اللوحة</button>}</div>
      <div className="marketing-data-grid">
        <div className="marketing-thickness-field"><span>السمك المطلوب</span><div className="thickness-grid">{THICKNESS_OPTIONS.map((item) => <label key={item} className="thickness-item"><input type="checkbox" value={item} checked={(panel.thickness || []).map(String).includes(item)} onChange={() => toggleThickness(item)} />{item} mm</label>)}</div></div>
        <label>نوع اللوحة<StyledSelect value={panel.panelTypeKey || ""} placeholder="اختر نوع اللوحة" onChange={chooseType} options={panelTypes.map((type) => ({ value: type.key, label: type.name }))} /></label>
        <label>هل يوجد نحاس<StyledSelect value={panel.hasCopper === true ? "yes" : panel.hasCopper === false ? "no" : ""} placeholder="اختر الإجابة" onChange={(value) => patchPanel({ hasCopper: value === "yes" })} options={[{ value: "yes", label: "نعم" }, { value: "no", label: "لا" }]} /></label>
      </div>
      {panel.panelTypeKey === "control" && <label className="marketing-full-field">تركيب لوحة الكنترول<StyledSelect value={panel.controlInstallation || ""} placeholder="اختر التركيب" onChange={(value) => patchPanel({ controlInstallation: value })} options={[{ value: "دفن", label: "دفن" }, { value: "عادية", label: "عادية" }]} /></label>}
      <label className="marketing-full-field">تفاصيل إضافية<textarea value={panel.additionalDetails || ""} onChange={(event) => patchPanel({ additionalDetails: event.target.value })} placeholder="اكتب أي تفاصيل إضافية" /></label>
      {panel.hasCopper === true && <section className="marketing-copper-fields"><h3>بيانات النحاس</h3><div className="marketing-data-grid"><label>نوع المفاتيح<StyledSelect value={panel.copperDetails?.switches || ""} placeholder="اختر النوع" onChange={(value) => setCopperDetail("switches", value)} options={[{ value: "My Nature", label: "My Nature" }, { value: "Molded", label: "Molded" }]} /></label><label>الرئيسي<StyledSelect value={panel.copperDetails?.mainKey || panel.copper?.main?.optionKey || ""} placeholder="اختر الأمبير" onChange={setCopperMain} options={amperageOptions} /></label></div><div className="marketing-branches"><div className="marketing-branches-heading"><h4>المفاتيح الفرعية</h4><button type="button" onClick={() => setBranchGroups([...branchGroups, { id: `branch-group-${Date.now()}`, optionKey: "", count: 1 }])}>+ إضافة فرعي</button></div>{branchGroups.map((group, index) => <div className="marketing-branch-row" key={group.id || index}><strong>فرعي {index + 1}</strong><StyledSelect value={group.optionKey || ""} placeholder="اختر الأمبير" onChange={(optionKey) => setBranchGroups(branchGroups.map((entry, current) => current === index ? { ...entry, optionKey } : entry))} options={amperageOptions} /><label>العدد<input type="number" min="1" step="1" value={group.count || 1} onChange={(event) => setBranchGroups(branchGroups.map((entry, current) => current === index ? { ...entry, count: event.target.value } : entry))} /></label><button type="button" className="delete-panel-data-btn" onClick={() => setBranchGroups(branchGroups.filter((_, current) => current !== index))}>حذف</button></div>)}</div><label className="marketing-full-field">تفاصيل إضافية للنحاس<textarea value={panel.copperDetails?.notes || ""} onChange={(event) => setCopperDetail("notes", event.target.value)} placeholder="اكتب أي تفاصيل خاصة بالنحاس" /></label></section>}
    </section>
    <WhatsappProjectData editable />
    <div className="marketing-save-actions"><button type="button" className="primary-btn" onClick={save} disabled={savingProject}>{savingProject ? "جاري الحفظ..." : "حفظ المشروع"}</button></div>
  </section>;
}

export default MarketingProjectEditor;
