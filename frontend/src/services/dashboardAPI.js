import api from "./api";

export const getDashboardStatistics = (date) => api.get("/dashboard", {
    params: { date }
});
