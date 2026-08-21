const crypto = require("crypto");
const systemConfiguration = require("../models/systemConfiguration");

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const getOAuthConfig = () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Google Drive OAuth is incomplete. Check GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET and GOOGLE_DRIVE_REDIRECT_URI.");
    }
    return { clientId, clientSecret, redirectUri };
};

const getEncryptionKey = () => {
    if (!process.env.TOKEN_KEY) throw new Error("TOKEN_KEY is required to secure the Google Drive connection.");
    return crypto.createHash("sha256").update(`${process.env.TOKEN_KEY}:google-drive`).digest();
};

const encrypt = (value) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decrypt = (value) => {
    const [ivValue, tagValue, encryptedValue] = String(value || "").split(".");
    if (!ivValue || !tagValue || !encryptedValue) throw new Error("Saved Google Drive connection is invalid.");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
};

const createAuthorizationUrl = (state) => {
    const { clientId, redirectUri } = getOAuthConfig();
    const query = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: DRIVE_SCOPE,
        access_type: "offline",
        prompt: "consent",
        state
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
};

const exchangeAuthorizationCode = async (code) => {
    const { clientId, clientSecret, redirectUri } = getOAuthConfig();
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const payload = await response.json();
    if (!response.ok || !payload.refresh_token) {
        throw new Error(payload?.error_description || payload?.error || "Google did not return a permanent Drive connection.");
    }
    return payload;
};

const refreshAccessToken = async (refreshToken) => {
    const { clientId, clientSecret } = getOAuthConfig();
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" })
    });
    const payload = await response.json();
    if (!response.ok || !payload.access_token) {
        throw new Error(payload?.error_description || payload?.error || "Google Drive authentication failed");
    }
    return payload;
};

const createStarcoFolder = async (accessToken) => {
    const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "STARCO Media",
            mimeType: "application/vnd.google-apps.folder",
            appProperties: { starcoStorage: "true" }
        })
    });
    const payload = await response.json();
    if (!response.ok || !payload.id) throw new Error(payload?.error?.message || "Could not create the STARCO Media folder in Google Drive.");
    return payload;
};

const connectAccount = async (code) => {
    const tokens = await exchangeAuthorizationCode(code);
    const folder = await createStarcoFolder(tokens.access_token);
    const config = await systemConfiguration.updateGoogleDriveConnection({
        oauthRefreshToken: encrypt(tokens.refresh_token),
        folderId: folder.id,
        connectedEmail: null,
        connectedAt: new Date()
    });
    if (!config) throw new Error("System configuration was not found.");
    cachedAccessToken = tokens.access_token;
    cachedAccessTokenExpiresAt = Date.now() + ((tokens.expires_in || 3600) - 60) * 1000;
    return folder;
};

const getAccessToken = async () => {
    if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) return cachedAccessToken;
    const config = await systemConfiguration.getGoogleDriveConnection();
    const encryptedRefreshToken = config?.googleDrive?.oauthRefreshToken;
    if (!encryptedRefreshToken) throw new Error("Google Drive is not connected yet.");
    const payload = await refreshAccessToken(decrypt(encryptedRefreshToken));
    cachedAccessToken = payload.access_token;
    cachedAccessTokenExpiresAt = Date.now() + ((payload.expires_in || 3600) - 60) * 1000;
    return cachedAccessToken;
};

const uploadFile = async ({ fileName, mimeType, buffer }) => {
    const config = await systemConfiguration.getGoogleDriveConnection();
    const folderId = config?.googleDrive?.folderId;
    if (!folderId) throw new Error("Google Drive is not connected yet.");
    const accessToken = await getAccessToken();
    const boundary = `starco-${crypto.randomUUID()}`;
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
    const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
        body
    });
    const payload = await response.json();
    if (!response.ok || !payload.id) throw new Error(payload?.error?.message || "Google Drive upload failed");
    return payload;
};

const downloadStoredFile = async (fileId) => {
    const accessToken = await getAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error("Could not download the stored Google Drive file.");
    return {
        buffer: Buffer.from(await response.arrayBuffer()),
        mimeType: response.headers.get("content-type") || "application/octet-stream"
    };
};

const getConnectionStatus = async () => {
    const config = await systemConfiguration.getGoogleDriveConnection();
    return {
        connected: Boolean(config?.googleDrive?.oauthRefreshToken && config?.googleDrive?.folderId),
        connectedAt: config?.googleDrive?.connectedAt || null
    };
};

module.exports = { createAuthorizationUrl, connectAccount, uploadFile, downloadStoredFile, getConnectionStatus };
