import api from "./api";

export const getLinkedAccounts = () => api.get("/users/linked-accounts");
export const createLinkedAccount = (data) => api.post("/users/linked-accounts", data);
export const switchLinkedAccount = (accountId) => api.post(`/users/linked-accounts/${accountId}/switch`);
