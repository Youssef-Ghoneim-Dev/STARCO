import PricingInput from './pricing_input';
import Button from './button';
import { useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import NumPanel from '../components/num_panel';
import { doc,getDoc, updateDoc } from "firebase/firestore";
import db from "../firebase";
import price from '../pricing/price';
export default function PricingHeader() {
    const { piece, setPiece , th_table} = useContext(AppContext);
    const doct = useRef(null);
    useEffect(() => {
        async function name() {
            const docRef = doc(db, "counters", "panels");
            const docSnap = await getDoc(docRef);
            doct.current = docSnap.data().numberNaw
        }
        name()
    }, [])
    async function add_field() {
        if (!doct.current) return;

        const newPiece = [...piece, `إضافي${(piece.length - 7) + 1}`];
        const panalDetailsRef = doc(db, "panalDetails", doct.current.toString());

        await updateDoc(panalDetailsRef, {
            "Panels.piece": newPiece
        });

        setPiece(newPiece);
    }

    async function fetchPanal(e, id) {
        if (!doct.current) return;

        const docRef = doc(db, "panalDetails", doct.current.toString());
        const snap = await getDoc(docRef);

        await updateDoc(docRef, {
            "Panels.Lengths": {
                ...snap.data()?.Panels?.Lengths,
                [id]: e.target.value
            }
        });
        await price({ piece, th_table });
    }

    return (
        <div className='pricing-header'>
            <NumPanel />
            <div className="pricing-inputs">
                {piece.map((item,index) => (
                    <PricingInput length={index} onBlurl={(e) => fetchPanal(e, `length${index}`)} onBlurw={(e) => fetchPanal(e, `width${index}`)} key={index} piece={item} information={true}/>
                ))}
            </div>
            <Button onClick={add_field} text="إضافة خانة" class_pram="add-field" />
        </div>
    );
}
