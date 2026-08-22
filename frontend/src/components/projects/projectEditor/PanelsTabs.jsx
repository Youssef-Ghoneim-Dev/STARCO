import { useProject } from "../../../context/ProjectContext";

function PanelsTabs({ readOnly = false }) {
  const { project, activePanel, setActivePanel, addPanel, deletePanel } =
    useProject();

  return (
    <section className="project-editor-card">
      <div className="panels-tabs">
        {project.panels.map((panel, index) => (
          <div
            className={
              activePanel === index
                ? "panel-tab-wrapper active"
                : "panel-tab-wrapper"
            }
            key={index}
            onClick={() => setActivePanel(index)}
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
        ))}

        {!readOnly && <button type="button" className="add-panel-btn" onClick={addPanel}>
          + إضافة لوحة
        </button>}
      </div>
    </section>
  );
}

export default PanelsTabs;
