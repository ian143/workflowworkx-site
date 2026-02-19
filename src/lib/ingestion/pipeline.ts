import { extractTextFromPdf } from "./pdf";
import { extractTextFromDocx } from "./docx";
import { extractTextFromPptx } from "./pptx";

export type FileType = "pdf" | "docx" | "pptx" | "txt" | "image";

export async function extractText(
  buffer: Buffer,
  fileType: FileType
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractTextFromPdf(buffer);
    case "docx":
      return extractTextFromDocx(buffer);
    case "pptx":
      return extractTextFromPptx(buffer);
    case "txt":
      return buffer.toString("utf-8");
    case "image":
      return ""; // Images don't have extractable text (OCR would go here)
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
