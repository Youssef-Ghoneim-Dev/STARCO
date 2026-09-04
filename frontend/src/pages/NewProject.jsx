import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import { createProject } from "../services/projectsAPI";
import { searchClients } from "../services/clientsAPI";

function NewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const requestRef = useRef(0);
  const nameInputRef = useRef(null);
  useEffect(() => {
    const term = name.trim(); const requestId = ++requestRef.current;
    if (!term || selectedClient?.name === term) { setResults([]); return undefined; }
    const timer = setTimeout(async () => { setSearching(true); try { const { data } = await searchClients(term); if (requestId === requestRef.current) setResults(data.clients || []); } catch { if (requestId === requestRef.current) setResults([]); } finally { if (requestId === requestRef.current) setSearching(false); } }, 250);
    return () => clearTimeout(timer);
  }, [name, selectedClient]);
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setNameError("يجب إدخال اسم العميل أو اختيار عميل موجود أولًا.");
      nameInputRef.current?.focus();
      return;
    }
    setNameError("");
    setSaving(true);
    try {
      const client = selectedClient && selectedClient.name === name.trim() ? { id: selectedClient._id, name: selectedClient.name, type: selectedClient.type, profitPercentage: selectedClient.profitPercentage } : { name: name.trim() };
      const { data } = await createProject({ client }); navigate(`/projects/${data.project._id}`, { replace: true });
    } catch (error) {
      if (error.response?.status === 400) {
        setNameError(error.response?.data?.message || "تحقق من اسم العميل.");
        nameInputRef.current?.focus();
      } else toast.error(error.response?.data?.message || "تعذر إنشاء المشروع.");
    } finally { setSaving(false); }
  };
  return <DashboardLayout notAllowed={false} contentClassName="project-create-content"><div className="project-create-backdrop" dir="rtl"><form className="project-create-dialog" onSubmit={submit}>
    <h1>مشروع جديد</h1><p>أنشئ فولدر المشروع أولًا، ثم أضف اللوحات داخله.</p>
    <label>اسم العميل<input ref={nameInputRef} autoFocus value={name} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "new-project-client-error" : undefined} onChange={(event) => { setName(event.target.value); setSelectedClient(null); if (nameError) setNameError(""); }} placeholder="ابحث باسم العميل أو اكتب اسمًا جديدًا" />{nameError && <small id="new-project-client-error" className="form-field-error">{nameError}</small>}</label>
    {(searching || results.length > 0) && <div className="project-client-results">{searching && <span>جاري البحث...</span>}{results.map((client) => <button type="button" key={client._id} onClick={() => { setSelectedClient(client); setName(client.name); setNameError(""); setResults([]); }}>{client.name}<small>{client.type === "company" ? "شركة" : "فرد"}</small></button>)}</div>}
    <div className="project-create-actions"><button type="button" onClick={() => navigate("/projects")}>إلغاء</button><button className="primary" disabled={saving}>{saving ? "جاري الإنشاء..." : "إنشاء المشروع"}</button></div>
  </form></div></DashboardLayout>;
}
export default NewProject;
