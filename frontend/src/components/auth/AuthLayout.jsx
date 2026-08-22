import "../../styles/auth.css";

function AuthLayout({ children }) {
    return (
        <div className="auth-page">

            <div className="auth-container">

                {children}

            </div>

            <footer className="auth-footer-copyright">

                © 2026 Starco Panels. All rights reserved.

            </footer>

        </div>
    );
}

export default AuthLayout;