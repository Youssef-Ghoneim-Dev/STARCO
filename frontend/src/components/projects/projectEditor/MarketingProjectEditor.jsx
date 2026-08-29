import toast from "react-hot-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StyledSelect from "../../common/StyledSelect";
import WhatsappProjectData from "./WhatsappProjectData";
import { useProject } from "../../../context/ProjectContext";
import { resolveCopperConfiguration } from "../../../utils/copperDefaults";
import { THICKNESS_OPTIONS } from "../../../utils/thicknessOptions";
import { getPanelNameDirection } from "../../../utils/panelNameDirection";

function MarketingProjectEditor() {
  const navigate = useNavigate();
  const [validationErrors, setValidationErrors] = useState({});
  const {
    project,
    activePanel,
    updatePanel,
    deletePanel,
    submitMarketingProject,
    savingProject,
    systemConfig,
  } = useProject();
  const panel = project.panels?.[activePanel] || project.panels?.[0] || {};
  const panelTypes = systemConfig?.panelTypes || [];
  const copperConfiguration = resolveCopperConfiguration(
    systemConfig?.copperConfiguration,
  );
  const amperageOptions = (copperConfiguration.catalog || []).map((item) => ({
    value: item.key,
    label: item.name,
  }));
  const branchGroups = Array.isArray(panel.copperDetails?.branchGroups)
    ? panel.copperDetails.branchGroups
    : [];
  const canEditActivePanel =
    panel.status === "draft" ||
    project.marketingEditSession?.active;

  const patchPanel = (patch) => {
    if (!canEditActivePanel) return;
    updatePanel(activePanel, (current) => ({ ...current, ...patch }));
  };
  const clearErrors = (...keys) => {
    setValidationErrors((current) => {
      if (!keys.some((key) => current[key])) return current;
      const next = { ...current };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };
  const toggleThickness = (thickness) => {
    clearErrors("thickness");
    const selected = (panel.thickness || []).map(String);
    patchPanel({
      thickness: selected.includes(thickness)
        ? selected.filter((item) => item !== thickness)
        : [...selected, thickness],
    });
  };
  const chooseType = (key) => {
    const type = panelTypes.find((item) => item.key === key);
    if (!type) return;
    clearErrors("panelType", "controlInstallation");
    patchPanel({ panelTypeKey: type.key, panelType: type.name, ...(type.key !== "control" ? { controlInstallation: "" } : {}) });
  };
  const setCopperDetail = (field, value) => {
    clearErrors(field === "switches" ? "copperSwitches" : "copper");
    patchPanel({
      copperDetails: { ...(panel.copperDetails || {}), [field]: value },
    });
  };
  const setBranchGroups = (nextGroups) => {
    clearErrors("copperBranches");
    const validGroups = nextGroups.map((group) => ({
      id:
        group.id ||
        `branch-group-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      optionKey: group.optionKey || "",
      count: group.count === "" ? "" : Math.max(1, Number(group.count) || 1),
    }));
    const branches = validGroups
      .filter((group) => Number(group.count) > 0)
      .map((group) => ({
        branchId: `${group.id}-branch`,
        branchGroupId: group.id,
        optionKey: group.optionKey,
        direction: "one",
        barCount: 1,
        quantity: Math.max(1, Number(group.count) || 1),
      }));
    patchPanel({
      copperDetails: {
        ...(panel.copperDetails || {}),
        branchGroups: validGroups,
      },
      copper: {
        ...(panel.copper || {}),
        enabled: true,
        main: {
          ...(panel.copper?.main || {}),
          optionKey: panel.copperDetails?.mainKey || "",
        },
        branches,
      },
    });
  };
  const setCopperMain = (optionKey) => {
    clearErrors("copperMain");
    const option = copperConfiguration.catalog?.find(
      (item) => item.key === optionKey,
    );
    patchPanel({
      copperDetails: {
        ...(panel.copperDetails || {}),
        mainKey: optionKey,
        main: option?.name || "",
      },
      copper: {
        ...(panel.copper || {}),
        enabled: true,
        main: { ...(panel.copper?.main || {}), optionKey },
      },
    });
  };
  const validate = () => {
    const errors = {};
    if (!(panel.thickness || []).length) errors.thickness = "اختر سمكًا مطلوبًا واحدًا على الأقل.";
    if (!panel.panelTypeKey) errors.panelType = "اختر نوع اللوحة.";
    if (panel.hasCopper !== true && panel.hasCopper !== false) errors.hasCopper = "حدد هل يوجد نحاس أم لا.";
    if (panel.panelTypeKey === "control" && !panel.controlInstallation) errors.controlInstallation = "اختر تركيب لوحة الكنترول.";
    if (panel.hasCopper === true) {
      if (!panel.copperDetails?.switches) errors.copperSwitches = "اختر نوع المفاتيح.";
      if (!(panel.copperDetails?.mainKey || panel.copper?.main?.optionKey)) errors.copperMain = "اختر أمبير المفتاح الرئيسي.";
      if (!branchGroups.length || branchGroups.some((group) => !group.optionKey || !Number.isInteger(Number(group.count)) || Number(group.count) < 1)) {
        errors.copperBranches = branchGroups.length ? "أكمل الأمبير والعدد الصحيح لكل مفتاح فرعي." : "أضف مفتاحًا فرعيًا واحدًا على الأقل وأكمل بياناته.";
      }
    }
    return errors;
  };
  const save = async () => {
    const errors = validate();
    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      window.requestAnimationFrame(() => document.querySelector(".marketing-project-editor .form-field-error")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setValidationErrors({});
    const result = await submitMarketingProject();
    if (result.success) {
      if (result.notification?.includes("تعذر"))
        toast.error(result.notification, { duration: 7000 });
      navigate(`/projects/${project._id}`);
    } else if (result.fields) {
      setValidationErrors(result.fields);
      window.requestAnimationFrame(() => document.querySelector(".marketing-project-editor .form-field-error")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } else toast.error(result.message || "تعذر حفظ بيانات المشروع.");
  };
  return (
    <section className="marketing-project-editor" dir="rtl">
      <div className="marketing-editor-heading">
        <div>
          <h2>بيانات اللوحة</h2>
          <p>أضف بيانات اللوحة ومرفقاتها. عرض السعر مخصص للمهندس.</p>
        </div>
      </div>
      <div className="panel-detail-shell">
          <div className="panel-detail-heading">
            <h2><bdi dir={getPanelNameDirection(panel.panelName)}>
              {panel.panelName || `لوحة ${activePanel + 1}`}
            </bdi></h2>
            <button type="button" onClick={() => navigate(`/projects/${project._id}`)}>
              العودة إلى اللوحات
            </button>
          </div>
          {!canEditActivePanel && (
            <div className="project-read-only-notice">
              هذه اللوحة للعرض فقط؛ التعديل مفتوح للوحة المحددة وحدها.
            </div>
          )}
          <fieldset
            className="project-read-only-fieldset"
            disabled={!canEditActivePanel}
          >
            <section className="project-editor-card marketing-panel-card">
              <div className="marketing-panel-title">
                <h3>بيانات اللوحة {activePanel + 1}</h3>
                {activePanel > 0 && (
                  <button
                    type="button"
                    className="delete-panel-data-btn"
                    onClick={() => deletePanel(activePanel)}
                  >
                    حذف اللوحة
                  </button>
                )}
              </div>
              <div className="marketing-data-grid">
                <div className="marketing-thickness-field">
                  <span>السمك المطلوب</span>
                  <div className="thickness-grid">
                    {THICKNESS_OPTIONS.map((item) => (
                      <label key={item} className="thickness-item">
                        <input
                          type="checkbox"
                          value={item}
                          checked={(panel.thickness || [])
                            .map(String)
                            .includes(item)}
                          onChange={() => toggleThickness(item)}
                        />
                        {item} mm
                      </label>
                    ))}
                  </div>
                  {validationErrors.thickness && <small className="form-field-error">{validationErrors.thickness}</small>}
                </div>
                <label>
                  نوع اللوحة
                  <StyledSelect
                    value={panel.panelTypeKey || ""}
                    placeholder="اختر نوع اللوحة"
                    onChange={chooseType}
                    options={panelTypes.map((type) => ({
                      value: type.key,
                      label: type.name,
                    }))}
                  />
                  {validationErrors.panelType && <small className="form-field-error">{validationErrors.panelType}</small>}
                </label>
                <label>
                  هل يوجد نحاس
                  <StyledSelect
                    value={
                      panel.hasCopper === true
                        ? "yes"
                        : panel.hasCopper === false
                          ? "no"
                          : ""
                    }
                    placeholder="اختر الإجابة"
                    onChange={(value) => { clearErrors("hasCopper", "copperSwitches", "copperMain", "copperBranches"); patchPanel({ hasCopper: value === "yes" }); }}
                    options={[
                      { value: "yes", label: "نعم" },
                      { value: "no", label: "لا" },
                    ]}
                  />
                  {validationErrors.hasCopper && <small className="form-field-error">{validationErrors.hasCopper}</small>}
                </label>
              </div>
              {panel.panelTypeKey === "control" && (
                <label className="marketing-full-field">
                  تركيب لوحة الكنترول
                  <StyledSelect
                    value={panel.controlInstallation || ""}
                    placeholder="اختر التركيب"
                    onChange={(value) => { clearErrors("controlInstallation"); patchPanel({ controlInstallation: value }); }}
                    options={[
                      { value: "دفن", label: "دفن" },
                      { value: "عادية", label: "عادية" },
                    ]}
                  />
                  {validationErrors.controlInstallation && <small className="form-field-error">{validationErrors.controlInstallation}</small>}
                </label>
              )}
              <label className="marketing-full-field">
                تفاصيل إضافية
                <textarea
                  value={panel.additionalDetails || ""}
                  onChange={(event) =>
                    patchPanel({ additionalDetails: event.target.value })
                  }
                  placeholder="اكتب أي تفاصيل إضافية"
                />
              </label>
              {panel.hasCopper === true && (
                <section className="marketing-copper-fields">
                  <h3>بيانات النحاس</h3>
                  <div className="marketing-data-grid">
                    <label>
                      نوع المفاتيح
                      <StyledSelect
                        value={panel.copperDetails?.switches || ""}
                        placeholder="اختر النوع"
                        onChange={(value) => setCopperDetail("switches", value)}
                        options={[
                          { value: "My Nature", label: "My Nature" },
                          { value: "Molded", label: "Molded" },
                        ]}
                      />
                      {validationErrors.copperSwitches && <small className="form-field-error">{validationErrors.copperSwitches}</small>}
                    </label>
                    <label>
                      الرئيسي
                      <StyledSelect
                        value={
                          panel.copperDetails?.mainKey ||
                          panel.copper?.main?.optionKey ||
                          ""
                        }
                        placeholder="اختر الأمبير"
                        onChange={setCopperMain}
                        options={amperageOptions}
                      />
                      {validationErrors.copperMain && <small className="form-field-error">{validationErrors.copperMain}</small>}
                    </label>
                  </div>
                  <div className="marketing-branches">
                    <div className="marketing-branches-heading">
                      <h4>المفاتيح الفرعية</h4>
                      <button
                        type="button"
                        onClick={() =>
                          setBranchGroups([
                            ...branchGroups,
                            {
                              id: `branch-group-${Date.now()}`,
                              optionKey: "",
                              count: 1,
                            },
                          ])
                        }
                      >
                        + إضافة فرعي
                      </button>
                    </div>
                    {branchGroups.map((group, index) => (
                      <div
                        className="marketing-branch-row"
                        key={group.id || index}
                      >
                        <strong className="marketing-branch-name">
                          فرعي {index + 1}
                        </strong>
                        <div className="marketing-branch-amp">
                          <StyledSelect
                            value={group.optionKey || ""}
                            placeholder="اختر الأمبير"
                            onChange={(optionKey) =>
                              setBranchGroups(
                                branchGroups.map((entry, current) =>
                                  current === index
                                    ? { ...entry, optionKey }
                                    : entry,
                                ),
                              )
                            }
                            options={amperageOptions}
                          />
                        </div>
                        <label className="marketing-branch-count">
                          العدد
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={group.count ?? ""}
                            onChange={(event) =>
                              setBranchGroups(
                                branchGroups.map((entry, current) =>
                                  current === index
                                    ? { ...entry, count: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            onBlur={() => {
                              if (group.count === "")
                                setBranchGroups(
                                  branchGroups.map((entry, current) =>
                                    current === index
                                      ? { ...entry, count: 1 }
                                      : entry,
                                  ),
                                );
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="delete-panel-data-btn marketing-branch-delete"
                          onClick={() =>
                            setBranchGroups(
                              branchGroups.filter(
                                (_, current) => current !== index,
                              ),
                            )
                          }
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                    {validationErrors.copperBranches && <small className="form-field-error marketing-branches-error">{validationErrors.copperBranches}</small>}
                  </div>
                  <label className="marketing-full-field">
                    تفاصيل إضافية للنحاس
                    <textarea
                      value={panel.copperDetails?.notes || ""}
                      onChange={(event) =>
                        setCopperDetail("notes", event.target.value)
                      }
                      placeholder="اكتب أي تفاصيل خاصة بالنحاس"
                    />
                  </label>
                </section>
              )}
            </section>
          </fieldset>
          <WhatsappProjectData editable={canEditActivePanel} />
      </div>
      {canEditActivePanel && (
        <div className="marketing-save-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={save}
            disabled={savingProject}
          >
            {savingProject ? "جاري الحفظ..." : "حفظ اللوحة والعودة للمشروع"}
          </button>
        </div>
      )}
    </section>
  );
}

export default MarketingProjectEditor;
