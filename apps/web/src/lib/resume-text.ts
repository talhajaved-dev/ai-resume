import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const supportedExtensions = new Set(["pdf", "docx", "txt"]);

function extensionOf(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" "),
    );
  }

  return pages.join("\n").trim();
}

async function extractDocxText(file: File) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value.trim();
}

export async function extractResumeText(file: File) {
  const extension = extensionOf(file.name);
  if (!supportedExtensions.has(extension)) {
    throw new Error(`${file.name} is not a supported PDF, DOCX, or TXT file.`);
  }

  const text =
    extension === "pdf"
      ? await extractPdfText(file)
      : extension === "docx"
        ? await extractDocxText(file)
        : (await file.text()).trim();

  if (!text) {
    throw new Error(
      `${file.name} contains no readable text. Scanned image-only files need OCR before screening.`,
    );
  }

  return text;
}