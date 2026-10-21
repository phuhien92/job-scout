# Job Scout experience flow

Open [job-scout.pen](job-scout.pen) in pen.dev and start with **00 · End-to-end user workflow**. The editable canvas is the canonical design source. The PNG files in this directory are scale-1 review exports from that source.

The approved [rabbit logo](brand/scout-rabbit-bubble.png) remains a replaceable image fill throughout the website, popup, and side panel. The approved light direction uses a cream canvas, white panels, forest text, green actions, and mint status surfaces. The dark palette shown in [dark-field-review.png](dark-field-review.png) remains dormant design data and is not emitted into the current product stylesheet.

The approved light values in the top-level Pen variables are the implementation token source. Run `npm run tokens:generate` after changing them; CI runs `npm run tokens:check` against the generated `src/styles/tokens.css`. Do not edit that stylesheet by hand.

The remaining frames are design guidance, not shipped behavior. They do not implement the extension, provider integrations, hosted access, or application history.

## Component naming and instances

The `Job Scout components · code-aligned` frame (`l7Piy5`) is the reusable Pen component set for the approved journey. A definition carries a name from the generated [code catalog](../.claude/skills/job-scout-ui/references/components.md) only when it matches that code export exactly. Variant-bearing catalog definitions use `Export / prop=value`; export, prop, and value spelling must match the catalog exactly. `Separator` and `DialogContent` are the exact matches in this set. The visible dialog surface is `DialogContent`, because the catalog's `Dialog` is the non-visual root.

The approved journey's controls are 44px or taller touch targets, larger than the code's `Button`, `Input`, `Textarea`, and `SelectTrigger` defaults, so they are product patterns:

- `ActionButton / variant=default|secondary|outline|destructive / surface=standard` is the 44px, radius-12 action used across the website, companion, and extension frames.
- `ActionButton / variant=default|secondary / surface=workspace` is the radius-10 inline action used in frames 02–04, with matching `AppNavigationItem / state=default|active / surface=workspace` items there. Other frames use `AppNavigationItem / state=default|active / surface=standard`.
- `FormInput / state=focus`, `FormTextarea / state=focus`, and `FormSelectTrigger` are the 48px approved form controls.

Implement them with the matching code primitive and variant plus the larger sizing. Do not rename one to a catalog name unless it matches the code export exactly.

The `Primitives • UI components` board (`rgFOJ`) is the specimen sheet for code-sized catalog primitives. Its definitions use exact catalog names: `Button / variant=default|outline|secondary|ghost|destructive|link / size=default`, `Button / variant=default / size=xs|sm|lg|icon`, `Button / variant=secondary / size=xs`, `Button / variant=outline / size=sm|icon|icon-xs|icon-sm|icon-lg`, `Button / variant=ghost / size=icon|icon-xs`, `Input`, `Textarea`, `SelectTrigger / size=default|sm`, `ButtonGroup / orientation=horizontal`, `InputGroup`, `SelectContent`, `SelectItem`, `DropdownMenuContent`, `DropdownMenuItem`, `Command`, `CommandItem`, `TooltipContent`, `HoverCardContent`, and `Spinner`. Each `a|b` entry is one definition per value. Add a new variant or size as a new `Export / prop=value` definition and point instances at it; never restyle an instance into a different variant or size with overrides, and do not reintroduce the old `UI /` names.

Product patterns keep stable PascalCase names: `ActionButton`, `FormInput`, `FormTextarea`, `FormSelectTrigger`, `EvidenceBadge`, `ReviewStatus`, `FieldAnswerRow`, `UnresolvedQuestion`, and `ConnectionState`. `AppNavigationItem`, `ExtensionHeader`, `ExtensionToolbar`, `JobCard`, `CompactFieldStateRow`, `Alert / tone=neutral|positive|warning|error`, and `Toast` are proposed patterns because the current catalog has no equivalent. Do not assign a catalog primitive name to an unmatched design element.

Every occurrence of a reusable control or pattern in the approved frames is a Pen `ref` instance. Change shared appearance in its reusable definition, and use instance overrides only for copy, state, tone, locale, and container sizing. An instance must not repeat a value its definition already sets. Do not detach an instance or redraw a parallel control.

The issue #38 conversion covers the 24 approved frames listed below. The extension canvas frames outside that list (`Extension closed • Launcher` and its hover state, `Extension • Job detected`, `Extension • Autofill information`, `Extension • Settings`, the scanning and filling states, and `Section 3 • Profile and resumes`) use `ExtensionToolbar`, `JobCard`, `CompactFieldStateRow`, and `ActionButton` instances, but their other form controls are still hand-drawn. Those frames fall outside this conversion; replace their controls with instances before treating them as approved. Review exports for issue #38 are in [`review/issue-38`](review/issue-38/).

## Approved architecture defaults

- The extension **popup owns status and launch**. The **side panel owns field review, decisions, confirmation, apply results, and recovery**.
- A local pairing request is approved in the companion website. The companion generates, expires, and revokes the secret; only the companion and extension worker hold it. The employer webpage, content script, popup DOM, side-panel text, and application-plan payload never receive it.
- Provider selection, credentials, consent, testing, and recovery stay in the companion. The extension receives non-secret readiness only.
- Work authorization, sponsorship, EEO answers, other personal declarations, and files remain manual-only under application-plan contract v1.
- Application-history saving is later work. No current screen offers a save-attempt action.
- Hosted sign-in is a disabled future placeholder and makes no current product claim.

## Screen and export map

### Journey and website

| Pen frame | Export | Review purpose |
| --- | --- | --- |
| `jyRfS` · 00 · End-to-end user workflow | [workflow-overview.png](workflow-overview.png) | Surface ownership, safety boundaries, and the complete handoff. |
| `oi58r` · 01 · Resume upload | [resume-intake.png](resume-intake.png) | Initial upload only; no extracted facts appear yet. |
| `cFSuP` · 01A · Resume extraction states | [resume-extraction-states.png](resume-extraction-states.png) | Uploaded, reading, and failed extraction states. |
| `o2RCC9` · 01B · Extracted fact review and correction | [resume-fact-review.png](resume-fact-review.png) | Source excerpt, confidence, correction, provenance, and blocked readiness. |
| `YcfRS` · 02 · Evidence-backed resume review | [resume-suggestions.png](resume-suggestions.png) | Inspect, accept, edit, or skip evidence-backed suggestions. |
| `KQx9o` · 03 · Targeted resume ready | [targeted-resume.png](targeted-resume.png) | Targeted draft remains separate from the source resume. |
| `JISdW` · 04 · Job match and apply handoff | [job-match-handoff.png](job-match-handoff.png) | Explainable fit and employer-page handoff. |
| `aSZlw` · 08 · Profile hub | [profile-overview.png](profile-overview.png) | Verified facts in the Scout, Optimize, Jobs, and Profile shell. |
| `tqNtH` · Action · Edit verified profile fact | [profile-edit.png](profile-edit.png) | Source-preserving correction dialog and focus return. |

### Extension and companion

| Pen frame | Export | Review purpose |
| --- | --- | --- |
| `PEMn0` · Extension popup · Status and launch | [extension-popup-status.png](extension-popup-status.png) | Connection, provider readiness, page support, and side-panel launch. |
| `GEPQq` · 05 · Extension pairing pending | [extension-pairing.png](extension-pairing.png) | Pending request, expiry, hosted placeholder, and secret boundary. |
| `H1pu7d` · Pairing state map | [pairing-state-map.png](pairing-state-map.png) | Pending, approved, rejected/expired, connected, disconnected, and revoked states. |
| `xR59j` · Companion · Pairing approval and revocation | [companion-pairing-approval.png](companion-pairing-approval.png) | Companion approval, rejection, revocation, and direct secret delivery. |
| `cnncD` · Companion · Provider setup and readiness | [companion-provider-setup.png](companion-provider-setup.png) | Credential ownership, cost consent, test status, non-secret readiness, and recovery. |
| `fpORB` · 06 · Complete application-plan review | [extension-fill-preview.png](extension-fill-preview.png) | Every scanned field, required/optional state, and exact unanswered reason. |
| `ujUUx` · 06A · Candidate evidence and decision | [extension-field-review.png](extension-field-review.png) | Proposed value, evidence, confidence, edit, reject, blank, and approve controls. |
| `afU7b` · 06B · Explicit write confirmation | [extension-fill-confirmation.png](extension-fill-confirmation.png) | User-approved values separated from validated proposals before writing. |
| `ChUic` · 07 · Exact apply result and manual review | [extension-final-review.png](extension-final-review.png) | Adapter-confirmed applied and untouched fields, then manual submission. |
| `HJ0NY` · 07A · Partial write result | [extension-partial-result.png](extension-partial-result.png) | Per-field applied, failed, not-attempted, and untouched outcomes. |
| `w3qsbf` · Branch · Recoverable application states | [application-recovery-states.png](application-recovery-states.png) | Stale plan, navigation/permission loss, disconnect, provider recovery, and unsupported controls. |

### Responsive, theme, locale, and accessibility

| Pen frame | Export | Review purpose |
| --- | --- | --- |
| `Dv5Bh` · Variant · 375px fact review | [narrow-fact-review.png](narrow-fact-review.png) | Single-column correction at the required narrow breakpoint. |
| `EwlJt` · Handoff · Accessibility responsive theme locale | [accessibility-handoff.png](accessibility-handoff.png) | 375px/1440px behavior, focus, announcements, errors, reduced motion, and locale rules. |
| `zvS02` · Variant · Dark candidate review | [dark-field-review.png](dark-field-review.png) | Representative dark side-panel review. |
| `RoHG7` · Variant · Vietnamese complete field review | [vi-field-review.png](vi-field-review.png) | Real Vietnamese copy and extension-panel text expansion. |

## Application-plan review model

The side-panel flow follows [`docs/application-plan.md`](../docs/application-plan.md):

1. The complete-list screen shows all seven fields from the representative v1 fixture exactly once.
2. The three candidates are **validated proposals**, not permission to write. Each candidate is reachable for evidence inspection and an edit, reject, leave-blank, or approve decision.
3. Required and optional states remain visible. Unanswered fields use the contract reasons `personal-declaration`, `manual-upload`, `missing-evidence`, and `unsupported`.
4. A separate confirmation screen lists only user-approved values and repeats what will remain untouched.
5. The adapter rescans before writing and checks identity before each write. A stale scan discards the old plan and requires review again.
6. Final and interrupted states report exact per-field outcomes. There is no silent retry and no success count beyond adapter-confirmed writes.
7. The extension has no submit action. The user reviews and submits on the employer page.

## Pairing and provider state model

The pairing sequence is request → pending companion approval → approved secret delivery → authenticated connection. Rejection or expiry issues no secret. Disconnect offers reconnect; companion revocation invalidates the stored secret and requires a new approved request.

The generated secret travels directly between the loopback companion and extension worker storage. It is transport authentication, not application-plan data. The popup and side panel may render connection state but never the secret.

Provider setup remains in the companion. Before a bounded test can incur cost, the companion shows the selected access path and requests consent. The extension sees only readiness and a recovery link back to companion setup.

## Resume fact and readiness model

Resume states are separate: initial upload, extraction in progress, extraction failure, extracted-fact review, correction, and verified completion. Resume-derived values show a source anchor and confidence. A correction is stored as explicit user-entered provenance while the original excerpt stays available.

A profile is ready only when required contact facts and every resume-derived fact selected for reuse are verified. Manual-only declarations do not count toward contract-v1 readiness. Original binary retention remains planned work in issue #43, and a targeted draft never replaces the source resume.

## Accessibility and responsive handoff

- Use at least 12px high-contrast text for evidence, privacy, reasons, and safety messages. The revised light tertiary text is `#526C64`, which is 5.69:1 on white and 5.43:1 on the cream page. White on `#087F65` is 4.96:1.
- Interactive targets are at least 44px. Provide visible focus, accessible names, logical keyboard order, dialog focus trap and return, and persistent critical status text.
- Announce extraction, scan, provider, approval, stale-plan, and apply-result changes. Busy controls expose loading and disabled semantics; errors receive focus and one clear recovery action.
- At 375px, website content becomes one column and dialogs become full-screen sheets. At 1440px, the shared 218px sidebar and multi-zone content remain visible. The 400px extension side panel stays one column.
- Reduced motion removes translation and spring behavior. Keep instant swaps or a short fade, and never animate review controls away during a decision.
- Allow at least 35% Vietnamese expansion. Wrap labels and never truncate unanswered reasons or safety copy.

## Source and export verification

The design was edited through the Pen CLI developer workflow after reading `pen-schema.md`, `execute.md`, `whiteboard.md`, and `guide/web-app.md`. All 24 top-level frames export at scale 1. The final Pen layout audit reports zero clipped nodes, no text below 12px, and all image fills resolve to `brand/scout-rabbit-bubble.png`.

To reproduce the structural check in `pen interactive`:

```text
get_app_state()
execute({ input: 'problems=0; Get((n,c)=>{ if(c.problems){ problems++; Print(n.id,n.name,c.problems) } }); Print("TOTAL_PROBLEMS",problems)' })
execute({ input: 'Get((n,c)=>{ if(c.depth===0) Print(n.id,n.name,c.bounds.width,c.bounds.height) })' })
execute({ input: 'ids=[]; Get((n,c)=>{ if(c.depth===0) ids.push(n.id) }); Export(ids,"png","/absolute/output/path",{scale:1})' })
```

The PNG filenames above are committed review artifacts. Re-export the mapped frame IDs and compare bytes before updating them.
