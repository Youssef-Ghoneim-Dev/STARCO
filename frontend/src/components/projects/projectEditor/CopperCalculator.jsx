import { useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { useProject } from "../../../context/ProjectContext";
import { getCopperCalculation } from "../../../utils/priceCalculator";
import { resolveCopperConfiguration } from "../../../utils/copperDefaults";
import { convertAllCopperBranchDirections, convertCopperBranchDirection } from "../../../utils/copperBranches";

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
  const [confirmRemove, setConfirmRemove] = useState(false);
  const configuration = resolveCopperConfiguration(systemConfig?.copperConfiguration);
  const copper = panel.copper || { enabled: false, main: {}, branches: [] };
  const isVisible = Boolean(panel.hasCopper || copper.enabled);
  const barCounts = configuration.barCounts?.length ? configuration.barCounts : [1, 3];
  const totals = getCopperCalculation(panel, configuration);
  const optionFor = (key) => configuration.catalog?.find((item) => item.key === key);
  const optionInfo = (key) => {
    const item = optionFor(key);
    return item ? `${item.width} × ${item.thickness} مم` : "";
  };
  const amperageOptions = (configuration.catalog || []).map((item) => ({ value: item.key, label: item.name }));
  const barCountOptions = barCounts.map((count) => ({ value: count, label: String(count) }));
  const directionOptions = [{ value: "one", label: "اتجاه واحد" }, { value: "two", label: "اتجاهين" }];
  const defaultCopperPrice = configuration.pricePerKg ?? "";
  const branches = copper.branches || [];
  const commonDirection = branches.length && branches.every((branch) => (branch.direction || "one") === (branches[0].direction || "one")) ? (branches[0].direction || "one") : "";
  const commonBarCount = branches.length && branches.every((branch) => Number(branch.barCount || barCounts[0]) === Number(branches[0].barCount || barCounts[0])) ? Number(branches[0].barCount || barCounts[0]) : "";
  const updateMain = (field, value) => updateCopper((current) => ({
    ...current,
    enabled: true,
    main: { ...(current.main || {}), [field]: value },
    branches: field === "barCount"
      ? (current.branches || []).map((branch) => ({ ...branch, barCount: value }))
      : (current.branches || []),
  }));
  const updateBranch = (index, field, value) => updateCopper((current) => {
    if (field === "direction") return {
      ...current,
      enabled: true,
      branches: convertCopperBranchDirection(current.branches || [], index, value),
    };
    return {
      ...current,
      enabled: true,
      branches: (current.branches || []).map((branch, currentIndex) =>
        currentIndex === index ? { ...branch, [field]: value } : branch
      )
    };
  });
  const updateAllBranches = (field, value) => updateCopper((current) => ({
    ...current,
    enabled: true,
    branches: field === "direction"
      ? convertAllCopperBranchDirections(current.branches || [], value)
      : (current.branches || []).map((branch) => ({ ...branch, [field]: value })),
  }));
  const addBranch = () => updateCopper((current) => {
      const previousBranch = current.branches?.[current.branches.length - 1];
      const direction = previousBranch?.direction || commonDirection || "one";
      const barCount = previousBranch?.barCount || commonBarCount || current.main?.barCount || barCounts[0];
      return {
        ...current,
        enabled: true,
        branches: [...(current.branches || []), {
          branchId: branchId(),
          branchGroupId: "",
          optionKey: "",
          direction,
          barCount,
          quantity: 1,
        }],
      };
    });
  const removeCopper = () => {
    updateCopper(() => ({ enabled: false, pricePerKg: defaultCopperPrice, earthPrice: "", groundPrice: "", main: { optionKey: "", length: "", barCount: barCounts[0] }, branches: [] }));
    setConfirmRemove(false);
  };

  if (!isVisible) return <div className="copper-add-action"><button type="button" onClick={() => updateCopper((current) => ({ ...current, enabled: true, pricePerKg: current.pricePerKg === "" || current.pricePerKg == null ? defaultCopperPrice : current.pricePerKg }))}>+ إضافة نحاس للوحة</button></div>;

  return <section className="copper-calculator" dir="rtl">
    <div className="copper-calculator-heading"><div><h3>حساب النحاس</h3></div><button type="button" className="copper-remove" onClick={() => ["whatsapp", "marketing"].includes(project?.source) && panel.hasCopper ? setConfirmRemove(true) : removeCopper()}>حذف النحاس</button></div>
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
    <div className="copper-branches-heading"><h4>النحاس الفرعي</h4><div className="copper-branches-bulk"><strong>تطبيق على كل الفرعيات</strong><div className="copper-bulk-group"><span>الاتجاه</span><div>{directionOptions.map((option) => <button type="button" className={commonDirection === option.value ? "is-active" : ""} key={option.value} onClick={() => updateAllBranches("direction", option.value)}>{option.label}</button>)}</div></div><div className="copper-bulk-group"><span>عدد البارات</span><div>{barCountOptions.map((option) => <button type="button" className={String(commonBarCount) === String(option.value) ? "is-active" : ""} key={option.value} onClick={() => updateAllBranches("barCount", Number(option.value))}>{option.label}</button>)}</div></div></div><button type="button" onClick={addBranch}>+ إضافة فرعي</button></div>
    {(copper.branches || []).map((branch, index) => <div className="copper-entry-card copper-branch-card" key={branch.branchId || index}><div className="copper-branch-title"><h4>فرعي {index + 1}</h4><button type="button" aria-label="حذف الفرعي" onClick={() => updateCopper((current) => ({ ...current, branches: (current.branches || []).filter((_, currentIndex) => currentIndex !== index) }))}>حذف</button></div><div className="copper-entry-grid">
      <label>الأمبير<CopperSelect value={branch.optionKey || ""} options={amperageOptions} placeholder="اختر الأمبير" onChange={(value) => updateBranch(index, "optionKey", value)} /></label>
      <label>الاتجاه<CopperSelect value={branch.direction || "one"} options={directionOptions} placeholder="اختر الاتجاه" onChange={(value) => updateBranch(index, "direction", value)} /></label>
      <label>عدد البارات<CopperSelect value={branch.barCount || barCounts[0]} options={barCountOptions} placeholder="اختر العدد" onChange={(value) => updateBranch(index, "barCount", Number(value))} /></label>
      <label>عدد القطع<input type="number" min="1" step="1" inputMode="numeric" value={branch.quantity ?? 1} onChange={(event) => updateBranch(index, "quantity", event.target.value)} onBlur={() => { if (branch.quantity === "") updateBranch(index, "quantity", 1); }} /></label>
      <label>الطول (مم)<input type="number" min="0" step="any" value={branch.length ?? (branch.direction === "two" ? configuration.branchLengths?.twoDirections : configuration.branchLengths?.oneDirection) ?? ""} onChange={(event) => updateBranch(index, "length", event.target.value)} /></label>
      {optionInfo(branch.optionKey) && <div className="copper-readonly"><span>المقاس</span><strong>{optionInfo(branch.optionKey)}</strong></div>}
    </div></div>)}
    <div className="copper-total"><span>وزن النحاس: <strong>{totals.weight.toFixed(3)} كجم</strong></span><span>إجمالي النحاس: <strong>{totals.total.toFixed(2)} ج.م</strong></span></div>
    {confirmRemove && <div className="media-choice-backdrop" role="dialog" aria-modal="true"><div className="media-choice-dialog media-delete-dialog"><h3>حذف النحاس</h3><p>المندوب حدّد أن هذه اللوحة تحتوي على نحاس. هل أنت متأكد من حذف بيانات النحاس؟</p><div className="media-delete-actions"><button type="button" onClick={() => setConfirmRemove(false)}>إلغاء</button><button type="button" className="media-delete-confirm" onClick={removeCopper}>نعم، حذف النحاس</button></div></div></div>}
  </section>;
}

export default CopperCalculator;
