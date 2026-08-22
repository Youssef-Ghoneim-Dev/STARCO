import { useEffect, useState, useRef } from "react";
import { useProject } from "../../../context/ProjectContext";
import { searchClients } from "../../../services/clientsAPI";
import StyledSelect from "../../common/StyledSelect";

function ProjectInfo() {
  const { project, updateClient } = useProject();
  const [clientQuery, setClientQuery] = useState(project.client.name || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [similarClient, setSimilarClient] = useState(null);
  const [similarClientDismissed, setSimilarClientDismissed] = useState(false);
  const containerRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    setClientQuery(project.client.name || "");
  }, [project.client.name]);

  useEffect(() => {
    const requestId = ++searchRequestRef.current;
    const term = clientQuery.trim();
    if (!isSearchActive || !term) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await searchClients(term);
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(data.clients || []);
        setSearchError(null);
      } catch (error) {
        if (requestId !== searchRequestRef.current) return;
        setSearchResults([]);
        const status = error?.response?.status;
        if (status === 403) {
          setSearchError("غير مصرح بالبحث. يرجى تسجيل الدخول.");
        } else if (status >= 500) {
          setSearchError("خطأ في الخادم أثناء البحث. حاول لاحقًا.");
        } else {
          setSearchError("فشل البحث عن العملاء.");
        }
      } finally {
        if (requestId === searchRequestRef.current) {
          setSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [clientQuery, isSearchActive]);

  useEffect(() => {
    if (project.source !== "whatsapp" || !project.client.name?.trim() || similarClientDismissed) return;
    const timeout = setTimeout(async () => {
      try {
        const { data } = await searchClients(project.client.name.trim());
        const candidate = (data.clients || []).find((client) => client.name !== project.client.name);
        setSimilarClient(candidate || null);
      } catch { setSimilarClient(null); }
    }, 350);
    return () => clearTimeout(timeout);
  }, [project.source, project.client.name, similarClientDismissed]);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setSearchResults([]);
        setSearchError(null);
        setIsSearchActive(false);
      }
    };

    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const handleSelectClient = (client) => {
    setIsSearchActive(false);
    updateClient({
      name: client.name,
      type: client.type,
      profitPercentage: client.profitPercentage,
    });
    setClientQuery(client.name);
    setSearchResults([]);
    setSearchError(null);
  };

  return (
    <section className="project-editor-card">
      <div className="project-info-grid" ref={containerRef}>
        <div className="project-field">
          <label>اسم العميل</label>

          <input
            type="text"
            placeholder="ابحث عن اسم العميل..."
            value={clientQuery}
            onFocus={() => setIsSearchActive(true)}
            onChange={(e) => {
              setIsSearchActive(true);
              setClientQuery(e.target.value);
              updateClient({ name: e.target.value });
            }}
          />
          {isSearchActive &&
            (searching || searchResults.length > 0 || searchError) && (
            <div className="client-suggestions">
              {searching && <p className="search-loading">جاري البحث...</p>}
              {searchResults.map((client) => (
                <button
                  key={client.name}
                  type="button"
                  className="suggestion-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectClient(client);
                  }}
                >
                  {client.name} — {client.type}
                </button>
              ))}
              {searchError && <p className="search-error">{searchError}</p>}
            </div>
          )}
        </div>

        <div className="project-field">
          <label>نوع العميل</label>

          <StyledSelect value={project.client.type} onChange={(value) => updateClient({ type: value })} options={[{ value: "person", label: "فرد" }, { value: "company", label: "شركة" }]} />
        </div>
      </div>

      <div className="profit-section">
        <label>السعر بالنسبة (هامش الربح)</label>

        <div className="profit-grid">
          {[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((item) => (
            <button
              key={item}
              type="button"
              className={
                project.client.profitPercentage === item
                  ? "profit-btn active"
                  : "profit-btn"
              }
              onClick={() => updateClient({ profitPercentage: item })}
            >
              {item}%
            </button>
          ))}
        </div>
      </div>
      {similarClient && (
        <aside className="client-match-card">
          <p>هل العميل المكتوب من المندوب «{project.client.name}» هو نفسه العميل الموجود «{similarClient.name}»؟</p>
          <div><button type="button" onClick={() => { handleSelectClient(similarClient); setSimilarClient(null); }}>نعم، هو نفسه</button><button type="button" onClick={() => { setSimilarClientDismissed(true); setSimilarClient(null); }}>لا، عميل مختلف</button></div>
        </aside>
      )}
    </section>
  );
}

export default ProjectInfo;
