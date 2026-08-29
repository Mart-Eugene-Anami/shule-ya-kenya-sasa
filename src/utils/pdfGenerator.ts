import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PdfOptions {
  filename?: string;
  margin?: number; // mm
  orientation?: "portrait" | "landscape";
  format?: string | [number, number];
}

async function elementToPdf(element: HTMLElement, opt: PdfOptions): Promise<jsPDF> {
  const orientation = opt.orientation || "portrait";
  const format = opt.format || "a4";
  const margin = opt.margin ?? 10;

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pdf = new jsPDF({ unit: "mm", format, orientation });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }
  return pdf;
}

/** Render HTML string to a downloaded PDF file. */
export async function downloadHtmlAsPdf(html: string, opt: PdfOptions): Promise<void> {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  document.body.appendChild(container);
  try {
    const pdf = await elementToPdf(container, opt);
    pdf.save(opt.filename || "document.pdf");
  } finally {
    document.body.removeChild(container);
  }
}

/** Render HTML string to a PDF Blob. */
export async function htmlToPdfBlob(html: string, opt: PdfOptions): Promise<Blob> {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  document.body.appendChild(container);
  try {
    const pdf = await elementToPdf(container, opt);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

/** Render an existing HTMLElement to a downloaded PDF file. */
export async function downloadElementAsPdf(element: HTMLElement, opt: PdfOptions): Promise<void> {
  const pdf = await elementToPdf(element, opt);
  pdf.save(opt.filename || "document.pdf");
}

/** Render an existing HTMLElement to a PDF Blob. */
export async function elementToPdfBlob(element: HTMLElement, opt: PdfOptions): Promise<Blob> {
  const pdf = await elementToPdf(element, opt);
  return pdf.output("blob");
}
