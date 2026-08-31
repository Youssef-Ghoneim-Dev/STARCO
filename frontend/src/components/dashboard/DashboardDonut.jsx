import { useEffect, useMemo, useState } from "react";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function DashboardDonut({ className = "", segments = [], total = 0, totalLabel = "إجمالي اللوحات" }) {
  const [activeKey, setActiveKey] = useState(null);
  const active = segments.find((segment) => segment.key === activeKey);
  const drawable = useMemo(() => segments.reduce((state, segment) => {
      const length = total ? (Number(segment.value || 0) / total) * CIRCUMFERENCE : 0;
      return { offset: state.offset + length, items: [...state.items, { ...segment, length, offset: state.offset }] };
    }, { offset: 0, items: [] }).items, [segments, total]);

  useEffect(() => {
    if (!activeKey) return undefined;
    const timer = window.setTimeout(() => setActiveKey(null), 5000);
    return () => window.clearTimeout(timer);
  }, [activeKey]);

  const activate = (key) => setActiveKey(key);

  return <div className={`dashboard-interactive-donut ${className}`}>
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
        onClick={() => activate(segment.key)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(segment.key); } }}
      ><title>{`${segment.label}: ${segment.value || 0}`}</title></circle>)}
    </svg>
    <div className={`dashboard-donut-center ${active ? "showing-segment" : ""}`} aria-live="polite">
      {active ? <><strong>{active.value || 0}</strong><span>{active.label}</span></> : <><strong>{total}</strong><span>{totalLabel}</span></>}
    </div>
  </div>;
}

export default DashboardDonut;
