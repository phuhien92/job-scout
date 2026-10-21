import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PEN = join(ROOT, "design/job-scout.pen");
const APPROVED_FRAMES = new Set([
  "YcfRS", "KQx9o", "JISdW", "oi58r", "cFSuP", "o2RCC9", "aSZlw", "tqNtH",
  "GEPQq", "fpORB", "ujUUx", "afU7b", "ChUic", "HJ0NY", "PEMn0", "H1pu7d",
  "xR59j", "cnncD", "w3qsbf", "jyRfS", "Dv5Bh", "EwlJt", "zvS02", "RoHG7",
]);

const REQUIRED_COMPONENTS = [
  "Button / variant=default / size=default",
  "Button / variant=secondary / size=default",
  "Button / variant=outline / size=default",
  "Button / variant=destructive / size=default",
  "Input",
  "Textarea",
  "SelectTrigger / size=default",
  "Separator",
  "Dialog",
  "EvidenceBadge",
  "ReviewStatus",
  "FieldAnswerRow",
  "UnresolvedQuestion",
  "ConnectionState",
  "AppNavigationItem / state=default",
  "AppNavigationItem / state=active",
  "ExtensionHeader",
  "ExtensionToolbar",
  "JobCard",
  "CompactFieldStateRow",
] as const;

const MINIMUM_INSTANCES: Record<string, number> = {
  "Button / variant=default / size=default": 20,
  "Button / variant=outline / size=default": 26,
  "Button / variant=destructive / size=default": 6,
  Input: 3,
  Dialog: 1,
  EvidenceBadge: 4,
  ReviewStatus: 36,
  FieldAnswerRow: 15,
  UnresolvedQuestion: 12,
  ConnectionState: 3,
  ExtensionHeader: 9,
  "AppNavigationItem / state=default": 27,
  "AppNavigationItem / state=active": 9,
};

type PenNode = {
  id: string;
  type: string;
  name?: string;
  reusable?: boolean;
  ref?: string;
  height?: number | string;
  fill?: unknown;
  cornerRadius?: unknown;
  metadata?: { type: string; export?: string; props?: Record<string, string> };
  children?: PenNode[];
};
type PenDocument = { version: string; children: PenNode[] };

const document = JSON.parse(readFileSync(PEN, "utf8")) as PenDocument;
const nodes = new Map<string, PenNode>();
const components = new Map<string, PenNode>();
const componentIdsByName = new Map<string, string>();
const refs: Array<{ node: PenNode; rootId: string }> = [];
const failures: string[] = [];

function walk(node: PenNode, rootId: string): void {
  if (nodes.has(node.id)) failures.push(`duplicate node id ${node.id}`);
  nodes.set(node.id, node);
  if (node.reusable) {
    components.set(node.id, node);
    if (!node.name) failures.push(`reusable node ${node.id} has no name`);
    else if (componentIdsByName.has(node.name)) failures.push(`duplicate component name ${node.name}`);
    else componentIdsByName.set(node.name, node.id);
  }
  if (node.type === "ref") refs.push({ node, rootId });
  for (const child of node.children ?? []) walk(child, rootId);
}

for (const root of document.children) walk(root, root.id);

if (document.version !== "2.21") failures.push(`unexpected Pen schema version ${document.version}`);
for (const name of REQUIRED_COMPONENTS) {
  if (!componentIdsByName.has(name)) failures.push(`missing reusable component ${name}`);
}
for (const component of components.values()) {
  if (component.name?.startsWith("Ext /")) failures.push(`legacy component name remains: ${component.name}`);
  if (component.metadata?.type !== "code-component") continue;
  const exported = component.metadata.export;
  const props = component.metadata.props ?? {};
  const expected = exported === "Button"
    ? `Button / variant=${props.variant} / size=${props.size}`
    : exported === "SelectTrigger"
      ? `SelectTrigger / size=${props.size}`
      : exported;
  if (component.name !== expected) failures.push(`${component.name} does not match catalog metadata ${expected}`);
}

const instanceCounts = new Map<string, number>();
for (const { node } of refs) {
  const target = node.ref ? components.get(node.ref) : undefined;
  if (!target) failures.push(`instance ${node.id} has invalid ref ${node.ref ?? "<missing>"}`);
  else instanceCounts.set(target.name!, (instanceCounts.get(target.name!) ?? 0) + 1);
}
for (const [name, minimum] of Object.entries(MINIMUM_INSTANCES)) {
  const actual = instanceCounts.get(name) ?? 0;
  if (actual < minimum) failures.push(`${name} has ${actual} instances; expected at least ${minimum}`);
}

const rawControls: string[] = [];
function findRawControls(node: PenNode, rootId: string): void {
  if (node.type === "ref") return;
  const children = node.children ?? [];
  const oneTextChild = children.length === 1 && children[0].type === "text";
  const rawButton = node.type === "frame" && node.height === 44 && oneTextChild;
  const rawStatus = node.type === "frame" && node.height === 28 && node.cornerRadius === "$radius-pill";
  const rawInput = node.type === "frame" && node.height === 48 && node.fill === "$bg-control" && oneTextChild;
  const rawHeader = node.type === "frame" && ["Extension brand", "Popup brand"].includes(node.name ?? "");
  if (rawButton || rawStatus || rawInput || rawHeader) rawControls.push(`${rootId}/${node.id} (${node.name ?? node.type})`);
  for (const child of children) findRawControls(child, rootId);
}
for (const root of document.children) {
  if (APPROVED_FRAMES.has(root.id)) findRawControls(root, root.id);
}
if (rawControls.length > 0) failures.push(`approved frames contain hand-drawn controls: ${rawControls.join(", ")}`);

if (failures.length > 0) {
  console.error(`Pen component validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

const approvedInstances = refs.filter(({ rootId }) => APPROVED_FRAMES.has(rootId)).length;
console.log(
  `Pen components valid: ${components.size} reusable definitions, ${refs.length} instances ` +
  `(${approvedInstances} in approved frames), valid refs, catalog-aligned names, and no hand-drawn approved controls.`,
);
