import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import toast from "react-hot-toast";
import AuthTabs from "./AuthTabs";
import AuthInput from "./AuthInput";
import { login, register } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/logo.jpg";
import { normalizeEgyptianPhone } from "../../utils/phoneNumber";

function RegisterForm() {
  const navigate = useNavigate();
  const { reloadProfile, setPending } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phoneNumber: "", password: "", confirmPassword: "", role: "" });
  const handleChange = (event) => {
    if (event.target.name === "phoneNumber") setPhoneError("");
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };
  const finishSession = async (response) => {
    localStorage.setItem("token", response.headers["x-auth-token"]);
    await reloadProfile();
    setPending(response.data.status === "pending");
    navigate("/dashboard");
    if (response.data.status !== "pending") toast.success("Account created successfully.");
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error("تأكيد كلمة المرور غير مطابق.");
    const phoneNumber = normalizeEgyptianPhone(formData.phoneNumber);
    if (!phoneNumber) return setPhoneError("Enter a valid Egyptian mobile number, such as 01012345678.");
    setLoading(true);
    try {
      await register({ name: formData.name, email: formData.email, phoneNumber, password: formData.password, role: formData.role });
      await finishSession(await login({ email: formData.email, password: formData.password }));
    } catch (error) {
      const message = error?.response?.data?.message || "تعذر إنشاء الحساب.";
      if (/phone number|WhatsApp/.test(message)) setPhoneError(message);
      else toast.error(message);
    }
    finally { setLoading(false); }
  };
  const signUpWithGoogle = (credentialResponse) => {
    sessionStorage.setItem("starco_google_registration_credential", credentialResponse.credential);
    navigate("/register/google");
  };
  return <div className="auth-card auth-register-card">
    <div className="auth-header"><AuthTabs /><img src={logo} alt="Starco" className="auth-logo" /><h1>Create account</h1><p>Create your account to start working on STARCO projects.</p></div>
    <form onSubmit={handleSubmit} className="auth-body" style={{ width: "100%" }}>
      <AuthInput label="Full name" type="text" name="name" placeholder="Enter your name" value={formData.name} onChange={handleChange} />
      <AuthInput label="Email address" type="email" name="email" placeholder="name@example.com" value={formData.email} onChange={handleChange} />
      <div className="phone-input-field"><AuthInput label="WhatsApp number" type="tel" name="phoneNumber" placeholder="1012345678" value={formData.phoneNumber} onChange={handleChange} />{phoneError && <p className="field-error">{phoneError}</p>}</div>
      <div className="password-group"><AuthInput label="Password" type={showPassword ? "text" : "password"} name="password" placeholder="At least 8 characters" value={formData.password} onChange={handleChange} /><button type="button" className="eye-btn" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button></div>
      <AuthInput label="Confirm password" type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Enter your password again" value={formData.confirmPassword} onChange={handleChange} />
      <div className="input-group"><label htmlFor="role">Role</label><div className="select-wrapper"><select id="role" name="role" className="auth-select" value={formData.role} onChange={handleChange} required><option value="">Choose your role</option><option value="Engineer">Engineer</option><option value="Marketer">Marketer</option></select></div></div>
      <button className="auth-btn" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
    </form>
    {import.meta.env.VITE_GOOGLE_CLIENT_ID && <div className="google-auth"><span>أو</span><div className="google-login-shell"><span className="google-login-visual"><FaGoogle />Sign up with Google</span><GoogleLogin onSuccess={signUpWithGoogle} onError={() => toast.error("تعذر الاتصال بـ Google.")} text="signup_with" theme="outline" shape="pill" size="large" width="300" /></div></div>}
    <div className="auth-switch auth-footer">Already have an account?<button type="button" onClick={() => navigate("/login")}>Login</button></div>
  </div>;
}

export default RegisterForm;
