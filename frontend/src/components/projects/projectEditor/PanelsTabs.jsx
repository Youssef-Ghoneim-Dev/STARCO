import { useProject } from "../../../context/ProjectContext";

const panelStatus = (panel, projectStatus) => {
  const executionStatus = panel.executionPdf?.status;
  const manufacturingStatus = panel.manufacturing?.status;
  if (manufacturingStatus === "downloadedToLaser") return ["نُزّلت إلى الليزر", "working"];
  if (manufacturingStatus === "filesReady") return ["ملفات التصنيع جاهزة", "completed"];
  if (manufacturingStatus === "awaitingFiles") return ["بانتظار ملفات التصنيع", "pending"];
  if (executionStatus === "requested") return ["مطلوب PDF تنفيذ", "working"];
  if (executionStatus === "ready") return ["PDF التنفيذ جاهز", "completed"];
  if (executionStatus === "changesRequested") return ["مطلوب تعديل PDF التنفيذ", "editing"];
  if (executionStatus === "confirmed") return ["تم تأكيد التنفيذ", "working"];
  if (executionStatus === "skipped") return ["تم تخطي PDF التنفيذ", "completed"];
  const status = panel.quoteStatus || projectStatus;
  const statuses = {
    marketingDraft: ["مسودة", "draft"],
    pending: ["قيد الانتظار", "pending"],
    inProgress: ["قيد التسعير", "working"],
    editing: ["قيد التعديل", "editing"],
    editingByMarketing: ["قيد تعديل المندوب", "editing"],
    editingByEngineer: ["قيد تعديل المهندس", "editing"],
    editingByOwner: ["قيد التعديل", "editing"],
    quoteCompleted: ["عرض السعر جاهز", "completed"],
  };
  return statuses[status] || ["عرض التفاصيل", "neutral"];
};

function PanelsTabs({ readOnly = false, onOpenPanel, openedPanel = null }) {
  const { project, activePanel, setActivePanel, addPanel, deletePanel } =
    useProject();

  return (
    <section className="project-editor-card panels-overview-card">
      <div className="panels-overview-heading" dir="rtl">
        <div><h2>لوحات المشروع</h2><p>افتح اللوحة المطلوبة لعرض بياناتها أو تعديلها.</p></div>
        <span>{project.panels.length} لوحة</span>
      </div>
      <div className="panels-tabs panels-card-grid">
        {project.panels.map((panel, index) => (
          (() => {
            const [statusLabel, statusClass] = panelStatus(panel, project.status);
            return (
          <div
            className={
              (onOpenPanel ? openedPanel === index : activePanel === index)
                ? "panel-tab-wrapper active"
                : "panel-tab-wrapper"
            }
            key={panel._id || panel.panelId || index}
            onClick={() => {
              setActivePanel(index);
              onOpenPanel?.(index);
            }}
          >
            <button
              type="button"
              className={
                activePanel === index ? "panel-tab active" : "panel-tab"
              }
            >
              <span className="panel-name-text" dir="auto">
                {panel.panelName}
              </span>
              <small>لوحة {index + 1}</small>
              <span className={`panel-card-status ${statusClass}`}>{statusLabel}</span>
              <b>فتح بيانات اللوحة</b>
            </button>

            {!readOnly && index > 0 && (
              <button
                type="button"
                className="delete-panel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePanel(index);
                }}
                aria-label={`حذف ${panel.panelName}`}
              >
                ×
              </button>
            )}
          </div>
            );
          })()
        ))}

        {!readOnly && <button type="button" className="add-panel-btn panel-add-card" onClick={() => {
          const nextIndex = project.panels.length;
          addPanel();
          onOpenPanel?.(nextIndex);
        }}>
          <strong>＋</strong><span>إضافة لوحة جديدة</span>
        </button>}
      </div>
    </section>
  );
}

export default PanelsTabs;
