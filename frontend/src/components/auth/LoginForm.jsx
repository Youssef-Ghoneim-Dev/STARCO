import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import toast from "react-hot-toast";
import AuthTabs from "./AuthTabs";
import AuthInput from "./AuthInput";
import { googleLogin, login } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/logo.jpg";

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reloadProfile, setPending } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  const finishSession = async (response) => {
    localStorage.setItem("token", response.headers["x-auth-token"]);
    await reloadProfile();
    const pending = response.data.status === "pending";
    const restricted = pending || response.data.status === "whatsappPending";
    setPending(pending);
    navigate("/dashboard");
    if (!restricted) toast.success("Welcome back.");
  };
  const handleSubmit = async (event) => {
    event.preventDefault(); setLoading(true);
    try { await finishSession(await login(formData)); }
    catch (error) { toast.error(error?.response?.data?.message || "تعذر تسجيل الدخول."); }
    finally { setLoading(false); }
  };
  const signInWithGoogle = async (credentialResponse) => {
    setLoading(true);
    try { await finishSession(await googleLogin({ credential: credentialResponse.credential })); }
    catch (error) { toast.error(error?.response?.data?.message || "هذا البريد غير مسجل عبر Google بعد."); }
    finally { setLoading(false); }
  };
  return <div className="auth-card auth-login-card">
    <div className="auth-header"><AuthTabs /><img src={logo} alt="Starco" className="auth-logo" /><h1>Welcome back</h1><p>Login to continue to your STARCO projects.</p></div>
    {location.state?.accountDeleted && <p className="auth-account-notice">This account has been deleted or is no longer available.</p>}
    <form onSubmit={handleSubmit} className="auth-body" style={{ width: "100%" }}>
      <AuthInput label="Email address" type="email" name="email" placeholder="name@example.com" value={formData.email} onChange={handleChange} />
      <div className="password-group"><AuthInput label="Password" type={showPassword ? "text" : "password"} name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} /><button type="button" className="eye-btn" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button></div>
      <button className="auth-btn" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
    </form>
    {import.meta.env.VITE_GOOGLE_CLIENT_ID && <div className="google-auth"><span>أو</span><div className="google-login-shell"><span className="google-login-visual"><FaGoogle />Login with Google</span><GoogleLogin onSuccess={signInWithGoogle} onError={() => toast.error("تعذر الاتصال بـ Google.")} text="signin_with" theme="outline" shape="pill" size="large" width="300" /></div></div>}
    <div className="auth-switch auth-footer">Don't have an account?<button type="button" onClick={() => navigate("/register")}>Create account</button></div>
  </div>;
}

export default LoginForm;
