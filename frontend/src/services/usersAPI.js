import api from "./api";

export const getPendingUsers = () => {

    return api.get("/users/approval");

};

export const approveUser = (id) => {

    return api.put(`/users/approval/${id}`);

};

export const deletePendingUser = (id) => {

    return api.delete(`/users/approval/${id}`);

};

export const getUsers = () => api.get("/users/admin");
export const getDeletedUsers = () => api.get("/users/admin/deleted");
export const updateUser = (id, user) => api.put(`/users/admin/${id}`, user);
export const deleteUser = (id) => api.delete(`/users/admin/${id}`);
export const restoreUser = (id) => api.patch(`/users/admin/${id}`);
export const permanentlyDeleteUser = (id) => api.delete(`/users/admin/${id}/permanent`);
