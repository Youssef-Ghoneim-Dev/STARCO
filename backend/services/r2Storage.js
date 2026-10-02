const crypto = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const MAX_SINGLE_PART_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;

let cachedClient = null;

const configuration = () => {
    const accountId = String(process.env.CLOUDFLARE_R2_ACCOUNT_ID || "").trim();
    const accessKeyId = String(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "").trim();
    const secretAccessKey = String(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "").trim();
    const bucket = String(process.env.CLOUDFLARE_R2_BUCKET || "").trim();
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
        const error = new Error("Cloudflare R2 غير مضبوط بعد. أضف CLOUDFLARE_R2_ACCOUNT_ID وCLOUDFLARE_R2_ACCESS_KEY_ID وCLOUDFLARE_R2_SECRET_ACCESS_KEY وCLOUDFLARE_R2_BUCKET.");
        error.statusCode = 503;
        error.code = "R2_NOT_CONFIGURED";
        throw error;
    }
    return { accountId, accessKeyId, secretAccessKey, bucket };
};

const client = () => {
    if (cachedClient) return cachedClient;
    const { accountId, accessKeyId, secretAccessKey } = configuration();
    cachedClient = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey }
    });
    return cachedClient;
};

const safeName = (fileName) => String(fileName || "file")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "file";

const createObjectKey = ({ prefix = "uploads", fileName }) => {
    const cleanPrefix = String(prefix || "uploads").replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9_\-/]/g, "-");
    return `${cleanPrefix}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName(fileName)}`;
};

const uploadFile = async ({ buffer, fileName, mimeType, prefix }) => {
    const { bucket } = configuration();
    const key = createObjectKey({ prefix, fileName });
    await client().send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream"
    }));
    return { id: key, name: safeName(fileName), mimeType: mimeType || "application/octet-stream", size: buffer?.length || 0 };
};

const createUploadUrl = async ({ key, mimeType }) => {
    const { bucket } = configuration();
    const uploadUrl = await getSignedUrl(client(), new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mimeType || "application/octet-stream"
    }), { expiresIn: UPLOAD_URL_TTL_SECONDS });
    return { uploadUrl, expiresIn: UPLOAD_URL_TTL_SECONDS };
};

const getVerifiedStoredFile = async (key) => {
    const { bucket } = configuration();
    const stored = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: String(key || "") }));
    return {
        id: String(key || ""),
        name: safeName(String(key || "").split("/").pop()),
        mimeType: stored.ContentType || "application/octet-stream",
        size: Number(stored.ContentLength || 0),
        createdTime: stored.LastModified || new Date()
    };
};

const downloadStoredFile = async (key) => {
    const { bucket } = configuration();
    const stored = await client().send(new GetObjectCommand({ Bucket: bucket, Key: String(key || "") }));
    return {
        buffer: Buffer.from(await stored.Body.transformToByteArray()),
        mimeType: stored.ContentType || "application/octet-stream"
    };
};

const createDownloadUrl = async (key, downloadName = "") => {
    const { bucket } = configuration();
    return getSignedUrl(client(), new GetObjectCommand({
        Bucket: bucket,
        Key: String(key || ""),
        ...(downloadName ? { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}` } : {})
    }), { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
};

const deleteStoredFile = async (key) => {
    if (!key) return;
    const { bucket } = configuration();
    await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: String(key) }));
};

const getConnectionStatus = async () => {
    try {
        const { bucket } = configuration();
        await client().send(new HeadObjectCommand({ Bucket: bucket, Key: "__starco_connection_check__" }));
    } catch (error) {
        // A missing probe object proves that R2 accepted the credentials.
        if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) return { connected: true };
        if (error?.code === "R2_NOT_CONFIGURED") return { connected: false, reason: "notConfigured" };
        return { connected: false, reason: "unreachable" };
    }
    return { connected: true };
};

module.exports = {
    MAX_SINGLE_PART_UPLOAD_BYTES,
    createObjectKey,
    createUploadUrl,
    createDownloadUrl,
    uploadFile,
    getVerifiedStoredFile,
    downloadStoredFile,
    deleteStoredFile,
    getConnectionStatus
};
