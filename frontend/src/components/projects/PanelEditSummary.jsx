export default function PanelEditSummary({ panel }) {
  const summary = panel?.lastMarketingEdit;
  const changes = Array.isArray(summary?.changes) ? summary.changes : [];
  if (!changes.length) return null;
  const resultLabel = summary.requiresExecutionPdf
    ? "لم يتغير السعر - مطلوب PDF تنفيذ جديد"
    : summary.requiresEngineer
      ? "تحتاج مراجعة المهندس"
      : "تم تطبيقها تلقائيًا";
  const resultClass = summary.requiresExecutionPdf
    ? "execution-update"
    : summary.requiresEngineer
      ? "needs-engineer"
      : "automatic";

  return (
    <details className="panel-edit-summary" dir="rtl">
      <summary>
        <span><strong>تفاصيل آخر تعديل على اللوحة</strong><small>{changes.length} تغيير مسجل</small></span>
        <b className={resultClass}>{resultLabel}</b>
      </summary>
      <div className="panel-edit-summary-list">
        {changes.map((change) => (
          <article key={change.field}>
            <h4>{change.label}</h4>
            <div><span>قبل</span><p>{change.before}</p></div>
            <div><span>بعد</span><p>{change.after}</p></div>
          </article>
        ))}
        <footer>
          <span>{summary.editedByName || "مستخدم النظام"}</span>
          {summary.editedAt && <time>{new Date(summary.editedAt).toLocaleString("ar-EG")}</time>}
        </footer>
      </div>
    </details>
  );
}
