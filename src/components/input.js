import { useState } from "react";

export default function Input() {
    const [showPassword, setShowPassword] = useState(false);

    function togglePasswordVisibility() {
        setShowPassword((prev) => !prev);
    }

    return (
        <div className="containar">
            <div className="enter">
                <input id="input" type={showPassword ? "text" : "password"} required />
                <div className="label">password</div>
                <i className={`bx ${showPassword ? "bx-hide" : "bx-show"} show_password`} onClick={togglePasswordVisibility}></i>
            </div>
        </div>
    );
}