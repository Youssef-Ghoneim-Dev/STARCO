const defaults = {
    startProject: `STARCO START
اسم العميل:`,
    panel: `STARCO PANEL
السمك المطلوب:
نوع اللوحة:
هل يوجد نحاس:
تفاصيل إضافية:`
};

const removeLegacyFields = (template, labels) => String(template || "")
    .split(/\r?\n/)
    .filter((line) => !labels.some((label) => new RegExp(`^\\s*${label}\\s*:`, "i").test(line)))
    .join("\n")
    .trim();

const emptyFieldValues = (template, labels) => String(template || "")
    .split(/\r?\n/)
    .map((line) => {
        const label = labels.find((item) => new RegExp(`^\\s*${item}\\s*:`, "i").test(line));
        return label ? `${label}:` : line;
    })
    .join("\n");

const getWhatsappTemplates = (templates = {}) => ({
    startProject: emptyFieldValues(
        removeLegacyFields(templates.startProject || defaults.startProject, ["نوع العميل"]),
        ["اسم العميل"]
    ),
    panel: emptyFieldValues(
        removeLegacyFields(templates.panel || defaults.panel, ["اسم اللوحة"]),
        ["السمك المطلوب", "نوع اللوحة", "هل يوجد نحاس", "تفاصيل إضافية"]
    )
});

const isValidTemplates = (templates) => {
    if (!templates || typeof templates.startProject !== "string" || typeof templates.panel !== "string") return false;

    return ["STARCO START", "اسم العميل"].every((value) => templates.startProject.includes(value)) &&
        ["STARCO PANEL", "السمك المطلوب", "نوع اللوحة", "هل يوجد نحاس"].every((value) => templates.panel.includes(value));
};

module.exports = { defaults, getWhatsappTemplates, isValidTemplates };
