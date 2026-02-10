import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Button from '../components/button';
import { useState, useEffect } from 'react';
import db from '../firebase';
import { doc, getDoc,updateDoc } from 'firebase/firestore';

export default function DashboardPage() {
  const [enteredPassword, setEnteredPassword] = useState("");
  const [realPassword, setRealPassword] = useState(""); 
  const [authenticated, setAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    function togglePasswordVisibility() {
        setShowPassword((prev) => !prev);
    }
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword2, setShowPassword2] = useState(false);


useEffect(() => {
  async function fetchPassword() {
    const docRef = doc(db, "passwords", "main");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentPassword(data.password || "");
    }
}

fetchPassword();
}, []);

async function handleChangePassword() {
    
    const docRef = doc(db, "passwords", "main");
    await updateDoc(docRef, {
        password: newPassword,
        passwordchenge: true,
    });
    
    setCurrentPassword(newPassword);
    setNewPassword("");
}

  useEffect(() => {
    async function fetchPassword() {
      const docRef = doc(db, "passwords", "dashboard_password");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRealPassword(data.password); 
      }
    }
    fetchPassword();
  }, []);

  function handleCheckPassword() {
    if (enteredPassword.trim() === "") {
      setErrorMsg("Please enter password");
      return;
    }

    if (enteredPassword === realPassword) {
      setAuthenticated(true);
    } else {
      setErrorMsg("Wrong password");
    }
  }

  if (!authenticated) {
    return (
      <div className="DashboardPage">
        <Navbar text="Dashboard - Password Required" />
        <div className="dashboard-password-input">
          <p>You must set password</p>
        <div className="containar">
            <div className="enter">
                <input value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)} id="input" type={showPassword ? "text" : "password"} required  />
                <div className="label">Enter dashboard password</div>
                <i className={`bx ${showPassword ? "bx-hide" : "bx-show"} show_password`} onClick={togglePasswordVisibility}></i>
            </div>
        </div>
          <Button text="check" class_pram="btn_LogIn" onClick={handleCheckPassword} />
          {errorMsg && <p className="error">{errorMsg}</p>}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="DashboardPage">
      <Navbar text="Dashboard - Admin Control" />
      <div className="dashboard-password-input-change">
                <h2>Change Password</h2>

        <div className="password-container">
      <p className="current-password">
        Current Password:{" "}
        <strong>
          {currentPassword
            ? showPassword2
              ? currentPassword
              : "•".repeat(currentPassword.length)
            : "Loading..."}
        </strong>
      </p>
      {currentPassword && (
        <i className={`bx ${showPassword2 ? "bx-hide" : "bx-show"} show_password`} onClick={() => setShowPassword2(!showPassword2)}></i>
      )}
    </div>

        <div className="containar">
            <div className="enter">
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} id="input" type={showPassword ? "text" : "password"} required  />
                <div className="label">password</div>
                <i className={`bx ${showPassword ? "bx-hide" : "bx-show"} show_password`} onClick={togglePasswordVisibility}></i>
            </div>
        </div>


        <Button class_pram="btn_LogIn" text="Change Password" onClick={handleChangePassword} />
      </div>
      <Footer />
    </div>
  );
}

