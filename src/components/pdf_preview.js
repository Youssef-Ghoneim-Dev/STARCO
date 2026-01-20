import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDoc , doc ,updateDoc } from "firebase/firestore"
import db from "../firebase";
export default function PdfPreview({ name, Panal , time ,id }) {
    const navigate = useNavigate();
    let [showDelete, setShowDelete] = useState(false);
    async function handleDelete() {
        await Promise.all([
            deleteDoc(doc(db, "panals", id)),
            deleteDoc(doc(db, "panalDetails", id)),
            deleteDoc(doc(db, "clientInfo", id)),
        ]);
        setShowDelete(false);
    }
    async function getData() {
        updateDoc(doc(db, "counters", "panels"), {
            numberNaw: id,
        });
        navigate(`/price_page/${id}`)
    }
  return (
    showDelete ? 
    <div className="loading-overlay">
        <div className="loading-container">
            <div className="loading-content">
                <h2>هل أنت متأكد من حذف هذا العنصر ؟</h2>
                <p>إذا حذفته لن يكون هناك طريقة لإستعادته</p>
            </div>
            <div className="loading-buttons">
                <button onClick={() => setShowDelete(false)} className="cancel-button">إلغاء</button>
                <button
                    className="delete-button"
                    onClick={handleDelete}
                >
                حذف نهائي
                </button>

            </div>
        </div>
    </div>
    :
    <div className="PdfPreview" onClick={() => getData()}>
       <img src="/1.png" alt="PDF Preview" />
       <div>
            <h2>{name}</h2>
            <p>منذ {time}</p>
       </div>
       <h4>{Panal}</h4>
       <i className='bx bxs-trash abs' onClick={(e) => {e.stopPropagation(); setShowDelete(true)}}></i>
    </div>
  )
}