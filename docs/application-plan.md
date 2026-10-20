# Application-plan contract v1

Implements the data boundary in issue #19. The source of truth is
[`src/lib/application-plan/contract.ts`](../src/lib/application-plan/contract.ts).
It imports only Zod and uses standard JavaScript APIs, so the same module can
serve the local companion, hosted backend, and extension. It does not import
Next.js, React, Chrome APIs, filesystem code, or an AI provider. Extract it into
a workspace package when the extension is introduced; do not duplicate schemas.

## Request and response

The extension service worker sends JSON containing `version: 1`, a unique
`requestId`, an opaque `scanId`, the current HTTP(S) job URL, `ats` (`rippling`
or `generic`), and visible field descriptors. Descriptors contain an opaque
`fieldId`, label, control type, required flag, sensitivity, option values, and
bounded nearby explanatory text. They never contain existing answers, selectors,
HTML, resume content, profile facts, file contents, or credentials. Unrecognized
controls use `unsupported`; file controls are identified but never uploaded.

The backend returns the same request/scan/URL identity, an opaque
`profileVersion`, candidate values with evidence IDs and confidence in [0, 1],
unanswered fields with reason codes, and warnings. Every candidate has
`requiresReview: true`. Every scanned field appears exactly once in candidates
or unanswered, including optional fields. Strict objects reject unknown keys
at every level; unknown versions are rejected rather than silently downgraded.
Neither side can request DOM operations, scripts, selectors, or submission.
All strings, including labels, warnings, and answers, are inert data: never
pass them to HTML/script evaluators or use them as model instructions.

Wire limits are 64 KiB request / 128 KiB response measured as UTF-8 bytes,
100 fields, 100 options per choice field, 300 characters per label/option,
1,000 characters of context per field, and 4,000 characters per answer.
Choice fields must have nonempty unique options; other controls have no options.
HTTP(S) URLs may not embed credentials. URL validation does not authorize server
fetches: the planner must not fetch arbitrary job URLs without a separate SSRF
policy. These are initial conservative product limits, not ATS platform limits.

## Boundary usage

1. The companion/hosted transport limits the incoming byte stream before buffering
   and calls `parseApplicationPlanRequest(rawJson)` before invoking the planner.
   The parser also checks actual UTF-8 length before JSON parsing. Content-Length
   alone is insufficient. Transport authentication and origin checks are separate.
2. The backend builds its evidence registry from the stored profile version, not
   from the model or employer page. `ApplicationEvidenceContext` stays in the
   trusted backend/extension-worker boundary; the model cannot author it. Reject
   unknown, unverified, or duplicate evidence IDs and a changed profile version.
3. Validate model output with `validateApplicationPlan(rawJson, originalRequest,
   currentScan, evidenceContext)` before showing a fill preview. The backend can
   supply the original scan as `currentScan`; this does not replace the extension's
   later rescan. The backend must independently classify personal declarations;
   never trust a webpage to identify sensitivity or verify evidence.
4. The extension's trusted ATS adapter rescans immediately before any write. Use
   the same scan ID only while the same document/form is active, and revalidate
   against its fresh descriptors and the current profile evidence registry.
   A new scan, navigation, changed labels/types/options/context/sensitivity,
   added/removed fields, unknown field references, or duplicate assignments
   invalidates the plan. Discard it and request a new preview.
5. User confirmation remains a separate extension action. A validated plan is
   review data, not permission to write. Immediately recheck field identity inside
   the adapter before each write; this helper cannot eliminate a DOM race. The
   user edits/rejects suggestions and submits on the employer page manually.

Evidence ID validation proves that references exist and are verified; it does
not prove an AI answer logically follows from them. The planner in #24 must
check claim-to-source support, and the review UI must show evidence and uncertainty.
Confidence never overrides missing evidence, review, or manual-only controls.
V1 always leaves personal declarations (authorization, sponsorship, EEO and
similar), file uploads, and unsupported controls unanswered, even if facts exist.
Future support for verified declarations needs an explicit contract revision.

`ApplicationPlanError.code` is one of `payload-too-large`, `invalid-json`,
`invalid-request`, `invalid-response`, `stale-scan`, or `invalid-plan`. Errors do
not echo page URLs, answers, or source text. Do not log payloads or evidence;
record only request IDs, error codes, and aggregate counts where needed.

## Privacy and transport ownership

| Context | Responsibility and allowed data |
| --- | --- |
| Employer page / content script | Inspect visible controls and apply approved values through a trusted adapter. No profile store, tokens, resume files, or pairing secret. Filled values necessarily become visible to the employer page. |
| Extension worker | Own pairing/auth state, active-tab identity, request routing, and bounded preview data. No model API keys or full resume storage. Send only the confirmed field values/references needed to the content script; keep evidence lookup outside the page. |
| Extension side panel | Show candidate values, evidence, uncertainty, and manual tasks. Render text safely and obtain explicit confirmation. |
| Local companion | Bind to loopback; authenticate pairing, validate origin/schema/size; retain resume files, verified facts, AI credentials, and evidence lookup. |
| Hosted backend | Authenticate account and enforce tenant ownership, HTTPS, rate limits, and evidence/profile version lookup through the same contract. |

Pairing secrets and OAuth credentials travel only in transport auth, never in
request/response JSON. Resume extracts and personal facts stay in the backend;
only approved necessary values and bounded evidence excerpts reach the review UI.
Labels/context are untrusted and can still contain personal information: the
scanner must avoid hidden inputs, password fields, existing values, and unnecessary
nearby page content. Transport, scanner, authentication, evidence lookup, and
rendering are work for #20–#24, not delivered by this schema-only slice.

## Fixture and verification

[`fixtures/rippling.json`](../src/lib/application-plan/fixtures/rippling.json)
is a synthetic, fictional Rippling-style application: contact fields, a select,
sponsorship, manual resume upload, a screening question without evidence, and an
unsupported widget. The URL is illustrative, not a verified live application.
This fixture validates the protocol; it does not claim a working Rippling DOM
adapter. Tests use no AI calls or live ATS pages:

```bash
npm run test -- src/lib/application-plan/contract.test.ts
```

Tests cover a valid review plan, generic mode, strict versions/keys, UTF-8 limits,
stale scans/fields, evidence checks, full field coverage, choice validation,
manual-only controls, and executable instruction rejection.
