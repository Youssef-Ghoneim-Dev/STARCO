import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HiOutlineChartBar, HiOutlineX } from "react-icons/hi";

function MarketingTeamModal({ rows = [], label, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [onClose]);

  const rankedRows = [...rows].sort((a, b) => b[3] - a[3] || b[2] - a[2]);

  return createPortal(<div className="dashboard-tasks-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dashboard-tasks-modal marketing-team-modal" role="dialog" aria-modal="true" aria-labelledby="marketing-team-title" dir="rtl">
      <header><div><span>أداء فريق التسويق</span><h2 id="marketing-team-title">فريق التسويق — {label}</h2><p>ترتيب المسوقين حسب المشاريع المكتملة ونسبة الإكمال الفعلية.</p></div><button type="button" onClick={onClose} aria-label="إغلاق"><HiOutlineX /></button></header>
      <div className="marketing-team-performance-list">{rankedRows.length ? rankedRows.map((row, index) => {
        const completion = Number.parseInt(row[4], 10) || 0;
        return <article key={`${row[0]}-${index}`}>
          <b className="marketing-team-rank">{index + 1}</b>
          <div className="marketing-team-avatar">{String(row[0] || "M").trim().charAt(0).toUpperCase()}</div>
          <section><strong>{row[0]}</strong><small>{row[1]} جديدة · {row[2]} إجمالي · {row[3]} مكتملة</small><i><span style={{ width: `${Math.min(completion, 100)}%` }} /></i></section>
          <div className="marketing-team-rate"><HiOutlineChartBar /><strong>{row[4]}</strong><small>إكمال</small></div>
        </article>;
      }) : <p className="dashboard-tasks-empty">لا يوجد مسوقون في الفريق حاليًا.</p>}</div>
    </section>
  </div>, document.body);
}

export default MarketingTeamModal;
