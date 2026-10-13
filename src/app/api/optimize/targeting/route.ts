import { NextResponse } from "next/server";

import {
  readWorkingMemory,
  writeWorkingMemory,
} from "@/lib/working-memory/store";

export const runtime = "nodejs";

type Body = {
  targetRole?: unknown;
  targetIndustry?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: { code: "invalid-body" } }, { status: 400 });
  }

  const memory = await readWorkingMemory();
  const profile = { ...memory.profile };

  if ("targetRole" in body) {
    profile.targetRole =
      typeof body.targetRole === "string" ? body.targetRole.trim().slice(0, 120) : "";
    if (profile.targetRole && !profile.targetRoles.includes(profile.targetRole)) {
      profile.targetRoles = [profile.targetRole, ...profile.targetRoles].slice(0, 60);
    }
  }

  if ("targetIndustry" in body) {
    profile.targetIndustry =
      typeof body.targetIndustry === "string"
        ? body.targetIndustry.trim().slice(0, 120)
        : "";
  }

  memory.profile = profile;
  await writeWorkingMemory(memory);

  return NextResponse.json({
    targetRole: memory.profile.targetRole,
    targetIndustry: memory.profile.targetIndustry,
  });
}
