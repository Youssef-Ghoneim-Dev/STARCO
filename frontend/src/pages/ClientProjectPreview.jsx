import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getClientExecutionPdfFile, getClientProjectPreview, getClientProjectPreviewByKey } from "../services/projectsAPI";
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
      if (!cancelled && error?.name !== "RenderingCancelledException") console.error("Could not render PDF page:", error);
    });
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pageNumber, pdfDocument]);
  return <canvas ref={canvasRef} aria-label={`صفحة ${pageNumber} من ${title}`} />;
}

const executionReadyStatuses = new Set(["ready", "confirmed"]);
const panelKey = (panel) => String(panel?.panelId || panel?._id || "");

function ClientProjectPreview() {
  const { id, previewKey } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [quoteDocument, setQuoteDocument] = useState(null);
  const [executionDocuments, setExecutionDocuments] = useState({});
  const [activeDocument, setActiveDocument] = useState("quote");
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [executionNotice, setExecutionNotice] = useState("");
  const [state, setState] = useState({ loading: true, executionLoading: false, error: "" });
  const documentsRef = useRef({ quote: null, executions: {} });
  const executionLoadKeyRef = useRef("");
  const executionNoticeTimerRef = useRef(null);
  const key = previewKey || searchParams.get("key") || "";
  const executionPanels = useMemo(() => (project?.panels || []).filter((panel) => (
    executionReadyStatuses.has(panel.executionPdf?.status)
    && !panel.executionPdf?.skipped
    && panel.executionPdf?.design?.assignments?.page2
  )), [project]);
  const selectedPanel = executionPanels.find((panel) => panelKey(panel) === String(selectedPanelId)) || executionPanels[0];
  const selectedExecutionDocument = executionDocuments[panelKey(selectedPanel)] || null;
  const displayedDocument = activeDocument === "execution" ? selectedExecutionDocument : quoteDocument;
  const executionWasRequested = (project?.panels || []).some((panel) => (
    panel.executionPdf?.status && panel.executionPdf.status !== "notRequested"
  ));
  const executionWasSkipped = (project?.panels || []).some((panel) => panel.executionPdf?.skipped);
  const showExecutionNotice = (message) => {
    window.clearTimeout(executionNoticeTimerRef.current);
    setExecutionNotice(message);
    executionNoticeTimerRef.current = window.setTimeout(() => setExecutionNotice(""), 3000);
  };
  const openExecutionDocument = () => {
    if (!executionWasRequested) {
      showExecutionNotice("لطلب ملف PDF التنفيذ، يرجى التواصل مع مسؤول المشروع.");
      return;
    }
    if (executionWasSkipped && !executionPanels.length) {
      showExecutionNotice("لا يتوفر ملف PDF تنفيذ لهذا المشروع. يرجى التواصل مع مسؤول المشروع.");
      return;
    }
    if (!executionPanels.length || state.executionLoading || !selectedExecutionDocument) {
      showExecutionNotice("ملف PDF التنفيذ قيد التجهيز، وسيظهر هنا بمجرد اعتماده.");
      return;
    }
    setExecutionNotice("");
    setActiveDocument("execution");
  };

  useEffect(() => {
    let active = true;
    let loadingTask;
    let loadedDocument;
    const loadPreview = async () => {
      if (!key) return active && setState({ loading: false, executionLoading: false, error: "رابط المعاينة غير مكتمل." });
      try {
        const response = previewKey ? await getClientProjectPreviewByKey(previewKey) : await getClientProjectPreview(id, key);
        const { project: loadedProject, copperConfiguration } = response.data || {};
        const pdf = await createProjectPdf({ project: loadedProject, prices: loadedProject?.prices || {}, copperConfiguration });
        loadingTask = getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) });
        loadedDocument = await loadingTask.promise;
        if (!active) return safeDestroyPdf(loadedDocument);
        documentsRef.current.quote = loadedDocument;
        setProject(loadedProject);
        setQuoteDocument(loadedDocument);
        setState({ loading: false, executionLoading: false, error: "" });
      } catch (error) {
        if (active) setState({ loading: false, executionLoading: false, error: error.response?.data?.message || "تعذر فتح معاينة المشروع." });
      }
    };
    loadPreview();
    return () => { active = false; if (!loadedDocument && typeof loadingTask?.destroy === "function") loadingTask.destroy(); };
  }, [id, key, previewKey]);

  useEffect(() => {
    if (executionPanels.length && !selectedPanelId) setSelectedPanelId(panelKey(executionPanels[0]));
  }, [executionPanels, selectedPanelId]);

  useEffect(() => {
    if (!key || !executionPanels.length) return undefined;
    const loadKey = `${key}:${executionPanels.map((panel) => panelKey(panel)).join(",")}`;
    if (executionLoadKeyRef.current === loadKey) return undefined;
    executionLoadKeyRef.current = loadKey;
    let active = true;
    setState((current) => ({ ...current, executionLoading: true, error: "" }));

    const preloadExecutionPdfs = async () => {
      try {
        const loadedEntries = await Promise.all(executionPanels.map(async (panel) => {
          const design = panel.executionPdf.design;
          const assignments = design.assignments || {};
          const fileIds = [...new Set([assignments.page2, assignments.page3, assignments.page4, ...(assignments.gallery || [])].filter(Boolean).map(String))];
          const objectUrls = [];
          try {
            const imageEntries = await Promise.all(fileIds.map(async (fileId) => {
              const { data } = await getClientExecutionPdfFile(key, panelKey(panel), fileId);
              const objectUrl = URL.createObjectURL(data);
              objectUrls.push(objectUrl);
              return [fileId, objectUrl];
            }));
            const pdf = await createExecutionPdf({ ...design, images: Object.fromEntries(imageEntries) });
            const loadedDocument = await getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise;
            return [panelKey(panel), loadedDocument];
          } finally {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
          }
        }));
        const loadedDocuments = Object.fromEntries(loadedEntries);
        if (!active) return Object.values(loadedDocuments).forEach(safeDestroyPdf);
        documentsRef.current.executions = loadedDocuments;
        setExecutionDocuments(loadedDocuments);
      } catch (error) {
        if (active) setState((current) => ({ ...current, error: error.response?.data?.message || error.message || "تعذر تجهيز PDF التنفيذ." }));
      } finally {
        if (active) setState((current) => ({ ...current, executionLoading: false }));
      }
    };
    preloadExecutionPdfs();
    return () => { active = false; };
  }, [executionPanels, key]);

  useEffect(() => () => {
    window.clearTimeout(executionNoticeTimerRef.current);
    safeDestroyPdf(documentsRef.current.quote);
    Object.values(documentsRef.current.executions).forEach(safeDestroyPdf);
  }, []);

  if (state.loading) return <main className="client-preview-state" dir="rtl"><div><span className="client-preview-spinner" /><h1>جاري تجهيز معاينة المشروع…</h1><p>يرجى الانتظار لحظات.</p></div></main>;
  if (state.error && !quoteDocument) return <main className="client-preview-state client-preview-error" dir="rtl"><div><h1>تعذر فتح المعاينة</h1><p>{state.error}</p></div></main>;

  return <main className="client-project-preview" dir="rtl" onContextMenu={(event) => event.preventDefault()}>
    <header className="client-preview-header">
      <div><strong>STARCO Panels</strong><span>{activeDocument === "execution" ? "معاينة PDF التنفيذ" : "معاينة عرض السعر"}</span></div>
      <p>للعرض فقط</p>
    </header>
    <section className="client-preview-document-controls" aria-label="اختيار المستند">
      <button type="button" className={activeDocument === "quote" ? "active" : ""} onClick={() => { setActiveDocument("quote"); setExecutionNotice(""); }}><strong>رؤية عرض السعر</strong><span>المستند الأساسي للمشروع</span></button>
      <button type="button" className={`${activeDocument === "execution" ? "active" : ""}${!selectedExecutionDocument ? " unavailable" : ""}`} onClick={openExecutionDocument} aria-disabled={!selectedExecutionDocument}><strong>{state.executionLoading ? "جاري تجهيز PDF التنفيذ…" : "رؤية PDF التنفيذ"}</strong><span>{selectedExecutionDocument ? "جاهز للعرض الفوري" : executionWasRequested ? "قيد التجهيز" : "لم يتم طلبه بعد"}</span></button>
      {activeDocument === "execution" && executionPanels.length > 1 && <section className="client-execution-panel-switcher" aria-label="لوحات PDF التنفيذ">
        <header>
          <div><strong>لوحات التنفيذ</strong><span>اختر اللوحة لعرض ملفها فورًا</span></div>
          <bdi dir="ltr">{Math.max(1, executionPanels.findIndex((panel) => panelKey(panel) === String(selectedPanelId)) + 1)} / {executionPanels.length}</bdi>
        </header>
        <div className="client-execution-panel-track">
          {executionPanels.map((panel, index) => {
            const id = panelKey(panel);
            const selected = id === String(selectedPanelId);
            return <button type="button" key={id} className={selected ? "is-active" : ""} onClick={() => setSelectedPanelId(id)} aria-pressed={selected}>
              <span className="client-execution-panel-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="client-execution-panel-name"><small>لوحة التنفيذ</small><bdi dir={getPanelNameDirection(panel.panelName || panel.panelCode)}>{panel.panelName || panel.panelCode}</bdi></span>
              <span className="client-execution-panel-indicator" aria-hidden="true" />
            </button>;
          })}
        </div>
      </section>}
    </section>
    {executionNotice && <p className="client-preview-document-notice" role="status">{executionNotice}</p>}
    {state.error && <p className="client-preview-inline-error">{state.error}</p>}
    <section className="client-preview-pdf" aria-label={activeDocument === "execution" ? "معاينة PDF التنفيذ" : "معاينة ملف عرض السعر STARCO"}>
      {Array.from({ length: displayedDocument?.numPages || 0 }, (_, index) => <PdfPage key={`${activeDocument}-${selectedPanelId}-${index + 1}`} pdfDocument={displayedDocument} pageNumber={index + 1} title={activeDocument === "execution" ? "PDF التنفيذ" : "عرض السعر"} />)}
    </section>
  </main>;
}

export default ClientProjectPreview;
