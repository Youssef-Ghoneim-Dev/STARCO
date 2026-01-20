import { useEffect, useState } from "react";
import { getDoc , doc , updateDoc } from "firebase/firestore";
import db from "../firebase";
import { useContext } from "react";
import { AppContext } from '../context/AppContext';
export default function NumPanel() {
      const { panalNumber , setPanalNumber } = useContext(AppContext); 
    let [activePanel, setActivePanel] = useState(0);
    useEffect(() => {
        async function fetchPanal() {
            const docRef = doc(db, "counters", "panels");
            let docSnap = await getDoc(docRef);
            const panalDetailsRef = doc(db, "panalDetails", docSnap.data().numberNaw.toString());
            const panalDetailsSnap = await getDoc(panalDetailsRef);
            const number = panalDetailsSnap.data().numberPanels;
            setPanalNumber(number);
        }
        fetchPanal(); 
    }, [setPanalNumber]);

    return (
        <div className="NumPanel">
            {
                Array.from({ length: panalNumber }, (_, i) => (
                    <div key={i} style={{ display: 'contents' }}>
                        <h2
                            onClick={() => setActivePanel(i)}
                            className={activePanel === i ? "active" : ""}
                        >
                        لوحة {i + 1}
                        </h2>

                        <div></div>
                    </div>
                ))
            }
            <i className='bx bx-plus' onClick={async () => {
                const docRef = doc(db, "counters", "panels");
                const docSnap = await getDoc(docRef);
                const panalDetailsRef = doc(db, "panalDetails", docSnap.data().numberNaw.toString());
                const panalDetailsSnap = await getDoc(panalDetailsRef);
                const number = (panalDetailsSnap.data().numberPanels || 0) + 1;
                setPanalNumber(number);
                await updateDoc(panalDetailsRef, {
                    numberPanels: number,
                });
            }}></i>
            <div></div>
            <i className='bx bx-minus' onClick={async () => {
                const docRef = doc(db, "counters", "panels");
                const docSnap = await getDoc(docRef);
                const panalDetailsRef = doc(db, "panalDetails", docSnap.data().numberNaw.toString());
                const panalDetailsSnap = await getDoc(panalDetailsRef);
                const current = panalDetailsSnap.data().numberPanels || 1;
                const number = current > 1 ? current - 1 : 1;
                setPanalNumber(number);
                await updateDoc(panalDetailsRef, {
                    numberPanels: number,
                });
            }}></i>
        </div>
    )
}