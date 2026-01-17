import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import AddPrice from "../components/add-price";
import PdfPreview from "../components/pdf_preview";
export default function HomePricePage() {
      let user_meta = JSON.parse(localStorage.getItem("user_meta"));
      const navigate = useNavigate();
      const [loading, setLoading] = useState(true);
    
      function showError(message) {
        const lock = document.querySelector(".lockp");
        const lock2 = document.querySelector(".lock2");
        lock.style.display = "flex";
        lock2.textContent = message;
        setTimeout(() => {
          lock.style.display = "none";
        }, 3000);
      }
    
      useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!user) {
            showError("Please sign in to access the page");
            setTimeout(() => {
              navigate("/sign-in");
            }, 2000);
          } else {
            setLoading(false);
          }
        });
    
        return () => unsubscribe();
      }, [navigate]);
    
      if (loading) {
        return (
          <div className="Price_page">
            <div className="lockp"><div className='lock2'></div></div>
            <div className="loading-overlay">
              <div className="spinner"></div>
              <div className="loading-text">Checking authentication...</div>
            </div>
          </div>
        );
      }
    
    return (
        <div>
            <Navbar text={"Hallo " + (user_meta?.who_are_you + " in V2" || "STARCO Company")} />
                <div className="pricing_pdf">
                    <AddPrice />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                    <PdfPreview name="محمود الشبكة" Panal="1090 * 1080 * 500" />
                </div>
            <Footer />
        </div>
    );
}