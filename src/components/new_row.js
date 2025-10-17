import Button from "./button";
export default function NewRow() {
    return(
        <div className="centered-container">
            <div className="flex_row_pdf">
                <Button text="New Panal" class_pram="btn_Pdf" />
                <Button text="New Page" class_pram="btn_Pdf" />
            </div>
        </div>
    )
}