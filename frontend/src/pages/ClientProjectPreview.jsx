import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getClientProjectPreview, getClientProjectPreviewByKey } from "../services/projectsAPI";
import { createProjectPdf } from "../utils/projectPdf";
import "../styles/ClientProjectPreview.css";

GlobalWorkerOptions.workerSrc = pdfWorker;

function PdfPage({ pdfDocument, pageNumber }) {
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
      if (!cancelled && error?.name !== "RenderingCancelledException") {
        console.error("Could not render PDF page:", error);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument]);

  return <canvas ref={canvasRef} aria-label={`صفحة ${pageNumber} من ملف عرض السعر`} />;
}

function ClientProjectPreview() {
  const { id, previewKey } = useParams();
  const [searchParams] = useSearchParams();
  const [pdfDocument, setPdfDocument] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    let loadingTask;
    let loadedDocument;
    const loadPreview = async () => {
      const key = previewKey || searchParams.get("key");
      if (!key) {
        if (active) setState({ loading: false, error: "رابط المعاينة غير مكتمل." });
        return;
      }

      try {
        const response = previewKey
          ? await getClientProjectPreviewByKey(previewKey)
          : await getClientProjectPreview(id, key);
        const { project, copperConfiguration } = response.data || {};
        const pdf = await createProjectPdf({
          project,
          prices: project?.prices || {},
          copperConfiguration,
        });
        loadingTask = getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) });
        loadedDocument = await loadingTask.promise;
        if (active) {
          setPdfDocument(loadedDocument);
          setState({ loading: false, error: "" });
        }
      } catch (error) {
        if (active) {
          setState({
            loading: false,
            error: error.response?.data?.message || "تعذر فتح معاينة المشروع.",
          });
        }
      }
    };

    loadPreview();
    return () => {
      active = false;
      if (!loadedDocument) loadingTask?.destroy();
      loadedDocument?.destroy();
    };
  }, [id, previewKey, searchParams]);

  if (state.loading) {
    return <main className="client-preview-state" dir="rtl"><div><span className="client-preview-spinner" /><h1>جاري تجهيز معاينة المشروع…</h1><p>يرجى الانتظار لحظات.</p></div></main>;
  }

  if (state.error) {
    return <main className="client-preview-state client-preview-error" dir="rtl"><div><h1>تعذر فتح المعاينة</h1><p>{state.error}</p></div></main>;
  }

  return <main className="client-project-preview" dir="rtl" onContextMenu={(event) => event.preventDefault()}>
    <header className="client-preview-header">
      <div><strong>STARCO Panels</strong><span>معاينة عرض السعر</span></div>
      <p>للعرض فقط</p>
    </header>
    <section className="client-preview-pdf" aria-label="معاينة ملف عرض سعر STARCO">
      {Array.from({ length: pdfDocument?.numPages || 0 }, (_, index) => (
        <PdfPage key={index + 1} pdfDocument={pdfDocument} pageNumber={index + 1} />
      ))}
    </section>
  </main>;
}

export default ClientProjectPreview;
