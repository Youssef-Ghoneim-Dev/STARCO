import api from "./api";

export const getDashboardNotes = () => api.get("/users/dashboard-notes");
export const createDashboardNote = (text) => api.post("/users/dashboard-notes", { text });
export const deleteDashboardNote = (noteId) => api.delete(`/users/dashboard-notes/${noteId}`);
