const { sendTemplateMessage } = require("./whatsappMeta");

const templateLanguage = () => process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar_EG";
const frontendUrl = () => String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
const projectUrl = (project) => `${frontendUrl()}/projects/${project._id}`;

const namedBody = (parameterNames, values) => {
    if (parameterNames.length !== values.length) {
        throw new Error("WhatsApp template parameter names do not match the supplied values.");
    }
    return [{
        type: "body",
        parameters: values.map((value, index) => ({
            type: "text",
            parameter_name: parameterNames[index],
            text: String(value ?? "غير محدد")
        }))
    }];
};

const sendNamedTemplate = (to, templateEnvName, fallbackName, parameterNames, values) =>
    sendTemplateMessage(
        to,
        process.env[templateEnvName] || fallbackName,
        templateLanguage(),
        namedBody(parameterNames, values)
    );

const sendNewProjectAssigned = (to, project, marketerName = "غير محدد") => sendNamedTemplate(
    to,
    "WHATSAPP_TEMPLATE_NEW_PROJECT_ASSIGNED",
    "new_project_assigned",
    ["project_id", "client_name", "marketer_name", "panels_count", "project_url"],
    [project._id, project.client?.name || "غير محدد", marketerName, (project.panels || []).length, projectUrl(project)]
);

const sendProjectUpdatedReview = (to, project, marketerName = "غير محدد") => sendNamedTemplate(
    to,
    "WHATSAPP_TEMPLATE_PROJECT_UPDATED_REVIEW",
    "project_updated_review",
    ["project_id", "client_name", "marketer_name", "project_url"],
    [project._id, project.client?.name || "غير محدد", marketerName, projectUrl(project)]
);

const sendProjectCompletedPreview = (to, project, previewLink) => sendNamedTemplate(
    to,
    "WHATSAPP_TEMPLATE_PROJECT_COMPLETED_PREVIEW",
    "project_completed_preview",
    ["project_id", "client_name", "panels_count", "preview_url"],
    [project._id, project.client?.name || "غير محدد", (project.panels || []).length, previewLink]
);

module.exports = {
    sendNewProjectAssigned,
    sendProjectUpdatedReview,
    sendProjectCompletedPreview
};
