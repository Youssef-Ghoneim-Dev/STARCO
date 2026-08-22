import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  getGoogleDriveStatus,
  getSystemConfiguration,
  getWhatsappTemplates,
  startGoogleDriveConnection,
  updateSystemConfiguration,
  updateWhatsappTemplates,
} from "../services/systemConfigurationAPI";
import "../styles/configuration.css";

const defaultConfig = {
  sheetPrice: "", paintPrice: "",
  prices: { manufacturing: "", locks: "", hinges: "", transport: "", screws: "", stretch: "", carton: "" },
  parts: {
    chair: { defaultWidth: 40, defaultHeight: 100, defaultQuantity: 2, quantityStep: 2 },
    omega: { defaultWidth: 45.5, defaultHeight: "", defaultQuantity: 1, quantityStep: 1 },
  },
  panelTypes: [],
  copperConfiguration: { catalog: [
    { key: "2000", name: "2000 أمبير", amperage: 2000, width: 120, thickness: 10 }, { key: "1500", name: "1500 أمبير", amperage: 1500, width: 100, thickness: 10 },
    { key: "1200", name: "1200 أمبير", amperage: 1200, width: 80, thickness: 10 }, { key: "800", name: "800 أمبير", amperage: 800, width: 50, thickness: 10 },
    { key: "630", name: "630 أمبير", amperage: 630, width: 40, thickness: 10 }, { key: "400", name: "400 أمبير", amperage: 400, width: 30, thickness: 10 },
    { key: "300", name: "300 أمبير", amperage: 300, width: 20, thickness: 10 }, { key: "250", name: "250 أمبير", amperage: 250, width: 30, thickness: 5 },
    { key: "160", name: "160 أمبير", amperage: 160, width: 20, thickness: 5 }, { key: "125", name: "125 أمبير", amperage: 125, width: 15, thickness: 5 },
    { key: "100", name: "100 أمبير", amperage: 100, width: 15, thickness: 5 }, { key: "80", name: "80 أمبير", amperage: 80, width: 10, thickness: 5 }, { key: "63", name: "63 أمبير", amperage: 63, width: 10, thickness: 5 }
  ], pricePerKg: 0, barCounts: [1, 3], branchLengths: { oneDirection: 150, twoDirections: 300 }, weightFormula: "Length * BarCount * Width * Thickness / 1000000" },
};

const priceFields = [["manufacturing", "المصنعية"], ["locks", "الكوالين"], ["hinges", "المفصلات"], ["transport", "النقل"], ["screws", "المسامير"], ["stretch", "الأستريتش"], ["carton", "الكرتون"]];
const partSettings = [["chair", "الكرسي"], ["omega", "أوميجا"]];
const partFields = [["defaultWidth", "العرض الافتراضي"], ["defaultHeight", "الارتفاع الافتراضي"], ["defaultQuantity", "الكمية الافتراضية"], ["quantityStep", "خطوة الكمية"]];

function NumberField({ label, value, onChange }) {
  return <label className="configuration-number-field">{label}<input type="number" min="0" step="any" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PanelTypesEditor({ panelTypes, onChange, canEditFormulas }) {
  const [additionalNames, setAdditionalNames] = useState({});
  const updateType = (index, updater) => onChange(panelTypes.map((type, current) => current === index ? updater(type) : type));
  const addType = () => onChange([...panelTypes, { key: `type-${Date.now()}`, name: "نوع جديد", whatsappType: "", prices: { manufacturing: 0, locks: 0, hinges: 0, transport: 0, screws: 0, stretch: 0, carton: 0 }, parts: [], additionalParts: [] }]);
  return <section className="panel-types-editor">
    <div className="configuration-heading configuration-subheading"><h2>{canEditFormulas ? "أنواع الألواح والمعادلات" : "إعدادات تسعير الألواح"}</h2><p>{canEditFormulas ? "المعادلات تستخدم: Length للطول، Width للعرض، Depth للعمق. مثال: Length - 50" : "يمكنك تعديل أسعار التصنيع والأجزاء الأساسية والإضافية. المعادلات يحافظ عليها Owner Manager."}</p></div>
    {panelTypes.map((type, typeIndex) => <fieldset className="panel-type-settings" key={type.key || typeIndex}>
      <legend>{type.name || "نوع لوحة"}</legend>
      <div className="configuration-grid two-columns">
        {canEditFormulas && <><label className="configuration-number-field">الاسم<input value={type.name ?? ""} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, name: e.target.value }))} /></label>
        <label className="configuration-number-field">المفتاح الداخلي<input value={type.key ?? ""} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, key: e.target.value.replace(/\s+/g, "-").toLowerCase() }))} /></label>
        <label className="configuration-number-field">الاسم الذي يكتبه المندوب في WhatsApp<input value={type.whatsappType ?? ""} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, whatsappType: e.target.value }))} /></label></>}
      </div>
      <h3>الأجزاء الأساسية</h3>
      <div className="configured-parts-list">{(type.parts || []).map((part, partIndex) => <div className="configured-part" key={`${part.key}-${partIndex}`}>
        <label>اسم الجزء<input value={part.name ?? ""} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, parts: current.parts.map((item, i) => i === partIndex ? { ...item, name: e.target.value } : item) }))} /></label>
        {canEditFormulas && <><label>معادلة الطول<input value={part.lengthFormula ?? ""} disabled={part.manualDimensions} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, parts: current.parts.map((item, i) => i === partIndex ? { ...item, lengthFormula: e.target.value } : item) }))} /></label>
        <label>معادلة العرض<input value={part.widthFormula ?? ""} disabled={part.manualDimensions} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, parts: current.parts.map((item, i) => i === partIndex ? { ...item, widthFormula: e.target.value } : item) }))} /></label></>}
        <NumberField label="الكمية" value={part.quantity} onChange={(value) => updateType(typeIndex, (current) => ({ ...current, parts: current.parts.map((item, i) => i === partIndex ? { ...item, quantity: value } : item) }))} />
        <label className="manual-part-toggle"><input type="checkbox" checked={Boolean(part.manualDimensions)} onChange={(e) => updateType(typeIndex, (current) => ({ ...current, parts: current.parts.map((item, i) => i === partIndex ? { ...item, manualDimensions: e.target.checked } : item) }))} /> يملأه المهندس يدويًا</label>
        {canEditFormulas && <button type="button" className="configuration-delete" onClick={() => updateType(typeIndex, (current) => ({ ...current, parts: current.parts.filter((_, i) => i !== partIndex) }))}>حذف الجزء</button>}
      </div>)}</div>
      <button type="button" className="configuration-secondary" onClick={() => updateType(typeIndex, (current) => ({ ...current, parts: [...(current.parts || []), { key: `part-${Date.now()}`, name: "جزء جديد", lengthFormula: "", widthFormula: "", quantity: 1, manualDimensions: !canEditFormulas }] }))}>+ إضافة جزء أساسي</button>
      <h3>إعدادات التصنيع</h3><div className="configuration-grid">{priceFields.map(([key, label]) => <NumberField key={key} label={label} value={type.prices?.[key]} onChange={(value) => updateType(typeIndex, (current) => ({ ...current, prices: { ...current.prices, [key]: value } }))} />)}</div>
      <h3>الأجزاء الإضافية</h3>
      <div className="additional-parts-editor">{(type.additionalParts || []).map((part, partIndex) => <span className="additional-part-chip" key={`${part}-${partIndex}`}>{part}<button type="button" aria-label={`حذف ${part}`} onClick={() => updateType(typeIndex, (current) => ({ ...current, additionalParts: current.additionalParts.filter((_, index) => index !== partIndex) }))}>×</button></span>)}</div>
      <div className="additional-part-add"><input value={additionalNames[typeIndex] || ""} placeholder="اسم جزء إضافي" onChange={(event) => setAdditionalNames((current) => ({ ...current, [typeIndex]: event.target.value }))} /><button type="button" className="configuration-secondary" onClick={() => { const name = (additionalNames[typeIndex] || "").trim(); if (!name) return; updateType(typeIndex, (current) => ({ ...current, additionalParts: [...(current.additionalParts || []), name] })); setAdditionalNames((current) => ({ ...current, [typeIndex]: "" })); }}>+ إضافة جزء إضافي</button></div>
      {canEditFormulas && <button type="button" className="configuration-delete type-delete" onClick={() => onChange(panelTypes.filter((_, index) => index !== typeIndex))}>حذف نوع اللوحة</button>}
    </fieldset>)}
    {canEditFormulas && <button type="button" className="configuration-secondary" onClick={addType}>+ إضافة نوع لوحة</button>}
  </section>;
}

function CopperConfigurationEditor({ configuration, onChange }) {
  const copper = { ...defaultConfig.copperConfiguration, ...(configuration || {}), branchLengths: { ...defaultConfig.copperConfiguration.branchLengths, ...(configuration?.branchLengths || {}) } };
  const updateCatalog = (index, updater) => onChange({ ...copper, catalog: (copper.catalog || []).map((item, current) => current === index ? updater(item) : item) });
  const addCatalog = () => onChange({ ...copper, catalog: [...(copper.catalog || []), { key: `amp-${Date.now()}`, name: "أمبير جديد", amperage: 0, width: 0, thickness: 0 }] });
  return <section className="panel-types-editor copper-configuration-editor">
    <div className="configuration-heading configuration-subheading"><h2>إعدادات النحاس</h2><p>جدول الأمبيرات وعدد البارات يُستخدمان تلقائيًا في تسعير النحاس داخل كل لوحة.</p></div>
    <div className="configuration-grid two-columns copper-branch-lengths">
      <NumberField label="سعر النحاس الافتراضي" value={copper.pricePerKg} onChange={(value) => onChange({ ...copper, pricePerKg: value })} />
      <NumberField label="طول الفرعي - اتجاه واحد" value={copper.branchLengths.oneDirection} onChange={(value) => onChange({ ...copper, branchLengths: { ...copper.branchLengths, oneDirection: value } })} />
      <NumberField label="طول الفرعي - اتجاهين" value={copper.branchLengths.twoDirections} onChange={(value) => onChange({ ...copper, branchLengths: { ...copper.branchLengths, twoDirections: value } })} />
    </div>
    <label className="configuration-number-field copper-counts">أعداد البارات المتاحة (افصل بفاصلة)<input value={(copper.barCounts || []).join(", ")} onChange={(event) => onChange({ ...copper, barCounts: event.target.value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item > 0) })} /></label>
    <div className="copper-catalog-list">{(copper.catalog || []).map((item, index) => <div className="configured-part copper-catalog-item" key={item.key || index}>
      <label>الاسم<input value={item.name ?? ""} onChange={(event) => updateCatalog(index, (current) => ({ ...current, name: event.target.value }))} /></label>
      <NumberField label="الأمبير" value={item.amperage} onChange={(value) => updateCatalog(index, (current) => ({ ...current, amperage: value }))} />
      <NumberField label="العرض (مم)" value={item.width} onChange={(value) => updateCatalog(index, (current) => ({ ...current, width: value }))} />
      <NumberField label="السمك (مم)" value={item.thickness} onChange={(value) => updateCatalog(index, (current) => ({ ...current, thickness: value }))} />
      <button type="button" className="configuration-delete" onClick={() => onChange({ ...copper, catalog: copper.catalog.filter((_, current) => current !== index) })}>حذف</button>
    </div>)}</div>
    <button type="button" className="configuration-secondary" onClick={addCatalog}>+ إضافة مقاس نحاس</button>
  </section>;
}

function Configuration() {
  const { user } = useAuth();
  const canManagePricing = user?.role === "OwnerManager" || user?.role === "Engineer";
  const isOwner = user?.role === "OwnerManager";
  const [config, setConfig] = useState(defaultConfig);
  const [templates, setTemplates] = useState({ startProject: "", panel: "" });
  const [loading, setLoading] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [driveStatus, setDriveStatus] = useState({ connected: false });
  const [connectingDrive, setConnectingDrive] = useState(false);

  useEffect(() => {
    if (!canManagePricing) return;
    const requests = [getSystemConfiguration()];
    if (isOwner) requests.push(getWhatsappTemplates(), getGoogleDriveStatus());

    Promise.all(requests)
      .then(([configurationResponse, templatesResponse, driveResponse]) => {
        const incoming = configurationResponse.data || {};
        setConfig({ ...defaultConfig, ...incoming, prices: { ...defaultConfig.prices, ...(incoming.prices || {}) }, parts: { chair: { ...defaultConfig.parts.chair, ...(incoming.parts?.chair || {}) }, omega: { ...defaultConfig.parts.omega, ...(incoming.parts?.omega || {}) } }, panelTypes: incoming.panelTypes || [], copperConfiguration: { ...defaultConfig.copperConfiguration, ...(incoming.copperConfiguration || {}), branchLengths: { ...defaultConfig.copperConfiguration.branchLengths, ...(incoming.copperConfiguration?.branchLengths || {}) } } });
        if (templatesResponse) setTemplates(templatesResponse.data);
        if (driveResponse) setDriveStatus(driveResponse.data);
      })
      .catch((error) => toast.error(error?.response?.data?.message || "تعذر تحميل الإعدادات."))
      .finally(() => setLoading(false));
  }, [canManagePricing, isOwner]);

  const savePricing = async (event) => {
    event.preventDefault();
    setSavingPricing(true);
    try {
      const numberObject = (object, allowBlank = false) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, allowBlank && value === "" ? null : Number(value)]));
      const panelTypes = (config.panelTypes || []).map((type) => ({ ...type, prices: numberObject(type.prices || {}), parts: (type.parts || []).map((part) => ({ ...part, quantity: Number(part.quantity) || 1 })) }));
      const copperConfiguration = { ...config.copperConfiguration, barCounts: (config.copperConfiguration?.barCounts || []).map(Number).filter((value) => Number.isFinite(value) && value > 0), branchLengths: numberObject(config.copperConfiguration?.branchLengths || {}), catalog: (config.copperConfiguration?.catalog || []).map((item) => ({ ...item, amperage: Number(item.amperage), width: Number(item.width), thickness: Number(item.thickness) })) };
      const payload = { sheetPrice: Number(config.sheetPrice), paintPrice: Number(config.paintPrice), prices: numberObject(config.prices), parts: { chair: numberObject(config.parts.chair), omega: numberObject(config.parts.omega, true) }, panelTypes, copperConfiguration };
      const { data } = await updateSystemConfiguration(payload);
      setConfig((current) => ({ ...current, ...data.config }));
      toast.success("تم حفظ إعدادات التسعير.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حفظ إعدادات التسعير.");
    } finally { setSavingPricing(false); }
  };

  const saveTemplates = async (event) => {
    event.preventDefault();
    setSavingTemplates(true);
    try { const { data } = await updateWhatsappTemplates(templates); setTemplates(data.whatsappTemplates); toast.success("تم حفظ قوالب WhatsApp."); }
    catch (error) { toast.error(error?.response?.data?.message || "تعذر حفظ القوالب."); }
    finally { setSavingTemplates(false); }
  };

  const connectGoogleDrive = async () => {
    setConnectingDrive(true);
    try { const { data } = await startGoogleDriveConnection(); window.location.assign(data.authorizationUrl); }
    catch (error) { setConnectingDrive(false); toast.error(error?.response?.data?.message || "تعذر بدء ربط Google Drive."); }
  };

  if (!canManagePricing) return <DashboardLayout notAllowed><p className="configuration-denied">هذه الصفحة غير متاحة لحسابك.</p></DashboardLayout>;

  return <DashboardLayout notAllowed><section className="configuration-page" dir="rtl">
    <div className="configuration-heading"><h1>الإعدادات</h1><p>أسعار المشروع والقيم الافتراضية للأجزاء الجديدة.</p></div>
    <PanelTypesEditor panelTypes={config.panelTypes || []} canEditFormulas={isOwner} onChange={(panelTypes) => setConfig((current) => ({ ...current, panelTypes }))} />
    {isOwner && <CopperConfigurationEditor configuration={config.copperConfiguration} onChange={(copperConfiguration) => setConfig((current) => ({ ...current, copperConfiguration }))} />}
    <form className="pricing-form" onSubmit={savePricing}>
      <h2>أسعار الخامات</h2>
      <div className="configuration-grid two-columns"><NumberField label="سعر الصاج" value={config.sheetPrice} onChange={(value) => setConfig((current) => ({ ...current, sheetPrice: value }))} /><NumberField label="سعر الدهان" value={config.paintPrice} onChange={(value) => setConfig((current) => ({ ...current, paintPrice: value }))} /></div>
      <h2>إعدادات التصنيع للمشاريع غير المحددة النوع</h2>
      <div className="configuration-grid">{priceFields.map(([key, label]) => <NumberField key={key} label={label} value={config.prices[key]} onChange={(value) => setConfig((current) => ({ ...current, prices: { ...current.prices, [key]: value } }))} />)}</div>
      <h2>الكرسي والأوميجا</h2>
      <div className="configuration-grid two-columns">{partSettings.map(([part, title]) => <fieldset className="part-settings" key={part}><legend>{title}</legend>{partFields.map(([key, label]) => <NumberField key={key} label={label} value={config.parts[part][key]} onChange={(value) => setConfig((current) => ({ ...current, parts: { ...current.parts, [part]: { ...current.parts[part], [key]: value } } }))} />)}</fieldset>)}</div>
      <button type="submit" disabled={loading || savingPricing}>{savingPricing ? "جاري الحفظ..." : "حفظ إعدادات التسعير"}</button>
    </form>
    {isOwner && <><div className="configuration-heading configuration-subheading"><h2>قوالب WhatsApp</h2><p>هذه القوالب خاصة بمدير النظام فقط.</p></div>
      <form className="template-form" onSubmit={saveTemplates}><label htmlFor="start-template">قالب بدء مشروع جديد</label><textarea id="start-template" value={templates.startProject} onChange={(event) => setTemplates((current) => ({ ...current, startProject: event.target.value }))} disabled={loading || savingTemplates} spellCheck="false" /><label htmlFor="panel-template">قالب بيانات اللوحة</label><textarea id="panel-template" value={templates.panel} onChange={(event) => setTemplates((current) => ({ ...current, panel: event.target.value }))} disabled={loading || savingTemplates} spellCheck="false" /><p className="template-note">يمكنك إضافة سطور إرشادية، لكن لا تحذف أوامر STARCO وأسماء الحقول الأساسية.</p><button type="submit" disabled={loading || savingTemplates}>{savingTemplates ? "جاري الحفظ..." : "حفظ القوالب"}</button></form>
      <section className="drive-connection-card"><div><h2>حفظ مرفقات WhatsApp</h2><p>{driveStatus.connected ? "Google Drive مربوط وجاهز لحفظ الصور والتسجيلات." : "اربط حساب Google الشخصي لحفظ الصور والتسجيلات في مساحتك."}</p></div><button type="button" onClick={connectGoogleDrive} disabled={loading || connectingDrive}>{connectingDrive ? "جاري الفتح..." : driveStatus.connected ? "إعادة ربط Google Drive" : "ربط Google Drive"}</button></section>
    </>}
  </section></DashboardLayout>;
}

export default Configuration;
