import { NextResponse } from "next/server";

import { extractProfile } from "@/lib/resume/extract";
import { extractTextFromBuffer } from "@/lib/resume/parse";
import {
  readWorkingMemory,
  writeWorkingMemory,
} from "@/lib/working-memory/store";
import type { ResumeFileType } from "@/lib/working-memory/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export type UploadErrorCode =
  | "missing-file"
  | "unsupported-format"
  | "file-too-large"
  | "unreadable";

function error(code: UploadErrorCode, status = 400) {
  return NextResponse.json({ error: { code } }, { status });
}

function detectFileType(fileName: string): ResumeFileType | null {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".txt")) return "txt";
  return null;
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error("missing-file", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return error("missing-file", 400);
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return error("unsupported-format", 415);
  }

  if (file.size > MAX_FILE_SIZE) {
    return error("file-too-large", 413);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return error("unreadable", 422);
  }

  let sourceText: string;
  try {
    sourceText = await extractTextFromBuffer(fileType, buffer);
  } catch {
    return error("unreadable", 422);
  }
  if (!sourceText.trim()) {
    return error("unreadable", 422);
  }

  const profile = extractProfile(sourceText);
  const memory = await readWorkingMemory();

  memory.resume = {
    fileName: file.name,
    fileType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    sourceText,
  };
  memory.profile = profile;
  await writeWorkingMemory(memory);

  return NextResponse.json(
    {
      resume: {
        fileName: memory.resume.fileName,
        fileType: memory.resume.fileType,
        size: memory.resume.size,
        uploadedAt: memory.resume.uploadedAt,
      },
      profile: memory.profile,
    },
    { status: 201 },
  );
}