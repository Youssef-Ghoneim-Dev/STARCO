import api from "./api";

export const getProjects = () => {
    return api.get("/projects");
};

export const getProject = (id) => {
    return api.get(`/projects/${id}`);
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

export const getProjectMedia = (id) => api.get(`/projects/${id}/media`);

export const getProjectMediaFile = (projectId, mediaId) => api.get(
    `/projects/${projectId}/media/${mediaId}/file`,
    { responseType: "blob" }
);
