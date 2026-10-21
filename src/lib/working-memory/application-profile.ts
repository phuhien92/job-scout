import { z } from "zod";
import type { Profile } from "./types";

const reference = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const provenance = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("legacy") }),
  z.strictObject({ kind: z.literal("user"), recordedAt: z.iso.datetime() }),
  z.strictObject({
    kind: z.literal("resume"),
    resumeId: reference,
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  }).refine((span) => span.end > span.start, "Empty source span"),
]);

export const applicationFactSchema = z.strictObject({
  id: reference,
  section: z.enum(["contact", "work", "education", "skills", "links", "application"]),
  key: z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,119}$/),
  value: z.union([
    z.string().trim().min(1).max(4000),
    z.array(z.string().trim().min(1).max(200)).min(1).max(60),
  ]),
  verification: z.enum(["unverified", "verified"]),
  provenance,
}).superRefine((fact, ctx) => {
  if (fact.verification === "verified" && fact.provenance.kind === "legacy") {
    ctx.addIssue({ code: "custom", message: "Legacy values require explicit review" });
  }
  if (fact.section === "application" && fact.provenance.kind !== "user") {
    ctx.addIssue({ code: "custom", message: "Declarations require explicit user input" });
  }
});

export const applicationProfileSchema = z.strictObject({
  version: z.literal(1),
  facts: z.array(applicationFactSchema).max(1000),
}).refine(
  (profile) => new Set(profile.facts.map((fact) => fact.id)).size === profile.facts.length,
  "Duplicate fact IDs",
);

export type ApplicationProfile = z.infer<typeof applicationProfileSchema>;

/** Legacy extraction and edits were indistinguishable. Never invent evidence. */
export function migrateLegacyProfile(profile: Profile): ApplicationProfile {
  const fields = ["name", "skills", "titles", "locations", "remotePreference",
    "seniority", "summary", "targetRoles", "targetRole", "targetIndustry"] as const;
  return {
    version: 1,
    facts: fields.flatMap((key) => {
      const value = profile[key];
      if (value === null || value.length === 0) return [];
      return [{
        id: `legacy_${key}`,
        section: key === "name" || key === "locations" ? "contact" as const
          : key === "skills" ? "skills" as const : "work" as const,
        key,
        value,
        verification: "unverified" as const,
        provenance: { kind: "legacy" as const },
      }];
    }),
  };
}

/** Keep legacy callers working without silently promoting their edits to evidence. */
export function refreshLegacyFacts(
  applicationProfile: ApplicationProfile,
  profile: Profile,
): ApplicationProfile {
  return applicationProfileSchema.parse({
    ...applicationProfile,
    facts: [
      ...applicationProfile.facts.filter((fact) => fact.provenance.kind !== "legacy"),
      ...migrateLegacyProfile(profile).facts,
    ],
  });
}
