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

// The exported cover SVG contains a full-page black shadow layer from the design tool.
// Strip only that layer before rendering so it cannot appear as a dark frame in the PDF.
const loadCoverTemplate = async (src) => {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Could not load the execution PDF cover template.");
    const source = await response.text();
    const cleaned = source.replace(/<rect x="-144" width="1728" fill="#000000" y="-80\.999999" height="971\.999992" fill-opacity="0\.2"\/>/, "");
    const objectUrl = URL.createObjectURL(new Blob([cleaned], { type: "image/svg+xml" }));
    try {
        return await loadImage(objectUrl);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

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

const drawCroppedImage = (context, image, x, y, height, transform = {}, radius = 28) => {
    const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const cropX = Math.max(0, Math.min(75, numberOr(transform.cropX, 50)));
    const zoom = Math.max(1, Math.min(3, numberOr(transform.zoom, 1)));
    const positionX = Math.max(0, Math.min(100, numberOr(transform.positionX, 50))) / 100;
    const positionY = Math.max(0, Math.min(100, numberOr(transform.positionY, 50))) / 100;
    const croppedWidth = image.naturalWidth * (1 - cropX / 100);
    const initialX = (image.naturalWidth - croppedWidth) / 2;
    const sourceWidth = croppedWidth / zoom;
    const sourceHeight = image.naturalHeight / zoom;
    const availableX = Math.max(0, croppedWidth - sourceWidth);
    const availableY = Math.max(0, image.naturalHeight - sourceHeight);
    const sourceX = initialX + availableX * positionX;
    const sourceY = availableY * positionY;
    const renderedHeight = height;
    const renderedWidth = renderedHeight * (sourceWidth / sourceHeight);
    context.save();
    roundedRect(context, x, y, renderedWidth, renderedHeight, radius);
    context.clip();
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, renderedWidth, renderedHeight);
    context.restore();
};

const drawLabelValue = (context, label, value, y, valueX = 315) => {
    context.textBaseline = "middle";
    context.fillStyle = "#202020";
    context.textAlign = "left";
    context.direction = "ltr";
    context.font = "700 45px Arial";
    context.fillText(label, 100, y);
    context.font = "400 45px Arial";
    context.fillText(String(value || "—"), valueX, y);
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
    context.font = "700 55px Tajawal, Arial";
    context.textAlign = "center";
    context.direction = /[\u0600-\u06ff]/.test(text) ? "rtl" : "ltr";
    context.textBaseline = "middle";
    const lines = wrapLines(context, text, 620).slice(0, 17);
    const lineHeight = 60;
    const firstY = 650 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => context.fillText(line, 300, firstY + index * lineHeight, 560));
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

// أماكن وأحجام صور صفحة الصور. كل صورة لها X وY وHEIGHT فقط.
// العرض غير موجود هنا نهائيًا؛ يُحسب تلقائيًا من أبعاد الصورة الأصلية حتى لا تتمط.
// صف العدد 3 هو المستخدم حاليًا: صورة كبيرة يسار، وصورتان فوق بعض ناحية اليمين.
// قلّل X لتحريك الصورة يسارًا، وزِد Y لتحريكها لأسفل، وعدّل HEIGHT لتكبيرها مع الحفاظ على أبعادها الأصلية.
const galleryLayouts = {
    1: [{ x: 160, y: 100, height: 880 }],
    2: [{ x: 80, y: 100, height: 880 }, { x: 990, y: 100, height: 880 }],
    3: [{ x: 40, y: 190, height: 550 }, { x: 1300, y: 190, height: 550 }, { x: 670, y: 450, height: 550 }],
};

// تحكم الصورة الرئيسية في الصفحات 2 و3 و4 من هنا فقط.
// لا يوجد WIDTH: العرض محسوب تلقائيًا. عدّل x وy للمكان، وheight للحجم.
const MAIN_EXECUTION_IMAGE = { x: 850, y: 65, height: 950 };

export async function createExecutionPdf({ panelSize, steelThickness, paint, page3Text, page4Lines, assignments, transforms, images }) {
    await document.fonts?.ready;
    const [pageOne, contentPage, galleryPage, closingPage] = await Promise.all([
        loadCoverTemplate(pageOneTemplate), loadImage(contentPageTemplate), loadImage(galleryPageTemplate), loadImage(closingPageTemplate),
    ]);
    const sourceImages = {};
    for (const [fileId, source] of Object.entries(images || {})) sourceImages[fileId] = await loadImage(source);
    const assignedImage = (slot) => sourceImages[assignments?.[slot]];
    const assignedTransform = (fileId) => transforms?.[fileId] || {};
    const pages = [];
    pages.push(toJpegBytes(createCanvas(pageOne).canvas));

    const second = createCanvas(contentPage);
    if (assignedImage("page2")) drawCroppedImage(second.context, assignedImage("page2"), MAIN_EXECUTION_IMAGE.x, MAIN_EXECUTION_IMAGE.y, MAIN_EXECUTION_IMAGE.height, assignedTransform(assignments.page2), 28);
    drawLabelValue(second.context, "Panel size :", panelSize || "—", 480, 350);
    drawLabelValue(second.context, "Steel thickness :", `${steelThickness || "—"} mm`, 545, 470);
    drawLabelValue(second.context, "Paint :", paint || "Electrostatic paint", 610, 260);
    pages.push(toJpegBytes(second.canvas));

    const third = createCanvas(contentPage);
    if (assignedImage("page3")) drawCroppedImage(third.context, assignedImage("page3"), MAIN_EXECUTION_IMAGE.x, MAIN_EXECUTION_IMAGE.y, MAIN_EXECUTION_IMAGE.height, assignedTransform(assignments.page3), 28);
    drawPage3Text(third.context, page3Text);
    pages.push(toJpegBytes(third.canvas));

    const fourth = createCanvas(contentPage);
    if (assignedImage("page4")) drawCroppedImage(fourth.context, assignedImage("page4"), MAIN_EXECUTION_IMAGE.x, MAIN_EXECUTION_IMAGE.y, MAIN_EXECUTION_IMAGE.height, assignedTransform(assignments.page4), 28);
    const specificationLines = (page4Lines || []).filter(Boolean).slice(0, 8);
    fourth.context.fillStyle = "#202020";
    fourth.context.font = "500 45px Arial";
    fourth.context.textAlign = "left";
    fourth.context.direction = "ltr";
    specificationLines.forEach((line, index) => fourth.context.fillText(line, 100, 500 + index * 72, 700));
    pages.push(toJpegBytes(fourth.canvas));

    const fifth = createCanvas(galleryPage);
    const galleryIds = (assignments?.gallery || []).slice(0, 3);
    const gallery = galleryIds.map((fileId) => sourceImages[fileId]).filter(Boolean);
    const layout = galleryLayouts[Math.max(1, gallery.length)] || galleryLayouts[5];
    gallery.forEach((image, index) => {
        const position = layout[index];
        drawCroppedImage(fifth.context, image, position.x, position.y, position.height, assignedTransform(galleryIds[index]), 22);
    });
    pages.push(toJpegBytes(fifth.canvas));
    pages.push(toJpegBytes(createCanvas(closingPage).canvas));
    return createPdfBlob(pages);
}
