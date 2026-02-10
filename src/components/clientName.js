import { useEffect, useRef } from "react";
import { doc, getDoc, setDoc , updateDoc } from "firebase/firestore";
import db from "../firebase";

export default function ClientName({ clientName, setClientName }) {
    const firstLoad = useRef(true);
    const resourceRef = useRef(null);
    const clientInfoRef = useRef(null);
    useEffect(() => {
        async function init() {
            const counterRef = doc(db, "counters", "panels");
            const counterSnap = await getDoc(counterRef);
            const panelId = counterSnap.data().numberNaw.toString();
            resourceRef.current = doc(db, "panals", panelId);
            clientInfoRef.current = doc(db, "clientInfo", panelId);
            const snap = await getDoc(resourceRef.current);
            if (snap.exists()) {
                setClientName(snap.data()?.clientName || "");
            }
            firstLoad.current = false;
        }
        init();
    }, [setClientName]);
    const handleChange = async (value) => {
        setClientName(value);
        if (firstLoad.current) return;
        await setDoc(resourceRef.current, {
            clientName: value
        }, { merge: true });
        await updateDoc(clientInfoRef.current, {
            name: value
        });
    };
    return (
        <div className="pricing-input-div">
            <div className="piece-div">
                <span className="piece">اسم العميل</span>
            </div>
            <div className="line"></div>
            <input
                className="input"
                type="text"
                value={clientName}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}
