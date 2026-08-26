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
    return api.post(`/projects/${id}/complete`);
};

export const startProjectEditing = (id, panelId) => api.post(`/projects/${id}/start-editing`, { panelId });

export const submitMarketingProject = (id) => api.post(`/projects/${id}/submit`);

export const requestExecutionPdf = (id, panelId) => api.post(`/projects/${id}/execution-pdf/request`, { panelId });

export const uploadExecutionPdfFile = (projectId, panelId, file) => {
    const formData = new FormData();
    formData.append("panelId", panelId);
    formData.append("file", file);
    return api.post(`/projects/${projectId}/execution-pdf/files`, formData);
};

export const finishExecutionPdf = (id, panelId) => api.post(`/projects/${id}/execution-pdf/finish`, { panelId });

export const skipExecutionPdf = (id, panelId) => api.post(`/projects/${id}/execution-pdf/skip`, { panelId });

export const requestExecutionPdfChanges = (id, panelId) => api.post(`/projects/${id}/execution-pdf/request-changes`, { panelId });

export const confirmProjectExecution = (id, panelId) => api.post(`/projects/${id}/execution-pdf/confirm`, { panelId });

export const getExecutionPdfFile = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/execution-pdf/${panelId}/files/${fileId}`,
    { responseType: "blob" },
);

export const deleteExecutionPdfFile = (projectId, panelId, fileId) => api.delete(
    `/projects/${projectId}/execution-pdf/${panelId}/files/${fileId}`,
);

export const uploadManufacturingFile = async (projectId, panelId, file) => {
    const { data: session } = await api.post(`/projects/${projectId}/manufacturing/upload-session`, {
        panelId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
    });

    const chunkSize = Number(session.chunkSize) || (3 * 1024 * 1024);
    let finalResponse = null;
    for (let start = 0; start < file.size; start += chunkSize) {
        const chunk = file.slice(start, Math.min(start + chunkSize, file.size));
        const formData = new FormData();
        formData.append("panelId", panelId);
        formData.append("uploadToken", session.uploadToken);
        formData.append("start", String(start));
        formData.append("total", String(file.size));
        formData.append("chunk", chunk, `${file.name}.part`);
        finalResponse = await api.post(`/projects/${projectId}/manufacturing/upload-chunk`, formData);
    }

    if (!finalResponse?.data?.complete || !finalResponse?.data?.project) {
        throw new Error("لم يكتمل رفع الملف. حاول مرة أخرى.");
    }
    return finalResponse;
};

export const finishManufacturingFiles = (projectId, panelId, notes) => api.post(
    `/projects/${projectId}/manufacturing/finish`,
    { panelId, notes },
);

export const getManufacturingFile = (projectId, panelId, fileId) => api.get(
    `/projects/${projectId}/manufacturing/${panelId}/files/${fileId}`,
    { responseType: "blob" },
);

export const getManufacturingArchive = (projectId, panelId) => api.get(
    `/projects/${projectId}/manufacturing/${panelId}/archive`,
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
    `/projects/${projectId}/manufacturing/stage`,
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
