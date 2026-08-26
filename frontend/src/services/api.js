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
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    // Do not force JSON on file uploads. Axios/the browser must generate the
    // multipart boundary; otherwise multer receives no file at all.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    }

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
            if (error.response?.data?.status === "whatsappPending" || message.includes("whatsapp verification")) {
                authStatusUpdater("whatsappPending");
            } else if (message.includes("approval") || message.includes("approved")) {
                authStatusUpdater("pending");
            } else if (message.includes("deleted")) {
                authStatusUpdater("deleted");
            }
        }

        return Promise.reject(error);
    },
);

export default api;
