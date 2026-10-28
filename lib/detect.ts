/**
 * Simulated "Scribe" agent: spots action items in chat messages written in
 * English, Tagalog or Taglish. Rule-based stand-in with the same output shape
 * a Claude API call will return later.
 */
import type { Role, User } from "./types";
import { addDays, parseDate } from "./dates";

export type Detection = {
  title: string;
  assigneeId?: string;
  role: Role;
  due: string; // YYYY-MM-DD
  dueLabel: string;
  confidence: "high" | "medium";
};

/** Tagalog/Taglish verb stems → English verb for the task title. */
const VERBS: Record<string, string> = {
  send: "Send", padala: "Send", ipadala: "Send", gawa: "Make", gawin: "Make", ayos: "Fix", ayusin: "Fix",
  check: "Check", tingnan: "Check", upload: "Upload", tawag: "Call", tawagan: "Call", call: "Call",
  email: "Email", print: "Print", edit: "Edit", post: "Post", review: "Review", confirm: "Confirm",
  book: "Book", follow: "Follow up on", "follow-up": "Follow up on", update: "Update", design: "Design",
  draft: "Draft", prepare: "Prepare", handa: "Prepare", ihanda: "Prepare", finalize: "Finalize",
  schedule: "Schedule", sched: "Schedule", ask: "Ask", message: "Message", reply: "Reply to", sagot: "Reply to",
  share: "Share", forward: "Forward", fix: "Fix", make: "Make", create: "Create", write: "Write", sulat: "Write",
  bayad: "Pay", bayaran: "Pay", pay: "Pay", invoice: "Invoice", order: "Order", buy: "Buy", bili: "Buy", bilhin: "Buy",
  approve: "Approve", list: "List", compute: "Compute", research: "Research", contact: "Contact", remind: "Remind",
};

/** Filler words dropped from the object of the sentence. */
const FILLER = new Set(
  "yung ung iyong ang ng na po naman nga lang please pls plz pakisuyo mo ko ka natin namin kami sa kay si kina para the a an to for me ah eh ha ba din rin muna agad asap ulit pa re"
    .split(" "),
);

const WEEKDAYS: Record<string, number> = {
  sunday: 0, linggo: 0, monday: 1, lunes: 1, tuesday: 2, martes: 2, wednesday: 3, miyerkules: 3, miyerkoles: 3,
  thursday: 4, huwebes: 4, friday: 5, biyernes: 5, saturday: 6, sabado: 6,
};

const ROLE_HINTS: [RegExp, Role][] = [
  [/\b(poster|logo|design|layout|banner|graphic|video|edit|certificate|mockup|thumbnail)\b/i, "creative"],
  [/\b(posts?|captions?|teasers?|reels?|tiktok|facebook|fb|ig|instagram|newsletter|schedule)\b/i, "social"],
  [/\b(client|sponsor|proposal|contract|deck|follow up|follow-up|lead|partner)\b/i, "sales"],
  [/\b(venue|supplier|catering|print|booth|av|sound)\b/i, "eventops"],
  [/\b(lesson|quiz|exam|module|course outline)\b/i, "instructor"],
  [/\b(invoice|payment|bayad|budget|receipt)\b/i, "admin"],
];

function dueFrom(text: string, today: string): { due: string; label: string } {
  const t = text.toLowerCase();
  if (/\b(ngayon|today|now|eod|end of day|mamaya|later today|asap|agad)\b/.test(t)) return { due: today, label: "today" };
  if (/\b(bukas|tomorrow|tmrw|tom)\b/.test(t)) return { due: addDays(today, 1), label: "tomorrow" };
  if (/\b(next week|sa susunod na linggo|susunod na linggo)\b/.test(t)) return { due: addDays(today, 7), label: "next week" };
  const inDays = t.match(/\b(?:in|within|sa loob ng)\s+(\d{1,2})\s+(?:days?|araw)\b/);
  if (inDays) return { due: addDays(today, Number(inDays[1])), label: `in ${inDays[1]} days` };
  for (const [w, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) {
      const cur = parseDate(today).getDay();
      const diff = (dow - cur + 7) % 7 || 7;
      const due = addDays(today, diff);
      return { due, label: parseDate(due).toLocaleDateString("en-PH", { weekday: "long" }) };
    }
  }
  return { due: addDays(today, 2), label: "in 2 days (no date said)" };
}

function findUser(name: string, users: User[]) {
  const n = name.toLowerCase();
  return users.find((u) => u.name.split(" ")[0].toLowerCase() === n);
}

/** Returns a suggested task, or null if the message isn't a request. */
export function detectTask(text: string, users: User[], authorId: string, today: string, dmPartnerId?: string): Detection | null {
  const raw = text.trim();
  if (raw.length < 6 || raw.endsWith("?") && !/\b(can|could|pwede|puwede|pakisuyo|paki)\b/i.test(raw)) return null;
  const lower = raw.toLowerCase();

  // Who: @mention, "Name," at the start, "ako na" / "I'll" (author), or DM partner.
  let assigneeId: string | undefined;
  const mention = raw.match(/@(\w+)/);
  const vocative = raw.match(/^(\w+)[,:]?\s/);
  if (mention) assigneeId = findUser(mention[1], users)?.id;
  if (!assigneeId && vocative) assigneeId = findUser(vocative[1], users)?.id;
  const selfAssign = /\b(ako na|ako nalang|ako na lang|i'll|i will|i can do|let me)\b/i.test(lower);
  if (!assigneeId && selfAssign) assigneeId = authorId;
  if (!assigneeId && dmPartnerId) assigneeId = dmPartnerId;

  // What: find the request marker and the verb after it.
  let verb: string | undefined;
  let rest = "";
  const paki = lower.match(/\bpaki-?\s?([a-z-]+)\s*(.*)$/);
  const english = lower.match(/\b(?:can you|could you|pls|please|plz|pwede bang|pwede mo bang|puwede bang|kindly|need to|needs to|we need to|make sure to|don't forget to|dont forget to|remember to|i'll|i will|let me|ako na mag-?|ako na)\s+(?:mag-?|i-|ma-)?([a-z-]+)\s*(.*)$/);
  const tagalogImperative = lower.match(/\b(ipadala|gawin|ayusin|tawagan|bayaran|bilhin|ihanda|tingnan)\s*(.*)$/);
  const reminder = lower.match(/\b(?:wag kalimutan|huwag kalimutan|don't forget|dont forget)\s+(?:ang|yung|the|to)?\s*(.*)$/);
  if (paki) [verb, rest] = [paki[1], paki[2]];
  else if (english) [verb, rest] = [english[1], english[2]];
  else if (tagalogImperative) [verb, rest] = [tagalogImperative[1], tagalogImperative[2]];
  else if (reminder) [verb, rest] = ["remind", reminder[1]];
  if (!verb) return null;

  const base = verb.replace(/^(mag-?|i-|ma-)/, "").replace(/-$/, "");
  if (base === "follow") rest = rest.replace(/^up\b\s*/, "");
  const english_verb = VERBS[base] ?? (VERBS[base.replace(/(in|an|hin|han)$/, "")] ?? null);
  const verbWord = english_verb ?? (/^[a-z]{3,}$/.test(base) && !FILLER.has(base) ? base[0].toUpperCase() + base.slice(1) : null);
  if (!verbWord) return null;

  // Object: remaining words minus filler, dates and names.
  const dateWords = /\b(bukas|tomorrow|tmrw|ngayon|today|mamaya|later|eod|asap|agad|next week|by|before|bago|on|sa susunod na linggo|in \d+ days?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkules|miyerkoles|huwebes|biyernes|sabado|linggo)\b/g;
  const words = rest
    .replace(/@\w+/g, " ")
    .replace(dateWords, " ")
    .replace(/[^\p{L}\p{N}\s&'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w) && !findUser(w, users));
  // Keep the original capitalisation of names like "Carla" or "Ngiti".
  const original = new Map(raw.split(/[^\p{L}\p{N}&'-]+/u).map((w) => [w.toLowerCase(), w]));
  const object = words
    .slice(0, 8)
    .map((w) => (original.get(w) && /^[A-Z]/.test(original.get(w)!) ? original.get(w)! : w))
    .join(" ");
  const title = verbWord === "Remind" ? (object ? object[0].toUpperCase() + object.slice(1) : "") : `${verbWord}${object ? " " + object : ""}`;
  if (!title || title.length < 4) return null;

  const { due, label } = dueFrom(lower, today);
  const assignee = users.find((u) => u.id === assigneeId);
  const role = assignee?.roles[0] ?? ROLE_HINTS.find(([re]) => re.test(lower))?.[1] ?? "admin";
  return { title: title.replace(/\s+/g, " ").trim(), assigneeId, role, due, dueLabel: label, confidence: english_verb && (assigneeId || paki) ? "high" : "medium" };
}

export function dateLabel(d: string) {
  return parseDate(d).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

