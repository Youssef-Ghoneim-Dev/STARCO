import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getClientProjectPreview, getClientProjectPreviewByKey } from "../services/projectsAPI";
import { createProjectPdf } from "../utils/projectPdf";
import "../styles/ClientProjectPreview.css";

function ClientProjectPreview() {
  const { id, previewKey } = useParams();
  const [searchParams] = useSearchParams();
  const [pdfUrl, setPdfUrl] = useState("");
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    let generatedPdfUrl = "";
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
        generatedPdfUrl = URL.createObjectURL(pdf);
        if (active) {
          setPdfUrl(generatedPdfUrl);
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
      if (generatedPdfUrl) URL.revokeObjectURL(generatedPdfUrl);
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
      <iframe src={pdfUrl} title="ملف عرض سعر STARCO" />
    </section>
  </main>;
}

export default ClientProjectPreview;
