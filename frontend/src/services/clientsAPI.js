import api from "./api";

export const searchClients = (name) => api.get(`/clients/search?name=${encodeURIComponent(name)}`);

export const getAllClients = () => api.get("/clients");

export const createClient = (client) => api.post("/clients", client);

export const updateClient = (id, client) => api.put(`/clients/${id}`, client);

export const deleteClient = (id) => api.delete(`/clients/${id}`);
