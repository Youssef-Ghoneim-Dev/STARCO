import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";
import { defaultProject } from "../utils/defaultProject";
import { completeProject, getProject, startProjectEditing, submitMarketingProject as submitMarketingProjectRequest, updateProject } from "../services/projectsAPI";
import { getSystemConfiguration } from "../services/systemConfigurationAPI";

const ProjectContext = createContext();

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

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeCopperForSaving = (copper = {}) => ({
  enabled: Boolean(copper.enabled),
  pricePerKg: hasValue(copper.pricePerKg) ? toNumber(copper.pricePerKg) : null,
  earthPrice: hasValue(copper.earthPrice) ? toNumber(copper.earthPrice) : null,
  groundPrice: hasValue(copper.groundPrice) ? toNumber(copper.groundPrice) : null,
  main: {
    optionKey: copper.main?.optionKey || "",
    length: hasValue(copper.main?.length) ? toNumber(copper.main.length) : null,
    barCount: toNumber(copper.main?.barCount, 1),
  },
  branches: (copper.branches || []).map((branch) => ({
    branchId: branch.branchId || `branch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    optionKey: branch.optionKey || "",
    direction: branch.direction === "two" ? "two" : "one",
    length: hasValue(branch.length) ? toNumber(branch.length) : null,
    barCount: toNumber(branch.barCount, 1),
  })),
});

// الحفظ التلقائي يسمح بخانات فارغة أثناء الشغل، بينما الحفظ النهائي
// يحول القيم الرقمية ويحتفظ بالأجزاء المكتملة فقط.
const prepareProjectForSaving = ({ client, clientNameReview, status, panels }, prices) => ({
  client: {
    ...client,
    profitPercentage: toNumber(client?.profitPercentage),
  },
  clientNameReview,
  status,
  prices: {
    sheetPrice: toNumber(prices.sheetPrice),
    paintPrice: toNumber(prices.paintPrice),
  },
  panels: panels.map((panel) => ({
    ...panel,
    thickness: (panel.thickness || []).map((thickness) => toNumber(thickness)),
    parts: (panel.parts || [])
      .filter(
        (part) =>
          part.width !== "" &&
          part.width != null &&
          part.height !== "" &&
          part.height != null,
      )
      .map((part) => ({
        ...part,
        width: toNumber(part.width),
        height: toNumber(part.height),
        quantity: toNumber(part.quantity, 1),
      })),
    prices: panelPriceFields.reduce(
      (normalizedPrices, field) => ({
        ...normalizedPrices,
        [field]: toNumber(panel.prices?.[field]),
      }),
      {},
    ),
    copper: normalizeCopperForSaving(panel.copper),
  })),
});

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

const evaluateFormula = (formula, dimensions) => {
  if (!formula?.trim()) return undefined;
  const values = { Length: Number(dimensions?.length), Width: Number(dimensions?.width), Depth: Number(dimensions?.depth) };
  if (Object.values(values).some((value) => !Number.isFinite(value))) return undefined;
  const words = formula.match(/[A-Za-z]+/g) || [];
  if (words.some((word) => !Object.hasOwn(values, word[0].toUpperCase() + word.slice(1).toLowerCase()))) return undefined;
  const numericFormula = formula.replace(/[A-Za-z]+/g, (word) => String(values[word[0].toUpperCase() + word.slice(1).toLowerCase()]));
  if (!/^[0-9+\-*/().\s]+$/.test(numericFormula)) return undefined;
  try {
    const value = Function(`"use strict"; return (${numericFormula});`)();
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
  } catch { return undefined; }
};

const buildTypeParts = (type, dimensions) => (type?.parts || []).map((part) => ({
  name: part.name,
  quantity: Number(part.quantity) || 1,
  ...(part.manualDimensions ? {} : {
    width: evaluateFormula(part.widthFormula, dimensions),
    height: evaluateFormula(part.lengthFormula, dimensions),
  }),
}));

const hydratePanel = (panel, index, systemConfig) => {
  const basePanel = createPanel(index + 1, systemConfig);
  const incomingPanel = panel || {};
  const incomingPrices = incomingPanel.prices || {};
  const normalizedType = String(incomingPanel.panelType || "").toLowerCase().replace(/[.\-\s_]/g, "");
  const inferredType = (systemConfig?.panelTypes || []).find((type) =>
    type.key === incomingPanel.panelTypeKey
    || String(type.name || "").toLowerCase().replace(/[.\-\s_]/g, "") === normalizedType
    || (normalizedType === "ont" && type.key === "ont")
  );

  return normalizePanelThickness({
    ...basePanel,
    ...incomingPanel,
    panelTypeKey: incomingPanel.panelTypeKey || inferredType?.key || "",
    panelType: inferredType?.name || incomingPanel.panelType || "",
    panelName: incomingPanel.panelName || basePanel.panelName,
    parts:
      Array.isArray(incomingPanel.parts) && incomingPanel.parts.length > 0
        ? incomingPanel.parts
        : basePanel.parts,
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

const prepareProjectForAutoSaving = ({ client, clientNameReview, status, panels }, prices) => ({
  client: {
    ...client,
    profitPercentage: toNumber(client?.profitPercentage),
  },
  clientNameReview,
  status,
  prices: {
    sheetPrice: toNumber(prices.sheetPrice),
    paintPrice: toNumber(prices.paintPrice),
  },
  panels: panels.map((panel) => ({
    ...panel,
    thickness: (panel.thickness || []).map((thickness) => toNumber(thickness)),
    parts: (panel.parts || []).map((part) => {
      const nextPart = { ...part };
      if (hasValue(part.width)) nextPart.width = toNumber(part.width);
      else delete nextPart.width;
      if (hasValue(part.height)) nextPart.height = toNumber(part.height);
      else delete nextPart.height;
      nextPart.quantity = toNumber(part.quantity, 1);
      return nextPart;
    }),
    prices: panelPriceFields.reduce((result, field) => {
      if (!hasValue(panel.prices?.[field])) return result;
      return { ...result, [field]: toNumber(panel.prices[field]) };
    }, {}),
    copper: normalizeCopperForSaving(panel.copper),
  })),
});

const needsWhatsappBackfill = (project, systemConfig) => {
  if (project?.source !== "whatsapp") return false;

  if (!hasValue(project.prices?.sheetPrice) || !hasValue(project.prices?.paintPrice)) {
    return true;
  }

  return (project.panels || []).some((panel) => {
    if (!Array.isArray(panel.parts) || panel.parts.length === 0) return true;

    return configuredPriceFields.some(
      (field) =>
        hasValue(systemConfig?.prices?.[field]) &&
        !hasValue(panel.prices?.[field]),
    );
  });
};

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
              hydratePanel(panel, index, savedConfig),
            ),
          });
          // A completed project is an approved historical quote: never let a
          // page load or WhatsApp backfill attempt modify it automatically.
          setPreventAutoSave(data.status === "completed" || !needsWhatsappBackfill(data, savedConfig));
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

    const timeout = setTimeout(async () => {
      try {
        await updateProject(projectId, prepareProjectForAutoSaving(project, prices));
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
    }, 700);

    return () => clearTimeout(timeout);
  }, [project, prices, loadingProject, preventAutoSave, projectId, readOnly]);

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

  const addPanel = useCallback(() => {
    setPreventAutoSave(false);

    setProject((prev) => {
      const newPanelIndex = prev.panels.length;

      const newPanel = createPanel(newPanelIndex + 1, systemConfig);

      setActivePanel(newPanelIndex);

      return {
        ...prev,
        panels: [...prev.panels, newPanel],
      };
    });
  }, [systemConfig]);
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
    const quantities = {
      العلبة: 1,
      الجنب: 2,
      المراية: 1,
      الجلسة: 1,
      الجريدة: 2,
    };

    if (type === "باب") {
      const doors = parts.filter((p) => p.name.startsWith("باب")).length;

      return {
        name: `باب ${doors + 1}`,
        width: "",
        height: "",
        quantity: 1,
      };
    }
    if (type === "المراية") {
      const count = parts.filter((p) => p.name.startsWith("المراية")).length;

      return {
        name: count === 0 ? "المراية" : `المراية ${count + 1}`,
        width: "",
        height: "",
        quantity: 1,
      };
    }

    if (type === "الجلسة") {
      const count = parts.filter((p) => p.name.startsWith("الجلسة")).length;

      return {
        name: count === 0 ? "الجلسة" : `الجلسة ${count + 1}`,
        width: "",
        height: "",
        quantity: 1,
      };
    }
    if (type === "الكرسي") {
      const chairConfig = systemConfig?.parts?.chair;

      return {
        name: "الكرسي",
        width: chairConfig?.defaultWidth ?? 40,
        height: chairConfig?.defaultHeight ?? 100,
        quantity: chairConfig?.defaultQuantity ?? 2,
      };
    }

    if (type === "أوميجا") {
      const omegaConfig = systemConfig?.parts?.omega;

      return {
        name: "أوميجا",
        width: omegaConfig?.defaultWidth ?? 45.5,
        quantity: omegaConfig?.defaultQuantity ?? 1,
      };
    }

    const duplicateCount = parts.filter((part) => part.name === type || part.name.startsWith(`${type} `)).length;

    return {
      name: duplicateCount ? `${type} ${duplicateCount + 1}` : type,

      width: "",

      height: "",

      quantity: quantities[type] || 1,
    };
  };
  const deletePanel = useCallback((panelIndex) => {
    if (panelIndex === 0) return;

    setPreventAutoSave(false);

    setProject((prev) => {
      const panels = prev.panels.filter((_, index) => index !== panelIndex);

      return {
        ...prev,
        panels,
      };
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
  }, []);
  const addPart = useCallback(
    (type) => {
      updatePanel(activePanel, (panel) => {
        const newPart = createPart(type, panel.parts);

        const newParts = [...panel.parts, newPart];

        // أول كرسي فقط يضيف أوميجا إذا لم تكن موجودة
        if (
          type === "الكرسي" &&
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

      const step =
        part.name === "الكرسي"
          ? (systemConfig?.parts?.chair?.quantityStep ?? 2)
          : (systemConfig?.parts?.omega?.quantityStep ?? 1);

      updatePartField(partIndex, "quantity", (part.quantity ?? 1) + step);
    },
    [activePanel, project.panels, systemConfig, updatePartField],
  );

  const decreasePartQuantity = useCallback(
    (partIndex) => {
      const part = project.panels[activePanel]?.parts?.[partIndex];

      if (!part) return;

      const config =
        part.name === "الكرسي"
          ? systemConfig?.parts?.chair
          : systemConfig?.parts?.omega;

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
    updatePanel(activePanel, (panel) => ({
      ...panel,
      hasCopper: true,
      copper: updater({
        enabled: false,
        pricePerKg: "",
        earthPrice: "",
        groundPrice: "",
        main: { optionKey: "", length: "", barCount: 1 },
        branches: [],
        ...(panel.copper || {}),
      }),
    }));
  }, [activePanel, updatePanel]);
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
      const dimensions = { ...(panel.dimensions || {}), [field]: value };
      const selectedType = (systemConfig?.panelTypes || []).find((type) => type.key === panel.panelTypeKey);
      return { ...panel, dimensions, ...(selectedType ? { parts: buildTypeParts(selectedType, dimensions) } : {}) };
    });
  }, [activePanel, systemConfig, updatePanel]);
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
      const projectToSave = prepareProjectForSaving(project, prices);

      await updateProject(projectId, projectToSave);
      if (complete) {
        const { data } = await completeProject(projectId);
        setProject((previousProject) => ({
          ...previousProject,
          status: data.project?.status || "completed",
        }));
        setPreventAutoSave(true);
      }
      return { success: true };
    } catch (error) {
      const message = getSaveErrorMessage(error);
      setSaveProjectError(message);
      return { success: false, error, message };
    } finally {
      setSavingProject(false);
    }
  }, [prices, project, projectId, readOnly]);
  const beginEditing = useCallback(async () => {
    try {
      const { data } = await startProjectEditing(projectId);
      setProject((current) => ({ ...current, status: data.project?.status || "editing" }));
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
      await updateProject(projectId, prepareProjectForSaving(project, prices));
      const { data } = await submitMarketingProjectRequest(projectId);
      setProject((current) => ({ ...current, status: data.project?.status || "pending" }));
      setPreventAutoSave(true);
      return { success: true, message: data.message, notification: data.notification };
    } catch (error) {
      const message = getSaveErrorMessage(error);
      setSaveProjectError(message);
      return { success: false, message };
    } finally {
      setSavingProject(false);
    }
  }, [prices, project, projectId, readOnly]);
  const canDeletePart = (part, parts) => {
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
        prices,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProject = () => useContext(ProjectContext);
