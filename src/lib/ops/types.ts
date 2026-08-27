export const AGENT_IDS = [
  "content",
  "chatmate",
  "money",
  "traffic",
  "analytics",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export type AgentMode = "off" | "lite" | "active";

export type SkipReason =
  | "waiting_for_login"
  | "missing_scope"
  | "phase_gated"
  | "cooldown"
  | "guardrail"
  | "api_error"
  | "not_applicable";

export type OutboundKind =
  | "content.publish"
  | "chatmate.send"
  | "chatmate.mass_dm"
  | "money.broadcast"
  | "traffic.campaign";

export type FanvueMe = {
  uuid?: string;
  email?: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  isCreator?: boolean;
  roles?: string[];
  likesCount?: number;
  fanCounts?: {
    followersCount?: number;
    subscribersCount?: number;
  };
  contentCounts?: {
    imageCount?: number;
    videoCount?: number;
    audioCount?: number;
    postCount?: number;
    payToViewPostCount?: number;
  };
};

export type ContentDraft = {
  id: string;
  day: number;
  title: string;
  caption: string;
  placement: "sfw-teaser" | "fanvue-only" | "ppv";
  status: "draft" | "ready" | "queued" | "dismissed";
  createdAt: string;
};

export type ChatDraft = {
  id: string;
  kind: "welcome" | "looker" | "check-in" | "witty" | "invitational" | "re-engage";
  title: string;
  body: string;
  chatId?: string;
  status: "draft" | "ready" | "dismissed";
  createdAt: string;
};

export type MoneyKind = "subscription" | "ppv" | "tip";

export type MoneySuggestion = {
  id: string;
  kind: MoneyKind;
  name: string;
  priceUsd: number;
  note: string;
  createdAt: string;
};

export type DailyPlanItem = {
  id: string;
  step: number;
  title: string;
  detail: string;
  owner: AgentId | "you";
  status: "blocked" | "do_today" | "ready" | "waiting";
  copyText?: string;
};

export type DailyMoneyPlan = {
  date: string;
  phase: Phase;
  mode: "demo" | "live";
  headline: string;
  why: string;
  expectedThisWeek: string;
  items: DailyPlanItem[];
};

export type TrafficReminder = {
  id: string;
  title: string;
  detail: string;
  compliant: true;
  status: "open" | "done" | "dismissed";
  createdAt: string;
};

export type AnalyticsEvent = {
  id: string;
  at: string;
  source: "users/me" | "local" | "insights" | "fixture";
  phase: Phase;
  subscriberCount: number;
  followerCount: number | null;
  postCount: number | null;
  revenueNote: string;
  skipped?: SkipReason;
};

export type Refusal = {
  id: string;
  at: string;
  agent: AgentId | "orchestrator";
  code: string;
  message: string;
};

export type AgentRunResult = {
  agent: AgentId;
  enabled: boolean;
  mode: AgentMode;
  skipped?: SkipReason;
  summary: string;
  draftsCreated: number;
};

export type OpsState = {
  version: 1;
  lastTickAt: string | null;
  lastOutboundAt: string | null;
  lastOutboundAgent: AgentId | null;
  lastOutboundKind: OutboundKind | null;
  agentCooldowns: Partial<Record<AgentId, string>>;
  contentDrafts: ContentDraft[];
  chatDrafts: ChatDraft[];
  moneySuggestions: MoneySuggestion[];
  trafficReminders: TrafficReminder[];
  analyticsLog: AnalyticsEvent[];
  refused: Refusal[];
  todayPlan: DailyMoneyPlan | null;
};

export const EMPTY_STATE: OpsState = {
  version: 1,
  lastTickAt: null,
  lastOutboundAt: null,
  lastOutboundAgent: null,
  lastOutboundKind: null,
  agentCooldowns: {},
  contentDrafts: [],
  chatDrafts: [],
  moneySuggestions: [],
  trafficReminders: [],
  analyticsLog: [],
  refused: [],
  todayPlan: null,
};

export const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const FANVUE_API_VERSION = "2025-06-26";

export const IMPLEMENTATION_ORDER: AgentId[] = [
  "content",
  "chatmate",
  "money",
  "traffic",
  "analytics",
];
