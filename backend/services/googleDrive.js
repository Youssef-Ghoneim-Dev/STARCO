const crypto = require("crypto");

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

const getConfig = () => {
    const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!rawCredentials || !folderId) {
        throw new Error("Google Drive credentials are incomplete. Check GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_FOLDER_ID.");
    }

    let credentials;
    try {
        credentials = JSON.parse(rawCredentials);
    } catch {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }

    if (!credentials.client_email || !credentials.private_key) {
        throw new Error("Google service account JSON is missing client_email or private_key.");
    }

    return { credentials, folderId };
};

const base64Url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const getAccessToken = async () => {
    if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
        return cachedAccessToken;
    }

    const { credentials } = getConfig();
    const issuedAt = Math.floor(Date.now() / 1000);
    const unsignedToken = `${base64Url({ alg: "RS256", typ: "JWT" })}.${base64Url({
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/drive",
        aud: "https://oauth2.googleapis.com/token",
        iat: issuedAt,
        exp: issuedAt + 3600
    })}`;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsignedToken);
    signer.end();
    const assertion = `${unsignedToken}.${signer.sign(credentials.private_key, "base64url")}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion
        })
    });
    const payload = await response.json();

    if (!response.ok || !payload.access_token) {
        throw new Error(payload?.error_description || payload?.error || "Google Drive authentication failed");
    }

    cachedAccessToken = payload.access_token;
    cachedAccessTokenExpiresAt = Date.now() + ((payload.expires_in || 3600) - 60) * 1000;
    return cachedAccessToken;
};

const uploadFile = async ({ fileName, mimeType, buffer }) => {
    const { folderId } = getConfig();
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
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body
    });
    const payload = await response.json();

    if (!response.ok || !payload.id) {
        throw new Error(payload?.error?.message || "Google Drive upload failed");
    }

    return payload;
};

module.exports = { uploadFile };
