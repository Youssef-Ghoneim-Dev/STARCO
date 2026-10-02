import api from "./api";

export const getSystemConfiguration = () => {
    return api.get("system");
};
export const updateSystemConfiguration = (config) => {
    return api.put("system", config);
};

export const getWhatsappTemplates = () => api.get("system/whatsapp-templates");

export const updateWhatsappTemplates = (templates) =>
    api.put("system/whatsapp-templates", templates);

export const getR2Status = () => api.get("system/r2/status");