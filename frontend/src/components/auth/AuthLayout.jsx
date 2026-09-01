import "../../styles/auth.css";
import {
    HiOutlineChartBar,
    HiOutlineFolderOpen,
    HiOutlineMoon,
    HiOutlineShieldCheck,
    HiOutlineSun,
} from "react-icons/hi";
import logo from "../../assets/images/logo.jpg";
import { useTheme } from "../../context/ThemeContext";

const authFeatures = [
    { icon: HiOutlineChartBar, title: "Dashboard Overview", description: "Track all your projects and activities" },
    { icon: HiOutlineFolderOpen, title: "Projects Management", description: "Create, update and manage projects" },
    { icon: HiOutlineShieldCheck, title: "Secure & Reliable", description: "Your data is safe with us" },
];

function AuthLayout({ children }) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="auth-page">

            <button
                type="button"
                className="auth-theme-toggle"
                onClick={toggleTheme}
                aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
                title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            >
                {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
            </button>

            <div className="auth-container">

                <section className="auth-visual" aria-label="Starco Panels">
                    <div className="auth-visual-content">
                        <img src={logo} alt="Starco Panels" className="auth-visual-logo" />
                        <div className="auth-visual-heading">
                            <h2><span>Starco</span> Panels</h2>
                            <p><strong>Smart</strong> Solutions, <strong>Reliable</strong> Panels</p>
                        </div>
                        <p className="auth-visual-intro">
                            Manage your projects, panels, and clients efficiently with Starco&apos;s dashboard.
                        </p>
                        <div className="auth-feature-list">
                            {authFeatures.map(({ icon: Icon, title, description }) => (
                                <div className="auth-feature" key={title}>
                                    <span className="auth-feature-icon"><Icon /></span>
                                    <span><strong>{title}</strong><small>{description}</small></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {children}

            </div>

            <footer className="auth-footer-copyright">

                © 2026 Starco Panels. All rights reserved.

            </footer>

        </div>
    );
}

export default AuthLayout;
