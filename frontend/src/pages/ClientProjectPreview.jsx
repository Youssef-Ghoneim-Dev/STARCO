import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getClientProjectPreview } from "../services/projectsAPI";
import { createProjectPreviewImages } from "../utils/projectPdf";
import "../styles/ClientProjectPreview.css";

function ClientProjectPreview() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [previewPages, setPreviewPages] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    const loadPreview = async () => {
      const key = searchParams.get("key");
      if (!key) {
        if (active) setState({ loading: false, error: "رابط المعاينة غير مكتمل." });
        return;
      }

      try {
        const response = await getClientProjectPreview(id, key);
        const { project, copperConfiguration } = response.data || {};
        const pages = await createProjectPreviewImages({
          project,
          prices: project?.prices || {},
          copperConfiguration,
        });
        if (active) {
          setPreviewPages(pages);
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
    };
  }, [id, searchParams]);

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
    <section className="client-preview-pages" aria-label="معاينة عرض سعر STARCO">
      {previewPages.map((page, index) => (
        <img key={index} src={page} alt={`صفحة ${index + 1} من عرض السعر`} draggable="false" />
      ))}
    </section>
  </main>;
}

export default ClientProjectPreview;
