import PricingInput from './pricing_input';
import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
export default function RenderSagPrice() {
    const { handleInputChange } = useContext(ControlAllInputsContext);
    return (
            <div className="pricing-inputs">
                <PricingInput idd="sag_price" piece={"سعر الصاج"} information={false} onChange={(e) => handleInputChange(e, "sag_price")}/>
                <PricingInput idd="paint_price" piece={"سعر الدهان"} information={false} onChange={(e) => handleInputChange(e, "paint_price")}/>
            </div>
    );
}
