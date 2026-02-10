import { createContext, useState, useRef, useMemo, useEffect } from 'react';
import { Buffer } from 'buffer';
import { getDoc, updateDoc, doc } from "firebase/firestore";
import db from "../firebase";
import price from '../pricing/price';
export const AppContext = createContext();

export function AppProvider({ children }) {
  window.Buffer = Buffer;

  // ---- States ----
  const [price2, setPrice2] = useState([]);
  const [numPanal, setNumPanal] = useState(1);
  const [selectedThickness, setSelectedThickness] = useState([]);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [clientName, setClientName] = useState("");
  const [plateName, setPlateName] = useState("");
  const [piece, setPiece] = useState(["العلبة", "الجنب", "المراية", "الجلسة", "الجريدة","باب1", "باب2","إضافي1"]);
    let [panalNumber, setPanalNumber] = useState(1);

  const scrollDirection = useRef(0);
  const animationFrame = useRef(null);

  const th_table = useMemo(() => (
    ["مصنعية", "كوالين", "مفصلات", "نقل", "مسامير", "استرتش", "نحاس", "فيبر", "ريكام", "فيوز"]
  ), []);

  localStorage.removeItem("information");
  localStorage.removeItem("password");
  localStorage.removeItem("select");

  // ---- Functions ----
  const clickFunPanalfun = () => {
    if (numPanal < 2) {
      setNumPanal(numPanal + 1);
      setPiece(prev => [...prev, prev[prev.length-1]+(numPanal+1)]);
    } else handleError();
  }
    const handleInputBlur = async (e, id) => {
        const docRef = doc(db, "counters", "panels");
        const docSnap = await getDoc(docRef);
        const panalDetailsRef = doc(db, "panalDetails", docSnap.data().numberNaw.toString());
        await updateDoc(panalDetailsRef, {
            "Panels.RawMaterialPrices": {
                ...(await getDoc(panalDetailsRef)).data().Panels?.RawMaterialPrices,
                [id]: parseFloat(e.target.value)
            }
        });
        await price({ piece, th_table });
    };

  const handle3D = () => {
    const lock = document.querySelector(".lockdiv");
    lock.style.display = "flex";
    lock.innerHTML = `<div class="lock2">This feature is coming soon!</div>`;
    setTimeout(() => lock.style.display = "none", 3000);
  }

  const handleError = () => {
    const lock = document.querySelector(".lockdiv");
    lock.style.display = "flex";
    lock.innerHTML = `<div class="lock2">You have reached the maximum number of panels.</div>`;
    setTimeout(() => lock.style.display = "none", 3000);
  }

//   ---- Effects ----


  useEffect(() => {
    const updatedPrices = selectedThickness.map((thickness) => {
      const el = document.getElementById(`all_${thickness}_sagprice_with_${selectedPercentage}`);
      return el ? el.textContent : null;
    });
    setPrice2(updatedPrices);
  }, [selectedThickness, selectedPercentage]);

  useEffect(() => {
    const scrollStep = () => {
      if (scrollDirection.current !== 0) {
        window.scrollBy(0, scrollDirection.current * 5);
        animationFrame.current = requestAnimationFrame(scrollStep);
      }
    };
    const handleKeyDown = (e) => {
      if (scrollDirection.current !== 0) return;
      if (e.key === "ArrowUp") scrollDirection.current = -1;
      else if (e.key === "ArrowDown") scrollDirection.current = 1;
      if (scrollDirection.current !== 0) animationFrame.current = requestAnimationFrame(scrollStep);
    };
    const handleKeyUp = (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        scrollDirection.current = 0;
        cancelAnimationFrame(animationFrame.current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  return (
    <AppContext.Provider value={{
      price2, setPrice2,
      numPanal, setNumPanal,
      selectedThickness, setSelectedThickness,
      selectedPercentage, setSelectedPercentage,
      selectedBuyer, setSelectedBuyer,
      clientName, setClientName,
      plateName, setPlateName,
      piece, setPiece,
      th_table,
      clickFunPanalfun,
      handleInputBlur,
      handle3D,
      handleError,
      panalNumber, setPanalNumber
    }}>
      {children}
    </AppContext.Provider>
  )
}
