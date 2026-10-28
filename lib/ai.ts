/**
 * Simulated AI ("Clerk" agent). Rule-based stand-ins with the same shape the
 * Claude API calls will return, so they can be swapped without touching the UI.
 */
import type { Deliverable, DeliverableKind } from "./types";
import { uid } from "./id";

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function quantityOf(line: string): number {
  const digit = line.match(/\b(\d{1,2})\s*(?:x\s*)?(?:event\s+|social\s+media\s+|facebook\s+|sponsored\s+)?(posters?|mentions?|posts?|shout-?outs?|booths?|slots?|banners?)/i);
  if (digit) return Number(digit[1]);
  const word = line.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (word) return NUMBER_WORDS[word[1].toLowerCase()];
  return 1;
}

function kindOf(line: string): DeliverableKind | null {
  const l = line.toLowerCase();
  if (/(social|facebook|instagram|tiktok|shout-?out|mention|post\b|posts\b)/.test(l)) return "social";
  if (/\blogo\b/.test(l)) return "logo";
  if (/\bbooth\b/.test(l)) return "booth";
  if (/(speaking|talk|keynote|stage time)/.test(l)) return "speaking";
  return null;
}

function clean(line: string): string {
  return line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

/** Pull sponsor/partner deliverables out of contract text. */
export function extractDeliverables(text: string): Deliverable[] {
  const lines = text.split(/\r?\n/);
  const hasBenefitsHeading = lines.some((l) => /(benefit|deliverable|inclusion)s?\s*:?\s*$/i.test(l.trim()));

  let inSection = !hasBenefitsHeading;
  const out: Deliverable[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeading = /:\s*$/.test(line) && !/^\s*(\d+[.)]|[-*•])/.test(line);
    if (isHeading && hasBenefitsHeading) {
      inSection = /(benefit|deliverable|inclusion)/i.test(line);
      continue;
    }
    if (!inSection || !/^\s*(\d+[.)]|[-*•])/.test(line)) continue;
    const kind = kindOf(line);
    if (!kind) continue;
    out.push({
      id: uid("dlv"),
      kind,
      description: clean(line),
      quantity: quantityOf(line),
      sourceLine: line,
    });
  }
  return out;
}
