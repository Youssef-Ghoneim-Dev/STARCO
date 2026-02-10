import Button from "./button";
import { useContext, useState } from "react";
import { AppContext } from '../context/AppContext';
import { pdf } from "@react-pdf/renderer";
import MyDocument from "../pdf/pdf_render.js";
import Thickness from "./Thickness.js";
import Ratio from "./ratio.js";
import Kind from "./kind.js";
import ClientName from "./clientName.js";
import PlateName from "./plateName.js";
import { useNavigate } from "react-router-dom";
export default function RenderPdfInformation() {
  const [generatePdf, setGeneratePdf] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
const {
    selectedThickness,
    setSelectedThickness,
    selectedPercentage,
    setSelectedPercentage,
    clientName,
    setClientName,
    plateName,
    setPlateName,
    price2,setPrice2,
    setSelectedBuyer,
    selectedBuyer
  } = useContext(AppContext);

  const canSubmit =
    selectedThickness.length > 0 &&
    selectedPercentage !== "" &&
    clientName !== "" &&
    plateName !== "";

  let localStorag = JSON.parse(localStorage.getItem("user_meta"));

  const generatePdfBlob = async () => {
    return await pdf(
      <MyDocument
        selectedThickness={selectedThickness.sort((a, b) => Number(a) - Number(b))}
        price2={price2}
        clientName={clientName}
        plateName={plateName}
        selectedBuyer={selectedBuyer}
        fontSize={plateName.length > 10 ? 30 : 45}
      />
    ).toBlob();
  };

  const startLoading = async () => {
    setIsGenerating(true);
    setProgress(0);

    const duration = 5000;
    const intervalTime = 100;
    const increment = 100 / (duration / intervalTime);

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

    await new Promise((resolve) => setTimeout(resolve, duration));
  };

  const openWhatsapp = () => {
    if (localStorag.who_are_you === "Engineer") {
      window.open("http://wa.me/+201092131323", "_blank");
    } else {
      window.open("http://wa.me/+201050156113", "_blank");
    }
  };

  const handleSubmit = async () => {
    if (!generatePdf) {
      await startLoading();
    }
    const updatedPrices = selectedThickness.map((thickness) => {
      const el = document.getElementById(`all_${thickness}_sagprice_with_${selectedPercentage}`);
      return el ? el.textContent : null;
    });
    setPrice2(updatedPrices);
    const blob = await generatePdfBlob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `STARCO ${clientName}.pdf`;
    openWhatsapp();
    link.click();
    setGeneratePdf(true);
    setIsGenerating(false);
    setProgress(0);
    navigate("/home_price");
  };

  const handleGeneratePdf = async () => {
    await startLoading();
    const updatedPrices = selectedThickness.map((thickness) => {
      const el = document.getElementById(`all_${thickness}_sagprice_with_${selectedPercentage}`);
      return el ? el.textContent : null;
    });
    setPrice2(updatedPrices);
    const blob = await generatePdfBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setGeneratePdf(true);
    setIsGenerating(false);
    setProgress(0);
  };

  return (
    <div className="flex_column">
        <Thickness selectedThickness={selectedThickness} setSelectedThickness={setSelectedThickness} />
        <Ratio selectedPercentage={selectedPercentage} setSelectedPercentage={setSelectedPercentage} />
        <Kind selectedBuyer={selectedBuyer} setSelectedBuyer={setSelectedBuyer} />
      <div className="flex_row">
        <ClientName clientName={clientName} setClientName={setClientName} />
        <PlateName plateName={plateName} setPlateName={setPlateName} />
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
