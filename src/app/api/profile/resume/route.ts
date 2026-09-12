import { NextResponse } from "next/server";

import { readWorkingMemory, writeWorkingMemory } from "@/lib/working-memory/store";

export const runtime = "nodejs";

export async function DELETE() {
  const memory = await readWorkingMemory();
  memory.resume = null;
  await writeWorkingMemory(memory);
  return NextResponse.json({ resume: null });
}