const crypto = require("crypto");
const { normalizePhoneNumber } = require("../utils/phoneNumber");

const getConfig = () => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;

    if (!accessToken || !phoneNumberId || !apiVersion) {
        throw new Error("WhatsApp credentials are incomplete. Check WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_GRAPH_API_VERSION.");
    }

    return { accessToken, phoneNumberId, apiVersion };
};

const requestMeta = async (path, body) => {
    const { accessToken, phoneNumberId, apiVersion } = getConfig();
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const payload = await response.json();
    if (!response.ok) {
        const error = new Error(payload?.error?.message || "WhatsApp API request failed");
        error.statusCode = response.status;
        error.metaCode = payload?.error?.code;
        throw error;
    }

    return payload;
};

const sendTextMessage = (to, body) => requestMeta("/messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhoneNumber(to),
    type: "text",
    text: { preview_url: false, body }
});

const sendTemplateMessage = (to, name, languageCode = "ar", components = []) => requestMeta("/messages", {
    messaging_product: "whatsapp",
    to: normalizePhoneNumber(to),
    type: "template",
    template: { name, language: { code: languageCode }, components }
});

const markMessageAsRead = (messageId) => requestMeta("/messages", {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId
});

const downloadMedia = async (mediaId) => {
    const { accessToken, apiVersion } = getConfig();
    const metadataResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const metadata = await metadataResponse.json();

    if (!metadataResponse.ok || !metadata.url) {
        throw new Error(metadata?.error?.message || "Could not get WhatsApp media metadata");
    }

    const fileResponse = await fetch(metadata.url, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!fileResponse.ok) {
        throw new Error("Could not download WhatsApp media");
    }

    return {
        buffer: Buffer.from(await fileResponse.arrayBuffer()),
        mimeType: metadata.mime_type || fileResponse.headers.get("content-type") || "application/octet-stream",
        fileSize: Number(metadata.file_size) || null
    };
};

const isValidWebhookSignature = (rawBody, signature) => {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret || !rawBody || !signature) return false;

    const expected = `sha256=${crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex")}`;

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

module.exports = {
    sendTextMessage,
    sendTemplateMessage,
    markMessageAsRead,
    downloadMedia,
    isValidWebhookSignature
};
