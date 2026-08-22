import { useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";

function StyledSelect({ value, options, placeholder = "اختر", onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div className="app-select" ref={ref}>
    <button type="button" className="app-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span className={selected ? "" : "app-select-placeholder"}>{selected?.label || placeholder}</span><IoChevronDown className="app-select-chevron" aria-hidden="true" />
    </button>
    {open && <div className="app-select-menu" role="listbox">
      {options.map((option) => <button type="button" key={option.value} role="option" aria-selected={String(option.value) === String(value)} className={String(option.value) === String(value) ? "is-selected" : ""} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}
    </div>}
  </div>;
}

export default StyledSelect;
