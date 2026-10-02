import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import AuthTabs from "./AuthTabs";
import AuthInput from "./AuthInput";
import { googleLogin, login } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import { useActivityAction } from "../common/activity/ActivityContext";
import logo from "../../assets/images/logo.jpg";
import { showApiErrorToast } from "../../utils/errorToast";

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reloadProfile, setPending } = useAuth();
  const runActivity = useActivityAction();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const handleChange = (event) =>
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const finishSession = async (response) => {
    localStorage.setItem("token", response.headers["x-auth-token"]);
    await reloadProfile();
    const pending = response.data.status === "pending";
    const restricted = pending || response.data.status === "whatsappPending";
    setPending(pending);
    navigate("/dashboard");
    return restricted;
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const operation = await runActivity(
        "login",
        {
          title: "تسجيل الدخول",
          message: "يتم التحقق من بيانات الحساب...",
          type: "default",
          successMessage: "تم تسجيل الدخول.",
          errorMessage: "تعذر تسجيل الدخول.",
        },
        async () => finishSession(await login(formData)),
      );
      if (operation.skipped) return;
      if (!operation.visible && !operation.value)
        toast.success("Welcome back.");
    } catch (error) {
      showApiErrorToast(error, "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };
  const signInWithGoogle = async (credentialResponse) => {
    setLoading(true);
    try {
      const operation = await runActivity(
        "google-login",
        {
          title: "تسجيل الدخول باستخدام Google",
          message: "يتم التحقق من حساب Google...",
          type: "default",
          successMessage: "تم تسجيل الدخول.",
          errorMessage: "تعذر تسجيل الدخول باستخدام Google.",
        },
        async () =>
          finishSession(
            await googleLogin({ credential: credentialResponse.credential }),
          ),
      );
      if (operation.skipped) return;
      if (!operation.visible && !operation.value)
        toast.success("Welcome back.");
    } catch (error) {
      showApiErrorToast(error, "هذا البريد غير مسجل عبر Google بعد.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-card auth-login-card">
      <div className="auth-header">
        <AuthTabs />
        <img src={logo} alt="Starco" className="auth-logo" />
        <h1>Welcome back</h1>
        <p>Login to continue to your STARCO projects.</p>
      </div>
      {location.state?.accountDeleted && (
        <p className="auth-account-notice">
          This account has been deleted or is no longer available.
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="auth-body"
        style={{ width: "100%" }}
      >
        <AuthInput
          label="Email address"
          type="email"
          name="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
        />
        <div className="password-group">
          <AuthInput
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <div className="google-auth">
          <span>أو</span>
          <div className="google-login-shell">
            <span className="google-login-visual">
              <FcGoogle />
              Login with Google
            </span>
            <GoogleLogin
              onSuccess={signInWithGoogle}
              onError={() => toast.error("تعذر الاتصال بـ Google.")}
              text="signin_with"
              theme="outline"
              shape="pill"
              size="large"
              width="300"
            />
          </div>
        </div>
      )}
      <div className="auth-switch auth-footer">
        Don't have an account?
        <button type="button" onClick={() => navigate("/register")}>
          Create account
        </button>
      </div>
    </div>
  );
}

export default LoginForm;
