import { useEffect, useMemo, useState } from "react";
import { HiOutlinePencilAlt, HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import StyledSelect from "../components/common/StyledSelect";
import { createClient, deleteClient, findSimilarClients, getAllClients, updateClient } from "../services/clientsAPI";
import { matchesSearchText } from "../utils/textSearch";
import "../styles/management.css";

const blankClient = { name: "", type: "person", profitPercentage: 15 };

function Clients() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(blankClient);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [clientToDelete, setClientToDelete] = useState(null);
  const [nameReview, setNameReview] = useState(null);

  useEffect(() => {
    getAllClients()
      .then(({ data }) => setClients(data.clients || []))
      .catch((error) => toast.error(error?.response?.data?.message || "تعذر تحميل العملاء."))
      .finally(() => setLoading(false));
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => matchesSearchText(client.name, query));
  }, [clients, query]);

  const openForm = (client = null) => {
    setEditingClient(client);
    setForm(client ? { name: client.name, type: client.type, profitPercentage: client.profitPercentage } : blankClient);
    setIsFormOpen(true);
  };

  const removeClient = async () => {
    if (!clientToDelete) return;
    setDeletingId(clientToDelete._id);
    try {
      await deleteClient(clientToDelete._id);
      setClients((current) => current.filter((client) => client._id !== clientToDelete._id));
      setClientToDelete(null);
      toast.success("تم حذف العميل.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حذف العميل.");
    } finally { setDeletingId(""); }
  };

  const closeForm = () => {
    setEditingClient(null);
    setForm(blankClient);
    setIsFormOpen(false);
  };

  const persistNewClient = async (payload) => {
    const { data } = await createClient(payload);
    setClients((current) => [...current, data.client].sort((a, b) => a.name.localeCompare(b.name, "ar")));
    toast.success("تمت إضافة العميل.");
    closeForm();
  };

  const createDespiteSimilarNames = async () => {
    if (!nameReview) return;
    setSaving(true);
    try {
      await persistNewClient(nameReview.payload);
      setNameReview(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حفظ العميل.");
    } finally {
      setSaving(false);
    }
  };

  const linkToExistingClient = (client) => {
    setNameReview(null);
    closeForm();
    setQuery(client.name);
    toast.success(`تم اختيار سجل العميل «${client.name}» الحالي.`);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form, profitPercentage: Number(form.profitPercentage) };
    try {
      if (editingClient) {
        const { data } = await updateClient(editingClient._id, payload);
        setClients((current) => current.map((client) => client._id === editingClient._id ? (data.client || { ...client, ...payload }) : client));
        toast.success("تم تعديل العميل.");
      } else {
        const { data } = await findSimilarClients(payload.name);
        const candidates = data.candidates || [];
        if (candidates.length > 0) {
          setNameReview({ payload, candidates });
          setIsFormOpen(false);
          return;
        }
        await persistNewClient(payload);
        return;
      }
      closeForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حفظ العميل.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout notAllowed>
      <section className="management-page" dir="rtl">
        <div className="management-heading management-heading-actions">
          <div>
            <h1>العملاء</h1>
            <p>أضف بيانات العملاء وعدّلها في أي وقت.</p>
          </div>
          <button type="button" className="management-primary-btn" onClick={() => openForm()}>
            <HiOutlinePlus /> إضافة عميل
          </button>
        </div>

        <label className="management-search">
          <HiOutlineSearch />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم العميل..." />
        </label>

        {loading ? <p className="management-empty">جاري التحميل...</p> : filteredClients.length === 0 ? (
          <p className="management-empty">لا يوجد عملاء مطابقون للبحث.</p>
        ) : (
          <div className="management-list">
            {filteredClients.map((client) => (
              <article className="management-row" key={client._id}>
                <div>
                  <h2>{client.name}</h2>
                  <p>{client.type === "company" ? "شركة" : "فرد"} · نسبة الربح: {client.profitPercentage}%</p>
                </div>
                <div className="recycle-bin-actions"><button type="button" onClick={() => openForm(client)}><HiOutlinePencilAlt /> تعديل</button><button type="button" className="permanent-delete-btn" onClick={() => setClientToDelete(client)}><HiOutlineTrash /> حذف</button></div>
              </article>
            ))}
          </div>
        )}

        {isFormOpen && (
          <div className="management-modal-backdrop" role="presentation" onMouseDown={closeForm}>
            <form className="management-modal" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
              <div className="management-modal-heading">
                <h2>{editingClient ? "تعديل عميل" : "إضافة عميل"}</h2>
                <button type="button" className="management-icon-btn" onClick={closeForm} aria-label="إغلاق"><HiOutlineX /></button>
              </div>
              <label>الاسم<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label>النوع<StyledSelect value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value }))} options={[{ value: "person", label: "فرد" }, { value: "company", label: "شركة" }]} /></label>
              <label>نسبة الربح<input type="number" min="10" max="70" value={form.profitPercentage} onChange={(event) => setForm((current) => ({ ...current, profitPercentage: event.target.value }))} required /></label>
              <button className="management-primary-btn" type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</button>
            </form>
          </div>
        )}
        {nameReview && (
          <div className="management-modal-backdrop" role="dialog" aria-modal="true">
            <div className="management-modal client-name-review">
              <div className="management-modal-heading">
                <h2>مراجعة اسم العميل</h2>
                <button type="button" className="management-icon-btn" onClick={() => { setNameReview(null); setIsFormOpen(true); }} aria-label="إغلاق"><HiOutlineX /></button>
              </div>
              <p className="client-name-review-intro">الاسم الجديد: <strong>{nameReview.payload.name}</strong></p>
              <p className="client-name-review-hint">وجدنا سجلات قد تكون لنفس العميل. اختر السجل الصحيح أو أنشئ عميلاً جديدًا؛ القرار لك.</p>
              <div className="client-name-review-list">
                {nameReview.candidates.map((client) => (
                  <article className="client-name-review-card" key={client._id}>
                    <div>
                      <h3>{client.name}</h3>
                      <p>{client.type === "company" ? "شركة" : "فرد"} · نسبة الربح: {client.profitPercentage}%</p>
                      <span>نسبة التشابه: {client.similarity}%</span>
                    </div>
                    <button type="button" className="management-secondary-btn" onClick={() => linkToExistingClient(client)}>ربط بالسجل الحالي</button>
                  </article>
                ))}
              </div>
              <div className="management-confirmation-actions client-name-review-actions">
                <button type="button" className="management-cancel-btn" onClick={() => { setNameReview(null); setIsFormOpen(true); }} disabled={saving}>رجوع للتعديل</button>
                <button type="button" className="management-primary-btn" onClick={createDespiteSimilarNames} disabled={saving}>{saving ? "جاري الإنشاء..." : "إنشاء عميل جديد"}</button>
              </div>
            </div>
          </div>
        )}
        {clientToDelete && <div className="management-modal-backdrop" role="dialog" aria-modal="true"><div className="management-modal delete-project-confirmation"><div className="management-modal-heading"><h2>حذف العميل</h2></div><p>سيتم حذف العميل <strong>{clientToDelete.name}</strong> من قائمة العملاء. المشاريع المحفوظة لن تتأثر.</p><div className="management-confirmation-actions"><button type="button" className="management-cancel-btn" onClick={() => setClientToDelete(null)} disabled={Boolean(deletingId)}>إلغاء</button><button type="button" className="permanent-delete-btn" onClick={removeClient} disabled={Boolean(deletingId)}>{deletingId ? "جاري الحذف..." : "حذف العميل"}</button></div></div></div>}
      </section>
    </DashboardLayout>
  );
}

export default Clients;
