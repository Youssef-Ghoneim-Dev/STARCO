import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";
import { defaultProject } from "../utils/defaultProject";
import { completePanelQuote, createPanel as createPanelRecord, deletePanelRecord, getProject, startProjectEditing, updatePanelRecord } from "../services/projectsAPI";
import { getSystemConfiguration } from "../services/systemConfigurationAPI";

const ProjectContext = createContext();

const AUTO_SAVE_DELAY_MS = 500;
const AUTO_SAVE_LOCKED_STATUSES = new Set(["created", "completed"]);

const configuredPriceFields = [
  "manufacturing",
  "locks",
  "hinges",
  "transport",
  "screws",
  "stretch",
  "carton",
];

const panelPriceFields = [
  ...configuredPriceFields,
  "copper",
  "fiber",
  "rakam",
  "fuse",
  "additionalPrice",
];

const getSaveErrorMessage = (error) => {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0]?.message || "تعذر حفظ المشروع.";
  }

  return typeof message === "string" ? message : "تعذر حفظ المشروع.";
};

const createPanel = (index, systemConfig) => {
  const panel = JSON.parse(JSON.stringify(defaultProject().panels[0]));
  const configuredPrices = systemConfig?.prices || {};

  panel.panelName = `لوحة ${index}`;
  panel.panelId = globalThis.crypto?.randomUUID?.() || `panel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  panel.quoteStatus = "draft";
  panel.prices = { ...panel.prices };
  panel.copper = {
    ...(panel.copper || {}),
    pricePerKg: systemConfig?.copperConfiguration?.pricePerKg ?? panel.copper?.pricePerKg ?? "",
  };

  configuredPriceFields.forEach((field) => {
    panel.prices[field] = configuredPrices[field] ?? panel.prices[field];
  });

  return panel;
};

const normalizePanelThickness = (panel) => ({
  ...panel,
  thickness: Array.isArray(panel.thickness)
    ? panel.thickness.map((thickness) => String(thickness))
    : [],
});

const hasValue = (value) => value !== "" && value !== null && value !== undefined;
const hasCompleteDimensions = (dimensions = {}) => [dimensions.length, dimensions.width, dimensions.depth]
  .every((value) => Number.isFinite(Number(value)) && Number(value) > 0);

const getAutomaticPanelName = (dimensions = {}) => {
  const values = [dimensions.length, dimensions.width, dimensions.depth].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return "";
  return values.map((value) => Number((value / 10).toFixed(2))).join(" × ");
};

const evaluateFormula = (formula, dimensions) => {
  if (!formula?.trim()) return undefined;
  const values = { Length: Number(dimensions?.length), Width: Number(dimensions?.width), Depth: Number(dimensions?.depth) };
  if (Object.values(values).some((value) => !Number.isFinite(value) || value <= 0)) return undefined;
  const words = formula.match(/[A-Za-z]+/g) || [];
  if (words.some((word) => !Object.hasOwn(values, word[0].toUpperCase() + word.slice(1).toLowerCase()))) return undefined;
  const numericFormula = formula.replace(/[A-Za-z]+/g, (word) => String(values[word[0].toUpperCase() + word.slice(1).toLowerCase()]));
  if (!/^[0-9+\-*/().\s]+$/.test(numericFormula)) return undefined;
  try {
    const value = Function(`"use strict"; return (${numericFormula});`)();
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
  } catch { return undefined; }
};

const buildTypeParts = (type, dimensions) => {
  const ready = hasCompleteDimensions(dimensions);
  return (type?.parts || []).map((part) => ({
    name: part.name,
    quantity: Number(part.quantity) || 1,
    ...(part.manualDimensions ? {} : {
      width: ready ? (evaluateFormula(part.widthFormula, dimensions) ?? "") : "",
      height: ready ? (evaluateFormula(part.lengthFormula, dimensions) ?? "") : "",
    }),
  }));
};

const legacyDefaultPartNames = new Set(["العلبة", "الجنب", "المراية", "الجلسة", "الجريدة", "باب 1", "باب 2"]);
const containsOnlyLegacyDefaultParts = (parts = []) => parts.length > 0 && parts.every((part) => legacyDefaultPartNames.has(String(part.name || "").trim()));

const mergeRecalculatedParts = (existingParts = [], type, dimensions) => {
  const calculatedParts = buildTypeParts(type, dimensions);
  const remainingCalculatedParts = [...calculatedParts];
  const preservedParts = existingParts.map((part) => {
    const calculatedIndex = remainingCalculatedParts.findIndex((calculated) => calculated.name === part.name);
    if (calculatedIndex < 0) return part;

    const [calculated] = remainingCalculatedParts.splice(calculatedIndex, 1);
    const configuredPart = (type?.parts || []).find((item) => item.name === part.name);
    if (configuredPart?.manualDimensions) return part;
    return {
      ...part,
      width: hasValue(calculated.width) ? calculated.width : "",
      height: hasValue(calculated.height) ? calculated.height : "",
    };
  });

  return [...preservedParts, ...remainingCalculatedParts];
};

const hydratePanel = (panel, index, systemConfig, projectStatus = "") => {
  const basePanel = createPanel(index + 1, systemConfig);
  const incomingPanel = panel || {};
  const incomingPrices = incomingPanel.prices || {};
  const effectiveThickness = Array.isArray(incomingPanel.pricing?.thickness)
    && incomingPanel.pricing.thickness.length
    ? incomingPanel.pricing.thickness
    : Array.isArray(incomingPanel.thickness) && incomingPanel.thickness.length
      ? incomingPanel.thickness
      : Array.isArray(incomingPanel.marketerData?.thickness)
        ? incomingPanel.marketerData.thickness
        : [];
  const normalizedType = String(incomingPanel.panelType || "").toLowerCase().replace(/[.\-\s_]/g, "");
  const inferredType = (systemConfig?.panelTypes || []).find((type) =>
    type.key === incomingPanel.panelTypeKey
    || String(type.name || "").toLowerCase().replace(/[.\-\s_]/g, "") === normalizedType
    || (normalizedType === "ont" && type.key === "ont")
  );
  const marketerCopper = incomingPanel.copperDetails || incomingPanel.marketerData?.copperDetails || {};
  const marketerBranchGroups = Array.isArray(marketerCopper.branchGroups) ? marketerCopper.branchGroups : [];
  const incomingCopper = incomingPanel.copper && Object.keys(incomingPanel.copper).length
    ? incomingPanel.copper
    : {
        enabled: Boolean(incomingPanel.hasCopper ?? incomingPanel.marketerData?.hasCopper),
        main: { optionKey: marketerCopper.mainKey || "" },
        branches: marketerBranchGroups.map((group, groupIndex) => ({
          branchId: group.id || `marketer-branch-${groupIndex}`,
          branchGroupId: group.id || `marketer-branch-${groupIndex}`,
          optionKey: group.optionKey || "",
          direction: "one",
          barCount: 1,
          quantity: Math.max(1, Number(group.count || group.quantity) || 1),
        })),
      };
  const hydratedBranches = Array.isArray(incomingCopper?.branches)
    ? incomingCopper.branches.reduce((groups, branch) => {
      const groupId = branch.branchGroupId || branch.branchId;
      const existing = groups.find((item) => groupId && item.branchGroupId === groupId);
      if (existing) {
        existing.quantity += Math.max(1, Number(branch.quantity) || 1);
        return groups;
      }
      groups.push({ ...branch, quantity: Math.max(1, Number(branch.quantity) || 1) });
      return groups;
    }, [])
    : (basePanel.copper?.branches || []);
  const incomingParts = Array.isArray(incomingPanel.parts) ? incomingPanel.parts : [];
  const hydratedParts = inferredType && (incomingParts.length === 0 || containsOnlyLegacyDefaultParts(incomingParts))
    ? buildTypeParts(inferredType, incomingPanel.dimensions)
    : (incomingParts.length ? incomingParts : basePanel.parts);

  const completedQuoteStatuses = new Set(["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"]);
  const inferredQuoteStatus = completedQuoteStatuses.has(projectStatus)
    ? "quoteCompleted"
    : projectStatus === "pending" ? "pending"
      : projectStatus === "inProgress" ? "inProgress"
        : ["editing", "editingByEngineer", "editingByOwner", "editingByMarketing"].includes(projectStatus) ? "editing" : "draft";

  return normalizePanelThickness({
    ...basePanel,
    ...incomingPanel,
    panelTypeKey: incomingPanel.panelTypeKey || inferredType?.key || "",
    panelType: inferredType?.name || incomingPanel.panelType || "",
    quoteStatus: incomingPanel.status === "pendingPricing" ? "pending"
      : incomingPanel.status === "pricing" ? "inProgress"
        : incomingPanel.status || incomingPanel.quoteStatus || inferredQuoteStatus,
    panelName: incomingPanel.panelName || basePanel.panelName,
    thickness: effectiveThickness,
    copper: {
      ...(basePanel.copper || {}),
      ...(incomingCopper || {}),
      pricePerKg: hasValue(incomingCopper?.pricePerKg)
        ? incomingCopper.pricePerKg
        : (systemConfig?.copperConfiguration?.pricePerKg ?? basePanel.copper?.pricePerKg ?? ""),
      main: { ...(basePanel.copper?.main || {}), ...(incomingCopper?.main || {}) },
      branches: hydratedBranches,
    },
    parts: hydratedParts,
    prices: panelPriceFields.reduce(
      (result, field) => ({
        ...result,
        [field]: hasValue(incomingPrices[field])
          ? incomingPrices[field]
          : basePanel.prices[field],
      }),
      {},
    ),
  });
};

const panelPayload = (panel) => ({
  panelName: panel.panelName,
  panelType: panel.panelType,
  panelTypeKey: panel.panelTypeKey,
  thickness: panel.thickness,
  hasCopper: panel.hasCopper,
  controlInstallation: panel.controlInstallation,
  additionalDetails: panel.additionalDetails,
  copperDetails: panel.copperDetails,
  dimensions: panel.dimensions,
  parts: panel.parts,
  prices: panel.prices,
  copper: panel.copper,
});

export function ProjectProvider({ children, projectId, readOnly = false }) {
  const [project, setProject] = useState(defaultProject());
  const [prices, setPrices] = useState({
    sheetPrice: "",
    paintPrice: "",
  });
  const [activePanel, setActivePanel] = useState(0);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectLoadError, setProjectLoadError] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [saveProjectError, setSaveProjectError] = useState(null);
  const [showWeight, setShowWeight] = useState(false);
  const [showAllPrices, setShowAllPrices] = useState(false);
  const [preventAutoSave, setPreventAutoSave] = useState(true);
  const [systemConfig, setSystemConfig] = useState(null);
  useEffect(() => {
    const loadSystemConfiguration = async () => {
      try {
        const { data } = await getSystemConfiguration();
        setSystemConfig(data);
      } catch (error) {
        console.error("Failed to load system configuration:", error);
      }
    };

    loadSystemConfiguration();
  }, []);
  useEffect(() => {
    let mounted = true;

    const loadSavedProject = async () => {
        setLoadingProject(true);
        try {
          setProjectLoadError("");
          const { data } = await getProject(projectId);
          if (!mounted) return;

          const configResponse = await getSystemConfiguration().catch(() => ({ data: null }));
          const savedConfig = configResponse.data;
          if (savedConfig) setSystemConfig(savedConfig);

          setPrices({
            sheetPrice: data.prices?.sheetPrice ?? savedConfig?.sheetPrice ?? "",
            paintPrice: data.prices?.paintPrice ?? savedConfig?.paintPrice ?? "",
          });
          setProject({
            ...defaultProject(),
            ...data,
            panels: (data.panels || []).map((panel, index) =>
              hydratePanel(panel, index, savedConfig, data.status),
            ),
          });
          // Editable projects keep autosave enabled. Workflow stages that are
          // intentionally read-only are the only stages that block it.
          setPreventAutoSave(AUTO_SAVE_LOCKED_STATUSES.has(data.status) || Boolean(data.readOnlyForCurrentUser));
        } catch (error) {
          console.error("Failed to load project:", error);
          if (mounted) {
            setProjectLoadError(getSaveErrorMessage(error));
          }
        } finally {
          if (mounted) setLoadingProject(false);
        }
    };

    loadSavedProject();
    return () => { mounted = false; };
  }, [projectId]);

  useEffect(() => {
    if (loadingProject || preventAutoSave || readOnly) return;
    const editablePanel = project.panels?.[activePanel];
    if (!editablePanel || !["draft", "pricing", "editing"].includes(editablePanel.status || editablePanel.quoteStatus)) return;

    const timeout = setTimeout(async () => {
      try {
        const active = project.panels?.[activePanel];
        if (active?._id) {
          await updatePanelRecord(projectId, active._id, panelPayload(active));
        }
        setSaveProjectError(null);
      } catch (error) {
        const message = getSaveErrorMessage(error);
        setSaveProjectError(message);
        // A conflict means this account cannot edit this project. Stop retrying
        // on every field change and leave the clear error visible to the user.
        if (error?.response?.status === 409) {
          setPreventAutoSave(true);
          toast.error(message);
        }
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [project, prices, activePanel, loadingProject, preventAutoSave, projectId, readOnly]);

  const updateClient = useCallback((clientData) => {
    setPreventAutoSave(false);
    setProject((prev) => ({
      ...prev,
      client: {
        ...prev.client,
        ...clientData,
      },
    }));
  }, []);

  const updateClientNameReview = useCallback((review) => {
    setPreventAutoSave(false);
    setProject((prev) => ({ ...prev, clientNameReview: review }));
  }, []);

  const updatePrices = useCallback((field, value) => {
    setPreventAutoSave(false);
    setPrices((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updatePanel = useCallback((panelIndex, updater) => {
    setPreventAutoSave(false);
    setProject((prev) => {
      const panels = prev.panels.map((panel, index) =>
        index === panelIndex ? updater(panel) : panel,
      );
      return {
        ...prev,
        panels,
      };
    });
  }, []);

  const addPanel = useCallback(async () => {
    setPreventAutoSave(false);
    try {
      const { data } = await createPanelRecord(projectId, {});
      setProject((prev) => ({ ...prev, panels: [...prev.panels, hydratePanel(data.panel, prev.panels.length, systemConfig, prev.status)] }));
      setActivePanel(project.panels.length);
    } catch (error) { toast.error(getSaveErrorMessage(error)); }
  }, [project.panels.length, projectId, systemConfig]);
  const deletePart = useCallback(
    (partIndex) => {
      updatePanel(activePanel, (panel) => ({
        ...panel,

        parts: panel.parts.filter((_, index) => index !== partIndex),
      }));
    },

    [activePanel, updatePanel],
  );
  const createPart = (type, parts) => {
    const configuredPart = typeof type === "object" && type !== null ? type : null;
    const typeName = configuredPart?.name || type;
    const quantities = {
      العلبة: 1,
      الجنب: 2,
      المراية: 1,
      الجلسة: 1,
      الجريدة: 2,
    };

    if (configuredPart) {
      const duplicateCount = parts.filter((part) => part.name === typeName || part.name.startsWith(`${typeName} `)).length;
      return {
        name: duplicateCount ? `${typeName} ${duplicateCount + 1}` : typeName,
        width: hasValue(configuredPart.defaultWidth) ? Number(configuredPart.defaultWidth) : "",
        height: hasValue(configuredPart.defaultHeight) ? Number(configuredPart.defaultHeight) : "",
        quantity: Number(configuredPart.defaultQuantity) || 1,
      };
    }

    if (typeName === "باب") {
      const doors = parts.filter((p) => p.name.startsWith("باب")).length;

      return {
        name: `باب ${doors + 1}`,
        width: "",
        height: "",
        quantity: 1,
      };
    }
    if (typeName === "المراية") {
      const count = parts.filter((p) => p.name.startsWith("المراية")).length;

      return {
        name: count === 0 ? "المراية" : `المراية ${count + 1}`,
        width: "",
        height: "",
        quantity: 1,
      };
    }

    if (typeName === "الجلسة") {
      const count = parts.filter((p) => p.name.startsWith("الجلسة")).length;

      return {
        name: count === 0 ? "الجلسة" : `الجلسة ${count + 1}`,
        width: "",
        height: "",
        quantity: 1,
      };
    }
    if (typeName === "الكرسي") {
      const chairConfig = systemConfig?.parts?.chair;

      return {
        name: "الكرسي",
        width: chairConfig?.defaultWidth ?? 40,
        height: chairConfig?.defaultHeight ?? 100,
        quantity: chairConfig?.defaultQuantity ?? 2,
      };
    }

    if (typeName === "أوميجا") {
      const omegaConfig = systemConfig?.parts?.omega;

      return {
        name: "أوميجا",
        width: omegaConfig?.defaultWidth ?? 45.5,
        quantity: omegaConfig?.defaultQuantity ?? 1,
      };
    }

    const duplicateCount = parts.filter((part) => part.name === typeName || part.name.startsWith(`${typeName} `)).length;

    return {
      name: duplicateCount ? `${typeName} ${duplicateCount + 1}` : typeName,

      width: "",

      height: "",

      quantity: quantities[typeName] || 1,
    };
  };
  const deletePanel = useCallback(async (panelIndex) => {
    const target = project.panels?.[panelIndex];
    if (!target?._id) return;
    try { await deletePanelRecord(projectId, target._id); } catch (error) { return toast.error(getSaveErrorMessage(error)); }
    setProject((prev) => {
      const panels = prev.panels.filter((_, index) => index !== panelIndex);
      return { ...prev, panels };
    });

    setActivePanel((current) => {
      if (current === panelIndex) {
        return Math.max(0, current - 1);
      }

      if (current > panelIndex) {
        return current - 1;
      }

      return current;
    });
  }, [project.panels, projectId]);
  const addPart = useCallback(
    (type) => {
      updatePanel(activePanel, (panel) => {
        const newPart = createPart(type, panel.parts);

        const newParts = [...panel.parts, newPart];

        // أول كرسي فقط يضيف أوميجا إذا لم تكن موجودة
        if (
          (typeof type === "string" ? type : type?.name) === "الكرسي" &&
          !panel.parts.some((part) => part.name === "أوميجا")
        ) {
          newParts.push(createPart("أوميجا", newParts));
        }

        return {
          ...panel,
          parts: newParts,
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePanel, updatePanel, systemConfig],
  );
  const updatePartField = useCallback(
    (partIndex, field, value) => {
      updatePanel(activePanel, (panel) => ({
        ...panel,
        parts: panel.parts.map((part, index) =>
          index === partIndex ? { ...part, [field]: value } : part,
        ),
      }));
    },
    [activePanel, updatePanel],
  );

  const updateThickness = useCallback(
    (thickness) => {
      updatePanel(activePanel, (panel) => ({
        ...panel,
        thickness: (() => {
          const selectedThicknesses = (panel.thickness || []).map(String);

          return selectedThicknesses.includes(thickness)
            ? selectedThicknesses.filter((item) => item !== thickness)
            : [...selectedThicknesses, thickness];
        })(),
      }));
    },
    [activePanel, updatePanel],
  );
  const increasePartQuantity = useCallback(
    (partIndex) => {
      const part = project.panels[activePanel]?.parts?.[partIndex];

      if (!part) return;

      const panelType = (systemConfig?.panelTypes || []).find((type) => type.key === project.panels[activePanel]?.panelTypeKey);
      const configuredPart = (panelType?.additionalParts || []).map((item) => typeof item === "string" ? { name: item } : item).find((item) => part.name === item.name || part.name.startsWith(`${item.name} `));
      const step = Number(configuredPart?.quantityStep) || (part.name === "الكرسي" ? (systemConfig?.parts?.chair?.quantityStep ?? 2) : (systemConfig?.parts?.omega?.quantityStep ?? 1));

      updatePartField(partIndex, "quantity", (part.quantity ?? 1) + step);
    },
    [activePanel, project.panels, systemConfig, updatePartField],
  );

  const decreasePartQuantity = useCallback(
    (partIndex) => {
      const part = project.panels[activePanel]?.parts?.[partIndex];

      if (!part) return;

      const panelType = (systemConfig?.panelTypes || []).find((type) => type.key === project.panels[activePanel]?.panelTypeKey);
      const configuredPart = (panelType?.additionalParts || []).map((item) => typeof item === "string" ? { name: item } : item).find((item) => part.name === item.name || part.name.startsWith(`${item.name} `));
      const config = configuredPart || (part.name === "الكرسي" ? systemConfig?.parts?.chair : systemConfig?.parts?.omega);

      const step = config?.quantityStep ?? 1;
      const minQuantity = config?.minQuantity ?? 1;

      const newQuantity = Math.max(
        minQuantity,
        (part.quantity ?? minQuantity) - step,
      );

      updatePartField(partIndex, "quantity", newQuantity);
    },
    [activePanel, project.panels, systemConfig, updatePartField],
  );
  const updatePriceField = useCallback(
    (field, value) => {
      updatePanel(activePanel, (panel) => ({
        ...panel,
        prices: {
          ...panel.prices,
          [field]: value,
        },
      }));
    },
    [activePanel, updatePanel],
  );
  const updatePanelName = useCallback(
    (value) => {
      updatePanel(activePanel, (panel) => ({
        ...panel,
        panelName: value,
      }));
    },
    [activePanel, updatePanel],
  );
  const updateCopper = useCallback((updater) => {
    updatePanel(activePanel, (panel) => {
      const configuredPrice = systemConfig?.copperConfiguration?.pricePerKg ?? "";
      const currentCopper = panel.copper || {};
      const copper = updater({
        enabled: false,
        pricePerKg: currentCopper.pricePerKg === "" || currentCopper.pricePerKg == null ? configuredPrice : currentCopper.pricePerKg,
        earthPrice: "",
        groundPrice: "",
        main: { optionKey: "", length: "", barCount: 1 },
        branches: [],
        ...currentCopper,
      });
      if (copper.pricePerKg === "" || copper.pricePerKg == null) copper.pricePerKg = configuredPrice;
      return {
        ...panel,
        hasCopper: Boolean(copper.enabled),
        copper,
      };
    });
  }, [activePanel, systemConfig?.copperConfiguration?.pricePerKg, updatePanel]);
  const applyPanelType = useCallback((typeKey) => {
    const selectedType = (systemConfig?.panelTypes || []).find((type) => type.key === typeKey);
    if (!selectedType) return;
    updatePanel(activePanel, (panel) => ({
      ...panel,
      panelTypeKey: selectedType.key,
      panelType: selectedType.name,
      parts: buildTypeParts(selectedType, panel.dimensions),
      prices: { ...panel.prices, ...selectedType.prices },
    }));
  }, [activePanel, systemConfig, updatePanel]);

  const updatePanelDimensions = useCallback((field, value) => {
    updatePanel(activePanel, (panel) => {
      const previousAutomaticName = getAutomaticPanelName(panel.dimensions);
      const dimensions = { ...(panel.dimensions || {}), [field]: value };
      const automaticName = getAutomaticPanelName(dimensions);
      const currentName = String(panel.panelName || "").trim();
      const isDefaultName = !currentName || /^لوحة\s*\d+$/u.test(currentName);
      let panelName = panel.panelName;

      if (automaticName && (isDefaultName || currentName === previousAutomaticName)) {
        panelName = automaticName;
      } else if (automaticName && previousAutomaticName && currentName.startsWith(`${previousAutomaticName} `)) {
        panelName = `${automaticName}${currentName.slice(previousAutomaticName.length)}`;
      }

      const selectedType = (systemConfig?.panelTypes || []).find((type) => type.key === panel.panelTypeKey);
      return { ...panel, dimensions, panelName, ...(selectedType ? { parts: mergeRecalculatedParts(panel.parts, selectedType, dimensions) } : {}) };
    });
  }, [activePanel, systemConfig, updatePanel]);
  const recalculateActivePanelParts = useCallback(async () => {
    try {
      const { data: savedConfig } = await getSystemConfiguration();
      const currentPanel = project.panels?.[activePanel] || project.panels?.[0];
      const selectedType = (savedConfig?.panelTypes || []).find((type) => type.key === currentPanel?.panelTypeKey);
      if (!selectedType) return { success: false, message: "اختر نوع اللوحة أولًا لإعادة حساب الأجزاء." };
      setSystemConfig(savedConfig);
      updatePanel(activePanel, (panel) => ({ ...panel, parts: mergeRecalculatedParts(panel.parts, selectedType, panel.dimensions) }));
      return { success: true };
    } catch (error) {
      return { success: false, message: getSaveErrorMessage(error) || "تعذر إعادة حساب الأجزاء." };
    }
  }, [activePanel, project.panels, updatePanel]);
  const saveProject = useCallback(async ({ complete = false } = {}) => {
    if (readOnly) {
      const error = new Error("هذا المشروع للعرض فقط.");
      setSaveProjectError(error.message);
      return { success: false, error };
    }
    if (!project.client.name?.trim()) {
      const validationError = new Error("يرجى تحديد عميل قبل حفظ المشروع.");
      setSaveProjectError(validationError.message);
      return { success: false, error: validationError };
    }

    setSavingProject(true);
    setSaveProjectError(null);

    try {
      const active = project.panels?.[activePanel];
      if (active?._id) await updatePanelRecord(projectId, active._id, { ...panelPayload(active), marketerSaved: true });
      let completionData = null;
      if (complete) {
        const { data } = await completePanelQuote(projectId, active._id);
        completionData = data;
        // Keep the quote editor mounted until the completion dialog displays
        // the generated preview link. The backend has already persisted the
        // new status, and leaving this page will load it normally next time.
        setPreventAutoSave(true);
      }
      return { success: true, data: completionData };
    } catch (error) {
      const message = getSaveErrorMessage(error);
      setSaveProjectError(message);
      return { success: false, error, message };
    } finally {
      setSavingProject(false);
    }
  }, [activePanel, project, projectId, readOnly]);
  const saveDraftNow = useCallback(async () => {
    if (readOnly) return { success: false, message: "هذا المشروع للعرض فقط." };
    try {
      const active = project.panels?.[activePanel];
      const panelResponse = active?._id
        ? await updatePanelRecord(projectId, active._id, panelPayload(active))
        : null;
      if (panelResponse?.data?.panel) {
        setProject((current) => ({
          ...current,
          panels: current.panels.map((item, index) => index === activePanel
            ? hydratePanel(panelResponse.data.panel, index, systemConfig, current.status)
            : item),
        }));
      }
      return { success: true, project };
    } catch (error) {
      return { success: false, message: getSaveErrorMessage(error) };
    }
  }, [activePanel, project, projectId, readOnly, systemConfig]);
  const beginEditing = useCallback(async (panelId) => {
    try {
      const { data } = await startProjectEditing(projectId, panelId);
      setProject((current) => ({
        ...current,
        ...(data.project || {}),
        status: data.project?.status || current.status,
        panels: current.panels.map((panel) => (panel._id === panelId || panel.panelId === panelId)
          ? { ...panel, ...data.panel, quoteStatus: "editing" }
          : panel),
      }));
      setPreventAutoSave(false);
      return { success: true, notification: data.notification };
    } catch (error) {
      return { success: false, message: getSaveErrorMessage(error) };
    }
  }, [projectId]);
  const submitMarketingProject = useCallback(async () => {
    if (readOnly) return { success: false, message: "هذا المشروع للعرض فقط." };
    if (!project.client.name?.trim()) return { success: false, message: "يرجى تحديد اسم العميل قبل إرسال المشروع." };
    setSavingProject(true);
    setSaveProjectError(null);
    try {
      const active = project.panels?.[activePanel];
      if (active?._id) await updatePanelRecord(projectId, active._id, { ...panelPayload(active), marketerSaved: true });
      return { success: true, message: "تم حفظ بيانات اللوحة." };
    } catch (error) {
      const message = getSaveErrorMessage(error);
      setSaveProjectError(message);
      return { success: false, message, fields: error.response?.data?.fields || null };
    } finally {
      setSavingProject(false);
    }
  }, [activePanel, project, projectId, readOnly]);
  const canDeletePart = (part, parts) => {
    const currentPanel = project.panels?.[activePanel] || project.panels?.[0];
    const panelType = (systemConfig?.panelTypes || []).find((type) => type.key === currentPanel?.panelTypeKey);
    const isOriginalPart = (panelType?.parts || []).some((item) => item?.name === part.name);
    const isConfiguredAdditionalPart = (panelType?.additionalParts || [])
      .map((item) => typeof item === "string" ? item : item?.name)
      .filter(Boolean)
      .some((name) => part.name === name || part.name.startsWith(`${name} `));

    if (isOriginalPart) return false;
    if (isConfiguredAdditionalPart) return true;

    if (part.name.startsWith("باب")) {
      const doors = parts.filter((p) => p.name.startsWith("باب"));

      return doors.indexOf(part) >= 2;
    }
    if (part.name.includes("الكرسي")) {
      const cheir = parts.filter((p) => p.name.includes("الكرسي"));

      return cheir.indexOf(part) >= 0;
    }
    if (part.name.includes("أوميجا")) {
      const omega = parts.filter((p) => p.name.includes("أوميجا"));

      return omega.indexOf(part) >= 0;
    }

    if (part.name.startsWith("المراية")) {
      const mirrors = parts.filter((p) => p.name.startsWith("المراية"));

      return mirrors.indexOf(part) >= 1;
    }

    if (part.name.startsWith("الجلسة")) {
      const seats = parts.filter((p) => p.name.startsWith("الجلسة"));

      return seats.indexOf(part) >= 1;
    }

    return false;
  };
  if (loadingProject) {
    return (
      <div className="route-loading">
        <div className="spinner" role="status"></div>
        <p style={{ direction: "rtl" }}>جاري تحميل المشروع ...</p>
      </div>
    );
  }
  if (projectLoadError) {
    return <div className="route-loading project-load-error" dir="rtl">
      <h2>تعذر فتح المشروع</h2>
      <p>{projectLoadError}</p>
    </div>;
  }
  return (
    <ProjectContext.Provider
      value={{
        project,
        setProject,
        activePanel,
        setActivePanel,
        loadingProject,
        projectLoadError,
        savingProject,
        saveProjectError,
        showWeight,
        setShowWeight,
        showAllPrices,
        setShowAllPrices,
        updateClient,
        updateClientNameReview,
        updatePanel,
        updatePrices,
        updatePartField,
        addPart,
        addPanel,
        updateThickness,
        updatePriceField,
        updateCopper,
        saveProject,
        saveDraftNow,
        submitMarketingProject,
        beginEditing,
        canDeletePart,
        deletePart,
        deletePanel,
        increasePartQuantity,
        decreasePartQuantity,
        systemConfig,
        updatePanelName,
        applyPanelType,
        updatePanelDimensions,
        recalculateActivePanelParts,
        prices,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProject = () => useContext(ProjectContext);
