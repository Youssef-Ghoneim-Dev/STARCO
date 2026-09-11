import { useMemo, useState } from "react";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import StyledSelect from "../common/StyledSelect";
import { createLinkedAccount } from "../../services/linkedAccountsAPI";
import { OPERATIONAL_ROLE_ORDER, OWNER_CREATABLE_ROLE_ORDER, rolesToOptions } from "../../utils/roles";

const roleOptions = {
  OwnerManager: rolesToOptions(OWNER_CREATABLE_ROLE_ORDER),
  MarketingManager: rolesToOptions(OPERATIONAL_ROLE_ORDER),
  ProductionManager: rolesToOptions(OPERATIONAL_ROLE_ORDER),
};

function AddAccountModal({ currentUser, onClose, onCreated }) {
  const options = useMemo(() => roleOptions[currentUser?.role] || [], [currentUser?.role]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: options[0]?.value || "" });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const needsApproval = currentUser?.role === "ProductionManager" && form.role === "Marketer";

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await createLinkedAccount(form);
      onCreated(data.account);
      toast.success(data.message || "تم إنشاء الحساب.");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "تعذر إنشاء الحساب.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="account-modal-backdrop" role="dialog" aria-modal="true" dir="rtl">
    <section className="account-modal">
      <header><div><span>حساب إضافي</span><h2>إنشاء حساب جديد</h2><p>سجّل حسابًا مرتبطًا يمكنك التبديل إليه بأمان، بدون رقم WhatsApp.</p></div><button type="button" onClick={onClose} aria-label="إغلاق"><HiOutlineX /></button></header>
      <form onSubmit={submit}>
        <label>الاسم<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required minLength="3" maxLength="50" /></label>
        <label>البريد الإلكتروني<input type="email" dir="ltr" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required autoComplete="off" /></label>
        <label>كلمة المرور<div className="account-password-field"><input type={showPassword ? "text" : "password"} dir="ltr" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required minLength="8" maxLength="15" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}</button></div></label>
        <label>الدور<StyledSelect value={form.role} options={options} onChange={(role) => setForm((current) => ({ ...current, role }))} ariaLabel="اختيار دور الحساب" /></label>
        <p className={`account-approval-note${needsApproval ? " is-pending" : ""}`}>{needsApproval ? "حساب Marketer سيحتاج موافقة Owner Manager أو Marketing Manager قبل استخدامه." : "سيتم تفعيل الحساب مباشرة، ولن يحتاج إلى رقم أو تفعيل WhatsApp."}</p>
        <button type="submit" disabled={saving || !form.role}>{saving ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}</button>
      </form>
    </section>
  </div>;
}

export default AddAccountModal;
