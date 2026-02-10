import { useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import db from "../firebase";

export default function Kind({ selectedBuyer, setSelectedBuyer }) {

    const firstLoad = useRef(true);
    const clientInfoRef = useRef(null);

    // 🔹 تحميل القيمة من Firebase أول ما الصفحة تفتح
    useEffect(() => {
        async function initClientInfo() {
            const counterRef = doc(db, "counters", "panels");
            const counterSnap = await getDoc(counterRef);
            const panelId = counterSnap.data().numberNaw.toString();
            clientInfoRef.current = doc(db, "clientInfo", panelId);
            const snap = await getDoc(clientInfoRef.current);
            if (snap.exists()) {
                const buyerFromDB = snap.data()?.Kind;
                if (buyerFromDB === "السيد" || buyerFromDB === "السادة") {
                    setSelectedBuyer(buyerFromDB);
                }
            }
            firstLoad.current = false;
        }
        initClientInfo();
    }, [setSelectedBuyer]);
    const handleChange = async (value) => {
        setSelectedBuyer(value);
        if (firstLoad.current || !clientInfoRef.current) return;
        await setDoc(
            clientInfoRef.current,
            { Kind: value },
            { merge: true }
        );
    };
    return (
        <div className="flex_col dir">
            <h3>المشتري :</h3>

            <label className="weight-checkbox-label">
                <input
                    type="radio"
                    className="weight-checkbox-input"
                    name="kind"
                    checked={selectedBuyer === "السادة"}
                    onChange={() => handleChange("السادة")}
                />
                <span className="checkmark"></span>
                شركة
            </label>

            <label className="weight-checkbox-label">
                <input
                    type="radio"
                    className="weight-checkbox-input"
                    name="kind"
                    checked={selectedBuyer === "السيد"}
                    onChange={() => handleChange("السيد")}
                />
                <span className="checkmark"></span>
                عميل
            </label>
        </div>
    );
}