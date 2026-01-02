import Navbar from '../components/navbar';
import Footer from '../components/footer';
import PricingHeader from '../components/pricing_header';
import RenderInformationTable from '../components/information_table';
import RenderSagPrice from '../components/sag_price';
import RenderPricingTable from '../components/pricing_table';
import RenderWeightTable from '../components/weight_table';
import { useContext, useState, useEffect } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
import RenderPdfInformation from '../components/pdf_information';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function PricePage() {
  const { piece, setpiece, th_table } = useContext(ControlAllInputsContext);
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
    <div className="Price_page">
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
