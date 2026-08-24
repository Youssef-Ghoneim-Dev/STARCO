import coverImage from "../assets/images/1.svg";
import pricesImage from "../assets/images/2.svg";
import closingImage from "../assets/images/3.svg";
import { getPriceTableRows, sortThicknesses } from "./priceCalculator";

const PAGE_WIDTH = 1920;
const PAGE_HEIGHT = 1080;
const PANELS_PER_PAGE = 3;
const PANEL_TABLE_ROW_HEIGHT = 140;
const SINGLE_TABLE_ROW_HEIGHT = 220;
const PANEL_TABLE_GAP = 25;

// عدّل الإحداثيات من هنا إذا احتاج نص الغلاف إلى تحريك.
const COVER_TEXT_POSITION = { x: 1160, y: 625 };

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const createPageCanvas = (background) => {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;

  const context = canvas.getContext("2d");
  context.drawImage(background, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  return { canvas, context };
};

const toJpegBytes = (canvas) => {
  const base64 = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const textBytes = (value) => new TextEncoder().encode(value);

const joinBytes = (chunks) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });

  return bytes;
};

const createPdfBlob = (pageImages) => {
  const objectCount = 2 + pageImages.length * 3;
  const objects = new Array(objectCount + 1);
  const pageReferences = pageImages.map((_, index) => `${3 + index * 3} 0 R`);

  objects[1] = textBytes("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = textBytes(
    `<< /Type /Pages /Kids [${pageReferences.join(" ")}] /Count ${pageImages.length} >>`,
  );

  pageImages.forEach((imageBytes, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const content = textBytes(
      `q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ`,
    );

    objects[pageObject] = textBytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
    );
    objects[contentObject] = joinBytes([
      textBytes(`<< /Length ${content.length} >>\nstream\n`),
      content,
      textBytes("\nendstream"),
    ]);
    objects[imageObject] = joinBytes([
      textBytes(
        `<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
      ),
      imageBytes,
      textBytes("\nendstream"),
    ]);
  });

  const chunks = [textBytes("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = new Array(objectCount + 1).fill(0);
  let offset = chunks[0].length;

  for (let index = 1; index <= objectCount; index += 1) {
    offsets[index] = offset;
    const objectBytes = joinBytes([
      textBytes(`${index} 0 obj\n`),
      objects[index],
      textBytes("\nendobj\n"),
    ]);
    chunks.push(objectBytes);
    offset += objectBytes.length;
  }

  const xrefOffset = offset;
  const xref = [textBytes(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`)];
  for (let index = 1; index <= objectCount; index += 1) {
    xref.push(textBytes(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`));
  }
  chunks.push(...xref);
  chunks.push(
    textBytes(
      `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    ),
  );

  return new Blob([joinBytes(chunks)], { type: "application/pdf" });
};

const hasArabic = (value) => /[\u0600-\u06FF]/.test(value);

// يعزل الأرقام عن اتجاه النص المحيط بها حتى تظل الأبعاد بترتيب كتابتها.
const preserveMixedDirection = (value) => String(value || "---")
  .replace(/\d+(?:[.,]\d+)?/g, (number) => `\u2066${number}\u2069`);

const drawPanelName = (context, name, x, y, width, height, initialFontSize = 30) => {
  const words = String(name || "---").split(/\s+/);
  let fontSize = initialFontSize;
  let lines = [];

  while (fontSize >= 18) {
    context.font = `500 ${fontSize}px Tajawal`;
    lines = words.reduce(
      (result, word) => {
        const currentLine = result[result.length - 1];
        if (!currentLine) {
          result[result.length - 1] = word;
          return result;
        }
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (context.measureText(candidate).width <= width - 28) {
          result[result.length - 1] = candidate;
        } else {
          result.push(word);
        }
        return result;
      },
      [""],
    );

    if (lines.length <= 2) break;
    fontSize -= 2;
  }

  const visibleLines = lines.slice(0, 2);
  const lineHeight = fontSize * 1.2;
  const firstLineY = y + height / 2 - ((visibleLines.length - 1) * lineHeight) / 2;

  context.direction = hasArabic(name) ? "rtl" : "ltr";
  context.textAlign = "center";
  context.fillStyle = "#111111";
  context.font = `500 ${fontSize}px Tajawal`;
  visibleLines.forEach((line, index) => {
    context.fillText(
      preserveMixedDirection(line),
      x + width / 2,
      firstLineY + index * lineHeight,
    );
  });
};

const drawPanelTable = (
  context,
  panel,
  prices,
  profitPercentage,
  copperConfiguration,
  top,
  isSingleTable,
) => {
  const rows = getPriceTableRows(panel, prices, profitPercentage, copperConfiguration);
  const priceRows = rows.filter((row) => row.price !== null);
  const horizontalPadding = isSingleTable ? 90 : 150;
  const nameWidth = 280;
  const finalPriceWidth = 200;
  const tableWidth = PAGE_WIDTH - horizontalPadding * 2;
  const priceWidth =
    (tableWidth - nameWidth - finalPriceWidth) / Math.max(priceRows.length, 1);
  const rowHeight = isSingleTable
    ? SINGLE_TABLE_ROW_HEIGHT
    : PANEL_TABLE_ROW_HEIGHT;
  const thicknessFont =
    priceRows.length > 6
      ? `700 ${isSingleTable ? 28 : 24}px Tajawal`
      : `700 ${isSingleTable ? 42 : 34}px Tajawal`;
  const valueFont = isSingleTable ? "400 52px Tajawal" : "400 42px Tajawal";
  const finalPriceFont = isSingleTable ? "700 44px Tajawal" : "700 36px Tajawal";
  const left = horizontalPadding;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 5;
  context.strokeStyle = "#FFFFFF";

  const drawCell = (x, y, width, height, fill, text, font, color) => {
    context.fillStyle = fill;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.fillStyle = color;
    context.font = font;
    context.fillText(text, x + width / 2, y + height / 2);
  };

  drawCell(
    left,
    top,
    nameWidth,
    rowHeight,
    "#355F7A",
    "Name",
    isSingleTable ? "700 46px Tajawal" : "700 38px Tajawal",
    "#FFFFFF",
  );
  drawCell(
    left,
    top + rowHeight,
    nameWidth,
    rowHeight,
    "#A1CADA",
    "",
    "700 30px Tajawal",
    "#111111",
  );
  drawPanelName(
    context,
    panel.panelName,
    left,
    top + rowHeight,
    nameWidth,
    rowHeight,
    isSingleTable ? 38 : 30,
  );
  drawCell(
    left + nameWidth,
    top,
    finalPriceWidth,
    rowHeight * 2,
    "#355F7A",
    "",
    "700 36px Tajawal",
    "#FFFFFF",
  );

  context.fillStyle = "#FFFFFF";
  context.font = finalPriceFont;
  const finalPriceCenterX = left + nameWidth + finalPriceWidth / 2;
  const finalPriceCenterY = top + rowHeight;
  const finalPriceOffset = isSingleTable ? 29 : 24;
  context.fillText("Final", finalPriceCenterX, finalPriceCenterY - finalPriceOffset);
  context.fillText("price", finalPriceCenterX, finalPriceCenterY + finalPriceOffset);

  priceRows.forEach((row, index) => {
    const x = left + nameWidth + finalPriceWidth + index * priceWidth;
    drawCell(
      x,
      top,
      priceWidth,
      rowHeight,
      "#355F7A",
      `${row.thickness} mm`,
      thicknessFont,
      "#FFFFFF",
    );
    drawCell(
      x,
      top + rowHeight,
      priceWidth,
      rowHeight,
      "#A1CADA",
      String(row.price),
      valueFont,
      "#111111",
    );
  });
};

const drawCoverText = (context, client) => {
  const clientPrefix = client.type === "company" ? "السادة" : "السيد";
  const text = `${clientPrefix} / ${client.name}`;
  const maxWidth = 620;
  const horizontalPadding = 28;
  const verticalPadding = 22;
  let fontSize = 44;
  while (fontSize >= 18) {
    context.font = `700 ${fontSize}px Tajawal`;
    if (context.measureText(text).width <= maxWidth - horizontalPadding * 2) break;
    fontSize -= 2;
  }

  context.font = `700 ${fontSize}px Tajawal`;
  const boxWidth = Math.max(
    180,
    context.measureText(text).width + horizontalPadding * 2,
  );
  const boxHeight = fontSize + verticalPadding * 2;
  const boxX = COVER_TEXT_POSITION.x - boxWidth;
  const boxY = COVER_TEXT_POSITION.y - boxHeight / 2;
  const textY = COVER_TEXT_POSITION.y + 7;

  context.save();
  context.direction = "rtl";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillStyle = "#355f7a";
  context.beginPath();
  context.roundRect(boxX, boxY, boxWidth, boxHeight, 18);
  context.fill();
  context.fillStyle = "#FFFFFF";
  context.font = `700 ${fontSize}px Tajawal`;
  context.fillText(text, COVER_TEXT_POSITION.x - horizontalPadding, textY);
  context.restore();
};

const prioritizePanelsByThicknessCount = (panels) => {
  const groupedPanels = new Map();

  panels.forEach((panel) => {
    const thicknessCount = sortThicknesses(panel.thickness || []).length;
    const group = groupedPanels.get(thicknessCount) || [];
    group.push(panel);
    groupedPanels.set(thicknessCount, group);
  });

  return Array.from(groupedPanels.values()).flatMap((group) => {
    const pages = [];
    for (let index = 0; index < group.length; index += PANELS_PER_PAGE) {
      pages.push(group.slice(index, index + PANELS_PER_PAGE));
    }
    return pages;
  });
};

const createProjectPageCanvases = async ({ project, prices, copperConfiguration }) => {
  const [cover, pricesBackground, closing] = await Promise.all([
    loadImage(coverImage),
    loadImage(pricesImage),
    loadImage(closingImage),
    document.fonts.ready,
  ]);
  const pages = [];
  const coverPage = createPageCanvas(cover);
  drawCoverText(coverPage.context, project.client);
  pages.push(coverPage.canvas);

  const panelGroups = prioritizePanelsByThicknessCount(project.panels);

  panelGroups.forEach((panelGroup) => {
    const page = createPageCanvas(pricesBackground);
    const isSingleTable = panelGroup.length === 1;
    const rowHeight = isSingleTable
      ? SINGLE_TABLE_ROW_HEIGHT
      : PANEL_TABLE_ROW_HEIGHT;
    const groupHeight =
      panelGroup.length * rowHeight * 2 +
      (panelGroup.length - 1) * PANEL_TABLE_GAP;
    const top = (PAGE_HEIGHT - groupHeight) / 2;

    panelGroup.forEach((panel, index) => {
      drawPanelTable(
        page.context,
        panel,
        prices,
        project.client.profitPercentage,
        copperConfiguration,
        top + index * (rowHeight * 2 + PANEL_TABLE_GAP),
        isSingleTable,
      );
    });
    pages.push(page.canvas);
  });

  const closingPage = createPageCanvas(closing);
  pages.push(closingPage.canvas);

  return pages;
};

export const createProjectPdf = async (options) => {
  const pages = await createProjectPageCanvases(options);
  return createPdfBlob(pages.map(toJpegBytes));
};

export const createProjectPreviewImages = async (options) => {
  const pages = await createProjectPageCanvases(options);
  return pages.map((page) => page.toDataURL("image/jpeg", 0.95));
};

export const getProjectPdfFilename = (project) => {
  const clientName = project.client.name.trim();
  const firstPanelName = project.panels[0]?.panelName?.trim() || "لوحة 1";
  return `STARCO ${clientName} (${firstPanelName}).pdf`;
};
