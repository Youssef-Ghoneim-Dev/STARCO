import { createElement } from "react";
import toast from "react-hot-toast";

const SECRET_KEY = /(authorization|cookie|token|password|secret|credential|private.?key|api.?key|connection.?string|dsn|stack|environment)/i;
const STACK_LINE = /^\s*at\s+.+\(?[^\n]*\)?\s*$/m;
const SENSITIVE_VALUE = /(bearer\s+)[a-z0-9._~+/-]+=*|((?:password|token|secret|authorization|cookie|api[_-]?key|private[_-]?key|connection[_-]?string)\s*[:=]\s*)[^\s,;&]+/gi;

const cleanText = (value, limit = 500) => {
    if (typeof value !== "string") return "";
    const withoutStack = value.split(/\n\s*at\s+/)[0];
    return withoutStack
        .replace(SENSITIVE_VALUE, "$1$2[REDACTED]")
        .replace(/(?:mongodb|postgres(?:ql)?|mysql|redis):\/\/[^@\s/]+:[^@\s/]+@[^/\s]+/gi, (match) => `${match.split("://")[0]}://[REDACTED]`)
        .trim()
        .slice(0, limit);
};

const safeObjectEntries = (value) => {
    if (!value || typeof value !== "object") return [];
    return Object.entries(value)
        .filter(([key]) => !SECRET_KEY.test(key))
        .slice(0, 20);
};

const safeValue = (value, depth = 0) => {
    if (typeof value === "string") return cleanText(value, 500);
    if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
    if (depth >= 3) return "[nested details omitted]";
    if (Array.isArray(value)) return value.slice(0, 15).map((item) => safeValue(item, depth + 1));
    if (typeof value === "object") {
        return Object.fromEntries(safeObjectEntries(value).map(([key, nested]) => [
            cleanText(key, 100),
            safeValue(nested, depth + 1),
        ]));
    }
    return "";
};

const safeEndpoint = (error) => {
    const rawUrl = error?.config?.url;
    if (!rawUrl) return "";
    try {
        const url = new URL(rawUrl, error.config.baseURL || window.location.origin);
        const query = [...url.searchParams.entries()].map(([key, value]) => [
            key,
            SECRET_KEY.test(key) ? "[REDACTED]" : cleanText(value, 120),
        ]);
        const path = url.pathname.split("/").map((segment) =>
            /^[A-Za-z0-9_-]{32,}$/.test(segment) ? "[REDACTED]" : cleanText(segment, 120),
        ).join("/");
        const search = new URLSearchParams(query).toString();
        return `${path}${search ? `?${search}` : ""}`.slice(0, 500);
    } catch {
        return cleanText(String(rawUrl).split("?")[0], 500);
    }
};

const getHeader = (headers, names) => {
    for (const name of names) {
        const value = headers?.[name] ?? headers?.get?.(name);
        if (typeof value === "string" && value.trim()) return cleanText(value, 180);
    }
    return "";
};

const safeValidation = (payload, status) => {
    const source = payload?.validationErrors || payload?.errors || payload?.fields ||
        (Array.isArray(payload?.message) ? payload.message : null) ||
        ([400, 422].includes(Number(status)) ? payload?.details : null);
    if (!source) return [];
    if (Array.isArray(source)) {
        return source.slice(0, 30).map((item) => ({
            field: cleanText(String(item?.field || item?.path || item?.param || ""), 160),
            message: cleanText(typeof item === "string" ? item : item?.message || item?.msg || "", 500),
        })).filter((item) => item.message && !SECRET_KEY.test(item.field));
    }
    if (typeof source === "object") {
        return safeObjectEntries(source).slice(0, 30).map(([field, value]) => ({
            field: cleanText(field, 160),
            message: cleanText(typeof value === "string" ? value : value?.message || "", 500),
        })).filter((item) => item.message && !SECRET_KEY.test(item.field));
    }
    return [];
};

export function getSafeErrorInfo(error, fallback = "تعذر إتمام العملية.") {
    const payload = error?.response?.data;
    const messageValue = Array.isArray(payload?.message)
        ? payload.message[0]?.message || payload.message[0]?.msg || ""
        : payload?.message;
    const backendMessage = cleanText(messageValue);
    const explicitUserMessage = cleanText(payload?.userMessage);
    const rawBackendMessage = typeof messageValue === "string" ? messageValue : "";
    const hasStack = STACK_LINE.test(rawBackendMessage);
    const appearsInternal = /\b(?:Internal server error|MongoServerError|MongoNetworkError|CastError|MongooseError|ValidationError|E11000|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|duplicate key error|buffering timed out|server selection timed out)\b|Cannot read properties|process\.env|node_modules|(?:mongodb|postgres|mysql|redis):\/\//i.test(rawBackendMessage);
    const userMessage = explicitUserMessage || (!hasStack && !appearsInternal && backendMessage) || fallback;
    const headers = error?.response?.headers;
    const requestId = cleanText(
        payload?.requestId || payload?.correlationId || getHeader(headers, ["x-request-id", "request-id", "x-correlation-id", "correlation-id"]),
        180,
    );
    const safeDetailsPayload = payload?.safeDetails ||
        (Array.isArray(payload?.details) ? null : payload?.details);
    const safeDetails = safeObjectEntries(safeDetailsPayload).map(([key, value]) => {
        const safe = safeValue(value);
        return {
            key: cleanText(key, 100),
            value: typeof safe === "string" ? safe : JSON.stringify(safe),
        };
    }).filter((item) => item.value);
    const endpoint = safeEndpoint(error);
    const method = cleanText(error?.config?.method || "", 12).toUpperCase();
    const validationErrors = safeValidation(payload, error?.response?.status);
    const details = {
        errorType: cleanText(error?.name || "RequestError", 100),
        status: Number(error?.response?.status) || null,
        code: cleanText(payload?.errorCode || payload?.code || error?.code || "", 120),
        backendMessage,
        userMessage: explicitUserMessage,
        method,
        endpoint,
        requestId,
        timestamp: cleanText(payload?.timestamp || getHeader(headers, ["date"]), 120),
        resourceId: cleanText(payload?.resourceId || payload?.entityId || "", 160),
        validationErrors,
        safeDetails,
    };
    const hasDetails = Boolean(
        details.status || details.code || details.method || details.endpoint ||
        details.requestId || details.timestamp || details.resourceId ||
        details.validationErrors.length || details.safeDetails.length,
    );
    return { userMessage, details, hasDetails };
}

export function showApiErrorToast(error, fallback = "تعذر إتمام العملية.", options = {}) {
    const { userMessage, details, hasDetails } = getSafeErrorInfo(error, fallback);
    const requestDetails = () => window.dispatchEvent(
        new CustomEvent("starco:error-details", { detail: details }),
    );
    const message = createElement("span", { className: "starco-api-error" },
        createElement("span", { className: "starco-api-error-message", dir: "auto" }, userMessage),
        hasDetails && createElement("button", {
            type: "button",
            className: "starco-api-error-details-trigger",
            onClick: (event) => {
                event.stopPropagation();
                requestDetails();
            },
        }, "عرض التفاصيل"),
    );
    return toast.error(message, options);
}
