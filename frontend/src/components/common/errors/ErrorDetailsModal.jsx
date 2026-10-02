import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineClipboardCopy, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import "./errorDetails.css";

const fields = [
  ["status", "HTTP Status"],
  ["code", "Error Code"],
  ["method", "HTTP Method"],
  ["endpoint", "Endpoint"],
  ["errorType", "Error Type"],
  ["backendMessage", "Backend Message"],
  ["userMessage", "User Message"],
  ["requestId", "Request ID"],
  ["timestamp", "Timestamp"],
  ["resourceId", "Resource ID"],
];

const formatDetails = (details) => {
  const lines = fields
    .filter(([key]) => details[key] !== null && details[key] !== "")
    .map(([key, label]) => `${label}\n${details[key]}`);
  if (details.validationErrors?.length) {
    lines.push(
      `Validation Errors\n${details.validationErrors.map((item) => `${item.field || "Field"}: ${item.message}`).join("\n")}`,
    );
  }
  if (details.safeDetails?.length) {
    lines.push(
      `Safe Details\n${details.safeDetails.map((item) => `${item.key}: ${item.value}`).join("\n")}`,
    );
  }
  return `تفاصيل الخطأ\n\n${lines.join("\n\n")}`;
};

function ErrorDetailsModal() {
  const [details, setDetails] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const open = (event) => {
      setDetails(event.detail || null);
      setCopied(false);
    };
    window.addEventListener("starco:error-details", open);
    return () => window.removeEventListener("starco:error-details", open);
  }, []);

  useEffect(() => {
    if (!details) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDetails(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [details]);

  if (!details) return null;
  const close = () => setDetails(null);
  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(formatDetails(details));
      setCopied(true);
    } catch {
      toast.error("تعذر نسخ تفاصيل الخطأ.");
    }
  };

  return createPortal(
    <div
      className="error-details-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="error-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-details-title"
        dir="rtl"
      >
        <header className="error-details-heading">
          <div>
            <span>معلومات تقنية آمنة</span>
            <h2 id="error-details-title">تفاصيل الخطأ</h2>
          </div>
          <button type="button" onClick={close} aria-label="إغلاق تفاصيل الخطأ">
            <HiOutlineX />
          </button>
        </header>
        <div className="error-details-body">
          <dl className="error-details-grid">
            {fields
              .filter(([key]) => details[key] !== null && details[key] !== "")
              .map(([key, label]) => (
                <div className={`error-detail-field ${key}`} key={key}>
                  <dt>{label}</dt>
                  <dd dir="auto">{details[key]}</dd>
                </div>
              ))}
          </dl>
          {details.validationErrors?.length > 0 && (
            <section className="error-detail-section">
              <h3>Validation Errors</h3>
              <ul>
                {details.validationErrors.map((item, index) => (
                  <li key={`${item.field}-${index}`}>
                    <strong dir="auto">{item.field || "Field"}</strong>
                    <span dir="auto">{item.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {details.safeDetails?.length > 0 && (
            <section className="error-detail-section">
              <h3>Safe Details</h3>
              <ul>
                {details.safeDetails.map((item) => (
                  <li key={item.key}>
                    <strong dir="auto">{item.key}</strong>
                    <span dir="auto">{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <footer className="error-details-actions">
          <button
            type="button"
            className="copy-error-details"
            onClick={copyDetails}
          >
            <HiOutlineClipboardCopy />
            {copied ? "تم النسخ" : "نسخ التفاصيل"}
          </button>
          <button type="button" className="close-error-details" onClick={close}>
            إغلاق
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default ErrorDetailsModal;
