import Button from "./button";
import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
export default function NewRow() {
    const { handle3D } = useContext(ControlAllInputsContext);
    return(
        <div className="centered-container">
            <div className="lockdiv"></div>
            <div className="flex_row_pdf">
                <Button text="New Panal" onClick={handle3D} class_pram="btn_Pdf" />
                <Button text="New Page" onClick={handle3D} class_pram="btn_Pdf" />
            </div>
        </div>
    )
}
// {ClickFunPanal,ClickFunPage}