import axios from "axios";

let authStatusUpdater = null;

export const registerAuthStatusUpdater = (updater) => {
    authStatusUpdater = updater;
};

export const unregisterAuthStatusUpdater = () => {
    authStatusUpdater = null;
};

const api = axios.create({
    baseURL: "https://starco-1zov-three.vercel.app/api/V1/",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = String(error.response?.data?.message || "").toLowerCase();

        if (error.response?.status === 403 && authStatusUpdater) {
            if (message.includes("approval") || message.includes("approved")) {
                authStatusUpdater("pending");
            } else if (message.includes("deleted")) {
                authStatusUpdater("deleted");
            }
        }

        return Promise.reject(error);
    },
);

export default api;