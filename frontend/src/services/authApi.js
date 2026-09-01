import api from "./api";

export const login = (data) => {
    return api.post("/users/login", data);
};

export const register = (data) => {
    return api.post("/users/register", data);
};

export const googleLogin = (data) => api.post("/users/google/login", data);

export const googleRegister = (data) => api.post("/users/google/register", data);
