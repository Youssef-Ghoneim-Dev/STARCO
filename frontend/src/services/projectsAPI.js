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

export const startProjectEditing = (id) => api.post(`/projects/${id}/start-editing`);

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

export const uploadManufacturingFile = (projectId, panelId, file) => {
    return api.post(`/projects/${projectId}/manufacturing/upload-session`, {
        panelId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
    }).then(async ({ data }) => {
        const uploadResponse = await fetch(data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
        });
        const uploadedFile = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploadedFile.id) {
            throw new Error(uploadedFile?.error?.message || `تعذر رفع الملف إلى مساحة التخزين (${uploadResponse.status}).`);
        }
        return api.post(`/projects/${projectId}/manufacturing/upload-complete`, {
            panelId,
            storageFileId: uploadedFile.id,
        });
    });
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
