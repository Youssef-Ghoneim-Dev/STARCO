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
export const acquireProjectSetupLock = (projectId) => api.post(`/projects/${projectId}/setup-lock`);
export const completeProjectSetup = (projectId, data) => api.post(`/projects/${projectId}/setup-complete`, data);

export const uploadExecutionPdfFile = (projectId, panelId, file, purpose = "") => {
    const formData = new FormData();
    formData.append("panelId", panelId);
    formData.append("file", file);
    if (purpose) formData.append("purpose", purpose);
    return api.post(`/projects/${projectId}/panels/${panelId}/execution-pdf/files`, formData);
};

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

export const respondPanelDeliverySchedule = (projectId, panelId, decision, responseNote = "") => api.post(
    `/projects/${projectId}/panels/${panelId}/delivery-schedule/respond`,
    { decision, responseNote },
);

export const getExecutionPdfFile = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/panels/${panelId}/execution-pdf/files/${fileId}`,
    { responseType: "blob" },
);

export const deleteExecutionPdfFile = (projectId, panelId, fileId) => api.delete(
    `/projects/${projectId}/panels/${panelId}/execution-pdf/files/${fileId}`,
);

export const uploadManufacturingFile = async (projectId, panelId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/projects/${projectId}/panels/${panelId}/manufacturing/files`, formData);
};

export const finishManufacturingFiles = (projectId, panelId, notes) => api.post(
    `/projects/${projectId}/panels/${panelId}/manufacturing/finish`,
    { notes },
);

export const getManufacturingFile = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/panels/${panelId}/manufacturing/files/${fileId}`,
    { responseType: "blob" },
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

export const getProjectMedia = (id) => api.get(`/projects/${id}/media`);

export const getProjectMediaWhatsappLink = (id, panelId) => api.get(
    `/projects/${id}/media/whatsapp-link`,
    { params: { panelId } },
);

export const getProjectMediaFile = (projectId, mediaId) => api.get(
    `/projects/${projectId}/media/${mediaId}/file`,
    { responseType: "blob" }
);

export const uploadProjectMedia = (projectId, panelId, file) => {
    const formData = new FormData();
    formData.append("panelId", panelId);
    formData.append("file", file);
    return api.post(`/projects/${projectId}/media`, formData);
};

export const deleteProjectMedia = (projectId, mediaId) => api.delete(
    `/projects/${projectId}/media/${mediaId}`,
);
