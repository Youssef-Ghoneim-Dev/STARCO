import { useEffect, useMemo, useRef, useState } from "react";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function DashboardDonut({ className = "", segments = [], total = 0, totalLabel = "إجمالي اللوحات" }) {
  const donutRef = useRef(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [focusedKey, setFocusedKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [pointerPosition, setPointerPosition] = useState(null);
  const activeKey = hoveredKey || focusedKey || selectedKey;
  const drawable = useMemo(() => segments.reduce((state, segment) => {
      const length = total ? (Number(segment.value || 0) / total) * CIRCUMFERENCE : 0;
      return { offset: state.offset + length, items: [...state.items, { ...segment, length, offset: state.offset }] };
    }, { offset: 0, items: [] }).items, [segments, total]);

  const active = drawable.find((segment) => segment.key === activeKey);

  useEffect(() => {
    if (!selectedKey) return undefined;
    const timer = window.setTimeout(() => setSelectedKey(null), 4000);
    return () => window.clearTimeout(timer);
  }, [selectedKey]);

  const activate = (key) => setSelectedKey((current) => current === key ? null : key);
  const fallbackTooltipPosition = active ? (() => {
    const angle = ((active.offset + (active.length / 2)) / CIRCUMFERENCE) * Math.PI * 2 - (Math.PI / 2);
    return {
      left: `${50 + Math.cos(angle) * 48}%`,
      top: `${50 + Math.sin(angle) * 48}%`,
      "--dashboard-tooltip-color": active.color,
    };
  })() : null;
  const tooltipPosition = active ? {
    ...(hoveredKey && pointerPosition ? { left: pointerPosition.x, top: pointerPosition.y } : fallbackTooltipPosition),
    "--dashboard-tooltip-color": active.color,
  } : null;
  const followPointer = (event, key) => {
    const bounds = donutRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setHoveredKey(key);
    setPointerPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };
  const itemUnit = totalLabel.includes("مشاريع") ? "مشروع" : totalLabel.includes("سبب") || totalLabel.includes("أسباب") ? "سبب" : "لوحة";

  return <div ref={donutRef} className={`dashboard-interactive-donut ${className}`}>
    <svg viewBox="0 0 100 100" role="group" aria-label={`${totalLabel}: ${total}`}>
      <circle className="dashboard-donut-track" cx="50" cy="50" r={RADIUS} />
      {drawable.filter((segment) => segment.length > 0).map((segment) => <circle
        key={segment.key}
        className={`dashboard-donut-segment ${activeKey === segment.key ? "active" : ""}`}
        cx="50"
        cy="50"
        r={RADIUS}
        pathLength={CIRCUMFERENCE}
        stroke={segment.color}
        strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
        strokeDashoffset={-segment.offset}
        role="button"
        tabIndex="0"
        aria-label={`${segment.label}: ${segment.value || 0}`}
        onMouseEnter={(event) => followPointer(event, segment.key)}
        onMouseMove={(event) => followPointer(event, segment.key)}
        onMouseLeave={() => { setHoveredKey(null); setPointerPosition(null); }}
        onFocus={() => setFocusedKey(segment.key)}
        onBlur={() => setFocusedKey(null)}
        onClick={() => activate(segment.key)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(segment.key); } }}
      />)}
    </svg>
    <div className="dashboard-donut-center">
      <strong>{total}</strong><span>{totalLabel}</span>
    </div>
    {active && <output className="dashboard-donut-tooltip" style={tooltipPosition} aria-live="polite">
      <i aria-hidden="true" />
      <span><strong>{active.label}</strong><small>{active.value || 0} {itemUnit}</small></span>
    </output>}
  </div>;
}

export default DashboardDonut;
