import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/profileAPI";
import "../styles/profile.css";

const emptyProfile = { name: "", email: "", phoneNumber: "" };

function Profile() {
  const { user, reloadProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
    });
  }, [user]);

  const hasChanges =
    form.name !== (user?.name || "") ||
    form.email !== (user?.email || "") ||
    form.phoneNumber !== (user?.phoneNumber || "");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await updateProfile(form);
      await reloadProfile({ background: true });
      toast.success("تم حفظ بيانات الملف الشخصي.");
    } catch (error) {
      const message = error?.response?.data?.message;
      toast.error(typeof message === "string" ? message : "تعذر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout notAllowed>
      <section className="profile-page" dir="rtl">
        <div className="profile-heading">
          <h1>الملف الشخصي</h1>
          <p>حدّث بياناتك ورقم WhatsApp الذي يستقبل التنبيهات.</p>
        </div>

        <form className="profile-card" onSubmit={submit}>
          <div className="profile-avatar">{(user?.name || "U").trim().charAt(0)}</div>

          <label htmlFor="profile-name">الاسم</label>
          <input
            id="profile-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />

          <label htmlFor="profile-email">البريد الإلكتروني</label>
          <input
            id="profile-email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />

          <label htmlFor="profile-phone">رقم WhatsApp</label>
          <input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="201001234567"
            value={form.phoneNumber}
            onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
          />
          <p className="profile-help">اكتب الرقم بصيغة دولية، مثال: 201001234567.</p>

          <label htmlFor="profile-role">الدور</label>
          <input id="profile-role" value={user?.role || ""} readOnly />

          <div className="profile-actions">
            <button type="submit" disabled={saving || !hasChanges}>
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => navigate(-1)}
            >
              رجوع بدون حفظ
            </button>
          </div>
        </form>
      </section>
    </DashboardLayout>
  );
}

export default Profile;
