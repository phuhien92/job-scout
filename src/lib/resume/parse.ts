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
        const decoded = new TextDecoder("utf-8").decode(buffer);
        if (!isLikelyPlainText(decoded)) throw new ResumeParseError("unreadable");
        return normalize(decoded);
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

function isLikelyPlainText(text: string): boolean {
  let replacement = 0;
  let control = 0;
  let content = 0;
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (char === "\uFFFD") {
      replacement += 1;
    } else if (
      (code < 0x20 && char !== "\n" && char !== "\r" && char !== "\t") ||
      (code >= 0x80 && code <= 0x9f)
    ) {
      control += 1;
    } else if (!/\s/.test(char)) {
      content += 1;
    }
  }
  if (content === 0) return false;
  return replacement / content <= 0.02 && control / content <= 0.03;
}