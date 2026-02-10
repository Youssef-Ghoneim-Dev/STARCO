import { getDoc, doc } from "firebase/firestore";
import db from "../firebase";
export default async function price({ th_table , piece }) {
    const controlAllInputs = {};
  const controlRef = doc(db, "panalDetails", (await getDoc(doc(db, "counters", "panels"))).data().numberNaw.toString());
  const docSnap = await getDoc(controlRef);
  const localData = docSnap.data().Panels.RawMaterialPrices;
  const controlSnap = await getDoc(controlRef);
  const controlData = controlSnap.data();
    for (let i = 0; i < piece.length; i++) {
        controlAllInputs[`width${i}`] = controlData?.Panels?.Lengths?.[`width${i}`] || "";
        controlAllInputs[`length${i}`] = controlData?.Panels?.Lengths?.[`length${i}`] || "";
    }
  
  const additional_price = document.getElementById("additional_price");
  const Thickness = [0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.8, 2, 2.5, 3];
  const Density = 7.85;
  const melion = 1000000;
  const length_input = [];
  const width_input = [];
  for (let i = 0; i < piece.length; i++) {
    let length = parseFloat(controlAllInputs[`length${i}`]) || 0;
    let width = parseFloat(controlAllInputs[`width${i}`]) || 0;
    length_input.push(length);
    width_input.push(width);
  }
  let totaladds =0;
  for (let index = 0; index < th_table.length; index++) {
    let adds = parseFloat(localData[th_table[index]]) || 0;
    totaladds += adds
  };
  Thickness.forEach((thickness, index) => {
    let totalWeight = 0;
    for (let i = 0; i < length_input.length; i++) {
        if (i===5 || i===6) {
            if (thickness<1) {
                totalWeight += ((length_input[i] * width_input[i] * 1 * Density) / melion) * 1.15;
            }else{
                totalWeight += ((length_input[i] * width_input[i] * thickness * Density) / melion) * 1.15;
            }
        }else if (i===4) {
           totalWeight += (((length_input[i] * width_input[i] * thickness * Density) / melion) * 1.15) * 2;
        }else{
            totalWeight += ((length_input[i] * width_input[i] * thickness * Density) / melion) * 1.15;
        }
    }
    let weightElement = document.getElementById(`all_${thickness}_wheight`);
    let sagPriceElement = document.getElementById(`all_${thickness}_sagprice_without`);
    if (weightElement) weightElement.textContent = totalWeight.toFixed(2);
    if (sagPriceElement) sagPriceElement.textContent = (totalWeight * localData.sag_price).toFixed(2);
  });
  Thickness.forEach((thickness, index) => {
    let totalWeight = 0;
    for (let i = 0; i < length_input.length; i++) {
        if (i===5 || i===6) {
            if (thickness<1) {
                totalWeight += ((length_input[i] * width_input[i] * 1 * Density) / melion) * 1.15;
            }else{
                totalWeight += ((length_input[i] * width_input[i] * thickness * Density) / melion) * 1.15;
            }
        }else if (i===4) {
           totalWeight += (((length_input[i] * width_input[i] * thickness * Density) / melion) * 1.15) * 2;
        }else{
            totalWeight += ((length_input[i] * width_input[i] * thickness * Density) / melion) * 1.15;
        }
    }
    let sagprice_withElement = document.getElementById(`all_${thickness}_sagprice_with`);
    let sagprice_15_withElement = document.getElementById(`all_${thickness}_sagprice_with_15%`);
    let sagprice_20_withElement = document.getElementById(`all_${thickness}_sagprice_with_20%`);
    let sagprice_25_withElement = document.getElementById(`all_${thickness}_sagprice_with_25%`);
    let sagprice_30_withElement = document.getElementById(`all_${thickness}_sagprice_with_30%`);
    let sagprice_35_withElement = document.getElementById(`all_${thickness}_sagprice_with_35%`);
    let sagprice_40_withElement = document.getElementById(`all_${thickness}_sagprice_with_40%`);
    let sagprice_45_withElement = document.getElementById(`all_${thickness}_sagprice_with_45%`);
    let sagprice_50_withElement = document.getElementById(`all_${thickness}_sagprice_with_50%`);
    let sagprice_55_withElement = document.getElementById(`all_${thickness}_sagprice_with_55%`);
    let sagprice_60_withElement = document.getElementById(`all_${thickness}_sagprice_with_60%`);
    let price = totalWeight * localData.sag_price;
    let eltamter = 0;
    for (let i = 0; i < length_input.length; i++) {
        eltamter += ((length_input[i] * width_input[i]) / melion) * 2;
    }   
    let eldehanprice = (eltamter * parseFloat(localData.paint_price)) / 3;
    let result = 0;   
    if (totalWeight !== 0) {
      result = price + totaladds + eldehanprice;
    }
    if (sagprice_withElement) sagprice_withElement.textContent = Math.round(((Math.ceil(result)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_15_withElement) sagprice_15_withElement.textContent = Math.round(((Math.ceil(result * 1.15)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_20_withElement) sagprice_20_withElement.textContent = Math.round(((Math.ceil(result * 1.20)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_25_withElement) sagprice_25_withElement.textContent = Math.round(((Math.ceil(result * 1.25)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_30_withElement) sagprice_30_withElement.textContent = Math.round(((Math.ceil(result * 1.30)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_35_withElement) sagprice_35_withElement.textContent = Math.round(((Math.ceil(result * 1.35)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_40_withElement) sagprice_40_withElement.textContent = Math.round(((Math.ceil(result * 1.40)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_45_withElement) sagprice_45_withElement.textContent = Math.round(((Math.ceil(result * 1.45)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_50_withElement) sagprice_50_withElement.textContent = Math.round(((Math.ceil(result * 1.50)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_55_withElement) sagprice_55_withElement.textContent = Math.round(((Math.ceil(result * 1.55)) + Number(additional_price.value)) / 10) * 10;
    if (sagprice_60_withElement) sagprice_60_withElement.textContent = Math.round(((Math.ceil(result * 1.60)) + Number(additional_price.value)) / 10) * 10;
  });
}