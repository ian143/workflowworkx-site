/**
 * Basic PPTX text extraction.
 * PPTX files are ZIP archives containing XML slide files.
 * For production, consider a dedicated PPTX parser library.
 */
export async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  // Use dynamic import for JSZip-like extraction
  // For now, return a placeholder that indicates the file type
  // Production would use a dedicated PPTX parser
  const AdmZip = (await import("adm-zip")).default;

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const texts: string[] = [];

  for (const entry of entries) {
    if (entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)) {
      const content = entry.getData().toString("utf-8");
      // Extract text from XML tags <a:t>text</a:t>
      const matches = content.match(/<a:t>([^<]*)<\/a:t>/g);
      if (matches) {
        const slideText = matches
          .map((m) => m.replace(/<\/?a:t>/g, ""))
          .join(" ");
        texts.push(slideText);
      }
    }
  }

  return texts.join("\n\n");
}
