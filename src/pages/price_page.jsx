import Navbar from '../components/navbar';
import Footer from '../components/footer';
import PricingHeader from '../components/pricing_header';
import RenderInformationTable from '../components/information_table';
import RenderSagPrice from '../components/sag_price';
import RenderPricingTable from '../components/pricing_table';
import RenderWeightTable from '../components/weight_table';
import { useContext, useState } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
import RenderPdfInformation from '../components/pdf_information';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function PricePage() {
    const { piece,setpiece,th_table } = useContext(ControlAllInputsContext);
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
    let password = JSON.parse(localStorage.getItem("password"));
    
  async function checkPasswordStatus() {
    const docRef = doc(db, "passwords", "main");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.passwordchenge && password) {
        localStorage.removeItem("password");
        localStorage.removeItem("select");
        showError("The password has been changed. You will be redirected...");

        setTimeout(() => {
            navigate("/sign-in");
            setLoading(false);
        }, 3000);
      } else if (!password) {
        setLoading(true);
        showError("Please sign in to access the page");
        setTimeout(() => {
            navigate("/sign-in");
            setLoading(false);
        }, 3000);
      }else {
         setLoading(false);
      }
    } else {
      console.error("Password doc not found");
      navigate("/sign-in");
    }
  }

  checkPasswordStatus();
}, [navigate]);


  return (
    <div className="Price_page">
        <div className="lockp"><div className='lock2'></div></div>
        {loading && (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <div className="loading-text">Checking password...</div>
            </div>
        )}
        <Navbar text="STARCO Company" />
        <PricingHeader piece={piece} setpiece={setpiece} />
        <div className="divider_div">
            <hr className='divider' />
        </div>
        <RenderSagPrice />
        <div className="divider_div">
            <hr className='divider' />
        </div>
        <RenderWeightTable />
        <div className="divider_div">
            <hr className='divider' />
        </div>
        <RenderInformationTable th_table={th_table} />
        <div className="divider_div">
            <hr className='divider' />
        </div>
        <RenderPricingTable />
        <div className="divider_div">
            <hr className='divider' />
        </div>
        <RenderPdfInformation />
        <Footer />
    </div>
  );
}
