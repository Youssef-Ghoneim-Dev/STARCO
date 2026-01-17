import Button from "./button";
import { useContext, useState } from "react";
import { AppContext } from '../context/AppContext';

import { pdf } from "@react-pdf/renderer";
import MyDocument from "../pdf/pdf_render.js";
export default function RenderPdfInformation() {
  const Thickness = [0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.8, 2, 2.5, 3];
  const percentages = ["15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%"];
  const [generatePdf, setGeneratePdf] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
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
    setSelectedBuyer,
    selectedBuyer,
  } = useContext(AppContext);
  const canSubmit = selectedThickness.length > 0 && selectedPercentage !== "" && clientName !== "" && plateName !== "";
  const handleThicknessChange = (value) => {
    setSelectedThickness((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };
  let localStorag = JSON.parse(localStorage.getItem("user_meta"));
  const handleSubmit = async () => {
    if (generatePdf) {
    const blob = await pdf(
        <MyDocument
            selectedThickness={selectedThickness.sort((a, b) => Number(a) - Number(b))}
            price2={price2}
            clientName={clientName}
            plateName={plateName}
            selectedBuyer={selectedBuyer}
            fontSize={plateName.length > 10 ? 30 : 45}
        />
      ).toBlob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      if (localStorag.who_are_you === "Engineer") {
        window.open("http://wa.me/+201092131323", "_blank");
      }else{
        window.open("http://wa.me/+201050156113", "_blank");
      }
      link.download = `STARCO ${clientName}.pdf`;
      link.click();
    }else{
        setIsGenerating(true);
        setProgress(0);
        
        const duration = 5000;
        const intervalTime = 100;
        const steps = duration / intervalTime;
        const increment = 100 / steps;

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += increment;
            if (currentProgress >= 100) {
            clearInterval(interval);
            setProgress(100);
            } else {
            setProgress(currentProgress);
            }
        } , intervalTime);
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await delay(duration);
            const blob = await pdf(
        <MyDocument
            selectedThickness={selectedThickness.sort((a, b) => Number(a) - Number(b))}
            price2={price2}
            clientName={clientName}
            plateName={plateName}
            selectedBuyer={selectedBuyer}
            fontSize={plateName.length > 10 ? 30 : 45}
        />
      ).toBlob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      if (localStorag.who_are_you === "Engineer") {
        window.open("http://wa.me/+201092131323", "_blank");
      }else{
        window.open("http://wa.me/+201050156113", "_blank");
      }
      link.download = `STARCO ${clientName}.pdf`;
      link.click();
      setGeneratePdf(true)
        setIsGenerating(false);   
        setProgress(0);
    }

  };
const handleGeneratePdf = async () => {
  setIsGenerating(true);
  setProgress(0);

  const duration = 5000;
  const intervalTime = 100;
  const steps = duration / intervalTime;
  const increment = 100 / steps;

  let currentProgress = 0;
    
  const interval = setInterval(() => {
    currentProgress += increment;
    if (currentProgress >= 100) {
      clearInterval(interval);
      setProgress(100);
    } else {
      setProgress(currentProgress);
    }
  }, intervalTime);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  await delay(duration);
  const blob = await pdf(
    <MyDocument
      selectedThickness={selectedThickness.sort((a, b) => Number(a) - Number(b))}
      price2={price2}
      clientName={clientName}
      plateName={plateName}
      selectedBuyer={selectedBuyer}
      fontSize={plateName.length > 10 ? 30 : 45}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setGeneratePdf(true);
  setIsGenerating(false);   
  setProgress(0);
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
              checked={selectedBuyer === "السادة"}
              onChange={() => setSelectedBuyer("السادة")}
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
              checked={selectedBuyer === "السيد"}
              onChange={() => setSelectedBuyer("السيد")}
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
            <Button onClick={handleSubmit} text="Download PDF" class_pram={`btn_Pdf ${!canSubmit ? "disabled" : ""}`} />
            <Button onClick={handleGeneratePdf} text="Generate PDF" id="generate-pdf-btn" class_pram={`btn_Pdf  ${!canSubmit ? "disabled" : ""}`} />
        </div>
        {isGenerating && (
        <div className="loading-overlay">
            <div className="loading-container">
                <div className="spinner"><p>{Math.round(progress)}%</p></div>
                <div className="loading-text2">Generating PDF<div className="dots-loader"><span></span><span></span><span></span></div></div>
            </div>
        </div>
        )}

    </div>
  );
}
