/**
 * Generates the component catalog agents read before building UI:
 * `.claude/skills/job-scout-ui/references/components.md`.
 *
 * It is read from source, not written by hand, so it cannot list a component that does
 * not exist or miss one that does. `--check` fails when the committed catalog is stale;
 * CI runs it.
 *
 *   node scripts/ui-catalog.mts          regenerate
 *   node scripts/ui-catalog.mts --check  exit 1 if the catalog is out of date
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, ".claude/skills/job-scout-ui/references/components.md");

const SECTIONS = [
  {
    dir: "src/components/ui",
    title: "Primitives (`src/components/ui`)",
    intro: "Owned shadcn source on Base UI. Every control in product code comes from here.",
  },
  {
    dir: "src/components/ai-elements",
    title: "Chat elements (`src/components/ai-elements`)",
    intro: "AI Elements registry source for the chat surfaces. Use these for conversation, message and prompt UI.",
  },
];

type Variant = { name: string; options: string[]; defaultValue?: string };
type Entry = { name: string; props: string };
type FileInfo = { file: string; wraps: string[]; exports: Entry[]; variants: Map<string, Variant[]> };

const printer = ts.createPrinter({ removeComments: true });
// Printed rather than sliced from source, so a multi-line type keeps its `;` separators.
const text = (node: ts.Node, source: ts.SourceFile) =>
  printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, " ").trim();

function readFile(path: string): FileInfo {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const wraps: string[] = [];
  const declared = new Map<string, string>();
  const exported: string[] = [];
  const variants = new Map<string, Variant[]>();

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const from = statement.moduleSpecifier.text;
      const helper = from === "@base-ui/react/merge-props" || from === "@base-ui/react/use-render";
      if (!helper && (from.startsWith("@base-ui/") || from === "cmdk" || from === "streamdown" || from === "use-stick-to-bottom")) {
        wraps.push(`\`${from}\``);
      }
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const param = statement.parameters[0];
      declared.set(statement.name.text, param?.type ? text(param.type, source) : "none");
      if (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) exported.push(statement.name.text);
    }

    if (ts.isVariableStatement(statement)) {
      const isExported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const name = decl.name.text;
        const init = decl.initializer;
        if (ts.isCallExpression(init) && text(init.expression, source) === "cva") {
          variants.set(name, readCva(init, source));
        } else if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          const param = init.parameters[0];
          declared.set(name, param?.type ? text(param.type, source) : "none");
        } else {
          declared.set(name, `alias of \`${text(init, source)}\``);
        }
        if (isExported) exported.push(name);
      }
    }

    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const el of statement.exportClause.elements) exported.push(el.name.text);
    }
  }

  const exports = exported
    .filter((name) => !variants.has(name))
    .map((name) => ({ name, props: declared.get(name) ?? "re-export" }));
  return { file: relative(ROOT, path), wraps: [...new Set(wraps)], exports, variants };
}

function readCva(call: ts.CallExpression, source: ts.SourceFile): Variant[] {
  const config = call.arguments[1];
  if (!config || !ts.isObjectLiteralExpression(config)) return [];
  const prop = (obj: ts.ObjectLiteralExpression, key: string) =>
    obj.properties.find(
      (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(source).replace(/"/g, "") === key,
    )?.initializer;
  const defaults = prop(config, "defaultVariants");
  const variantsNode = prop(config, "variants");
  if (!variantsNode || !ts.isObjectLiteralExpression(variantsNode)) return [];

  return variantsNode.properties.filter(ts.isPropertyAssignment).map((p) => {
    const name = p.name.getText(source).replace(/"/g, "");
    const options = ts.isObjectLiteralExpression(p.initializer)
      ? p.initializer.properties.filter(ts.isPropertyAssignment).map((o) => o.name.getText(source).replace(/"/g, ""))
      : [];
    const def = defaults && ts.isObjectLiteralExpression(defaults) ? prop(defaults, name) : undefined;
    return { name, options, defaultValue: def ? def.getText(source).replace(/"/g, "") : undefined };
  });
}

function render(): string {
  const lines = [
    "<!-- Generated by scripts/ui-catalog.mts from component source. Do not edit by hand; run `node scripts/ui-catalog.mts`. -->",
    "",
    "# Job Scout component catalog",
    "",
    "The complete list of reusable components. If what you need is not here, compose it from these; do not hand-roll a control or import `@robr0/design-system`.",
  ];

  for (const section of SECTIONS) {
    const dir = join(ROOT, section.dir);
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx")).sort();
    lines.push("", `## ${section.title}`, "", section.intro);

    for (const f of files) {
      const info = readFile(join(dir, f));
      const importPath = `@/${info.file.replace(/^src\//, "").replace(/\.tsx$/, "")}`;
      lines.push("", `### \`${importPath}\``, "");
      if (info.wraps.length > 0) lines.push(`Built on ${info.wraps.join(", ")}.`, "");
      lines.push("| Export | Props |", "| --- | --- |");
      for (const e of info.exports) lines.push(`| \`${e.name}\` | \`${e.props.replace(/\|/g, "\\|")}\` |`);
      for (const [name, vs] of info.variants) {
        if (vs.length === 0) continue;
        lines.push("", `Variants (\`${name}\`):`, "");
        for (const v of vs) {
          const opts = v.options.map((o) => (o === v.defaultValue ? `\`${o}\` (default)` : `\`${o}\``)).join(", ");
          lines.push(`- \`${v.name}\`: ${opts}`);
        }
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

const output = render();
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {}
  if (current !== output) {
    console.error(`${relative(ROOT, OUT)} is out of date. Run: node scripts/ui-catalog.mts`);
    process.exit(1);
  }
  console.log("Component catalog is up to date.");
} else {
  writeFileSync(OUT, output);
  console.log(`Wrote ${relative(ROOT, OUT)}`);
}
