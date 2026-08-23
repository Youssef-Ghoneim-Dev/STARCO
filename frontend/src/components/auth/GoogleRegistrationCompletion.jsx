import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthInput from "./AuthInput";
import { googleLogin } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/logo.jpg";
import { normalizeEgyptianPhone } from "../../utils/phoneNumber";

function GoogleRegistrationCompletion() {
  const navigate = useNavigate();
  const { reloadProfile, setPending } = useAuth();
  const credential = sessionStorage.getItem("starco_google_registration_credential");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({ phoneNumber: "", role: "" });
  const handleChange = (event) => {
    if (event.target.name === "phoneNumber") setPhoneError("");
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!credential) return navigate("/register", { replace: true });
    if (!formData.phoneNumber || !formData.role) return toast.error("أدخل رقم الهاتف واختر الدور.");
    const phoneNumber = normalizeEgyptianPhone(formData.phoneNumber);
    if (!phoneNumber) return setPhoneError("Enter a valid Egyptian mobile number, such as 01012345678.");
    setLoading(true);
    try {
      const response = await googleLogin({ credential, ...formData, phoneNumber });
      localStorage.setItem("token", response.headers["x-auth-token"]);
      sessionStorage.removeItem("starco_google_registration_credential");
      await reloadProfile();
      setPending(response.data.status === "pending");
      navigate("/dashboard");
      if (response.data.status !== "pending") toast.success("Account created successfully.");
    } catch (error) {
      const message = error?.response?.data?.message || "تعذر إكمال التسجيل عبر Google.";
      if (/phone number|WhatsApp/.test(message)) setPhoneError(message);
      else toast.error(message);
    } finally { setLoading(false); }
  };

  return <div className="auth-card google-completion-card">
    <div className="auth-header"><img src={logo} alt="Starco" className="auth-logo" /><h1>Complete your account</h1><p>Add your phone number and role to complete registration.</p></div>
    <form onSubmit={handleSubmit} className="auth-body" style={{ width: "100%" }}>
      <div className="phone-input-field"><AuthInput label="WhatsApp number" type="tel" name="phoneNumber" placeholder="1012345678" value={formData.phoneNumber} onChange={handleChange} />{phoneError && <p className="field-error">{phoneError}</p>}</div>
      <div className="input-group"><label htmlFor="role">Role</label><div className="select-wrapper"><select id="role" name="role" className="auth-select" value={formData.role} onChange={handleChange} required><option value="">Choose your role</option><option value="Engineer">Engineer</option><option value="Marketer">Marketer</option></select></div></div>
      <button className="auth-btn" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
    </form>
    <button type="button" className="auth-text-btn" onClick={() => { sessionStorage.removeItem("starco_google_registration_credential"); navigate("/register"); }}>Back to registration</button>
  </div>;
}

export default GoogleRegistrationCompletion;
