import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

import type { ResumeFileType } from "@/lib/working-memory/types";

export class ResumeParseError extends Error {}

export async function extractTextFromBuffer(
  fileType: ResumeFileType,
  buffer: Buffer,
): Promise<string> {
  try {
    switch (fileType) {
      case "pdf": {
        const parser = new PDFParse({ data: buffer });
        try {
          const result = await parser.getText();
          return normalize(result.text);
        } finally {
          await parser.destroy();
        }
      }
      case "docx": {
        const result = await mammoth.extractRawText({ buffer });
        return normalize(result.value);
      }
      case "txt": {
        return normalize(new TextDecoder("utf-8").decode(buffer));
      }
    }
  } catch {
    throw new ResumeParseError("unreadable");
  }
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}