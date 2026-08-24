const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

const normalizeDigits = (value) => String(value || "").replace(/[٠-٩]/g, (digit) =>
    String(arabicDigits.indexOf(digit))
);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const field = (text, label) => {
    const match = text.match(new RegExp(`^\\s*(?:[-•*]\\s*)?${escapeRegExp(label)}\\s*(?::|：|-)?\\s*(.+?)\\s*$`, "mi"));
    return match?.[1]?.trim() || "";
};

const parseThicknesses = (value) => normalizeDigits(value)
    .split(/[,،\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

const parsePanelNumber = (value) => {
    const number = Number(normalizeDigits(value).trim());
    return Number.isInteger(number) && number > 0 ? number : null;
};

const parseYesNo = (value) => {
    const normalized = String(value || "").trim().toLowerCase().replace(/[أإآ]/g, "ا");
    if (["نعم", "ايوه", "yes", "true"].includes(normalized)) return true;
    if (["لا", "لأ", "no", "false"].includes(normalized)) return false;
    return null;
};

const parseWhatsappCommand = (text) => {
    const value = String(text || "").trim();
    const firstLine = value.split(/\r?\n/)[0].trim();

    if (/^STARCO\s+START(?:\s+v1)?\s*[:：-]?$/i.test(firstLine)) {
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

    const mediaMatch = firstLine.match(/^STARCO\s+MEDIA\s+#?([a-f\d]{24})\s+PANEL\s+(\d+)$/i);
    if (mediaMatch) {
        return { type: "media", projectId: mediaMatch[1], panelNumber: parsePanelNumber(mediaMatch[2]) };
    }

    const selectionMatch = firstLine.match(/^\s*رقم\s+اللوحة\s*(?::|：|-)?\s*(.+?)\s*$/i);
    if (selectionMatch) {
        return { type: "panel-selection", panelNumber: parsePanelNumber(selectionMatch[1]) };
    }

    if (/^STARCO\s+PANEL\s*[:：-]?$/i.test(firstLine)) {
        return {
            type: "panel",
            thicknesses: parseThicknesses(field(value, "السمك المطلوب")),
            panelType: field(value, "نوع اللوحة"),
            hasCopper: parseYesNo(field(value, "هل يوجد نحاس")),
            details: field(value, "تفاصيل إضافية") || field(value, "التفاصيل")
        };
    }

    const controlInstallation = field(value, "تركيب لوحة الكنترول") || field(value, "تركيب الكنترول");
    if (controlInstallation) return { type: "control-installation", value: controlInstallation };

    const installationWord = firstLine.replace(/[أإآ]/g, "ا").trim();
    if (["دفن", "دفنة", "عادية"].includes(installationWord)) {
        return { type: "control-installation", value: installationWord === "دفنة" ? "دفن" : installationWord };
    }

    const switches = field(value, "نوع المفاتيح") || field(value, "المفاتيح");
    const main = field(value, "الرئيسي");
    const branches = field(value, "الفرعيات");
    const notes = field(value, "تفاصيل إضافية للنحاس") || field(value, "تفاصيل النحاس");
    if (switches || main || branches || notes) return { type: "copper-details", switches, main, branches, notes };

    if (/^(?:STARCO\s+FINISH|FINISH|تم|تمام|خلصت)$/i.test(firstLine)) return { type: "finish" };
    if (/^STARCO\s+(?:DELETE|CANCEL)$/i.test(firstLine)) return { type: "delete" };
    return null;
};

module.exports = {
    parseWhatsappCommand
};
