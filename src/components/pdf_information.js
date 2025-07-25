import Button from "./button";
import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext.js";
import { pdf } from "@react-pdf/renderer";
import MyDocument, { Pdf } from "../pdf/pdf_render.js";

export default function RenderPdfInformation() {
  const Thickness = [0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.8, 2, 2.5, 3];
  const percentages = ["15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%"];
  const {
    selectedThickness,
    setSelectedThickness,
    selectedPercentage,
    setSelectedPercentage,
    clientName,
    setClientName,
    plateName,
    setPlateName,
    price2,
    setSelectedbuyer,
    selectedbuyer,
  } = useContext(ControlAllInputsContext);
  const canSubmit = selectedThickness.length > 0 && selectedPercentage !== "" && clientName !== "" && plateName !== "";
  const handleThicknessChange = (value) => {
    setSelectedThickness((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (selectedThickness.length > 0 && selectedPercentage !== "" && clientName !== "" && plateName !== "") {
      const blob = await pdf(
        <MyDocument
          selectedThickness={selectedThickness}
          price2={price2}
          clientName={clientName}
          plateName={plateName}
        />
      ).toBlob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `STARCO ${clientName}.pdf`;
      link.click();
    }
  };

  return (
    <div className="flex_column">
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

      <div className="flex_row">
        <h3>السعر بالنسبة :</h3>
        <p>*ملحوظة لا يمكنك اختيار أكثر من اختيار</p>
      </div>

      <div className="flex_row_check dir">
        {percentages.map((item, index) => (
          <label key={index} className="weight-checkbox-label">
            <input
              type="radio"
              className="weight-checkbox-input"
              name="percentages"
              value={item}
              checked={selectedPercentage === item}
              onChange={() => setSelectedPercentage(item)}
            />
            <span className="checkmark"></span>
            {item}
          </label>
        ))}
      </div>
      <div className="flex_col dir">
        <h3>المشتري  :</h3>
          <label className="weight-checkbox-label">
            <input
              type="radio"
              className="weight-checkbox-input"
              name="kind"
              value="السادة"
              checked={selectedbuyer === "السادة"}
              onChange={() => setSelectedbuyer("السادة")}
            />
            <span className="checkmark"></span>
            شركة
          </label>
          <label className="weight-checkbox-label">
            <input
              type="radio"
              className="weight-checkbox-input"
              name="kind"
              value="السيد"
              checked={selectedbuyer === "السيد"}
              onChange={() => setSelectedbuyer("السيد")}
            />
            <span className="checkmark"></span>
            عميل
          </label>
      </div>

      <div className="flex_row">
        <div className="pricing-input-div">
          <div className="piece-div">
            <span className="piece">اسم العميل</span>
          </div>
          <div className="line"></div>
          <input
            className="input"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        <div className="pricing-input-div">
          <div className="piece-div">
            <span className="piece">اسم اللوحة</span>
          </div>
          <div className="line"></div>
          <input
            className="input"
            type="text"
            value={plateName}
            onChange={(e) => setPlateName(e.target.value)}
          />
        </div>
      </div>
        <div className="flex_row_pdf">
            <Button onClick={handleSubmit} text="اصنع الملف" class_pram={`btn_sign_in ${!canSubmit ? "disabled" : ""}`} />
            <Pdf />
        </div>
    </div>
  );
}
