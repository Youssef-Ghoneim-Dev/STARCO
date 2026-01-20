import { useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../firebase";
export default  function Thickness({ selectedThickness, setSelectedThickness }) {
    const Thickness = [0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.8, 2, 2.5, 3];
    const saveTimeout = useRef(null);
    const firstLoad = useRef(true);
    const panalDetailsRef = useRef(null);

    useEffect(() => {
        async function initializePanel() {
            const docRef = doc(db, "counters", "panels");
            const docSnap = await getDoc(docRef);
            const panelId = docSnap.data().numberNaw.toString();
            panalDetailsRef.current = doc(db, "panalDetails", panelId);

            const snap = await getDoc(panalDetailsRef.current);

            if (snap.exists()) {
                const thicknessFromDB = snap.data()?.Panels?.Thickness;

                if (Array.isArray(thicknessFromDB)) {
                    setSelectedThickness(thicknessFromDB);
                } else {
                    setSelectedThickness([]);
                }
            }

            firstLoad.current = false;
        }

        initializePanel();
    }, [setSelectedThickness]);
    useEffect(() => {
        if (firstLoad.current) return;
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }
        saveTimeout.current = setTimeout(async () => {
            if (panalDetailsRef.current) {
                await updateDoc(panalDetailsRef.current, {
                    "Panels.Thickness": selectedThickness
                });
            }
        }, 700);
        return () => clearTimeout(saveTimeout.current);
    }, [selectedThickness]);
    const handleThicknessChange = (value) => {
        setSelectedThickness((prev) =>
            prev.includes(value)
                ? prev.filter((item) => item !== value)
                : [...prev, value]
        );
    };
    return (
        <>
            <div className="flex_row">
                <h3>سمك الصاج :</h3>
                <p>*ملحوظة يمكنك اختيار أكثر من اختيار</p>
            </div>
            <div className="flex_row_check dir">
                {Thickness.map((item, index) => (
                    <label key={index} className="weight-checkbox-label">
                        <input
                            type="checkbox"
                            className="weight-checkbox-input"
                            checked={selectedThickness.includes(item)}
                            onChange={() => handleThicknessChange(item)}
                        />
                        <span className="checkmark"></span>
                        {item}
                    </label>
                ))}
            </div>
        </>
    );
}