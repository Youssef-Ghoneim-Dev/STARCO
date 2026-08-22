import { useEffect, useMemo, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { useProject } from "../../../context/ProjectContext";
import { getCopperCalculation } from "../../../utils/priceCalculator";
import { resolveCopperConfiguration } from "../../../utils/copperDefaults";

const branchId = () => `branch-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function CopperSelect({ value, options, placeholder, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (!controlRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, []);

  return <div className="copper-select-control" ref={controlRef}>
    <button type="button" className="copper-select-trigger" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
      <span className={selected ? "" : "copper-select-placeholder"}>{selected?.label || placeholder}</span><IoChevronDown className="copper-select-chevron" aria-hidden="true" />
    </button>
    {isOpen && <div className="copper-select-menu" role="listbox">
      {options.map((option) => <button type="button" role="option" aria-selected={String(option.value) === String(value)} className={String(option.value) === String(value) ? "is-selected" : ""} key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); }}>{option.label}</button>)}
    </div>}
  </div>;
}

function CopperCalculator() {
  const { project, activePanel, systemConfig, updateCopper } = useProject();
  const panel = project.panels[activePanel] || project.panels[0];
  const configuration = resolveCopperConfiguration(systemConfig?.copperConfiguration);
  const copper = panel.copper || { enabled: false, main: {}, branches: [] };
  const isVisible = Boolean(panel.hasCopper || copper.enabled);
  const barCounts = configuration.barCounts?.length ? configuration.barCounts : [1, 3];
  const totals = useMemo(() => getCopperCalculation(panel, configuration), [panel, configuration]);
  const optionFor = (key) => configuration.catalog?.find((item) => item.key === key);
  const optionInfo = (key) => {
    const item = optionFor(key);
    return item ? `${item.width} × ${item.thickness} مم` : "";
  };
  const amperageOptions = (configuration.catalog || []).map((item) => ({ value: item.key, label: item.name }));
  const barCountOptions = barCounts.map((count) => ({ value: count, label: String(count) }));
  const directionOptions = [{ value: "one", label: "اتجاه واحد" }, { value: "two", label: "اتجاهين" }];
  const updateMain = (field, value) => updateCopper((current) => ({ ...current, enabled: true, main: { ...(current.main || {}), [field]: value } }));
  const updateBranch = (index, field, value) => updateCopper((current) => ({ ...current, enabled: true, branches: (current.branches || []).map((branch, currentIndex) => currentIndex === index ? { ...branch, [field]: value } : branch) }));

  if (!isVisible) return <div className="copper-add-action"><button type="button" onClick={() => updateCopper((current) => ({ ...current, enabled: true, pricePerKg: current.pricePerKg ?? configuration.pricePerKg ?? "" }))}>+ إضافة نحاس للوحة</button></div>;

  return <section className="copper-calculator" dir="rtl">
    <div className="copper-calculator-heading"><div><h3>حساب النحاس</h3></div></div>
    <div className="copper-cost-fields">
      <label>سعر النحاس<input type="number" min="0" step="any" value={copper.pricePerKg ?? configuration.pricePerKg ?? ""} onChange={(event) => updateCopper((current) => ({ ...current, enabled: true, pricePerKg: event.target.value }))} /></label>
      <label>سعر الإرث والأرضي<input type="number" min="0" step="any" value={copper.earthPrice ?? ""} onChange={(event) => updateCopper((current) => ({ ...current, enabled: true, earthPrice: event.target.value, groundPrice: 0 }))} /></label>
    </div>
    <div className="copper-entry-card"><h4>النحاس الرئيسي</h4><div className="copper-entry-grid">
      <label>الأمبير<CopperSelect value={copper.main?.optionKey || ""} options={amperageOptions} placeholder="اختر الأمبير" onChange={(value) => updateMain("optionKey", value)} /></label>
      <label>الطول (مم)<input type="number" min="0" step="any" value={copper.main?.length ?? ""} onChange={(event) => updateMain("length", event.target.value)} /></label>
      <label>عدد البارات<CopperSelect value={copper.main?.barCount || barCounts[0]} options={barCountOptions} placeholder="اختر العدد" onChange={(value) => updateMain("barCount", Number(value))} /></label>
      {optionInfo(copper.main?.optionKey) && <div className="copper-readonly"><span>المقاس</span><strong>{optionInfo(copper.main?.optionKey)}</strong></div>}
    </div></div>
    <div className="copper-branches-heading"><h4>النحاس الفرعي</h4><button type="button" onClick={() => updateCopper((current) => {
      const previousBranch = current.branches?.[current.branches.length - 1];
      return {
        ...current,
        enabled: true,
        branches: [...(current.branches || []), {
          branchId: branchId(),
          optionKey: "",
          direction: previousBranch?.direction || "one",
          barCount: previousBranch?.barCount || current.main?.barCount || barCounts[0],
        }],
      };
    })}>+ إضافة فرعي</button></div>
    {(copper.branches || []).map((branch, index) => <div className="copper-entry-card copper-branch-card" key={branch.branchId || index}><div className="copper-branch-title"><h4>فرعي {index + 1}</h4><button type="button" aria-label="حذف الفرعي" onClick={() => updateCopper((current) => ({ ...current, branches: (current.branches || []).filter((_, currentIndex) => currentIndex !== index) }))}>حذف</button></div><div className="copper-entry-grid">
      <label>الأمبير<CopperSelect value={branch.optionKey || ""} options={amperageOptions} placeholder="اختر الأمبير" onChange={(value) => updateBranch(index, "optionKey", value)} /></label>
      <label>الاتجاه<CopperSelect value={branch.direction || "one"} options={directionOptions} placeholder="اختر الاتجاه" onChange={(value) => updateBranch(index, "direction", value)} /></label>
      <label>عدد البارات<CopperSelect value={branch.barCount || barCounts[0]} options={barCountOptions} placeholder="اختر العدد" onChange={(value) => updateBranch(index, "barCount", Number(value))} /></label>
      <label>الطول (مم)<input type="number" min="0" step="any" value={branch.length ?? (branch.direction === "two" ? configuration.branchLengths?.twoDirections : configuration.branchLengths?.oneDirection) ?? ""} onChange={(event) => updateBranch(index, "length", event.target.value)} /></label>
      {optionInfo(branch.optionKey) && <div className="copper-readonly"><span>المقاس</span><strong>{optionInfo(branch.optionKey)}</strong></div>}
    </div></div>)}
    <div className="copper-total"><span>وزن النحاس: <strong>{totals.weight.toFixed(3)} كجم</strong></span><span>إجمالي النحاس: <strong>{totals.total.toFixed(2)} ج.م</strong></span></div>
  </section>;
}

export default CopperCalculator;
