/**
 * Social media coverage rules, gap detection, and "Herald" caption drafts
 * (simulated AI — same output shape a Claude call will return later).
 */
import type { InitiativeKind, Platform, SocialPost, State } from "./types";
import { addDays, daysBetween, fmt, today } from "./dates";
import { uid } from "./id";
import { nowISO } from "./clock";

/** Minimum posting rhythm before an event / course launch. Client campaigns follow their contract slots instead. */
export const COVERAGE: Record<InitiativeKind, { startDays: number; perWeek: number; dailyFrom: number } | null> = {
  event: { startDays: 42, perWeek: 1, dailyFrom: 7 }, // weekly from 6 weeks out, daily in the last week
  course: { startDays: 28, perWeek: 2, dailyFrom: 3 }, // twice a week from 4 weeks out, daily in the last 3 days
  campaign: null,
};

export function coverageRuleText(kind: InitiativeKind) {
  const r = COVERAGE[kind];
  if (!r) return "Every contract post slot must be scheduled at least 3 days ahead.";
  return `At least ${r.perWeek} post${r.perWeek > 1 ? "s" : ""} a week from ${r.startDays / 7} weeks out, then daily in the last ${r.dailyFrom} days.`;
}

const counts = (p: SocialPost) => p.status === "scheduled" || p.status === "published";

export type Gap = {
  projectId: string;
  from: string;
  to: string;
  required: number;
  scheduled: number;
  drafts: number;
  daysToLaunch: number;
  message: string;
};

/** Checks the next 7 days for every project against its rule. */
export function coverageGaps(state: State, today: string): Gap[] {
  const gaps: Gap[] = [];
  const from = addDays(today, 1);
  const to = addDays(today, 7);
  for (const p of state.projects) {
    const e = state.events.find((x) => x.id === p.eventId);
    if (!e || e.date < today) continue;
    const posts = state.posts.filter((x) => x.projectId === p.id && x.date >= from && x.date <= to);
    const daysToLaunch = daysBetween(today, e.date);
    const rule = COVERAGE[e.kind];
    if (rule) {
      const active: string[] = [];
      for (let d = from; d <= to; d = addDays(d, 1)) {
        const left = daysBetween(d, e.date);
        if (left >= 0 && left <= rule.startDays) active.push(d);
      }
      if (!active.length) continue;
      const daily = active.filter((d) => daysBetween(d, e.date) <= rule.dailyFrom).length;
      const required = Math.max(Math.min(rule.perWeek, active.length), daily);
      const scheduled = posts.filter(counts).length;
      if (scheduled < required)
        gaps.push({
          projectId: p.id, from, to, required, scheduled, drafts: posts.filter((x) => x.status === "draft").length, daysToLaunch,
          message: `${p.name} is in ${daysToLaunch} days and has ${scheduled} of ${required} required post${required > 1 ? "s" : ""} scheduled for ${fmt(from)}–${fmt(to)}.`,
        });
    } else {
      // Client campaigns: contract slots in the next 3 days that aren't scheduled yet.
      const soon = posts.filter((x) => daysBetween(today, x.date) <= 3 && !counts(x));
      if (soon.length)
        gaps.push({
          projectId: p.id, from, to: addDays(today, 3), required: soon.length + posts.filter(counts).length, scheduled: posts.filter(counts).length, drafts: soon.filter((x) => x.status === "draft").length, daysToLaunch,
          message: `${p.name}: ${soon.length} contract post${soon.length > 1 ? "s" : ""} due in the next 3 days ${soon.length > 1 ? "aren't" : "isn't"} scheduled yet.`,
        });
    }
  }
  return gaps;
}

/* ---------- Herald: caption drafts in dictionary-entry style ---------- */

const WORDS = [
  { w: "cu·ri·ous", p: "/ˈkjʊə.ri.əs/", pos: "adj.", d: "wanting to know more." },
  { w: "re·sil·ient", p: "/rɪˈzɪl.i.ənt/", pos: "adj.", d: "able to bounce back, again and again." },
  { w: "e·lo·quent", p: "/ˈɛl.ə.kwənt/", pos: "adj.", d: "saying it clearly — and beautifully." },
  { w: "gath·er", p: "/ˈɡæð.ər/", pos: "verb", d: "to come together for something worth it." },
  { w: "spark", p: "/spɑːrk/", pos: "noun", d: "the small start of a big idea." },
  { w: "wit", p: "/wɪt/", pos: "noun", d: "quick, clever thinking — with a smile." },
  { w: "grate·ful", p: "/ˈɡreɪt.fəl/", pos: "adj.", d: "feeling thankful for someone's help." },
  { w: "count·down", p: "/ˈkaʊnt.daʊn/", pos: "noun", d: "the exciting part right before." },
];

const tag = (s: string) => "#" + s.replace(/[^A-Za-z0-9]+/g, "");

export function draftCaption(state: State, post: Pick<SocialPost, "projectId" | "date" | "companyId" | "title">, seed = 0): string {
  const project = state.projects.find((p) => p.id === post.projectId);
  const e = state.events.find((x) => x.projectId === post.projectId);
  const company = state.companies.find((c) => c.id === post.companyId);
  const left = e ? daysBetween(post.date, e.date) : 0;
  const isSponsor = Boolean(company && e?.kind !== "campaign");
  const word = isSponsor ? WORDS[6] : left >= 0 && left <= 3 ? WORDS[7] : WORDS[(seed + (project?.name.length ?? 0)) % 6];
  const entry = `${word.w} ${word.p} ${word.pos} — ${word.d}`;
  const when = e ? fmt(e.date, { weekday: "long", month: "long", day: "numeric" }) : "";

  if (e?.kind === "campaign" && company)
    return `[Draft for ${company.name} — needs client approval]\n\n${entry}\n\nThat's the feeling we want for ${company.name} this season. ✨ (Product photo + offer details here.)\n\n${tag(company.name)} #ShopLocal`;
  if (isSponsor && company)
    return `${entry}\n\nThat's us, to ${company.name} 💛 Thank you for helping make ${project?.name} happen on ${when}!\n\n#AIDictionary ${tag(company.name)} ${tag(project?.name ?? "")}`;
  if (e?.kind === "course")
    return `${entry}\n\nThat's the whole idea behind ${project?.name.replace(/ — Course Launch$/, "")}. Enrolment opens ${when}. 🎓\n\nSubscribe free for a new word every morning — link in bio.\n\n#AIDictionary #WordOfTheDay`;
  const countdown = left > 0 ? `${left} day${left > 1 ? "s" : ""} to go` : "Today's the day";
  return `${entry}\n\n${countdown} — ${project?.name}, ${when}${e?.venue ? ` at ${e.venue}` : ""}. 🎉 Register now (link in bio).\n\n#AIDictionary ${tag(project?.name ?? "")} #WordOfTheDay`;
}

export const DEFAULT_PLATFORMS: Platform[] = ["facebook", "instagram"];

/** Spread n new draft posts across the gap window, one per empty day. */
export function fillGapDates(state: State, gap: Gap, n: number): string[] {
  const taken = new Set(state.posts.filter((x) => x.projectId === gap.projectId && x.status !== "slot").map((x) => x.date));
  const days: string[] = [];
  for (let d = gap.from; d <= gap.to; d = addDays(d, 1)) if (!taken.has(d)) days.push(d);
  if (!days.length) days.push(gap.from);
  const step = Math.max(1, Math.floor(days.length / n));
  return Array.from({ length: n }, (_, i) => days[Math.min(days.length - 1, i * step)]);
}

/** Herald drafts enough posts to close a project's gap. They wait for a person to approve. */
export function draftGapPosts(state: State, projectId: string): number {
  const gap = coverageGaps(state, today()).find((g) => g.projectId === projectId);
  if (!gap) return 0;
  const n = Math.max(1, gap.required - gap.scheduled - gap.drafts);
  fillGapDates(state, gap, n).forEach((date, i) => {
    const post: SocialPost = { id: uid("pst"), projectId, title: "Countdown post", date, status: "draft", platforms: [...DEFAULT_PLATFORMS] };
    post.caption = draftCaption(state, post, i + 1);
    state.posts.push(post);
  });
  state.activity.unshift({ id: uid("act"), at: nowISO(), agent: "Herald", message: `Drafted ${n} post${n > 1 ? "s" : ""} to close the gap for ${state.projects.find((p) => p.id === projectId)?.name}. Waiting for approval.`, href: "/social" });
  return n;
}
