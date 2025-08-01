import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Button from '../components/button';
import Input from '../components/input';
import Select from '../components/select';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import db from '../firebase';
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
    useEffect(() => {
    const password = JSON.parse(localStorage.getItem("password"));
    if (!password || password.passwordchenge === true || password.setpassword !== true) {
        localStorage.removeItem("password");
        localStorage.removeItem("select");
        navigate("/sign-in");
    }
    }, [navigate]);
  async function getPasswordDoc() {
    const docRef = doc(db, "passwords", "main");
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

async function btn_click() {
  const inputVal = document.getElementById("input").value;
  const selectVal = document.getElementById("who_are_you").value;

  setLoading(true);

  const passwordData = await getPasswordDoc();

  if (!passwordData) {
    setLoading(false);
    showError("Error loading password!");
    return;
  }

  const currentPassword = passwordData.password;
//   const passwordChanged = passwordData.passwordchenge;

//   if (passwordChanged) {
//     setLoading(false);
//     showError("The password has been changed. You will be redirected...");
//     return;
//   }

  if (inputVal === currentPassword && selectVal !== " ") {
    try {
      const docRef = doc(db, "passwords", "main");
      await updateDoc(docRef, { passwordchenge: false });

      const updatedDocSnap = await getDoc(docRef);
      const updatedData = updatedDocSnap.data();

      if (updatedData.passwordchenge === false) {
        localStorage.setItem("password", JSON.stringify({
          setpassword: true,
          passwordchenge: false,
        }));
        localStorage.setItem("select", JSON.stringify({ who_are_you: selectVal }));

        navigate("/price_page");
      } else {
        showError("Something went wrong. Please try again.");
      }
    } catch (err) {
      showError("Error while updating. Try again.");
    } finally {
      setLoading(false);
    }
  } else {
    setLoading(false);

    if (inputVal !== currentPassword && selectVal !== " ") {
      showError("The password is wrong. Please try again.");
    } else if (inputVal === currentPassword && selectVal === " ") {
      showError("Please select who are you?");
    } else if (inputVal === "" && selectVal === " ") {
      showError("Please enter your password and select who are you?");
    } else if (inputVal === "") {
      showError("Please enter your password");
    } else {
      showError("Please select who are you?");
    }
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
            <div className="spinner"></div>
            <div className="loading-text">Checking password...</div>
        </div>
      )}
      <h3 className='p_logIn'>please log in to continue</h3>
      <Input id="input" />
      <Select />
      <div className="buttonDiv">
        <Button class_pram="btn_LogIn" text="Log In" onClick={btn_click} />
      </div>
      <Footer />
    </div>
  );
}
