const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

const normalizeDigits = (value) => String(value || "").replace(/[٠-٩]/g, (digit) =>
    String(arabicDigits.indexOf(digit))
);

const field = (text, label) => {
    const match = text.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "mi"));
    return match?.[1]?.trim() || "";
};

const parseType = (value) => {
    const normalized = value.trim().toLowerCase();
    if (["شركة", "company"].includes(normalized)) return "company";
    if (["فرد", "person"].includes(normalized)) return "person";
    return null;
};

const parseThicknesses = (value) => normalizeDigits(value)
    .split(/[,،]/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

const parseWhatsappCommand = (text) => {
    const value = String(text || "").trim();
    const firstLine = value.split(/\r?\n/)[0].trim();

    if (/^STARCO\s+START(?:\s+v1)?$/i.test(firstLine)) {
        const clientName = field(value, "اسم العميل");
        const clientType = parseType(field(value, "نوع العميل"));
        return { type: "start", clientName, clientType };
    }

    const editMatch = firstLine.match(/^STARCO\s+EDIT\s+#?([a-f\d]{24})$/i);
    if (editMatch) {
        return {
            type: "edit",
            projectId: editMatch[1],
            clientName: field(value, "اسم العميل"),
            clientType: parseType(field(value, "نوع العميل"))
        };
    }

    if (/^STARCO\s+PANEL$/i.test(firstLine)) {
        return {
            type: "panel",
            panelName: field(value, "اسم اللوحة"),
            thicknesses: parseThicknesses(field(value, "السمك المطلوب")),
            details: field(value, "التفاصيل")
        };
    }

    if (/^STARCO\s+FINISH$/i.test(firstLine)) return { type: "finish" };
    if (/^STARCO\s+(?:DELETE|CANCEL)$/i.test(firstLine)) return { type: "delete" };
    return null;
};

module.exports = {
    parseWhatsappCommand
};
