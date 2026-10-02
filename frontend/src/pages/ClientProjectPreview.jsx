import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  getClientExecutionPdfFile,
  getClientProjectPreview,
  getClientProjectPreviewByKey,
} from "../services/projectsAPI";
import { createExecutionPdf } from "../utils/executionPdf";
import { createProjectPdf } from "../utils/projectPdf";
import { getPanelNameDirection } from "../utils/panelNameDirection";
import "../styles/ClientProjectPreview.css";

GlobalWorkerOptions.workerSrc = pdfWorker;

const safeDestroyPdf = (document) => {
  if (typeof document?.destroy !== "function") return;
  const result = document.destroy();
  if (typeof result?.catch === "function") result.catch(() => {});
};

function PdfPage({ pdfDocument, pageNumber, title }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let renderTask;
    const renderPage = async () => {
      const page = await pdfDocument.getPage(pageNumber);
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1 });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;
    };
    renderPage().catch((error) => {
      if (!cancelled && error?.name !== "RenderingCancelledException")
        console.error("Could not render PDF page:", error);
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument]);
  return (
    <canvas ref={canvasRef} aria-label={`صفحة ${pageNumber} من ${title}`} />
  );
}

const executionReadyStatuses = new Set(["ready", "confirmed"]);
const panelKey = (panel) => String(panel?.panelId || panel?._id || "");
const executionLoadErrorMessage = async (error) => {
  const payload = error?.response?.data;
  if (payload instanceof Blob) {
    try {
      const parsed = JSON.parse(await payload.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // The response was not a JSON error body.
    }
  }
  if (payload?.message) return payload.message;
  if (error?.response?.status === 503)
    if (error?.response?.status === 503)
      return "تعذر الوصول إلى ملفات PDF التنفيذ مؤقتًا. يرجى المحاولة مرة أخرى لاحقًا.";
  if (error?.response?.status === 404)
    return "أحد ملفات PDF التنفيذ غير موجود في مساحة التخزين.";
  return error?.message || "تعذر تجهيز PDF التنفيذ.";
};

function ClientProjectPreview() {
  const { id, previewKey } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [quoteDocument, setQuoteDocument] = useState(null);
  const [executionDocuments, setExecutionDocuments] = useState({});
  const [activeDocument, setActiveDocument] = useState("quote");
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [executionNotice, setExecutionNotice] = useState("");
  const [state, setState] = useState({
    loading: true,
    executionLoading: false,
    error: "",
    executionError: "",
  });
  const documentsRef = useRef({ quote: null, executions: {} });
  const executionLoadKeyRef = useRef("");
  const executionNoticeTimerRef = useRef(null);
  const key = previewKey || searchParams.get("key") || "";
  const allPanels = useMemo(() => project?.panels || [], [project]);
  const executionPanels = useMemo(
    () =>
      allPanels.filter(
        (panel) =>
          executionReadyStatuses.has(panel.executionPdf?.status) &&
          !panel.executionPdf?.skipped &&
          panel.executionPdf?.design?.assignments?.page2,
      ),
    [allPanels],
  );
  const selectedPanel =
    allPanels.find((panel) => panelKey(panel) === String(selectedPanelId)) ||
    executionPanels[0] ||
    allPanels[0];
  const selectedExecutionDocument =
    executionDocuments[panelKey(selectedPanel)] || null;
  const displayedDocument =
    activeDocument === "execution" ? selectedExecutionDocument : quoteDocument;
  const selectedExecutionWasRequested = Boolean(
    selectedPanel?.executionPdf?.status &&
    selectedPanel.executionPdf.status !== "notRequested",
  );
  const selectedExecutionWasSkipped = Boolean(
    selectedPanel?.executionPdf?.skipped,
  );
  const selectedExecutionStatusMessage = selectedExecutionWasSkipped
    ? "تم تخطي PDF التنفيذ لهذه اللوحة. يرجى التواصل مع مسؤول المشروع."
    : !selectedExecutionWasRequested
      ? "لم يتم طلب PDF التنفيذ لهذه اللوحة. يرجى طلبه من مسؤول المشروع."
      : "ملف PDF التنفيذ لهذه اللوحة قيد التجهيز، وسيظهر هنا بمجرد اعتماده.";
  const showExecutionNotice = (message) => {
    window.clearTimeout(executionNoticeTimerRef.current);
    setExecutionNotice(message);
    executionNoticeTimerRef.current = window.setTimeout(
      () => setExecutionNotice(""),
      3000,
    );
  };
  const openExecutionDocument = () => {
    setExecutionNotice("");
    setActiveDocument("execution");
    if (!selectedExecutionDocument) {
      showExecutionNotice(
        state.executionError || selectedExecutionStatusMessage,
      );
    }
  };

  useEffect(() => {
    let active = true;
    let loadingTask;
    let loadedDocument;
    const loadPreview = async () => {
      if (!key)
        return (
          active &&
          setState({
            loading: false,
            executionLoading: false,
            error: "رابط المعاينة غير مكتمل.",
            executionError: "",
          })
        );
      try {
        const response = previewKey
          ? await getClientProjectPreviewByKey(previewKey)
          : await getClientProjectPreview(id, key);
        const { project: loadedProject, copperConfiguration } =
          response.data || {};
        const pdf = await createProjectPdf({
          project: loadedProject,
          prices: loadedProject?.prices || {},
          copperConfiguration,
        });
        loadingTask = getDocument({
          data: new Uint8Array(await pdf.arrayBuffer()),
        });
        loadedDocument = await loadingTask.promise;
        if (!active) return safeDestroyPdf(loadedDocument);
        documentsRef.current.quote = loadedDocument;
        setProject(loadedProject);
        setQuoteDocument(loadedDocument);
        setState({
          loading: false,
          executionLoading: false,
          error: "",
          executionError: "",
        });
      } catch (error) {
        console.error("Could not open the public project preview:", error);
        if (active)
          setState({
            loading: false,
            executionLoading: false,
            error: error.response?.data?.message || "تعذر فتح معاينة المشروع.",
            executionError: "",
          });
      }
    };
    loadPreview();
    return () => {
      active = false;
      if (!loadedDocument && typeof loadingTask?.destroy === "function")
        loadingTask.destroy();
    };
  }, [id, key, previewKey]);

  useEffect(() => {
    if (!selectedPanelId)
      setSelectedPanelId(panelKey(executionPanels[0] || allPanels[0]));
  }, [allPanels, executionPanels, selectedPanelId]);

  useEffect(() => {
    if (!key || !executionPanels.length) return undefined;
    const loadKey = `${key}:${executionPanels.map((panel) => panelKey(panel)).join(",")}`;
    if (executionLoadKeyRef.current === loadKey) return undefined;
    executionLoadKeyRef.current = loadKey;
    let active = true;
    setState((current) => ({
      ...current,
      executionLoading: true,
      executionError: "",
    }));

    const preloadExecutionPdfs = async () => {
      try {
        const results = await Promise.allSettled(
          executionPanels.map(async (panel) => {
            const design = panel.executionPdf.design;
            const assignments = design.assignments || {};
            const fileIds = [
              ...new Set(
                [
                  assignments.page2,
                  assignments.page3,
                  assignments.page4,
                  ...(assignments.gallery || []),
                ]
                  .filter(Boolean)
                  .map(String),
              ),
            ];
            const objectUrls = [];
            try {
              const imageEntries = await Promise.all(
                fileIds.map(async (fileId) => {
                  const { data } = await getClientExecutionPdfFile(
                    key,
                    panelKey(panel),
                    fileId,
                  );
                  const objectUrl = URL.createObjectURL(data);
                  objectUrls.push(objectUrl);
                  return [fileId, objectUrl];
                }),
              );
              const pdf = await createExecutionPdf({
                ...design,
                images: Object.fromEntries(imageEntries),
              });
              const loadedDocument = await getDocument({
                data: new Uint8Array(await pdf.arrayBuffer()),
              }).promise;
              return [panelKey(panel), loadedDocument];
            } finally {
              objectUrls.forEach((url) => URL.revokeObjectURL(url));
            }
          }),
        );
        const loadedEntries = results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);
        const loadedDocuments = Object.fromEntries(loadedEntries);
        if (!active)
          return Object.values(loadedDocuments).forEach(safeDestroyPdf);
        documentsRef.current.executions = loadedDocuments;
        setExecutionDocuments(loadedDocuments);
        const firstLoadedPanelId = loadedEntries[0]?.[0] || "";
        if (firstLoadedPanelId)
          setSelectedPanelId((current) => current || firstLoadedPanelId);
        const firstFailure = results.find(
          (result) => result.status === "rejected",
        );
        const executionError = firstFailure
          ? await executionLoadErrorMessage(firstFailure.reason)
          : "";
        setState((current) => ({ ...current, executionError }));
      } catch (error) {
        const executionError = await executionLoadErrorMessage(error);
        if (active) setState((current) => ({ ...current, executionError }));
      } finally {
        if (active)
          setState((current) => ({ ...current, executionLoading: false }));
      }
    };
    preloadExecutionPdfs();
    return () => {
      active = false;
    };
  }, [executionPanels, key]);

  useEffect(
    () => () => {
      window.clearTimeout(executionNoticeTimerRef.current);
      safeDestroyPdf(documentsRef.current.quote);
      Object.values(documentsRef.current.executions).forEach(safeDestroyPdf);
    },
    [],
  );

  if (state.loading)
    return (
      <main className="client-preview-state" dir="rtl">
        <div>
          <span className="client-preview-spinner" />
          <h1>جاري تجهيز معاينة المشروع…</h1>
          <p>يرجى الانتظار لحظات.</p>
        </div>
      </main>
    );
  if (state.error && !quoteDocument)
    return (
      <main className="client-preview-state client-preview-error" dir="rtl">
        <div>
          <h1>تعذر فتح المعاينة</h1>
          <p>{state.error}</p>
        </div>
      </main>
    );

  return (
    <main
      className="client-project-preview"
      dir="rtl"
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="client-preview-header">
        <div>
          <strong>STARCO Panels</strong>
          <span>
            {activeDocument === "execution"
              ? "معاينة PDF التنفيذ"
              : "معاينة عرض السعر"}
          </span>
        </div>
        <p>للعرض فقط</p>
      </header>
      <section
        className="client-preview-document-controls"
        aria-label="اختيار المستند"
      >
        <button
          type="button"
          className={activeDocument === "quote" ? "active" : ""}
          onClick={() => {
            setActiveDocument("quote");
            setExecutionNotice("");
          }}
        >
          <strong>رؤية عرض السعر</strong>
          <span>المستند الأساسي للمشروع</span>
        </button>
        <button
          type="button"
          className={`${activeDocument === "execution" ? "active" : ""}${!selectedExecutionDocument ? " unavailable" : ""}`}
          onClick={openExecutionDocument}
          aria-disabled={!allPanels.length}
        >
          <strong>
            {state.executionLoading
              ? "جاري تجهيز PDF التنفيذ…"
              : "رؤية PDF التنفيذ"}
          </strong>
          <span>
            {selectedExecutionDocument
              ? "جاهز للعرض الفوري"
              : state.executionError
                ? "تعذر تحميله مؤقتًا"
                : selectedExecutionWasSkipped
                  ? "تم تخطيه لهذه اللوحة"
                  : selectedExecutionWasRequested
                    ? "قيد التجهيز لهذه اللوحة"
                    : "لم يتم طلبه لهذه اللوحة"}
          </span>
        </button>
        {activeDocument === "execution" && allPanels.length > 1 && (
          <section
            className="client-execution-panel-switcher"
            aria-label="لوحات PDF التنفيذ"
          >
            <header>
              <div>
                <strong>لوحات التنفيذ</strong>
                <span>اختر اللوحة لعرض ملفها فورًا</span>
              </div>
              <bdi dir="ltr">
                {Math.max(
                  1,
                  allPanels.findIndex(
                    (panel) => panelKey(panel) === String(selectedPanelId),
                  ) + 1,
                )}{" "}
                / {allPanels.length}
              </bdi>
            </header>
            <div className="client-execution-panel-track">
              {allPanels.map((panel, index) => {
                const id = panelKey(panel);
                const selected = id === String(selectedPanelId);
                const documentReady = Boolean(executionDocuments[id]);
                const requested = Boolean(
                  panel.executionPdf?.status &&
                  panel.executionPdf.status !== "notRequested",
                );
                const statusText = documentReady
                  ? "جاهز"
                  : panel.executionPdf?.skipped
                    ? "تم التخطي"
                    : requested
                      ? "قيد التجهيز"
                      : "لم يتم الطلب";
                return (
                  <button
                    type="button"
                    key={id}
                    className={`${selected ? "is-active" : ""}${documentReady ? " is-ready" : " is-unavailable"}`}
                    onClick={() => {
                      setSelectedPanelId(id);
                      setExecutionNotice("");
                    }}
                    aria-pressed={selected}
                  >
                    <span className="client-execution-panel-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="client-execution-panel-name">
                      <small>{statusText}</small>
                      <bdi
                        dir={getPanelNameDirection(
                          panel.panelName || panel.panelCode,
                        )}
                      >
                        {panel.panelName || panel.panelCode}
                      </bdi>
                    </span>
                    <span
                      className="client-execution-panel-indicator"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </section>
      {executionNotice && (
        <p className="client-preview-document-notice" role="status">
          {executionNotice}
        </p>
      )}
      {activeDocument === "execution" &&
        !selectedExecutionDocument &&
        !executionNotice && (
          <p className="client-preview-document-notice" role="status">
            {state.executionError || selectedExecutionStatusMessage}
          </p>
        )}
      {state.error && (
        <p className="client-preview-inline-error">{state.error}</p>
      )}
      <section
        className="client-preview-pdf"
        aria-label={
          activeDocument === "execution"
            ? "معاينة PDF التنفيذ"
            : "معاينة ملف عرض السعر STARCO"
        }
      >
        {Array.from(
          { length: displayedDocument?.numPages || 0 },
          (_, index) => (
            <PdfPage
              key={`${activeDocument}-${selectedPanelId}-${index + 1}`}
              pdfDocument={displayedDocument}
              pageNumber={index + 1}
              title={
                activeDocument === "execution" ? "PDF التنفيذ" : "عرض السعر"
              }
            />
          ),
        )}
      </section>
    </main>
  );
}

export default ClientProjectPreview;
