import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoCheckmark, IoChevronDown } from "react-icons/io5";

function StyledSelect({ value, options, placeholder = "اختر", onChange, disabled = false, ariaLabel, direction = "rtl", multiple = false, menuMatchParent = false }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const values = multiple ? (Array.isArray(value) ? value.map(String) : []) : [String(value)];
  const selectedOptions = options.filter((option) => values.includes(String(option.value)));
  const selected = selectedOptions[0];
  const triggerLabel = multiple
    ? selectedOptions.length === 0 ? (options.find((option) => option.value === "all")?.label || placeholder) : selectedOptions.length === 1 ? selected.label : `${selectedOptions.length} statuses selected`
    : selected?.label || placeholder;
  const selectOption = (optionValue) => {
    if (!multiple) {
      onChange(optionValue);
      setOpen(false);
      return;
    }
    if (String(optionValue) === "all") {
      onChange([]);
      return;
    }
    const stringValue = String(optionValue);
    onChange(values.includes(stringValue) ? values.filter((entry) => entry !== stringValue) : [...values, stringValue]);
  };

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const menuRect = menuMatchParent ? ref.current?.parentElement?.getBoundingClientRect() || rect : rect;
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const opensAbove = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(120, Math.min(260, opensAbove ? availableAbove : availableBelow));
      setMenuPosition({
        left: Math.max(12, Math.min(menuRect.left, window.innerWidth - menuRect.width - 12)),
        top: opensAbove ? undefined : rect.bottom + 6,
        bottom: opensAbove ? window.innerHeight - rect.top + 6 : undefined,
        width: Math.min(menuRect.width, window.innerWidth - 24),
        maxHeight,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuMatchParent, open]);

  return <div className={`app-select${disabled ? " is-disabled" : ""}`} ref={ref} dir={direction}>
    <button type="button" className="app-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
      <span className={selected ? "" : "app-select-placeholder"}>{triggerLabel}</span><IoChevronDown className="app-select-chevron" aria-hidden="true" />
    </button>
    {open && menuPosition && createPortal(<div ref={menuRef} className={`app-select-menu app-select-menu-portal${direction === "ltr" ? " is-ltr" : ""}${multiple ? " is-multiple" : ""}`} dir={direction} role="listbox" aria-multiselectable={multiple || undefined} style={menuPosition}>
      {options.map((option) => { const optionSelected = multiple ? (option.value === "all" ? values.length === 0 : values.includes(String(option.value))) : String(option.value) === String(value); return <button type="button" key={option.value} role="option" aria-selected={optionSelected} className={optionSelected ? "is-selected" : ""} onClick={() => selectOption(option.value)}>{multiple && <IoCheckmark aria-hidden="true" />}{option.label}</button>; })}
    </div>, document.body)}
  </div>;
}

export default StyledSelect;
