import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import AddPrice from "../components/add-price";
import PdfPreview from "../components/pdf_preview";
import { getDocs,doc, collection , updateDoc , onSnapshot} from "firebase/firestore";
import db from "../firebase";
export default function HomePricePage() {
      let user_meta = JSON.parse(localStorage.getItem("user_meta"));
      const navigate = useNavigate();
        const [loading, setLoading] = useState(true);
        const [panals, setPanals] = useState([]);
      
    const fetchPanals = useCallback(() => {
        const colRef = collection(db, "panals");
        return onSnapshot(colRef, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
            const raw = doc.data();
            return {
                id: doc.id,
                clientName: raw.clientName,
                panelName: raw.panelName,
                timeAgo: raw.time
                ? timeAgo(raw.time.toDate())
                : "غير معروف",
            };
            });
            setPanals(data);
            setLoading(false);
        });
    }, []);


      function timeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return ` ${seconds} ثانية`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return ` ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return ` ${hours} ساعة`;
        const days = Math.floor(hours / 24);
        if (days < 30) return ` ${days} يوم`;
        const months = Math.floor(days / 30);
        if (months < 12) return ` ${months} شهر`;
        const years = Math.floor(months / 12);
        return ` ${years} سنة`;
      }
      useEffect(() => {
        updateDoc(doc(db, "counters", "panels"), {
            numberNaw: 0,
        });
      }, []);
        async function refreshPanals() {
          const colRef = collection(db, "panals");
          const snapshot = await getDocs(colRef);
          setPanals(snapshot.docs.map(doc => {
            const raw = doc.data();
            return { id: doc.id, clientName: raw.clientName, panelName: raw.panelName, timeAgo: raw.time ? timeAgo(raw.time.toDate()) : "غير معروف" };
          }));
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
    
    useEffect(() => {
        let unsubscribePanals;
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
            showError("Please sign in to access the page");
            setTimeout(() => navigate("/sign-in"), 2000);
            } else {
            unsubscribePanals = fetchPanals();
            }
        });
        return () => {
            unsubscribeAuth();
            if (unsubscribePanals) unsubscribePanals();
        };
    }, [navigate, fetchPanals]);

    
      if (loading) {
        return (
          <div className="Price_page">
            <div className="lockp"><div className='lock2'></div></div>
            <div className="loading-overlay">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <div className="loading-text">
                        loading
                        <span className="dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                    </div>
                </div>
            </div>
          </div>
        );
      }
    
    return (
        <div>
            <Navbar text={"Hallo " + (user_meta?.who_are_you + " in V2" || "STARCO Company")} />
                <div className="pricing_pdf">
                    <AddPrice onAdded={refreshPanals} />
                    {
                      panals.map((item) => (
                        <PdfPreview
                          key={item.id}
                          id={item.id}
                          name={item.clientName || "جاري التجهيز"}
                          Panal={item.panelName || "جاري التجهيز"}
                          time={item.timeAgo}
                        />
                      ))
                    }
                </div>
            <Footer />
        </div>
    );
}