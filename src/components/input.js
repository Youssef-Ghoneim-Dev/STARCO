import { useState } from "react";

export default function Input({ id , placeholder }) {
    const [showPassword, setShowPassword] = useState(false);

    function togglePasswordVisibility() {
        setShowPassword((prev) => !prev);
    }

    return (
        id === "password" ? (<div className="containar">
            <div className="enter">
                <input id={id} type={showPassword ? "text" : "password"} required  />
                <div className="label">{placeholder}</div>
                <i className={`bx ${showPassword ? "bx-hide" : "bx-show"} show_password`} onClick={togglePasswordVisibility}></i>
            </div>
        </div>) : (
            <div className="containar">
                <div className="enter">
                    <input id={id} type="text" required  />
                    <div className="label">{placeholder}</div>
                </div>
            </div>
        )
    );
}