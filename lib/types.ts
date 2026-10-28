export type Role = "owner" | "admin" | "sales" | "creative" | "social" | "eventops" | "instructor";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin / PM",
  sales: "Sales / Accounts",
  creative: "Creative",
  social: "Social / Content",
  eventops: "Event Ops",
  instructor: "Instructor",
};

export type User = { id: string; name: string; email: string; roles: Role[]; color: string };

export type Company = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
};

export type Pipeline = "client" | "sponsor" | "partner";

export const PIPELINE_LABEL: Record<Pipeline, string> = {
  client: "Clients",
  sponsor: "Sponsors",
  partner: "Partners",
};

export const STAGES = [
  "lead",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "active",
  "completed",
  "renewal",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Lead",
  contacted: "Contacted",
  meeting: "Meeting Booked",
  proposal: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  active: "Active",
  completed: "Completed",
  renewal: "Renewal",
};

export type Deal = {
  id: string;
  title: string;
  companyId: string;
  pipeline: Pipeline;
  stage: Stage;
  value: number;
  eventId: string;
  ownerId: string;
  contractId?: string;
};

export type DeliverableKind =
  // sponsor / partner benefits
  | "logo"
  | "social"
  | "booth"
  | "speaking"
  // agency work for clients
  | "content"
  | "video"
  | "ads"
  | "report"
  | "other";

export type Deliverable = {
  id: string;
  kind: DeliverableKind;
  description: string;
  quantity: number;
  /** Line from the contract this was extracted from. */
  sourceLine: string;
};

export type Contract = {
  id: string;
  dealId: string;
  fileName: string;
  text: string;
  status: "uploaded" | "extracted" | "confirmed";
  deliverables: Deliverable[];
};

/** What a project is anchored to. Its date is T-0 (event day, launch day, campaign start). */
export type InitiativeKind = "event" | "campaign" | "course";

export const INITIATIVE: Record<InitiativeKind, { label: string; icon: string; dateLabel: string }> = {
  event: { label: "Event", icon: "📅", dateLabel: "Event day" },
  campaign: { label: "Client campaign", icon: "📣", dateLabel: "Launch" },
  course: { label: "Course launch", icon: "🎓", dateLabel: "Launch" },
};

export type Event = {
  id: string;
  kind: InitiativeKind;
  name: string;
  date: string; // YYYY-MM-DD
  venue: string;
  templateId: string;
  projectId?: string;
};

export type Health = "green" | "yellow" | "red";

export type Project = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string;
};

export type TaskStatus = "todo" | "in_progress" | "blocked" | "in_review" | "done";
export type TaskSource = "template" | "contract" | "chat" | "meeting" | "manual";

export type Subtask = {
  id: string;
  title: string;
  assigneeIds: string[];
  due?: string;
  done: boolean;
};

export type ApprovalDecision = {
  userId: string;
  decision: "approved" | "changes";
  note?: string;
  at: string;
};

export type Approval = {
  approverIds: string[];
  /** Decisions for the current review round; cleared on resubmit. */
  decisions: ApprovalDecision[];
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  role: Role;
  assigneeId: string;
  due: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  dependsOn: string[];
  source: TaskSource;
  templateKey?: string;
  deliverableId?: string;
  companyId?: string;
  requiredAttachment?: string;
  attachments: string[];
  subtasks: Subtask[];
  approval?: Approval;
  createdBy?: string;
  /** YYYY-MM-DD the task was created; used by reminder rules. */
  createdAt?: string;
  /** Special reminder rule attached to this task. */
  automation?: "logo-request";
  /** Created automatically from chat because nobody acted on the suggestion. */
  autoCaptured?: boolean;
  /** Chat message this task came from. */
  messageId?: string;
};

/** Remark on a task. System entries record status changes and approvals. */
export type Comment = {
  id: string;
  taskId: string;
  userId?: string;
  agent?: ActivityEntry["agent"];
  kind: "comment" | "system";
  text: string;
  at: string;
};

export type SocialPost = {
  id: string;
  projectId: string;
  title: string;
  date: string;
  status: "slot" | "draft" | "scheduled" | "published";
  companyId?: string;
  deliverableId?: string;
};

export type TemplateTask = {
  key: string;
  title: string;
  role: Role;
  /** Days relative to event date (negative = before). */
  offset: number;
  dependsOn?: string[];
  requiredAttachment?: string;
  checklist?: string[];
  priority?: Task["priority"];
  /** Roles whose sign-off is needed before the task is Done. */
  approverRoles?: Role[];
};

export type Template = { id: string; name: string; kind: InitiativeKind; description: string; tasks: TemplateTask[] };

export type ActivityEntry = {
  id: string;
  at: string; // ISO timestamp
  agent?: "Clerk" | "Scout" | "Herald" | "Sentinel" | "Coach" | "Scribe" | "Tutor";
  message: string;
  href?: string;
};

export type Tier = "reader" | "learner" | "scholar";
export type LevelId = 1 | 2 | 3 | 4 | 5;

export type Subscriber = {
  id: string;
  name: string;
  email: string;
  level: LevelId;
  tier: Tier;
  /** Parent/guardian consent, required for Levels 1–2 (minors). */
  parentConsent: boolean;
  newsletterConsent: boolean;
  source: "website" | "event" | "import";
  createdAt: string;
};

/** One line of a person's evening check-in. */
export type DailyUpdate = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD the update is for
  taskId: string;
  status: "done" | "in_progress" | "blocked";
  percent?: number;
  note?: string;
  at: string;
};

/** A submitted evening check-in ("Today's entry"). */
export type CheckIn = {
  userId: string;
  date: string;
  submittedAt: string;
  taskCount: number;
};

export type NotificationKind = "morning" | "checkin" | "nudge" | "no-update" | "due-soon" | "overdue" | "escalation" | "logo" | "approval" | "blocked" | "mention" | "captured";

/**
 * Chat channels are derived, not stored: "general", "prj:<projectId>",
 * and "dm:<userA>:<userB>" (ids sorted).
 */
export type Message = {
  id: string;
  channelId: string;
  userId: string;
  text: string;
  at: string;
};

/** A task Scribe spotted in a chat message, waiting for someone to act. */
export type Suggestion = {
  id: string;
  messageId: string;
  channelId: string;
  title: string;
  assigneeId?: string;
  role: Role;
  due: string;
  projectId?: string;
  status: "suggested" | "created" | "ignored" | "auto";
  taskId?: string;
  createdAt: string;
  decidedBy?: string;
};

/** In-app reminder. Prototype: nothing is sent outside the app. */
export type Notification = {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  at: string;
  read: boolean;
};

export type State = {
  version: number;
  currentUserId: string | null;
  users: User[];
  companies: Company[];
  deals: Deal[];
  contracts: Contract[];
  events: Event[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  posts: SocialPost[];
  subscribers: Subscriber[];
  templates: Template[];
  activity: ActivityEntry[];
  dailyUpdates: DailyUpdate[];
  checkins: CheckIn[];
  notifications: Notification[];
  /** Reminder rules that already fired (so each fires once). */
  firedKeys: string[];
  /** Demo clock: ISO time the app pretends it is, or null for real time. */
  simulatedNow: string | null;
  messages: Message[];
  suggestions: Suggestion[];
  /** Last time each person opened each channel: userId → channelId → ISO. */
  chatReads: Record<string, Record<string, string>>;
};
