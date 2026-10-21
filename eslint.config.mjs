import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Files that still import the legacy package. Issue #17 removes each import; delete the
// file from this list in the same change, so the list only ever shrinks.
const LEGACY_DESIGN_SYSTEM_IMPORTERS = [
  "src/app/jobs/page.tsx",
  "src/app/layout.tsx",
  "src/app/optimize/page.tsx",
  "src/app/profile/ProfileView.tsx",
  "src/components/AppShell.tsx",
  "src/components/ClarifyCard.tsx",
  "src/components/JobCard.tsx",
  "src/components/OptimizeChat.tsx",
  "src/components/OptimizeLanding.tsx",
  "src/components/OptimizeView.tsx",
  "src/components/ResumeArtifact.tsx",
  "src/components/ScoutChat.tsx",
  "src/components/TargetingSummary.tsx",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@robr0/design-system", "@robr0/design-system/*"],
              message:
                "Legacy package (issue #17). Use a primitive from src/components/ui; see .claude/skills/job-scout-ui.",
            },
          ],
        },
      ],
    },
  },
  {
    files: LEGACY_DESIGN_SYSTEM_IMPORTERS,
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Product code composes primitives. A raw control here is a gap filled by hand,
    // which is what src/components/ui exists to prevent.
    files: ["src/components/**/*.tsx", "src/app/**/*.tsx"],
    ignores: ["src/components/ui/**", "src/components/ai-elements/**", "**/*.test.tsx"],
    rules: {
      "react/forbid-elements": [
        "error",
        {
          forbid: [
            { element: "button", message: "use <Button> from @/components/ui/button" },
            { element: "input", message: "use <Input> from @/components/ui/input" },
            { element: "textarea", message: "use <Textarea> from @/components/ui/textarea" },
            { element: "select", message: "use <Select> from @/components/ui/select" },
            { element: "dialog", message: "use <Dialog> from @/components/ui/dialog" },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
