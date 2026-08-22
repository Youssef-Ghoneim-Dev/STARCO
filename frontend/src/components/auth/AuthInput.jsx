import { FaEnvelope, FaUser, FaLock, FaPhoneAlt } from "react-icons/fa";

function AuthInput({
    label,
    type,
    name,
    value,
    onChange,
    placeholder
}) {

    const getIcon = () => {

        switch (name) {

            case "name":
                return <FaUser />;

            case "email":
                return <FaEnvelope />;

            case "password":
            case "confirmPassword":
                return <FaLock />;

            case "phoneNumber":
                return <FaPhoneAlt />;

            default:
                return null;

        }

    };

    return (

        <div className="input-group">

            <label htmlFor={name}>
                {label}
            </label>

            <div className="input-wrapper">

                <span className="input-icon">
                    {getIcon()}
                </span>

                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    dir="ltr"
                    autoComplete="off"
                    required
                />

            </div>

        </div>

    );

}

export default AuthInput;
