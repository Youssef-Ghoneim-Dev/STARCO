import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoChevronDown } from "react-icons/io5";

function StyledSelect({ value, options, placeholder = "اختر", onChange, disabled = false, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

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
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const opensAbove = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(120, Math.min(260, opensAbove ? availableAbove : availableBelow));
      setMenuPosition({
        left: rect.left,
        top: opensAbove ? undefined : rect.bottom + 6,
        bottom: opensAbove ? window.innerHeight - rect.top + 6 : undefined,
        width: rect.width,
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
  }, [open]);

  return <div className={`app-select${disabled ? " is-disabled" : ""}`} ref={ref}>
    <button type="button" className="app-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
      <span className={selected ? "" : "app-select-placeholder"}>{selected?.label || placeholder}</span><IoChevronDown className="app-select-chevron" aria-hidden="true" />
    </button>
    {open && menuPosition && createPortal(<div ref={menuRef} className="app-select-menu app-select-menu-portal" role="listbox" style={menuPosition}>
      {options.map((option) => <button type="button" key={option.value} role="option" aria-selected={String(option.value) === String(value)} className={String(option.value) === String(value) ? "is-selected" : ""} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}
    </div>, document.body)}
  </div>;
}

export default StyledSelect;
