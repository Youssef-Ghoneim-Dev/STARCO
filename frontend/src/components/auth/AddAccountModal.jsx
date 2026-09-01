import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { FaGoogle } from "react-icons/fa";
import { HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import { googleLogin, login } from "../../services/authApi";
import { saveAccountSession } from "../../utils/accountSessions";

function AddAccountModal({ currentUser, onClose }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const finish = (response) => {
    const token = response.headers["x-auth-token"] || response.data?.token;
    const account = response.data?.user;
    if (!token || !account) throw new Error("لم تصل بيانات الحساب كاملة من الخادم.");
    if (String(account.id) === String(currentUser?.id)) {
      toast("هذا هو الحساب المفتوح حاليًا.");
      return;
    }
    saveAccountSession(account, token);
    localStorage.setItem("token", token);
    toast.success("تمت إضافة الحساب والتبديل إليه.");
    window.location.assign("/dashboard");
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    try { finish(await login(formData)); }
    catch (error) { toast.error(error?.response?.data?.message || error.message || "تعذر إضافة الحساب."); }
    finally { setLoading(false); }
  };

  const submitGoogle = async (credentialResponse) => {
    setLoading(true);
    try { finish(await googleLogin({ credential: credentialResponse.credential })); }
    catch (error) { toast.error(error?.response?.data?.message || "هذا الحساب غير مسجل عبر Google."); }
    finally { setLoading(false); }
  };

  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="add-account-title" dir="rtl">
      <header><div><span>حساب إضافي</span><h2 id="add-account-title">تسجيل الدخول بحساب آخر</h2><p>سيظل حسابك الحالي محفوظًا لتستطيع التبديل بينهما.</p></div><button type="button" onClick={onClose} aria-label="إغلاق"><HiOutlineX /></button></header>
      <form onSubmit={submitPassword}>
        <label>البريد الإلكتروني<input type="email" autoComplete="username" required value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} /></label>
        <label>كلمة المرور<input type="password" autoComplete="current-password" required value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} /></label>
        <button type="submit" disabled={loading}>{loading ? "جاري تسجيل الدخول..." : "إضافة الحساب"}</button>
      </form>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && <div className="account-modal-google"><span>أو</span><div><span className="account-google-visual"><FaGoogle /> تسجيل الدخول باستخدام Google</span><GoogleLogin onSuccess={submitGoogle} onError={() => toast.error("تعذر الاتصال بـ Google.")} text="signin_with" theme="outline" shape="pill" size="large" width="320" /></div></div>}
    </section>
  </div>;
}

export default AddAccountModal;
