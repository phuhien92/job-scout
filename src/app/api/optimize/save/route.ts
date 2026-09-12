import { NextResponse } from "next/server";

import {
  readWorkingMemory,
  writeWorkingMemory,
} from "@/lib/working-memory/store";

export const runtime = "nodejs";

type Body = {
  title?: unknown;
  subtitle?: unknown;
  markdown?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: { code: "invalid-body" } }, { status: 400 });
  }

  const markdown = typeof body.markdown === "string" ? body.markdown.trim() : "";
  if (!markdown) {
    return NextResponse.json({ error: { code: "missing-markdown" } }, { status: 400 });
  }

  const memory = await readWorkingMemory();
  const name = memory.profile.name.trim();
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 160)
      : name
        ? `${name} Resume`
        : "Resume";
  const subtitle =
    typeof body.subtitle === "string" && body.subtitle.trim()
      ? body.subtitle.trim().slice(0, 160)
      : memory.profile.targetRole.trim() || memory.profile.titles[0] || "";

  memory.optimizedResume = {
    markdown: markdown.slice(0, 100_000),
    title,
    subtitle,
    savedAt: new Date().toISOString(),
  };
  await writeWorkingMemory(memory);

  return NextResponse.json({ optimizedResume: memory.optimizedResume });
}
