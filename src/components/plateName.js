import { useEffect, useRef } from "react";
import { doc, getDoc, setDoc  } from "firebase/firestore";
import db from "../firebase";

export default function PlateName({ plateName, setPlateName }) {
    const firstLoad = useRef(true);
    const resourceRef = useRef(null);
    useEffect(() => {
        async function init() {
            const counterRef = doc(db, "counters", "panels");
            const counterSnap = await getDoc(counterRef);
            const panelId = counterSnap.data().numberNaw.toString();
            resourceRef.current = doc(db, "panals", panelId);
            const snap = await getDoc(resourceRef.current);
            if (snap.exists()) {
                setPlateName(snap.data()?.panelName || "");
            }
            firstLoad.current = false;
        }
        init();
    }, [setPlateName]);
    const handleChange = async (value) => {
        setPlateName(value);
        if (firstLoad.current) return;
        await setDoc(resourceRef.current, {
            panelName: value
        }, { merge: true });
    };
    return (
        <div className="pricing-input-div">
            <div className="piece-div">
                <span className="piece">اسم اللوحة</span>
            </div>
            <div className="line"></div>
            <input
                className="input"
                type="text"
                value={plateName}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}
