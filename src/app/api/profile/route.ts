import { NextResponse } from "next/server";

import {
  readWorkingMemory,
  writeWorkingMemory,
} from "@/lib/working-memory/store";
import {
  REMOTE_PREFERENCE_VALUES,
  type Profile,
  type RemotePreferenceValue,
} from "@/lib/working-memory/types";

export const runtime = "nodejs";

const MAX_STRING_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 60;
const MAX_ITEM_LENGTH = 80;

function response(profile: Profile) {
  return NextResponse.json({ profile });
}

export async function GET() {
  const memory = await readWorkingMemory();
  return response(memory.profile);
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid-body" } }, { status: 400 });
  }

  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const profileInput = (input.profile && typeof input.profile === "object" ? input.profile : null) as Record<string, unknown> | null;

  if (!profileInput || typeof profileInput !== "object") {
    return NextResponse.json({ error: { code: "missing-profile" } }, { status: 400 });
  }

  const memory = await readWorkingMemory();
  const current = memory.profile;
  const patch: Partial<Profile> = {};

  if ("name" in profileInput) {
    const value = typeof profileInput.name === "string" ? profileInput.name.trim() : "";
    patch.name = value.slice(0, MAX_STRING_LENGTH);
  }
  if ("summary" in profileInput) {
    const value = typeof profileInput.summary === "string" ? profileInput.summary.trim() : "";
    patch.summary = value.slice(0, MAX_STRING_LENGTH);
  }
  if ("targetRole" in profileInput) {
    const value =
      typeof profileInput.targetRole === "string" ? profileInput.targetRole.trim() : "";
    patch.targetRole = value.slice(0, 120);
  }
  if ("targetIndustry" in profileInput) {
    const value =
      typeof profileInput.targetIndustry === "string"
        ? profileInput.targetIndustry.trim()
        : "";
    patch.targetIndustry = value.slice(0, 120);
  }
  if ("remotePreference" in profileInput) {
    const value = profileInput.remotePreference;
    patch.remotePreference =
      typeof value === "string" &&
      (REMOTE_PREFERENCE_VALUES as readonly string[]).includes(value)
        ? (value as RemotePreferenceValue)
        : null;
  }

  for (const field of ["skills", "titles", "locations", "seniority", "targetRoles"] as const) {
    if (field in profileInput) {
      const value = profileInput[field];
      const seen = new Set<string>();
      patch[field] = Array.isArray(value)
        ? (value as unknown[])
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => {
              if (
                item.length === 0 ||
                item.length > MAX_ITEM_LENGTH ||
                seen.has(item.toLowerCase())
              ) {
                return false;
              }
              seen.add(item.toLowerCase());
              return true;
            })
            .slice(0, MAX_ARRAY_ITEMS)
        : [];
    }
  }

  memory.profile = { ...current, ...patch };
  await writeWorkingMemory(memory);

  return response(memory.profile);
}