import toast from "react-hot-toast";
import { createElement } from "react";

const cleanText = (value, maxLength = 1000) =>
  String(value || "").trim().slice(0, maxLength);

const getErrorKey = (error) =>
  [
    error?.type,
    error?.code,
    error?.subcode,
    error?.details,
    error?.message,
  ]
    .map((value) => cleanText(value, 1000).toLowerCase())
    .filter(Boolean)
    .join("|");

const deduplicateErrors = (errors = []) => {
  const seen = new Set();

  return errors.filter((error) => {
    const key = getErrorKey(error);

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export function showWhatsAppNotificationErrorToast(
  notificationErrors = [],
) {
  const uniqueErrors = deduplicateErrors(notificationErrors);

  const details = {
    errorType: "WhatsAppNotificationError",
    status: null,
    code: uniqueErrors
      .map((error) => error?.code)
      .filter(Boolean)
      .join(", "),
    backendMessage: uniqueErrors
      .map((error) => error?.message || error?.details)
      .filter(Boolean)
      .join("\n\n"),
    userMessage:
      "تم إنشاء المشروع، ولكن تعذر إرساله عبر WhatsApp.",
    method: "",
    endpoint: "",
    requestId: "",
    timestamp: "",
    resourceId: "",
    validationErrors: [],
    safeDetails: uniqueErrors.map((error, index) => ({
      key: `WhatsApp Error ${index + 1}`,
      value: [
        error?.type,
        error?.code ? `Code: ${error.code}` : "",
        error?.subcode ? `Subcode: ${error.subcode}` : "",
        error?.message || error?.details || "",
      ]
        .filter(Boolean)
        .join(" | "),
    })),
  };

  const requestDetails = () => {
    window.dispatchEvent(
      new CustomEvent("starco:error-details", {
        detail: details,
      }),
    );
  };

  const message = createElement(
    "span",
    { className: "starco-api-error" },
    createElement(
      "span",
      {
        className: "starco-api-error-message",
        dir: "auto",
      },
      "تم إنشاء المشروع، ولكن تعذر إرساله عبر WhatsApp.",
    ),
    createElement(
      "button",
      {
        type: "button",
        className: "starco-api-error-details-trigger",
        onClick: (event) => {
          event.stopPropagation();
          requestDetails();
        },
      },
      "عرض التفاصيل",
    ),
  );

  return toast.error(message, {
    duration: 7000,
  });
}