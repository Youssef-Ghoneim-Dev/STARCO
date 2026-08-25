const { sendTemplateMessage } = require("./whatsappMeta");
const whatsappMessages = require("../models/whatsappMessages");

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

const sendNamedTemplate = async (to, project, templateEnvName, fallbackName, parameterNames, values) => {
    const templateName = process.env[templateEnvName] || fallbackName;
    const result = await sendTemplateMessage(
        to,
        templateName,
        templateLanguage(),
        namedBody(parameterNames, values)
    );
    const providerMessageId = result?.messages?.[0]?.id;
    if (providerMessageId) {
        await whatsappMessages.create({
            providerMessageId,
            direction: "outbound",
            projectId: project?._id || null,
            recipientPhone: String(to || "").replace(/\D/g, ""),
            type: "template",
            text: templateName,
            status: result?.messages?.[0]?.message_status || "accepted",
            rawPayload: result
        }).catch((error) => console.error("Could not store WhatsApp template message:", error.message));
    }
    return result;
};

const sendNewProjectAssigned = (to, project, marketerName = "غير محدد") => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_NEW_PROJECT_ASSIGNED",
    "new_project_assigned",
    ["project_id", "client_name", "marketer_name", "panels_count", "project_url"],
    [project._id, project.client?.name || "غير محدد", marketerName, (project.panels || []).length, projectUrl(project)]
);

const sendProjectUpdatedReview = (to, project, marketerName = "غير محدد") => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_PROJECT_UPDATED_REVIEW",
    "project_updated_review",
    ["project_id", "client_name", "marketer_name", "project_url"],
    [project._id, project.client?.name || "غير محدد", marketerName, projectUrl(project)]
);

const sendProjectCompletedPreview = (to, project, previewLink) => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_PROJECT_COMPLETED_PREVIEW",
    "project_completed_preview",
    ["project_id", "client_name", "panels_count", "preview_url"],
    [project._id, project.client?.name || "غير محدد", (project.panels || []).length, previewLink]
);

const sendExecutionPdfRequested = (to, project, panelName) => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_EXECUTION_PDF_REQUESTED",
    "execution_pdf_requested",
    ["project_id", "client_name", "panel_name", "project_url"],
    [project._id, project.client?.name || "غير محدد", panelName || "غير محدد", projectUrl(project)]
);

const sendExecutionPdfCompleted = (to, project, panelName) => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_EXECUTION_PDF_COMPLETED",
    "execution_pdf_completed",
    ["project_id", "client_name", "panel_name", "project_url"],
    [project._id, project.client?.name || "غير محدد", panelName || "غير محدد", projectUrl(project)]
);

module.exports = {
    sendNewProjectAssigned,
    sendProjectUpdatedReview,
    sendProjectCompletedPreview,
    sendExecutionPdfRequested,
    sendExecutionPdfCompleted
};
