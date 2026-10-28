import type { State, Template } from "./types";
import { addDays, today } from "./dates";
import { extractDeliverables } from "./ai";
import { winDeal } from "./engine";

export const STATE_VERSION = 1;

/** Draft template — to be corrected with a real event example. */
const SPONSORED_WORKSHOP: Template = {
  id: "tpl_workshop",
  name: "Sponsored Workshop",
  tasks: [
    { key: "kickoff", title: "Kickoff meeting & confirm scope", role: "admin", offset: -45, priority: "high", checklist: ["Agenda & speakers", "Budget", "Sponsor list"] },
    { key: "venue", title: "Confirm venue booking", role: "eventops", offset: -40, priority: "high", dependsOn: ["kickoff"], requiredAttachment: "Signed venue confirmation" },
    { key: "poster", title: "Design master event poster", role: "creative", offset: -28, dependsOn: ["kickoff"] },
    { key: "social-plan", title: "Social campaign plan (T-6 weeks → day-of)", role: "social", offset: -42, dependsOn: ["kickoff"] },
    { key: "registration", title: "Open registration page", role: "social", offset: -25, dependsOn: ["venue"] },
    { key: "run-of-show", title: "Draft run-of-show", role: "eventops", offset: -21, dependsOn: ["venue"] },
    { key: "final-poster", title: "Finalize poster with ALL sponsor logos", role: "creative", offset: -14, priority: "high", dependsOn: ["poster"], requiredAttachment: "Final poster (all sponsor logos)" },
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

const PARTNER_CONTRACT = `PARTNERSHIP AGREEMENT
AI Dictionary x Little Readers PH

Partner Deliverables:
1. Partner logo on 2 posters.
2. 3 Facebook posts co-promoting the festival.
3. Speaking slot for the partner's reading coach.`;

export function seed(): State {
  const t = today();
  const s: State = {
    version: STATE_VERSION,
    currentUserId: null,
    users: [
      { id: "u_sherlyn", name: "Sherlyn Aguilar", roles: ["owner"], color: "#1B2A4A" },
      { id: "u_mara", name: "Mara Santos", roles: ["admin"], color: "#7C3AED" },
      { id: "u_jun", name: "Jun Reyes", roles: ["sales"], color: "#0891B2" },
      { id: "u_bea", name: "Bea Cruz", roles: ["creative"], color: "#DB2777" },
      { id: "u_paolo", name: "Paolo Lim", roles: ["social"], color: "#C98A12" },
      { id: "u_rina", name: "Rina Dela Paz", roles: ["eventops"], color: "#059669" },
    ],
    companies: [
      { id: "c_brew", name: "Brew & Co. Coffee", contactName: "Carla Mendoza", contactEmail: "carla@brewco.example" },
      { id: "c_little", name: "Little Readers PH", contactName: "Tess Ramos", contactEmail: "tess@littlereaders.example" },
      { id: "c_inkwell", name: "Inkwell Bookstore", contactName: "Ben Uy", contactEmail: "ben@inkwell.example" },
      { id: "c_bytecamp", name: "ByteCamp Academy", contactName: "Leo Garcia", contactEmail: "leo@bytecamp.example" },
      { id: "c_sari", name: "SariSari Tech", contactName: "Ana Villanueva", contactEmail: "ana@sarisari.example" },
      { id: "c_luz", name: "Luzon Print House", contactName: "Rico Tan", contactEmail: "rico@luzonprint.example" },
    ],
    events: [
      { id: "e_manila", name: "AI Words Workshop — Manila", date: addDays(t, 40), venue: "The Mind Museum, BGC", templateId: SPONSORED_WORKSHOP.id },
      { id: "e_kids", name: "Kids Word Fest", date: addDays(t, 75), venue: "SM North EDSA Skydome", templateId: SPONSORED_WORKSHOP.id },
    ],
    deals: [
      { id: "d_brew", title: "Gold sponsorship", companyId: "c_brew", pipeline: "sponsor", stage: "negotiation", value: 150000, eventId: "e_manila", ownerId: "u_jun", contractId: "k_brew" },
      { id: "d_little", title: "Festival partner", companyId: "c_little", pipeline: "partner", stage: "negotiation", value: 60000, eventId: "e_kids", ownerId: "u_jun", contractId: "k_little" },
      { id: "d_inkwell", title: "Silver sponsorship", companyId: "c_inkwell", pipeline: "sponsor", stage: "proposal", value: 80000, eventId: "e_manila", ownerId: "u_jun" },
      { id: "d_bytecamp", title: "Workshop co-host", companyId: "c_bytecamp", pipeline: "partner", stage: "meeting", value: 40000, eventId: "e_manila", ownerId: "u_jun" },
      { id: "d_sari", title: "Bronze sponsorship", companyId: "c_sari", pipeline: "sponsor", stage: "contacted", value: 35000, eventId: "e_kids", ownerId: "u_jun" },
      { id: "d_luz", title: "Print partner (in-kind)", companyId: "c_luz", pipeline: "sponsor", stage: "lead", value: 25000, eventId: "e_kids", ownerId: "u_jun" },
    ],
    contracts: [
      { id: "k_brew", dealId: "d_brew", fileName: "BrewCo_Sponsorship_Gold.pdf", text: SAMPLE_CONTRACT, status: "uploaded", deliverables: [] },
      { id: "k_little", dealId: "d_little", fileName: "LittleReaders_Partnership.pdf", text: PARTNER_CONTRACT, status: "confirmed", deliverables: extractDeliverables(PARTNER_CONTRACT) },
    ],
    projects: [],
    tasks: [],
    posts: [],
    templates: [SPONSORED_WORKSHOP],
    activity: [],
  };
  // Kids Word Fest already exists as a running project.
  winDeal(s, "d_little", t);
  return s;
}
