import api from "./api";

export const getProjects = () => {
    return api.get("/projects");
};

export const getProject = (id) => {
    return api.get(`/projects/${id}`);
};

export const getClientProjectPreview = (id, key) => {
    return api.get(`/projects/client/${id}`, { params: { key } });
};

export const getClientProjectPreviewByKey = (key) => {
    return api.get(`/projects/client-preview/${encodeURIComponent(key)}`);
};

export const getClientExecutionPdfFile = (key, panelId, fileId) => api.get(
    `/projects/client-preview/${encodeURIComponent(key)}/panels/${panelId}/execution-pdf/files/${fileId}`,
    { responseType: "blob" },
);

export const getClientExecutionPdfFileUrl = (key, panelId, fileId) => api.get(
    `/projects/client-preview/${encodeURIComponent(key)}/panels/${panelId}/execution-pdf/files/${fileId}/url`,
);

export const deleteProject = (id) => {
    return api.delete(`/projects/${id}`);
};

export const updateProject = (id, data) => {
    return api.put(`/projects/${id}`, data);
};

export const createProject = (data) => {
    return api.post("/projects", data);
};

export const getDeletedProjects = () => api.get("/projects/deleted");

export const restoreProject = (id) => api.patch(`/projects/${id}`);

export const permanentlyDeleteProject = (id) => api.delete(`/projects/${id}/permanent`);

export const completeProject = (id) => {
    return api.post(`/projects/${id}/preview`);
};

export const startProjectEditing = (id, panelId, data = {}) => api.post(`/projects/${id}/panels/${panelId}/open-editing`, data);

export const submitMarketingProject = (id) => api.post(`/projects/${id}/submit`);

export const requestExecutionPdf = (id, panelId, data) => api.post(`/projects/${id}/panels/${panelId}/execution-pdf/request`, data);

export const getPanels = (projectId) => api.get(`/projects/${projectId}/panels`);
export const getAllPanels = () => api.get("/panels");
export const getPanel = (projectId, panelId) => api.get(`/projects/${projectId}/panels/${panelId}`);
export const createPanel = (projectId, data = {}) => api.post(`/projects/${projectId}/panels`, data);
export const updatePanelRecord = (projectId, panelId, data) => api.put(`/projects/${projectId}/panels/${panelId}`, data);
export const deletePanelRecord = (projectId, panelId) => api.delete(`/projects/${projectId}/panels/${panelId}`);
export const claimPanel = (projectId, panelId) => api.post(`/projects/${projectId}/panels/${panelId}/claim`);
export const completePanelQuote = (projectId, panelId) => api.post(`/projects/${projectId}/panels/${panelId}/complete-quote`);
export const submitPanelEdits = (projectId, panelId) => api.post(`/projects/${projectId}/panels/${panelId}/submit-edits`);
export const cancelPanelEdits = (projectId, panelId) => api.post(`/projects/${projectId}/panels/${panelId}/cancel-edits`);
export const acquireProjectSetupLock = (projectId) => api.post(`/projects/${projectId}/setup-lock`);
export const completeProjectSetup = (projectId, data) => api.post(`/projects/${projectId}/setup-complete`, data);

const mediaMimeType = (file) => {
    if (file.type) return file.type;
    const extension = String(file.name || "").split(".").pop()?.toLowerCase();
    return ({
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
        mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
        mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
    })[extension] || "application/octet-stream";
};

const uploadToR2 = async (signPath, completePath, file, purpose = "", metadata = {}) => {
    const mimeType = metadata.mimeType || mediaMimeType(file);
    const { data: signed } = await api.post(signPath, {
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        ...(purpose ? { purpose } : {}),
        ...metadata,
    });
    const uploadResponse = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: file
    });
    if (!uploadResponse.ok) {
        const error = new Error("تعذر رفع الملف إلى التخزين. تحقق من إعدادات Cloudflare وحاول مرة أخرى.");
        error.status = uploadResponse.status;
        throw error;
    }
    return api.post(completePath, { uploadToken: signed.uploadToken, ...metadata });
};

export const uploadExecutionPdfFile = (projectId, panelId, file, purpose = "") => uploadToR2(
    `/projects/${projectId}/panels/${panelId}/execution-pdf/files/sign`,
    `/projects/${projectId}/panels/${panelId}/execution-pdf/files/complete`,
    file,
    purpose,
);

export const saveExecutionPdfDesign = (projectId, panelId, data) => api.put(
    `/projects/${projectId}/panels/${panelId}/execution-pdf/design`,
    data,
);

export const finishExecutionPdf = (id, panelId) => api.post(`/projects/${id}/panels/${panelId}/execution-pdf/finish`);

export const skipExecutionPdf = (id, panelId) => api.post(`/projects/${id}/panels/${panelId}/execution-pdf/skip`);

export const requestExecutionPdfChanges = (id, panelId) => api.post(`/projects/${id}/panels/${panelId}/execution-pdf/request-changes`);

export const confirmProjectExecution = (id, panelId) => api.post(`/projects/${id}/panels/${panelId}/execution/confirm`);

export const requestPanelDeliverySchedule = (projectId, panelId, requestedDate) => api.post(
    `/projects/${projectId}/panels/${panelId}/delivery-schedule/request`,
    { requestedDate },
);

export const respondPanelDeliverySchedule = (projectId, panelId, decision, responseNote = "", replacementDate = "") => api.post(
    `/projects/${projectId}/panels/${panelId}/delivery-schedule/respond`,
    { decision, responseNote, replacementDate },
);

export const getExecutionPdfFile = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/panels/${panelId}/execution-pdf/files/${fileId}`,
    { responseType: "blob" },
);

export const deleteExecutionPdfFile = (projectId, panelId, fileId) => api.delete(
    `/projects/${projectId}/panels/${panelId}/execution-pdf/files/${fileId}`,
);

export const uploadManufacturingFile = (projectId, panelId, file) => uploadToR2(
    `/projects/${projectId}/panels/${panelId}/manufacturing/files/sign`,
    `/projects/${projectId}/panels/${panelId}/manufacturing/files/complete`,
    file,
);

export const finishManufacturingFiles = (projectId, panelId, notes) => api.post(
    `/projects/${projectId}/panels/${panelId}/manufacturing/finish`,
    { notes },
);

export const getManufacturingFile = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/panels/${panelId}/manufacturing/files/${fileId}`,
    { responseType: "blob" },
);

export const getManufacturingFileUrl = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/panels/${panelId}/manufacturing/files/${fileId}/url`,
);

export const getManufacturingArchive = (projectId, panelId) => api.get(
    `/projects/${projectId}/panels/${panelId}/manufacturing/archive`,
    { responseType: "blob" },
);

export const markManufacturingDownloadedToLaser = (projectId, panelId) => api.post(
    `/projects/${projectId}/manufacturing/downloaded-to-laser`,
    { panelId },
);

export const recordManufacturingDelay = (projectId, panelId, reason) => api.post(
    `/projects/${projectId}/manufacturing/delay`,
    { panelId, reason },
);

export const updateManufacturingStage = (projectId, payload) => api.post(
    `/projects/${projectId}/panels/${payload.panelId}/manufacturing/stage`,
    payload,
);

export const getProjectMedia = (id, panelId = "") => api.get(`/projects/${id}/media`, {
    params: panelId ? { panelId } : undefined,
});

export const getProjectMediaWhatsappLink = (id, panelId) => api.get(
    `/projects/${id}/media/whatsapp-link`,
    { params: { panelId } },
);

export const getProjectMediaFile = (projectId, mediaId) => api.get(
    `/projects/${projectId}/media/${mediaId}/file`,
    { responseType: "blob" }
);

export const getProjectMediaUrl = (projectId, mediaId) => api.get(
    `/projects/${projectId}/media/${mediaId}/url`,
);

export const uploadProjectMedia = (projectId, panelId, file) => uploadToR2(
    `/projects/${projectId}/media/sign`,
    `/projects/${projectId}/media/complete`,
    file,
    "",
    { panelId, mimeType: mediaMimeType(file) },
).then((response) => response);

export const deleteProjectMedia = (projectId, mediaId) => api.delete(
    `/projects/${projectId}/media/${mediaId}`,
);
