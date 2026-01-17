import { useContext } from "react";
import { AppContext } from '../context/AppContext';

export default function PricingInput({piece,information,length,idd,onChange}) {
    const { controlAllInputs,handleInputsControlChange } = useContext(AppContext);
    if (information) {
        return(
            <div className="pricing-input-div">
                <div className="piece-div">
                    <span className="piece">{piece}</span>
                </div>
                <div className="line"></div>
                <label htmlFor={`length${length}`} className="label">الطول:</label>
                <input 
                    value={controlAllInputs[`length${length}`] || ""} 
                    type="number" 
                    id={`length${length}`} 
                    onChange={(e) => handleInputsControlChange(e, `length${length}`)} 
                />
                <div className="line"></div>
                <label htmlFor={`width${length}`} className="label">العرض:</label>
                <input 
                    value={controlAllInputs[`width${length}`] || ""} 
                    type="number" 
                    id={`width${length}`} 
                    onChange={(e) => handleInputsControlChange(e, `width${length}`)}
                />
            </div>
        )
    }else{
        return (
            <div className="pricing-input-div">
                <div className="piece-div">
                    <span className="piece">{piece}</span>
                </div>
                <div className="line"></div>
                <input onChange={onChange} id={idd} className="input" type="number" value={controlAllInputs[idd] || ""} />
            </div>
        )
    }
}