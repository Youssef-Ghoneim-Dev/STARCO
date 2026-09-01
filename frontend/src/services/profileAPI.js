import api from "./api";

export const getProfile = () => api.get("/users/profile");

export const updateProfile = (profile) => api.put("/users/profile", profile);

export const updateThemePreference = (theme) => api.patch("/users/profile/theme", { theme });
