import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Button from '../components/button';
import Input from '../components/input';
import Select from '../components/select';
import { useNavigate } from 'react-router-dom';
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function btn_click() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const selectVal = document.getElementById("who_are_you").value;

    if (!email || !password) {
      showError("Please enter email and password");
      return;
    }

    if (selectVal === " ") {
      showError("Please select who are you?");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("user_meta", JSON.stringify({
        who_are_you: selectVal
      }));

      navigate("/home_price");

    } catch (error) {
      showError("Email or password is incorrect");
    } finally {
      setLoading(false);
    }
  }

  function showError(message) {
    const lock = document.querySelector(".lockp");
    const lock2 = document.querySelector(".lock2");
    lock.style.display = "flex";
    lock2.textContent = message;
    setTimeout(() => {
      lock.style.display = "none";
    }, 3000);
  }

  return (
    <div className="SignInPage">
      <Navbar text="STARCO Company" />
      <div className="lockp"><div className='lock2'></div></div>

      {loading && (
        <div className="loading-overlay">
            <div className="loading-container">
                <div className="spinner"></div>
                <div className="loading-text">
                    Signing in
                    <span className="dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </div>
            </div>
        </div>
      )}

      <h3 className='p_logIn'>please log in to continue</h3>

      <Input id="email" placeholder="Email" />
      <Input id="password" type="password" placeholder="Password" />
      <Select />

      <div className="buttonDiv">
        <Button
          class_pram="btn_LogIn"
          text="Log In"
          onClick={btn_click}
        />
      </div>

      <Footer />
    </div>
  );
}
