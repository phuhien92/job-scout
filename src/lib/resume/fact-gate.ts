/**
 * Lightweight evidence check: flag draft lines that introduce numeric claims
 * or employer-like tokens not present in the source resume text.
 * Does not rewrite; callers decide how to surface unsupported lines.
 */

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  return matches.map((m) => m.replace(/,/g, ""));
}

export function factGateDraft(
  markdown: string,
  sourceText: string,
): { markdown: string; unsupported: string[] } {
  const source = normalize(sourceText);
  const unsupported: string[] = [];

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const numbers = extractNumbers(trimmed);
    for (const num of numbers) {
      if (!source.includes(num.toLowerCase()) && !sourceText.includes(num)) {
        unsupported.push(trimmed);
        break;
      }
    }
  }

  return { markdown, unsupported: [...new Set(unsupported)].slice(0, 12) };
}
