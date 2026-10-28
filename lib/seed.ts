import type { State, Template } from "./types";
import { addDays, today } from "./dates";
import { extractDeliverables } from "./ai";
import { createInitiative, winDeal } from "./engine";

export const STATE_VERSION = 4;

/*
 * Draft templates — best guesses at the process, to be corrected with real
 * examples. Offsets are days from T-0 (event day / launch day).
 */

const CLIENT_CAMPAIGN: Template = {
  id: "tpl_client",
  name: "Client Campaign",
  kind: "campaign",
  description: "Agency work for a client brand. T-0 is the day the campaign goes live. Contract deliverables (posts, videos, ads, reports) are added as tasks.",
  tasks: [
    { key: "onboard", title: "Client onboarding & brief", role: "sales", offset: -28, priority: "high", checklist: ["Brand guide & logo files", "Goals & KPIs", "Page / ad account access"] },
    { key: "strategy", title: "Strategy & content calendar", role: "social", offset: -21, dependsOn: ["onboard"], approverRoles: ["owner"] },
    { key: "plan-signoff", title: "Get client sign-off on the plan", role: "sales", offset: -18, dependsOn: ["strategy"], requiredAttachment: "Client sign-off (email or screenshot)" },
    { key: "moodboard", title: "Moodboard & post templates", role: "creative", offset: -16, dependsOn: ["plan-signoff"] },
    { key: "client-approve", title: "Client approval of all creatives", role: "sales", offset: -3, priority: "high", requiredAttachment: "Client sign-off (email or screenshot)" },
    { key: "schedule", title: "Schedule posts & ads", role: "social", offset: -1, dependsOn: ["client-approve"] },
    { key: "launch", title: "Launch check: posts live, ads running", role: "social", offset: 0, dependsOn: ["schedule"] },
    { key: "invoice", title: "Send invoice", role: "admin", offset: 0 },
    { key: "week1", title: "Week-1 performance check & tweaks", role: "social", offset: 7, dependsOn: ["launch"] },
    { key: "renewal", title: "Renewal / upsell conversation", role: "sales", offset: 25 },
  ],
};

const COURSE_LAUNCH: Template = {
  id: "tpl_course",
  name: "Course Launch",
  kind: "course",
  description: "Our own course, from outline to launch day. T-0 is the day enrolment opens.",
  tasks: [
    { key: "outline", title: "Course outline & learning goals", role: "instructor", offset: -60, priority: "high", approverRoles: ["owner"], checklist: ["Modules & lessons list", "Age level & outcomes", "Passing score & attempts"] },
    { key: "lessons", title: "Draft lessons (AI draft → human review)", role: "instructor", offset: -40, dependsOn: ["outline"] },
    { key: "record", title: "Record / produce lesson videos", role: "creative", offset: -28, dependsOn: ["lessons"] },
    { key: "exam", title: "Quiz & final exam question bank", role: "instructor", offset: -28, dependsOn: ["lessons"], approverRoles: ["owner"] },
    { key: "certificate", title: "Certificate design", role: "creative", offset: -21, approverRoles: ["owner"], requiredAttachment: "Certificate design file" },
    { key: "sales-page", title: "Sales page & checkout", role: "admin", offset: -14, dependsOn: ["outline"] },
    { key: "promo-plan", title: "Launch promo plan (T-3 weeks → launch)", role: "social", offset: -24, approverRoles: ["owner"] },
    { key: "promo-creatives", title: "Promo creatives & teaser video", role: "creative", offset: -14, dependsOn: ["promo-plan"], approverRoles: ["owner"] },
    { key: "teasers", title: "Schedule teaser posts", role: "social", offset: -12, dependsOn: ["promo-creatives"] },
    { key: "newsletter", title: "Newsletter announcement to subscribers", role: "social", offset: -7, approverRoles: ["owner"] },
    { key: "qa", title: "QA: enrol → lesson → exam → certificate", role: "admin", offset: -3, priority: "high", dependsOn: ["record", "exam", "certificate", "sales-page"] },
    { key: "launch", title: "Launch day posts & announcement", role: "social", offset: 0, dependsOn: ["qa"] },
    { key: "feedback", title: "Learner feedback survey & fixes", role: "instructor", offset: 14 },
  ],
};

const SPONSORED_EVENT: Template = {
  id: "tpl_workshop",
  name: "Sponsored Event / Workshop",
  kind: "event",
  description: "Our own event with sponsors and partners. T-0 is event day. Sponsor benefits (logos, shout-outs, booths) are added as tasks.",
  tasks: [
    { key: "kickoff", title: "Kickoff meeting & confirm scope", role: "admin", offset: -45, priority: "high", checklist: ["Agenda & speakers", "Budget", "Sponsor list"] },
    { key: "venue", title: "Confirm venue booking", role: "eventops", offset: -40, priority: "high", dependsOn: ["kickoff"], requiredAttachment: "Signed venue confirmation", approverRoles: ["admin"] },
    { key: "poster", title: "Design master event poster", role: "creative", offset: -28, dependsOn: ["kickoff"] },
    { key: "social-plan", title: "Social campaign plan (T-6 weeks → day-of)", role: "social", offset: -42, dependsOn: ["kickoff"], approverRoles: ["owner"] },
    { key: "registration", title: "Open registration page", role: "social", offset: -25, dependsOn: ["venue"] },
    { key: "run-of-show", title: "Draft run-of-show", role: "eventops", offset: -21, dependsOn: ["venue"] },
    { key: "final-poster", title: "Finalize poster with ALL sponsor logos", role: "creative", offset: -14, priority: "high", dependsOn: ["poster"], requiredAttachment: "Final poster (all sponsor logos)", approverRoles: ["owner"] },
    { key: "suppliers", title: "Confirm suppliers (AV, catering)", role: "eventops", offset: -10, dependsOn: ["venue"] },
    { key: "print", title: "Print posters & banners", role: "eventops", offset: -10, dependsOn: ["final-poster"] },
    { key: "sponsor-call", title: "Final check-in call with each sponsor", role: "sales", offset: -7 },
    { key: "setup", title: "Day-of setup & checklist", role: "eventops", offset: 0, dependsOn: ["print", "suppliers", "run-of-show"], checklist: ["Banners up", "Booths placed", "AV test", "Registration desk"] },
    { key: "recap", title: "Post-event recap post", role: "social", offset: 1 },
    { key: "thanks", title: "Thank-you + results report to sponsors", role: "sales", offset: 3 },
  ],
};

export const SAMPLE_CONTRACT = `SPONSORSHIP AGREEMENT
Between AI Dictionary ("Organizer") and Brew & Co. Coffee ("Sponsor")
Event: AI Words Workshop — Manila
Package: Gold — PHP 150,000

Sponsor Benefits:
1. Sponsor logo on 3 event posters and the main stage banner.
2. 2 social media mentions on the AI Dictionary Facebook page before the event.
3. 1 booth space (3m x 3m) at the venue.
4. Logo in the event newsletter.

Sponsor Obligations:
- Provide a high-resolution logo and brand guide within 5 days of signing.
- Payment: 50% upon signing, 50% seven days before the event.`;

export const SAMPLE_CLIENT_CONTRACT = `DIGITAL MARKETING SERVICES AGREEMENT
Between AI Dictionary ("Agency") and Kape Kultura Café ("Client")
Campaign: Holiday Campaign — 1 month
Fee: PHP 85,000

Scope of Services:
1. 12 social media posts (graphics + captions) for Facebook and Instagram.
2. 4 short-form videos (Reels / TikTok).
3. Facebook & Instagram ad campaign management (PHP 20,000 ad budget, billed separately).
4. Monthly performance report with insights and recommendations.

Client Responsibilities:
- Approve content within 2 business days of submission.
- Provide product photos and brand assets before kickoff.`;

const RETAINER_CONTRACT = `SOCIAL MEDIA RETAINER
AI Dictionary x Ngiti Dental Clinic

Scope of Services:
1. 8 social media posts per month.
2. 2 short-form videos per month.
3. Monthly performance report.`;

const PARTNER_CONTRACT = `PARTNERSHIP AGREEMENT
AI Dictionary x Little Readers PH

Partner Deliverables:
1. Partner logo on 2 posters.
2. 3 Facebook shout-outs co-promoting the festival.
3. Speaking slot for the partner's reading coach.`;

export function seed(): State {
  const t = today();
  const s: State = {
    version: STATE_VERSION,
    currentUserId: null,
    users: [
      { id: "u_sherlyn", name: "Sherlyn Aguilar", email: "sherlyn@aidictionary.example", roles: ["owner"], color: "#1B2A4A" },
      { id: "u_mara", name: "Mara Santos", email: "mara@aidictionary.example", roles: ["admin"], color: "#7C3AED" },
      { id: "u_jun", name: "Jun Reyes", email: "jun@aidictionary.example", roles: ["sales"], color: "#0891B2" },
      { id: "u_bea", name: "Bea Cruz", email: "bea@aidictionary.example", roles: ["creative"], color: "#DB2777" },
      { id: "u_paolo", name: "Paolo Lim", email: "paolo@aidictionary.example", roles: ["social"], color: "#C98A12" },
      { id: "u_rina", name: "Rina Dela Paz", email: "rina@aidictionary.example", roles: ["eventops"], color: "#059669" },
      { id: "u_joy", name: "Joy Navarro", email: "joy@aidictionary.example", roles: ["instructor"], color: "#EA580C" },
    ],
    companies: [
      { id: "c_kape", name: "Kape Kultura Café", contactName: "Migs Bautista", contactEmail: "migs@kapekultura.example" },
      { id: "c_ngiti", name: "Ngiti Dental Clinic", contactName: "Dra. Liza Ocampo", contactEmail: "liza@ngitidental.example" },
      { id: "c_lakbay", name: "Lakbay Travel Co.", contactName: "Nico Fernandez", contactEmail: "nico@lakbay.example" },
      { id: "c_nena", name: "Aling Nena's Kakanin", contactName: "Nena Robles", contactEmail: "nena@kakanin.example" },
      { id: "c_brew", name: "Brew & Co. Coffee", contactName: "Carla Mendoza", contactEmail: "carla@brewco.example" },
      { id: "c_little", name: "Little Readers PH", contactName: "Tess Ramos", contactEmail: "tess@littlereaders.example" },
      { id: "c_inkwell", name: "Inkwell Bookstore", contactName: "Ben Uy", contactEmail: "ben@inkwell.example" },
      { id: "c_bytecamp", name: "ByteCamp Academy", contactName: "Leo Garcia", contactEmail: "leo@bytecamp.example" },
      { id: "c_sari", name: "SariSari Tech", contactName: "Ana Villanueva", contactEmail: "ana@sarisari.example" },
    ],
    events: [
      { id: "e_kape", kind: "campaign", name: "Kape Kultura — Holiday Campaign", date: addDays(t, 24), venue: "Facebook + Instagram", templateId: CLIENT_CAMPAIGN.id },
      { id: "e_ngiti", kind: "campaign", name: "Ngiti Dental — Monthly Retainer", date: addDays(t, 3), venue: "Facebook + Instagram", templateId: CLIENT_CAMPAIGN.id },
      { id: "e_lakbay", kind: "campaign", name: "Lakbay Travel — Summer Promo", date: addDays(t, 60), venue: "Facebook + TikTok", templateId: CLIENT_CAMPAIGN.id },
      { id: "e_nena", kind: "campaign", name: "Aling Nena's — Page Revamp", date: addDays(t, 40), venue: "Facebook", templateId: CLIENT_CAMPAIGN.id },
      { id: "e_manila", kind: "event", name: "AI Words Workshop — Manila", date: addDays(t, 40), venue: "The Mind Museum, BGC", templateId: SPONSORED_EVENT.id },
      { id: "e_kids", kind: "event", name: "Kids Word Fest", date: addDays(t, 75), venue: "SM North EDSA Skydome", templateId: SPONSORED_EVENT.id },
    ],
    deals: [
      { id: "d_kape", title: "Holiday campaign (1 month)", companyId: "c_kape", pipeline: "client", stage: "negotiation", value: 85000, eventId: "e_kape", ownerId: "u_jun", contractId: "k_kape" },
      { id: "d_ngiti", title: "Social media retainer", companyId: "c_ngiti", pipeline: "client", stage: "negotiation", value: 45000, eventId: "e_ngiti", ownerId: "u_jun", contractId: "k_ngiti" },
      { id: "d_lakbay", title: "Summer promo package", companyId: "c_lakbay", pipeline: "client", stage: "proposal", value: 120000, eventId: "e_lakbay", ownerId: "u_jun" },
      { id: "d_nena", title: "Facebook page revamp", companyId: "c_nena", pipeline: "client", stage: "lead", value: 25000, eventId: "e_nena", ownerId: "u_jun" },
      { id: "d_brew", title: "Gold sponsorship", companyId: "c_brew", pipeline: "sponsor", stage: "negotiation", value: 150000, eventId: "e_manila", ownerId: "u_jun", contractId: "k_brew" },
      { id: "d_inkwell", title: "Silver sponsorship", companyId: "c_inkwell", pipeline: "sponsor", stage: "proposal", value: 80000, eventId: "e_manila", ownerId: "u_jun" },
      { id: "d_sari", title: "Bronze sponsorship", companyId: "c_sari", pipeline: "sponsor", stage: "contacted", value: 35000, eventId: "e_kids", ownerId: "u_jun" },
      { id: "d_little", title: "Festival partner", companyId: "c_little", pipeline: "partner", stage: "negotiation", value: 60000, eventId: "e_kids", ownerId: "u_jun", contractId: "k_little" },
      { id: "d_bytecamp", title: "Workshop co-host", companyId: "c_bytecamp", pipeline: "partner", stage: "meeting", value: 40000, eventId: "e_manila", ownerId: "u_jun" },
    ],
    contracts: [
      { id: "k_kape", dealId: "d_kape", fileName: "KapeKultura_Services_Agreement.pdf", text: SAMPLE_CLIENT_CONTRACT, status: "uploaded", deliverables: [] },
      { id: "k_ngiti", dealId: "d_ngiti", fileName: "NgitiDental_Retainer.pdf", text: RETAINER_CONTRACT, status: "confirmed", deliverables: extractDeliverables(RETAINER_CONTRACT) },
      { id: "k_brew", dealId: "d_brew", fileName: "BrewCo_Sponsorship_Gold.pdf", text: SAMPLE_CONTRACT, status: "uploaded", deliverables: [] },
      { id: "k_little", dealId: "d_little", fileName: "LittleReaders_Partnership.pdf", text: PARTNER_CONTRACT, status: "confirmed", deliverables: extractDeliverables(PARTNER_CONTRACT) },
    ],
    projects: [],
    tasks: [],
    comments: [],
    posts: [],
    subscribers: [
      { id: "sub_1", name: "Ella Manalo", email: "ella.m@example.com", level: 4, tier: "learner", parentConsent: false, newsletterConsent: true, source: "website", createdAt: addDays(t, -6) + "T09:12:00.000Z" },
      { id: "sub_2", name: "Rhea Castillo (for Mika, 6)", email: "rhea.c@example.com", level: 1, tier: "scholar", parentConsent: true, newsletterConsent: true, source: "event", createdAt: addDays(t, -3) + "T02:40:00.000Z" },
      { id: "sub_3", name: "Paolo Garcia", email: "pgarcia@example.com", level: 3, tier: "reader", parentConsent: false, newsletterConsent: true, source: "website", createdAt: addDays(t, -1) + "T11:05:00.000Z" },
    ],
    templates: [CLIENT_CAMPAIGN, COURSE_LAUNCH, SPONSORED_EVENT],
    activity: [],
  };

  // Running client retainer, won 4 weeks ago: earlier work done, one approval running late.
  const { projectId: ngiti } = winDeal(s, "d_ngiti", addDays(t, -25));
  for (const task of s.tasks.filter((x) => x.projectId === ngiti && x.due < t)) {
    task.status = "done";
    if (task.requiredAttachment) task.attachments.push(`${task.requiredAttachment}.pdf`);
    for (const sub of task.subtasks) sub.done = true;
  }
  const late = s.tasks.find((x) => x.projectId === ngiti && x.templateKey === "client-approve")!;
  late.due = addDays(t, -1);
  late.status = "in_progress";
  s.comments.push({ id: "cmt_seed0", taskId: late.id, userId: "u_jun", kind: "comment", text: "Dra. Liza is reviewing the videos today. Will follow up after lunch.", at: new Date(Date.now() - 5_400_000).toISOString() });

  // Our own course launch — not from a deal.
  createInitiative(s, { name: "Level 1 · Bitsy — Course Launch", templateId: COURSE_LAUNCH.id, date: addDays(t, 58), venue: "Online · Kids 4–6" }, t);

  // Kids Word Fest already exists as a running event project.
  winDeal(s, "d_little", t);
  const kickoff = s.tasks.find((x) => x.projectId === s.events.find((e) => e.id === "e_kids")!.projectId && x.templateKey === "kickoff")!;
  kickoff.description = "Align on theme, speakers and the sponsor shortlist. Bring last year's attendance numbers.";
  s.comments.push(
    { id: "cmt_seed1", taskId: kickoff.id, userId: "u_sherlyn", kind: "comment", text: "@Mara let's also invite Little Readers' reading coach to this.", at: new Date(Date.now() - 3_600_000).toISOString() },
    { id: "cmt_seed2", taskId: kickoff.id, userId: "u_mara", kind: "comment", text: "Noted po! Sending the invite today.", at: new Date(Date.now() - 1_800_000).toISOString() },
  );
  return s;
}
