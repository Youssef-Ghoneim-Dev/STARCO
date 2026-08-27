const DIMENSION_PANEL_NAME = /^\s*\d+(?:[.,]\d+)?(?:\s*[×xX*]\s*\d+(?:[.,]\d+)?){2}\s*$/u;

export const getPanelNameDirection = (name) =>
  DIMENSION_PANEL_NAME.test(String(name || "")) ? "ltr" : "auto";

