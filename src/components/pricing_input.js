import { useState, useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import db from "../firebase";

export default function PricingInput({piece,information,length,idd,onBlur ,onBlurl,onBlurw}) {
    const [value, setValue] = useState("");
    const [valuel, setValuel] = useState("");
    const [valuew, setValuew] = useState("");

    useEffect(() => {
        let mounted = true;
        async function fetchValue() {
            try {
                const docRef = doc(db, "counters", "panels");
                const docSnap = await getDoc(docRef);
                const panalDetailsRef = doc(db, "panalDetails", docSnap.data().numberNaw.toString());
                const docSnap2 = await getDoc(panalDetailsRef);
                if (docSnap2.exists() && mounted) {
                    const data = docSnap2.data();
                    setValue(data.Panels?.RawMaterialPrices?.[idd] || "");
                }
            } catch (err) {
                console.error("Error fetching RawMaterialPrice:", err);
            }
        }
        if (idd) fetchValue();
        return () => { mounted = false; };
    }, [idd]);
    useEffect(() => {
        let mounted = true;
        async function fetchValues() {
            try {
                const docRef = doc(db, "panalDetails", (await getDoc(doc(db, "counters", "panels"))).data().numberNaw.toString());
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && mounted) {
                    const data = docSnap.data();
                    setValuel(data?.Panels?.Lengths?.[`length${length}`] || "");
                    setValuew(data?.Panels?.Lengths?.[`width${length}`] || "");
                }
            } catch (err) {
                console.error("Error fetching panalDetails:", err);
            }
        }
        if (length !== undefined) fetchValues();
        return () => { mounted = false; };
    }, [length]);
    if (information) {
        return(
            <div className="pricing-input-div">
                <div className="piece-div">
                    <span className="piece">{piece}</span>
                </div>
                <div className="line"></div>
                <label htmlFor={`length${length}`} className="label">الطول:</label>
                <input 
                    value={valuel}
                    onBlur={onBlurl}
                    type="number" 
                    id={`length${length}`} 
                    onChange={(e) => setValuel(e.target.value)} 
                />
                <div className="line"></div>
                <label htmlFor={`width${length}`} className="label">العرض:</label>
                <input 
                    value={valuew}
                    onBlur={onBlurw}
                    type="number" 
                    id={`width${length}`} 
                    onChange={(e) => setValuew(e.target.value) }
                />
            </div>
        )
    }else{
        return (
            <div className="pricing-input-div">
                <div className="piece-div">
                    <span className="piece">{piece}</span>
                </div>
                <div className="line"></div>
                <input onBlur={onBlur} onChange={(e) => setValue(e.target.value)} id={idd} className="input" type="number" value={value}/>
            </div>
        )
    }
}