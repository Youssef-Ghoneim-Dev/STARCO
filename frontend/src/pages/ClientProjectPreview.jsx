import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getClientExecutionPdfFile, getClientProjectPreview, getClientProjectPreviewByKey } from "../services/projectsAPI";
import { createExecutionPdf } from "../utils/executionPdf";
import { createProjectPdf } from "../utils/projectPdf";
import "../styles/ClientProjectPreview.css";

GlobalWorkerOptions.workerSrc = pdfWorker;

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

function ClientProjectPreview() {
  const { id, previewKey } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [quoteDocument, setQuoteDocument] = useState(null);
  const [executionDocument, setExecutionDocument] = useState(null);
  const [activeDocument, setActiveDocument] = useState("quote");
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [state, setState] = useState({ loading: true, executionLoading: false, error: "" });
  const key = previewKey || searchParams.get("key") || "";
  const executionPanels = useMemo(() => (project?.panels || []).filter((panel) => (
    executionReadyStatuses.has(panel.executionPdf?.status)
    && !panel.executionPdf?.skipped
    && panel.executionPdf?.design?.assignments?.page2
  )), [project]);
  const selectedPanel = executionPanels.find((panel) => String(panel.panelId || panel._id) === String(selectedPanelId)) || executionPanels[0];
  const displayedDocument = activeDocument === "execution" ? executionDocument : quoteDocument;

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
        if (active) {
          setProject(loadedProject);
          setQuoteDocument(loadedDocument);
          setState({ loading: false, executionLoading: false, error: "" });
        }
      } catch (error) {
        if (active) setState({ loading: false, executionLoading: false, error: error.response?.data?.message || "تعذر فتح معاينة المشروع." });
      }
    };
    loadPreview();
    return () => { active = false; if (!loadedDocument) loadingTask?.destroy(); loadedDocument?.destroy(); };
  }, [id, key, previewKey]);

  useEffect(() => {
    if (executionPanels.length && !selectedPanelId) setSelectedPanelId(String(executionPanels[0].panelId || executionPanels[0]._id));
  }, [executionPanels, selectedPanelId]);

  useEffect(() => () => executionDocument?.destroy(), [executionDocument]);

  const showExecutionPdf = async () => {
    if (!selectedPanel || !key) return;
    setState((current) => ({ ...current, executionLoading: true, error: "" }));
    const objectUrls = [];
    try {
      const design = selectedPanel.executionPdf.design;
      const assignments = design.assignments || {};
      const fileIds = [...new Set([assignments.page2, assignments.page3, assignments.page4, ...(assignments.gallery || [])].filter(Boolean).map(String))];
      const images = {};
      for (const fileId of fileIds) {
        const { data } = await getClientExecutionPdfFile(key, selectedPanel.panelId || selectedPanel._id, fileId);
        const objectUrl = URL.createObjectURL(data);
        objectUrls.push(objectUrl);
        images[fileId] = objectUrl;
      }
      const pdf = await createExecutionPdf({ ...design, images });
      const loaded = await getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise;
      setExecutionDocument(loaded);
      setActiveDocument("execution");
    } catch (error) {
      setState((current) => ({ ...current, error: error.response?.data?.message || error.message || "تعذر إنشاء PDF التنفيذ." }));
    } finally {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      setState((current) => ({ ...current, executionLoading: false }));
    }
  };

  if (state.loading) return <main className="client-preview-state" dir="rtl"><div><span className="client-preview-spinner" /><h1>جاري تجهيز معاينة المشروع…</h1><p>يرجى الانتظار لحظات.</p></div></main>;
  if (state.error && !quoteDocument) return <main className="client-preview-state client-preview-error" dir="rtl"><div><h1>تعذر فتح المعاينة</h1><p>{state.error}</p></div></main>;

  return <main className="client-project-preview" dir="rtl" onContextMenu={(event) => event.preventDefault()}>
    <header className="client-preview-header">
      <div><strong>STARCO Panels</strong><span>{activeDocument === "execution" ? "معاينة PDF التنفيذ" : "معاينة عرض السعر"}</span></div>
      <p>للعرض فقط</p>
    </header>
    <section className="client-preview-document-controls" aria-label="اختيار المستند">
      <button type="button" className={activeDocument === "quote" ? "active" : ""} onClick={() => setActiveDocument("quote")}><strong>رؤية عرض السعر</strong><span>المستند الأساسي للمشروع</span></button>
      {executionPanels.length > 0 && <button type="button" className={activeDocument === "execution" ? "active" : ""} onClick={showExecutionPdf} disabled={state.executionLoading}><strong>{state.executionLoading ? "جاري تجهيز الملف…" : "رؤية PDF التنفيذ"}</strong><span>يُنشأ مباشرة من البيانات المحفوظة</span></button>}
      {executionPanels.length > 1 && <label>اللوحة<select value={selectedPanelId} onChange={(event) => { setSelectedPanelId(event.target.value); setExecutionDocument(null); setActiveDocument("quote"); }}>{executionPanels.map((panel) => <option key={panel.panelId || panel._id} value={panel.panelId || panel._id}>{panel.panelName || panel.panelCode}</option>)}</select></label>}
    </section>
    {state.error && <p className="client-preview-inline-error">{state.error}</p>}
    <section className="client-preview-pdf" aria-label={activeDocument === "execution" ? "معاينة PDF التنفيذ" : "معاينة ملف عرض السعر STARCO"}>
      {Array.from({ length: displayedDocument?.numPages || 0 }, (_, index) => <PdfPage key={`${activeDocument}-${index + 1}`} pdfDocument={displayedDocument} pageNumber={index + 1} title={activeDocument === "execution" ? "PDF التنفيذ" : "عرض السعر"} />)}
    </section>
  </main>;
}

export default ClientProjectPreview;
