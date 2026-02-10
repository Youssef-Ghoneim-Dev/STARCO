import { useNavigate } from 'react-router-dom';
import { useContext , useState } from 'react';
import { AppContext } from '../context/AppContext';
import { setDoc,getDoc, doc ,Timestamp, updateDoc } from "firebase/firestore";
import db from "../firebase";
export default function AddPrice(props) {
    const [isloading , setisloading] = useState(false);
    const { piece , setPiece } = useContext(AppContext);
    const navigate = useNavigate();
    async function handleClick() {
        setisloading(true);
        const docRef = doc(db, "RawMaterialPrices", "RawMaterialPrice");
        const docSnap = await getDoc(docRef);
        const docRef2 = doc(db, "counters", "panels");
        let docSnap2 = await getDoc(docRef2);
        docSnap2 = docSnap2.data().lastNumber + 1;
        await setDoc(doc(db, "panals", docSnap2.toString()), {
            time: Timestamp.now(),
        });

        await setDoc(doc(db, "panalDetails", docSnap2.toString()), {
            numberPanels: 1,
            Panels: {
                piece: piece,
                RawMaterialPrices: docSnap.data()
            },
        });


        await setDoc(doc(db, "clientInfo", docSnap2.toString()), {
            name: "",
        });
        await updateDoc(doc(db, "counters", "panels"), {
            lastNumber: docSnap2,
            numberNaw: docSnap2
        });
        props.onAdded && props.onAdded();
        async function loadPieceFromFirestore() {
            const docRef = doc(db, "counters", "panels");
            const docSnap = await getDoc(docRef);
            const panalDetailsRef = doc(db, "panalDetails", docSnap.data().numberNaw.toString());
            const panalDetailsSnap = await getDoc(panalDetailsRef);
            return panalDetailsSnap.data().Panels?.piece || null;
        }
        (async () => {
          if (piece.length !== (await loadPieceFromFirestore())?.length) {
              const fetchedPiece = await loadPieceFromFirestore();
              if (fetchedPiece) {
                  setPiece(fetchedPiece);
              }
          }
        })();
        navigate(`/price_page/${docSnap2}`);
        setisloading(false);
    }
    return (
        isloading ? 
            <div className="loading-overlay">
              <div className="spinner"></div>
              <div className="loading-text">
                loading
                <span className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
              </div>
            </div>
        : 
        <div className="AddPrice" onClick={handleClick}>
            <i className='bx bx-plus'></i>
        </div>
    );
}