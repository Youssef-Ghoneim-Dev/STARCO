const { sendTemplateMessage } = require("./whatsappMeta");

const templateLanguage = () => process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar_EG";
const frontendUrl = () => String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
const projectUrl = (project) => `${frontendUrl()}/projects/${project._id}`;

const configuredParameterNames = (envName, fallbackNames) => {
    const configuredNames = String(process.env[envName] || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    return configuredNames.length ? configuredNames : fallbackNames;
};

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

const sendNamedTemplate = (to, templateEnvName, fallbackName, parametersEnvName, fallbackParameterNames, values) =>
    sendTemplateMessage(
        to,
        process.env[templateEnvName] || fallbackName,
        templateLanguage(),
        namedBody(configuredParameterNames(parametersEnvName, fallbackParameterNames), values)
    );

const sendNewProjectAssigned = (to, project) => sendNamedTemplate(
    to,
    "WHATSAPP_TEMPLATE_NEW_PROJECT_ASSIGNED",
    "new_project_assigned",
    "WHATSAPP_TEMPLATE_NEW_PROJECT_ASSIGNED_PARAMS",
    ["client_name", "project_id", "panel_count", "project_link"],
    [project.client?.name || "غير محدد", project._id, (project.panels || []).length, projectUrl(project)]
);

const sendProjectUpdatedReview = (to, project) => sendNamedTemplate(
    to,
    "WHATSAPP_TEMPLATE_PROJECT_UPDATED_REVIEW",
    "project_updated_review",
    "WHATSAPP_TEMPLATE_PROJECT_UPDATED_REVIEW_PARAMS",
    ["client_name", "project_id", "project_link"],
    [project.client?.name || "غير محدد", project._id, projectUrl(project)]
);

const sendProjectCompletedPreview = (to, project, previewLink) => sendNamedTemplate(
    to,
    "WHATSAPP_TEMPLATE_PROJECT_COMPLETED_PREVIEW",
    "project_completed_preview",
    "WHATSAPP_TEMPLATE_PROJECT_COMPLETED_PREVIEW_PARAMS",
    ["client_name", "project_id", "panel_count", "preview_link"],
    [project.client?.name || "غير محدد", project._id, (project.panels || []).length, previewLink]
);

module.exports = {
    sendNewProjectAssigned,
    sendProjectUpdatedReview,
    sendProjectCompletedPreview
};
