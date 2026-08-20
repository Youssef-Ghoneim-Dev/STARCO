const defaults = {
    startProject: `STARCO START v1
اسم العميل: اكتب اسم العميل هنا
نوع العميل: شركة`,
    panel: `STARCO PANEL
اسم اللوحة: اكتب اسم اللوحة هنا
السمك المطلوب: 0.7, 1, 1.5
نوع اللوحة: عادية
هل يوجد نحاس: لا
تفاصيل إضافية: اكتب التفاصيل هنا`
};

const getWhatsappTemplates = (templates = {}) => ({
    startProject: templates.startProject || defaults.startProject,
    panel: templates.panel || defaults.panel
});

const isValidTemplates = (templates) => {
    if (!templates || typeof templates.startProject !== "string" || typeof templates.panel !== "string") return false;

    return ["STARCO START", "اسم العميل", "نوع العميل"].every((value) => templates.startProject.includes(value)) &&
        ["STARCO PANEL", "اسم اللوحة", "السمك المطلوب", "نوع اللوحة", "هل يوجد نحاس"].every((value) => templates.panel.includes(value));
};

module.exports = { defaults, getWhatsappTemplates, isValidTemplates };
