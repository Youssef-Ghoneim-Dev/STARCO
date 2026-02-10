import { useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../firebase";
export default function Ratio({ selectedPercentage, setSelectedPercentage }) {
    const percentages = ["15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%"];
    const firstLoad = useRef(true);
    const panalDetailsRef = useRef(null);
    useEffect(() => {
        async function initializePanel() {
            const counterRef = doc(db, "counters", "panels");
            const counterSnap = await getDoc(counterRef);
            const panelId = counterSnap.data().numberNaw.toString();
            panalDetailsRef.current = doc(db, "panalDetails", panelId);
            const snap = await getDoc(panalDetailsRef.current);
            if (snap.exists()) {
                const ratioFromDB = snap.data()?.Panels?.RatioPrice;
                if (typeof ratioFromDB === "string") {
                    setSelectedPercentage(ratioFromDB);
                } else {
                    setSelectedPercentage("");
                }
            }
            firstLoad.current = false;
        }
        initializePanel();
    }, [setSelectedPercentage]);
    const handleRatioChange = async (value) => {
        setSelectedPercentage(value);
        if (!panalDetailsRef.current) return;
        if (firstLoad.current) return;
        await updateDoc(panalDetailsRef.current, {
            "Panels.RatioPrice": value
        });
    };
    return (
        <>
            <div className="flex_row">
                <h3>السعر بالنسبة :</h3>
                <p>*ملحوظة لا يمكنك اختيار أكثر من اختيار</p>
            </div>
            <div className="flex_row_check dir">
                {percentages.map((item, index) => (
                    <label key={index} className="weight-checkbox-label">
                        <input
                            type="radio"
                            className="weight-checkbox-input"
                            name="percentages"
                            value={item}
                            checked={selectedPercentage === item}
                            onChange={() => handleRatioChange(item)}
                        />
                        <span className="checkmark"></span>
                        {item}
                    </label>
                ))}
            </div>
        </>
    );
}