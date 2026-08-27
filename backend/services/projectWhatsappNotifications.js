const { sendTemplateMessage } = require("./whatsappMeta");
const whatsappMessages = require("../models/whatsappMessages");

const templateLanguage = () => process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar_EG";
const frontendUrl = () => String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
const projectUrl = (project) => `${frontendUrl()}/projects/${project._id}`;

const namedBody = (parameterNames, values) => {
    if (parameterNames.length !== values.length) {
        throw new Error("WhatsApp template parameter names do not match the supplied values.");
    }
    // Meta currently rejects parameter_name values longer than 20 characters.
    // Older templates created in WhatsApp Manager could still be approved with
    // a longer named variable (for example execution_preview_link). In that
    // case send the body values positionally, in the exact template order,
    // instead of sending an invalid parameter_name.
    const usePositionalParameters = parameterNames.some((name) => String(name || "").length > 20);
    return [{
        type: "body",
        parameters: values.map((value, index) => ({
            type: "text",
            ...(!usePositionalParameters ? { parameter_name: parameterNames[index] } : {}),
            text: String(value ?? "غير محدد")
        }))
    }];
};

const namedHeader = (parameterNames, values) => {
    if (!parameterNames.length) return [];
    if (parameterNames.length !== values.length) {
        throw new Error("WhatsApp template header parameter names do not match the supplied values.");
    }
    return [{
        type: "header",
        parameters: values.map((value, index) => ({
            type: "text",
            parameter_name: parameterNames[index],
            text: String(value ?? "غير محدد")
        }))
    }];
};

const sendNamedTemplate = async (to, project, templateEnvName, fallbackName, parameterNames, values, headerNames = [], headerValues = [], metadata = {}) => {
    const templateName = process.env[templateEnvName] || fallbackName;
    const result = await sendTemplateMessage(
        to,
        templateName,
        templateLanguage(),
        [...namedHeader(headerNames, headerValues), ...namedBody(parameterNames, values)]
    );
    const providerMessageId = result?.messages?.[0]?.id;
    if (providerMessageId) {
        await whatsappMessages.create({
            providerMessageId,
            direction: "outbound",
            projectId: project?._id || null,
            panelId: metadata.panelId || null,
            recipientPhone: String(to || "").replace(/\D/g, ""),
            type: metadata.messageType || "template",
            text: templateName,
            status: result?.messages?.[0]?.message_status || "accepted",
            rawPayload: metadata.stageName ? { provider: result, stageName: metadata.stageName } : result
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
    [project.projectCode || project._id, project.client?.name || "غير محدد", marketerName, (project.panels || []).length, projectUrl(project)]
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
    ["customer_name", "panel_name", "project_id", "project_link"],
    [project.client?.name || "غير محدد", panelName || "غير محدد", project._id, projectUrl(project)],
    ["panel_name"],
    [panelName || "غير محدد"]
);

const sendExecutionPdfCompleted = (to, project, panelName, previewLink) => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_EXECUTION_PDF_COMPLETED",
    "execution_pdf_completed",
    ["customer_name", "panel_name", "project_id", "execution_preview_link"],
    [project.client?.name || "غير محدد", panelName || "غير محدد", project._id, previewLink || projectUrl(project)]
);

const sendExecutionConfirmed = (to, project, panelName) => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_EXECUTION_CONFIRMED",
    "execution_confirmed",
    ["customer_name", "panel_name", "project_id", "project_link"],
    [project.client?.name || "غير محدد", panelName || "غير محدد", project._id, projectUrl(project)],
    ["panel_name"],
    [panelName || "غير محدد"]
);

const sendPanelFilesReady = (to, project, panelName) => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_PANEL_FILES_READY",
    "panel_files_ready",
    ["customer_name", "panel_name", "project_id", "files_link"],
    [project.client?.name || "غير محدد", panelName || "غير محدد", project._id, projectUrl(project)]
);

const sendProductionStageCheck = (to, project, panel, stageName, marketerName = "غير محدد") => sendNamedTemplate(
    to,
    project,
    "WHATSAPP_TEMPLATE_PRODUCTION_STAGE_CHECK",
    "production_stage_check",
    ["project_id", "client_name", "marketer_name", "panel_name", "stage_name"],
    [project._id, project.client?.name || "غير محدد", marketerName, panel?.panelName || "غير محدد", stageName],
    ["panel_name"],
    [panel?.panelName || "غير محدد"],
    { messageType: "production_stage_check", panelId: panel?.panelId, stageName }
);

module.exports = {
    sendNewProjectAssigned,
    sendProjectUpdatedReview,
    sendProjectCompletedPreview,
    sendExecutionPdfRequested,
    sendExecutionPdfCompleted,
    sendExecutionConfirmed,
    sendPanelFilesReady,
    sendProductionStageCheck
};
