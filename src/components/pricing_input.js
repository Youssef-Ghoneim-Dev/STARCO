import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
export default function PricingInput({piece,information,length,idd,onChange}) {
    const { control_all_inputs,handleInputsControlChange } = useContext(ControlAllInputsContext);
    if (information) {
        return(
            <div className="pricing-input-div">
                <div className="piece-div">
                    <span className="piece">{piece}</span>
                </div>
                <div className="line"></div>
                <label htmlFor={`length${length}`} className="label">الطول:</label>
                <input 
                    value={control_all_inputs[`length${length}`] || ""} 
                    type="number" 
                    id={`length${length}`} 
                    onChange={(e) => handleInputsControlChange(e, `length${length}`)} 
                />
                <div className="line"></div>
                <label htmlFor={`width${length}`} className="label">العرض:</label>
                <input 
                    value={control_all_inputs[`width${length}`] || ""} 
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
                <input onChange={onChange} id={idd} className="input" type="number" value={control_all_inputs[idd] || ""} />
            </div>
        )
    }
}