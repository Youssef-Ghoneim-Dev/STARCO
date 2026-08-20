const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

const normalizeDigits = (value) => String(value || "").replace(/[٠-٩]/g, (digit) =>
    String(arabicDigits.indexOf(digit))
);

const field = (text, label) => {
    const match = text.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "mi"));
    return match?.[1]?.trim() || "";
};

const parseThicknesses = (value) => normalizeDigits(value)
    .split(/[,،]/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

const parsePanelNumber = (value) => {
    const number = Number(normalizeDigits(value).trim());
    return Number.isInteger(number) && number > 0 ? number : null;
};

const parseYesNo = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["نعم", "yes"].includes(normalized)) return true;
    if (["لا", "no"].includes(normalized)) return false;
    return null;
};

const parseWhatsappCommand = (text) => {
    const value = String(text || "").trim();
    const firstLine = value.split(/\r?\n/)[0].trim();

    if (/^STARCO\s+START(?:\s+v1)?$/i.test(firstLine)) {
        const clientName = field(value, "اسم العميل");
        return { type: "start", clientName };
    }

    const editMatch = firstLine.match(/^STARCO\s+EDIT\s+#?([a-f\d]{24})$/i);
    if (editMatch) {
        return {
            type: "edit",
            projectId: editMatch[1]
        };
    }

    const selectionMatch = firstLine.match(/^رقم\s+اللوحة\s*:\s*(.+)$/i);
    if (selectionMatch) {
        return { type: "panel-selection", panelNumber: parsePanelNumber(selectionMatch[1]) };
    }

    if (/^STARCO\s+PANEL$/i.test(firstLine)) {
        return {
            type: "panel",
            thicknesses: parseThicknesses(field(value, "السمك المطلوب")),
            panelType: field(value, "نوع اللوحة"),
            hasCopper: parseYesNo(field(value, "هل يوجد نحاس")),
            details: field(value, "تفاصيل إضافية") || field(value, "التفاصيل")
        };
    }

    if (/^STARCO\s+FINISH$/i.test(firstLine)) return { type: "finish" };
    if (/^STARCO\s+(?:DELETE|CANCEL)$/i.test(firstLine)) return { type: "delete" };
    return null;
};

module.exports = {
    parseWhatsappCommand
};
