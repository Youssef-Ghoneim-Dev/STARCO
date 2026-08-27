import pageOneTemplate from "../assets/images/1 PDF.svg";
import contentPageTemplate from "../assets/images/2 PDF.svg";
import galleryPageTemplate from "../assets/images/3 PDF.svg";
import closingPageTemplate from "../assets/images/4 PDF.svg";

const PAGE_WIDTH = 1920;
const PAGE_HEIGHT = 1080;

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const createCanvas = (background) => {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const context = canvas.getContext("2d");
  context.drawImage(background, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  return { canvas, context };
};

const roundedRect = (context, x, y, width, height, radius = 28) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
};

const drawCroppedImage = (context, image, x, y, width, height, transform = {}, radius = 28) => {
  context.save();
  roundedRect(context, x, y, width, height, radius);
  context.clip();
  const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const cropX = Math.max(0, Math.min(75, numberOr(transform.cropX, 50)));
  const zoom = Math.max(1, Math.min(3, numberOr(transform.zoom, 1)));
  const positionX = Math.max(0, Math.min(100, numberOr(transform.positionX, 50))) / 100;
  const positionY = Math.max(0, Math.min(100, numberOr(transform.positionY, 50))) / 100;
  const croppedWidth = image.naturalWidth * (1 - cropX / 100);
  const initialX = (image.naturalWidth - croppedWidth) / 2;
  const targetRatio = width / height;
  let sourceWidth = croppedWidth / zoom;
  let sourceHeight = image.naturalHeight / zoom;
  if (sourceWidth / sourceHeight > targetRatio) sourceWidth = sourceHeight * targetRatio;
  else sourceHeight = sourceWidth / targetRatio;
  const availableX = Math.max(0, croppedWidth - sourceWidth);
  const availableY = Math.max(0, image.naturalHeight - sourceHeight);
  const sourceX = initialX + availableX * positionX;
  const sourceY = availableY * positionY;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
};

const drawLabelValue = (context, label, value, y) => {
  context.textBaseline = "middle";
  context.fillStyle = "#202020";
  context.textAlign = "left";
  context.direction = "ltr";
  context.font = "700 34px Arial";
  context.fillText(label, 62, y);
  context.font = "400 34px Arial";
  context.fillText(String(value || "—"), 315, y);
};

const wrapLines = (context, value, maxWidth) => {
  const paragraphs = String(value || "").split(/\r?\n/);
  const result = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return result.push("");
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        result.push(line);
        line = word;
      } else line = candidate;
    });
    if (line) result.push(line);
  });
  return result;
};

const drawPage3Text = (context, text) => {
  context.fillStyle = "#202020";
  context.font = "500 31px Tajawal, Arial";
  context.textAlign = "center";
  context.direction = /[\u0600-\u06ff]/.test(text) ? "rtl" : "ltr";
  context.textBaseline = "middle";
  const lines = wrapLines(context, text, 620).slice(0, 17);
  const lineHeight = 46;
  const firstY = 540 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => context.fillText(line, 380, firstY + index * lineHeight, 620));
};

const toJpegBytes = (canvas) => {
  const base64 = canvas.toDataURL("image/jpeg", 0.96).split(",")[1];
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};
const textBytes = (value) => new TextEncoder().encode(value);
const joinBytes = (chunks) => {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.length; });
  return output;
};

const createPdfBlob = (pageImages) => {
  const objectCount = 2 + pageImages.length * 3;
  const objects = new Array(objectCount + 1);
  const pageReferences = pageImages.map((_, index) => `${3 + index * 3} 0 R`);
  objects[1] = textBytes("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = textBytes(`<< /Type /Pages /Kids [${pageReferences.join(" ")}] /Count ${pageImages.length} >>`);
  pageImages.forEach((imageBytes, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const content = textBytes(`q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ`);
    objects[pageObject] = textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects[contentObject] = joinBytes([textBytes(`<< /Length ${content.length} >>\nstream\n`), content, textBytes("\nendstream")]);
    objects[imageObject] = joinBytes([textBytes(`<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`), imageBytes, textBytes("\nendstream")]);
  });
  const chunks = [textBytes("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = new Array(objectCount + 1).fill(0);
  let offset = chunks[0].length;
  for (let index = 1; index <= objectCount; index += 1) {
    offsets[index] = offset;
    const bytes = joinBytes([textBytes(`${index} 0 obj\n`), objects[index], textBytes("\nendobj\n")]);
    chunks.push(bytes); offset += bytes.length;
  }
  const xrefOffset = offset;
  chunks.push(textBytes(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`));
  for (let index = 1; index <= objectCount; index += 1) chunks.push(textBytes(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`));
  chunks.push(textBytes(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob([joinBytes(chunks)], { type: "application/pdf" });
};

const galleryLayouts = {
  1: [[160, 100, 1600, 880]],
  2: [[80, 100, 850, 880], [990, 100, 850, 880]],
  3: [[70, 80, 860, 920], [990, 80, 860, 430], [990, 570, 860, 430]],
  4: [[70, 70, 860, 450], [990, 70, 860, 450], [70, 560, 860, 450], [990, 560, 860, 450]],
  5: [[55, 65, 580, 440], [670, 65, 580, 440], [1285, 65, 580, 440], [210, 555, 720, 455], [990, 555, 720, 455]],
};

export async function createExecutionPdf({ panelSize, steelThickness, paint, page3Text, page4Lines, assignments, transforms, images }) {
  await document.fonts?.ready;
  const [pageOne, contentPage, galleryPage, closingPage] = await Promise.all([
    loadImage(pageOneTemplate), loadImage(contentPageTemplate), loadImage(galleryPageTemplate), loadImage(closingPageTemplate),
  ]);
  const sourceImages = {};
  for (const [fileId, source] of Object.entries(images || {})) sourceImages[fileId] = await loadImage(source);
  const assignedImage = (slot) => sourceImages[assignments?.[slot]];
  const assignedTransform = (fileId) => transforms?.[fileId] || {};
  const pages = [];
  pages.push(toJpegBytes(createCanvas(pageOne).canvas));

  const second = createCanvas(contentPage);
  if (assignedImage("page2")) drawCroppedImage(second.context, assignedImage("page2"), 785, 25, 1080, 1030, assignedTransform(assignments.page2));
  drawLabelValue(second.context, "Panel size :", panelSize || "—", 590);
  drawLabelValue(second.context, "Steel thickness :", `${steelThickness || "—"} mm`, 655);
  drawLabelValue(second.context, "Paint :", paint || "Electrostatic paint", 720);
  pages.push(toJpegBytes(second.canvas));

  const third = createCanvas(contentPage);
  if (assignedImage("page3")) drawCroppedImage(third.context, assignedImage("page3"), 785, 25, 1080, 1030, assignedTransform(assignments.page3));
  drawPage3Text(third.context, page3Text);
  pages.push(toJpegBytes(third.canvas));

  const fourth = createCanvas(contentPage);
  if (assignedImage("page4")) drawCroppedImage(fourth.context, assignedImage("page4"), 785, 25, 1080, 1030, assignedTransform(assignments.page4));
  const specificationLines = (page4Lines || []).filter(Boolean).slice(0, 8);
  fourth.context.fillStyle = "#202020";
  fourth.context.font = "500 36px Arial";
  fourth.context.textAlign = "center";
  fourth.context.direction = "ltr";
  specificationLines.forEach((line, index) => fourth.context.fillText(line, 385, 520 + index * 72, 650));
  pages.push(toJpegBytes(fourth.canvas));

  const fifth = createCanvas(galleryPage);
  const galleryIds = (assignments?.gallery || []).slice(0, 3);
  const gallery = galleryIds.map((fileId) => sourceImages[fileId]).filter(Boolean);
  const layout = galleryLayouts[Math.max(1, gallery.length)] || galleryLayouts[5];
  gallery.forEach((image, index) => drawCroppedImage(fifth.context, image, ...layout[index], assignedTransform(galleryIds[index]), 22));
  pages.push(toJpegBytes(fifth.canvas));
  pages.push(toJpegBytes(createCanvas(closingPage).canvas));
  return createPdfBlob(pages);
}
