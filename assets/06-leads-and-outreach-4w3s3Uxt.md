# Central Hub source bundle, part 06: Lead Finder, Saved Leads, and Outreach

## Manifest

1. `src/components/hub/LeadFinder.tsx`, the public business research, saved-lead pipeline, and manual lead management workspace
2. `src/components/hub/LeadPipeline.tsx`, the saved lead status pipeline and stage controls
3. `src/components/hub/LeadPublicDetails.tsx`, the normalized public contact, people, profile, and research details view
4. `src/components/hub/LeadOutreachPanel.tsx`, the private website and outreach bundle review panel
5. `src/components/hub/LeadDataSyncAction.tsx`, the safe restore action for missing saved leads
6. `src/components/hub/SavedLeadStudioWorkspace.tsx`, the saved lead private website and outreach studio
7. `src/components/hub/SavedLeadOutreachPanel.tsx`, the manual outreach draft and generation panel
8. `src/components/hub/ManualOutreachDm.tsx`, the editable manual direct-message draft tool
9. `src/components/hub/OutreachAssetEditor.tsx`, the reusable outreach asset editor and copy controls

This is a documentation-only source capture. The exact current source is preserved below in manifest order, with no omitted sections, placeholders, user records, secrets, deployment URLs, or generated artifacts.

## src/components/hub/LeadFinder.tsx

```tsx
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  MousePointerClick,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LeadPipeline } from "@/components/hub/LeadPipeline";
import {
  LeadPublicDetails,
  normalizedContactDetails,
  normalizedPublicPeople,
  normalizedSocialLinks,
  publicOwnerFor,
} from "@/components/hub/LeadPublicDetails";
import { SocialLinksBar } from "@/components/hub/SocialLinksBar";
import { Lead } from "@/entities";
import { resetLeadFinder, searchLeads } from "@/functions";
import { LEAD_FINDER_SUGGESTIONS } from "@/lib/hub-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUSES = ["new", "contacted", "replied", "meeting", "won", "lost", "not_interested"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;
const WEBSITE_STATUSES = ["none", "dodgy", "outdated", "good"] as const;
const CONTACT_METHODS = ["email", "phone", "dm", "in_person"] as const;
const CATEGORY_FILTERS = ["all", "hot", "warm", "cold"] as const;
const WEBSITE_FILTERS = ["all", "no_site", "reachable", "needs_attention", "inspection_failed", "not_checked"] as const;
const SEARCH_UNAVAILABLE_MESSAGE = "Lead research is temporarily unavailable. Try again shortly.";
const PREVIEW_CONNECTION_MESSAGE = "The preview connection dropped before Lead Finder received a response. Refresh the preview and try again.";
const SEARCH_TIMEOUT_MESSAGE = "Lead Finder did not receive a response before the time limit. The request may not have reached the backend. Try again.";
const REQUEST_FAILED_MESSAGE = "Lead Finder could not complete the request. Check the connection and try again.";
const UNREADABLE_RESPONSE_MESSAGE = "Lead Finder returned an unreadable response. Try the search again shortly.";
const RELEVANCE_UNAVAILABLE_MESSAGE = "Lead relevance checks were unavailable for this search. Try again shortly.";
const NO_RESULTS_MESSAGE = "No verified public businesses matched that business type and market. Results appear only when direct public evidence supports the business.";
const LEAD_FINDER_RESULT_LIMIT = 30;
const SEARCH_REQUEST_TIMEOUT_MS = 150_000;

type LeadRecord = Record<string, any>;
type WebsiteSignals = Record<string, any> & {
  clearTitle?: boolean;
  canonicalUrl?: string;
  canonicalPresent?: boolean;
  robotsTxtAvailable?: boolean | null;
  sitemapAvailable?: boolean | null;
  llmsTxtAvailable?: boolean | null;
  servicePath?: boolean;
  serviceLocationContent?: boolean;
  localBusinessSchema?: boolean;
  organizationSchema?: boolean;
  faqSection?: boolean;
  questionAnswerContent?: boolean;
  faqPageSchema?: boolean;
  howToSchema?: boolean;
  directServiceLocationAnswers?: boolean;
  whatWeDoContent?: boolean;
  firstPartyProof?: boolean;
  activeTradingEvidence?: "strong" | "some" | "uncertain";
  activeTradingLabels?: string[];
  activeProfileCount?: number;
  activeProfileInspectionCount?: number;
  recentActivityMarkers?: number;
  seoGapSignals?: string[];
  aeoGapSignals?: string[];
  conversionGapSignals?: string[];
  seoGapCount?: number;
  aeoGapCount?: number;
  conversionGapCount?: number;
};
type SearchState = "idle" | "loading" | "results" | "empty" | "error";
type SearchQuery = { businessType: string; location: string };
type SearchErrorKind = "not_started" | "network" | "provider" | "relevance" | "request";
type SearchRunDiagnostics = {
  provider: string;
  queryCount: number | null;
  discoveryRawItemCount: number | null;
  socialRawItemCount: number | null;
  discoveryParsedItemCount: number | null;
  socialParsedItemCount: number | null;
  discoveryRejectionCounts: Record<string, number>;
  socialRejectionCounts: Record<string, number>;
  allQueriesCompleted: boolean | null;
  providerCompleted: boolean | null;
  providerUnavailable: boolean | null;
  relevanceGateApplied: boolean | null;
  relevanceModelAcceptedCount: number | null;
  relevanceModelRejectedCount: number | null;
  relevanceModelExtractedSocialCount: number | null;
  relevanceModelFailureCategory: string;
  nicheMatchRejectedCount: number | null;
  searchStatus: string;
  providerCategory: string;
};
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];
type WebsiteFilter = (typeof WEBSITE_FILTERS)[number];
type LeadCategory = "hot" | "warm" | "cold";

type SearchResultLead = {
  businessName: string;
  trade: string;
  location: string;
  phone?: string;
  email?: string;
  website?: string;
  websiteStatus?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  linkedinUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: Array<{ platform?: string; url?: string }>;
  contactDetails?: {
    phones?: string[];
    emails?: string[];
    contactPageUrl?: string;
    bookingUrl?: string;
    physicalAddress?: string;
    serviceAreas?: string[];
    openingHours?: string;
  };
  businessSummary?: string;
  services?: string[];
  ownerName?: string;
  ownerRole?: string;
  ownerSourceUrl?: string;
  publicPeople?: Array<{ name?: string; role?: string; sourceUrl?: string; source_url?: string }>;
  researchSourceUrls?: string[];
  evidenceUrl?: string;
  leadKey?: string;
  source?: string;
  socialBio?: string;
  priority?: string;
  score?: number;
  leadCategory?: string;
  scoreReasons?: string[];
  websiteSignals?: WebsiteSignals;
  websiteLastCheckedAt?: string;
  verificationType?: "website" | "official_profile";
  verificationReason?: string;
};

type LeadFinderProps = {
  initialOpenLeadId?: string | null;
  onInitialOpenHandled?: (leadId: string) => void;
};

type ManualForm = {
  businessName: string;
  trade: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  websiteStatus: string;
  priority: string;
  socialBio: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
  googleBusinessUrl: string;
  previewUrl: string;
};

type WebsiteSummary = {
  key: Exclude<WebsiteFilter, "all">;
  label: string;
  detail: string;
  className: string;
  icon: LucideIcon;
};

const emptyManualForm = (): ManualForm => ({
  businessName: "",
  trade: "",
  location: "",
  phone: "",
  email: "",
  website: "",
  websiteStatus: "none",
  priority: "medium",
  socialBio: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  linkedinUrl: "",
  googleBusinessUrl: "",
  previewUrl: "",
});

function safeHttpUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname && !parsed.username && !parsed.password
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function normalized(value: unknown) {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numericScore(value: unknown): number | null {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : null;
}

function validWebsiteStatus(value: unknown) {
  const candidate = text(value, "none").toLowerCase();
  return WEBSITE_STATUSES.includes(candidate as (typeof WEBSITE_STATUSES)[number]) ? candidate : "none";
}

function validPriority(value: unknown) {
  const candidate = text(value, "medium").toLowerCase();
  return PRIORITIES.includes(candidate as (typeof PRIORITIES)[number]) ? candidate : "medium";
}

function validLeadCategory(value: unknown): LeadCategory | "" {
  const candidate = text(value).toLowerCase();
  return ["hot", "warm", "cold"].includes(candidate) ? candidate as LeadCategory : "";
}

type VerificationMeta = {
  verified: boolean;
  kind: "website" | "official_profile" | "unknown";
  label: string;
  detail: string;
};

function verificationMeta(lead: Partial<SearchResultLead> | LeadRecord): VerificationMeta {
  const kind = text(lead.verificationType).toLowerCase();
  const verified = Boolean(text(lead.verificationReason)) && (kind === "website" || kind === "official_profile");
  if (!verified) return {
    verified: false,
    kind: "unknown",
    label: "Verification unavailable",
    detail: "This result did not pass the business identity check and cannot be saved.",
  };
  if (kind === "official_profile") return {
    verified: true,
    kind: "official_profile",
    label: "Official business profile",
    detail: text(lead.verificationReason, "An official business profile passed the public identity check."),
  };
  return {
    verified: true,
    kind: "website",
    label: "Official homepage",
    detail: text(lead.verificationReason, "An official business homepage passed the public identity check."),
  };
}

function isVerifiedSearchResult(lead: Partial<SearchResultLead> | LeadRecord) {
  return verificationMeta(lead).verified;
}

function priorityForWebsite(status: string) {
  return status === "none" || status === "dodgy" ? "high" : status === "outdated" ? "medium" : "low";
}

function leadKeyFor(lead: Partial<SearchResultLead> | LeadRecord) {
  const evidence = [lead.evidenceUrl, lead.website, lead.instagramUrl, lead.facebookUrl, lead.tiktokUrl, lead.linkedinUrl, lead.googleBusinessUrl]
    .map(safeHttpUrl)
    .find(Boolean);
  if (evidence) return evidence;
  return [lead.businessName, lead.trade, lead.location, lead.phone].map(normalized).join("|");
}

function sameLead(first: Partial<SearchResultLead> | LeadRecord, second: Partial<SearchResultLead> | LeadRecord) {
  const firstKey = text(first.leadKey) || leadKeyFor(first);
  const secondKey = text(second.leadKey) || leadKeyFor(second);
  if (firstKey && secondKey && firstKey === secondKey) return true;
  return [first.businessName, first.trade, first.location].map(normalized).join("|")
    === [second.businessName, second.trade, second.location].map(normalized).join("|");
}

function unwrapFunctionData(value: unknown, depth = 0): any {
  if (depth > 6 || value === null || value === undefined) return {};
  if (typeof value === "string") {
    try {
      return unwrapFunctionData(JSON.parse(value), depth + 1);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const nested = record.data ?? record.body;
  return nested !== undefined && nested !== null && (typeof nested === "object" || typeof nested === "string")
    ? unwrapFunctionData(nested, depth + 1)
    : record;
}

function errorData(error: any) {
  const candidates = [error?.response?.data, error?.response?.body, error?.data, error?.body, error?.response, error];
  for (const candidate of candidates) {
    const data = unwrapFunctionData(candidate);
    if (Object.keys(data).length > 0) return data;
  }
  return {};
}

function responseStatusFor(error: any, data: any = {}) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.httpStatus,
    error?.response?.status,
    error?.response?.statusCode,
    data?.status,
    data?.statusCode,
    data?.httpStatus,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 100 && value <= 599) return String(Math.trunc(value));
    if (typeof value === "string" && /^\d{3}$/.test(value)) return value;
  }
  return "";
}

function isSearchTimeout(error: any) {
  return String(error?.code || "") === "LEAD_FINDER_TIMEOUT" || /lead finder request timed out/i.test(String(error?.message || ""));
}

function isTransportFailure(error: any, data: any) {
  if (responseStatusFor(error, data)) return false;
  const details = [error?.code, error?.message, data?.code, data?.message, data?.error]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return /(network error|networkerror|failed to fetch|fetch failed|load failed|network request failed|connection (?:lost|closed|reset|refused)|err_network|econn(?:reset|refused|aborted)|cors|timeout)/i.test(details);
}

function diagnosticNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function diagnosticBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && /^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === "true";
  return null;
}

function diagnosticText(value: unknown, fallback = "") {
  return text(value, fallback).replace(/[^a-zA-Z0-9 _./:-]/g, "").slice(0, 80);
}

function diagnosticCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((result, [key, value]) => {
    const count = diagnosticNumber(value);
    if (count !== null && /^[a-zA-Z0-9_-]{1,80}$/.test(key)) result[key] = count;
    return result;
  }, {});
}

function readSearchRunDiagnostics(data: any): SearchRunDiagnostics | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const nested = data.searchDiagnostics && typeof data.searchDiagnostics === "object" && !Array.isArray(data.searchDiagnostics)
    ? data.searchDiagnostics as Record<string, unknown>
    : {};
  const source = { ...nested, ...data } as Record<string, unknown>;
  const diagnosticKeys = [
    "provider", "queryCount", "discoveryRawItemCount", "socialRawItemCount", "discoveryParsedItemCount", "socialParsedItemCount",
    "discoveryRejectionCounts", "socialRejectionCounts", "allQueriesCompleted", "providerCompleted", "providerUnavailable",
    "relevanceGateApplied", "relevanceModelAcceptedCount", "relevanceModelRejectedCount", "relevanceModelExtractedSocialCount",
    "relevanceModelFailureCategory", "nicheMatchRejectedCount", "providerCategory",
  ];
  if (!diagnosticKeys.some((key) => source[key] !== undefined)) return null;
  return {
    provider: diagnosticText(source.provider, "Firecrawl"),
    queryCount: diagnosticNumber(source.queryCount),
    discoveryRawItemCount: diagnosticNumber(source.discoveryRawItemCount),
    socialRawItemCount: diagnosticNumber(source.socialRawItemCount),
    discoveryParsedItemCount: diagnosticNumber(source.discoveryParsedItemCount),
    socialParsedItemCount: diagnosticNumber(source.socialParsedItemCount),
    discoveryRejectionCounts: diagnosticCounts(source.discoveryRejectionCounts),
    socialRejectionCounts: diagnosticCounts(source.socialRejectionCounts),
    allQueriesCompleted: diagnosticBoolean(source.allQueriesCompleted),
    providerCompleted: diagnosticBoolean(source.providerCompleted),
    providerUnavailable: diagnosticBoolean(source.providerUnavailable),
    relevanceGateApplied: diagnosticBoolean(source.relevanceGateApplied),
    relevanceModelAcceptedCount: diagnosticNumber(source.relevanceModelAcceptedCount),
    relevanceModelRejectedCount: diagnosticNumber(source.relevanceModelRejectedCount),
    relevanceModelExtractedSocialCount: diagnosticNumber(source.relevanceModelExtractedSocialCount),
    relevanceModelFailureCategory: diagnosticText(source.relevanceModelFailureCategory),
    nicheMatchRejectedCount: diagnosticNumber(source.nicheMatchRejectedCount),
    searchStatus: diagnosticText(source.searchStatus, "unknown"),
    providerCategory: diagnosticText(source.providerCategory),
  };
}

function searchErrorKindFor(error: any, data: any = {}): SearchErrorKind {
  const diagnostics = data?.searchDiagnostics && typeof data.searchDiagnostics === "object" && !Array.isArray(data.searchDiagnostics)
    ? data.searchDiagnostics as Record<string, unknown>
    : {};
  const providerCategory = text(data?.providerCategory || diagnostics.providerCategory).toLowerCase();
  const relevanceFailure = text(data?.relevanceModelFailureCategory || diagnostics.relevanceModelFailureCategory).toLowerCase();
  const providerUnavailable = diagnosticBoolean(data?.providerUnavailable) === true || diagnosticBoolean(diagnostics.providerUnavailable) === true;
  const providerIncomplete = diagnosticBoolean(data?.providerCompleted) === false
    || diagnosticBoolean(diagnostics.providerCompleted) === false
    || diagnosticBoolean(data?.allQueriesCompleted) === false
    || diagnosticBoolean(diagnostics.allQueriesCompleted) === false;
  if (providerCategory === "relevance_gate" || providerCategory.includes("relevance") || relevanceFailure) return "relevance";
  if (providerUnavailable || providerIncomplete || Boolean(providerCategory) || text(data?.discoveryFailureCategory) || text(data?.crossReferenceFailureCategory)) return "provider";
  if (isTransportFailure(error, data)) return "network";
  return "request";
}

function withSearchTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("Lead Finder request timed out.") as Error & { code?: string };
      error.code = "LEAD_FINDER_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function recordWithId(value: unknown, depth = 0): LeadRecord | null {
  if (!value || typeof value !== "object" || depth > 5) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = recordWithId(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as LeadRecord;
  if (record.id !== undefined && record.id !== null && String(record.id).trim()) return record;
  for (const key of ["data", "lead", "record", "result", "item"]) {
    const found = recordWithId(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function recordList(value: unknown, depth = 0): LeadRecord[] | null {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as LeadRecord[];
  if (!value || typeof value !== "object" || depth > 5) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["data", "records", "items", "leads"]) {
    const found = recordList(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function searchMessageFor(data: any, fallback = SEARCH_UNAVAILABLE_MESSAGE, statusCode = "", kind?: SearchErrorKind) {
  const status = text(data?.searchStatus).toLowerCase();
  const httpStatus = statusCode || responseStatusFor(data, data);
  const errorKind = kind || searchErrorKindFor(undefined, data);
  if (status === "authentication_failed" || httpStatus === "401") return text(data?.message || data?.error, "Lead research could not authenticate this request. Refresh the page and try again.");
  if (status === "permission_denied" || httpStatus === "403") return text(data?.message || data?.error, "Lead research access was denied. Refresh the page and try again.");
  if (status === "no_verified_results") return NO_RESULTS_MESSAGE;
  if (errorKind === "relevance") return text(data?.message || data?.error, RELEVANCE_UNAVAILABLE_MESSAGE);
  if (errorKind === "provider") return text(data?.message || data?.error, SEARCH_UNAVAILABLE_MESSAGE);
  if (status === "invalid_request") return text(data?.message || data?.error, REQUEST_FAILED_MESSAGE);
  return text(data?.message || data?.error, fallback);
}

function searchFailureMessage(error: any, data: any) {
  const kind = searchErrorKindFor(error, data);
  if (kind === "network") {
    if (isSearchTimeout(error)) return SEARCH_TIMEOUT_MESSAGE;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "Your browser is offline. Reconnect and try again.";
    return PREVIEW_CONNECTION_MESSAGE;
  }
  const statusCode = responseStatusFor(error, data);
  if (Number(statusCode) >= 500) return REQUEST_FAILED_MESSAGE;
  return searchMessageFor(data, REQUEST_FAILED_MESSAGE, statusCode, kind);
}

function searchErrorTitle(kind: SearchErrorKind | null) {
  switch (kind) {
    case "not_started": return "Search did not start";
    case "network": return "No response from Lead Finder";
    case "provider": return "Search provider unavailable";
    case "relevance": return "Relevance check unavailable";
    default: return "Search could not be completed";
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "contacted": return { label: "Contacted", className: "border-primary/25 bg-primary/10 text-primary", dot: "bg-primary" };
    case "replied": return { label: "Replied", className: "border-cyan-accent/25 bg-cyan-accent/10 text-cyan-accent", dot: "bg-cyan-accent" };
    case "meeting": return { label: "Closing", className: "border-amber-500/25 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" };
    case "won": return { label: "Won", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" };
    case "lost": return { label: "Lost", className: "border-red-500/25 bg-red-500/10 text-red-300", dot: "bg-red-400" };
    case "not_interested": return { label: "Not interested", className: "border-zinc-700 bg-zinc-800/70 text-zinc-400", dot: "bg-zinc-500" };
    default: return { label: "New", className: "border-blue-500/25 bg-blue-500/10 text-blue-300", dot: "bg-blue-400" };
  }
}

function priorityConfig(priority: string) {
  if (priority === "high") return { label: "High", className: "border-primary bg-primary text-primary-foreground" };
  if (priority === "medium") return { label: "Medium", className: "border-cyan-accent/30 bg-cyan-accent/10 text-cyan-accent" };
  return { label: "Low", className: "border-zinc-700 bg-zinc-800 text-zinc-400" };
}

function priorityRank(value: unknown) {
  return ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[validPriority(value)] ?? 1;
}

function categoryMeta(value: unknown, score: unknown) {
  const category = validLeadCategory(value);
  const hasRanking = Boolean(category) && numericScore(score) !== null;
  if (!hasRanking) return { label: "UNRANKED", className: "border-violet-500/25 bg-violet-500/10 text-violet-200", icon: null as LucideIcon | null };
  if (category === "hot") return { label: "HOT", className: "border-red-500/30 bg-red-500/10 text-red-200", icon: Flame };
  if (category === "warm") return { label: "WARM", className: "border-amber-500/30 bg-amber-500/10 text-amber-200", icon: null as LucideIcon | null };
  return { label: "COLD", className: "border-zinc-700 bg-zinc-800/80 text-zinc-300", icon: null as LucideIcon | null };
}

const UNKNOWN_LEAD_RANK = 3;

function rankingScore(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : null;
}

function leadCategoryRank(value: unknown, score: unknown): number {
  const category = validLeadCategory(value);
  if (!category || rankingScore(score) === null) return UNKNOWN_LEAD_RANK;
  if (category === "hot") return 0;
  if (category === "warm") return 1;
  return 2;
}

function activeTradingRank(lead: Partial<SearchResultLead> | LeadRecord): number {
  const signals = lead.websiteSignals && typeof lead.websiteSignals === "object" && !Array.isArray(lead.websiteSignals)
    ? lead.websiteSignals as WebsiteSignals
    : {};
  const evidence = text(signals.activeTradingEvidence).toLowerCase();
  if (evidence === "strong") return 0;
  if (evidence === "some") return 1;
  if (evidence === "uncertain") return 2;
  return UNKNOWN_LEAD_RANK;
}

function businessNameRank(first: unknown, second: unknown): number {
  const firstName = text(first);
  const secondName = text(second);
  const firstNormalized = firstName.toLowerCase();
  const secondNormalized = secondName.toLowerCase();
  if (firstNormalized < secondNormalized) return -1;
  if (firstNormalized > secondNormalized) return 1;
  if (firstName < secondName) return -1;
  if (firstName > secondName) return 1;
  return 0;
}

function compareLeadRanking(first: Partial<SearchResultLead> | LeadRecord, second: Partial<SearchResultLead> | LeadRecord): number {
  const firstCategoryRank = leadCategoryRank(first.leadCategory, first.score);
  const secondCategoryRank = leadCategoryRank(second.leadCategory, second.score);
  if (firstCategoryRank !== secondCategoryRank) return firstCategoryRank - secondCategoryRank;
  if (firstCategoryRank === UNKNOWN_LEAD_RANK) return 0;

  const scoreDifference = (rankingScore(second.score) ?? Number.NEGATIVE_INFINITY) - (rankingScore(first.score) ?? Number.NEGATIVE_INFINITY);
  if (scoreDifference !== 0) return scoreDifference;

  const activityDifference = activeTradingRank(first) - activeTradingRank(second);
  if (activityDifference !== 0) return activityDifference;

  return businessNameRank(first.businessName, second.businessName);
}

function websiteSummary(lead: Partial<SearchResultLead> | LeadRecord): WebsiteSummary {
  const website = safeHttpUrl(lead.website);
  const status = validWebsiteStatus(lead.websiteStatus);
  const signals = lead.websiteSignals && typeof lead.websiteSignals === "object" && !Array.isArray(lead.websiteSignals)
    ? lead.websiteSignals as WebsiteSignals
    : {};
  const inspectionStatus = text(signals.inspectionStatus).toLowerCase();
  const inspectedStatus = text(signals.status).toLowerCase();
  const hasCheckedInspection = inspectionStatus === "checked";

  if (!website || status === "none" || inspectedStatus === "no_site") {
    return { key: "no_site", label: "No verified website", detail: "Public profile or social evidence only", className: "border-red-500/25 bg-red-500/10 text-red-300", icon: AlertTriangle };
  }
  if (inspectionStatus === "failed" || (hasCheckedInspection && inspectedStatus === "inspection_failed")) {
    return { key: "inspection_failed", label: "Inspection failed", detail: text(signals.inspectionReason, "The public homepage could not be checked"), className: "border-orange-500/30 bg-orange-500/10 text-orange-300", icon: WifiOff };
  }
  if (hasCheckedInspection && inspectedStatus === "parked") {
    return { key: "needs_attention", label: "Parked or unfinished", detail: "The homepage contains parked or under-construction language", className: "border-red-500/25 bg-red-500/10 text-red-300", icon: AlertTriangle };
  }
  if (hasCheckedInspection && (inspectedStatus === "broken" || inspectedStatus === "unreachable")) {
    return { key: "needs_attention", label: "Broken or unreachable", detail: "The official homepage is not responding as a healthy business site", className: "border-red-500/25 bg-red-500/10 text-red-300", icon: WifiOff };
  }
  if (status === "outdated" || status === "dodgy") {
    return { key: "needs_attention", label: "Needs attention", detail: "Homepage is reachable but has visible website gaps", className: "border-amber-500/10 bg-amber-500/10 text-amber-300", icon: Clock };
  }
  if (inspectionStatus === "checked" && inspectedStatus === "reachable") {
    return { key: "reachable", label: "Reachable homepage", detail: "Public homepage responded and passed the basic check", className: "border-emerald-500/10 bg-emerald-500/10 text-emerald-300", icon: Check };
  }
  return { key: "not_checked", label: "Website not inspected", detail: "An official URL is available, but no inspection result was returned", className: "border-zinc-700 bg-zinc-800/70 text-zinc-300", icon: Globe };
}

function websiteFilterLabel(value: WebsiteFilter) {
  return ({
    all: "All website checks",
    no_site: "No verified website",
    reachable: "Reachable homepage",
    needs_attention: "Needs attention",
    inspection_failed: "Inspection failed",
    not_checked: "Not inspected",
  } as Record<WebsiteFilter, string>)[value];
}

function signalHighlights(lead: Partial<SearchResultLead> | LeadRecord) {
  const website = safeHttpUrl(lead.website);
  const summary = websiteSummary(lead);
  const signals = lead.websiteSignals && typeof lead.websiteSignals === "object" && !Array.isArray(lead.websiteSignals)
    ? lead.websiteSignals as WebsiteSignals
    : {};
  if (summary.key === "no_site") return ["No official homepage verified", "Profile or social evidence is available"];
  if (summary.key === "inspection_failed") return ["Homepage inspection failed", text(signals.inspectionReason, "Website quality could not be verified")];

  const highlights: string[] = [];
  if (signals.https === true) highlights.push("HTTPS is enabled");
  if (signals.https === false && website) highlights.push("No HTTPS detected");
  if (signals.mobileViewport === true) highlights.push("Mobile-ready metadata");
  if (signals.mobileViewport === false) highlights.push("No mobile metadata");
  if (signals.contactPath === true) highlights.push("Contact or booking path");
  if (signals.contactPath === false) highlights.push("No clear conversion path");
  if (signals.contactMethod === true) highlights.push("Public email or phone");
  if (signals.contactMethod === false) highlights.push("No public contact method");
  if (signals.ecommerceSignals === true) highlights.push("Store or cart signals");
  if (signals.oldCopyright === true) highlights.push("Older copyright language");
  if (signals.meaningfulText === false) highlights.push("Thin visible page content");
  if (Number(signals.socialLinksCount) > 0) highlights.push(`${Number(signals.socialLinksCount)} social link${Number(signals.socialLinksCount) === 1 ? "" : "s"}`);
  if (highlights.length === 0 && summary.key === "not_checked") highlights.push("Website signals were not returned");
  return highlights.slice(0, 4);
}

function websiteFilterKey(lead: Partial<SearchResultLead> | LeadRecord): Exclude<WebsiteFilter, "all"> {
  return websiteSummary(lead).key;
}

function scoreReasons(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, 4);
}

function compactWebsiteSignals(value: unknown): WebsiteSignals {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as WebsiteSignals;
  const scalarKeys = [
    "inspectionStatus", "status", "httpStatus", "reachable", "https", "pageTitle", "metaDescription", "h1Text", "h1Present",
    "mobileViewport", "contactPath", "contactMethod", "emailPresent", "phonePresent", "socialLinksCount", "ecommerceSignals",
    "parkedLanguage", "oldCopyright", "meaningfulText", "visibleTextLength", "structuredBusinessData", "businessLanguage",
    "locationEvidence", "editorialLanguage", "clearTitle", "canonicalUrl", "canonicalPresent", "robotsTxtAvailable", "sitemapAvailable",
    "llmsTxtAvailable", "servicePath", "serviceLocationContent", "localBusinessSchema", "organizationSchema", "faqSection",
    "questionAnswerContent", "faqPageSchema", "howToSchema", "directServiceLocationAnswers", "whatWeDoContent", "firstPartyProof",
    "activeTradingEvidence", "activeProfileCount", "activeProfileInspectionCount", "recentActivityMarkers", "seoGapCount", "aeoGapCount",
    "conversionGapCount", "inspectionReason",
  ];
  const arrayKeys = ["activeTradingLabels", "seoGapSignals", "aeoGapSignals", "conversionGapSignals"];
  return [...scalarKeys, ...arrayKeys].reduce<WebsiteSignals>((result, key) => {
    const item = source[key];
    if (["string", "number", "boolean"].includes(typeof item)) result[key] = typeof item === "string" ? item.slice(0, 240) : item;
    if (item === null && ["robotsTxtAvailable", "sitemapAvailable", "llmsTxtAvailable"].includes(key)) result[key] = null;
    if (arrayKeys.includes(key) && Array.isArray(item)) {
      const values = item.filter((entry): entry is string => typeof entry === "string" && entry.trim())
        .map((entry) => entry.trim().slice(0, 180)).slice(0, 8);
      if (values.length) result[key] = values;
    }
    return result;
  }, {});
}

type GrowthEvidenceRow = {
  label: string;
  value: string;
  detail: string;
  className: string;
};

function compactSignalText(value: unknown, fallback = "") {
  return text(value).replace(/\s+/g, " ").trim().slice(0, 150) || fallback;
}

function safeSignalCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function growthEvidenceRows(lead: Partial<SearchResultLead> | LeadRecord): GrowthEvidenceRow[] {
  const signals = lead.websiteSignals && typeof lead.websiteSignals === "object" && !Array.isArray(lead.websiteSignals)
    ? lead.websiteSignals as WebsiteSignals
    : {};
  const activity = signals.activeTradingEvidence === "strong" || signals.activeTradingEvidence === "some" ? signals.activeTradingEvidence : "uncertain";
  const profileCount = safeSignalCount(signals.activeProfileCount);
  const checkedProfileCount = safeSignalCount(signals.activeProfileInspectionCount);
  const activityLabel = activity === "strong" ? "Strong" : activity === "some" ? "Some corroboration" : "Uncertain";
  const activityDetail = compactSignalText(
    Array.isArray(signals.activeTradingLabels) ? signals.activeTradingLabels[0] : "",
    activity === "strong"
      ? profileCount > 0
        ? `${profileCount} matching public profile${profileCount === 1 ? "" : "s"} support active trading`
        : "Corroborated public activity signals support active trading"
      : activity === "some"
        ? "Public business activity signals were corroborated"
        : checkedProfileCount > 0
          ? "Checked public profiles did not fully corroborate activity"
          : "Public activity was not fully corroborated",
  );
  const gapRow = (label: string, countValue: unknown, rawSignals: unknown, className: string): GrowthEvidenceRow => {
    const count = safeSignalCount(countValue);
    const firstSignal = Array.isArray(rawSignals) ? compactSignalText(rawSignals[0]) : "";
    return {
      label,
      value: count > 0 ? `${count} gap${count === 1 ? "" : "s"}` : "No gap returned",
      detail: count > 0 ? firstSignal || "Observable public visibility gap" : "No observable gap returned in the inspected signals",
      className,
    };
  };
  return [
    { label: "Active trading", value: activityLabel, detail: activityDetail, className: "border-cyan-accent/20 bg-cyan-accent/[0.05] text-cyan-accent" },
    gapRow("SEO visibility", signals.seoGapCount, signals.seoGapSignals, "border-amber-500/20 bg-amber-500/[0.05] text-amber-200"),
    gapRow("Answer-ready", signals.aeoGapCount, signals.aeoGapSignals, "border-violet-500/20 bg-violet-500/[0.05] text-violet-200"),
    gapRow("Website / conversion", signals.conversionGapCount, signals.conversionGapSignals, "border-primary/20 bg-primary/[0.05] text-primary"),
  ];
}

function GrowthEvidenceGrid({ rows, compact = false }: { rows: GrowthEvidenceRow[]; compact?: boolean }) {
  return <div className={cn("grid grid-cols-2 gap-1.5", compact ? "mt-2" : "mt-3")} aria-label={compact ? "Saved growth evidence" : "Growth evidence"}>
    {rows.map((row) => <div key={row.label} title={row.detail} className={cn("min-w-0 rounded-lg border px-2.5 py-2", row.className)}>
      <div className="flex items-center justify-between gap-2"><p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em]">{row.label}</p><span className="shrink-0 text-[10px] font-semibold">{row.value}</span></div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-300/80">{row.detail}</p>
    </div>)}
  </div>;
}

function diagnosticCountLabel(value: number | null) {
  return value === null ? "Not reported" : value.toLocaleString();
}

function diagnosticLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rejectionSummary(value: Record<string, number>) {
  const entries = Object.entries(value)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 5);
  return entries.length > 0
    ? entries.map(([key, count]) => `${diagnosticLabel(key)} ${count.toLocaleString()}`).join(" · ")
    : "None reported";
}

function providerPassStatus(diagnostics: SearchRunDiagnostics) {
  if (diagnostics.providerUnavailable === true) return "Unavailable";
  if (diagnostics.allQueriesCompleted === true) return "Complete";
  if (diagnostics.providerCompleted === false || diagnostics.allQueriesCompleted === false) return "Partial";
  return "Not reported";
}

function relevanceStatus(diagnostics: SearchRunDiagnostics) {
  if (diagnostics.relevanceModelFailureCategory) return `Unavailable (${diagnosticLabel(diagnostics.relevanceModelFailureCategory)})`;
  if (diagnostics.relevanceGateApplied === true) {
    const accepted = diagnosticCountLabel(diagnostics.relevanceModelAcceptedCount);
    const rejected = diagnosticCountLabel(diagnostics.relevanceModelRejectedCount);
    return `${accepted} accepted · ${rejected} filtered`;
  }
  if (diagnostics.relevanceGateApplied === false) return "Not run";
  return "Not reported";
}

function SearchDiagnosticsPanel({ diagnostics }: { diagnostics: SearchRunDiagnostics }) {
  const providerLabel = diagnostics.provider || "Firecrawl";
  const stageRows = [
    { label: "Discovery", value: `${diagnosticCountLabel(diagnostics.discoveryRawItemCount)} raw · ${diagnosticCountLabel(diagnostics.discoveryParsedItemCount)} parsed` },
    { label: "Social pass", value: `${diagnosticCountLabel(diagnostics.socialRawItemCount)} raw · ${diagnosticCountLabel(diagnostics.socialParsedItemCount)} parsed` },
    { label: "Pass completion", value: providerPassStatus(diagnostics) },
    { label: "OpenRouter relevance", value: relevanceStatus(diagnostics) },
  ];
  return <Card className="border-border/70 bg-zinc-950/25 p-4" role="status" aria-live="polite" aria-label="Latest search diagnostics">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Latest search run</p><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Safe aggregate counts from the response just received.</p></div>
      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="w-fit border-primary/25 bg-primary/10 text-[10px] text-primary">{providerLabel}</Badge><Badge variant="outline" className="w-fit border-border/80 bg-background/50 text-[10px] text-zinc-300">{diagnosticLabel(diagnostics.searchStatus)}</Badge></div>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {stageRows.map((row) => <div key={row.label} className="rounded-lg border border-border/70 bg-background/45 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p><p className="mt-1 text-xs font-medium leading-relaxed text-ivory">{row.value}</p></div>)}
    </div>
    <div className="mt-3 grid gap-2 text-[11px] leading-relaxed text-zinc-300 sm:grid-cols-2">
      <p className="rounded-lg border border-border/60 bg-background/30 px-3 py-2"><span className="font-semibold text-zinc-200">Discovery rejected:</span> {rejectionSummary(diagnostics.discoveryRejectionCounts)}</p>
      <p className="rounded-lg border border-border/60 bg-background/30 px-3 py-2"><span className="font-semibold text-zinc-200">Social rejected:</span> {rejectionSummary(diagnostics.socialRejectionCounts)}</p>
    </div>
    {diagnostics.nicheMatchRejectedCount !== null && diagnostics.nicheMatchRejectedCount > 0 && <p className="mt-2 text-[11px] text-amber-200">Niche check filtered {diagnostics.nicheMatchRejectedCount.toLocaleString()} candidate{diagnostics.nicheMatchRejectedCount === 1 ? "" : "s"} after inspection.</p>}
  </Card>;
}

function validDateTime(value: unknown) {
  const candidate = text(value);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : "";
}

function savedTimestamp(lead: LeadRecord) {
  const value = Date.parse(String(lead.created_at || lead.updated_at || ""));
  return Number.isFinite(value) ? value : 0;
}

function neutralBuildFields() {
  return {
    clientSiteId: "",
    previewUrl: "",
    pitchDm: "",
    followUpDm: "",
    coldCallPitch: "",
    outreachVersion: "",
    siteBuildStatus: "none",
    siteBuildError: "",
  };
}

function makeLeadPayload(result: Partial<SearchResultLead> & Partial<ManualForm>, source: "web_search" | "manual", fallbackBusinessType = "", fallbackLocation = "") {
  const record = result as LeadRecord;
  const websiteStatus = validWebsiteStatus(result.websiteStatus);
  const businessType = text(result.trade, fallbackBusinessType);
  const location = text(result.location, fallbackLocation);
  const chosenPriority = text(result.priority) ? validPriority(result.priority) : priorityForWebsite(websiteStatus);
  const payload: LeadRecord = {
    businessName: text(result.businessName),
    trade: businessType,
    location,
    phone: text(result.phone),
    email: text(result.email),
    website: safeHttpUrl(result.website),
    websiteStatus,
    instagramUrl: safeHttpUrl(result.instagramUrl),
    facebookUrl: safeHttpUrl(result.facebookUrl),
    tiktokUrl: safeHttpUrl(result.tiktokUrl),
    linkedinUrl: safeHttpUrl(result.linkedinUrl),
    googleBusinessUrl: safeHttpUrl(result.googleBusinessUrl),
    leadKey: text(result.leadKey) || leadKeyFor({ ...result, trade: businessType, location }),
    source,
    priority: chosenPriority,
    socialBio: text(result.socialBio),
    status: "new",
    notes: "",
    ...neutralBuildFields(),
    previewUrl: safeHttpUrl(result.previewUrl),
  };
  const socialLinks = normalizedSocialLinks(record);
  const contactDetails = normalizedContactDetails(record);
  const people = normalizedPublicPeople(record);
  const owner = publicOwnerFor(record);
  const sourceUrls = Array.from(new Set((Array.isArray(result.researchSourceUrls) ? result.researchSourceUrls : []).map(safeHttpUrl).filter(Boolean))).slice(0, 12);
  if (socialLinks.length) payload.socialLinks = socialLinks;
  if (contactDetails.phones.length || contactDetails.emails.length || contactDetails.contactPageUrl || contactDetails.bookingUrl || contactDetails.physicalAddress || contactDetails.serviceAreas.length || contactDetails.openingHours) payload.contactDetails = contactDetails;
  if (text(result.businessSummary)) payload.businessSummary = text(result.businessSummary);
  if (Array.isArray(result.services) && result.services.length) payload.services = result.services.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, 10);
  if (people.length) payload.publicPeople = people;
  if (owner) {
    payload.ownerName = owner.name;
    payload.ownerRole = owner.role;
    payload.ownerSourceUrl = owner.sourceUrl;
  }
  if (sourceUrls.length) payload.researchSourceUrls = sourceUrls;
  const score = numericScore(result.score);
  const category = validLeadCategory(result.leadCategory);
  const reasons = scoreReasons(result.scoreReasons);
  const signals = compactWebsiteSignals(result.websiteSignals);
  if (score !== null) payload.score = score;
  if (category) payload.leadCategory = category;
  if (reasons.length) payload.scoreReasons = reasons;
  if (Object.keys(signals).length) payload.websiteSignals = signals;
  const checkedAt = validDateTime(result.websiteLastCheckedAt);
  if (checkedAt) payload.websiteLastCheckedAt = checkedAt;
  return payload;
}

function formatCheckedAt(value: unknown) {
  const date = validDateTime(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export default function LeadFinder({ initialOpenLeadId, onInitialOpenHandled }: LeadFinderProps = {}) {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultLead[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchErrorKind, setSearchErrorKind] = useState<SearchErrorKind | null>(null);
  const [searchDiagnostics, setSearchDiagnostics] = useState<SearchRunDiagnostics | null>(null);
  const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);
  const [savedLeads, setSavedLeads] = useState<LeadRecord[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savedLoadError, setSavedLoadError] = useState("");
  const [resultCategoryFilter, setResultCategoryFilter] = useState<CategoryFilter>("all");
  const [resultWebsiteFilter, setResultWebsiteFilter] = useState<WebsiteFilter>("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBusinessType, setFilterBusinessType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [savedCategoryFilter, setSavedCategoryFilter] = useState<CategoryFilter>("all");
  const [savedWebsiteFilter, setSavedWebsiteFilter] = useState<WebsiteFilter>("all");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>(emptyManualForm);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [loggingLeadId, setLoggingLeadId] = useState<string | null>(null);
  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(new Set());
  const [expandedPublicDetailIds, setExpandedPublicDetailIds] = useState<Set<string>>(new Set());
  const [logForm, setLogForm] = useState({ method: "phone", notes: "", date: new Date().toISOString().slice(0, 10) });
  const searchInFlightRef = useRef(false);
  const [searchInFlight, setSearchInFlight] = useState(false);
  const [resetInFlight, setResetInFlight] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const businessTypeInputRef = useRef<HTMLInputElement>(null);

  const loadSavedLeads = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const response = await (Lead as any).list("-created_at", 200);
      const records = recordList(response) || [];
      setSavedLeads(records.filter((lead) => String(lead.id || "").trim()));
      setSavedLoadError("");
    } catch (error) {
      console.error("[lead-finder] saved_leads_load_failed", error);
      setSavedLoadError("Saved leads could not be loaded. Try again to check your records.");
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => { void loadSavedLeads(); }, [loadSavedLeads]);

  useEffect(() => {
    const leadId = text(initialOpenLeadId);
    if (!leadId || loadingSaved || !savedLeads.some((lead) => String(lead.id) === leadId)) return;
    setExpandedLeadIds((current) => new Set(current).add(leadId));
    onInitialOpenHandled?.(leadId);
  }, [initialOpenLeadId, loadingSaved, onInitialOpenHandled, savedLeads]);

  const handleSearch = async (event?: FormEvent<HTMLFormElement>, retryQuery?: SearchQuery) => {
    event?.preventDefault();
    if (searchInFlightRef.current) return;
    const requestedBusinessType = (retryQuery?.businessType ?? businessType).trim();
    const requestedLocation = (retryQuery?.location ?? location).trim();

    // Every submit starts with a clean visible run, including an invalid local attempt.
    setSearchResults([]);
    setResultCategoryFilter("all");
    setResultWebsiteFilter("all");
    setSearchMessage("");
    setSearchErrorKind(null);
    setSearchDiagnostics(null);
    setSearchQuery(null);
    console.info("[lead-finder] search_attempt", {
      businessTypeLength: requestedBusinessType.length,
      locationLength: requestedLocation.length,
      retry: Boolean(retryQuery),
    });

    if (!requestedBusinessType || !requestedLocation) {
      const message = !requestedBusinessType
        ? "Enter a business type or industry, then add a location or market."
        : "Add a location, service area, or online market to search.";
      setSearchMessage(message);
      setSearchErrorKind("not_started");
      setSearchState("error");
      toast.error(!requestedBusinessType ? "Enter a business type or industry" : "Enter a location or market");
      return;
    }

    searchInFlightRef.current = true;
    setSearchInFlight(true);
    const query = { businessType: requestedBusinessType, location: requestedLocation };
    console.info("[lead-finder] search_click", query);
    setSearchQuery(query);
    setSearchState("loading");
    try {
      const response = await withSearchTimeout(
        (searchLeads as any)({ businessType: requestedBusinessType, trade: requestedBusinessType, location: requestedLocation, limit: LEAD_FINDER_RESULT_LIMIT }),
        SEARCH_REQUEST_TIMEOUT_MS,
      );
      const data = unwrapFunctionData(response);
      const diagnostics = readSearchRunDiagnostics(data);
      setSearchDiagnostics(diagnostics);
      const searchStatus = text(data.searchStatus).toLowerCase();
      const providerLeads = Array.isArray(data.leads) ? data.leads as SearchResultLead[] : [];
      const leads = providerLeads.filter(isVerifiedSearchResult);
      const sortedLeads = [...leads].sort(compareLeadRanking);
      const hasResponseContract = typeof data.success === "boolean" || Boolean(searchStatus) || Array.isArray(data.leads) || diagnostics !== null;
      console.info("[lead-finder] search_response", {
        searchStatus: searchStatus || "unknown",
        providerResultCount: providerLeads.length,
        resultCount: sortedLeads.length,
        provider: diagnostics?.provider || "unknown",
        discoveryRawItemCount: diagnostics?.discoveryRawItemCount ?? "unknown",
        socialRawItemCount: diagnostics?.socialRawItemCount ?? "unknown",
        allQueriesCompleted: diagnostics?.allQueriesCompleted ?? "unknown",
        relevanceFailureCategory: diagnostics?.relevanceModelFailureCategory || "none",
      });
      if (!hasResponseContract) {
        const message = UNREADABLE_RESPONSE_MESSAGE;
        setSearchMessage(message);
        setSearchErrorKind("request");
        setSearchState("error");
        toast.error(message);
        return;
      }
      if (data.success === false || ["search_unavailable", "authentication_failed", "permission_denied", "invalid_request"].includes(searchStatus)) {
        const errorKind = searchErrorKindFor(undefined, data);
        const fallback = errorKind === "relevance" ? RELEVANCE_UNAVAILABLE_MESSAGE : errorKind === "provider" ? SEARCH_UNAVAILABLE_MESSAGE : REQUEST_FAILED_MESSAGE;
        const message = searchMessageFor(data, fallback, "", errorKind);
        setSearchMessage(message);
        setSearchErrorKind(errorKind);
        setSearchState("error");
        toast.error(message);
        return;
      }
      setSearchResults(sortedLeads);
      if (sortedLeads.length === 0 || searchStatus === "no_verified_results") {
        setSearchMessage(searchMessageFor(data, NO_RESULTS_MESSAGE));
        setSearchErrorKind(null);
        setSearchState("empty");
        toast.info(NO_RESULTS_MESSAGE);
      } else {
        setSearchErrorKind(null);
        setSearchState("results");
        toast.success(`Found ${sortedLeads.length} verified result${sortedLeads.length === 1 ? "" : "s"}`);
      }
    } catch (error: any) {
      const data = errorData(error);
      const status = responseStatusFor(error, data);
      const transportFailure = isTransportFailure(error, data);
      const errorKind = searchErrorKindFor(error, data);
      setSearchDiagnostics(readSearchRunDiagnostics(data));
      console.error("[lead-finder] search_request_failed", { status: status || "unknown", searchStatus: text(data?.searchStatus, "unknown"), transportFailure, errorKind });
      const message = searchFailureMessage(error, data);
      setSearchMessage(message);
      setSearchErrorKind(errorKind);
      setSearchState("error");
      toast.error(message);
    } finally {
      searchInFlightRef.current = false;
      setSearchInFlight(false);
    }
  };

  const handleSaveLead = async (result: SearchResultLead) => {
    if (!isVerifiedSearchResult(result)) {
      toast.error("This result did not pass the business identity check", { description: "Only verified business homepages and official business profiles can be saved." });
      return;
    }
    const duplicate = savedLeads.find((lead) => sameLead(lead, result));
    if (duplicate) {
      toast.info(`${result.businessName} is already in Saved leads`);
      return;
    }
    const key = leadKeyFor(result);
    setSavingKeys((current) => new Set(current).add(key));
    try {
      const fallbackBusinessType = searchQuery?.businessType || businessType;
      const fallbackLocation = searchQuery?.location || location;
      const payload = makeLeadPayload(result, "web_search", fallbackBusinessType, fallbackLocation);
      const response = await (Lead as any).create(payload);
      const created = recordWithId(response);
      if (created) setSavedLeads((current) => [created, ...current]);
      else await loadSavedLeads();
      setSearchResults((current) => current.filter((item) => !sameLead(item, result)));
      toast.success(`${result.businessName} saved`, { description: "It is ready for you to track manually." });
    } catch (error) {
      console.error("[lead-finder] lead_save_failed", error);
      toast.error("Could not save this lead. Try again.");
    } finally {
      setSavingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const handleManualSave = async () => {
    if (!manualForm.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (manualForm.previewUrl.trim() && !safeHttpUrl(manualForm.previewUrl)) {
      toast.error("Enter a valid preview URL", { description: "Use a complete HTTP or HTTPS link, or leave it blank." });
      return;
    }
    try {
      const payload = makeLeadPayload(manualForm, "manual");
      const createdResponse = await (Lead as any).create(payload);
      const created = recordWithId(createdResponse);
      if (created) setSavedLeads((current) => [created, ...current]);
      else await loadSavedLeads();
      setManualForm(emptyManualForm());
      setShowManualForm(false);
      toast.success(`${payload.businessName} added to Saved leads`);
    } catch (error) {
      console.error("[lead-finder] manual_lead_save_failed", error);
      toast.error("Could not add this lead. Try again.");
    }
  };

  const handleStatusChange = async (leadId: string, nextStatus: string) => {
    try {
      const response = await (Lead as any).update(leadId, { status: nextStatus });
      const returned = recordWithId(response);
      setSavedLeads((current) => current.map((lead) => String(lead.id) === leadId ? { ...lead, ...(returned || {}), status: nextStatus } : lead));
      toast.success(`Status changed to ${statusConfig(nextStatus).label}`);
    } catch (error) {
      console.error("[lead-finder] status_update_failed", error);
      toast.error("Could not update the lead status");
    }
  };

  const handleLogContact = async (lead: LeadRecord) => {
    const dateValue = new Date(`${logForm.date}T12:00:00`);
    const contactedAt = Number.isFinite(dateValue.getTime()) ? dateValue.toISOString() : new Date().toISOString();
    const note = `[${logForm.date} via ${logForm.method}] ${logForm.notes.trim() || "Contact attempt logged"}`;
    const notes = lead.notes ? `${lead.notes}\n${note}` : note;
    const nextStatus = String(lead.status || "new") === "new" ? "contacted" : String(lead.status || "new");
    try {
      const response = await (Lead as any).update(lead.id, { notes, lastContactedAt: contactedAt, contactMethod: logForm.method, status: nextStatus });
      const returned = recordWithId(response);
      setSavedLeads((current) => current.map((item) => String(item.id) === String(lead.id) ? { ...item, ...(returned || {}), notes, lastContactedAt: contactedAt, contactMethod: logForm.method, status: nextStatus } : item));
      setLoggingLeadId(null);
      setLogForm({ method: "phone", notes: "", date: new Date().toISOString().slice(0, 10) });
      toast.success(`Contact logged for ${lead.businessName}`);
    } catch (error) {
      console.error("[lead-finder] contact_log_failed", error);
      toast.error("Could not save the contact log");
    }
  };

  const handleResetLeadFinder = async () => {
    if (resetInFlight || searchInFlightRef.current || savingKeys.size > 0) return;
    setResetInFlight(true);
    try {
      const response = await (resetLeadFinder as any)({ confirmation: "RESET_LEAD_FINDER" });
      const data = unwrapFunctionData(response);
      const complete = data.success === true && text(data.status).toLowerCase() === "complete";
      if (!complete) {
        console.error("[lead-finder] reset_incomplete", { status: text(data.status, "unknown") });
        toast.error("Lead Finder was not fully reset", {
          description: text(data.message, "The reset did not finish. Your saved records are still shown, so nothing should be treated as fully reset."),
        });
        return;
      }

      const leadsDeleted = Number.isFinite(Number(data.leadsDeleted)) ? Number(data.leadsDeleted) : 0;
      const clientSitesDeleted = Number.isFinite(Number(data.clientSitesDeleted)) ? Number(data.clientSitesDeleted) : 0;
      setSavedLeads([]);
      setSearchResults([]);
      setSearchState("idle");
      setSearchMessage("");
      setSearchErrorKind(null);
      setSearchDiagnostics(null);
      setSearchQuery(null);
      setBusinessType("");
      setLocation("");
      setResultCategoryFilter("all");
      setResultWebsiteFilter("all");
      setFilterStatus("all");
      setFilterBusinessType("all");
      setFilterPriority("all");
      setFilterSearch("");
      setSavedCategoryFilter("all");
      setSavedWebsiteFilter("all");
      setShowManualForm(false);
      setManualForm(emptyManualForm());
      setSavingKeys(new Set());
      setLoggingLeadId(null);
      setExpandedLeadIds(new Set());
      setExpandedPublicDetailIds(new Set());
      setLogForm({ method: "phone", notes: "", date: new Date().toISOString().slice(0, 10) });
      setSavedLoadError("");
      setResetConfirmOpen(false);
      toast.success("Lead Finder is empty", {
        description: `${leadsDeleted} lead${leadsDeleted === 1 ? "" : "s"} and ${clientSitesDeleted} linked client site${clientSitesDeleted === 1 ? "" : "s"} deleted. Unrelated Central Hub records were left alone.`,
      });
    } catch (error) {
      const data = errorData(error);
      console.error("[lead-finder] reset_failed", { status: responseStatusFor(error, data) || "unknown" });
      toast.error("Lead Finder was not reset", {
        description: text(data?.message, "The reset could not be completed. Your saved records are still shown, so nothing should be treated as fully reset."),
      });
    } finally {
      setResetInFlight(false);
    }
  };

  const handleDelete = async (lead: LeadRecord) => {
    if (!window.confirm(`Delete ${lead.businessName || "this lead"}?`)) return;
    try {
      await (Lead as any).delete(lead.id);
      setSavedLeads((current) => current.filter((item) => String(item.id) !== String(lead.id)));
      setExpandedLeadIds((current) => {
        const next = new Set(current);
        next.delete(String(lead.id));
        return next;
      });
      setExpandedPublicDetailIds((current) => {
        const next = new Set(current);
        next.delete(String(lead.id));
        return next;
      });
      toast.success("Lead removed");
    } catch (error) {
      console.error("[lead-finder] lead_delete_failed", error);
      toast.error("Could not remove this lead");
    }
  };

  const businessTypeOptions = useMemo(() => {
    const values = savedLeads.map((lead) => text(lead.trade)).filter(Boolean);
    return Array.from(new Map(values.map((value) => [normalized(value), value])).values());
  }, [savedLeads]);

  const visibleSearchResults = useMemo(() => searchResults.filter((lead) => {
    const category = validLeadCategory(lead.leadCategory);
    const matchesCategory = resultCategoryFilter === "all" || category === resultCategoryFilter;
    const matchesWebsite = resultWebsiteFilter === "all" || websiteFilterKey(lead) === resultWebsiteFilter;
    return matchesCategory && matchesWebsite;
  }).sort(compareLeadRanking), [resultCategoryFilter, resultWebsiteFilter, searchResults]);

  const filteredSaved = useMemo(() => {
    const query = filterSearch.trim().toLowerCase();
    return [...savedLeads]
      .filter((lead) => filterStatus === "all" || String(lead.status || "new") === filterStatus)
      .filter((lead) => filterBusinessType === "all" || normalized(lead.trade) === normalized(filterBusinessType))
      .filter((lead) => filterPriority === "all" || validPriority(lead.priority) === filterPriority)
      .filter((lead) => savedCategoryFilter === "all" || validLeadCategory(lead.leadCategory) === savedCategoryFilter)
      .filter((lead) => savedWebsiteFilter === "all" || websiteFilterKey(lead) === savedWebsiteFilter)
      .filter((lead) => !query || [lead.businessName, lead.trade, lead.location, lead.phone, lead.email].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((first, second) => {
        const ranking = compareLeadRanking(first, second);
        if (ranking !== 0) return ranking;
        const firstCategoryRank = leadCategoryRank(first.leadCategory, first.score);
        const secondCategoryRank = leadCategoryRank(second.leadCategory, second.score);
        if (firstCategoryRank !== UNKNOWN_LEAD_RANK || secondCategoryRank !== UNKNOWN_LEAD_RANK) return 0;
        return priorityRank(first.priority) - priorityRank(second.priority) || savedTimestamp(second) - savedTimestamp(first);
      });
  }, [filterBusinessType, filterPriority, filterSearch, filterStatus, savedCategoryFilter, savedLeads, savedWebsiteFilter]);

  const metrics = useMemo(() => ({
    total: savedLeads.length,
    hot: savedLeads.filter((lead) => validLeadCategory(lead.leadCategory) === "hot" && numericScore(lead.score) !== null).length,
    noWebsite: savedLeads.filter((lead) => websiteFilterKey(lead) === "no_site").length,
    contacted: savedLeads.filter((lead) => ["contacted", "replied", "meeting"].includes(String(lead.status || "new"))).length,
  }), [savedLeads]);

  const toggleDetails = (leadId: string) => {
    setExpandedLeadIds((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  };

  const togglePublicDetails = (leadId: string) => {
    setExpandedPublicDetailIds((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Globe className="h-3.5 w-3.5" aria-hidden="true" /> Public business research</div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ivory sm:text-4xl">Lead Finder</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">Find verified businesses across any industry and market. Ads, articles, directories, and social posts are filtered out before results reach this list. Review the official homepage or business profile, then save only the opportunities you choose to pursue.</p>
        </div>
        <Button onClick={() => setShowManualForm((open) => !open)} variant="outline" className="border-border bg-card text-ivory hover:bg-secondary"><Plus className="mr-2 h-4 w-4" /> Add manually</Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Lead summary">
        {[
          { label: "Saved leads", value: metrics.total, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Hot opportunities", value: metrics.hot, icon: Flame, color: "text-red-300", bg: "bg-red-500/10" },
          { label: "No verified website", value: metrics.noWebsite, icon: AlertTriangle, color: "text-amber-300", bg: "bg-amber-500/10" },
          { label: "In outreach", value: metrics.contacted, icon: Target, color: "text-cyan-accent", bg: "bg-cyan-accent/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => <Card key={label} className="border-border/80 bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-ivory">{value}</p></div><span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bg, color)}><Icon className="h-5 w-5" aria-hidden="true" /></span></div></Card>)}
      </section>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-2"><Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-ivory">Search public businesses</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Describe the businesses you want to find, from local services to ecommerce brands or professional firms. The search checks direct public pages and removes ads, articles, directories, and social content before showing a result.</p></div></div>
          <form onSubmit={(event) => { void handleSearch(event); }} className="grid gap-3 sm:grid-cols-[minmax(220px,0.8fr)_minmax(240px,1fr)_auto]" aria-busy={searchInFlight}>
            <Input ref={businessTypeInputRef} value={businessType} onChange={(event) => setBusinessType(event.target.value)} placeholder="Business type or industry" className="h-11 border-border bg-background text-ivory placeholder:text-muted-foreground" aria-label="Business type or industry" />
            <div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location, service area, or online market" className="h-11 border-border bg-background pl-10 text-ivory placeholder:text-muted-foreground" aria-label="Location, service area, or market" /></div>
            <Button type="submit" disabled={searchInFlight} className="h-11 bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{searchInFlight ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching</> : <><Sparkles className="mr-2 h-4 w-4" /> Find businesses</>}</Button>
          </form>
          <div className="mt-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick starting points</p><div className="mt-2 flex flex-wrap gap-2">{LEAD_FINDER_SUGGESTIONS.map((suggestion) => { const active = suggestion.value && normalized(businessType) === normalized(suggestion.value); return <button key={suggestion.label} type="button" onClick={() => { setBusinessType(suggestion.value); businessTypeInputRef.current?.focus(); }} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70", active ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-background/70 text-muted-foreground hover:border-primary/35 hover:text-ivory")} aria-label={`Use ${suggestion.label} as the business type`} title={suggestion.description}>{suggestion.label}</button>; })}</div></div>
          <p className="mt-3 text-xs text-muted-foreground">Search local, regional, national, or online markets. Each result must pass a business identity check before it can be shown or saved.</p>
        </div>
      </Card>

      <AnimatePresence initial={false}>{showManualForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><Card className="border-border/80 bg-card p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ivory">Add a business manually</h2><p className="mt-1 text-xs text-muted-foreground">Use this for referrals, existing contacts, or businesses you already know. Manual records stay separate from verified web research.</p></div><Button variant="ghost" size="icon" onClick={() => setShowManualForm(false)} className="text-muted-foreground" aria-label="Close manual business form"><X className="h-4 w-4" /></Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([
        ["businessName", "Business name *"], ["trade", "Business type or industry"], ["location", "Location or market"], ["phone", "Phone"], ["email", "Email"], ["website", "Website URL"], ["instagramUrl", "Instagram URL"], ["facebookUrl", "Facebook URL"], ["tiktokUrl", "TikTok URL"], ["linkedinUrl", "LinkedIn URL"], ["googleBusinessUrl", "Google Business URL"], ["previewUrl", "Private website preview URL (optional)"],
      ] as [keyof ManualForm, string][]).map(([key, placeholder]) => <Input key={key} value={manualForm[key]} onChange={(event) => setManualForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} aria-label={placeholder} className="border-border bg-background text-ivory placeholder:text-muted-foreground" />)}<Select value={manualForm.websiteStatus} onValueChange={(value) => setManualForm((current) => ({ ...current, websiteStatus: value }))}><SelectTrigger className="border-border bg-background text-ivory" aria-label="Manual website status"><SelectValue /></SelectTrigger><SelectContent>{WEBSITE_STATUSES.map((item) => <SelectItem key={item} value={item}>{item === "none" ? "No verified website" : item === "dodgy" ? "Needs major work" : item === "outdated" ? "Needs attention" : "Good website"}</SelectItem>)}</SelectContent></Select><Select value={manualForm.priority} onValueChange={(value) => setManualForm((current) => ({ ...current, priority: value }))}><SelectTrigger className="border-border bg-background text-ivory" aria-label="Manual lead priority"><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((item) => <SelectItem key={item} value={item}>{item[0].toUpperCase() + item.slice(1)} priority</SelectItem>)}</SelectContent></Select></div><Textarea value={manualForm.socialBio} onChange={(event) => setManualForm((current) => ({ ...current, socialBio: event.target.value }))} placeholder="Public description or internal context" aria-label="Public description or internal context" className="mt-3 border-border bg-background text-ivory placeholder:text-muted-foreground" rows={3} /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowManualForm(false)} className="border-border bg-card text-ivory">Cancel</Button><Button onClick={() => void handleManualSave()} className="bg-primary text-primary-foreground hover:bg-primary/90">Save business</Button></div></Card></motion.div>}</AnimatePresence>

      <section aria-labelledby="search-results-heading" className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="search-results-heading" className="flex items-center gap-2 text-lg font-semibold text-ivory"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><Search className="h-4 w-4" aria-hidden="true" /></span>{searchState === "loading" ? "Checking public businesses" : searchState === "results" ? `${visibleSearchResults.length}${visibleSearchResults.length !== searchResults.length ? ` of ${searchResults.length}` : ""} verified result${visibleSearchResults.length === 1 ? "" : "s"}` : searchState === "empty" ? "No verified results" : "Search results"}</h2>{searchQuery && <p className="mt-1 text-xs text-muted-foreground">{searchQuery.businessType} in {searchQuery.location}</p>}</div>{searchState === "results" && <div className="grid gap-2 sm:grid-cols-2"><Select value={resultCategoryFilter} onValueChange={(value) => setResultCategoryFilter(value as CategoryFilter)}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory" aria-label="Filter fresh results by ranking"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All rankings</SelectItem><SelectItem value="hot">Hot only</SelectItem><SelectItem value="warm">Warm only</SelectItem><SelectItem value="cold">Cold only</SelectItem></SelectContent></Select><Select value={resultWebsiteFilter} onValueChange={(value) => setResultWebsiteFilter(value as WebsiteFilter)}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory" aria-label="Filter fresh results by website check"><SelectValue /></SelectTrigger><SelectContent>{WEBSITE_FILTERS.map((item) => <SelectItem key={item} value={item}>{websiteFilterLabel(item)}</SelectItem>)}</SelectContent></Select></div>}</div>
        {searchState === "loading" && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Card key={index} className="h-72 animate-pulse border-border/60 bg-card"><div className="space-y-3 p-5"><div className="h-5 w-3/4 rounded bg-zinc-800" /><div className="h-4 w-1/2 rounded bg-zinc-800" /><div className="h-20 rounded bg-zinc-800/60" /><div className="h-16 rounded bg-zinc-800/40" /><div className="h-9 rounded bg-zinc-800" /></div></Card>)}</div>}
        {searchState === "error" && <Card className="border-red-500/25 bg-red-500/[0.06] p-8 text-center" role="alert" aria-live="polite"><AlertTriangle className="mx-auto h-8 w-8 text-red-300" aria-hidden="true" /><h3 className="mt-3 font-semibold text-ivory">{searchErrorTitle(searchErrorKind)}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{searchMessage}</p><Button onClick={() => void handleSearch(undefined, searchQuery || undefined)} disabled={searchInFlight} variant="outline" className="mt-5 border-red-500/30 bg-card text-ivory hover:bg-secondary">Try search again</Button></Card>}
        {searchDiagnostics && <SearchDiagnosticsPanel diagnostics={searchDiagnostics} />}
        {searchState === "empty" && <Card className="border-dashed border-border/60 bg-card/50 p-10 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 font-semibold text-ivory">No verified businesses found</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{searchMessage || NO_RESULTS_MESSAGE} Try a broader market or another spelling, then run the search again.</p></Card>}
        {searchState === "idle" && <Card className="border-dashed border-border/60 bg-card/40 p-10 text-center"><MapPin className="mx-auto h-8 w-8 text-primary/70" aria-hidden="true" /><h3 className="mt-3 font-semibold text-ivory">Start with a business and market</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Enter any business type or industry, then add the location, service area, or online market you want to explore.</p></Card>}
        {searchState === "results" && visibleSearchResults.length === 0 && <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center"><Search className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm text-ivory">No results match these ranking and website filters.</p><Button variant="ghost" onClick={() => { setResultCategoryFilter("all"); setResultWebsiteFilter("all"); }} className="mt-2 text-primary">Clear result filters</Button></Card>}
        {searchState === "results" && visibleSearchResults.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleSearchResults.map((lead, index) => { const category = categoryMeta(lead.leadCategory, lead.score); const CategoryIcon = category.icon; const website = websiteSummary(lead); const WebsiteIcon = website.icon; const verification = verificationMeta(lead); const VerificationIcon = verification.verified ? Check : AlertTriangle; const score = numericScore(lead.score); const reasons = scoreReasons(lead.scoreReasons); const signals = signalHighlights(lead); const evidenceRows = growthEvidenceRows(lead); const key = leadKeyFor(lead); const evidence = safeHttpUrl(lead.evidenceUrl); const isSaving = savingKeys.has(key); const isAlreadySaved = savedLeads.some((saved) => sameLead(saved, lead)); const checkedAt = formatCheckedAt(lead.websiteLastCheckedAt); return <motion.div key={`${key}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}><Card className="group flex h-full flex-col overflow-hidden border-border/80 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-display line-clamp-2 text-[15px] font-semibold leading-tight text-ivory">{lead.businessName || "Unnamed business"}</h3><p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{lead.trade || searchQuery?.businessType || businessType} · {lead.location || searchQuery?.location || location}</p></div><Badge variant="outline" className={cn("shrink-0 text-[10px] font-bold tracking-wide", category.className)}>{CategoryIcon && <CategoryIcon className="mr-1 inline h-3 w-3" aria-hidden="true" />}{category.label}</Badge></div><div className={cn("mt-3 rounded-xl border p-3", verification.verified ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-orange-500/25 bg-orange-500/[0.06]")}><div className="flex items-start gap-2"><VerificationIcon className={cn("mt-0.5 h-4 w-4 shrink-0", verification.verified ? "text-emerald-300" : "text-orange-300")} aria-hidden="true" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business verification</p><p className="mt-0.5 text-xs font-semibold text-ivory">{verification.label}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{verification.detail}</p></div></div></div><div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border bg-background/60 px-3 py-2"><div><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Growth opportunity</p><p className="mt-0.5 text-lg font-bold text-ivory">{score === null ? "Unranked" : `${Math.round(score)}/100`}</p></div><span className="text-right text-[10px] text-muted-foreground">{category.label === "UNRANKED" ? "Ranking unavailable" : category.label === "HOT" ? "Active business with a strong growth gap" : category.label === "WARM" ? "Moderate visibility or website opportunity" : "Healthier site or weaker public activity evidence"}</span></div><div className="mt-3 rounded-xl border border-border/80 bg-zinc-950/30 p-3"><div className="flex items-start gap-2"><WebsiteIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><div><p className="text-xs font-semibold text-ivory">{website.label}</p><p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{website.detail}</p></div></div>{checkedAt && <p className="mt-2 text-[10px] text-zinc-500">{verification.kind === "official_profile" ? "Public profile" : "Homepage"} checked {checkedAt}</p>}</div><GrowthEvidenceGrid rows={evidenceRows} />{lead.socialBio && !lead.businessSummary && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{lead.socialBio}</p>}<LeadPublicDetails lead={lead as LeadRecord} className="mt-3" expanded={expandedPublicDetailIds.has(key)} onToggle={() => togglePublicDetails(key)} /><div className="mt-3 flex flex-wrap gap-1.5">{signals.map((signal) => <span key={signal} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] text-zinc-300"><MousePointerClick className="h-3 w-3 text-primary/80" aria-hidden="true" />{signal}</span>)}</div><div className="mt-3 space-y-1.5">{reasons.length > 0 ? <><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Why this growth opportunity ranks here</p><ul className="space-y-1 text-xs leading-relaxed text-zinc-300">{reasons.map((reason) => <li key={reason} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />{reason}</li>)}</ul></> : <p className="text-xs text-muted-foreground">Ranking reasons were not returned for this result.</p>}</div>{!lead.contactDetails && <div className="mt-3 space-y-1.5 text-xs text-zinc-300">{lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="h-3 w-3 text-muted-foreground" aria-hidden="true" />{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 truncate hover:text-primary"><Mail className="h-3 w-3 text-muted-foreground" aria-hidden="true" />{lead.email}</a>}</div>}{!Array.isArray(lead.socialLinks) && <SocialLinksBar className="mt-3" showLabels website={lead.website} instagramUrl={lead.instagramUrl} facebookUrl={lead.facebookUrl} tiktokUrl={lead.tiktokUrl} linkedinUrl={lead.linkedinUrl} googleBusinessUrl={lead.googleBusinessUrl} />}{evidence && <a href={evidence} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open public evidence</a>}<div className="mt-auto pt-4">{verification.verified ? <Button onClick={() => void handleSaveLead(lead)} disabled={isSaving || isAlreadySaved} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70">{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : isAlreadySaved ? <><Check className="mr-2 h-4 w-4" /> Saved</> : <><Plus className="mr-2 h-4 w-4" /> Save lead</>}</Button> : <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/25 bg-orange-500/[0.06] px-3 py-2 text-[11px] text-orange-200"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Save unavailable until verified</div>}</div></Card></motion.div>; })}</div>}
      </section>

      <section aria-labelledby="saved-leads-heading" className="space-y-4"><div className="space-y-4"><div><h2 id="saved-leads-heading" className="flex items-center gap-2 text-lg font-semibold text-ivory"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-ivory"><Users className="h-4 w-4" aria-hidden="true" /></span>Saved leads <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{savedLeads.length}</span></h2><p className="mt-1 text-xs text-muted-foreground">Move stages, log contact, and remove records here. Saving never starts another action.</p></div>{resetConfirmOpen ? <Card className="border-red-500/30 bg-red-500/[0.06] p-4" role="alert"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-200"><Trash2 className="h-4 w-4" aria-hidden="true" /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-red-100">Confirm a full reset</h3><p className="mt-1 text-xs leading-relaxed text-red-100/80">This permanently deletes every Lead Finder lead and every linked client site, including live, ready, and draft sites. Unrelated Central Hub records and unlinked client sites stay untouched.</p><p className="mt-2 text-xs font-medium text-red-100">This cannot be undone.</p><div className="mt-3 flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setResetConfirmOpen(false)} disabled={resetInFlight} className="text-zinc-300 hover:bg-white/10 hover:text-white">Cancel</Button><Button type="button" onClick={() => void handleResetLeadFinder()} disabled={resetInFlight || searchInFlight || savingKeys.size > 0} aria-busy={resetInFlight} className="bg-red-600 text-white hover:bg-red-500">{resetInFlight ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Clearing everything</> : <><Trash2 className="mr-2 h-4 w-4" />Yes, clear everything</>}</Button></div></div></div></Card> : <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" /><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-red-200">Start fresh:</span> remove every Lead Finder lead and its linked client sites.</p></div><Button type="button" variant="outline" onClick={() => setResetConfirmOpen(true)} disabled={resetInFlight || searchInFlight || savingKeys.size > 0} className="h-9 shrink-0 border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100" aria-label="Clear all Lead Finder leads and start fresh"><Trash2 className="mr-2 h-3.5 w-3.5" />Clear all and start fresh</Button></div>}<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><Input value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} placeholder="Search names or locations" className="h-9 border-border bg-card text-xs text-ivory placeholder:text-muted-foreground lg:col-span-2" /><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory" aria-label="Filter saved leads by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((item) => <SelectItem key={item} value={item}>{statusConfig(item).label}</SelectItem>)}</SelectContent></Select><Select value={filterBusinessType} onValueChange={setFilterBusinessType}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory" aria-label="Filter saved leads by business type or industry"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All business types</SelectItem>{businessTypeOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory" aria-label="Filter saved leads by priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priority</SelectItem>{PRIORITIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={savedCategoryFilter} onValueChange={(value) => setSavedCategoryFilter(value as CategoryFilter)}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory" aria-label="Filter saved leads by Hot Warm Cold ranking"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All rankings</SelectItem><SelectItem value="hot">Hot only</SelectItem><SelectItem value="warm">Warm only</SelectItem><SelectItem value="cold">Cold only</SelectItem></SelectContent></Select><Select value={savedWebsiteFilter} onValueChange={(value) => setSavedWebsiteFilter(value as WebsiteFilter)}><SelectTrigger className="h-9 border-border bg-card text-xs text-ivory lg:col-span-2" aria-label="Filter saved leads by website inspection"><SelectValue /></SelectTrigger><SelectContent>{WEBSITE_FILTERS.map((item) => <SelectItem key={item} value={item}>{websiteFilterLabel(item)}</SelectItem>)}</SelectContent></Select></div></div>
        {loadingSaved && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-40 animate-pulse border-border bg-card" />)}</div>}
        {!loadingSaved && savedLoadError && <Card className="border-red-500/25 bg-red-500/[0.06] p-8 text-center"><AlertTriangle className="mx-auto h-7 w-7 text-red-300" aria-hidden="true" /><p className="mt-3 text-sm text-ivory">{savedLoadError}</p><Button onClick={() => void loadSavedLeads()} variant="outline" className="mt-4 border-red-500/30 bg-card text-ivory">Retry</Button></Card>}
        {!loadingSaved && !savedLoadError && savedLeads.length > 0 && filteredSaved.length > 0 && <LeadPipeline leads={filteredSaved} onStatusChange={handleStatusChange} onViewDetails={toggleDetails} />}
        {!loadingSaved && !savedLoadError && savedLeads.length > 0 && filteredSaved.length === 0 && <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center"><Search className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm text-ivory">No saved leads match these filters.</p></Card>}
        {!loadingSaved && !savedLoadError && savedLeads.length === 0 && <Card className="border-dashed border-border/60 bg-card/40 p-10 text-center"><Star className="mx-auto h-8 w-8 text-primary/70" aria-hidden="true" /><h3 className="mt-3 font-semibold text-ivory">Your saved list is empty</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Search above, inspect the public evidence, and use Save lead when you are ready to keep a business in your pipeline.</p></Card>}
        {!loadingSaved && !savedLoadError && filteredSaved.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredSaved.map((lead) => { const leadId = String(lead.id); const status = statusConfig(String(lead.status || "new")); const priority = priorityConfig(validPriority(lead.priority)); const website = websiteSummary(lead); const WebsiteIcon = website.icon; const category = categoryMeta(lead.leadCategory, lead.score); const CategoryIcon = category.icon; const score = numericScore(lead.score); const reasons = scoreReasons(lead.scoreReasons); const signals = signalHighlights(lead); const evidenceRows = growthEvidenceRows(lead); const isLogging = loggingLeadId === leadId; const isExpanded = expandedLeadIds.has(leadId); const evidence = safeHttpUrl(lead.evidenceUrl); return <Card key={leadId} className="border-border/80 bg-card p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => toggleDetails(leadId)} className="min-w-0 text-left"><h3 className="truncate font-display text-[15px] font-semibold text-ivory hover:text-primary">{lead.businessName || "Unnamed business"}</h3><p className="mt-1 text-xs text-muted-foreground">{lead.trade || "Business type not set"} · {lead.location || "Location not set"}</p></button><Badge variant="outline" className={cn("shrink-0 text-[10px]", priority.className)}>{priority.label}</Badge></div><div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline" className={cn("text-[10px] font-bold tracking-wide", category.className)}>{CategoryIcon && <CategoryIcon className="mr-1 inline h-3 w-3" aria-hidden="true" />}{category.label}{score !== null && ` ${Math.round(score)}`}</Badge><Badge variant="outline" className={cn("text-[10px]", website.className)}><WebsiteIcon className="mr-1 h-3 w-3" aria-hidden="true" />{website.label}</Badge><span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", status.className)}><span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />{status.label}</span></div><LeadPublicDetails lead={lead} className="mt-3" expanded={expandedPublicDetailIds.has(leadId)} onToggle={() => togglePublicDetails(leadId)} />{!lead.contactDetails && <div className="mt-3 space-y-1.5 text-xs text-zinc-300">{lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="h-3 w-3 text-muted-foreground" aria-hidden="true" />{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 truncate hover:text-primary"><Mail className="h-3 w-3 text-muted-foreground" aria-hidden="true" />{lead.email}</a>}</div>}{!Array.isArray(lead.socialLinks) && <SocialLinksBar className="mt-3" showLabels website={lead.website} instagramUrl={lead.instagramUrl} facebookUrl={lead.facebookUrl} tiktokUrl={lead.tiktokUrl} linkedinUrl={lead.linkedinUrl} googleBusinessUrl={lead.googleBusinessUrl} />}<div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2"><Select value={String(lead.status || "new")} onValueChange={(value) => void handleStatusChange(leadId, value)}><SelectTrigger className="h-8 border-border bg-zinc-900 text-xs text-ivory"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((item) => <SelectItem key={item} value={item}>{statusConfig(item).label}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" onClick={() => { setLoggingLeadId(isLogging ? null : leadId); setLogForm({ method: text(lead.contactMethod, "phone"), notes: "", date: new Date().toISOString().slice(0, 10) }); }} className="h-8 border-border bg-zinc-900 px-2 text-xs text-ivory"><MessageSquare className="mr-1 h-3 w-3" />Log</Button><Button size="icon" variant="ghost" onClick={() => void handleDelete(lead)} className="h-8 w-8 text-zinc-500 hover:text-red-300" aria-label={`Delete ${lead.businessName}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>{isExpanded && <div className="mt-3 space-y-3 rounded-xl border border-border bg-zinc-950/60 p-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Growth ranking</p><div className="mt-2 grid gap-1.5 text-xs text-zinc-300">{reasons.length > 0 ? reasons.map((reason) => <p key={reason} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />{reason}</p>) : <p className="text-muted-foreground">No ranking context was saved for this older or manual record.</p>}</div><GrowthEvidenceGrid rows={evidenceRows} compact />{signals.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{signals.map((signal) => <span key={signal} className="rounded-full border border-border px-2 py-1 text-[10px] text-zinc-400">{signal}</span>)}</div>}{formatCheckedAt(lead.websiteLastCheckedAt) && <p className="mt-2 text-[10px] text-zinc-500">Homepage checked {formatCheckedAt(lead.websiteLastCheckedAt)}</p>}</div><p className="text-xs leading-relaxed text-muted-foreground">{lead.notes || "No contact notes yet."}</p>{lead.lastContactedAt && <p className="text-[11px] text-zinc-500">Last contact: {new Date(lead.lastContactedAt).toLocaleDateString("en-AU")} via {text(lead.contactMethod, "contact")}</p>}{lead.source && <p className="text-[11px] text-zinc-500">Source: {String(lead.source).replace(/_/g, " ")}</p>}{evidence && <a href={evidence} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Open public evidence</a>}</div>}{isLogging && <div className="mt-3 space-y-2 rounded-xl border border-border bg-zinc-950/60 p-3"><div className="grid grid-cols-2 gap-2"><Select value={logForm.method} onValueChange={(value) => setLogForm((current) => ({ ...current, method: value }))}><SelectTrigger className="h-8 border-border bg-card text-xs text-ivory"><SelectValue /></SelectTrigger><SelectContent>{CONTACT_METHODS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Input type="date" value={logForm.date} onChange={(event) => setLogForm((current) => ({ ...current, date: event.target.value }))} className="h-8 border-border bg-card text-xs text-ivory" /></div><Textarea value={logForm.notes} onChange={(event) => setLogForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Outcome, notes, or next step" className="border-border bg-card text-xs text-ivory placeholder:text-muted-foreground" rows={2} /><div className="flex gap-2"><Button size="sm" onClick={() => void handleLogContact(lead)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Save log</Button><Button size="sm" variant="ghost" onClick={() => setLoggingLeadId(null)} className="text-zinc-400">Cancel</Button></div></div>}</Card>; })}</div>}
      </section>

      <Card className="border-primary/20 bg-primary/[0.05] p-4"><div className="flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-4 w-4" aria-hidden="true" /></div><div><h3 className="text-sm font-semibold text-ivory">A deliberate workflow</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Search any business type and market, review verified public evidence and website signals, save the businesses you want, then move each lead through the pipeline as you contact them. Every save and status change is manual and visible.</p></div></div></Card>
    </div>
  );
}

```

## src/components/hub/LeadPipeline.tsx

```tsx
import { useMemo, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import {
  ArchiveX,
  ArrowRight,
  CircleOff,
  ChevronDown,
  Clock,
  Flame,
  Handshake,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PipelineStatus = "new" | "contacted" | "replied" | "meeting" | "won" | "lost" | "not_interested";
type PipelineLead = Record<string, any>;
type StageIcon = LucideIcon;

type Stage = {
  key: string;
  label: string;
  description: string;
  statuses: PipelineStatus[];
  icon: StageIcon;
  headerClass: string;
  iconClass: string;
  countClass: string;
};

const STATUS_OPTIONS: Array<{ value: PipelineStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Closing" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "not_interested", label: "Not interested" },
];

const STAGES: Stage[] = [
  { key: "new", label: "New", description: "Ready for first touch", statuses: ["new"], icon: Inbox, headerClass: "border-blue-500/25 bg-blue-500/[0.04]", iconClass: "bg-blue-500/15 text-blue-300", countClass: "bg-blue-500/15 text-blue-200" },
  { key: "contacted", label: "Contacted", description: "You have reached out", statuses: ["contacted"], icon: Send, headerClass: "border-[#BAFB3A]/25 bg-[#BAFB3A]/[0.04]", iconClass: "bg-[#BAFB3A]/15 text-[#BAFB3A]", countClass: "bg-[#BAFB3A]/15 text-[#BAFB3A]" },
  { key: "replied", label: "Replied", description: "Conversation is open", statuses: ["replied"], icon: MessageCircle, headerClass: "border-[#1CC7E0]/25 bg-[#1CC7E0]/[0.04]", iconClass: "bg-[#1CC7E0]/15 text-[#1CC7E0]", countClass: "bg-[#1CC7E0]/15 text-[#1CC7E0]" },
  { key: "closing", label: "Closing", description: "Moving toward a yes", statuses: ["meeting"], icon: Handshake, headerClass: "border-amber-500/25 bg-amber-500/[0.04]", iconClass: "bg-amber-500/15 text-amber-300", countClass: "bg-amber-500/15 text-amber-200" },
  { key: "won", label: "Won", description: "Ready to become a client", statuses: ["won"], icon: Trophy, headerClass: "border-emerald-500/25 bg-emerald-500/[0.04]", iconClass: "bg-emerald-500/15 text-emerald-300", countClass: "bg-emerald-500/15 text-emerald-200" },
  { key: "not-moving-forward", label: "Not moving forward", description: "Keep the record for context", statuses: ["lost", "not_interested"], icon: ArchiveX, headerClass: "border-red-500/20 bg-red-500/[0.035]", iconClass: "bg-red-500/10 text-red-300", countClass: "bg-red-500/10 text-red-200" },
];

function normalizeStatus(value: unknown): PipelineStatus {
  const normalized = String(value || "new").toLowerCase();
  return STATUS_OPTIONS.some((option) => option.value === normalized) ? normalized as PipelineStatus : "new";
}

function categoryMeta(value: unknown, score: unknown) {
  const category = String(value || "").toLowerCase();
  const numericScore = Number(score);
  const hasVerifiedRanking = Number.isFinite(numericScore) && ["hot", "warm", "cold"].includes(category);
  if (!hasVerifiedRanking) return { label: "UNRANKED", className: "border-violet-500/25 bg-violet-500/10 text-violet-200", icon: null };
  switch (category) {
    case "hot": return { label: "HOT", className: "border-red-500/25 bg-red-500/10 text-red-200", icon: Flame };
    case "warm": return { label: "WARM", className: "border-amber-500/25 bg-amber-500/10 text-amber-200", icon: null };
    default: return { label: "COLD", className: "border-zinc-700 bg-zinc-800/70 text-zinc-300", icon: null };
  }
}

function scoreLabel(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const score = Number(value);
  return Number.isFinite(score) ? `${score} pts` : null;
}

function formatLastContact(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function isNestedPipelineInteraction(event: SyntheticEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const nestedControl = target.closest("a,button,input,textarea,select,label,[role=\"button\"],[role=\"combobox\"],[contenteditable=\"true\"],[data-lead-interaction=\"true\"]");
  return Boolean(nestedControl && nestedControl !== event.currentTarget);
}

function handlePipelineCardKeyDown(event: KeyboardEvent<HTMLElement>, activate: () => void) {
  if (isNestedPipelineInteraction(event)) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate();
  }
}

type LeadPipelineProps = {
  leads: PipelineLead[];
  onStatusChange: (leadId: string, nextStatus: PipelineStatus) => void | Promise<void>;
  onViewDetails?: (leadId: string) => void;
};

export function LeadPipeline({ leads, onStatusChange, onViewDetails }: LeadPipelineProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const groupedStages = useMemo(() => STAGES.map((stage) => ({ stage, leads: leads.filter((lead) => stage.statuses.includes(normalizeStatus(lead.status))) })), [leads]);

  const moveLead = async (lead: PipelineLead, nextStatus: PipelineStatus) => {
    const leadId = String(lead.id || "");
    if (!leadId || normalizeStatus(lead.status) === nextStatus) return;
    setUpdatingIds((current) => new Set(current).add(leadId));
    try {
      await onStatusChange(leadId, nextStatus);
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(leadId);
        return next;
      });
    }
  };

  return (
    <Card className="overflow-hidden border-[#BAFB3A]/[0.15] bg-zinc-950/70 shadow-[0_0_32px_rgba(0,0,0,0.2)]" aria-labelledby="lead-pipeline-heading">
      <div className="border-b border-white/10 bg-gradient-to-br from-[#BAFB3A]/[0.06] via-transparent to-[#1CC7E0]/[0.04] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#BAFB3A]"><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />Pipeline view</div>
            <h3 id="lead-pipeline-heading" className="mt-1 text-lg font-semibold text-white">See every lead’s next step</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">Move a saved lead between stages as conversations progress. Changes save to the lead record immediately, and nothing is sent automatically.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-zinc-300"><Inbox className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />{leads.length} saved {leads.length === 1 ? "lead" : "leads"}</span>
        </div>
      </div>

      <div className="overflow-x-auto p-3 sm:p-4" role="region" aria-label="Saved lead status pipeline" tabIndex={0}>
        <div className="grid min-w-[1280px] grid-cols-6 gap-3">
          {groupedStages.map(({ stage, leads: stageLeads }) => {
            const StageIcon = stage.icon;
            return (
              <section key={stage.key} className={cn("min-w-0 rounded-2xl border p-2.5", stage.headerClass)} aria-labelledby={`pipeline-stage-${stage.key}`}>
                <div className="flex items-start justify-between gap-2 px-1 py-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", stage.iconClass)}><StageIcon className="h-4 w-4" aria-hidden="true" /></span>
                    <div className="min-w-0"><h4 id={`pipeline-stage-${stage.key}`} className="truncate text-xs font-semibold text-white">{stage.label}</h4><p className="mt-0.5 truncate text-[10px] text-zinc-500">{stage.description}</p></div>
                  </div>
                  <span className={cn("flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold", stage.countClass)} aria-label={`${stageLeads.length} leads in ${stage.label}`}>{stageLeads.length}</span>
                </div>

                <div className="mt-3 space-y-2">
                  {stageLeads.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-5 text-center"><CircleOff className="mx-auto h-4 w-4 text-zinc-600" aria-hidden="true" /><p className="mt-2 text-[11px] font-medium text-zinc-500">No leads here yet</p><p className="mt-1 text-[10px] leading-relaxed text-zinc-600">Use “Move to” on a lead card to place one here.</p></div> : stageLeads.map((lead) => {
                    const leadId = String(lead.id || "");
                    const name = String(lead.businessName || "Unnamed business");
                    const tradeLocation = [lead.trade, lead.location].filter(Boolean).join(" • ") || "Business type and location not set";
                    const source = String(lead.source || "").trim().toLowerCase();
                    const isOwnerApprovedFallback = source === "llm_fallback" && lead.fallbackBuildApproved === true;
                    const category = isOwnerApprovedFallback ? { label: "UNVERIFIED", className: "border-zinc-700 bg-zinc-800/70 text-zinc-300", icon: null } : categoryMeta(lead.leadCategory, lead.score);
                    const CategoryIcon = category.icon;
                    const score = isOwnerApprovedFallback ? null : scoreLabel(lead.score);
                    const lastContact = formatLastContact(lead.lastContactedAt);
                    const isUpdating = updatingIds.has(leadId);
                    const showDetailsButton = Boolean(leadId && onViewDetails);
                    return <article key={leadId} role={showDetailsButton ? "button" : undefined} tabIndex={showDetailsButton ? 0 : undefined} aria-label={showDetailsButton ? `Open lead details for ${name}` : undefined} onClick={(event) => { if (showDetailsButton && !isNestedPipelineInteraction(event)) onViewDetails?.(leadId); }} onKeyDown={(event) => { if (showDetailsButton) handlePipelineCardKeyDown(event, () => onViewDetails?.(leadId)); }} className={cn("rounded-xl border border-white/10 bg-zinc-950/75 p-3 transition-colors hover:border-white/20", showDetailsButton && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BAFB3A]/60")}>
                      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h5 className="truncate text-xs font-semibold text-white" title={name}>{name}</h5><p className="mt-1 flex items-start gap-1 text-[10px] leading-relaxed text-zinc-500"><MapPin className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" aria-hidden="true" />{tradeLocation}</p></div><Badge variant="outline" className={cn("shrink-0 px-1.5 py-0.5 text-[9px] font-bold tracking-wide", category.className)}>{CategoryIcon && <CategoryIcon className="mr-1 inline h-2.5 w-2.5" aria-hidden="true" />}{category.label}</Badge></div>
                      {isOwnerApprovedFallback && <div className="mt-2"><Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">Owner-approved fallback</Badge></div>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500">{score && <span className="font-medium text-zinc-300">{score}</span>}{lastContact ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />Last contact {lastContact}{lead.contactMethod && <span className="text-zinc-600">via {String(lead.contactMethod).replace(/_/g, " ")}</span>}</span> : <span>No contact logged</span>}</div>
                      {showDetailsButton && <button type="button" onClick={(event) => { event.stopPropagation(); onViewDetails?.(leadId); }} className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#BAFB3A]/20 bg-[#BAFB3A]/[0.06] px-2.5 py-2 text-left text-[11px] font-semibold text-[#BAFB3A] transition-colors hover:bg-[#BAFB3A]/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BAFB3A]/70" aria-label={`View details for ${name}`}><span>View details</span><ChevronDown className="h-3.5 w-3.5 -rotate-90" aria-hidden="true" /></button>}
                      <div data-lead-interaction="true" className="mt-3 border-t border-white/10 pt-2"><div className="mb-1.5 flex items-center justify-between gap-2"><label htmlFor={`pipeline-status-${leadId}`} className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Move to{isUpdating && <Loader2 className="h-3 w-3 animate-spin text-[#BAFB3A]" aria-label="Saving status" />}</label><span className="text-[10px] text-zinc-600">{stage.label}</span></div><Select value={normalizeStatus(lead.status)} onValueChange={(value) => { void moveLead(lead, value as PipelineStatus); }} disabled={isUpdating}><SelectTrigger id={`pipeline-status-${leadId}`} aria-label={`Move ${name} to another stage`} className="h-8 w-full border-white/10 bg-zinc-900 text-[11px] text-white"><SelectValue /></SelectTrigger><SelectContent className="border-zinc-700 bg-zinc-900 text-white">{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>)}</SelectContent></Select></div>
                    </article>;
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

```

## src/components/hub/LeadPublicDetails.tsx

```tsx
import {
  ChevronDown,
  Clock3,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { SocialLinksBar } from "@/components/hub/SocialLinksBar";
import { cn } from "@/lib/utils";

export type SocialLinkValue = { platform: string; url: string };
export type ContactDetailsValue = {
  phones: string[];
  emails: string[];
  contactPageUrl: string;
  bookingUrl: string;
  physicalAddress: string;
  serviceAreas: string[];
  openingHours: string;
};
export type PublicPersonValue = { name: string; role: string; sourceUrl: string };

type LeadLike = Record<string, any>;

type LeadPublicDetailsProps = {
  lead: LeadLike;
  className?: string;
  expanded?: boolean;
  onToggle?: () => void;
};

function safeHttpUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname && !parsed.username && !parsed.password ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function canonicalUrl(value: string) {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.hostname.toLowerCase().replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return value.toLowerCase();
  }
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uniqueText(values: unknown[], max = 12) {
  const seen = new Set<string>();
  return values.map((value) => cleanText(value)).filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, max);
}

function platformLabel(url: string, hint: unknown) {
  const provided = cleanText(hint);
  if (provided) return provided;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const match = [
      ["instagram.com", "Instagram"], ["facebook.com", "Facebook"], ["tiktok.com", "TikTok"],
      ["linkedin.com", "LinkedIn"], ["youtube.com", "YouTube"], ["x.com", "X"], ["twitter.com", "X"],
      ["pinterest.com", "Pinterest"], ["threads.net", "Threads"], ["whatsapp.com", "WhatsApp"], ["wa.me", "WhatsApp"],
      ["reddit.com", "Reddit"], ["vimeo.com", "Vimeo"], ["twitch.tv", "Twitch"], ["medium.com", "Medium"], ["behance.net", "Behance"], ["dribbble.com", "Dribbble"], ["linktr.ee", "Linktree"], ["bluesky.app", "Bluesky"],
      ["g.page", "Google Business"], ["yelp.com", "Yelp"], ["tripadvisor.com", "Tripadvisor"],
    ] as const;
    return match.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] || host;
  } catch {
    return "Public profile";
  }
}

export function normalizedSocialLinks(lead: LeadLike): SocialLinkValue[] {
  const raw = Array.isArray(lead.socialLinks) ? lead.socialLinks : [];
  const values = [
    ...raw.map((item: any) => ({ url: item?.url, platform: item?.platform })),
    { url: lead.instagramUrl, platform: "Instagram" },
    { url: lead.facebookUrl, platform: "Facebook" },
    { url: lead.tiktokUrl, platform: "TikTok" },
    { url: lead.linkedinUrl, platform: "LinkedIn" },
    { url: lead.googleBusinessUrl, platform: "Google Business" },
  ];
  const seen = new Set<string>();
  return values.flatMap(({ url, platform }) => {
    const safeUrl = safeHttpUrl(url);
    if (!safeUrl) return [];
    const key = canonicalUrl(safeUrl);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ platform: platformLabel(safeUrl, platform), url: safeUrl }];
  }).slice(0, 24);
}

function safePublicEmail(value: unknown) {
  const candidate = cleanText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate) ? candidate : "";
}

function safePublicPhone(value: unknown) {
  const candidate = cleanText(value);
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? candidate : "";
}

export function normalizedContactDetails(lead: LeadLike): ContactDetailsValue {
  const raw = lead.contactDetails && typeof lead.contactDetails === "object" && !Array.isArray(lead.contactDetails) ? lead.contactDetails : {};
  return {
    phones: uniqueText([...(Array.isArray(raw.phones) ? raw.phones : []), lead.phone].map(safePublicPhone)),
    emails: uniqueText([...(Array.isArray(raw.emails) ? raw.emails : []), lead.email].map(safePublicEmail)),
    contactPageUrl: safeHttpUrl(raw.contactPageUrl),
    bookingUrl: safeHttpUrl(raw.bookingUrl),
    physicalAddress: cleanText(raw.physicalAddress),
    serviceAreas: uniqueText(Array.isArray(raw.serviceAreas) ? raw.serviceAreas : [], 12),
    openingHours: cleanText(raw.openingHours),
  };
}

export function normalizedPublicPeople(lead: LeadLike): PublicPersonValue[] {
  const raw = Array.isArray(lead.publicPeople) ? lead.publicPeople : [];
  const seen = new Set<string>();
  return raw.flatMap((item: any) => {
    const name = cleanText(item?.name, "");
    const role = cleanText(item?.role, "");
    const sourceUrl = safeHttpUrl(item?.sourceUrl || item?.source_url);
    if (!name || !role || !sourceUrl) return [];
    const key = `${name.toLowerCase()}|${role.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, role, sourceUrl }];
  }).slice(0, 8);
}

export function publicOwnerFor(lead: LeadLike): PublicPersonValue | null {
  const explicitName = cleanText(lead.ownerName);
  const explicitRole = cleanText(lead.ownerRole);
  const explicitSource = safeHttpUrl(lead.ownerSourceUrl);
  if (explicitName && explicitRole && explicitSource) return { name: explicitName, role: explicitRole, sourceUrl: explicitSource };
  return normalizedPublicPeople(lead).find((person) => /owner|founder|director|principal|manager|decision[- ]?maker|ceo|president/i.test(person.role)) || null;
}

function researchSourcesFor(lead: LeadLike, details: ContactDetailsValue) {
  const values = [
    ...(Array.isArray(lead.researchSourceUrls) ? lead.researchSourceUrls : []),
    lead.evidenceUrl,
    lead.website,
    details.contactPageUrl,
    details.bookingUrl,
  ].map(safeHttpUrl).filter(Boolean);
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = canonicalUrl(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  const value = phone.replace(/[^\d+]/g, "");
  return value ? `tel:${value}` : "";
}

function externalAction(href: string, label: string, Icon: typeof Globe) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary" onClick={(event) => event.stopPropagation()}><Icon className="h-3 w-3" aria-hidden="true" />{label}</a>;
}

export function LeadPublicDetails({ lead, className, expanded = false, onToggle }: LeadPublicDetailsProps) {
  const details = normalizedContactDetails(lead);
  const socialLinks = normalizedSocialLinks(lead);
  const people = normalizedPublicPeople(lead);
  const owner = publicOwnerFor(lead);
  const displayedPeople = owner && !people.some((person) => person.name.toLowerCase() === owner.name.toLowerCase())
    ? [owner, ...people].slice(0, 8)
    : people;
  const summary = cleanText(lead.businessSummary || lead.socialBio);
  const services = uniqueText(Array.isArray(lead.services) ? lead.services : [], 10);
  const sources = researchSourcesFor(lead, details);
  const phones = details.phones.filter((phone) => phoneHref(phone));
  const hasContact = phones.length > 0 || details.emails.length > 0 || details.contactPageUrl || details.bookingUrl;
  const hasStructuredContactDetails = Boolean(lead.contactDetails && typeof lead.contactDetails === "object" && !Array.isArray(lead.contactDetails));

  return <div className={cn("space-y-2", className)}>
    {hasStructuredContactDetails && hasContact && <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-zinc-950/30 p-2.5" aria-label="Public contact details">
      {phones.map((phone) => <a key={`phone-${phone}`} href={phoneHref(phone)} className="inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] text-zinc-300 hover:text-primary" onClick={(event) => event.stopPropagation()}><Phone className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />{phone}</a>)}
      {details.emails.map((email) => <a key={`email-${email}`} href={`mailto:${email}`} className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg px-1.5 py-1 text-[11px] text-zinc-300 hover:text-primary" onClick={(event) => event.stopPropagation()}><Mail className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />{email}</a>)}
      {details.contactPageUrl && externalAction(details.contactPageUrl, "Contact", Mail)}
      {details.bookingUrl && externalAction(details.bookingUrl, "Book or quote", Globe)}
    </div>}
    {owner && <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-2 text-[11px] text-zinc-300"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /><span><strong className="font-semibold text-ivory">Publicly listed:</strong> {owner.name}, {owner.role} <a href={owner.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-accent hover:underline" onClick={(event) => event.stopPropagation()}>source</a></span></div>}
    {summary && <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{summary}</p>}
    {services.length > 0 && <div className="flex flex-wrap gap-1.5">{services.slice(0, 5).map((service) => <span key={service} className="rounded-full border border-border bg-background px-2 py-1 text-[10px] text-zinc-300">{service}</span>)}</div>}
    {onToggle && <button type="button" onClick={onToggle} className="flex w-full items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-left text-[11px] font-semibold text-zinc-300 transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" aria-expanded={expanded}><span>Public business details</span><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" /></button>}
    {expanded && <div className="space-y-4 rounded-xl border border-border bg-zinc-950/60 p-3 text-xs">
      <div><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">All public social and profile links</h4>{socialLinks.length > 0 ? <SocialLinksBar className="mt-2" showLabels socialLinks={socialLinks} /> : <p className="mt-2 text-muted-foreground">No public social or profile links were found.</p>}</div>
      <div><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Public contact details</h4>{hasContact ? <div className="mt-2 space-y-2 text-zinc-300">{phones.map((phone) => <a key={`detail-phone-${phone}`} href={phoneHref(phone)} className="flex items-center gap-2 hover:text-primary"><Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />{phone}</a>)}{details.emails.map((email) => <a key={`detail-email-${email}`} href={`mailto:${email}`} className="flex items-center gap-2 break-all hover:text-primary"><Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />{email}</a>)}{details.contactPageUrl && <div>{externalAction(details.contactPageUrl, "Open contact page", Mail)}</div>}{details.bookingUrl && <div>{externalAction(details.bookingUrl, "Open booking or quote page", Globe)}</div>}</div> : <p className="mt-2 text-muted-foreground">No public phone, email, contact, or booking detail was found.</p>}</div>
      {(details.physicalAddress || details.serviceAreas.length > 0 || details.openingHours) && <div className="space-y-2 text-zinc-300">{details.physicalAddress && <p className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span>{details.physicalAddress}</span></p>}{details.serviceAreas.length > 0 && <p><span className="font-medium text-ivory">Service areas:</span> {details.serviceAreas.join(", ")}</p>}{details.openingHours && <p className="flex gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span>{details.openingHours}</span></p>}</div>}
      {services.length > 0 && <div><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Services or products</h4><div className="mt-2 flex flex-wrap gap-1.5">{services.map((service) => <span key={`detail-${service}`} className="rounded-full border border-border bg-background px-2 py-1 text-[10px] text-zinc-300">{service}</span>)}</div></div>}
      <div><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Public people</h4>{displayedPeople.length > 0 ? <div className="mt-2 space-y-2">{!owner && <p className="text-muted-foreground">Not publicly listed: no owner or decision-maker was identified.</p>}{displayedPeople.map((person) => <div key={`${person.name}-${person.role}-${person.sourceUrl}`} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 p-2.5"><div><p className="font-medium text-ivory">{person.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{person.role}</p></div><a href={person.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[11px] text-cyan-accent hover:underline" onClick={(event) => event.stopPropagation()}>Source <ExternalLink className="h-3 w-3" aria-hidden="true" /></a></div>)}</div> : <p className="mt-2 text-muted-foreground">Not publicly listed. No owner or decision-maker was identified on the inspected public pages.</p>}</div>
      <div><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Research sources</h4>{sources.length > 0 ? <div className="mt-2 space-y-1.5">{sources.map((source) => <a key={source} href={source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all text-cyan-accent hover:underline" onClick={(event) => event.stopPropagation()}><ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />{source}</a>)}</div> : <p className="mt-2 text-muted-foreground">No source URL was saved for this record.</p>}</div>
    </div>}
  </div>;
}

```

## src/components/hub/LeadOutreachPanel.tsx

```tsx
import { useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SocialLinksBar } from "@/components/hub/SocialLinksBar";
import { OutreachAssetEditor } from "@/components/hub/OutreachAssetEditor";
import { diagnoseBundleCompleteness, safePrivatePreviewUrl, type LeadBuildState } from "@/lib/lead-build";

export type OutreachLead = {
  id: string;
  businessName?: string;
  trade?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  websiteStatus?: string | null;
  source?: string | null;
  fallbackBuildApproved?: boolean | null;
  score?: number | null;
  leadCategory?: string | null;
  socialBio?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
  googleBusinessUrl?: string | null;
  clientSiteId?: string | null;
  siteBuildStatus?: string | null;
  siteBuildError?: string | null;
  previewUrl?: string | null;
  pitchDm?: string | null;
  followUpDm?: string | null;
  coldCallPitch?: string | null;
  automaticBuildEligible?: boolean;
  automaticBuildReason?: string | null;
  bundleComplete?: boolean;
  bundleMissing?: string[];
  outreachBuildState?: LeadBuildState | string | null;
};

export type BuildRequestOutcome = {
  status: "queued" | "already_active" | "complete" | "blocked";
  reason: string;
  lead?: OutreachLead;
};

type Feedback = {
  tone: "success" | "error" | "info";
  message: string;
};

type LeadOutreachPanelProps = {
  lead: OutreachLead;
  onBuild: (lead: OutreachLead) => BuildRequestOutcome | void | Promise<BuildRequestOutcome | void>;
  onRetry: (lead: OutreachLead) => BuildRequestOutcome | void | Promise<BuildRequestOutcome | void>;
  onSaveDm: (leadId: string, pitchDm: string) => void | Promise<void>;
  onSaveFollowUpDm: (leadId: string, followUpDm: string) => void | Promise<void>;
  onSaveColdCallPitch: (leadId: string, coldCallPitch: string) => void | Promise<void>;
};

type BuildState = LeadBuildState;

type StateMeta = { label: string; detail: string; className: string };

const BUILD_STATE_META: Record<Exclude<BuildState, "none">, StateMeta> = {
  queued: {
    label: "Queued",
    detail: "The private site and three outreach drafts are waiting for an available builder slot.",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  },
  building: {
    label: "Building",
    detail: "The private concept and lead-specific outreach are being prepared from the saved business facts.",
    className: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  },
  ready: {
    label: "Draft ready",
    detail: "The private concept and complete editable outreach bundle are ready for your review.",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  },
  incomplete: {
    label: "Needs repair",
    detail: "This lead has a partial draft. Repair the complete website and outreach bundle before editing it.",
    className: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  },
  failed: {
    label: "Build failed",
    detail: "The draft could not be completed. Retry the full bundle when you are ready.",
    className: "border-red-500/25 bg-red-500/10 text-red-300",
  },
  blocked: {
    label: "Build unavailable",
    detail: "Automatic drafting stays off until this lead meets the verification rules.",
    className: "border-violet-500/25 bg-violet-500/10 text-violet-200",
  },
};

function normalizeBuildState(value: unknown): BuildState | null {
  const state = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["none", "queued", "building", "ready", "incomplete", "failed", "blocked"].includes(state)
    ? (state as BuildState)
    : null;
}

function fallbackBuildState(lead: OutreachLead, bundleComplete: boolean): BuildState {
  if (bundleComplete) return "ready";
  const savedState = normalizeBuildState(lead.siteBuildStatus);
  if (savedState && savedState !== "ready") return savedState;
  if (lead.automaticBuildEligible !== true) return "blocked";
  const hasAnyAsset = Boolean(lead.previewUrl || lead.pitchDm || lead.followUpDm || lead.coldCallPitch);
  return hasAnyAsset ? "incomplete" : "none";
}

function feedbackFor(outcome: BuildRequestOutcome | void): Feedback {
  if (!outcome) return { tone: "info", message: "The request was handed to the draft builder." };
  if (outcome.status === "blocked") return { tone: "error", message: outcome.reason };
  if (outcome.status === "complete") return { tone: "success", message: "The private website and pitches are already ready." };
  if (outcome.status === "already_active") return { tone: "info", message: outcome.reason };
  return { tone: "info", message: "Build accepted. Nothing will be sent automatically." };
}

export function LeadOutreachPanel({
  lead,
  onBuild,
  onRetry,
  onSaveDm,
  onSaveFollowUpDm,
  onSaveColdCallPitch,
}: LeadOutreachPanelProps) {
  const [requesting, setRequesting] = useState<"build" | "retry" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const diagnosis = diagnoseBundleCompleteness(lead as unknown as Record<string, unknown>);
  const bundleComplete = typeof lead.bundleComplete === "boolean" ? lead.bundleComplete && diagnosis.complete : diagnosis.complete;
  const missing = bundleComplete ? [] : (lead.bundleMissing?.length ? lead.bundleMissing : diagnosis.missing);
  const previewUrl = safePrivatePreviewUrl(lead.previewUrl, lead.clientSiteId);
  const suppliedState = normalizeBuildState(lead.outreachBuildState);
  const contractState = suppliedState || fallbackBuildState(lead, bundleComplete);
  const state: BuildState = bundleComplete ? "ready" : !lead.automaticBuildEligible ? "blocked" : contractState === "ready" ? "incomplete" : contractState;
  const eligible = lead.automaticBuildEligible === true;
  const ownerApprovedFallback = lead.source?.trim().toLowerCase() === "llm_fallback" && lead.fallbackBuildApproved === true;
  const stateMeta: StateMeta = state === "none"
    ? {
      label: eligible ? "Ready to build" : "Build unavailable",
      detail: eligible ? `This ${ownerApprovedFallback ? "owner-approved fallback HOT lead" : "verified HOT lead"} can receive a private website and all three outreach drafts.` : "This lead is not eligible for the automatic private draft builder.",
      className: eligible ? "border-[#BAFB3A]/25 bg-[#BAFB3A]/10 text-[#BAFB3A]" : BUILD_STATE_META.blocked.className,
    }
    : BUILD_STATE_META[state];
  const canUseEditors = bundleComplete && state === "ready";
  const hasSourceLinks = Boolean(lead.website || lead.instagramUrl || lead.facebookUrl || lead.tiktokUrl || lead.linkedinUrl || lead.googleBusinessUrl);
  const blockedReason = (lead.automaticBuildReason || "This lead needs a verified web-search source, meaningful business facts, and valid evidence before a private draft can be built.").trim();
  const failureMessage = typeof lead.siteBuildError === "string" ? lead.siteBuildError.trim() : "";
  const phone = typeof lead.phone === "string" ? lead.phone.trim() : "";
  const email = typeof lead.email === "string" ? lead.email.trim() : "";
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+().,\s#*;-]/g, "")}` : "";
  const emailHref = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : "";

  const handleRequest = async (kind: "build" | "retry") => {
    setRequesting(kind);
    setFeedback(null);
    try {
      const outcome = await (kind === "retry" ? onRetry(lead) : onBuild(lead));
      setFeedback(feedbackFor(outcome));
    } catch (error) {
      console.error(`Failed to ${kind} private draft build`, error);
      setFeedback({ tone: "error", message: "The request could not be accepted. Try again." });
    } finally {
      setRequesting(null);
    }
  };

  const placeholder = (asset: "first" | "follow-up" | "call") => {
    if (state === "queued" || state === "building") return asset === "first" ? "The first message will appear when the bundle is ready." : asset === "follow-up" ? "The follow-up will appear when the bundle is ready." : "The cold-call pitch will appear when the bundle is ready.";
    if (state === "incomplete") return "Repair the complete bundle above before editing this draft.";
    if (state === "none") return "Choose Build website + pitches above to create this draft.";
    if (state === "blocked") return "Automatic drafting is unavailable for this lead.";
    if (state === "failed") return "Retry the build above to recreate this draft.";
    return "The complete draft is ready for review.";
  };

  return (
    <section
      aria-label={`Draft outreach for ${lead.businessName || "this lead"}`}
      className="mt-3 rounded-2xl border border-[#BAFB3A]/15 bg-gradient-to-br from-[#BAFB3A]/[0.06] via-zinc-950/80 to-cyan-500/[0.04] p-4"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#BAFB3A]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Private outreach bundle</span>
            <Badge variant="outline" className={cn("text-[11px]", stateMeta.className)}>
              {state === "building" && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />}
              {stateMeta.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{stateMeta.detail}</p>
          {ownerApprovedFallback && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100" role="note">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span><strong className="font-semibold text-amber-50">Owner-approved fallback.</strong> This lead was not verified by web search. Drafts use the saved details, stay private, and nothing is sent automatically.</span>
            </div>
          )}
          {state === "blocked" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-100" role="alert">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
              <span><strong className="font-semibold text-violet-50">Automatic build blocked.</strong> {blockedReason}</span>
            </div>
          )}
          {state === "incomplete" && (
            <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-100" role="alert">
              <p className="font-semibold text-orange-50">Repair needed before review</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {failureMessage && state !== "blocked" && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-300" role="alert"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{failureMessage}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {previewUrl && state !== "blocked" && (
            <Button asChild size="sm" variant="outline" className="h-8 border-cyan-500/25 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Open website draft</a>
            </Button>
          )}
          {(state === "none" || state === "incomplete") && eligible && (
            <Button type="button" size="sm" onClick={() => void handleRequest("build")} disabled={requesting !== null} className="h-8 bg-[#BAFB3A] text-black hover:bg-[#BAFB3A]/90">
              {requesting === "build" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
              {state === "incomplete" ? "Repair website + pitches" : "Build website + pitches"}
            </Button>
          )}
          {state === "failed" && eligible && (
            <Button type="button" size="sm" variant="outline" onClick={() => void handleRequest("retry")} disabled={requesting !== null} className="h-8 border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/20">
              {requesting === "retry" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}Retry build
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.42fr)]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Source profiles</p><p className="mt-1 text-xs text-zinc-400">Check the profiles beside the wording before you reach out.</p></div>
            {feedback && <span className={cn("inline-flex max-w-full items-center gap-1.5 text-xs", feedback.tone === "error" ? "text-red-300" : feedback.tone === "success" ? "text-emerald-300" : "text-cyan-300")} role="status" aria-live="polite"><RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{feedback.message}</span>}
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-zinc-950/50 p-2.5">{hasSourceLinks ? <SocialLinksBar showLabels instagramUrl={lead.instagramUrl} facebookUrl={lead.facebookUrl} tiktokUrl={lead.tiktokUrl} linkedinUrl={lead.linkedinUrl} googleBusinessUrl={lead.googleBusinessUrl} website={lead.website} /> : <span className="text-xs text-zinc-600">No source profiles were saved for this lead.</span>}</div>
          <div className="mt-3 rounded-xl border border-white/10 bg-zinc-950/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Contact details</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {phoneHref ? <a href={phoneHref} onClick={(event) => event.stopPropagation()} aria-label={`Call ${lead.businessName || "this lead"} at ${phone}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-2 text-xs text-zinc-300 transition-colors hover:border-cyan-400/30 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"><Phone className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" /><span className="min-w-0 truncate"><span className="block text-[10px] uppercase tracking-wide text-zinc-600">Phone</span>{phone}</span></a> : <span className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/40 px-2.5 py-2 text-xs text-zinc-600"><Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><span className="block text-[10px] uppercase tracking-wide text-zinc-600">Phone</span>{phone || "Phone not saved"}</span></span>}
              {emailHref ? <a href={emailHref} onClick={(event) => event.stopPropagation()} aria-label={`Email ${lead.businessName || "this lead"} at ${email}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-2 text-xs text-zinc-300 transition-colors hover:border-cyan-400/30 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"><Mail className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" /><span className="min-w-0 truncate"><span className="block text-[10px] uppercase tracking-wide text-zinc-600">Email</span>{email}</span></a> : <span className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/40 px-2.5 py-2 text-xs text-zinc-600"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><span className="block text-[10px] uppercase tracking-wide text-zinc-600">Email</span>{email || "Email not saved"}</span></span>}
            </div>
          </div>
          {previewUrl && state !== "blocked" && <p className="mt-2 break-all text-[11px] leading-relaxed text-zinc-500">Exact private preview link: <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-200">{previewUrl}</a></p>}
        </div>
        <div className="rounded-xl border border-[#BAFB3A]/10 bg-[#BAFB3A]/[0.04] p-3 text-xs leading-relaxed text-zinc-400"><p className="font-medium text-zinc-200">Ready before you contact them</p><p className="mt-1">Each script becomes editable and copy-ready only after the full bundle is complete. Nothing sends automatically, and the preview stays private.</p></div>
      </div>

      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <OutreachAssetEditor label="First outreach DM" description="Your initial tradie-to-tradie message, with the exact private preview link included." value={canUseEditors ? lead.pitchDm : ""} placeholder={placeholder("first")} copyLabel="Copy DM" canEdit={canUseEditors} rows={7} tone="lime" onSave={(value) => onSaveDm(lead.id, value)} />
        <OutreachAssetEditor label="Follow-up DM" description="A short second message that asks whether they had a chance to look at the preview." value={canUseEditors ? lead.followUpDm : ""} placeholder={placeholder("follow-up")} copyLabel="Copy follow-up" canEdit={canUseEditors} rows={6} tone="cyan" onSave={(value) => onSaveFollowUpDm(lead.id, value)} />
        <OutreachAssetEditor label="Cold call pitch" description="A spoken opener tailored to the business, trade, location, and website status." value={canUseEditors ? lead.coldCallPitch : ""} placeholder={placeholder("call")} copyLabel="Copy call pitch" canEdit={canUseEditors} rows={8} tone="amber" onSave={(value) => onSaveColdCallPitch(lead.id, value)} />
      </div>
    </section>
  );
}

export default LeadOutreachPanel;

```

## src/components/hub/LeadDataSyncAction.tsx

```tsx
import { useState } from "react";
import { Check, Database, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncLeadsFromDataManagement } from "@/functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type LeadDataSyncSummary = {
  scannedCount: number;
  syncedCount: number;
  alreadyPresentCount: number;
  skippedCount: number;
  ambiguousCount: number;
  failedCount: number;
  sourceTruncated: boolean;
  recordLimit: number;
  skippedNames: string[];
  ambiguousNames: string[];
  failedNames: string[];
};

type LeadDataSyncActionProps = {
  onCompleted?: (summary: LeadDataSyncSummary) => void | Promise<void>;
  className?: string;
};

type SyncData = Record<string, any>;

const CONFIRMATION_MESSAGE = "Restore missing leads from Data Management into Saved leads? This copies only records missing from Saved leads, preserves original Data Management records, and can be run again after future searches. It does not build websites or create outreach.";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function unwrapFunctionData(value: unknown, depth = 0): SyncData {
  if (depth > 6 || value === null || value === undefined) return {};
  if (typeof value === "string") {
    try {
      return unwrapFunctionData(JSON.parse(value), depth + 1);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as SyncData;
  const nested = record.data ?? record.body;
  return nested !== undefined && nested !== null && (typeof nested === "object" || typeof nested === "string")
    ? unwrapFunctionData(nested, depth + 1)
    : record;
}

function errorData(error: any): SyncData {
  const candidates = [error?.response?.data, error?.response?.body, error?.data, error?.body, error?.response, error];
  for (const candidate of candidates) {
    const data = unwrapFunctionData(candidate);
    if (Object.keys(data).length > 0) return data;
  }
  return {};
}

function responseStatusFor(error: any, data: SyncData = {}) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.httpStatus,
    error?.response?.status,
    error?.response?.statusCode,
    data?.status,
    data?.statusCode,
    data?.httpStatus,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 100 && value <= 599) return String(Math.trunc(value));
    if (typeof value === "string" && /^\d{3}$/.test(value)) return value;
  }
  return "";
}

function diagnosticStatus(error: any, data: SyncData) {
  const status = text(data.status).toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,79}$/.test(status) ? status : responseStatusFor(error, data) || "unknown";
}

function fallbackFailureMessage(status: string, httpStatus: string) {
  if (status === "unauthorized" || httpStatus === "401") return "Your sign-in session needs refreshing. Refresh the page and sign in again, then restore Saved Leads.";
  if (status === "permission_denied" || httpStatus === "403") return "This workspace cannot access the saved lead records. Check your access and try again.";
  return "The saved lead restore could not be completed safely. Refresh Saved leads and try again.";
}

function countFor(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function namesFor(data: SyncData, key: keyof LeadDataSyncSummary) {
  return Array.isArray(data[key])
    ? data[key].map((item: unknown) => text(item)).filter(Boolean)
    : [];
}

function summarizeSync(data: SyncData): LeadDataSyncSummary {
  return {
    scannedCount: countFor(data.scannedCount),
    syncedCount: countFor(data.syncedCount),
    alreadyPresentCount: countFor(data.alreadyPresentCount),
    skippedCount: countFor(data.skippedCount),
    ambiguousCount: countFor(data.ambiguousCount),
    failedCount: countFor(data.failedCount),
    sourceTruncated: data.sourceTruncated === true,
    recordLimit: countFor(data.recordLimit) || 1000,
    skippedNames: namesFor(data, "skippedNames"),
    ambiguousNames: namesFor(data, "ambiguousNames"),
    failedNames: namesFor(data, "failedNames"),
  };
}

function SyncResult({ summary }: { summary: LeadDataSyncSummary }) {
  const counts = [
    { label: "Scanned", value: summary.scannedCount, tone: "text-ivory" },
    { label: "Restored", value: summary.syncedCount, tone: "text-primary" },
    { label: "Already present", value: summary.alreadyPresentCount, tone: "text-cyan-accent" },
    { label: "Skipped", value: summary.skippedCount, tone: "text-amber-200" },
    { label: "Ambiguous", value: summary.ambiguousCount, tone: "text-amber-200" },
    { label: "Failed", value: summary.failedCount, tone: "text-red-200" },
  ];
  const issues = [
    { label: "Skipped for review", names: summary.skippedNames, tone: "text-amber-200" },
    { label: "Ambiguous matches", names: summary.ambiguousNames, tone: "text-amber-200" },
    { label: "Could not save", names: summary.failedNames, tone: "text-red-200" },
  ].filter((issue) => issue.names.length > 0);
  const partial = summary.sourceTruncated || summary.skippedCount > 0 || summary.ambiguousCount > 0 || summary.failedCount > 0;
  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3" role="status" aria-live="polite">
      <div className="flex items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ivory">{partial ? "Restore finished with items to review" : "Saved lead restore complete"}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Only missing records were restored. Original Data Management records remain untouched.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((item) => <span key={item.label} className="rounded-lg border border-border bg-background/40 px-2.5 py-2 text-[11px] text-zinc-300"><strong className={item.tone}>{item.value}</strong><span className="ml-1">{item.label}</span></span>)}
      </div>
      {summary.sourceTruncated && <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-100">The safety limit was reached, so only the first {summary.recordLimit.toLocaleString()} source records were scanned.</p>}
      {issues.length > 0 && <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground">{issues.map((issue) => <p key={issue.label}><span className={cn("font-semibold", issue.tone)}>{issue.label}:</span> {issue.names.join(", ")}</p>)}</div>}
    </div>
  );
}

export function LeadDataSyncAction({ onCompleted, className }: LeadDataSyncActionProps) {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<LeadDataSyncSummary | null>(null);
  const [failureMessage, setFailureMessage] = useState("");

  const handleSync = async () => {
    if (running) return;
    if (typeof window !== "undefined" && !window.confirm(CONFIRMATION_MESSAGE)) return;
    setRunning(true);
    setSummary(null);
    setFailureMessage("");
    try {
      const response = await (syncLeadsFromDataManagement as any)({ action: "sync_missing_leads" });
      const data = unwrapFunctionData(response);
      if (data.success !== true) {
        const httpStatus = responseStatusFor(response, data);
        const status = diagnosticStatus(response, data);
        const message = text(data.message, fallbackFailureMessage(status, httpStatus));
        setFailureMessage(message);
        console.error("[lead-sync] sync_failed", { status, httpStatus: httpStatus || "none" });
        toast.error("Saved lead restore did not complete", { description: message });
        return;
      }

      const nextSummary = summarizeSync(data);
      setSummary(nextSummary);
      try {
        await onCompleted?.(nextSummary);
      } catch (error) {
        console.warn("[lead-sync] refresh_after_sync_failed", error);
      }
      const partial = nextSummary.sourceTruncated || nextSummary.skippedCount > 0 || nextSummary.ambiguousCount > 0 || nextSummary.failedCount > 0;
      const limitNote = nextSummary.sourceTruncated ? ` Only the first ${nextSummary.recordLimit.toLocaleString()} source records were scanned.` : "";
      toast.success(partial ? "Restore finished with items to review" : "Saved leads restored", { description: `${nextSummary.syncedCount} restored, ${nextSummary.alreadyPresentCount} already present. Original records were left untouched.${limitNote}` });
    } catch (error: any) {
      const data = errorData(error);
      const httpStatus = responseStatusFor(error, data);
      const status = diagnosticStatus(error, data);
      const message = text(data.message, fallbackFailureMessage(status, httpStatus));
      setFailureMessage(message);
      console.error("[lead-sync] sync_failed", { status, httpStatus: httpStatus || "none" });
      toast.error("Saved lead restore did not complete", { description: message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-primary/20 bg-primary/[0.04] p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-ivory">Restore Saved Leads</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Copies only records missing from Saved leads, preserves original Data Management records, and can be run again after future searches. It does not build websites or create outreach.</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleSync()} disabled={running} className="h-9 shrink-0 gap-2 border-primary/30 bg-primary/[0.06] text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          {running ? "Restoring Saved Leads" : "Restore Saved Leads"}
        </Button>
      </div>
      {running && <p className="mt-2 text-[11px] text-muted-foreground" aria-live="polite">Checking Data Management, comparing saved identities, and restoring missing leads. Original records remain untouched.</p>}
      {failureMessage && <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-red-200" role="alert">{failureMessage}</p>}
      {summary && <SyncResult summary={summary} />}
    </div>
  );
}

```

## src/components/hub/SavedLeadStudioWorkspace.tsx

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Globe2,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadDataSyncAction } from "@/components/hub/LeadDataSyncAction";
import { LeadPublicDetails, normalizedContactDetails } from "@/components/hub/LeadPublicDetails";
import { SavedLeadOutreachPanel } from "@/components/hub/SavedLeadOutreachPanel";
import { Lead } from "@/entities";
import { buildHotLeadSite, generateSavedLeadOutreach } from "@/functions";
import { diagnoseBundleCompleteness, safePrivatePreviewUrl } from "@/lib/lead-build";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LeadRecord = Record<string, any>;
type StudioFilter = "all" | "needs_build" | "in_progress" | "ready" | "failed";
type BuildState = StudioFilter;
type ManualDmValue = { previewUrl: string; pitchDm: string };
type BatchStage = "idle" | "processing" | "complete";
type BatchScopeLead = { id: string; name: string };
type BatchState = {
  stage: BatchStage;
  running: boolean;
  scope: BatchScopeLead[];
  siteCompletedIds: string[];
  siteReadyIds: string[];
  siteBuildingIds: string[];
  siteFailedIds: string[];
  pitchCompletedIds: string[];
  pitchWorkingIds: string[];
  pitchInProgressIds: string[];
  pitchFailedIds: string[];
  readyIds: string[];
  processedIds: string[];
};
type IdListKey = "siteCompletedIds" | "siteReadyIds" | "siteBuildingIds" | "siteFailedIds" | "pitchCompletedIds" | "pitchWorkingIds" | "pitchInProgressIds" | "pitchFailedIds" | "readyIds" | "processedIds";

type SavedLeadStudioProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
};

const BUILD_LOCK_MS = 15 * 60 * 1000;
const EMPTY_BATCH: BatchState = {
  stage: "idle",
  running: false,
  scope: [],
  siteCompletedIds: [],
  siteReadyIds: [],
  siteBuildingIds: [],
  siteFailedIds: [],
  pitchCompletedIds: [],
  pitchWorkingIds: [],
  pitchInProgressIds: [],
  pitchFailedIds: [],
  readyIds: [],
  processedIds: [],
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function unwrapActionResponse(value: unknown, depth = 0): Record<string, any> {
  if (depth > 5 || value === null || value === undefined) return {};
  if (typeof value === "string") {
    try { return unwrapActionResponse(JSON.parse(value), depth + 1); } catch { return {}; }
  }
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, any>;
  const candidates = [
    record.data,
    record.body,
    record.response?.data,
    record.response?.body,
    record.error?.data,
    record.error?.body,
    record.error,
    record.response,
  ];
  for (const candidate of candidates) {
    const nested = unwrapActionResponse(candidate, depth + 1);
    if (Object.keys(nested).length > 0) return nested;
  }
  return record;
}

const WEBSITE_PROGRESS_STATUSES = new Set(["in_progress", "building", "queued"]);
const WEBSITE_FAILURE_STATUSES = new Set([
  "unauthorized",
  "forbidden",
  "not_found",
  "invalid_request",
  "generation_failed",
  "validation_failed",
  "persistence_failed",
  "malformed_response",
  "failed",
]);

function actionStatuses(result: Record<string, any>) {
  return [result.status, result.reason, result.siteBuildStatus, result.statusCode, result.httpStatus, result.response?.status]
    .map((status) => String(status ?? "").toLowerCase())
    .filter(Boolean);
}

function actionHttpStatus(result: Record<string, any>) {
  const values = [result.statusCode, result.httpStatus, result.response?.status, result.response?.data?.statusCode, result.response?.data?.httpStatus];
  const status = values.map((value) => Number(value)).find((value) => Number.isFinite(value) && value >= 400);
  return status || 0;
}

function websiteProgressSignal(result: Record<string, any>) {
  const statuses = actionStatuses(result);
  const httpStatus = actionHttpStatus(result);
  const isConflictLock = httpStatus === 409 && statuses.includes("in_progress");
  return statuses.some((status) => WEBSITE_PROGRESS_STATUSES.has(status))
    && !statuses.some((status) => WEBSITE_FAILURE_STATUSES.has(status))
    && !text(result.error)
    && !text(result.reason)
    && (httpStatus < 400 || isConflictLock);
}

function websiteFailureSignal(result: Record<string, any>) {
  if (websiteProgressSignal(result)) return false;
  const statuses = actionStatuses(result);
  const hasFailureBody = result.success === false || Boolean(text(result.error)) || Boolean(text(result.reason));
  return statuses.some((status) => WEBSITE_FAILURE_STATUSES.has(status))
    || actionHttpStatus(result) >= 400
    || (hasFailureBody && !websiteProgressSignal(result));
}

function actionErrorMessage(value: unknown, fallback: string) {
  const result = unwrapActionResponse(value);
  const statuses = actionStatuses(result);
  const status = statuses.find(Boolean) || "";
  const diagnostic = [result.message, result.error, result.reason, value instanceof Error ? value.message : ""].filter(Boolean).join(" ").toLowerCase();
  const known: Record<string, string> = {
    "401": "Your session has expired. Refresh the page and sign in again.",
    unauthorized: "Your session has expired. Refresh the page and sign in again.",
    "403": "You do not have access to this saved lead.",
    forbidden: "You do not have access to this saved lead.",
    not_found: "This saved lead could not be found. Refresh the studio and try again.",
    invalid_request: "The saved lead request was rejected. Refresh the studio and try again.",
    generation_failed: "The draft generator could not complete. Try again in a moment.",
    validation_failed: "The generated draft failed its safety checks. Try again with the saved facts unchanged.",
    persistence_failed: "The draft was generated but could not be saved. Refresh the studio and try again.",
    malformed_response: "The draft provider returned an unreadable response. Try again in a moment.",
    failed: "The private draft build failed. Try again in a moment.",
    in_progress: "A private draft build is already in progress for this saved lead.",
  };
  if (/\b401\b|unauthor|authentication required|invalid token|token expired/.test(diagnostic)) return known.unauthorized;
  if (/\b403\b|forbidden|permission denied|\brls\b|row-level security/.test(diagnostic)) return known.forbidden;
  return known[status] || fallback;
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password ? url.toString() : "";
  } catch {
    return "";
  }
}

function privatePreview(lead: LeadRecord) {
  return safePrivatePreviewUrl(lead.previewUrl, lead.clientSiteId);
}

function siteStateFor(lead: LeadRecord): BuildState {
  const raw = text(lead.siteBuildStatus).toLowerCase();
  if (raw === "queued" || raw === "building") return "in_progress";
  if (raw === "failed") return "failed";
  if (privatePreview(lead)) return "ready";
  return "needs_build";
}

function stateFor(lead: LeadRecord): BuildState {
  const bundle = diagnoseBundleCompleteness(lead);
  const raw = text(lead.siteBuildStatus).toLowerCase();
  if (bundle.complete) return "ready";
  if (raw === "queued" || raw === "building") return "in_progress";
  if (raw === "failed") return "failed";
  return "needs_build";
}

function isStaleBuild(lead: LeadRecord) {
  const raw = text(lead.siteBuildStatus).toLowerCase();
  if (raw !== "queued" && raw !== "building") return false;
  const updatedAt = Date.parse(text(lead.updated_at));
  if (!Number.isFinite(updatedAt)) return true;
  const age = Date.now() - updatedAt;
  return age < 0 || age >= BUILD_LOCK_MS;
}

function isReadyRecord(lead: LeadRecord | undefined) {
  return Boolean(lead && text(lead.siteBuildStatus).toLowerCase() === "ready" && privatePreview(lead));
}

function isActiveBuild(lead: LeadRecord | undefined) {
  return Boolean(lead && siteStateFor(lead) === "in_progress" && !isStaleBuild(lead));
}

function hasOutreachDrafts(lead: LeadRecord | undefined) {
  return Boolean(lead && [lead.pitchDm, lead.followUpDm, lead.coldCallPitch].every((value) => Boolean(text(value))));
}

function addId(list: string[], id: string) {
  return list.includes(id) ? list : [...list, id];
}

function removeId(list: string[], id: string) {
  return list.filter((item) => item !== id);
}

function filterLabel(filter: StudioFilter) {
  return { all: "All saved", needs_build: "Needs finishing", in_progress: "Building", ready: "Ready to go", failed: "Needs retry" }[filter];
}

function categoryFor(lead: LeadRecord) {
  const category = text(lead.leadCategory).toLowerCase();
  const score = Number(lead.score);
  if (!["hot", "warm", "cold"].includes(category) || !Number.isFinite(score)) return { label: "UNRANKED", className: "border-violet-500/25 bg-violet-500/10 text-violet-200" };
  if (category === "hot") return { label: "HOT", className: "border-red-500/25 bg-red-500/10 text-red-200" };
  if (category === "warm") return { label: "WARM", className: "border-amber-500/25 bg-amber-500/10 text-amber-200" };
  return { label: "COLD", className: "border-zinc-700 bg-zinc-800/70 text-zinc-300" };
}

function websiteLabel(lead: LeadRecord) {
  const url = safeHttpUrl(lead.website);
  if (!url) return { label: "No website saved", className: "text-amber-200" };
  const status = text(lead.websiteStatus).toLowerCase();
  const label = status === "good" ? "Website checked: good" : status === "outdated" ? "Website checked: outdated" : status === "dodgy" ? "Website checked: needs attention" : "Official website saved";
  return { label, className: status === "good" ? "text-emerald-300" : "text-amber-200" };
}

function formatDate(value: unknown) {
  const time = Date.parse(text(value));
  return Number.isFinite(time) ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(time) : "Date not recorded";
}

function sourceFor(lead: LeadRecord) {
  return safeHttpUrl(lead.website) || safeHttpUrl(lead.evidenceUrl) || (Array.isArray(lead.researchSourceUrls) ? safeHttpUrl(lead.researchSourceUrls[0]) : "");
}

function contactSummary(lead: LeadRecord) {
  const details = normalizedContactDetails(lead);
  return { phone: details.phones[0] || "", email: details.emails[0] || "" };
}

function namesForIds(scope: BatchScopeLead[], ids: string[]) {
  const wanted = new Set(ids);
  return scope.filter((item) => wanted.has(item.id)).map((item) => item.name);
}

function ActionButtons({ state, building, stale, onBuild }: { state: BuildState; building: boolean; stale: boolean; onBuild: () => void }) {
  if ((state === "in_progress" && !stale) || building) return <Button type="button" disabled className="h-9 gap-2 bg-primary/20 text-primary"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Building private draft</Button>;
  if (state === "in_progress" && stale) return <Button type="button" onClick={onBuild} variant="outline" className="h-9 gap-2 border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/60 hover:text-amber-100"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Retry stale build</Button>;
  if (state === "ready" || state === "failed") return <Button type="button" variant="outline" onClick={onBuild} className="h-9 gap-2 border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />{state === "failed" ? "Retry private website" : "Rebuild private website"}</Button>;
  return <Button type="button" onClick={onBuild} className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Build private website</Button>;
}

function SavedLeadCard({ lead, expanded, building, outreachGenerating, outreachError, onToggle, onBuild, onGenerateOutreach, onSaveOutreach, onSaveManualDm }: { lead: LeadRecord; expanded: boolean; building: boolean; outreachGenerating: boolean; outreachError: string; onToggle: () => void; onBuild: () => void; onGenerateOutreach: (useQuoteSearchAngle: boolean) => void; onSaveOutreach: (field: "pitchDm" | "followUpDm" | "coldCallPitch", value: string) => void | Promise<void>; onSaveManualDm: (value: ManualDmValue) => void | Promise<void> }) {
  const name = text(lead.businessName, "Unnamed saved business");
  const category = categoryFor(lead);
  const website = websiteLabel(lead);
  const contact = contactSummary(lead);
  const siteState = siteStateFor(lead);
  const state = stateFor(lead);
  const bundle = diagnoseBundleCompleteness(lead);
  const stale = isStaleBuild(lead);
  const source = sourceFor(lead);
  const failed = siteState === "failed" && !bundle.complete;
  const hasPreviousDraft = Boolean(bundle.previewUrl);
  const preview = bundle.previewUrl;
  return <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-border bg-card/80 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
    <div className="border-b border-border/80 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05] p-4 sm:p-5">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><FolderOpen className="h-5 w-5" aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-display text-lg font-semibold text-ivory" title={name}>{name}</h3><Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-bold tracking-wide", category.className)}>{category.label}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{[text(lead.trade, "Business type not listed"), text(lead.location, "Market not listed")].join(" · ")}</p></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]"><span className={cn("inline-flex items-center gap-1.5", website.className)}><Globe2 className="h-3.5 w-3.5" aria-hidden="true" />{website.label}</span>{Number.isFinite(Number(lead.score)) && <span className="text-zinc-300">Opportunity context: {Number(lead.score)} pts</span>}<span className="text-muted-foreground">Saved {formatDate(lead.created_at)}</span></div>
    </div>
    <div className="space-y-4 p-4 sm:p-5">
      {text(lead.businessSummary || lead.socialBio) && <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300">{text(lead.businessSummary || lead.socialBio)}</p>}
      {(contact.phone || contact.email) && <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-300">{contact.phone && <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`} className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-primary"><Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />{contact.email}</a>}</div>}
      <LeadPublicDetails lead={lead} expanded={expanded} onToggle={onToggle} />
      <SavedLeadOutreachPanel lead={lead} generating={outreachGenerating} error={outreachError} onGenerate={onGenerateOutreach} onSave={onSaveOutreach} onSaveManualDm={onSaveManualDm} />
      {failed && <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3 py-2.5 text-xs text-red-200"><XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{text(lead.siteBuildError, "The last private draft build failed. Retry when you are ready.")}{hasPreviousDraft && <span className="ml-1 text-red-200/70">Your previous draft remains available.</span>}</span></div>}
      {stale && <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>This build has been waiting for more than 15 minutes. Retry to refresh the private draft.</span></div>}
      <div className="flex flex-col gap-3 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2 text-[11px]">{bundle.complete && <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Ready to go</span>}{!bundle.complete && siteState === "in_progress" && !stale && <span className="inline-flex items-center gap-1.5 text-primary"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Website build in progress</span>}{!bundle.complete && siteState === "in_progress" && stale && <span className="inline-flex items-center gap-1.5 text-amber-200"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Build needs a retry</span>}{!bundle.complete && siteState !== "in_progress" && bundle.hasAnyAsset && <span className="inline-flex items-center gap-1.5 text-amber-200"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Incomplete: {bundle.missing.slice(0, 2).join(", ")}{bundle.missing.length > 2 ? "…" : ""}</span>}{!bundle.complete && !bundle.hasAnyAsset && siteState === "needs_build" && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />No draft created yet</span>}{source && <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-accent hover:underline"><ExternalLink className="h-3 w-3" aria-hidden="true" />Open saved source</a>}</div><div className="flex flex-wrap gap-2">{preview && <Button asChild type="button" className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><a href={preview} target="_blank" rel="noopener noreferrer">Open private draft <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a></Button>}<ActionButtons state={siteState} building={building} stale={stale} onBuild={onBuild} /></div></div>
    </div>
  </motion.article>;
}

function BatchMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className="rounded-xl border border-border/80 bg-background/35 px-3 py-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span><span className={cn("text-lg font-semibold", tone)}>{value}</span></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p></div>;
}

function BatchWorkflow({ batch, visibleCount, onStart }: { batch: BatchState; visibleCount: number; onStart: () => void }) {
  const total = batch.scope.length || visibleCount;
  if (!total) return null;
  const websiteFinished = batch.siteReadyIds.length;
  const outreachFinished = batch.pitchCompletedIds.length;
  const checked = batch.processedIds.length;
  const stageLabel = batch.stage === "processing" ? "Processing each lead in order" : batch.stage === "complete" ? "Batch finished" : "Ready to run";
  const scopeChanged = batch.stage !== "idle" && batch.scope.length !== visibleCount;
  const failedSites = namesForIds(batch.scope, batch.siteFailedIds);
  const failedPitches = namesForIds(batch.scope, batch.pitchFailedIds);
  const inProgressPitches = namesForIds(batch.scope, batch.pitchInProgressIds);
  const lockedSites = namesForIds(batch.scope, batch.siteBuildingIds);
  const progress = batch.stage === "complete" ? 100 : Math.round((checked / Math.max(total, 1)) * 100);
  return <Card className="overflow-hidden border-primary/[0.18] bg-gradient-to-br from-primary/[0.08] via-card to-accent/[0.05] shadow-[0_20px_60px_rgba(0,0,0,0.16)]" aria-labelledby="saved-lead-batch-heading">
    <div className="border-b border-border/80 p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Private batch studio</div><h3 id="saved-lead-batch-heading" className="mt-2 font-display text-xl font-bold tracking-tight text-ivory sm:text-2xl">Process this visible set in order.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{batch.stage === "idle" ? `For each of the ${visibleCount} visible ${visibleCount === 1 ? "lead" : "leads"}, save the private website first, then save its pitch DM, follow-up DM, and call script before moving on.` : `${total} saved ${total === 1 ? "lead is" : "leads are"} locked to this batch. Search and filters will not add anyone while it runs.`}</p></div><div className="rounded-xl border border-primary/20 bg-primary/[0.08] px-4 py-3 text-center"><p className="text-2xl font-semibold text-primary">{total}</p><p className="text-[10px] uppercase tracking-[0.14em] text-primary/70">{batch.stage === "idle" ? "visible in scope" : "locked in scope"}</p></div></div></div>
    <div className="space-y-4 p-5 sm:p-6"><div className="grid gap-2 sm:grid-cols-3"><BatchMetric label="Private websites" value={`${websiteFinished}/${total}`} detail={`${batch.siteReadyIds.length} saved, ${batch.siteBuildingIds.length} building, ${batch.siteFailedIds.length} failed`} tone="text-emerald-300" /><BatchMetric label="Outreach packs" value={`${outreachFinished}/${total}`} detail={`${batch.pitchCompletedIds.length} saved, ${batch.pitchWorkingIds.length} writing, ${batch.pitchInProgressIds.length} waiting, ${batch.pitchFailedIds.length} failed`} tone="text-primary" /><BatchMetric label="Ready to go" value={`${batch.readyIds.length}/${total}`} detail={`${checked} checked in order, complete bundles only`} tone="text-cyan-300" /></div>{batch.stage !== "idle" && <div className="rounded-xl border border-border/80 bg-background/25 p-3" role="status" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-xs font-medium text-ivory">{batch.running && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />}{!batch.running && batch.stage === "complete" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />}{stageLabel}</span><span className="text-[11px] text-muted-foreground">{batch.stage === "processing" ? `${checked} of ${total} leads checked` : `${batch.readyIds.length} of ${total} leads are Ready to go`}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-border/70"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>}{batch.stage === "complete" && <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs leading-relaxed"><p className="font-medium text-emerald-200">Batch finished with a readiness check for every lead.</p><p className="text-zinc-300">Ready to go: <strong className="text-cyan-200">{batch.readyIds.length}</strong>. Private websites: <strong className="text-emerald-200">{batch.siteReadyIds.length} saved</strong>. Outreach packs: <strong className="text-primary">{batch.pitchCompletedIds.length} saved</strong>.</p>{lockedSites.length > 0 && <p className="text-amber-200">Still building: {lockedSites.join(", ")}. Wait for those records to finish, then retry.</p>}{failedSites.length > 0 && <p className="text-red-200">Website retries needed: {failedSites.join(", ")}.</p>}{failedPitches.length > 0 && <p className="text-red-200">Outreach retries needed: {failedPitches.join(", ")}.</p>}{inProgressPitches.length > 0 && <p className="text-amber-200">Outreach still writing: {inProgressPitches.join(", ")}. Refresh before retrying.</p>}{lockedSites.length === 0 && failedSites.length === 0 && failedPitches.length === 0 && inProgressPitches.length === 0 && <p className="text-zinc-400">Open the cards below, review the saved wording, and decide what to send or publish yourself.</p>}</div>}{scopeChanged && <p className="text-[11px] text-amber-200">The current search or filter changed after this batch started. The counts above still belong only to the original visible set.</p>}<div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-[11px] leading-relaxed text-muted-foreground">Private drafts and editable wording only. Nothing publishes, sends, calls, schedules, posts, or enrolls automatically.</p><Button type="button" onClick={onStart} disabled={batch.running || visibleCount === 0} className="h-10 shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">{batch.running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}{batch.stage === "complete" ? "Run this visible set again" : `Process ${visibleCount} ${visibleCount === 1 ? "lead" : "leads"} + save outreach`}</Button></div></div>
  </Card>;
}

export default function SavedLeadStudioWorkspace({ search, onSearchChange }: SavedLeadStudioProps = {}) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [localSearch, setLocalSearch] = useState("");
  const [filter, setFilter] = useState<StudioFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [buildingIds, setBuildingIds] = useState<Set<string>>(new Set());
  const buildingIdsRef = useRef<Set<string>>(new Set());
  const [outreachGeneratingIds, setOutreachGeneratingIds] = useState<Set<string>>(new Set());
  const outreachGeneratingIdsRef = useRef<Set<string>>(new Set());
  const [outreachErrors, setOutreachErrors] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<BatchState>(EMPTY_BATCH);
  const batchRunRef = useRef(false);
  const loadRequestRef = useRef(0);
  const [, setClock] = useState(() => Date.now());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const query = search ?? localSearch;
  const setQuery = (value: string) => onSearchChange ? onSearchChange(value) : setLocalSearch(value);

  const loadLeads = useCallback(async (showLoading = true): Promise<LeadRecord[] | null> => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    if (showLoading) setLoadState("loading");
    try {
      const response = await (Lead as any).list("-created_at", 200);
      const next = (Array.isArray(response) ? response : []).filter((lead) => lead && text(lead.id));
      if (requestId === loadRequestRef.current) {
        setLeads(next);
        setLoadError("");
        if (showLoading) setLoadState("ready");
      }
      return next;
    } catch (error) {
      console.error("[saved-lead-studio] leads_load_failed");
      setLoadError("Saved leads could not be loaded. Try again to check your records.");
      if (showLoading) setLoadState("error");
      return null;
    }
  }, []);

  useEffect(() => { void loadLeads(); }, [loadLeads]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => leads.reduce<Record<StudioFilter, number>>((result, lead) => { result[stateFor(lead)] += 1; result.all += 1; return result; }, { all: 0, needs_build: 0, in_progress: 0, ready: 0, failed: 0 }), [leads]);
  const filteredLeads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter !== "all" && stateFor(lead) !== filter) return false;
      if (!needle) return true;
      return [lead.businessName, lead.trade, lead.businessType, lead.location, lead.website, lead.email, lead.phone, lead.businessSummary, lead.socialBio, ...(Array.isArray(lead.services) ? lead.services : [])].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [filter, leads, query]);

  const updateBatchIds = (key: IdListKey, id: string, add: boolean) => {
    setBatch((current) => ({ ...current, [key]: add ? addId(current[key], id) : removeId(current[key], id) }));
  };

  type WebsiteRunResult = { status: "ready" | "failed" | "building"; message?: string };
  const runWebsiteBuild = async (leadId: string, notify = false): Promise<WebsiteRunResult> => {
    if (!leadId || buildingIdsRef.current.has(leadId)) return { status: "building", message: "A private draft build is already in progress." };
    buildingIdsRef.current.add(leadId);
    setBuildingIds((current) => new Set(current).add(leadId));
    setLeads((current) => current.map((item) => String(item.id) === leadId ? { ...item, siteBuildStatus: "building", siteBuildError: "" } : item));
    let outcome: WebsiteRunResult = { status: "failed" };
    const markLocalFailure = (message: string) => {
      setLeads((current) => current.map((item) => String(item.id) === leadId ? { ...item, siteBuildStatus: "failed", siteBuildError: message } : item));
    };
    const failureMessage = (result: Record<string, any>, fallback: string) => text(result.error) || actionErrorMessage(result, fallback);
    const resolveResult = async (result: Record<string, any>, fallback: string, thrownError?: unknown) => {
      const returnedLeadId = text(result.leadId);
      if (returnedLeadId && returnedLeadId !== leadId) {
        const message = "The private draft service returned a different saved lead. This request was not counted.";
        console.error("[saved-lead-studio] mismatched_build_response", { requestedLeadId: leadId, returnedLeadId });
        await loadLeads(false);
        markLocalFailure(message);
        return { status: "failed", message } as WebsiteRunResult;
      }
      const terminalFailure = websiteFailureSignal(result) || (thrownError ? Object.keys(result).length === 0 : false);
      const progressResponse = websiteProgressSignal(result);
      const reloaded = await loadLeads(false);
      const refreshed = reloaded?.find((item) => String(item.id) === leadId);
      if (!terminalFailure && progressResponse) return { status: "building", message: text(result.message) || "A private draft build is already in progress." };
      const successfulResponse = result.success === true && returnedLeadId === leadId;
      if (!terminalFailure && successfulResponse && isReadyRecord(refreshed)) return { status: "ready" };
      const message = text(refreshed?.siteBuildError) || failureMessage(result, successfulResponse ? "The private draft was saved, but the studio could not confirm it. Refresh and try again." : fallback);
      markLocalFailure(message);
      return { status: "failed", message } as WebsiteRunResult;
    };
    try {
      const response = await (buildHotLeadSite as any)({ leadId });
      outcome = await resolveResult(unwrapActionResponse(response), "Private draft build could not be completed.");
    } catch (error) {
      console.error("[saved-lead-studio] build_failed", { leadId });
      outcome = await resolveResult(unwrapActionResponse(error), actionErrorMessage(error, "Private draft build could not be completed."), error);
    } finally {
      buildingIdsRef.current.delete(leadId);
      setBuildingIds((current) => { const next = new Set(current); next.delete(leadId); return next; });
    }
    if (notify) {
      if (outcome.status === "ready") toast.success("Private website saved", { description: "The outreach pack still needs to be reviewed before this lead is Ready to go." });
      else if (outcome.status === "building") toast.info(outcome.message || "A private draft build is already in progress.");
      else toast.error("Private draft could not be built", { description: outcome.message || "Check the saved lead details and try again." });
    }
    return outcome;
  };

  type OutreachRunResult = { status: "saved" | "failed" | "in_progress"; message?: string };
  type LeadPipelineResult = { site: WebsiteRunResult["status"]; outreach: OutreachRunResult["status"] | "skipped"; ready: boolean; message?: string };

  const handleBuild = async (lead: LeadRecord) => {
    const leadId = text(lead.id);
    if (!leadId) return;
    await runLeadPipeline(leadId, false, true, true);
  };

  const runOutreachDraft = async (leadId: string, useQuoteSearchAngle: boolean, notify = false): Promise<OutreachRunResult> => {
    if (!leadId || outreachGeneratingIdsRef.current.has(leadId)) return { status: "in_progress", message: "Outreach drafts are already being written for this lead." };
    outreachGeneratingIdsRef.current.add(leadId);
    setOutreachGeneratingIds((current) => new Set(current).add(leadId));
    setOutreachErrors((current) => ({ ...current, [leadId]: "" }));
    let outcome: OutreachRunResult = { status: "failed" };
    const applyDraftResponse = (result: Record<string, any>) => {
      setLeads((current) => current.map((item) => {
        if (String(item.id) !== leadId) return item;
        const next = { ...item };
        if (typeof result.pitchDm === "string") next.pitchDm = result.pitchDm;
        if (typeof result.followUpDm === "string") next.followUpDm = result.followUpDm;
        if (typeof result.coldCallPitch === "string") next.coldCallPitch = result.coldCallPitch;
        if (typeof result.pitchDmEdited === "boolean") next.pitchDmEdited = result.pitchDmEdited;
        if (typeof result.followUpDmEdited === "boolean") next.followUpDmEdited = result.followUpDmEdited;
        if (typeof result.coldCallPitchEdited === "boolean") next.coldCallPitchEdited = result.coldCallPitchEdited;
        if (typeof result.readyToGo === "boolean") next.readyToGo = result.readyToGo;
        if (typeof result.outreachVersion === "string" && result.outreachVersion.trim()) next.outreachVersion = result.outreachVersion;
        return next;
      }));
    };
    const mismatchMessage = "The outreach service returned a different saved lead. This request was not counted.";
    try {
      const response = await (generateSavedLeadOutreach as any)({ leadId, useQuoteSearchAngle });
      const result = unwrapActionResponse(response);
      const returnedLeadId = text(result.leadId);
      if (returnedLeadId && returnedLeadId !== leadId) {
        console.error("[saved-lead-studio] mismatched_outreach_response", { requestedLeadId: leadId, returnedLeadId });
        outcome = { status: "failed", message: mismatchMessage };
        setOutreachErrors((current) => ({ ...current, [leadId]: mismatchMessage }));
      } else if (result.success === true && returnedLeadId !== leadId) {
        outcome = { status: "failed", message: mismatchMessage };
        setOutreachErrors((current) => ({ ...current, [leadId]: mismatchMessage }));
      } else {
        const responseConfirmed = result.success === true && returnedLeadId === leadId;
        const responseHasDrafts = responseConfirmed && hasOutreachDrafts(result);
        const reloaded = await loadLeads(false);
        const refreshed = reloaded?.find((item) => String(item.id) === leadId);
        const refreshedHasDrafts = hasOutreachDrafts(refreshed);
        if (responseConfirmed) applyDraftResponse(result);
        if (responseConfirmed && (responseHasDrafts || refreshedHasDrafts)) {
          outcome = { status: "saved" };
        } else {
          const message = text(result.error) || actionErrorMessage(result, "The drafts could not be generated. Check the saved lead and try again.");
          outcome = { status: "failed", message };
          setOutreachErrors((current) => ({ ...current, [leadId]: message }));
        }
      }
    } catch (error) {
      console.error("[saved-lead-studio] outreach_generation_failed", { leadId });
      const result = unwrapActionResponse(error);
      const returnedLeadId = text(result.leadId);
      const message = returnedLeadId && returnedLeadId !== leadId ? mismatchMessage : text(result.error) || actionErrorMessage(error, "The drafts could not be generated. Check the saved lead and try again.");
      outcome = { status: "failed", message };
      setOutreachErrors((current) => ({ ...current, [leadId]: message }));
    } finally {
      outreachGeneratingIdsRef.current.delete(leadId);
      setOutreachGeneratingIds((current) => { const next = new Set(current); next.delete(leadId); return next; });
    }
    if (notify) {
      if (outcome.status === "saved") toast.success("Outreach pack saved", { description: "Review, edit, and copy the pitch, follow-up, and call script yourself." });
      else if (outcome.status === "in_progress") toast.info(outcome.message || "Outreach drafts are already being written for this lead.");
      else toast.error("Outreach pack could not be generated", { description: outcome.message || "Check the saved lead and try again." });
    }
    return outcome;
  };

  const runLeadPipeline = async (leadId: string, useQuoteSearchAngle = false, notify = false, forceSite = false, onOutreachStart?: () => void): Promise<LeadPipelineResult> => {
    const fallbackLead = leads.find((item) => String(item.id) === leadId);
    const loaded = await loadLeads(false);
    const lead = loaded?.find((item) => String(item.id) === leadId) || fallbackLead;
    const announce = (result: LeadPipelineResult) => {
      if (!notify) return result;
      if (result.ready) toast.success("Lead is ready to go", { description: "The private site and complete outreach pack are saved for your review." });
      else if (result.site === "building") toast.info(result.message || "The private website is still building. Outreach will wait until it is saved.");
      else if (result.site === "failed") toast.error("Private website could not be completed", { description: result.message || "Retry this saved lead when you are ready." });
      else if (result.outreach === "in_progress") toast.info(result.message || "Outreach drafts are already being written for this lead.");
      else if (result.outreach === "failed") toast.error("Outreach pack could not be completed", { description: result.message || "The private website remains saved. Retry the outreach pack." });
      else toast.info("Lead still needs review", { description: result.message || "Open the card to see which saved asset is missing." });
      return result;
    };
    if (!lead) return announce({ site: "failed", outreach: "skipped", ready: false, message: "This saved lead could not be found. Refresh the studio and try again." });

    const initialBundle = diagnoseBundleCompleteness(lead);
    if (initialBundle.complete && !forceSite) return announce({ site: "ready", outreach: "saved", ready: true });
    if (!forceSite && isActiveBuild(lead)) return announce({ site: "building", outreach: "skipped", ready: false, message: "A private draft build is already in progress for this saved lead." });

    const siteResult = !forceSite && isReadyRecord(lead) ? { status: "ready" as const } : await runWebsiteBuild(leadId, false);
    if (siteResult.status !== "ready") return announce({ site: siteResult.status, outreach: "skipped", ready: false, message: siteResult.message || "The private website must finish before outreach can be written." });

    const afterSiteRecords = await loadLeads(false);
    const afterSite = afterSiteRecords?.find((item) => String(item.id) === leadId);
    if (!isReadyRecord(afterSite)) return announce({ site: "failed", outreach: "skipped", ready: false, message: "The private website response was not confirmed on this saved lead, so outreach was not started." });

    onOutreachStart?.();
    const outreachResult = await runOutreachDraft(leadId, useQuoteSearchAngle, false);
    const afterOutreachRecords = await loadLeads(false);
    const finalLead = afterOutreachRecords?.find((item) => String(item.id) === leadId) || afterSite;
    const finalBundle = diagnoseBundleCompleteness(finalLead || {});
    const missingMessage = finalBundle.complete ? "" : `Still missing: ${finalBundle.missing.slice(0, 3).join(", ")}.`;
    return announce({ site: "ready", outreach: outreachResult.status, ready: finalBundle.complete, message: outreachResult.message || missingMessage });
  };

  const handleGenerateOutreach = async (lead: LeadRecord, useQuoteSearchAngle: boolean) => {
    const leadId = text(lead.id);
    if (leadId) await runOutreachDraft(leadId, useQuoteSearchAngle, true);
  };

  const handleSaveOutreach = async (leadId: string, field: "pitchDm" | "followUpDm" | "coldCallPitch", value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue) throw new Error("Outreach wording cannot be empty.");
    const editFlag = { pitchDm: "pitchDmEdited", followUpDm: "followUpDmEdited", coldCallPitch: "coldCallPitchEdited" }[field];
    await (Lead as any).update(leadId, { [field]: cleanValue, [editFlag]: true });
    setLeads((current) => current.map((item) => String(item.id) === leadId ? { ...item, [field]: cleanValue, [editFlag]: true } : item));
    toast.success(field === "pitchDm" ? "Pitch DM saved" : field === "followUpDm" ? "Follow-up DM saved" : "Cold-call script saved", { description: "Your wording will be kept during regeneration." });
  };

  const handleSaveManualDm = async (leadId: string, value: ManualDmValue) => {
    const cleanPreviewUrl = safeHttpUrl(value.previewUrl);
    if (value.previewUrl.trim() && !cleanPreviewUrl) throw new Error("Use a complete HTTP or HTTPS preview link, or leave it blank.");
    const cleanPitchDm = value.pitchDm.trim();
    if (!cleanPitchDm) throw new Error("Add wording before saving the manual DM.");
    await (Lead as any).update(leadId, { previewUrl: cleanPreviewUrl, pitchDm: cleanPitchDm, pitchDmEdited: true });
    setLeads((current) => current.map((item) => String(item.id) === leadId ? { ...item, previewUrl: cleanPreviewUrl, pitchDm: cleanPitchDm, pitchDmEdited: true } : item));
    toast.success("Manual DM saved", { description: "The preview link and wording are ready for your review." });
  };

  const startBatch = async () => {
    if (batchRunRef.current || batch.running || loadState !== "ready" || filteredLeads.length === 0) return;
    const count = filteredLeads.length;
    const confirmed = window.confirm(`Process the ${count} visible ${count === 1 ? "lead" : "leads"} one at a time?\n\nEach lead will finish its private website, pitch DM, follow-up DM, and call script before the next lead starts. These stay private and review-only. Nothing will publish, send, call, schedule, post, or enroll automatically.`);
    if (!confirmed) return;
    batchRunRef.current = true;
    const scope = filteredLeads.map((lead) => ({ id: String(lead.id), name: text(lead.businessName, "Unnamed saved business") }));
    setOutreachErrors({});
    setBatch({ ...EMPTY_BATCH, stage: "processing", running: true, scope });

    const settleLead = (leadId: string, result: LeadPipelineResult) => {
      updateBatchIds("processedIds", leadId, true);
      updateBatchIds("pitchWorkingIds", leadId, false);
      if (result.site === "ready") {
        updateBatchIds("siteCompletedIds", leadId, true);
        updateBatchIds("siteReadyIds", leadId, true);
        updateBatchIds("siteFailedIds", leadId, false);
        updateBatchIds("siteBuildingIds", leadId, false);
      } else if (result.site === "failed") {
        updateBatchIds("siteCompletedIds", leadId, true);
        updateBatchIds("siteReadyIds", leadId, false);
        updateBatchIds("siteFailedIds", leadId, true);
        updateBatchIds("siteBuildingIds", leadId, false);
      } else {
        updateBatchIds("siteBuildingIds", leadId, true);
      }
      if (result.outreach === "saved") {
        updateBatchIds("pitchCompletedIds", leadId, true);
        updateBatchIds("pitchFailedIds", leadId, false);
        updateBatchIds("pitchInProgressIds", leadId, false);
      } else if (result.outreach === "failed") {
        updateBatchIds("pitchFailedIds", leadId, true);
        updateBatchIds("pitchInProgressIds", leadId, false);
      } else if (result.outreach === "in_progress") {
        updateBatchIds("pitchInProgressIds", leadId, true);
      }
      updateBatchIds("readyIds", leadId, result.ready);
    };

    try {
      for (const item of scope) {
        const leadId = item.id;
        const currentRecords = await loadLeads(false);
        const currentLead = currentRecords?.find((lead) => String(lead.id) === leadId) || filteredLeads.find((lead) => String(lead.id) === leadId);
        let result: LeadPipelineResult;
        if (!currentLead) {
          result = { site: "failed", outreach: "skipped", ready: false, message: "This saved lead could not be found." };
        } else if (diagnoseBundleCompleteness(currentLead).complete) {
          result = { site: "ready", outreach: "saved", ready: true };
        } else if (buildingIdsRef.current.has(leadId) || isActiveBuild(currentLead)) {
          result = { site: "building", outreach: "skipped", ready: false, message: "A private draft build is already in progress for this saved lead." };
        } else {
          updateBatchIds("siteBuildingIds", leadId, true);
          try {
            result = await runLeadPipeline(leadId, false, false, false, () => updateBatchIds("pitchWorkingIds", leadId, true));
          } catch (error) {
            console.error("[saved-lead-studio] lead_pipeline_failed", { leadId, error });
            result = { site: "failed", outreach: "skipped", ready: false, message: "This lead could not be completed. Retry it from the card below." };
          }
        }
        settleLead(leadId, result);
      }
      const finalRecords = await loadLeads(false);
      const finalReadyIds = finalRecords ? scope.filter(({ id }) => diagnoseBundleCompleteness(finalRecords.find((lead) => String(lead.id) === id) || {}).complete).map(({ id }) => id) : null;
      setBatch((current) => ({ ...current, stage: "complete", running: false, readyIds: finalReadyIds || current.readyIds }));
      toast.success("Saved lead batch finished", { description: finalReadyIds ? `${finalReadyIds.length} of ${scope.length} leads are Ready to go. Review any incomplete records before sending or publishing.` : "Every lead was checked in order. Review the saved cards for any incomplete records." });
    } catch (error) {
      console.error("[saved-lead-studio] batch_failed", error);
      setBatch((current) => ({ ...current, stage: "complete", running: false }));
      toast.error("The batch stopped early", { description: "Completed drafts remain saved. Check the cards below and retry the remaining items." });
    } finally {
      batchRunRef.current = false;
      setBatch((current) => ({ ...current, running: false }));
    }
  };

  const filterOptions: StudioFilter[] = ["all", "needs_build", "in_progress", "ready", "failed"];
  return <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <Card className="overflow-hidden border-primary/[0.18] bg-gradient-to-br from-primary/[0.08] via-card to-accent/[0.05] shadow-[0_20px_60px_rgba(0,0,0,0.18)]"><div className="p-5 sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Saved research, ready to shape</div><h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ivory sm:text-3xl">Build from the leads you chose.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Lead Finder search → Save lead → open this studio → build a private website draft or prepare manual outreach. Saving a lead never creates a site or sends a message automatically. Drafts stay private until you review them.</p></div><div className="grid grid-cols-3 gap-2 sm:gap-3"><div className="rounded-xl border border-border/80 bg-background/40 px-3 py-2.5 text-center"><p className="text-lg font-semibold text-ivory">{counts.all}</p><p className="text-[10px] text-muted-foreground">Saved</p></div><div className="rounded-xl border border-border/80 bg-background/40 px-3 py-2.5 text-center"><p className="text-lg font-semibold text-primary">{counts.needs_build}</p><p className="text-[10px] text-muted-foreground">Needs finishing</p></div><div className="rounded-xl border border-border/80 bg-background/40 px-3 py-2.5 text-center"><p className="text-lg font-semibold text-emerald-300">{counts.ready}</p><p className="text-[10px] text-muted-foreground">Ready to go</p></div></div></div></div></Card>
    <LeadDataSyncAction className="border-primary/25 bg-gradient-to-r from-primary/[0.06] via-card to-accent/[0.04]" onCompleted={async () => { await loadLeads(false); }} />
    <section aria-label="Saved lead website drafts"><div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative min-w-0 flex-1 xl:max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved businesses, industries, markets…" aria-label="Search saved leads" className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20" /></div><div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter saved leads">{filterOptions.map((option) => <button key={option} type="button" role="tab" aria-selected={filter === option} onClick={() => setFilter(option)} className={cn("rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors", filter === option ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-ivory")}>{filterLabel(option)} <span className="ml-1 opacity-70">{counts[option]}</span></button>)}</div></div><BatchWorkflow batch={batch} visibleCount={filteredLeads.length} onStart={() => void startBatch()} />
      {loadState === "loading" && <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" aria-hidden="true" />Loading saved leads…</div>}
      {loadState === "error" && <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-6 py-16 text-center"><AlertTriangle className="h-6 w-6 text-red-300" aria-hidden="true" /><p className="mt-3 text-sm text-red-200">{loadError}</p><Button type="button" variant="outline" onClick={() => void loadLeads()} className="mt-5 gap-2 border-border bg-secondary text-foreground"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Try again</Button></div>}
      {loadState === "ready" && filteredLeads.length === 0 && <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"><FolderOpen className="h-7 w-7 text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold text-ivory">{leads.length ? "No saved leads match this view" : "Your saved lead studio is empty"}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{leads.length ? "Clear the search or choose another build status." : "Save a business in Lead Finder first. It will appear here without creating a website."}</p></div>}
      {loadState === "ready" && filteredLeads.length > 0 && <AnimatePresence mode="popLayout"><div className="mt-5 grid gap-4 xl:grid-cols-2">{filteredLeads.map((lead) => { const id = String(lead.id); return <SavedLeadCard key={id} lead={lead} expanded={expandedIds.has(id)} building={buildingIds.has(id)} outreachGenerating={outreachGeneratingIds.has(id)} outreachError={outreachErrors[id] || ""} onToggle={() => setExpandedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} onBuild={() => void handleBuild(lead)} onGenerateOutreach={(useQuoteSearchAngle) => void handleGenerateOutreach(lead, useQuoteSearchAngle)} onSaveOutreach={(field, value) => handleSaveOutreach(id, field, value)} onSaveManualDm={(value) => handleSaveManualDm(id, value)} />; })}</div></AnimatePresence>}
    </section>
  </div>;
}

```

## src/components/hub/SavedLeadOutreachPanel.tsx

```tsx
import { useState } from "react";
import { ChevronDown, ExternalLink, Loader2, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ManualOutreachDm } from "@/components/hub/ManualOutreachDm";
import { OutreachAssetEditor } from "@/components/hub/OutreachAssetEditor";
import { publicOwnerFor } from "@/components/hub/LeadPublicDetails";
import { cn } from "@/lib/utils";

type LeadRecord = Record<string, any>;
type OutreachField = "pitchDm" | "followUpDm" | "coldCallPitch";
type ManualDmValue = { previewUrl: string; pitchDm: string };

type SavedLeadOutreachPanelProps = {
  lead: LeadRecord;
  generating: boolean;
  error?: string;
  onGenerate: (useQuoteSearchAngle: boolean) => void | Promise<void>;
  onSave: (field: OutreachField, value: string) => void | Promise<void>;
  onSaveManualDm: (value: ManualDmValue) => void | Promise<void>;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}

export function SavedLeadOutreachPanel({ lead, generating, error, onGenerate, onSave, onSaveManualDm }: SavedLeadOutreachPanelProps) {
  const [open, setOpen] = useState(Boolean(text(lead.pitchDm) || text(lead.followUpDm) || text(lead.coldCallPitch) || text(lead.previewUrl) || text(lead.source) === "manual"));
  const [useQuoteSearchAngle, setUseQuoteSearchAngle] = useState(false);
  const name = text(lead.businessName, "this saved business");
  const hasDrafts = Boolean(text(lead.pitchDm) || text(lead.followUpDm) || text(lead.coldCallPitch) || text(lead.previewUrl));
  const owner = publicOwnerFor(lead);
  const ownerSource = owner ? safeHttpUrl(owner.sourceUrl) : "";

  return <section className="rounded-2xl border border-[#BAFB3A]/15 bg-gradient-to-br from-[#BAFB3A]/[0.06] via-zinc-950/70 to-cyan-500/[0.04]" aria-label={`Manual outreach drafts for ${name}`} onClick={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BAFB3A]/70 focus-visible:ring-inset">
      <span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#BAFB3A]"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />Manual outreach drafts{hasDrafts && <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0 text-[10px] normal-case tracking-normal text-emerald-300">Saved</Badge>}</span><span className="mt-1 block text-xs text-zinc-400">Keep it in your words, copy it, and send it yourself.</span></span><ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open && "rotate-180 text-[#BAFB3A]")} aria-hidden="true" />
    </button>
    {open && <div className="space-y-3 border-t border-white/10 p-4 pt-3">
      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3 text-xs leading-relaxed text-zinc-400"><p className="font-medium text-zinc-200">You stay in control</p><p className="mt-1">The message uses saved details as a starting point, so you can make it sound like you. Nothing sends, calls, posts, or schedules automatically.</p></div>
      {owner && <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-zinc-300"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" /><span><strong className="font-medium text-zinc-100">Public decision-maker context:</strong> {owner.name}, {owner.role}. This name and role came from the saved public research.{ownerSource && <a href={ownerSource} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-200">View source <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>}</span></div>}
      <ManualOutreachDm lead={lead} disabled={generating} onSave={onSaveManualDm} />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 transition-colors hover:border-amber-400/40"><input type="checkbox" checked={useQuoteSearchAngle} onChange={(event) => setUseQuoteSearchAngle(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-300" /><span><span className="block text-sm font-medium text-amber-100">Use genuine quote-search angle</span><span className="mt-1 block text-[11px] leading-relaxed text-amber-100/65">Turn this on only when you genuinely looked for this business’s website or a quote before contacting them. Leave it off for a transparent public-research opener.</span></span></label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-relaxed text-zinc-500">Regeneration keeps any draft you have manually edited.</p><Button type="button" onClick={() => void onGenerate(useQuoteSearchAngle)} disabled={generating} className="h-9 gap-2 bg-[#BAFB3A] text-black hover:bg-[#BAFB3A]/90">{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}{generating ? "Writing drafts" : hasDrafts ? "Regenerate outreach pack" : "Generate outreach pack"}</Button></div>
      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs leading-relaxed text-red-200" role="alert">{error}</p>}
      {(hasDrafts || generating) && <div className="space-y-3 border-t border-white/10 pt-3"><OutreachAssetEditor label="Pitch DM" description="A casual first message with a clear reason to reach out and an easy next step." value={lead.pitchDm} placeholder="Generate a saved-lead DM, then edit it to sound like you." copyLabel="Copy DM" canEdit={!generating} rows={7} tone="lime" onSave={(value) => onSave("pitchDm", value)} /><OutreachAssetEditor label="Follow-up DM" description="A short second message that checks whether they saw the private preview." value={lead.followUpDm} placeholder="Generate the outreach pack, then edit the follow-up to sound like you." copyLabel="Copy follow-up" canEdit={!generating} rows={6} tone="cyan" onSave={(value) => onSave("followUpDm", value)} /><OutreachAssetEditor label="Cold-call script" description="A permission-based 20 to 40 second opener for a natural first call." value={lead.coldCallPitch} placeholder="Generate a saved-lead call opener, then edit it to sound natural aloud." copyLabel="Copy call script" canEdit={!generating} rows={8} tone="amber" onSave={(value) => onSave("coldCallPitch", value)} /></div>}
    </div>}
  </section>;
}

export default SavedLeadOutreachPanel;

```

## src/components/hub/ManualOutreachDm.tsx

```tsx
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Link2, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publicOwnerFor } from "@/components/hub/LeadPublicDetails";
import { cn } from "@/lib/utils";

type LeadRecord = Record<string, any>;
type Feedback = { tone: "success" | "error" | "info"; message: string };

type ManualDmValue = {
  previewUrl: string;
  pitchDm: string;
};

type ManualOutreachDmProps = {
  lead: LeadRecord;
  disabled?: boolean;
  onSave: (value: ManualDmValue) => void | Promise<void>;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password ? url.toString() : "";
  } catch {
    return "";
  }
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there";
}

function mentionsPreview(value: string) {
  return /\b(preview|private (?:website|site) draft|website draft|link below|(?:take|have) a look|(?:put|built|knocked) together .*\b(?:website|site)\b)\b/i.test(value);
}

function isTradeLead(value: string) {
  return /\b(?:trad(?:e|ie|ies)|concret(?:e|er|ing)|builder|building|carpenter|carpentry|plumb(?:er|ing)|electric(?:ian|al)|landscap(?:er|ing)|painter|painting|roof(?:er|ing)|til(?:er|ing)|bricklay(?:er|ing)|render(?:er|ing)|welder|welding|fenc(?:er|ing)|excavat(?:or|ing)|earthworks?|demolition|handyman|hvac|air ?conditioning|glazier|solar|pool (?:builder|service)|pest control|joiner|cabinet maker|flooring|waterproof(?:er|ing)?)\b/i.test(value);
}

function buildTemplate({ recipientName, businessName, trade, location, senderName, previewUrl }: { recipientName: string; businessName: string; trade: string; location: string; senderName: string; previewUrl: string }) {
  const business = businessName || "your business";
  const place = location ? ` in ${location}` : "";
  const sender = senderName || "Heath";
  const audience = isTradeLead(trade) ? "tradies" : "businesses";
  const greeting = recipientName ? `Hey ${firstName(recipientName)},` : "Hey mate,";
  const identity = `${sender} here. I’m a concreter, been on the tools for 11 years, and I also build websites for ${audience}.`;
  const close = `\n\nCheers,\n${sender}`;

  if (previewUrl) {
    return `${greeting}\n\n${identity}\n\nYou’re probably flat out, so I’ll keep it short.\n\nI knocked together a quick website preview for ${business}${place}:\n${previewUrl}\n\nHave a look when you get a sec. If you reckon it’s worth a chat, flick me a message. If not, no dramas.${close}`;
  }

  return `${greeting}\n\n${identity}\n\nYou’re probably flat out, so I’ll keep it short.\n\nI’ve got a quick idea for the website at ${business}${place}. If you reckon it’s worth a chat, flick me a message. If not, no dramas.${close}`;
}

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Try the older browser path below when clipboard permissions reject the first attempt.
    }
  }
  if (typeof document === "undefined") throw new Error("Clipboard access was unavailable");
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "true");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(helper);
  if (!copied) throw new Error("Clipboard access was unavailable");
}

function inputClass() {
  return "h-9 border-white/10 bg-zinc-950/70 text-xs text-zinc-100 placeholder:text-zinc-600";
}

export function ManualOutreachDm({ lead, disabled = false, onSave }: ManualOutreachDmProps) {
  const publicOwner = publicOwnerFor(lead);
  const leadId = text(lead.id, "lead").replace(/[^a-z0-9_-]/gi, "-");
  const initialRecipient = text(lead.recipientName || lead.contactName) || publicOwner?.name || "";
  const initialBusiness = text(lead.businessName);
  const initialTrade = text(lead.trade || lead.businessType);
  const initialLocation = text(lead.location);
  const initialSender = text(lead.senderName || lead.operatorName, "Heath");
  const initialPreview = text(lead.previewUrl);

  const [previewInput, setPreviewInput] = useState(initialPreview);
  const [recipientName, setRecipientName] = useState(initialRecipient);
  const [businessName, setBusinessName] = useState(initialBusiness);
  const [trade, setTrade] = useState(initialTrade);
  const [location, setLocation] = useState(initialLocation);
  const [senderName, setSenderName] = useState(initialSender);
  const [draft, setDraft] = useState(() => text(lead.pitchDm) || buildTemplate({ recipientName: initialRecipient, businessName: initialBusiness, trade: initialTrade, location: initialLocation, senderName: initialSender, previewUrl: safeHttpUrl(initialPreview) }));
  const previewReplacementRef = useRef({ raw: initialPreview.trim(), safe: safeHttpUrl(initialPreview) });
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const nextPreview = text(lead.previewUrl);
    const nextRecipient = text(lead.recipientName || lead.contactName) || publicOwnerFor(lead)?.name || "";
    const nextBusiness = text(lead.businessName);
    const nextTrade = text(lead.trade || lead.businessType);
    const nextLocation = text(lead.location);
    const nextSender = text(lead.senderName || lead.operatorName, "Heath");
    previewReplacementRef.current = { raw: nextPreview.trim(), safe: safeHttpUrl(nextPreview) };
    setPreviewInput(nextPreview);
    setRecipientName(nextRecipient);
    setBusinessName(nextBusiness);
    setTrade(nextTrade);
    setLocation(nextLocation);
    setSenderName(nextSender);
    setDraft(text(lead.pitchDm) || buildTemplate({ recipientName: nextRecipient, businessName: nextBusiness, trade: nextTrade, location: nextLocation, senderName: nextSender, previewUrl: safeHttpUrl(nextPreview) }));
    setFeedback(null);
  }, [lead.id, lead.pitchDm, lead.previewUrl]);

  const previewUrl = safeHttpUrl(previewInput);
  const invalidPreview = Boolean(previewInput.trim() && !previewUrl);
  const cleanDraft = draft.trim();
  const hasPreviewPromise = mentionsPreview(cleanDraft);
  const exactPreviewInDraft = Boolean(previewUrl && (cleanDraft.includes(previewUrl) || cleanDraft.includes(previewInput.trim())));
  const draftWarning = invalidPreview
    ? "Use a complete http:// or https:// preview link without a username or password."
    : hasPreviewPromise && !previewUrl
      ? "This draft mentions a preview, but no valid link is saved. Add the real link or remove that promise."
      : hasPreviewPromise && !exactPreviewInDraft
        ? "This draft mentions a preview but does not include the exact link above. Use the template or add it before copying."
        : "";

  const validateDraft = () => {
    if (invalidPreview) {
      setFeedback({ tone: "error", message: "Fix the preview link before saving or copying." });
      return false;
    }
    if (!cleanDraft) {
      setFeedback({ tone: "error", message: "Add a message before saving or copying." });
      return false;
    }
    if (draftWarning) {
      setFeedback({ tone: "error", message: draftWarning });
      return false;
    }
    return true;
  };

  const handlePreviewChange = (nextValue: string) => {
    const previous = previewReplacementRef.current;
    const nextUrl = safeHttpUrl(nextValue);
    setPreviewInput(nextValue);
    if (nextUrl) {
      setDraft((current) => Array.from(new Set([previous.safe, previous.raw].filter(Boolean))).reduce((result, oldValue) => oldValue === nextUrl ? result : result.split(oldValue).join(nextUrl), current));
      previewReplacementRef.current = { raw: nextValue.trim(), safe: nextUrl };
    }
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!validateDraft()) return;
    setSaving(true);
    setFeedback(null);
    try {
      await onSave({ previewUrl, pitchDm: cleanDraft });
      setFeedback({ tone: "success", message: "Manual DM saved. Your wording will stay protected." });
    } catch (error) {
      console.error("[manual-outreach-dm] save_failed", error);
      setFeedback({ tone: "error", message: error instanceof Error && error.message ? error.message : "Could not save this DM. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!validateDraft()) return;
    setCopying(true);
    setFeedback(null);
    try {
      await copyText(cleanDraft);
      setFeedback({ tone: "success", message: "DM copied. Review the recipient and send it yourself." });
    } catch (error) {
      console.error("[manual-outreach-dm] copy_failed", error);
      setFeedback({ tone: "error", message: "Copy was blocked. Select the wording and copy it manually." });
    } finally {
      setCopying(false);
    }
  };

  const handleUseTemplate = () => {
    const nextPreview = safeHttpUrl(previewInput);
    previewReplacementRef.current = { raw: previewInput.trim(), safe: nextPreview };
    setDraft(buildTemplate({ recipientName, businessName, trade, location, senderName, previewUrl: nextPreview }));
    setFeedback({ tone: "info", message: nextPreview ? "Template refreshed with the current preview link." : "Template refreshed without a preview promise." });
  };

  return <div className="rounded-xl border border-[#BAFB3A]/20 bg-zinc-950/45 p-3.5" aria-label="Reusable manual outreach DM">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-[#BAFB3A]">Manual DM draft</h4><Badge variant="outline" className="border-[#BAFB3A]/25 bg-[#BAFB3A]/[0.06] px-1.5 py-0 text-[10px] text-[#BAFB3A]">Manual draft</Badge></div><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">A quick opener you can tweak before sending. Nothing goes out automatically.</p></div><Sparkles className="hidden h-4 w-4 shrink-0 text-[#BAFB3A]/70 sm:block" aria-hidden="true" /></div>

    <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3">
      <label htmlFor={`${leadId}-preview`} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />Website preview link <span className="font-normal normal-case tracking-normal text-zinc-500">optional</span></label>
      <Input id={`${leadId}-preview`} value={previewInput} onChange={(event) => handlePreviewChange(event.target.value)} disabled={disabled || saving} placeholder="https://private-preview-link.example" className={cn("mt-2", inputClass(), invalidPreview && "border-red-400/60 focus-visible:ring-red-400/30")} aria-describedby={`${leadId}-preview-note`} />
      <p id={`${leadId}-preview-note`} className={cn("mt-1.5 text-[11px] leading-relaxed", invalidPreview ? "text-red-300" : "text-zinc-500")}>{invalidPreview ? "Use a safe HTTP or HTTPS URL. The message will not copy while this is invalid." : "Only mention this link when you personally created it for this business. A new valid link replaces the matching link in your draft without resetting your wording. Nothing sends from here."}</p>
      {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-start gap-1.5 break-all text-[11px] text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-200"><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{previewUrl}</a>}
    </div>

    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="space-y-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Recipient / owner name</span><Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} disabled={disabled || saving} placeholder="Optional" className={inputClass()} /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Business name</span><Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} disabled={disabled || saving} placeholder="This business" className={inputClass()} /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Trade / industry</span><Input value={trade} onChange={(event) => setTrade(event.target.value)} disabled={disabled || saving} placeholder="Optional" className={inputClass()} /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Location</span><Input value={location} onChange={(event) => setLocation(event.target.value)} disabled={disabled || saving} placeholder="Optional" className={inputClass()} /></label>
      <label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Your name</span><Input value={senderName} onChange={(event) => setSenderName(event.target.value)} disabled={disabled || saving} placeholder="Heath" className={inputClass()} /></label>
    </div>

    <label htmlFor={`${leadId}-dm`} className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Editable message</label>
    <Textarea id={`${leadId}-dm`} value={draft} onChange={(event) => { setDraft(event.target.value); setFeedback(null); }} disabled={disabled || saving} rows={8} placeholder="Start with the template, then make it sound like you." className={cn("mt-1.5 resize-y border-white/10 bg-zinc-950/80 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600", draftWarning && "border-amber-400/40")} aria-describedby={`${leadId}-dm-note`} />
    <div id={`${leadId}-dm-note`} className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" aria-hidden="true" /><span>Keep it honest and easy to answer. Only use facts you actually know, and don’t imply a past conversation or promise a result.{draftWarning && <strong className="ml-1 font-medium text-amber-200">{draftWarning}</strong>}</span></div>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={handleUseTemplate} disabled={disabled || saving} variant="outline" className="h-8 gap-1.5 border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Use template</Button>
      <Button type="button" size="sm" onClick={() => void handleSave()} disabled={disabled || saving || copying} className="h-8 gap-1.5 bg-[#BAFB3A] text-black hover:bg-[#BAFB3A]/90"><Save className="h-3.5 w-3.5" aria-hidden="true" />{saving ? "Saving DM" : "Save DM"}</Button>
      <Button type="button" size="sm" onClick={() => void handleCopy()} disabled={disabled || saving || copying} variant="outline" className="h-8 gap-1.5 border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">{copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}{copying ? "Copying" : "Copy DM"}</Button>
      {feedback && <span className={cn("inline-flex items-center gap-1.5 text-xs", feedback.tone === "success" ? "text-emerald-300" : feedback.tone === "error" ? "text-red-300" : "text-cyan-300")} role="status" aria-live="polite">{feedback.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : feedback.tone === "error" ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}{feedback.message}</span>}
    </div>
  </div>;
}

export default ManualOutreachDm;

```

## src/components/hub/OutreachAssetEditor.tsx

```tsx
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Feedback = {
  tone: "success" | "error";
  message: string;
};

type OutreachAssetEditorProps = {
  label: string;
  description: string;
  value?: string | null;
  placeholder: string;
  copyLabel: string;
  canEdit: boolean;
  rows: number;
  tone: "lime" | "cyan" | "amber";
  onSave: (value: string) => void | Promise<void>;
};

const TONE_STYLES = {
  lime: {
    label: "text-[#BAFB3A]",
    button: "bg-[#BAFB3A] text-black hover:bg-[#BAFB3A]/90",
  },
  cyan: {
    label: "text-cyan-300",
    button: "bg-cyan-300 text-zinc-950 hover:bg-cyan-200",
  },
  amber: {
    label: "text-amber-300",
    button: "bg-amber-300 text-zinc-950 hover:bg-amber-200",
  },
} as const;

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "true");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(helper);
  if (!copied) throw new Error("Clipboard access was unavailable");
}

export function OutreachAssetEditor({
  label,
  description,
  value,
  placeholder,
  copyLabel,
  canEdit,
  rows,
  tone,
  onSave,
}: OutreachAssetEditorProps) {
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const styles = TONE_STYLES[tone];
  const hasDraft = draft.trim().length > 0;

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const handleSave = async () => {
    if (!hasDraft) {
      setFeedback({ tone: "error", message: "Add wording before saving." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await onSave(draft);
      setFeedback({ tone: "success", message: `${label} saved.` });
    } catch (error) {
      console.error(`Failed to save ${label}`, error);
      setFeedback({ tone: "error", message: "Could not save this wording. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!hasDraft) return;
    setCopying(true);
    setFeedback(null);
    try {
      await copyText(draft);
      setFeedback({ tone: "success", message: `${label} copied to your clipboard.` });
    } catch (error) {
      console.error(`Failed to copy ${label}`, error);
      setFeedback({ tone: "error", message: "Copy was blocked. Select the wording and copy it manually." });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <h4 className={cn("text-sm font-semibold", styles.label)}>{label}</h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{description}</p>
        </div>
        {hasDraft && <span className="shrink-0 text-[11px] text-zinc-600">{draft.length.toLocaleString()} characters</span>}
      </div>
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={!canEdit || saving}
        rows={rows}
        placeholder={placeholder}
        className="mt-3 resize-y border-white/10 bg-zinc-950/70 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600"
        aria-label={`Editable ${label.toLowerCase()}`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!hasDraft || saving || !canEdit}
          className={cn("h-8", styles.button)}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          disabled={!hasDraft || copying}
          className="h-8 border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
        >
          {copying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
          {copyLabel}
        </Button>
        {feedback && (
          <span className={cn("inline-flex items-center gap-1.5 text-xs", feedback.tone === "success" ? "text-emerald-300" : "text-red-300")} role="status" aria-live="polite">
            {feedback.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  );
}

export default OutreachAssetEditor;

```
