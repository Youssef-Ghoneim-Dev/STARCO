import { useState , useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import db from "../firebase";
import { useContext } from "react";
import { AppContext } from '../context/AppContext';
export default function RenderInformationTable({th_table}) {
    const { handleInputBlur } = useContext(AppContext);
    const [valuetab, setValuetab] = useState({});
    
    useEffect(() => {
        let mounted = true;
        async function fetchValues() {
            try {
                const docRef = doc(db, "RawMaterialPrices", "RawMaterialPrice");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && mounted) {
                    const data = docSnap.data();
                    const newValues = {};
                    th_table.forEach((item) => {
                        newValues[item] = data[item] || "";
                    });
                    setValuetab(newValues);
                }
            } catch (err) {
                console.error("Error fetching RawMaterialPrice:", err);
            }
        }
        if (th_table && th_table.length > 0) fetchValues();
        return () => { mounted = false; };
    }, [th_table]);
    return (
            <div className="information-inputs">
                <div className='information-table-container'>
                    <table className='information-table'>
                    <thead>
                        <tr>
                            {th_table.map((item, index) => (
                                <th key={index} className={index === 0 ? 'radius_t_r' : index === th_table.length - 1 ? 'radius_t_l' : ''}>{item}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {th_table.map((item, index) => (
                                <td key={index} className={index === 0 ? 'radius_b_r' : index === th_table.length - 1 ? 'radius_b_l' : ''}><input onChange={(e) => setValuetab({...valuetab, [item]: e.target.value})} value={valuetab[item] || ""} id={item} type="number" className='information-input' onBlur={(e) => handleInputBlur(e, item)} /></td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                </div>
            </div>
    );
}
