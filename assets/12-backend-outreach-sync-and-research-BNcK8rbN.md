# Central Hub Source Export, Part 12: Backend Outreach, Sync, and Research

This documentation-only export contains the complete current source for backend saved-lead outreach drafting, Data Management lead sync, social profile import, and business image research functions.

## Manifest

1. `functions/generate-saved-lead-outreach.ts`, the authenticated saved-lead outreach draft generator
2. `functions/sync-leads-from-data-management.ts`, the authenticated missing-leads synchronization function
3. `functions/import-social-profile.ts`, the authenticated social profile and website research importer
4. `functions/search-business-images.ts`, the authenticated public business image research function

Application behavior is unchanged. The complete current source for each listed function follows in the required order.

## `functions/generate-saved-lead-outreach.ts`

```ts
import { createSuperdevClient } from "npm:@superdevhq/client@0.1.56";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "nvidia/nemotron-3.5-lightning:free";
const OPENROUTER_TIMEOUT_MS = 45_000;

type OpenRouterFailureKind = "missing_key" | "authentication" | "rate_limited" | "timeout" | "network" | "provider" | "malformed_response";
type OpenRouterResponseDiagnostics = { finishReason?: string; contentPresent?: boolean };

class OpenRouterError extends Error {
  kind: OpenRouterFailureKind;
  providerStatus?: number;
  finishReason?: string;
  contentPresent?: boolean;

  constructor(kind: OpenRouterFailureKind, message: string, providerStatus?: number, diagnostics: OpenRouterResponseDiagnostics = {}) {
    super(message);
    this.name = "OpenRouterError";
    this.kind = kind;
    this.providerStatus = providerStatus;
    this.finishReason = diagnostics.finishReason;
    this.contentPresent = diagnostics.contentPresent;
  }
}

type OpenRouterRequest = {
  prompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens: number;
  temperature: number;
};

function openRouterFailureForStatus(status: number): OpenRouterFailureKind {
  if (status === 401 || status === 403) return "authentication";
  if (status === 429) return "rate_limited";
  return "provider";
}

function safeFinishReason(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) : "";
}

function isTruncatedFinishReason(value: string): boolean {
  return ["length", "max_tokens", "max_output_tokens", "incomplete", "truncated"].includes(value);
}

function stripOptionalResponseWrappers(value: string): string {
  let cleaned = value.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const next = cleaned
      .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    if (next === cleaned) break;
    cleaned = next;
  }
  return cleaned;
}

function openRouterMessageContent(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (!part || typeof part !== "object") return "";
    const record = part as Record<string, unknown>;
    const partType = typeof record.type === "string" ? record.type.toLowerCase() : "";
    if (["reasoning", "thinking", "analysis"].includes(partType)) return "";
    return typeof record.text === "string" ? record.text : "";
  }).join("").trim();
}

function openRouterParseObject(value: string): Record<string, unknown> | null {
  const trimmed = stripOptionalResponseWrappers(value);
  if (!trimmed) return null;
  const candidates = [trimmed, trimmed.replace(/^json\s*/i, "").trim()];
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Try the bounded object slice below for a short provider preamble.
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // The provider error remains redacted and contains no generated content.
    }
  }
  return null;
}

async function requestOpenRouterJson(request: OpenRouterRequest): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")?.trim();
  if (!apiKey) throw new OpenRouterError("missing_key", "OpenRouter is not configured for outreach draft generation.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: request.prompt }],
        max_tokens: Math.min(Math.max(Math.trunc(request.maxTokens), 1), 12000),
        temperature: Math.min(Math.max(request.temperature, 0), 2),
        reasoning: { effort: "none" },
        stream: false,
        response_format: { type: "json_schema", json_schema: { name: request.schemaName, strict: true, schema: request.schema } },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error && typeof error === "object" && (error as { name?: unknown }).name === "AbortError") throw new OpenRouterError("timeout", "OpenRouter timed out while generating outreach drafts.");
    throw new OpenRouterError("network", "OpenRouter could not be reached for outreach draft generation.");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    console.warn("[generate-saved-lead-outreach] provider_response", { providerStatus: response.status, finishReason: "non_2xx", contentPresent: false });
    throw new OpenRouterError(openRouterFailureForStatus(response.status), "OpenRouter rejected the outreach draft request.", response.status);
  }
  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    console.warn("[generate-saved-lead-outreach] provider_response", { providerStatus: response.status, finishReason: "unreadable", contentPresent: false });
    throw new OpenRouterError("malformed_response", "OpenRouter returned an unreadable outreach draft response.", response.status, { finishReason: "unreadable", contentPresent: false });
  }
  const choices = envelope && typeof envelope === "object" && Array.isArray((envelope as Record<string, unknown>).choices) ? (envelope as Record<string, unknown>).choices as unknown[] : [];
  const first = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : null;
  const finishReason = safeFinishReason(first?.finish_reason);
  const message = first?.message && typeof first.message === "object" ? first.message as Record<string, unknown> : null;
  const content = openRouterMessageContent(message?.content);
  const diagnostics = { finishReason: finishReason || "unknown", contentPresent: Boolean(content) };
  console.info("[generate-saved-lead-outreach] provider_response", { providerStatus: response.status, ...diagnostics });
  if (isTruncatedFinishReason(finishReason)) throw new OpenRouterError("malformed_response", "OpenRouter returned a truncated outreach draft response.", response.status, diagnostics);
  if (!content) throw new OpenRouterError("malformed_response", "OpenRouter returned no structured outreach draft content.", response.status, diagnostics);
  const parsed = openRouterParseObject(content);
  if (!parsed) throw new OpenRouterError("malformed_response", "OpenRouter returned malformed outreach draft content.", response.status, diagnostics);
  return parsed;
}

const PREVIEW_ORIGIN = "https://laydbackapps.com";
const OUTREACH_VERSION = "saved-lead-outreach-direct-conversational-v6";
const MAX_LEAD_RECORDS = 1000;
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin",
  "Content-Type": "application/json",
};

type LeadRecord = Record<string, any>;
type PublicPerson = { name: string; role: string; sourceUrl: string };
type LeadFacts = {
  businessName: string;
  businessType: string;
  industry: string;
  market: string;
  summary: string;
  services: string[];
  contactDetails: Record<string, unknown>;
  website: { url: string; status: string; signals: Record<string, unknown> };
  socialLinks: Array<{ platform: string; url: string }>;
  publicPeople: PublicPerson[];
  owner: PublicPerson | null;
  researchSourceUrls: string[];
  previewUrl: string;
};

type FailureCategory = "unauthorized" | "forbidden" | "generation_failed" | "validation_failed" | "persistence_failed";

class OutreachFailure extends Error {
  category: FailureCategory;
  cause?: unknown;

  constructor(category: FailureCategory, message: string, cause?: unknown) {
    super(message);
    this.name = "OutreachFailure";
    this.category = category;
    this.cause = cause;
  }
}

function clientFailureMessage(category: FailureCategory): string {
  if (category === "unauthorized") return "Authentication required. Refresh the page and sign in again.";
  if (category === "forbidden") return "You do not have access to this saved lead.";
  if (category === "validation_failed") return "The generated outreach drafts failed their safety checks. Try again with the saved facts unchanged.";
  if (category === "persistence_failed") return "The outreach drafts could not be saved. Refresh the studio and try again.";
  return "The outreach draft generator could not complete. Try again in a moment.";
}

function responseSchemaFor(needsPitch: boolean, needsFollowUp: boolean, needsCall: boolean): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  if (needsPitch) {
    properties.pitchDm = { type: "string", description: "The casual first direct-message draft." };
    required.push("pitchDm");
  }
  if (needsFollowUp) {
    properties.followUpDm = { type: "string", description: "A short manual-review follow-up direct-message draft." };
    required.push("followUpDm");
  }
  if (needsCall) {
    properties.coldCallPitch = { type: "string", description: "The 20 to 40 second cold-call opener." };
    required.push("coldCallPitch");
  }
  return { type: "object", additionalProperties: false, properties, required };
}

function providerFailureMessage(error: OpenRouterError): string {
  if (error.kind === "missing_key") return "Outreach drafting is not configured. Ask the administrator to add the OpenRouter key.";
  if (error.kind === "authentication") return "The outreach provider rejected its server credentials.";
  if (error.kind === "rate_limited") return "The outreach provider is rate-limited. Try again in a few minutes.";
  if (error.kind === "timeout") return "The outreach provider timed out. Try again in a moment.";
  if (error.kind === "network") return "The outreach provider could not be reached. Try again in a moment.";
  if (error.kind === "malformed_response") return "The outreach provider returned an unreadable response.";
  return "The outreach provider returned an error. Try again in a moment.";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function text(value: unknown, max = 500): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max)
    : "";
}

function draftText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max + 1);
}

function recordList(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object" || depth > 5) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["data", "records", "items", "leads"]) {
    const nested = recordList(record[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

type BoundedLeadRecords = { records: LeadRecord[]; truncated: boolean };

function normalizedEmail(value: unknown): string {
  return text(value, 320).toLowerCase();
}

function ownsRecord(record: LeadRecord | undefined, ownerEmail: string): boolean {
  return Boolean(record && ownerEmail && normalizedEmail(record.created_by) === ownerEmail);
}

async function boundedLeadRecords(superdev: any, ownerEmail: string): Promise<BoundedLeadRecords> {
  if (!ownerEmail) throw new Error("missing_verified_owner");
  const response = await superdev.entities.Lead.filter({ created_by: ownerEmail });
  const records = recordList(response);
  if (!records) throw new Error("invalid_lead_response");
  const bounded = records.slice(0, MAX_LEAD_RECORDS);
  if (bounded.some((record) => !record || typeof record !== "object" || Array.isArray(record))) throw new Error("invalid_lead_response");
  if (bounded.some((record) => !ownsRecord(record as LeadRecord, ownerEmail))) throw new Error("lead_ownership_check_failed");
  return { records: bounded as LeadRecord[], truncated: records.length > MAX_LEAD_RECORDS };
}

function exactLead(records: LeadRecord[], leadId: string): LeadRecord | undefined {
  return records.find((record) => String(record?.id ?? "") === leadId);
}

async function ownedLead(superdev: any, ownerEmail: string, leadId: string): Promise<LeadRecord | undefined> {
  const read = await boundedLeadRecords(superdev, ownerEmail);
  const lead = exactLead(read.records, leadId);
  return ownsRecord(lead, ownerEmail) ? lead : undefined;
}

async function updateOwnedLead(superdev: any, ownerEmail: string, leadId: string, data: Record<string, unknown>) {
  const current = await ownedLead(superdev, ownerEmail, leadId);
  if (!current || !ownsRecord(current, ownerEmail)) throw new OutreachFailure("forbidden", "You do not have access to this saved lead.");
  await superdev.entities.Lead.update(String(current.id), data);
}

function uniqueText(values: unknown[], max = 16): string[] {
  const seen = new Set<string>();
  return values.map((value) => text(value, 300)).filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, max);
}

function httpUrl(value: unknown): string {
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

function canonicalUrl(value: unknown): string {
  const raw = httpUrl(value);
  if (!raw) return "";
  const parsed = new URL(raw);
  return `${parsed.protocol}//${parsed.hostname.toLowerCase().replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "") || "/"}`;
}

function safePrivatePreview(value: unknown, siteId: unknown): string {
  const raw = httpUrl(value);
  const expectedSiteId = text(siteId, 160);
  if (!raw || !expectedSiteId) return "";
  try {
    const parsed = new URL(raw);
    const token = parsed.hash.startsWith("#token=") ? parsed.hash.slice(7) : "";
    if (parsed.protocol !== "https:" || parsed.origin !== PREVIEW_ORIGIN || parsed.pathname !== `/store/${expectedSiteId}` || parsed.search || parsed.username || parsed.password || !/^[a-f0-9]{64}$/i.test(token)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function platformLabel(url: string, hint: unknown): string {
  const provided = text(hint, 60);
  if (provided) return provided;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const matches = [["instagram.com", "Instagram"], ["facebook.com", "Facebook"], ["tiktok.com", "TikTok"], ["linkedin.com", "LinkedIn"], ["youtube.com", "YouTube"], ["x.com", "X"], ["twitter.com", "X"], ["pinterest.com", "Pinterest"], ["threads.net", "Threads"], ["whatsapp.com", "WhatsApp"], ["wa.me", "WhatsApp"], ["g.page", "Google Business"]] as const;
    return matches.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] || host;
  } catch {
    return "Public profile";
  }
}

function socialLinksFor(lead: LeadRecord) {
  const raw = Array.isArray(lead.socialLinks) ? lead.socialLinks : [];
  const values = [...raw.map((item: any) => ({ url: item?.url, platform: item?.platform })), { url: lead.instagramUrl, platform: "Instagram" }, { url: lead.facebookUrl, platform: "Facebook" }, { url: lead.tiktokUrl, platform: "TikTok" }, { url: lead.linkedinUrl, platform: "LinkedIn" }, { url: lead.googleBusinessUrl, platform: "Google Business" }];
  const seen = new Set<string>();
  return values.flatMap(({ url, platform }) => {
    const safe = httpUrl(url);
    const key = canonicalUrl(safe);
    if (!safe || !key || seen.has(key)) return [];
    seen.add(key);
    return [{ platform: platformLabel(safe, platform), url: safe }];
  }).slice(0, 32);
}

function contactDetailsFor(lead: LeadRecord) {
  const raw = lead.contactDetails && typeof lead.contactDetails === "object" && !Array.isArray(lead.contactDetails) ? lead.contactDetails : {};
  const phones = uniqueText([...(Array.isArray(raw.phones) ? raw.phones : []), lead.phone].map((value) => {
    const phone = text(value, 60);
    return phone.replace(/\D/g, "").length >= 8 ? phone : "";
  }));
  const emails = uniqueText([...(Array.isArray(raw.emails) ? raw.emails : []), lead.email].map((value) => {
    const email = text(value, 160).toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "";
  }));
  return { phones, emails, contactPageUrl: httpUrl(raw.contactPageUrl), bookingUrl: httpUrl(raw.bookingUrl), physicalAddress: text(raw.physicalAddress, 240), serviceAreas: uniqueText(Array.isArray(raw.serviceAreas) ? raw.serviceAreas : []), openingHours: text(raw.openingHours, 400) };
}

function publicPeopleFor(lead: LeadRecord): PublicPerson[] {
  const raw = Array.isArray(lead.publicPeople) ? lead.publicPeople : [];
  const candidates = [{ name: lead.ownerName, role: lead.ownerRole, sourceUrl: lead.ownerSourceUrl }, ...raw.map((item: any) => ({ name: item?.name, role: item?.role, sourceUrl: item?.sourceUrl || item?.source_url }))];
  const seen = new Set<string>();
  return candidates.flatMap((item) => {
    const person = { name: text(item.name, 120), role: text(item.role, 120), sourceUrl: httpUrl(item.sourceUrl) };
    const key = `${person.name.toLowerCase()}|${person.role.toLowerCase()}`;
    if (!person.name || !person.role || !person.sourceUrl || seen.has(key)) return [];
    seen.add(key);
    return [person];
  }).slice(0, 12);
}

function factsFor(lead: LeadRecord): LeadFacts {
  const contacts = contactDetailsFor(lead);
  const people = publicPeopleFor(lead);
  const owner = people.find((person) => /owner|founder|director|principal|manager|decision[- ]?maker|ceo|president/i.test(person.role)) || null;
  const sourceUrls = [...(Array.isArray(lead.researchSourceUrls) ? lead.researchSourceUrls : []), lead.evidenceUrl, lead.website, contacts.contactPageUrl, contacts.bookingUrl, ...people.map((person) => person.sourceUrl)].map(httpUrl).filter(Boolean);
  const seen = new Set<string>();
  const sources = sourceUrls.filter((url) => { const key = canonicalUrl(url); if (!key || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 24);
  const rawSignals = lead.websiteSignals && typeof lead.websiteSignals === "object" && !Array.isArray(lead.websiteSignals) ? lead.websiteSignals : {};
  const signalKeys = ["inspectionStatus", "status", "httpStatus", "reachable", "https", "mobileViewport", "contactPath", "contactMethod", "emailPresent", "phonePresent", "socialLinksCount", "ecommerceSignals", "parkedLanguage", "oldCopyright", "meaningfulText", "visibleTextLength", "inspectionReason"];
  const signals = signalKeys.reduce<Record<string, unknown>>((result, key) => { const value = rawSignals[key]; if (["string", "number", "boolean"].includes(typeof value)) result[key] = typeof value === "string" ? text(value, 240) : value; return result; }, {});
  return {
    businessName: text(lead.businessName, 140),
    businessType: text(lead.businessType || lead.trade, 120),
    industry: text(lead.trade, 140),
    market: text(lead.location, 160),
    summary: text(lead.businessSummary || lead.socialBio, 900),
    services: uniqueText(Array.isArray(lead.services) ? lead.services : [], 18),
    contactDetails: contacts,
    website: { url: httpUrl(lead.website), status: text(lead.websiteStatus, 60), signals },
    socialLinks: socialLinksFor(lead),
    publicPeople: people,
    owner,
    researchSourceUrls: sources,
    previewUrl: safePrivatePreview(lead.previewUrl, lead.clientSiteId),
  };
}

function normalized(value: unknown): string {
  return text(value, 4000).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const CONTEXT_STOP_WORDS = new Set(["the", "and", "for", "with", "from", "your", "this", "that", "business", "services", "service", "local", "area", "online"]);

function meaningfulTokens(value: unknown): string[] {
  return normalized(value).split(" ").filter((token) => token.length >= 3 && !CONTEXT_STOP_WORDS.has(token));
}

function matchesFact(draft: string, value: unknown, requireAllTokens = false): boolean {
  const candidate = normalized(value);
  const copy = normalized(draft);
  if (!candidate || candidate.length < 3) return false;
  if (copy.includes(candidate)) return true;
  const tokens = meaningfulTokens(value);
  if (!tokens.length) return false;
  return requireAllTokens ? tokens.every((token) => copy.includes(token)) : tokens.some((token) => copy.includes(token));
}

function containsBusinessName(draft: string, facts: LeadFacts): boolean {
  return matchesFact(draft, facts.businessName, true);
}

function hasSocialEvidence(facts: LeadFacts): boolean {
  const socialCount = facts.website.signals.socialLinksCount;
  return facts.socialLinks.length > 0 || (typeof socialCount === "number" && socialCount > 0);
}

function websiteSignalTerms(facts: LeadFacts): string[] {
  const terms = new Set<string>();
  const add = (...values: string[]) => values.forEach((value) => terms.add(value));
  const status = normalized(facts.website.status);
  if (facts.website.url || status) add("website", "site", "homepage");
  if (hasSocialEvidence(facts)) add("socials", "social", "profile", "instagram", "facebook", "tiktok", "linkedin");
  if (["none", "missing", "unreachable", "offline"].includes(status)) add("online", "website");
  for (const [key, value] of Object.entries(facts.website.signals)) {
    const truthy = value === true || (typeof value === "number" && value > 0) || (typeof value === "string" && value.trim() && value.toLowerCase() !== "false");
    if (!truthy) continue;
    if (/contactPath|contactMethod|booking/i.test(key)) add("contact", "enquiry", "quote", "booking");
    if (/emailPresent|phonePresent/i.test(key)) add("contact", "email", "phone");
    if (/mobileViewport/i.test(key)) add("mobile", "phone");
    if (/oldCopyright/i.test(key)) add("outdated", "old");
    if (/parkedLanguage/i.test(key)) add("parked", "website");
    if (/socialLinksCount/i.test(key)) add("socials", "social", "profile");
    if (/reachable|https/i.test(key)) add("website", "site");
  }
  return [...terms];
}

function containsAdditionalContext(draft: string, facts: LeadFacts): boolean {
  const candidates = [facts.businessType, facts.industry, facts.market, ...facts.services].filter((value) => meaningfulTokens(value).length > 0);
  return candidates.some((value) => matchesFact(draft, value)) || websiteSignalTerms(facts).some((value) => matchesFact(draft, value));
}

function stripDraftUrls(value: string): string {
  return value.replace(/(?:https?:\/\/|www\.)[^\s<>"']+/gi, " ");
}

function wordCount(value: string): number {
  return stripDraftUrls(value).trim().split(/\s+/).filter(Boolean).length;
}

function hasExactPreviewLinkLine(value: string, previewUrl: string): boolean {
  return value.split(/\r?\n/).some((line) => line.trim() === previewUrl);
}

function hasTangiblePreviewReference(draft: string): boolean {
  return /\b(?:private\s+(?:website|site)(?:\s+(?:preview|concept|draft|option))?|(?:website|site)\s+(?:concept|preview|idea|draft)|mock[- ]?up|put\s+together|threw\s+together|(?:built|made)\s+(?:a|this|you)(?:\s+a)?(?:\s+private)?\s+(?:website|site)|(?:have|take)\s+a\s+look|fresh\s+(?:website|site)\s+(?:option|concept|idea))\b/i.test(stripDraftUrls(draft));
}

function hasSocialsFirstObservation(draft: string, facts: LeadFacts): boolean {
  if (!hasSocialEvidence(facts)) return false;
  const opening = draft.slice(0, 420);
  const hasSearchContext = /\b(?:looking\s+online|looking\s+for|was\s+looking|searched\s+for|searching\s+for|researching|checking\s+out|found|came\s+across)\b/i.test(opening);
  const hasSocialContext = /\b(?:socials?|social\s+media|instagram|facebook|tiktok|linkedin|public\s+profile|profile\s+page)\b/i.test(opening);
  return hasSearchContext && hasSocialContext;
}

function hasDirectCallOpener(draft: string, facts: LeadFacts): boolean {
  const opening = draft.trim().slice(0, 360);
  const startsDirectly = /^(?:hey|g['’]?day)(?:\s*,?\s*mate)?(?:[,\s:!-]+|$)/i.test(opening);
  const hasSearchContext = /\b(?:looking|searching|searched|checking)\s+(?:online\s+)?for\b/i.test(opening);
  const hasSavedContext = [facts.businessName, facts.businessType, facts.industry, facts.market, ...facts.services].some((value) => matchesFact(opening, value));
  const hasSocialContext = /\b(?:socials?|social\s+media|instagram|facebook|tiktok|linkedin|public\s+profile|profile\s+page)\b/i.test(opening);
  return startsDirectly && hasSearchContext && hasSavedContext && (!hasSocialEvidence(facts) || hasSocialContext);
}

function hasConcreteReason(draft: string, facts: LeadFacts): boolean {
  const hasSocialObservation = hasSocialsFirstObservation(draft, facts) || (hasSocialEvidence(facts) && /\b(?:socials?|social\s+media|instagram|facebook|tiktok|linkedin|public\s+profile|profile\s+page)\b/i.test(draft));
  const hasObservation = hasSocialObservation || /\b(?:noticed|saw|came\s+across|found|looked\s+at|checked|read\s+through|was\s+looking|while\s+(?:researching|looking)|from\s+your|on\s+your|you(?:'re|\s+are)\s+(?:based|in|doing|offering|working)|you\s+(?:do|offer|cover|serve|work|speciali[sz]e)|based\s+in|around|listed|public)\b/i.test(draft) || (containsAdditionalContext(draft, facts) && /\b(?:your|you|based|around|in|for)\b/i.test(draft));
  const hasOpportunity = /\b(?:website|site|homepage|online|enquir|quote|booking|contact|mobile|phone|trust|showcase|preview|concept|mock[- ]?up|draft|option|idea|refresh|update|fresh|easier\s+to\s+(?:find|contact)|have\s+a\s+look)\b/i.test(draft);
  return hasObservation && hasOpportunity;
}

function hasReachableHomepage(facts: LeadFacts): boolean {
  if (!facts.website.url) return false;
  const signals = facts.website.signals;
  if (signals.reachable === false) return false;
  return signals.reachable === true || normalized(signals.status) === "reachable" || normalized(facts.website.status) === "good";
}

function verifiedWebsiteIssue(facts: LeadFacts): boolean {
  const status = normalized(facts.website.status);
  if (["none", "no website", "missing", "dodgy", "outdated", "broken", "unreachable", "offline"].includes(status)) return true;
  const signals = facts.website.signals;
  const httpStatus = typeof signals.httpStatus === "number" ? signals.httpStatus : 0;
  return signals.status === "no_site" || signals.status === "unreachable" || signals.status === "parked" || signals.status === "broken" || signals.reachable === false || signals.mobileViewport === false || signals.oldCopyright === true || signals.parkedLanguage === true || signals.meaningfulText === false || httpStatus >= 400 || /(?:outdated|old|parked|unreachable|missing|error)/i.test(`${signals.inspectionStatus || ""} ${signals.inspectionReason || ""}`);
}

function verifiedQuotePathGap(facts: LeadFacts): boolean {
  if (!facts.website.url) return true;
  const signals = facts.website.signals;
  if (signals.contactPath === false || signals.contactMethod === false) return true;
  return normalized(signals.inspectionStatus) === "checked" && signals.contactPath === false;
}

function quoteSearchAngleSupported(facts: LeadFacts): boolean {
  const signals = facts.website.signals;
  const hasPublicEvidence = Boolean(facts.website.url || facts.website.status || facts.socialLinks.length || (typeof signals.socialLinksCount === "number" && signals.socialLinksCount > 0));
  return hasPublicEvidence && (verifiedWebsiteIssue(facts) || verifiedQuotePathGap(facts));
}

function hasCautiousWebsiteLanguage(draft: string): boolean {
  return /\b(?:might|could|may|seems?|appears?|looks?|possibly|from\s+what\s+i\s+could\s+see|if\s+i(?:'m|\s+am)\s+reading\s+it\s+right|worth)\b/i.test(draft);
}

const PERMISSION_CTA_PATTERN = /\b(?:would\s+you\s+be\s+open\s+to|are\s+you\s+open\s+to|can\s+i|could\s+i|would\s+it\s+be\s+(?:alright|okay)\s+if|is\s+it\s+(?:alright|okay)\s+if|mind\s+if\s+i|happy\s+for\s+me\s+to|shall\s+i|want\s+me\s+to|would\s+you\s+like\s+me\s+to|keen\s+for\s+me\s+to|would\s+you\s+mind\s+if\s+i)\b/i;
const PERMISSION_CTA_GLOBAL_PATTERN = /\b(?:would\s+you\s+be\s+open\s+to|are\s+you\s+open\s+to|can\s+i|could\s+i|would\s+it\s+be\s+(?:alright|okay)\s+if|is\s+it\s+(?:alright|okay)\s+if|mind\s+if\s+i|happy\s+for\s+me\s+to|shall\s+i|want\s+me\s+to|would\s+you\s+like\s+me\s+to|keen\s+for\s+me\s+to|would\s+you\s+mind\s+if\s+i)\b/gi;
const CTA_ACTION_PATTERN = /\b(?:send(?:ing)?|text(?:ing)?|flick(?:ing)?|shoot(?:ing)?|show(?:ing)?|share(?:ing)?|have\s+a\s+look|take\s+a\s+look|look(?:ing)?\s+(?:at|over)|see|review|check|tee(?:ing)?\s+up|call|zoom|run\s+through|get\s+it\s+(?:through|over)|make\s+this\s+yours)\b/i;
const NATURAL_CTA_PATTERN = /\b(?:let\s+me\s+know|if\s+you\s+(?:like|reckon)\s+it|what\s+do\s+you\s+(?:reckon|think))\b/i;

function permissionCtaCount(draft: string): number {
  return draft.match(PERMISSION_CTA_GLOBAL_PATTERN)?.length || 0;
}

function hasNaturalCta(draft: string): boolean {
  const ending = draft.slice(-460);
  return NATURAL_CTA_PATTERN.test(ending) && /\b(?:send(?:ing)?|text(?:ing)?|flick(?:ing)?|shoot(?:ing)?|show(?:ing)?|share(?:ing)?|have\s+a\s+look|take\s+a\s+look|look(?:ing)?\s+(?:at|over)|tee(?:ing)?\s+up|call|zoom|run\s+through|get\s+it\s+(?:through|over)|make\s+this\s+yours)\b/i.test(ending);
}

function finalCtaIsValid(draft: string, kind: "dm" | "call"): boolean {
  const ending = draft.slice(Math.max(0, draft.length - 460));
  const questionMark = ending.lastIndexOf("?");
  const question = questionMark >= 0 ? ending.slice(0, questionMark) : "";
  const permissionCta = questionMark >= 0 && PERMISSION_CTA_PATTERN.test(question) && CTA_ACTION_PATTERN.test(question);
  const naturalCta = hasNaturalCta(draft);
  const naturalQuestion = /\bwhat\s+do\s+you\s+(?:reckon|think)\b/i.test(ending);
  if (kind === "call") return permissionCta || (questionMark >= 0 && (naturalCta || naturalQuestion) && CTA_ACTION_PATTERN.test(ending));
  return permissionCta || naturalCta;
}

function hasGenericComplimentOpener(draft: string, facts: LeadFacts): boolean {
  const opening = draft.slice(0, 260);
  const match = opening.match(/\b(?:great|awesome|amazing|impressive|nice\s+work|love\s+what\s+you\s+do|top[- ]?notch)\b/i);
  if (!match || match.index === undefined) return false;
  const beforeCompliment = opening.slice(0, match.index);
  const concreteOpening = [facts.businessType, facts.industry, facts.market, ...facts.services].some((value) => matchesFact(beforeCompliment, value));
  return !concreteOpening;
}

function hasWeakAttentionOpener(draft: string, facts: LeadFacts): boolean {
  const opening = draft.split(/\r?\n/).slice(0, 2).join(" ").slice(0, 320);
  const generic = /\b(?:came\s+across\s+your\s+business|came\s+across\s+the\s+business|found\s+your\s+business|just\s+reaching\s+out|wanted\s+to\s+reach\s+out|reaching\s+out\s+to\s+see|hope\s+you'?re\s+well|quick\s+one)\b/i;
  if (!generic.test(opening)) return false;
  if (/\b(?:quote|looking\s+for|trying\s+to\s+find|searched\s+for)\b/i.test(opening)) return false;
  const hasSavedDetail = [facts.businessType, facts.industry, facts.market, ...facts.services].some((value) => matchesFact(opening, value)) || websiteSignalTerms(facts).some((value) => matchesFact(opening, value));
  return !hasSavedDetail;
}

const YEARS_CLAIM_PATTERN = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s+years?\b/gi;
const OPERATOR_YEARS_PATTERN = /\b(?:i(?:['’]ve|\s+have)\s+been|as\s+well\s+as\s+being|being)\s+(?:a\s+)?(?:concreter|concreting)\s+for\s+(?:the\s+last\s+)?(?:11|eleven)\s+years\b|\b(?:i(?:['’]ve|\s+have)\s+)?(?:around\s+)?(?:11|eleven)\s+years\s+(?:on\s+the\s+tools\s+as\s+(?:a\s+)?concreter|as\s+(?:a\s+)?concreter|of\s+concreting)\b/i;

function yearClaimIsOperatorPositioning(draft: string, index: number, claim: string): boolean {
  const context = draft.slice(Math.max(0, index - 110), Math.min(draft.length, index + claim.length + 110));
  return OPERATOR_YEARS_PATTERN.test(context);
}

function hasUnsupportedYearClaim(draft: string): boolean {
  return Array.from(draft.matchAll(YEARS_CLAIM_PATTERN)).some((match) => !yearClaimIsOperatorPositioning(draft, match.index ?? 0, match[0]));
}

function hasOperatorCredibilityBridge(draft: string): boolean {
  const hasOperatorYears = Array.from(draft.matchAll(YEARS_CLAIM_PATTERN)).some((match) => yearClaimIsOperatorPositioning(draft, match.index ?? 0, match[0]));
  const hasWebDevelopment = /\b(?:background\s+in\s+web(?:site)?\s+development|web(?:site)?\s+development\s+background|background\s+in\s+web\s+dev(?:elopment)?|web\s+developer|certified\s+web\s+developer|also\s+(?:build|make|put\s+together)\s+(?:websites?|sites?))\b/i.test(draft);
  return hasOperatorYears && hasWebDevelopment;
}

function hasUnsupportedSpecificFact(draft: string, facts: LeadFacts): boolean {
  const evidence = JSON.stringify(facts).toLowerCase();
  const rules: Array<{ pattern: RegExp; evidence: string[]; claimKind?: "years" }> = [
    { pattern: /\b(?:family[- ]?owned|family[- ]?run|locally owned)\b/i, evidence: ["family", "owned"] },
    { pattern: /\b(?:licensed|licenced|insured|fully insured)\b/i, evidence: ["licensed", "licenced", "insured"] },
    { pattern: /\b(?:award[- ]?winning|award winner|winner of)\b/i, evidence: ["award"] },
    { pattern: /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s+years?\b/i, evidence: ["year"], claimKind: "years" },
    { pattern: /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:reviews?|stars?)\b/i, evidence: ["review", "star"] },
    { pattern: /\b(?:team\s+of|staff\s+of|employees?)\b/i, evidence: ["team", "staff", "employee"] },
    { pattern: /\b(?:trusted\s+by|clients?\s+like|customers?\s+like)\b/i, evidence: ["trusted", "client", "customer"] },
  ];
  return rules.some((rule) => {
    if (!rule.pattern.test(draft)) return false;
    if (rule.claimKind === "years" && !hasUnsupportedYearClaim(draft)) return false;
    return !rule.evidence.some((term) => evidence.includes(term));
  });
}

function validateGenerated(value: unknown, facts: LeadFacts, kind: "dm" | "call", useQuoteSearchAngle: boolean): string {
  const maxCharacters = kind === "dm" ? 1800 : 2400;
  const draft = draftText(value, maxCharacters);
  const minimumWords = kind === "dm" ? 80 : 45;
  const maximumWords = kind === "dm" ? 175 : 120;
  const words = wordCount(draft);
  const quoteSearchAllowed = useQuoteSearchAngle && quoteSearchAngleSupported(facts);
  if (draft.length < 40 || draft.length > maxCharacters || words < minimumWords || words > maximumWords) throw new Error(`${kind} draft length was invalid`);
  if (/\[[^\]\r\n]+\]|\{[^}\r\n]+\}|<\s*(?:business|industry|location|preview|website|name)\b[^>]*>|\b(?:todo|tbd|insert\s+(?:name|details)|lorem ipsum|aida|attention\s*:|interest\s*:|desire\s*:|action\s*:|strategy|sales\s+analysis)\b/i.test(draft)) throw new Error(`${kind} draft contained an unresolved placeholder or strategy label`);
  const quoteSearchStory = /\b(?:looking|searching|trying)\s+(?:online\s+)?(?:for|to\s+(?:get|find|request))\s+(?:a\s+)?(?:quote|estimate|enquir(?:y|ies))\b|\b(?:needed|wanted|tried|looked)\s+(?:to\s+)?(?:get|find|request)\s+(?:a\s+)?(?:quote|estimate|enquir(?:y|ies))\b|\b(?:couldn'?t|could\s+not|didn'?t|did\s+not|can'?t|cannot)\s+find\b[^.?!]{0,120}\b(?:quote|estimate|enquir(?:y|ies))\b/i;
  if (!quoteSearchAllowed && quoteSearchStory.test(draft)) throw new Error(`${kind} draft used an unapproved quote-search story`);

  const urls = draft.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || [];
  if (kind === "call" && urls.length > 0) throw new Error("cold-call draft contained a URL");
  for (const candidate of urls) {
    const cleaned = candidate.replace(/[),.;!?]+$/, "");
    if (!facts.previewUrl || cleaned !== facts.previewUrl) throw new Error(`${kind} draft contained an unapproved URL`);
  }
  if (kind === "dm" && facts.previewUrl && !hasExactPreviewLinkLine(draft, facts.previewUrl)) throw new Error("DM draft did not place the exact private preview link on its own line");
  if (kind === "dm" && !facts.previewUrl && urls.length > 0) throw new Error("DM draft contained a URL without a validated preview");
  if (facts.previewUrl && !hasTangiblePreviewReference(draft)) throw new Error(`${kind} draft did not make the private concept tangible`);
  if (!facts.previewUrl && /\b(?:preview(?:\s+link)?|mock[- ]?up|private\s+(?:website|site|draft|concept)|website\s+concept|site\s+concept|already\s+(?:built|made)|built\s+(?:a|this)\s+(?:website|site)|put\s+together\s+(?:a\s+)?(?:private\s+)?(?:website|site))\b/i.test(stripDraftUrls(draft))) throw new Error(`${kind} draft referred to an unavailable preview`);

  if (!containsBusinessName(draft, facts)) throw new Error(`${kind} draft did not name the saved business`);
  if (!containsAdditionalContext(draft, facts)) throw new Error(`${kind} draft did not include an additional verified business signal`);
  if (!hasConcreteReason(draft, facts)) throw new Error(`${kind} draft did not include a concrete observation or opportunity`);
  if (hasSocialEvidence(facts) && !hasSocialsFirstObservation(draft, facts)) throw new Error(`${kind} draft did not use the saved socials-first search observation`);
  if (!hasOperatorCredibilityBridge(draft)) throw new Error(`${kind} draft did not include Heath's supported 11-year concreter and web-development background`);
  if (hasGenericComplimentOpener(draft, facts) || hasWeakAttentionOpener(draft, facts)) throw new Error(`${kind} draft opened with a generic or empty attention line`);
  if (/\b(?:high[- ]?converting|lead\s+generation|digital\s+marketing|full[- ]?service|results[- ]?driven|seamless|elevate|unlock|supercharge|help\s+(?:you\s+)?grow|bring\s+in\s+more\s+(?:leads|enquiries|jobs|work)|get\s+more\s+(?:leads|enquiries|jobs)|improve\s+your\s+online\s+presence|stand\s+out\s+online|guarantee(?:d)?|double|triple|proven|award[- ]?winning|best\s+in|number\s+one|#1|trusted\s+by|case\s+stud(?:y|ies)|testimonials?|results?|limited\s+time|last\s+chance|act\s+now|don'?t\s+miss|no\s+risk|risk[- ]?free|urgent|exclusive)\b/i.test(draft)) throw new Error(`${kind} draft contained a prohibited sales claim`);
  if (hasUnsupportedSpecificFact(draft, facts)) throw new Error(`${kind} draft contained an unsupported business claim`);

  const websiteAbsenceClaim = /\b(?:no\s+(?:proper\s+)?(?:website|site|online\s+presence)|(?:do\s+not|don'?t|can'?t|couldn'?t|could\s+not|didn'?t|did\s+not)\s+(?:have|find|see)\s+(?:a\s+)?(?:proper|clear|current|working)?\s*(?:website|site|online\s+presence)|(?:website|site)\s+(?:is|looks|seems)\s+(?:outdated|old|broken|bad|poor|not\s+mobile|not\s+secure|missing)|(?:not|isn'?t|is\s+not)\s+(?:mobile[- ]friendly|working|secure)|nothing\s+(?:came\s+up|shows\s+up))\b/i;
  const quotePathGapClaim = /\b(?:couldn'?t|could\s+not|didn'?t|did\s+not|can'?t|cannot|wasn'?t|was\s+not)\s+(?:find|see|work\s+out)\s+(?:an?\s+)?(?:easy|clear|simple|obvious)\s+(?:way|path|option)\s+(?:to\s+)?(?:request|get|ask\s+for|make)\s+(?:a\s+)?(?:quote|estimate|enquir(?:y|ies))\b/i;
  if (websiteAbsenceClaim.test(draft)) {
    if (!quoteSearchAllowed) throw new Error(`${kind} draft used an unapproved website-search story`);
    if (hasReachableHomepage(facts) || !verifiedWebsiteIssue(facts)) throw new Error(`${kind} draft made an unsupported website absence claim`);
    const status = normalized(facts.website.status);
    if (!/\b(?:none|missing|no\s+website)\b/i.test(status) && !hasCautiousWebsiteLanguage(draft)) throw new Error(`${kind} draft made an overconfident website claim`);
  }
  if (quotePathGapClaim.test(draft)) {
    if (!quoteSearchAllowed || !verifiedQuotePathGap(facts)) throw new Error(`${kind} draft made an unsupported quote-path claim`);
  }

  const permissionCount = permissionCtaCount(draft);
  const questionCount = (draft.match(/\?/g) || []).length;
  if (permissionCount > 1 || !finalCtaIsValid(draft, kind)) throw new Error(`${kind} draft did not end with one clear natural CTA or question`);
  if (kind === "dm" && questionCount > 1) throw new Error("DM draft contained stacked questions or CTAs");
  if (kind === "call") {
    if (!hasDirectCallOpener(draft, facts)) throw new Error("cold-call draft did not start with a direct saved-fact opener");
    if (questionCount < 1 || questionCount > 2) throw new Error("cold-call draft contained stacked questions");
    if (!/\b(?:send(?:ing)?|text(?:ing)?|flick(?:ing)?|shoot(?:ing)?|get\s+it\s+(?:through|over))\b/i.test(draft)) throw new Error("cold-call draft did not offer to text or send the website");
    const finalQuestionMark = draft.lastIndexOf("?");
    if (finalQuestionMark < draft.length * 0.45) throw new Error("cold-call draft placed its next step too early");
  }
  return draft;
}

function validateFollowUp(value: unknown, facts: LeadFacts): string {
  const maxCharacters = 1400;
  const draft = draftText(value, maxCharacters);
  const words = wordCount(draft);
  if (draft.length < 30 || draft.length > maxCharacters || words < 25 || words > 120) throw new Error("follow-up draft length was invalid");
  if (/\[[^\]\r\n]+\]|\{[^}\r\n]+\}|<\s*(?:business|trade|location|preview|website|name)\b[^>]*>|\b(?:todo|tbd|insert\s+(?:name|details)|lorem ipsum|aida|attention\s*:|interest\s*:|desire\s*:|action\s*:|strategy|sales\s+analysis)\b/i.test(draft)) throw new Error("follow-up draft contained an unresolved placeholder or strategy label");
  const urls = draft.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || [];
  for (const candidate of urls) {
    const cleaned = candidate.replace(/[),.;!?]+$/, "");
    if (!facts.previewUrl || cleaned !== facts.previewUrl) throw new Error("follow-up draft contained an unapproved URL");
  }
  if (facts.previewUrl && !hasExactPreviewLinkLine(draft, facts.previewUrl)) throw new Error("follow-up draft did not place the exact private preview link on its own line");
  if (!facts.previewUrl && /\b(?:preview(?:\s+link)?|mock[- ]?up|private\s+(?:website|site|draft|concept)|website\s+concept|site\s+concept|already\s+(?:built|made)|put\s+together\s+(?:a\s+)?(?:private\s+)?(?:website|site))\b/i.test(stripDraftUrls(draft))) throw new Error("follow-up draft referred to an unavailable preview");
  if (facts.previewUrl && !hasTangiblePreviewReference(draft)) throw new Error("follow-up draft did not make the private concept tangible");
  if (!containsBusinessName(draft, facts)) throw new Error("follow-up draft did not name the saved business");
  if (!/\b(?:checking\s+in|following\s+up|did\s+you\s+get\s+a\s+chance|have\s+you\s+had\s+a\s+chance|had\s+a\s+look|looked\s+over|take\s+a\s+look|see\s+what\s+you\s+think|what\s+do\s+you\s+reckon|got\s+a\s+chance)\b/i.test(stripDraftUrls(draft))) throw new Error("follow-up draft was not a clear manual check-in");
  if ((draft.match(/\?/g) || []).length > 1) throw new Error("follow-up draft contained stacked questions");
  if (/\b(?:high[- ]?converting|lead\s+generation|digital\s+marketing|full[- ]?service|seamless|elevate|unlock|supercharge|guarantee(?:d)?|double|triple|proven|award[- ]?winning|best\s+in|number\s+one|#1|trusted\s+by|testimonials?|results?|limited\s+time|last\s+chance|act\s+now|no\s+risk|risk[- ]?free|urgent|exclusive)\b/i.test(draft)) throw new Error("follow-up draft contained a prohibited sales claim");
  if (hasUnsupportedSpecificFact(draft, facts)) throw new Error("follow-up draft contained an unsupported business claim");
  return draft;
}

function validSavedOutreachText(value: unknown): boolean {
  const normalized = text(value, 2600);
  if (normalized.length < 24) return false;
  return !/\[[^\]\r\n]+\]|\{[^}\r\n]+\}|<\s*(?:business|trade|location|preview|website|name)\b[^>]*>/i.test(normalized);
}

function readyToGoFor(lead: LeadRecord): boolean {
  const previewUrl = safePrivatePreview(lead.previewUrl, lead.clientSiteId);
  const pitchDm = text(lead.pitchDm, 1800);
  const followUpDm = text(lead.followUpDm, 1400);
  const coldCallPitch = text(lead.coldCallPitch, 2600);
  return Boolean(
    previewUrl
      && validSavedOutreachText(pitchDm)
      && hasExactPreviewLinkLine(pitchDm, previewUrl)
      && validSavedOutreachText(followUpDm)
      && hasExactPreviewLinkLine(followUpDm, previewUrl)
      && validSavedOutreachText(coldCallPitch),
  );
}

function extractResponse(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 5 || value === null || value === undefined) return null;
  if (typeof value === "string") {
    try { return extractResponse(JSON.parse(value.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "")), depth + 1); } catch { return null; }
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if ("pitchDm" in record || "followUpDm" in record || "coldCallPitch" in record) return record;
  for (const key of ["data", "output", "result"]) {
    const nested = extractResponse(record[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

function promptFor(facts: LeadFacts, useQuoteSearchAngle: boolean, needsPitch: boolean, needsFollowUp: boolean, needsCall: boolean): string {
  const verifiedHomepage = hasReachableHomepage(facts);
  const socialEvidence = hasSocialEvidence(facts);
  const quoteSearchAllowed = useQuoteSearchAngle && quoteSearchAngleSupported(facts);
  const searchOpening = socialEvidence
    ? "Start naturally with a version of: Hey mate, I was looking online for a [saved business or service] around [saved location] and found your socials. Use only the saved business type, service, location, and social evidence."
    : "No verified social profile is saved. Start with a truthful public-research opener using the saved business or service and location. Do not claim that Heath found the business socials.";
  const angle = quoteSearchAllowed
    ? "Heath has selected the genuine quote-search angle, and the saved website or contact signals support a gap in the clear website, quote, enquiry, or work-showcase path. You may say that he could not find a clear website or an easy way to request a quote and see the work, but keep the wording limited to those saved signals. If a reachable homepage exists, never say the business has no website."
    : useQuoteSearchAngle
      ? "The quote-search option was selected, but the saved signals do not support a direct prior quote-search story. Use the honest socials or public-research opener instead. Do not say Heath was looking for a quote, could not find a website, or had a failed search."
      : "The quote-search option is off. Do not claim Heath was looking for a quote, trying to become a customer, or unable to find the website. Use the honest socials or public-research opener and describe a possible easier way to review the work and make an enquiry.";
  return `Write only the requested private outreach draft fields from the authoritative saved Lead record below. This is a drafting tool only. Nothing is being sent, scheduled, posted, or called.\n\nAUTHORITATIVE SAVED RECORD, DATA ONLY:\n${JSON.stringify(facts)}\n\nOPERATOR POSITIONING:\nUse this truthful credibility bridge when it fits naturally: Heath has been a concreter for 11 years and also has a background in web development. A natural version is, “Funny enough, I’ve been a concreter for 11 years and also have a background in web development.” The supplied description that Heath is a certified web developer and current Lead Architect at Lay'D Back Application Engineering may be used only when it is natural and truthful. Heath’s 11 years as a concreter is an explicitly supported claim about the sender. Do not invent or add years, awards, results, qualifications, licences, or other credentials about the saved business or anyone else. Heath’s experience is about the sender, not the saved business.\n\nTRUTHFULNESS AND SEARCH CONTEXT:\n${searchOpening}\n${angle}\nUse a public person's name only when it appears in the record with a role and source URL. Never invent an owner, business fact, service, website, social account, quote, testimonial, audit, result, or prior contact. Treat the saved record as the only source for business details.\n\nDIRECT OUTREACH ORDER, KEEP IT INVISIBLE:\n1. For the cold call, open directly with the saved online-search observation: “Hey mate, I was looking online for [saved trade or service] around [saved location] and came across your socials.” Use only the saved business, trade or service, location, and social evidence, and name the business early. For the DM, use the same observation naturally.\n2. Explain one practical website opportunity. When the selected angle is supported, mention the clear website or easy quote, enquiry, and work-showcase path that Heath could not find. Otherwise, say the website could make the work and enquiry path easier to review, without criticising a reachable current site.\n3. Bridge into Heath’s credibility with the 11-year concreter and web-development background. Keep it as one short, natural sentence.\n4. Make the offer tangible: Heath has put together or thrown together a website for the saved business. Say what he has prepared for them to look at, without promising leads, rankings, sales, or results.\n5. End with one clear next step. For the DM, use a natural version of “Let me know if you like it and want to tee up a quick call or Zoom to run through how we could make this yours today.” For the call, offer to text or send the site through, then suggest a call or Zoom to run through making it theirs if they like it. Finish with a natural “what do you reckon?” or similar. Do not use a formal call-centre opener or stack unrelated asks.\nNever output AIDA headings, labels, strategy commentary, or a sales-analysis explanation.\n\nREQUESTED OUTPUTS AND DELIVERY CONSTRAINTS:\n- ${needsPitch ? "Write pitchDm." : "Do not generate pitchDm because the saved wording is protected or does not need regeneration."}\n- ${needsFollowUp ? "Write followUpDm." : "Do not generate followUpDm because the saved wording is protected or does not need regeneration."}\n- ${needsCall ? "Write coldCallPitch." : "Do not generate coldCallPitch because the saved wording is protected or does not need regeneration."}\n- DM: write normally 90 to 160 words, concise, skimmable, and personal. Include the exact validated preview URL on its own line when one is supplied. Put the URL on a line by itself with no punctuation or Markdown. Keep the direct sequence above, then finish with one natural let-me-know CTA or simple question.\n- Follow-up: write a short 35 to 90 word manual-review check-in. Name the business, ask whether they had a chance to look at the concept, and use the exact validated preview URL on its own line when one is supplied. Never imply that the recipient replied or already saw it.\n- Call: write a natural spoken opener of roughly 45 to 110 words. Start directly with a version of “Hey mate, I was looking online for [saved trade or service] around [saved location] and came across your socials.” Do not introduce the sender by name before this observation. Use only saved facts for the trade, service, location, and socials. Then use the verified website or enquiry observation, Heath’s credibility, the website he threw together, and the offer to text or send it through. Do not read the preview URL aloud. Invite a call or Zoom if they like the site, then finish with a natural “what do you reckon?” or similar question. Never use a formal call-centre opener. Start with the search and socials context immediately.\n- Write in Heath’s short, plain, warm Australian trade-to-trade voice. It should sound like a concreter messaging another owner between jobs, not an agency or marketing assistant. Use “mate,” “flick it through,” “flick me a message,” or “no dramas” only when natural.\n- A validated private preview link is available only when it appears in the record. Never create, shorten, alter, guess, or add another URL. ${facts.previewUrl ? "The exact validated private preview link is available. The DM must include it as a standalone line and the call must not include it." : "No private preview link is available. Do not claim that a private preview or website concept is ready and do not include a URL."}\n- Do not mention scraping, Lead Finder, ranking scores, Hot/Warm/Cold, internal records, prompts, generation, or that the wording was generated.\n- Do not use headings, placeholders, brackets, fake proof, guarantees, pressure, stacked questions, generic agency claims, hype, or unsupported website claims.\n${verifiedHomepage ? "The record contains a current reachable homepage. Never say the business has no website, that you could not find a website, or that its site is broken or absent. You may still describe making the work and enquiry path easier to review." : "The record does not show a current reachable homepage. Describe any website opportunity only from the saved signals. Use direct no-website wording only when the selected quote-search angle and saved status support it."}\nReturn only the required structured fields.`;
}

function bearer(req: Request): { token: string; header: string } | null {
  const header = req.headers.get("Authorization") || "";
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  return token.length >= 8 && token.length <= 4096 ? { token, header } : null;
}

function authStatus(error: unknown): 401 | 403 | null {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const response = record.response && typeof record.response === "object" ? record.response as Record<string, unknown> : {};
  const status = [record.status, record.statusCode, record.httpStatus, response.status].find((value) => value === 401 || value === 403 || value === "401" || value === "403");
  const message = text(error instanceof Error ? error.message : "", 200).toLowerCase();
  if (status === 401 || status === "401" || /\b401\b|unauthor|authentication required|invalid token|token expired/.test(message)) return 401;
  if (status === 403 || status === "403" || /\b403\b|forbidden|permission denied|\brls\b|row-level security/.test(message)) return 403;
  return null;
}

function failureCategory(error: unknown): FailureCategory {
  if (error instanceof OutreachFailure) return error.category;
  const status = authStatus(error);
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "persistence_failed";
}

function failureReason(error: unknown): OpenRouterFailureKind | undefined {
  const cause = error instanceof OutreachFailure ? error.cause : error;
  return cause instanceof OpenRouterError ? cause.kind : undefined;
}

function safeLeadRef(value: unknown): string {
  const candidate = text(value, 80);
  return /^[a-f0-9-]{8,80}$/i.test(candidate) ? candidate : "[redacted]";
}

function safeDiagnostic(error: unknown): string {
  const value = text(error instanceof Error ? error.message : "", 240);
  return value.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/#token=[a-f0-9]{64}/gi, "#token=[redacted]").replace(/https?:\/\/\S+/gi, "[url]").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]").replace(/\+?\d[\d\s().-]{7,}/g, "[phone]").slice(0, 180) || "operation_failed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  console.info("[generate-saved-lead-outreach] request_started", { method: req.method, hasAuthorization: Boolean(req.headers.get("Authorization")) });
  if (req.method !== "POST") {
    console.warn("[generate-saved-lead-outreach] request_rejected", { category: "invalid_request", reason: "method" });
    return jsonResponse({ success: false, status: "invalid_request", error: "Method not allowed, use POST." }, 405);
  }
  const auth = bearer(req);
  if (!auth) {
    console.warn("[generate-saved-lead-outreach] request_rejected", { category: "unauthorized", reason: "authorization" });
    return jsonResponse({ success: false, status: "unauthorized", error: "Authentication required. Refresh the page and sign in again." }, 401);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.warn("[generate-saved-lead-outreach] request_rejected", { category: "invalid_request", reason: "json" });
    return jsonResponse({ success: false, status: "invalid_request", error: "Request body must be JSON." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    console.warn("[generate-saved-lead-outreach] request_rejected", { category: "invalid_request", reason: "payload" });
    return jsonResponse({ success: false, status: "invalid_request", error: "Only leadId and useQuoteSearchAngle are accepted." }, 400);
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).length !== 2 || typeof input.leadId !== "string" || typeof input.useQuoteSearchAngle !== "boolean") {
    console.warn("[generate-saved-lead-outreach] request_rejected", { category: "invalid_request", reason: "payload_shape" });
    return jsonResponse({ success: false, status: "invalid_request", error: "Provide only a string leadId and boolean useQuoteSearchAngle." }, 400);
  }
  const leadId = input.leadId.trim();
  const useQuoteSearchAngle = input.useQuoteSearchAngle === true;
  if (!leadId || leadId.length > 200 || /[<>{}$]/.test(leadId)) {
    console.warn("[generate-saved-lead-outreach] request_rejected", { category: "invalid_request", reason: "lead_id" });
    return jsonResponse({ success: false, status: "invalid_request", error: "Invalid leadId." }, 400);
  }
  const appId = Deno.env.get("SUPERDEV_APP_ID");
  if (!appId) {
    console.error("[generate-saved-lead-outreach] request_failed", { category: "persistence_failed", reason: "configuration" });
    return jsonResponse({ success: false, status: "persistence_failed", error: "Outreach drafting is temporarily unavailable." }, 500);
  }
  const identity = createSuperdevClient({ appId });
  identity.auth.setToken(auth.token);
  console.info("[generate-saved-lead-outreach] caller_auth_started");
  let ownerEmail = "";
  try {
    const caller = await identity.auth.me();
    ownerEmail = normalizedEmail(caller?.email);
    if (!ownerEmail) {
      console.warn("[generate-saved-lead-outreach] caller_auth_failed", { category: "authentication_failed" });
      return jsonResponse({ success: false, status: "unauthorized", leadId, error: clientFailureMessage("unauthorized") }, 401);
    }
  } catch {
    console.warn("[generate-saved-lead-outreach] caller_auth_failed", { category: "authentication_failed" });
    return jsonResponse({ success: false, status: "unauthorized", leadId, error: clientFailureMessage("unauthorized") }, 401);
  }
  console.info("[generate-saved-lead-outreach] caller_auth_succeeded");
  const serviceRoleKey = Deno.env.get("SUPERDEV_SERVICE_ROLE_KEY")?.trim();
  if (!serviceRoleKey) {
    console.error("[generate-saved-lead-outreach] request_failed", { category: "persistence_failed", reason: "service_configuration" });
    return jsonResponse({ success: false, status: "persistence_failed", leadId, error: "Outreach drafting is temporarily unavailable." }, 500);
  }
  const data = createSuperdevClient({ appId });
  data.auth.setToken(serviceRoleKey);
  console.info("[generate-saved-lead-outreach] lead_lookup_started", { leadId: safeLeadRef(leadId) });
  let read: BoundedLeadRecords;
  try {
    read = await boundedLeadRecords(data, ownerEmail);
  } catch (error) {
    const status = authStatus(error);
    const category: FailureCategory = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "persistence_failed";
    console.error("[generate-saved-lead-outreach] lead_lookup_failed", { leadId: safeLeadRef(leadId), category, error: safeDiagnostic(error) });
    return jsonResponse({ success: false, status: category, leadId, error: clientFailureMessage(category) }, status || 500);
  }
  const lead = exactLead(read.records, leadId);
  if (!lead || !ownsRecord(lead, ownerEmail)) {
    console.warn("[generate-saved-lead-outreach] lead_not_found", { leadId: safeLeadRef(leadId) });
    return jsonResponse({ success: false, status: "not_found", leadId, error: "Saved lead not found. Refresh the studio and try again." }, 404);
  }
  console.info("[generate-saved-lead-outreach] lead_lookup_succeeded", { leadId: safeLeadRef(leadId), matchedLeadId: safeLeadRef(String(lead.id)), recordCount: read.records.length, truncated: read.truncated });
  try {
    const facts = factsFor(lead);
    const pitchEdited = lead.pitchDmEdited === true;
    const followUpEdited = lead.followUpDmEdited === true;
    const callEdited = lead.coldCallPitchEdited === true;
    const savedPitch = text(lead.pitchDm, 1800);
    const savedFollowUp = text(lead.followUpDm, 1400);
    const savedCall = text(lead.coldCallPitch, 2600);
    const needsPitch = !pitchEdited;
    const needsFollowUp = !followUpEdited;
    const needsCall = !callEdited;
    let generatedPitch = "";
    let generatedFollowUp = "";
    let generatedCall = "";
    if (needsPitch || needsFollowUp || needsCall) {
      console.info("[generate-saved-lead-outreach] generation_started", { leadId: safeLeadRef(leadId), needsPitch, needsCall });
      let response: Record<string, unknown>;
      try {
        response = await requestOpenRouterJson({ prompt: promptFor(facts, useQuoteSearchAngle, needsPitch, needsFollowUp, needsCall), schema: responseSchemaFor(needsPitch, needsFollowUp, needsCall), schemaName: "saved_lead_outreach", maxTokens: 1600, temperature: 0.8 });
      } catch (error) {
        if (error instanceof OpenRouterError) throw new OutreachFailure("generation_failed", providerFailureMessage(error), error);
        throw new OutreachFailure("generation_failed", "The outreach draft generator could not complete.", error);
      }
      const output = extractResponse(response);
      if (!output) throw new OutreachFailure("validation_failed", "The generated outreach drafts failed their safety checks.", new Error("structured_response_missing"));
      try {
        if (needsPitch) generatedPitch = validateGenerated(output.pitchDm, facts, "dm", useQuoteSearchAngle);
        if (needsFollowUp) generatedFollowUp = validateFollowUp(output.followUpDm, facts);
        if (needsCall) generatedCall = validateGenerated(output.coldCallPitch, facts, "call", useQuoteSearchAngle);
      } catch (error) {
        throw new OutreachFailure("validation_failed", "The generated outreach drafts failed their safety checks.", error);
      }
      console.info("[generate-saved-lead-outreach] generation_completed", { leadId: safeLeadRef(leadId), generatedPitch: needsPitch, generatedFollowUp: needsFollowUp, generatedCall: needsCall });
    }
    const finalPitch = pitchEdited ? savedPitch : generatedPitch;
    const finalFollowUp = followUpEdited ? savedFollowUp : generatedFollowUp;
    const finalCall = callEdited ? savedCall : generatedCall;
    try {
      await updateOwnedLead(data, ownerEmail, leadId, {
        pitchDm: finalPitch,
        followUpDm: finalFollowUp,
        coldCallPitch: finalCall,
        outreachVersion: OUTREACH_VERSION,
        pitchDmEdited: pitchEdited,
        followUpDmEdited: followUpEdited,
        coldCallPitchEdited: callEdited,
      });
    } catch (error) {
      const status = authStatus(error);
      throw new OutreachFailure(status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "persistence_failed", status ? clientFailureMessage(status === 401 ? "unauthorized" : "forbidden") : "The outreach drafts could not be saved.", error);
    }
    const saved = await ownedLead(data, ownerEmail, leadId);
    if (!saved) throw new OutreachFailure("persistence_failed", "The outreach drafts could not be confirmed after saving.");
    const readyToGo = readyToGoFor(saved);
    const storedPitch = text(saved.pitchDm, 1800);
    const storedFollowUp = text(saved.followUpDm, 1400);
    const storedCall = text(saved.coldCallPitch, 2600);
    console.info("[generate-saved-lead-outreach] completed", { leadId: safeLeadRef(leadId), status: "saved", generatedPitch: needsPitch, generatedFollowUp: needsFollowUp, generatedCall: needsCall, preservedPitch: pitchEdited, preservedFollowUp: followUpEdited, preservedCall: callEdited, previewAvailable: Boolean(facts.previewUrl), readyToGo });
    return jsonResponse({ success: true, status: "saved", leadId, pitchDm: storedPitch, followUpDm: storedFollowUp, coldCallPitch: storedCall, pitchDmEdited: saved.pitchDmEdited === true, followUpDmEdited: saved.followUpDmEdited === true, coldCallPitchEdited: saved.coldCallPitchEdited === true, outreachVersion: text(saved.outreachVersion, 160) || OUTREACH_VERSION, readyToGo, generated: { pitchDm: needsPitch, followUpDm: needsFollowUp, coldCallPitch: needsCall } });
  } catch (error) {
    const category = failureCategory(error);
    const failure = error instanceof OutreachFailure ? error : new OutreachFailure(category, clientFailureMessage(category), error);
    const failureReasonValue = failureReason(failure);
    console.error("[generate-saved-lead-outreach] request_failed", { leadId: safeLeadRef(leadId), category, reason: failureReasonValue, error: safeDiagnostic(failure.cause ?? failure) });
    const status = category === "unauthorized" ? 401 : category === "forbidden" ? 403 : 500;
    const responseBody: Record<string, unknown> = { success: false, status: category, error: failure.message || clientFailureMessage(category) };
    if (failureReasonValue) responseBody.reason = failureReasonValue;
    return jsonResponse(responseBody, status);
  }
});

```

## `functions/sync-leads-from-data-management.ts`

```ts
import { createSuperdevClient } from "npm:@superdevhq/client@0.1.5";

const SYNC_ACTION = "sync_missing_leads";
const MAX_RECORDS = 1000;
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin",
  "Content-Type": "application/json",
};

type RecordData = Record<string, any>;
type Identity = { key: string; businessName: string };

const COPY_FIELDS = [
  "businessName", "trade", "location", "phone", "email", "website", "websiteStatus", "instagramUrl", "facebookUrl",
  "tiktokUrl", "linkedinUrl", "googleBusinessUrl", "socialLinks", "contactDetails", "businessSummary", "services",
  "ownerName", "ownerRole", "ownerSourceUrl", "publicPeople", "researchSourceUrls", "leadKey", "status", "notes",
  "lastContactedAt", "contactMethod", "priority", "socialBio", "followerCount", "score", "leadCategory", "scoreReasons",
  "websiteSignals", "websiteLastCheckedAt",
] as const;
const STATUS_VALUES = new Set(["new", "contacted", "replied", "meeting", "won", "lost", "not_interested"]);
const PRIORITY_VALUES = new Set(["low", "medium", "high"]);
const WEBSITE_STATUS_VALUES = new Set(["none", "dodgy", "outdated", "good"]);
const CONTACT_METHOD_VALUES = new Set(["email", "phone", "dm", "in_person"]);
const CATEGORY_VALUES = new Set(["hot", "warm", "cold"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function text(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normalized(value: unknown): string {
  return text(value, 300).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizedLeadKey(value: unknown): string {
  return text(value, 600).toLowerCase().replace(/\s+/g, " ").trim();
}

function phoneDigits(value: unknown): string {
  const digits = text(value, 80).replace(/\D/g, "");
  return digits.startsWith("61") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
}

function validPhoneDigits(value: unknown): string {
  const digits = phoneDigits(value);
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

function safeUrl(value: unknown): string | undefined {
  const candidate = text(value, 500);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizedUrl(value: unknown): string {
  const candidate = safeUrl(value);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().toLowerCase();
  } catch {
    return "";
  }
}

function safeEmail(value: unknown): string | undefined {
  const candidate = text(value, 240).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate) ? candidate : undefined;
}

function safePhone(value: unknown): string | undefined {
  const candidate = text(value, 80);
  return validPhoneDigits(candidate) ? candidate : undefined;
}

function safeDate(value: unknown): string | undefined {
  const candidate = text(value, 120);
  const parsed = Date.parse(candidate);
  return candidate && Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function safeString(value: unknown, max = 1000): string | undefined {
  const candidate = text(value, max);
  return candidate || undefined;
}

function safeStringArray(value: unknown, maxItems = 24, maxText = 300): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const output: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const candidate = text(item, maxText);
    const key = candidate.toLowerCase();
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    output.push(candidate);
    if (output.length >= maxItems) break;
  }
  return output.length ? output : undefined;
}

function safeSocialLinks(value: unknown): RecordData[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const output: RecordData[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as RecordData;
    const url = safeUrl(record.url);
    const platform = safeString(record.platform, 80);
    if (!url || !platform || seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());
    output.push({ platform, url });
    if (output.length >= 24) break;
  }
  return output.length ? output : undefined;
}

function safeContactDetails(value: unknown): RecordData | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as RecordData;
  const output: RecordData = {};
  const phones = safeStringArray(record.phones, 16, 80)?.filter((item) => Boolean(validPhoneDigits(item)));
  const emails = safeStringArray(record.emails, 16, 240)?.map((item) => safeEmail(item)).filter(Boolean);
  const serviceAreas = safeStringArray(record.serviceAreas, 16, 180);
  if (phones?.length) output.phones = phones;
  if (emails?.length) output.emails = emails;
  const contactPageUrl = safeUrl(record.contactPageUrl); if (contactPageUrl) output.contactPageUrl = contactPageUrl;
  const bookingUrl = safeUrl(record.bookingUrl); if (bookingUrl) output.bookingUrl = bookingUrl;
  const physicalAddress = safeString(record.physicalAddress, 300); if (physicalAddress) output.physicalAddress = physicalAddress;
  if (serviceAreas?.length) output.serviceAreas = serviceAreas;
  const openingHours = safeString(record.openingHours, 500); if (openingHours) output.openingHours = openingHours;
  return Object.keys(output).length ? output : undefined;
}

function safePeople(value: unknown): RecordData[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const output: RecordData[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as RecordData;
    const name = safeString(record.name, 120);
    const role = safeString(record.role, 120);
    const sourceUrl = safeUrl(record.sourceUrl);
    const key = `${name?.toLowerCase() || ""}|${role?.toLowerCase() || ""}`;
    if (!name || !role || !sourceUrl || seen.has(key)) continue;
    seen.add(key);
    output.push({ name, role, sourceUrl });
    if (output.length >= 12) break;
  }
  return output.length ? output : undefined;
}

function safeSignals(value: unknown): RecordData | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const output: RecordData = {};
  for (const [key, item] of Object.entries(value as RecordData).slice(0, 40)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,80}$/.test(key)) continue;
    if (typeof item === "string") output[key] = text(item, 300);
    else if (typeof item === "number" && Number.isFinite(item)) output[key] = item;
    else if (typeof item === "boolean") output[key] = item;
  }
  return Object.keys(output).length ? output : undefined;
}

function copyPayload(source: RecordData): RecordData {
  const payload: RecordData = {};
  for (const field of COPY_FIELDS) {
    const value = source[field];
    if (value === undefined || value === null) continue;
    let safe: unknown;
    if (field === "businessName") safe = safeString(value, 240);
    else if (["website", "instagramUrl", "facebookUrl", "tiktokUrl", "linkedinUrl", "googleBusinessUrl", "ownerSourceUrl"].includes(field)) safe = safeUrl(value);
    else if (field === "email") safe = safeEmail(value);
    else if (field === "phone") safe = safePhone(value);
    else if (field === "socialLinks") safe = safeSocialLinks(value);
    else if (field === "contactDetails") safe = safeContactDetails(value);
    else if (["services", "researchSourceUrls"].includes(field)) safe = field === "researchSourceUrls" ? safeStringArray(value, 16, 500)?.map(safeUrl).filter(Boolean) : safeStringArray(value, 16, 240);
    else if (field === "publicPeople") safe = safePeople(value);
    else if (["lastContactedAt", "websiteLastCheckedAt"].includes(field)) safe = safeDate(value);
    else if (["status", "priority", "websiteStatus", "contactMethod", "leadCategory"].includes(field)) {
      const candidate = text(value, 80).toLowerCase();
      const allowed = field === "status" ? STATUS_VALUES : field === "priority" ? PRIORITY_VALUES : field === "websiteStatus" ? WEBSITE_STATUS_VALUES : field === "contactMethod" ? CONTACT_METHOD_VALUES : CATEGORY_VALUES;
      safe = allowed.has(candidate) ? candidate : undefined;
    } else if (["followerCount", "score"].includes(field)) {
      const number = Number(value);
      safe = Number.isFinite(number) && number >= 0 && number <= (field === "score" ? 100 : 1_000_000_000) ? number : undefined;
    } else if (field === "scoreReasons") safe = safeStringArray(value, 8, 240);
    else if (field === "websiteSignals") safe = safeSignals(value);
    else safe = safeString(value, ["businessSummary", "notes", "socialBio"].includes(field) ? 2000 : 500);
    if (safe !== undefined) payload[field] = safe;
  }
  payload.source = "data_management_sync";
  return payload;
}

function contactPhone(record: RecordData): string {
  const details = record.contactDetails && typeof record.contactDetails === "object" ? record.contactDetails : {};
  const values = [record.phone, ...(Array.isArray(details.phones) ? details.phones : [])];
  for (const value of values) {
    const digits = validPhoneDigits(value);
    if (digits) return digits;
  }
  return "";
}

function contactEmail(record: RecordData): string {
  const details = record.contactDetails && typeof record.contactDetails === "object" ? record.contactDetails : {};
  const values = [record.email, ...(Array.isArray(details.emails) ? details.emails : [])];
  for (const value of values) {
    const email = safeEmail(value);
    if (email) return email;
  }
  return "";
}

function identityFor(record: RecordData): Identity | null {
  const businessName = text(record.businessName, 240);
  const nameKey = normalized(businessName);
  if (!nameKey) return null;
  const leadKey = normalizedLeadKey(record.leadKey);
  if (leadKey) return { key: `lead_key:${leadKey}`, businessName };
  const phone = contactPhone(record);
  if (phone) return { key: `name_phone:${nameKey}|${phone}`, businessName };
  const email = contactEmail(record);
  if (email) return { key: `name_email:${nameKey}|${email}`, businessName };
  const website = normalizedUrl(record.website);
  if (website) return { key: `name_website:${nameKey}|${website}`, businessName };
  return null;
}

function bearer(req: Request): string | null {
  const match = (req.headers.get("Authorization") || "").trim().match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  return token.length >= 8 && token.length <= 4096 ? token : null;
}

function deliberateAction(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as RecordData;
  return Object.keys(body).length === 1 && body.action === SYNC_ACTION;
}

function recordList(value: unknown, depth = 0): RecordData[] | null {
  if (Array.isArray(value)) return value as RecordData[];
  if (!value || typeof value !== "object" || depth > 5) return null;
  const record = value as RecordData;
  for (const key of ["data", "records", "items", "leads"]) {
    const nested = recordList(record[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

type BoundedRecords = { records: RecordData[]; truncated: boolean };

async function recordsFor(entity: any): Promise<BoundedRecords> {
  const response = await entity.filter({});
  const records = recordList(response);
  if (!records) throw new Error("invalid_record_response");
  // filter({}) is the supported entity read path. Bound the returned records before validation, matching, or writing so a large source set never becomes an unbounded sync.
  const boundedRecords = records.slice(0, MAX_RECORDS);
  if (boundedRecords.some((record) => !record || typeof record !== "object" || Array.isArray(record))) throw new Error("invalid_record_response");
  return { records: boundedRecords, truncated: records.length > MAX_RECORDS };
}

function errorText(error: unknown, depth = 0): string {
  if (depth > 4) return "";
  if (error instanceof Error) return text(error.message, 300);
  if (typeof error === "string") return text(error, 300);
  if (!error || typeof error !== "object" || Array.isArray(error)) return "";
  const record = error as RecordData;
  for (const key of ["message", "error", "details", "code"]) if (typeof record[key] === "string") return text(record[key], 300);
  for (const key of ["response", "data", "body", "error"]) {
    if (!record[key] || typeof record[key] !== "object" || Array.isArray(record[key])) continue;
    const nested = errorText(record[key], depth + 1);
    if (nested) return nested;
  }
  return "";
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const record = error as RecordData;
  const response = record.response && typeof record.response === "object" ? record.response as RecordData : undefined;
  const responseData = response?.data && typeof response.data === "object" ? response.data as RecordData : undefined;
  const data = record.data && typeof record.data === "object" ? record.data as RecordData : undefined;
  const body = record.body && typeof record.body === "object" ? record.body as RecordData : undefined;
  for (const value of [record.status, record.statusCode, record.httpStatus, record.code, response?.status, response?.statusCode, responseData?.status, data?.status, body?.status]) {
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(number) && number >= 100 && number <= 599) return number;
  }
  return null;
}

function failureLabel(error: unknown): string {
  const value = `${errorStatus(error) || ""} ${errorText(error)}`.toLowerCase();
  if (/unauthor|authentication|invalid token|token expired|\b401\b/.test(value)) return "authentication_failed";
  if (/forbidden|permission|\brls\b|row[- ]level security|\b403\b/.test(value)) return "permission_denied";
  if (/invalid_record_response|invalid record|record response/.test(value)) return "invalid_record_response";
  if (/network|fetch|timeout|connection|\b5\d{2}\b/.test(value)) return "network_error";
  return "operation_failed";
}

function addReviewName(list: string[], value: unknown) {
  const name = text(value, 180);
  if (name && !list.includes(name) && list.length < 40) list.push(name);
}

function logStage(level: "info" | "warn" | "error", stage: string, details: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "boolean") safe[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (key === "category" && typeof value === "string") safe[key] = value.slice(0, 60);
  }
  const payload = { stage, ...safe };
  if (level === "error") console.error("[sync-leads-from-data-management] stage", payload);
  else if (level === "warn") console.warn("[sync-leads-from-data-management] stage", payload);
  else console.info("[sync-leads-from-data-management] stage", payload);
}

function failureResponse(status: string, message: string, httpStatus = 500) {
  return jsonResponse({ success: false, status, message }, httpStatus);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return failureResponse("invalid_request", "Method not allowed, use POST.", 405);

  const token = bearer(req);
  if (!token) return failureResponse("unauthorized", "Authentication required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return failureResponse("invalid_request", "Request body must be JSON.", 400);
  }
  if (!deliberateAction(body)) return failureResponse("invalid_request", "A deliberate missing-leads sync action is required.", 400);

  const appId = Deno.env.get("SUPERDEV_APP_ID");
  if (!appId) {
    logStage("error", "configuration_failed", { category: "configuration_error" });
    return failureResponse("configuration_error", "Data Management sync is temporarily unavailable.");
  }

  const caller = createSuperdevClient({ appId });
  caller.auth.setToken(token);
  let stage = "caller_lead_read";

  try {
    let user: any;
    try {
      user = await caller.auth.me();
    } catch (error) {
      logStage("warn", "caller_auth_failed", { category: failureLabel(error) });
      return failureResponse("unauthorized", "Authentication required.", 401);
    }
    if (!user || !text(user.email)) {
      logStage("warn", "caller_auth_failed", { category: "authentication_failed" });
      return failureResponse("unauthorized", "Authentication required.", 401);
    }

    logStage("info", "caller_auth_succeeded");
    const currentRead = await recordsFor(caller.entities.Lead);
    const currentRecords = currentRead.records;
    if (currentRead.truncated) {
      logStage("warn", "caller_lead_read_limited", { category: "record_limit" });
      return failureResponse("caller_read_limited", `Saved leads exceed the ${MAX_RECORDS}-record safety limit, so no records were changed.`, 409);
    }
    const currentKeys = new Set<string>();
    for (const record of currentRecords) {
      const identity = identityFor(record);
      if (identity) currentKeys.add(identity.key);
    }
    logStage("info", "caller_lead_read_succeeded", { recordCount: currentRecords.length, identityCount: currentKeys.size, truncated: currentRead.truncated });

    const serviceRoleKey = Deno.env.get("SUPERDEV_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      logStage("error", "configuration_failed", { category: "configuration_error" });
      return failureResponse("configuration_error", "Data Management sync is temporarily unavailable.");
    }

    stage = "source_lead_read";
    const service = createSuperdevClient({ appId });
    service.auth.setToken(serviceRoleKey);
    logStage("info", "source_lead_read_started");
    const sourceRead = await recordsFor(service.entities.Lead);
    const sourceRecords = sourceRead.records;
    logStage("info", "source_lead_read_succeeded", { recordCount: sourceRecords.length, truncated: sourceRead.truncated });

    stage = "matching";
    const skippedNames: string[] = [];
    const ambiguousNames: string[] = [];
    const failedNames: string[] = [];
    const sourceGroups = new Map<string, { identity: Identity; records: RecordData[] }>();
    let skippedCount = 0;
    for (const source of sourceRecords) {
      const identity = identityFor(source);
      if (!identity) {
        skippedCount += 1;
        addReviewName(skippedNames, source.businessName);
        continue;
      }
      const group = sourceGroups.get(identity.key);
      if (group) group.records.push(source);
      else sourceGroups.set(identity.key, { identity, records: [source] });
    }
    logStage("info", "matching_started", { scannedCount: sourceRecords.length, usableIdentityCount: sourceGroups.size, skippedCount });

    let alreadyPresentCount = 0;
    let ambiguousCount = 0;
    let syncedCount = 0;
    let failedCount = 0;
    stage = "caller_create";
    for (const group of sourceGroups.values()) {
      if (currentKeys.has(group.identity.key)) {
        alreadyPresentCount += group.records.length;
        continue;
      }
      if (group.records.length > 1) {
        ambiguousCount += group.records.length;
        addReviewName(ambiguousNames, group.identity.businessName);
        continue;
      }

      const source = group.records[0];
      let payload: RecordData;
      try {
        payload = copyPayload(source);
      } catch (error) {
        failedCount += 1;
        addReviewName(failedNames, group.identity.businessName);
        logStage("warn", "payload_validation_failed", { category: failureLabel(error) });
        continue;
      }
      if (!text(payload.businessName, 240)) {
        failedCount += 1;
        addReviewName(failedNames, group.identity.businessName);
        continue;
      }

      try {
        await caller.entities.Lead.create(payload);
        currentKeys.add(group.identity.key);
        syncedCount += 1;
      } catch (error) {
        failedCount += 1;
        addReviewName(failedNames, group.identity.businessName);
        logStage("warn", "caller_create_failed", { category: failureLabel(error) });
      }
    }

    const partial = sourceRead.truncated || skippedCount > 0 || ambiguousCount > 0 || failedCount > 0;
    const limitMessage = sourceRead.truncated ? ` The first ${MAX_RECORDS} source records were scanned because of the safety limit.` : "";
    logStage("info", "sync_completed", { scannedCount: sourceRecords.length, syncedCount, alreadyPresentCount, skippedCount, ambiguousCount, failedCount, truncated: sourceRead.truncated });
    return jsonResponse({
      success: true,
      status: partial ? "partial" : "complete",
      scannedCount: sourceRecords.length,
      recordLimit: MAX_RECORDS,
      sourceTruncated: sourceRead.truncated,
      syncedCount,
      alreadyPresentCount,
      skippedCount,
      ambiguousCount,
      failedCount,
      skippedNames,
      ambiguousNames,
      failedNames,
      message: partial ? `Data Management sync completed with items needing review.${limitMessage}` : `Data Management sync completed. Missing leads were copied into Saved Lead Studio.${limitMessage}`,
    });
  } catch (error) {
    const category = failureLabel(error);
    logStage("error", `${stage}_failed`, { category });
    if (category === "authentication_failed" && stage !== "source_lead_read") return failureResponse("unauthorized", "Authentication required.", 401);
    if (category === "permission_denied") return failureResponse("permission_denied", "This workspace cannot access the requested lead records.", 403);
    if (stage === "caller_lead_read") return failureResponse("caller_read_failed", "Saved leads could not be checked safely. Refresh Saved Lead Studio and try again.");
    if (stage === "source_lead_read") return failureResponse("source_lookup_failed", "Data Management lead records could not be read safely. Refresh Saved Lead Studio and try again.", 502);
    if (stage === "matching") return failureResponse("match_failed", "Missing leads could not be matched safely. Refresh Saved Lead Studio and try again.");
    return failureResponse("create_failed", "The sync could not save missing leads. Refresh Saved Lead Studio and try again.");
  }
});

```

### `functions/import-social-profile.ts`

```ts
import { createSuperdevClient } from "npm:@superdevhq/client@0.1.56";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin",
  "Content-Type": "application/json",
};

const MAX_IMAGE_URLS = 16;
const MAX_HTML_BYTES = 1_500_000;
const MAX_CACHE_ATTEMPTS = 6;
const MAX_IMAGE_BYTES = 3_000_000;
const IMAGE_FETCH_TIMEOUT_MS = 6_000;
const MAX_IMAGE_REDIRECTS = 2;
const MAX_WEBSITE_HEADINGS = 8;
const MAX_WEBSITE_METADATA = 12;
const MAX_WEBSITE_LINKS = 16;
const MAX_WEBSITE_NAMES = 8;
const MAX_WEBSITE_BODY_CHARS = 25_000;
const MAX_WEBSITE_SOURCE_CHARS = 32_000;
const MIN_WEBSITE_BODY_CHARS = 120;

type SourceName = "facebook" | "instagram" | "google" | "website";
type MediaCandidate = {
  url: string;
  priority: number;
  signal: string;
  explicitLogo: boolean;
  profileSignal: boolean;
  socialProfileMetadata: boolean;
  order: number;
};
type ExtractedMedia = {
  imageUrls: string[];
  logoImageUrl: string;
  logoPriority: number;
  logoSignal: string;
  candidates: MediaCandidate[];
};
type ScrapedResult = {
  url: string;
  source: SourceName;
  ok: boolean;
  text: string;
  imageUrls: string[];
  logoImageUrl: string;
  logoPriority: number;
  logoSignal: string;
  candidates: MediaCandidate[];
  warning?: string;
  error?: string;
  identityMatched?: boolean;
  identityUrlMatched?: boolean;
  identityTextMatched?: boolean;
  identityReason?: string;
  websiteEvidence?: WebsiteEvidence;
};
type SourceRequest = { source: SourceName; rawUrl: string; url: string };
type AssetRecord = { url: string; source: SourceName; priority: number; order: number };
type ExpectedIdentity = {
  raw: string;
  normalized: string;
  tokens: string[];
  uniqueTokens: string[];
  sharedTradeWords: string[];
};
type IdentityCheck = {
  identityMatched: boolean;
  identityUrlMatched: boolean;
  identityTextMatched: boolean;
  identityReason: string;
};
type SourceDiagnostic = { source: SourceName | "identity"; url: string; message: string };
type WebsiteMetadataRecord = { key: string; value: string };
type WebsiteLinkRecord = { url: string; label: string; rel: string };
type WebsiteEvidence = {
  title: string;
  headings: string[];
  metadata: WebsiteMetadataRecord[];
  organizationNames: string[];
  links: WebsiteLinkRecord[];
  bodyText: string;
};
type WebsiteDiagnosticStatus = "absent" | "verified" | "rejected" | "failed";
type WebsiteDiagnostic = {
  source: "website";
  status: WebsiteDiagnosticStatus;
  url: string;
  message: string;
};

function emptyWebsiteDiagnostic(): WebsiteDiagnostic {
  return {
    source: "website",
    status: "absent",
    url: "",
    message: "No existing website was submitted.",
  };
}

const IDENTITY_STOP_WORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to",
  "official", "page", "pages", "profile", "website", "www", "com", "net", "org", "category", "maps", "place", "search", "directory", "public", "user", "people", "story", "reel", "groups",
]);
const SHARED_TRADE_SERVICE_WORDS = new Set([
  "business", "builder", "builders", "building", "carpentry", "civil", "company", "concrete",
  "concreting", "construction", "contractor", "contractors", "demolition", "driveway", "driveways",
  "earthmoving", "earthwork", "electrical", "excavation", "excavating", "landscape", "landscaping",
  "local", "painting", "plumbing", "renovation", "renovations", "rendering", "roofing", "service",
  "services", "trade", "trades", "works",
]);
const IDENTITY_GENERIC_WORDS = new Set([
  ...IDENTITY_STOP_WORDS,
  ...SHARED_TRADE_SERVICE_WORDS,
  "co", "group", "inc", "limited", "llc", "ltd", "pty", "team", "solutions",
]);
const BUSINESS_CONTEXT_PATTERN = [...SHARED_TRADE_SERVICE_WORDS]
  .sort((a, b) => b.length - a.length)
  .map((word) => word)
  .join("|");

function normalizeIdentityText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function normalizeIdentityTextSafe(value: string) {
  const output: string[] = [];
  for (const character of value.normalize("NFKD")) {
    const code = character.codePointAt(0) || 0;
    if (code >= 0x300 && code <= 0x36f) continue;
    if (character === "&") {
      output.push(" ", "a", "n", "d", " ");
      continue;
    }
    const lower = character.toLowerCase();
    const lowerCode = lower.codePointAt(0) || 0;
    output.push(lowerCode >= 97 && lowerCode <= 122 || lowerCode >= 48 && lowerCode <= 57 ? lower : " ");
  }
  return output.join("").split(" ").filter(Boolean).join(" ");
}

function compactIdentitySafe(value: string) {
  return normalizeIdentityTextSafe(value).split(" ").join("");
}

function identityTokens(value: string) {
  return normalizeIdentityTextSafe(value).split(" ").filter(Boolean);
}

function sharedTradeServiceWords(value: string) {
  return [...new Set(identityTokens(value).filter((token) => SHARED_TRADE_SERVICE_WORDS.has(token)))];
}

function parseExpectedIdentity(value: unknown): ExpectedIdentity | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = normalizeIdentityTextSafe(raw);
  if (!normalized) return { raw, normalized: "", tokens: [], uniqueTokens: [], sharedTradeWords: [] };
  const tokens = identityTokens(raw);
  const sharedTradeWords = sharedTradeServiceWords(raw);
  const uniqueTokens = [...new Set(tokens.filter((token) => token.length >= 3 && !IDENTITY_GENERIC_WORDS.has(token)))];
  return { raw, normalized, tokens, uniqueTokens, sharedTradeWords };
}

function socialPathTokens(value: string) {
  try {
    const parsed = new URL(value);
    const selectedParts = [parsed.pathname];
    ["q", "query", "place", "title", "business"].forEach((key) => {
      const queryValue = parsed.searchParams.get(key);
      if (queryValue) selectedParts.push(queryValue);
    });
    return identityTokens(decodeURIComponent(selectedParts.join(" ")));
  } catch {
    return identityTokens(value);
  }
}

function compactIdentity(value: string) {
  return normalizeIdentityText(value).replace(/\\s+/g, "");
}

function matchesIdentityToken(expectedToken: string, sourceTokens: string[], sourceText: string) {
  if (sourceTokens.includes(expectedToken)) return true;
  const compactExpected = compactIdentitySafe(expectedToken);
  if (compactExpected.length < 4) return false;
  const compactSource = compactIdentitySafe(sourceText);
  if (compactSource.includes(compactExpected)) return true;
  return sourceTokens.some((token) => {
    if (!token.startsWith(compactExpected)) return false;
    const suffix = token.slice(compactExpected.length);
    return suffix === "s" || SHARED_TRADE_SERVICE_WORDS.has(suffix);
  });
}

function matchesExpectedIdentity(value: string, expected: ExpectedIdentity, allowGenericPhrase = true) {
  const normalized = normalizeIdentityTextSafe(value);
  if (!normalized) return false;
  const tokens = identityTokens(value);
  if (expected.uniqueTokens.length === 0) {
    return allowGenericPhrase && expected.tokens.length >= 2 && normalized.includes(expected.normalized);
  }
  const matchedUniqueTokens = expected.uniqueTokens.filter((token) => matchesIdentityToken(token, tokens, normalized));
  const minimumMatches = expected.uniqueTokens.length <= 2 ? 1 : Math.ceil(expected.uniqueTokens.length * 0.6);
  return matchedUniqueTokens.length >= minimumMatches;
}

function matchesExpectedSourcePath(value: string, expected: ExpectedIdentity) {
  if (expected.uniqueTokens.length === 0) return false;
  const pathTokens = socialPathTokens(value);
  const pathText = pathTokens.join(" ");
  return expected.uniqueTokens.some((token) => matchesIdentityToken(token, pathTokens, pathText));
}

function isCandidateIdentityToken(token: string) {
  const hasLetter = token.split("").some((character) => character >= "a" && character <= "z");
  return token.length >= 4 && hasLetter && !IDENTITY_GENERIC_WORDS.has(token);
}

function hasConflictingBusinessName(text: string, expected: ExpectedIdentity) {
  if (!text || expected.uniqueTokens.length === 0 || !BUSINESS_CONTEXT_PATTERN) return false;
  const pattern = new RegExp(`\\\\b((?:[A-Z][A-Za-z0-9'’.-]{2,})(?:\\\\s+(?:[A-Z][A-Za-z0-9'’.-]{2,}|&)){0,3})\\\\s+(?:${BUSINESS_CONTEXT_PATTERN})\\\\b`, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const candidateTokens = identityTokens(match[1]);
    const hasExpectedToken = expected.uniqueTokens.some((expectedToken) => candidateTokens.some((candidateToken) => matchesIdentityToken(expectedToken, [candidateToken], candidateToken)));
    const hasForeignToken = candidateTokens.some((candidateToken) => isCandidateIdentityToken(candidateToken) && !expected.uniqueTokens.some((expectedToken) => matchesIdentityToken(expectedToken, [candidateToken], candidateToken)));
    if (hasForeignToken && !hasExpectedToken) return true;
  }
  return false;
}

function hasConflictingSourcePath(value: string, expected: ExpectedIdentity) {
  if (expected.uniqueTokens.length === 0) return false;
  const tokens = socialPathTokens(value);
  const hasExpectedToken = expected.uniqueTokens.some((expectedToken) => tokens.some((token) => matchesIdentityToken(expectedToken, [token], token)));
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const isSocialProfilePath = host.includes("facebook.") || host.includes("instagram.") || path.includes("/place/") || path.includes("/business/") || path.includes("/profile/");
    if (isSocialProfilePath) {
      const firstIdentityToken = tokens.find(isCandidateIdentityToken);
      if (firstIdentityToken && !expected.uniqueTokens.some((expectedToken) => matchesIdentityToken(expectedToken, [firstIdentityToken], firstIdentityToken))) return true;
    }
  } catch {
    // The source URL was normalized before this check, so malformed values remain unverified.
  }
  for (let index = 0; index < tokens.length; index += 1) {
    if (!SHARED_TRADE_SERVICE_WORDS.has(tokens[index])) continue;
    const nearby = tokens.slice(Math.max(0, index - 2), Math.min(tokens.length, index + 3));
    const nearbyExpected = expected.uniqueTokens.some((expectedToken) => nearby.some((token) => matchesIdentityToken(expectedToken, [token], token)));
    const nearbyForeign = nearby.some((token) => isCandidateIdentityToken(token) && !expected.uniqueTokens.some((expectedToken) => matchesIdentityToken(expectedToken, [token], token)));
    if (nearbyForeign && !nearbyExpected && !hasExpectedToken) return true;
  }
  return false;
}

function looksLikeNamedIdentityWord(value: string) {
  const first = value.trim().charCodeAt(0) || 0;
  return first >= 65 && first <= 90;
}

function hasConflictingBusinessNameSafe(text: string, expected: ExpectedIdentity) {
  if (!text || expected.uniqueTokens.length === 0) return false;
  const words = text.split(" ").filter(Boolean);
  for (let index = 0; index < words.length; index += 1) {
    const sharedWord = identityTokens(words[index])[0] || "";
    if (!SHARED_TRADE_SERVICE_WORDS.has(sharedWord)) continue;
    const nearby = words.slice(Math.max(0, index - 2), index);
    for (const candidateWord of nearby) {
      if (!looksLikeNamedIdentityWord(candidateWord)) continue;
      const candidateTokens = identityTokens(candidateWord);
      const hasExpectedToken = expected.uniqueTokens.some((expectedToken) => candidateTokens.some((candidateToken) => matchesIdentityToken(expectedToken, [candidateToken], candidateToken)));
      const hasForeignToken = candidateTokens.some((candidateToken) => isCandidateIdentityToken(candidateToken) && !expected.uniqueTokens.some((expectedToken) => matchesIdentityToken(expectedToken, [candidateToken], candidateToken)));
      if (hasForeignToken && !hasExpectedToken) return true;
    }
  }
  return false;
}

function verifySourceIdentity(result: ScrapedResult, expected: ExpectedIdentity): IdentityCheck {
  if (!result.ok) {
    return {
      identityMatched: false,
      identityUrlMatched: false,
      identityTextMatched: false,
      identityReason: "Source could not be read, so its business identity remains unverified.",
    };
  }
  const identityUrlMatched = matchesExpectedSourcePath(result.url, expected);
  const identityTextMatched = matchesExpectedIdentity(result.text, expected);
  const conflictingIdentity = hasConflictingBusinessNameSafe(result.text, expected) || hasConflictingSourcePath(result.url, expected);
  if (conflictingIdentity) {
    return {
      identityMatched: false,
      identityUrlMatched,
      identityTextMatched,
      identityReason: "Source contains a conflicting business identity and was excluded.",
    };
  }
  if (identityUrlMatched || identityTextMatched) {
    return {
      identityMatched: true,
      identityUrlMatched,
      identityTextMatched,
      identityReason: identityUrlMatched && identityTextMatched ? "Expected identity verified by source path and readable text." : identityUrlMatched ? "Expected identity verified by source path." : "Expected identity verified by readable text.",
    };
  }
  return {
    identityMatched: false,
    identityUrlMatched,
    identityTextMatched,
    identityReason: "Source path and readable text did not verify the expected business identity.",
  };
}

function expectedIdentityDiagnostic(expected: ExpectedIdentity): SourceDiagnostic {
  return {
    source: "identity",
    url: "",
    message: `Expected business identity "${expected.raw}" could not be verified from any supplied source; source text and media were excluded.`,
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#x2f;/gi, "/")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\\d+);/g, (_, code) => {
      try { return String.fromCodePoint(Number(code)); } catch { return ""; }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try { return String.fromCodePoint(parseInt(code, 16)); } catch { return ""; }
    });
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\s+/g, " ")
    .trim()
    .slice(0, 25_000);
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\\\b${name}\\\\s*=\\\\s*(?:"([^"]*)"|'([^']*)'|([^\\\\s>]+))`, "i"));
  return decodeHtmlEntities((match?.[1] || match?.[2] || match?.[3] || "").trim());
}

function isUnsafeHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\\[|\\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.includes(":")) return true;
  if (!/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function safePublicHttpUrl(value: unknown, baseUrl = "") {
  if (typeof value !== "string") return "";
  const candidate = decodeHtmlEntities(value.trim());
  if (!candidate || /^(?:data|blob|javascript):/i.test(candidate)) return "";
  try {
    const parsed = new URL(candidate, baseUrl || undefined);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || isUnsafeHostname(parsed.hostname)) return "";
    const lower = parsed.toString().toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (/\\.(?:svg|ico)$/i.test(path)) return "";
    if (/(?:pixel|tracker|beacon|spacer|transparent|favicon|spinner)/i.test(lower)) return "";
    if (/google.*\\/maps\\/vt/i.test(lower)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeSourceUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const candidate = decodeHtmlEntities(value.trim());
  if (!candidate || /^(?:data|blob|javascript):/i.test(candidate)) return "";
  let withScheme = candidate;
  if (candidate.startsWith("//")) {
    withScheme = `https:${candidate}`;
  } else if (!/^[a-z][a-z\\d+.-]*:\/\\//i.test(candidate)) {
    if (!/^(?:www\\.)?[a-z\\d][a-z\\d.-]*(?::\\d+)?(?:[/?#]|$)/i.test(candidate)) return "";
    withScheme = `https://${candidate}`;
  }
  return safePublicHttpUrl(withScheme);
}

function logoSignalText(value: string) {
  return /\\b(?:logo|brand[-_\\s]?mark)\\b/i.test(value);
}

function profileSignalText(value: string) {
  return /\\b(?:avatar|profile(?:[-_\\s]?(?:picture|photo|image))?|user[-_\\s]?(?:avatar|photo|image)|account[-_\\s]?(?:avatar|photo|image)|headshot)\\b/i.test(value);
}

function extractMedia(html: string, baseUrl: string, source: SourceName): ExtractedMedia {
  const candidates: MediaCandidate[] = [];
  const byUrl = new Map<string, MediaCandidate>();
  let order = 0;

  const add = (value: unknown, options: { signal: string; priority?: number; explicitLogo?: boolean; profileSignal?: boolean; socialProfileMetadata?: boolean }) => {
    const url = safePublicHttpUrl(value, baseUrl);
    if (!url) return;
    const explicitLogo = Boolean(options.explicitLogo);
    const profileSignal = Boolean(options.profileSignal);
    const socialProfileMetadata = Boolean(options.socialProfileMetadata);
    const priority = explicitLogo ? 120 : profileSignal ? 110 : socialProfileMetadata ? 94 : options.priority ?? 42;
    const existing = byUrl.get(url);
    if (existing) {
      if (priority > existing.priority || explicitLogo || profileSignal || socialProfileMetadata) {
        existing.priority = Math.max(existing.priority, priority);
        existing.signal = priority >= existing.priority ? options.signal : existing.signal;
        existing.explicitLogo = existing.explicitLogo || explicitLogo;
        existing.profileSignal = existing.profileSignal || profileSignal;
        existing.socialProfileMetadata = existing.socialProfileMetadata || socialProfileMetadata;
      }
      return;
    }
    const candidate: MediaCandidate = { url, priority, signal: options.signal, explicitLogo, profileSignal, socialProfileMetadata, order: order++ };
    if (candidates.length >= MAX_IMAGE_URLS) {
      let weakestIndex = 0;
      candidates.forEach((item, index) => {
        if (item.priority < candidates[weakestIndex].priority || (item.priority === candidates[weakestIndex].priority && item.order > candidates[weakestIndex].order)) weakestIndex = index;
      });
      if (candidate.priority <= candidates[weakestIndex].priority) return;
      byUrl.delete(candidates[weakestIndex].url);
      candidates.splice(weakestIndex, 1);
    }
    byUrl.set(url, candidate);
    candidates.push(candidate);
  };

  const addSrcset = (value: string, options: Parameters<typeof add>[1]) => {
    value.split(",").slice(0, 8).forEach((candidate) => add(candidate.trim().split(/\\s+/)[0], options));
  };

  const metaRe = /<meta\\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRe.exec(html)) !== null) {
    const tag = match[0];
    const key = (attr(tag, "property") || attr(tag, "name") || attr(tag, "itemprop")).toLowerCase().trim();
    const content = attr(tag, "content");
    const explicitLogo = /^(?:og:logo|logo|organization:logo|brand:logo)$/i.test(key);
    const profileSignal = profileSignalText(key);
    const socialProfileMetadata = (source === "facebook" || source === "instagram") && /^(?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)$/i.test(key);
    const imageMetadata = /^(?:og:image(?::secure_url|:url)?|twitter:image(?::src)?|image(?::url)?|thumbnail|thumbnailurl)$/i.test(key);
    if (explicitLogo || profileSignal || imageMetadata) {
      add(content, { signal: explicitLogo ? "explicit-logo-metadata" : profileSignal ? "profile-metadata" : socialProfileMetadata ? "social-profile-metadata" : "image-metadata", priority: imageMetadata ? 72 : 60, explicitLogo, profileSignal, socialProfileMetadata });
    }
  }

  const linkRe = /<link\\b[^>]*>/gi;
  while ((match = linkRe.exec(html)) !== null) {
    const tag = match[0];
    const rel = attr(tag, "rel");
    const context = `${rel} ${attr(tag, "class")} ${attr(tag, "id")} ${attr(tag, "title")}`;
    if (logoSignalText(context)) add(attr(tag, "href"), { signal: "explicit-logo-link", explicitLogo: true });
    else if (profileSignalText(context)) add(attr(tag, "href"), { signal: "profile-link", profileSignal: true });
  }

  const imageAttrs = ["src", "srcset", "data-src", "data-lazy-src", "data-original", "data-image", "data-avatar", "data-profile-picture"];
  const imgRe = /<(?:img|source)\\b[^>]*>/gi;
  while ((match = imgRe.exec(html)) !== null) {
    const tag = match[0];
    const attributeContext = imageAttrs.filter((name) => Boolean(attr(tag, name))).join(" ");
    const context = `${attr(tag, "alt")} ${attr(tag, "class")} ${attr(tag, "id")} ${attr(tag, "title")} ${attributeContext}`;
    const explicitLogo = logoSignalText(context);
    const profileSignal = profileSignalText(context);
    imageAttrs.forEach((name) => {
      const value = attr(tag, name);
      if (!value) return;
      const options = { signal: explicitLogo ? "explicit-logo-markup" : profileSignal ? "profile-markup" : name.startsWith("data-") ? "lazy-markup" : "markup", priority: name.startsWith("data-") ? 38 : 44, explicitLogo, profileSignal };
      if (name === "srcset") addSrcset(value, options); else add(value, options);
    });
  }

  const dataRe = /\\b(data-(?:src|lazy-src|original|image|avatar|profile-picture))\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))/gi;
  while ((match = dataRe.exec(html)) !== null) {
    const name = match[1] || "";
    const value = match[2] || match[3] || match[4] || "";
    const profileSignal = profileSignalText(name);
    add(value, { signal: profileSignal ? "profile-data-attribute" : "lazy-data-attribute", priority: profileSignal ? 108 : 36, profileSignal });
  }

  const srcsetRe = /\\bsrcset\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))/gi;
  while ((match = srcsetRe.exec(html)) !== null) {
    addSrcset(match[1] || match[2] || match[3] || "", { signal: "srcset", priority: 40 });
  }

  const backgroundRe = /background(?:-image)?\\s*:\\s*[^;{}]*url\\(\\s*["']?([^"')]+)["']?\\s*\\)/gi;
  while ((match = backgroundRe.exec(html)) !== null) add(match[1], { signal: "background-image", priority: 24 });

  const jsonLdRe = /<script\\b[^>]*type\\s*=\\s*["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi;
  const visitJson = (value: unknown, key = "", context = { logo: false, profile: false, media: false }) => {
    const normalizedKey = key.toLowerCase().replace(/[ _-]/g, "");
    const stringContext = {
      logo: context.logo || normalizedKey === "logo" || normalizedKey === "brandmark",
      profile: context.profile || /^(?:avatar|profile(?:picture|photo|image)|user(?:avatar|photo|image))$/.test(normalizedKey),
      media: context.media || ["image", "contenturl", "thumbnailurl"].includes(normalizedKey),
    };
    if (typeof value === "string") {
      if (stringContext.logo || stringContext.profile || stringContext.media) {
        add(value, { signal: stringContext.logo ? "explicit-logo-jsonld" : stringContext.profile ? "profile-jsonld" : "image-jsonld", priority: stringContext.logo ? 120 : stringContext.profile ? 110 : 58, explicitLogo: stringContext.logo, profileSignal: stringContext.profile });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visitJson(item, key, context));
      return;
    }
    if (!value || typeof value !== "object") return;
    const objectKey = key.toLowerCase().replace(/[\\s_-]/g, "");
    const nextContext = {
      logo: context.logo || objectKey === "logo" || objectKey === "brandmark",
      profile: context.profile || /^(?:avatar|profile(?:picture|photo|image)|user(?:avatar|photo|image))$/.test(objectKey),
      media: context.media || ["image", "contenturl", "thumbnailurl"].includes(objectKey),
    };
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => visitJson(childValue, childKey, nextContext));
  };
  while ((match = jsonLdRe.exec(html)) !== null) {
    try { visitJson(JSON.parse(decodeHtmlEntities(match[1].trim()))); } catch { /* Other public media paths remain usable. */ }
  }

  const ordered = candidates.slice().sort((a, b) => b.priority - a.priority || a.order - b.order);
  const logoCandidate = ordered.find((candidate) => candidate.explicitLogo)
    || ordered.find((candidate) => candidate.profileSignal)
    || ((source === "facebook" || source === "instagram") ? ordered.find((candidate) => candidate.socialProfileMetadata) : undefined);
  return {
    imageUrls: ordered.map((candidate) => candidate.url).slice(0, MAX_IMAGE_URLS),
    logoImageUrl: logoCandidate?.url || "",
    logoPriority: logoCandidate?.priority || 0,
    logoSignal: logoCandidate?.signal || "",
    candidates: ordered.slice(0, MAX_IMAGE_URLS),
  };
}

function extractWebsiteEvidence(html: string, baseUrl: string): WebsiteEvidence {
  const clean = (value: string, max: number) => stripHtml(value).slice(0, max);
  const title = clean(html.match(new RegExp("<title[^>]*>([^]*?)</title>", "i"))?.[1] || "", 360);
  const headings: string[] = [];
  const headingRe = new RegExp("<h[1-3][^>]*>([^]*?)</h[1-3]>", "gi");
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null && headings.length < MAX_WEBSITE_HEADINGS) {
    const heading = clean(match[1] || "", 240);
    if (heading && !headings.includes(heading)) headings.push(heading);
  }

  const metadata: WebsiteMetadataRecord[] = [];
  const metadataKeys = new Set([
    "description", "og:title", "og:description", "og:site_name", "twitter:title", "twitter:description",
    "application-name", "author", "name", "legalname", "brand",
  ]);
  const metaRe = new RegExp("<meta[^>]*>", "gi");
  while ((match = metaRe.exec(html)) !== null && metadata.length < MAX_WEBSITE_METADATA) {
    const tag = match[0];
    const key = (attr(tag, "property") || attr(tag, "name") || attr(tag, "itemprop")).toLowerCase().trim();
    const value = compactWebsiteText(attr(tag, "content"), 360);
    if (!key || !value || !metadataKeys.has(key)) continue;
    if (!metadata.some((item) => item.key === key && item.value === value)) metadata.push({ key, value });
  }

  const organizationNames: string[] = [];
  const jsonLdRe = new RegExp("<script[^>]*type[ =]*[\"']application/ld\\+json[\"'][^>]*>([^]*?)</script>", "gi");
  const visitJson = (value: unknown, key = "", depth = 0) => {
    if (depth > 5 || organizationNames.length >= MAX_WEBSITE_NAMES) return;
    const normalizedKey = key.toLowerCase().replace(/[ _-]/g, "");
    if (typeof value === "string") {
      if (["name", "legalname", "alternatename"].includes(normalizedKey)) {
        const name = compactWebsiteText(value, 360);
        if (name && !organizationNames.includes(name)) organizationNames.push(name);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 20).forEach((item) => visitJson(item, key, depth + 1));
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.entries(value as Record<string, unknown>).slice(0, 40).forEach(([childKey, childValue]) => visitJson(childValue, childKey, depth + 1));
  };
  while ((match = jsonLdRe.exec(html)) !== null && organizationNames.length < MAX_WEBSITE_NAMES) {
    try { visitJson(JSON.parse(decodeHtmlEntities(match[1].trim()))); } catch { /* Ignore malformed structured data. */ }
  }

  const links: WebsiteLinkRecord[] = [];
  const linkRe = new RegExp("<a[^>]*>([^]{0,1600}?)</a>", "gi");
  while ((match = linkRe.exec(html)) !== null && links.length < MAX_WEBSITE_LINKS) {
    const tag = match[0];
    const url = safePublicHttpUrl(attr(tag, "href"), baseUrl);
    if (!url) continue;
    const label = clean(match[1] || "", 180);
    const rel = compactWebsiteText(attr(tag, "rel"), 120);
    const key = `${url}|${label}`;
    if (!links.some((item) => `${item.url}|${item.label}` === key)) links.push({ url, label, rel });
  }

  const bodyMarkup = html
    .replace(new RegExp("<head[^]*?</head>", "gi"), " ")
    .replace(new RegExp("<noscript[^]*?</noscript>", "gi"), " ");
  const bodyText = stripHtml(bodyMarkup).slice(0, MAX_WEBSITE_BODY_CHARS);
  return { title, headings, metadata, organizationNames, links, bodyText };
}

function compactWebsiteText(value: unknown, max: number) {
  return typeof value === "string" ? decodeHtmlEntities(value).replace(/[ \t\r\n]+/g, " ").trim().slice(0, max) : "";
}

function websiteIdentityFields(evidence: WebsiteEvidence) {
  return [
    evidence.title,
    ...evidence.headings,
    ...evidence.metadata.map((item) => item.value),
    ...evidence.organizationNames,
    evidence.bodyText,
  ].filter((value): value is string => Boolean(value && value.trim()));
}

function hasConflictingWebsitePath(value: string, expected: ExpectedIdentity) {
  if (!value || expected.uniqueTokens.length === 0 || expected.sharedTradeWords.length === 0) return false;
  let parsed: URL;
  try { parsed = new URL(value); } catch { return false; }
  const hostLabels = parsed.hostname.split(".").filter(Boolean).join(" ");
  const pathText = parsed.pathname.split("/").filter(Boolean).join(" ");
  const tokens = identityTokens(`${hostLabels} ${pathText}`);
  const matchesExpected = (token: string) => expected.uniqueTokens.some((expectedToken) => matchesIdentityToken(expectedToken, [token], token));
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (matchesExpected(token)) continue;
    const compactToken = compactIdentitySafe(token);
    const embeddedTrade = expected.sharedTradeWords.some((trade) => {
      const compactTrade = compactIdentitySafe(trade);
      return compactTrade.length >= 4 && compactToken.length > compactTrade.length + 2 && compactToken.endsWith(compactTrade);
    });
    if (embeddedTrade) return true;
    if (!SHARED_TRADE_SERVICE_WORDS.has(token)) continue;
    const nearby = tokens.slice(Math.max(0, index - 2), index);
    if (nearby.some((candidate) => isCandidateIdentityToken(candidate) && !matchesExpected(candidate))) return true;
  }
  return false;
}

function verifyWebsiteIdentity(result: ScrapedResult, expected: ExpectedIdentity): IdentityCheck {
  if (!result.ok || !result.websiteEvidence) {
    return {
      identityMatched: false,
      identityUrlMatched: false,
      identityTextMatched: false,
      identityReason: "Website content could not be read, so its business identity remains unverified.",
    };
  }
  const fields = websiteIdentityFields(result.websiteEvidence);
  const text = fields.join(" ").slice(0, MAX_WEBSITE_SOURCE_CHARS);
  const identityUrlMatched = matchesExpectedSourcePath(result.url, expected);
  const identityTextMatched = fields.some((field) => matchesExpectedIdentity(field, expected, false)) || matchesExpectedIdentity(text, expected, false);
  const conflictingIdentity = hasConflictingBusinessNameSafe(text, expected) || hasConflictingBusinessName(text, expected) || hasConflictingWebsitePath(result.url, expected);
  if (conflictingIdentity) {
    return {
      identityMatched: false,
      identityUrlMatched,
      identityTextMatched,
      identityReason: "Website content contains a conflicting business identity and was excluded.",
    };
  }
  if (identityTextMatched) {
    return {
      identityMatched: true,
      identityUrlMatched,
      identityTextMatched: true,
      identityReason: identityUrlMatched ? "Expected identity verified by website text with URL corroboration." : "Expected identity verified by website text.",
    };
  }
  return {
    identityMatched: false,
    identityUrlMatched,
    identityTextMatched: false,
    identityReason: identityUrlMatched
      ? "The website URL matched, but its page text did not verify the expected business identity."
      : "Website title, headings, metadata, and readable text did not verify the expected business identity.",
  };
}

function websiteSourceText(evidence: WebsiteEvidence) {
  return [
    evidence.title ? `PAGE TITLE: ${evidence.title}` : "",
    evidence.headings.length ? `HEADINGS: ${evidence.headings.join(" | ")}` : "",
    evidence.metadata.length ? `METADATA: ${evidence.metadata.map((item) => `${item.key}: ${item.value}`).join(" | ")}` : "",
    evidence.organizationNames.length ? `STRUCTURED BUSINESS NAMES: ${evidence.organizationNames.join(" | ")}` : "",
    evidence.links.length ? `LINK LABELS: ${evidence.links.map((item) => item.label).filter(Boolean).join(" | ")}` : "",
    evidence.bodyText ? `READABLE BODY TEXT: ${evidence.bodyText}` : "",
  ].filter(Boolean).join("\n").slice(0, MAX_WEBSITE_SOURCE_CHARS);
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) return null;
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength <= maxBytes ? bytes : null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* Ignore cancellation errors. */ }
        return null;
      }
      chunks.push(next.value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* Ignore already-released readers. */ }
  }
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.byteLength; });
  return result;
}

async function safeFetchScrape(url: string, source: SourceName): Promise<ScrapedResult> {
  if (!url) return { url, source, ok: false, text: "", imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [], error: "Empty URL" };
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || isUnsafeHostname(parsed.hostname)) throw new Error("invalid protocol");
  } catch {
    return { url, source, ok: false, text: "", imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [], error: "Invalid URL format" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) return { url, source, ok: false, text: "", imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [], error: `Fetch failed with ${response.status}` };
    const bytes = await readLimitedBody(response, MAX_HTML_BYTES);
    if (!bytes) return { url, source, ok: false, text: "", imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [], error: "Page response exceeded the safe import limit" };
    const html = new TextDecoder().decode(bytes);
    const media = extractMedia(html, response.url || parsed.toString(), source);
    const text = stripHtml(html);
    if (text.length < 100 && media.imageUrls.length === 0) {
      return { url, source, ok: false, text, ...media, error: "Page returned minimal readable content (likely blocked or private)" };
    }
    return { url, source, ok: true, text, ...media, warning: text.length < 100 ? "Page exposed media metadata but limited readable text" : undefined };
  } catch (error: any) {
    return { url, source, ok: false, text: "", imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [], error: error?.name === "AbortError" ? "Source request timed out" : error?.message ?? "Fetch error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeFetchWebsiteScrape(url: string): Promise<ScrapedResult> {
  const source: SourceName = "website";
  const emptyMedia = { imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [] as MediaCandidate[] };
  if (!url) return { url, source, ok: false, text: "", ...emptyMedia, error: "Empty URL" };
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || isUnsafeHostname(parsed.hostname)) throw new Error("invalid protocol");
  } catch {
    return { url, source, ok: false, text: "", ...emptyMedia, error: "Website URL is not a valid public URL" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (response.status >= 300 && response.status < 400) return { url: parsed.toString(), source, ok: false, text: "", ...emptyMedia, error: "Website homepage redirected and was not imported" };
    if (!response.ok) return { url: parsed.toString(), source, ok: false, text: "", ...emptyMedia, error: `Website fetch failed with ${response.status}` };
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "text/html" && contentType !== "application/xhtml+xml") return { url: parsed.toString(), source, ok: false, text: "", ...emptyMedia, error: "Website homepage did not return HTML content" };
    const bytes = await readLimitedBody(response, MAX_HTML_BYTES);
    if (!bytes) return { url: parsed.toString(), source, ok: false, text: "", ...emptyMedia, error: "Website homepage exceeded the safe import limit" };
    const html = new TextDecoder().decode(bytes);
    const evidence = extractWebsiteEvidence(html, parsed.toString());
    if (evidence.bodyText.length < MIN_WEBSITE_BODY_CHARS) return { url: parsed.toString(), source, ok: false, text: "", ...emptyMedia, error: "Website homepage returned too little readable content" };
    const media = extractMedia(html, parsed.toString(), source);
    return { url: parsed.toString(), source, ok: true, text: websiteSourceText(evidence), ...media, websiteEvidence: evidence };
  } catch (error: any) {
    return { url: parsed?.toString() || url, source, ok: false, text: "", ...emptyMedia, error: error?.name === "AbortError" ? "Website request timed out" : "Website homepage could not be fetched" };
  } finally {
    clearTimeout(timeout);
  }
}

function bearer(req: Request): { token: string; header: string } | null {
  const header = req.headers.get("Authorization") || "";
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  return token.length >= 8 && token.length <= 4096 ? { token, header } : null;
}

function emptyProfile(imageUrls: string[], socialLinks: Record<string, string>, logoImageUrl = "", businessName = "") {
  return {
    businessName,
    businessType: "other",
    trade: "",
    description: "",
    services: [] as string[],
    areasServed: [] as string[],
    location: "",
    phone: "",
    email: "",
    website: "",
    primaryColor: "#27313A",
    secondaryColor: "#B66A3C",
    logoImageUrl,
    photoUrls: imageUrls,
    reviewSnippets: [] as { text: string; author: string; rating: number }[],
    brandVoice: "professional & trustworthy",
    brandAttitude: "clear and direct",
    contentStyle: "plain language",
    customerLanguage: [] as string[],
    visualVibe: "grounded and restrained",
    visualStyle: "industrial/raw",
    colorFromImages: ["#27313A", "#B66A3C", "#F2EDE7"],
    typographyVibe: "industrial sans",
    extractedImageUrls: imageUrls,
    socialLinks,
  };
}

function sourceLabel(source: SourceName) { return source.toUpperCase(); }

function validStoredUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function imageExtension(contentType: string, sourceUrl: string) {
  const fromType = contentType.split("/")[1]?.split(";")[0]?.toLowerCase();
  if (fromType === "jpeg") return "jpg";
  if (fromType && /^[a-z0-9]+$/.test(fromType)) return fromType;
  try {
    const match = new URL(sourceUrl).pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() || "jpg";
  } catch { return "jpg"; }
}

async function fetchPublicImage(url: string) {
  let currentUrl = url;
  for (let redirect = 0; redirect <= MAX_IMAGE_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", "User-Agent": "Mozilla/5.0" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = safePublicHttpUrl(response.headers.get("location") || "", currentUrl);
        if (!location) return null;
        currentUrl = location;
        continue;
      }
      if (!response.ok) return null;
      const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (contentType === "image/svg+xml" || contentType === "image/x-icon") return null;
      const hasImageType = contentType.startsWith("image/");
      const hasImageExtension = /\.(?:avif|bmp|gif|jpe?g|png|tiff?|webp)(?:$|\?)/i.test(new URL(currentUrl).pathname);
      if (!hasImageType && !hasImageExtension) return null;
      const bytes = await readLimitedBody(response, MAX_IMAGE_BYTES);
      if (!bytes || bytes.byteLength === 0) return null;
      return { bytes, contentType: hasImageType ? contentType : "image/jpeg", sourceUrl: currentUrl };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function cacheImageAssets(originalUrls: string[], superdev: any, headers: Record<string, string>) {
  const delivered = new Map<string, string>();
  originalUrls.forEach((url) => delivered.set(url, url));
  const candidates = originalUrls.slice(0, MAX_CACHE_ATTEMPTS).filter((url) => !/\/storage\/v1\/(?:object|render)\/public\//i.test(url));
  const outcomes = await Promise.all(candidates.map(async (originalUrl, index) => {
    try {
      const fetched = await fetchPublicImage(originalUrl);
      if (!fetched) return { attempted: true, cached: false };
      const file = new File([fetched.bytes], `profile-asset-${index + 1}.${imageExtension(fetched.contentType, fetched.sourceUrl)}`, { type: fetched.contentType });
      const upload = await superdev.integrations.core.uploadFile({ file }, { headers });
      const managedUrl = validStoredUrl(upload?.file_url);
      if (!managedUrl) return { attempted: true, cached: false };
      delivered.set(originalUrl, managedUrl);
      return { attempted: true, cached: true };
    } catch {
      return { attempted: true, cached: false };
    }
  }));
  return {
    delivered,
    attempted: outcomes.filter((outcome) => outcome.attempted).length,
    cached: outcomes.filter((outcome) => outcome.cached).length,
    fallbacks: outcomes.filter((outcome) => outcome.attempted && !outcome.cached).length,
  };
}

function identityFixtureResult(url: string, text: string): ScrapedResult {
  return { url, source: "facebook", ok: true, text, imageUrls: [], logoImageUrl: "", logoPriority: 0, logoSignal: "", candidates: [] };
}

function websiteFixtureResult(url: string, evidence: Partial<WebsiteEvidence>): ScrapedResult {
  const websiteEvidence: WebsiteEvidence = {
    title: "",
    headings: [],
    metadata: [],
    organizationNames: [],
    links: [],
    bodyText: "",
    ...evidence,
  };
  return {
    url,
    source: "website",
    ok: true,
    text: websiteSourceText(websiteEvidence),
    imageUrls: [],
    logoImageUrl: "",
    logoPriority: 0,
    logoSignal: "",
    candidates: [],
    websiteEvidence,
  };
}

function runIdentityRegressionChecks() {
  const expected = parseExpectedIdentity("NewGen Concreting & Earthmoving");
  if (!expected) throw new Error("Identity regression fixture could not parse the expected NewGen name");
  const newGenPath = identityFixtureResult(
    "https://www.facebook.com/newgen-concreting-earthmoving/",
    "NewGen Concreting & Earthmoving. Concrete driveway and earthmoving projects.",
  );
  if (!verifySourceIdentity(newGenPath, expected).identityMatched) throw new Error("NewGen source path fixture was rejected");
  const shannonPath = identityFixtureResult(
    "https://www.facebook.com/shannons-concreting/",
    "Concrete driveway and earthmoving projects.",
  );
  if (verifySourceIdentity(shannonPath, expected).identityMatched) throw new Error("Shannon source path fixture was accepted");
  const shannonText = identityFixtureResult(
    "https://www.facebook.com/example-profile/",
    "Shannon's Concreting. Concrete driveway and earthmoving projects.",
  );
  if (verifySourceIdentity(shannonText, expected).identityMatched) throw new Error("Shannon source text fixture was accepted");
  const genericWithVerifiedPath = identityFixtureResult(
    "https://www.facebook.com/newgen-concreting/",
    "Concrete driveway installation and earthmoving projects.",
  );
  if (!verifySourceIdentity(genericWithVerifiedPath, expected).identityMatched) throw new Error("Generic NewGen work text was rejected despite a verified path");
  const genericWithoutIdentity = identityFixtureResult(
    "https://www.facebook.com/concreting-services/",
    "Concrete driveway installation and earthmoving projects.",
  );
  if (verifySourceIdentity(genericWithoutIdentity, expected).identityMatched) throw new Error("Generic unverified work text was accepted");

  const matchingWebsite = websiteFixtureResult("https://newgenconcreting.com.au/", {
    title: "NewGen Concreting & Earthmoving",
    headings: ["NewGen Concreting and Earthmoving projects"],
    organizationNames: ["NewGen Concreting & Earthmoving"],
    bodyText: "NewGen Concreting & Earthmoving delivers concrete driveway and earthmoving services across Newcastle.",
  });
  if (!verifyWebsiteIdentity(matchingWebsite, expected).identityMatched) throw new Error("Matching website fixture was rejected");
  const conflictingWebsite = websiteFixtureResult("https://shannonsconcreting.com.au/", {
    title: "Shannon's Concreting",
    headings: ["Concrete driveways and earthmoving"],
    bodyText: "Shannon's Concreting provides concrete driveway and earthmoving services.",
  });
  if (verifyWebsiteIdentity(conflictingWebsite, expected).identityMatched) throw new Error("Conflicting website fixture was accepted");
  const sameDomainWithoutIdentity = websiteFixtureResult("https://newgenconcreting.com.au/projects", {
    title: "Completed driveway projects",
    headings: ["Concrete driveway installation"],
    bodyText: "Concrete driveway installation and earthmoving projects for local properties.",
  });
  if (verifyWebsiteIdentity(sameDomainWithoutIdentity, expected).identityMatched) throw new Error("Same-domain website without identity evidence was accepted");
  const failedWebsite: ScrapedResult = {
    url: "https://newgenconcreting.com.au/",
    source: "website",
    ok: false,
    text: "",
    imageUrls: [],
    logoImageUrl: "",
    logoPriority: 0,
    logoSignal: "",
    candidates: [],
    error: "Website homepage could not be fetched",
  };
  if (verifyWebsiteIdentity(failedWebsite, expected).identityMatched) throw new Error("Failed website fixture was accepted");
  if (emptyWebsiteDiagnostic().status !== "absent") throw new Error("Absent website diagnostic fixture is missing");

  const rejected = verifySourceIdentity(genericWithoutIdentity, expected);
  const trustedResults = [rejected].filter((result) => result.identityMatched);
  const safeProfile = emptyProfile([], {}, "", expected.raw);
  if (trustedResults.length !== 0 || safeProfile.businessName !== expected.raw || safeProfile.photoUrls.length !== 0) throw new Error("Identity fail-closed fixture did not preserve the expected name safely");
  if (!/identity/i.test(expectedIdentityDiagnostic(expected).message)) throw new Error("Identity fail-closed diagnostic fixture is missing");
  console.info("[import-social-profile] identity_regression_checks", { passed: true });
}

runIdentityRegressionChecks();

const BUSINESS_TYPES = new Set(["retail", "restaurant", "salon", "fitness", "healthcare", "professional_services", "real_estate", "automotive", "education", "hospitality", "construction", "home_services", "other"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed, use POST" }), { status: 405, headers: CORS_HEADERS });

  try {
    const auth = bearer(req);
    if (!auth) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: CORS_HEADERS });
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: CORS_HEADERS }); }
    const expectedIdentity = parseExpectedIdentity(body.expectedBusinessName);

    const rawInputs = [
      { source: "facebook" as SourceName, value: body.facebookUrl },
      { source: "instagram" as SourceName, value: body.instagramUrl },
      { source: "google" as SourceName, value: body.googleBusinessUrl },
    ].map((item) => ({ ...item, rawUrl: typeof item.value === "string" ? item.value.trim() : "", url: normalizeSourceUrl(item.value) }));
    const requestedSources = rawInputs.filter((item) => Boolean(item.rawUrl));
    if (requestedSources.length === 0) return new Response(JSON.stringify({ error: "At least one social URL is required" }), { status: 400, headers: CORS_HEADERS });

    const appId = Deno.env.get("SUPERDEV_APP_ID");
    if (!appId) return new Response(JSON.stringify({ error: "Profile import is temporarily unavailable" }), { status: 500, headers: CORS_HEADERS });
    const superdev = createSuperdevClient({ appId }) as any;
    superdev.auth.setToken(auth.token);
    const origin = req.headers.get("Origin");
    const integrationHeaders: Record<string, string> = { Authorization: auth.header };
    if (origin) integrationHeaders.Origin = origin;
    try {
      const user = await superdev.auth.me();
      if (!user || typeof user.email !== "string" || !user.email.trim()) throw new Error("Authentication required");
      console.info("[import-social-profile] auth_verified", { auth_verified: true, originPresent: Boolean(origin) });
    } catch {
      console.warn("[import-social-profile] auth_verified", { auth_verified: false, originPresent: Boolean(origin) });
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: CORS_HEADERS });
    }

    const invalidErrors = requestedSources.filter((item) => !item.url).map((item) => ({ source: item.source, url: item.rawUrl.slice(0, 2200), message: "Invalid URL format" }));
    const tasks = requestedSources.filter((item): item is SourceRequest => Boolean(item.url)).map((item) => safeFetchScrape(item.url, item.source));
    const results = await Promise.all(tasks);
    const checkedResults = results.map((result) => expectedIdentity ? { ...result, ...verifySourceIdentity(result, expectedIdentity) } : result);
    const trustedSocialResults = expectedIdentity
      ? checkedResults.filter((result) => result.ok && result.identityMatched)
      : checkedResults.filter((result) => result.ok);
    const scrapeErrors = checkedResults.filter((result) => !result.ok).map((result) => ({ source: result.source, url: result.url, message: result.error || "Source unavailable" }));
    const identityErrors: SourceDiagnostic[] = expectedIdentity
      ? checkedResults.filter((result) => !result.identityMatched).map((result) => ({ source: result.source, url: result.url, message: result.identityReason || "Expected identity was not verified from this source." }))
      : [];
    const errors: SourceDiagnostic[] = [...invalidErrors, ...scrapeErrors, ...identityErrors];

    const rawWebsiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
    const normalizedWebsiteUrl = rawWebsiteUrl ? normalizeSourceUrl(rawWebsiteUrl) : "";
    let websiteResult: ScrapedResult | null = null;
    let verifiedWebsiteUrl = "";
    let websiteDiagnostic: WebsiteDiagnostic = emptyWebsiteDiagnostic();
    if (rawWebsiteUrl && !normalizedWebsiteUrl) {
      websiteDiagnostic = { source: "website", status: "rejected", url: "", message: "Website URL was invalid or not a public webpage." };
    } else if (normalizedWebsiteUrl && (!expectedIdentity || !expectedIdentity.normalized || expectedIdentity.uniqueTokens.length === 0)) {
      websiteDiagnostic = { source: "website", status: "rejected", url: normalizedWebsiteUrl, message: "Website was not checked because an authoritative business name was unavailable." };
    } else if (normalizedWebsiteUrl && expectedIdentity) {
      websiteResult = await safeFetchWebsiteScrape(normalizedWebsiteUrl);
      if (!websiteResult.ok) {
        websiteDiagnostic = { source: "website", status: "failed", url: normalizedWebsiteUrl, message: websiteResult.error || "Website homepage could not be read." };
      } else {
        websiteResult = { ...websiteResult, ...verifyWebsiteIdentity(websiteResult, expectedIdentity) };
        if (websiteResult.identityMatched) {
          verifiedWebsiteUrl = normalizedWebsiteUrl;
          websiteDiagnostic = { source: "website", status: "verified", url: normalizedWebsiteUrl, message: websiteResult.identityReason || "Expected business identity verified from the website." };
        } else {
          websiteDiagnostic = { source: "website", status: "rejected", url: normalizedWebsiteUrl, message: websiteResult.identityReason || "Website business identity could not be verified." };
        }
      }
    }
    if (websiteDiagnostic.status !== "absent" && websiteDiagnostic.status !== "verified") {
      errors.push({ source: "website", url: websiteDiagnostic.url, message: websiteDiagnostic.message });
    }

    const verifiedWebsiteResult = websiteResult?.identityMatched ? websiteResult : null;
    const trustedResults = [
      ...trustedSocialResults,
      ...(verifiedWebsiteResult ? [verifiedWebsiteResult] : []),
    ];
    if (expectedIdentity && trustedResults.length === 0) errors.push(expectedIdentityDiagnostic(expectedIdentity));
    const sourceText = [
      ...trustedSocialResults.filter((result) => result.text).map((result) => `--- SOURCE: ${sourceLabel(result.source)} URL: ${result.url} ---\n${result.text}`),
      verifiedWebsiteResult ? `--- SOURCE: WEBSITE URL: ${verifiedWebsiteUrl} ---\n${verifiedWebsiteResult.text}` : "",
    ].filter(Boolean).join("\n\n").slice(0, 40_000);

    const assetMap = new Map<string, AssetRecord>();
    let assetOrder = 0;
    const addAsset = (candidate: MediaCandidate, source: SourceName) => {
      const existing = assetMap.get(candidate.url);
      const next = { url: candidate.url, source, priority: candidate.priority, order: assetOrder++ };
      if (existing) {
        if (next.priority > existing.priority) assetMap.set(candidate.url, next);
        return;
      }
      if (assetMap.size >= MAX_IMAGE_URLS) {
        const weakest = [...assetMap.values()].sort((a, b) => a.priority - b.priority || b.order - a.order)[0];
        if (!weakest || next.priority <= weakest.priority) return;
        assetMap.delete(weakest.url);
      }
      assetMap.set(candidate.url, next);
    };
    trustedResults.forEach((result) => result.candidates.forEach((candidate) => addAsset(candidate, result.source)));
    const orderedAssets = [...assetMap.values()].sort((a, b) => b.priority - a.priority || a.order - b.order);
    const logoChoice = trustedResults.filter((result) => result.logoImageUrl).map((result, index) => ({ url: result.logoImageUrl, priority: result.logoPriority, signal: result.logoSignal, order: index })).sort((a, b) => b.priority - a.priority || a.order - b.order)[0];
    const originalLogoUrl = logoChoice?.url || "";
    const originalGalleryUrls = orderedAssets.map((asset) => asset.url).filter((url) => url !== originalLogoUrl);
    const sourceLink = (source: SourceName) => {
      const inputUrl = rawInputs.find((item) => item.source === source)?.url || "";
      return expectedIdentity && !trustedResults.some((result) => result.source === source) ? "" : inputUrl;
    };
    const socialLinks = {
      facebookUrl: sourceLink("facebook"),
      instagramUrl: sourceLink("instagram"),
      googleBusinessUrl: sourceLink("google"),
    };

    const cacheResult = await cacheImageAssets([originalLogoUrl, ...originalGalleryUrls].filter(Boolean), superdev, integrationHeaders);
    const deliver = (url: string) => cacheResult.delivered.get(url) || url;
    const logoImageUrl = deliver(originalLogoUrl);
    const photoUrls = originalGalleryUrls.map(deliver);
    const baseProfile = emptyProfile(photoUrls, socialLinks, logoImageUrl, expectedIdentity?.raw || "");
    const logoSource = trustedResults.find((result) => result.logoImageUrl === originalLogoUrl)?.source || "google";
    const assetSources = orderedAssets.map((asset) => ({
      source: asset.source,
      role: asset.url === originalLogoUrl ? "logo" : "gallery",
      originalUrl: asset.url,
      deliveredUrl: deliver(asset.url),
    }));
    if (originalLogoUrl && !assetSources.some((asset) => asset.originalUrl === originalLogoUrl)) assetSources.unshift({ source: logoSource, role: "logo", originalUrl: originalLogoUrl, deliveredUrl: logoImageUrl });

    const scrapedSources = [
      ...requestedSources.map((request) => {
        const result = checkedResults.find((candidate) => candidate.source === request.source);
        const eligible = expectedIdentity ? Boolean(result?.identityMatched) : Boolean(result?.ok);
        return {
          source: request.source,
          url: result?.url || request.rawUrl.slice(0, 2200),
          ok: Boolean(result?.ok),
          imageCount: eligible ? result?.imageUrls.length || 0 : 0,
          logoSelected: eligible && Boolean(result?.logoImageUrl),
          ...(result?.warning ? { warning: result.warning } : {}),
          ...(expectedIdentity ? {
            identityMatched: Boolean(result?.identityMatched),
            identityStatus: result?.identityMatched ? "verified" : "unverified",
            identityReason: result?.identityReason || "Source identity could not be verified.",
          } : {}),
          ...(!result?.ok ? { error: result?.error || "Invalid URL format" } : {}),
        };
      }),
      ...(rawWebsiteUrl ? [{
        source: "website" as const,
        url: verifiedWebsiteResult ? verifiedWebsiteUrl : "",
        ok: Boolean(websiteResult?.ok),
        imageCount: verifiedWebsiteResult?.imageUrls.length || 0,
        logoSelected: Boolean(verifiedWebsiteResult?.logoImageUrl),
        identityMatched: Boolean(verifiedWebsiteResult?.identityMatched),
        identityStatus: websiteDiagnostic.status,
        identityReason: websiteDiagnostic.message,
        ...(verifiedWebsiteResult?.warning ? { warning: verifiedWebsiteResult.warning } : {}),
        ...(websiteDiagnostic.status !== "verified" ? { error: websiteDiagnostic.message } : {}),
      }] : []),
    ];
    const websiteFacts = verifiedWebsiteResult?.websiteEvidence ? {
      title: verifiedWebsiteResult.websiteEvidence.title,
      headings: verifiedWebsiteResult.websiteEvidence.headings.slice(0, MAX_WEBSITE_HEADINGS),
      metadata: verifiedWebsiteResult.websiteEvidence.metadata.slice(0, MAX_WEBSITE_METADATA).map((item) => ({ key: item.key, value: item.value })),
      organizationNames: verifiedWebsiteResult.websiteEvidence.organizationNames.slice(0, MAX_WEBSITE_NAMES),
      bodyText: verifiedWebsiteResult.websiteEvidence.bodyText.slice(0, MAX_WEBSITE_BODY_CHARS),
    } : null;
    const websiteLinks = verifiedWebsiteResult?.websiteEvidence
      ? verifiedWebsiteResult.websiteEvidence.links.slice(0, MAX_WEBSITE_LINKS).map((link) => ({ url: link.url, label: link.label, rel: link.rel }))
      : [];
    const websiteProvenance = verifiedWebsiteResult ? {
      source: "website" as const,
      url: verifiedWebsiteUrl,
      identityMatched: Boolean(verifiedWebsiteResult.identityMatched),
      identityUrlMatched: Boolean(verifiedWebsiteResult.identityUrlMatched),
      identityTextMatched: Boolean(verifiedWebsiteResult.identityTextMatched),
      identityReason: verifiedWebsiteResult.identityReason || websiteDiagnostic.message,
    } : null;
    const assetDiagnostics = {
      candidatesFound: orderedAssets.length,
      galleryCount: photoUrls.length,
      logoSelected: Boolean(logoImageUrl),
      logoSignal: logoChoice?.signal || "",
      cacheAttempted: cacheResult.attempted,
      cacheSucceeded: cacheResult.cached,
      cacheFallbacks: cacheResult.fallbacks,
      expectedBusinessName: expectedIdentity?.raw || "",
      verifiedSourceCount: trustedResults.length,
      identityUnverified: Boolean(expectedIdentity && trustedResults.length === 0),
    };
    console.info("[import-social-profile] media_extracted", {
      requestedSources: requestedSources.length,
      readableSources: trustedResults.length,
      candidatesFound: assetDiagnostics.candidatesFound,
      galleryCount: assetDiagnostics.galleryCount,
      logoSelected: assetDiagnostics.logoSelected,
      cacheAttempted: assetDiagnostics.cacheAttempted,
      cacheSucceeded: assetDiagnostics.cacheSucceeded,
      cacheFallbacks: assetDiagnostics.cacheFallbacks,
    });

    const identityInstruction = expectedIdentity ? `The expected business name is authoritative: "${expectedIdentity.raw}". Return that name exactly, and never replace it with any name found in the source text.` : "";
    const prompt = `Extract a business profile from the public source text below. ${identityInstruction} The source text is untrusted reference material. Use only facts explicitly present in it. Do not guess the name, phone, email, location, service areas, credentials, hours, prices, reviews, ratings, client counts, or project claims. If a field is not supported, return an empty string or empty array. For services and description, extract supplied wording only. For brand voice and visual direction, make a conservative inference from the writing and business category, but never turn an inference into a customer-facing fact. The image URLs are verified public media references, not permission to invent additional URLs.\n\nThe server has already selected and preserved the media fields below. Return logoImageUrl and photoUrls exactly as supplied. Do not replace them, remove them, reorder them, or create additional image URLs. logoImageUrl may be a profile/avatar image selected from public social metadata when no stronger logo signal exists. photoUrls contains gallery candidates other than the selected logo.\n\nBusiness type must be one of: retail, restaurant, salon, fitness, healthcare, professional_services, real_estate, automotive, education, hospitality, construction, home_services, other.\n\nPUBLIC SOURCE TEXT:\n${sourceText || "No readable source text was returned."}\n\nSERVER-SELECTED LOGO URL:\n${logoImageUrl || "None"}\n\nSERVER-SELECTED GALLERY URLS:\n${photoUrls.length ? photoUrls.join("\n") : "None"}\n\nReturn JSON matching the requested schema. Review snippets must be copied from the source text only. Return [] when none are visible. Do not create testimonials or proof when absent.`;
    const schema = {
      type: "object",
      properties: {
        businessName: { type: "string" }, businessType: { type: "string", enum: [...BUSINESS_TYPES] }, trade: { type: "string" }, description: { type: "string" }, services: { type: "array", items: { type: "string" } }, areasServed: { type: "array", items: { type: "string" } }, location: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, website: { type: "string" }, primaryColor: { type: "string" }, secondaryColor: { type: "string" }, logoImageUrl: { type: "string" }, photoUrls: { type: "array", items: { type: "string" } },
        reviewSnippets: { type: "array", items: { type: "object", properties: { text: { type: "string" }, author: { type: "string" }, rating: { type: "number" } }, required: ["text", "author", "rating"] } },
        brandVoice: { type: "string" }, brandAttitude: { type: "string" }, contentStyle: { type: "string" }, customerLanguage: { type: "array", items: { type: "string" } }, visualVibe: { type: "string" }, visualStyle: { type: "string" }, colorFromImages: { type: "array", items: { type: "string" } }, typographyVibe: { type: "string" },
      },
      required: ["businessName", "businessType", "trade", "description", "services", "areasServed", "location", "phone", "email", "website", "primaryColor", "secondaryColor", "logoImageUrl", "photoUrls", "reviewSnippets", "brandVoice", "brandAttitude", "contentStyle", "customerLanguage", "visualVibe", "visualStyle", "colorFromImages", "typographyVibe"],
    };

    let extracted: any = baseProfile;
    if (sourceText) {
      try {
        extracted = await superdev.integrations.core.invokeLLM({ prompt, response_json_schema: schema, mode: "standard" }, { headers: integrationHeaders });
      } catch (error) {
        console.error("[import-social-profile] extraction_failed", { message: error instanceof Error ? error.message : "unknown" });
      }
    }

    const sourceReviewText = sourceText.toLowerCase();
    const reviews = Array.isArray(extracted?.reviewSnippets)
      ? extracted.reviewSnippets.filter((review: any) => {
          const text = typeof review?.text === "string" ? review.text.trim() : "";
          return text.length >= 12 && sourceReviewText.includes(text.toLowerCase().slice(0, Math.min(text.length, 48)));
        }).slice(0, 6)
      : [];
    const safeColor = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
    const safeStrings = (value: unknown, max: number) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim().slice(0, 500)).slice(0, max) : [];
    const extractedBusinessType = typeof extracted?.businessType === "string" && BUSINESS_TYPES.has(extracted.businessType) ? extracted.businessType : "other";
    const safeExtractedColors = safeStrings(extracted?.colorFromImages, 5).filter((color) => /^#[0-9a-f]{6}$/i.test(color));
    const profile = {
      ...baseProfile,
      businessName: expectedIdentity?.raw || (typeof extracted?.businessName === "string" ? extracted.businessName.trim() : ""),
      businessType: extractedBusinessType,
      trade: typeof extracted?.trade === "string" ? extracted.trade.trim() : "",
      description: typeof extracted?.description === "string" ? extracted.description.trim() : "",
      services: safeStrings(extracted?.services, 8),
      areasServed: safeStrings(extracted?.areasServed, 10),
      location: typeof extracted?.location === "string" ? extracted.location.trim() : "",
      phone: typeof extracted?.phone === "string" ? extracted.phone.trim() : "",
      email: typeof extracted?.email === "string" ? extracted.email.trim() : "",
      website: verifiedWebsiteUrl,
      primaryColor: safeColor(extracted?.primaryColor, baseProfile.primaryColor),
      secondaryColor: safeColor(extracted?.secondaryColor, baseProfile.secondaryColor),
      logoImageUrl,
      photoUrls,
      reviewSnippets: reviews,
      brandVoice: typeof extracted?.brandVoice === "string" && extracted.brandVoice.trim() ? extracted.brandVoice.trim() : baseProfile.brandVoice,
      brandAttitude: typeof extracted?.brandAttitude === "string" && extracted.brandAttitude.trim() ? extracted.brandAttitude.trim() : baseProfile.brandAttitude,
      contentStyle: typeof extracted?.contentStyle === "string" && extracted.contentStyle.trim() ? extracted.contentStyle.trim() : baseProfile.contentStyle,
      customerLanguage: safeStrings(extracted?.customerLanguage, 6),
      visualVibe: typeof extracted?.visualVibe === "string" && extracted.visualVibe.trim() ? extracted.visualVibe.trim() : baseProfile.visualVibe,
      visualStyle: typeof extracted?.visualStyle === "string" && extracted.visualStyle.trim() ? extracted.visualStyle.trim() : baseProfile.visualStyle,
      colorFromImages: safeExtractedColors.length ? safeExtractedColors : baseProfile.colorFromImages,
      typographyVibe: typeof extracted?.typographyVibe === "string" && extracted.typographyVibe.trim() ? extracted.typographyVibe.trim() : baseProfile.typographyVibe,
      extractedImageUrls: photoUrls,
      socialLinks,
      errors,
      scrapedSources,
      assetSources,
      assetDiagnostics,
      sourceContent: sourceText,
      websiteDiagnostic,
      websiteFacts,
      websiteLinks,
      websiteProvenance,
    };
    return new Response(JSON.stringify(profile), { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[import-social-profile] failed", { message: error?.message ?? "unknown" });
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), { status: 500, headers: CORS_HEADERS });
  }
});


```

## `functions/search-business-images.ts`

```ts
import { createSuperdevClient } from "npm:@superdevhq/client@0.1.56";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin",
  "Content-Type": "application/json",
};

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
const DUCKDUCKGO_HTML_URL = "https://duckduckgo.com/";
const DUCKDUCKGO_IMAGE_URL = "https://duckduckgo.com/i.js";
const SEARCH_TIMEOUT_MS = 18_000;
const IMAGE_RESULTS_TIMEOUT_MS = 9_000;
const MAX_IMAGE_QUERIES = 2;
const MAX_IMAGE_RESULT_ITEMS = 24;
const MAX_IMAGE_RESPONSE_BYTES = 1_500_000;
const SCRAPE_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 8_000;
const MAX_INPUT_TEXT = 240;
const MAX_SOURCE_URLS = 12;
const MAX_SEARCH_RESULTS = 10;
const MAX_SCRAPE_PAGES = 4;
const MAX_PAGE_RESPONSE_BYTES = 3_000_000;
const MAX_MARKDOWN_CHARS = 32_000;
const MAX_HTML_CHARS = 1_500_000;
const MAX_PAGE_IMAGE_REFS = 28;
const MAX_RETURNED_CANDIDATES = 10;
const LOGO_INTENT_FALLBACK_THRESHOLD = 48;
const MAX_CACHE_ATTEMPTS = 6;
const MAX_IMAGE_BYTES = 3_000_000;
const MAX_IMAGE_REDIRECTS = 2;

const STOCK_HOSTS = [
  "unsplash.com", "pexels.com", "pixabay.com", "shutterstock.com", "gettyimages.com",
  "istockphoto.com", "stock.adobe.com", "adobe.com", "freepik.com", "depositphotos.com",
  "dreamstime.com", "alamy.com", "canva.com", "123rf.com", "vecteezy.com", "rawpixel.com",
  "istockphoto.net",
];
const IMAGE_PROXY_HOSTS = [
  "tse1.mm.bing.net", "tse2.mm.bing.net", "tse3.mm.bing.net", "tse4.mm.bing.net",
  "encrypted-tbn0.gstatic.com", "encrypted-tbn1.gstatic.com", "encrypted-tbn2.gstatic.com",
  "encrypted-tbn3.gstatic.com", "images.search.yahoo.com", "google.com/url", "bing.com/images",
];
const SEARCH_HOSTS = ["google.", "bing.com", "search.yahoo.", "duckduckgo.com", "ecosia.org", "yandex."];
const UNRELATED_LOGO_WORDS = [
  "google", "facebook", "instagram", "linkedin", "tiktok", "yelp", "hipages", "oneflare",
  "trustpilot", "yellow pages", "yellowpages", "bbb", "partner", "sponsor", "powered by",
  "payment", "visa", "mastercard", "paypal",
];
const GENERIC_NAME_WORDS = new Set([
  "business", "company", "local", "services", "service", "official", "profile", "page", "website",
  "home", "businesses", "unknown", "n a", "na",
]);
const URL_NOISE_WORDS = new Set([
  "http", "https", "www", "com", "org", "net", "facebook", "instagram", "linkedin", "tiktok",
  "google", "g", "page", "profile", "share", "post", "posts", "reel", "reels", "photo", "photos",
  "video", "videos", "story", "stories", "p", "profilephp", "php",
]);
const MAX_PROVIDER_SOURCE_LABEL = 240;
const IMAGE_PROVIDER_WORDS = new Set([
  "facebook", "instagram", "google", "bing", "duckduckgo", "pinterest", "linkedin", "tiktok", "youtube", "twitter",
  "reddit", "flickr", "vimeo", "snapchat", "threads", "yelp", "houzz", "oneflare", "hipages", "image", "images",
  "photo", "photos", "thumbnail", "media", "search", "result", "results", "source", "provider", "publisher",
  "public", "official", "page", "profile", "web", "unknown", "na",
]);
const IMAGE_PROJECT_WORDS = new Set([
  "logo", "logos", "brand", "mark", "avatar", "account", "profile", "picture", "pictures", "image", "images",
  "photo", "photos", "thumbnail", "media", "project", "projects", "portfolio", "gallery", "work", "works", "installation",
  "completed", "completion", "before", "after", "property", "residential", "commercial", "driveway", "driveways",
  "slab", "slabs", "footing", "footings", "concrete", "concreting", "concreter", "concreters", "earthmoving",
  "earthwork", "earthworks", "construction", "construct", "service", "services", "local", "new", "recent", "our", "and",
]);
const IMAGE_TRADE_WORDS = new Set([
  "concrete", "concreting", "concreter", "concreters", "earthmoving", "earthwork", "earthworks", "construction",
  "excavation", "excavating", "demolition", "foundation", "foundations", "building", "builder", "builders",
  "landscaping", "landscape", "paving", "paver", "pavers", "driveway", "driveways", "civil", "masonry",
  "bricklaying", "plumbing", "electrical", "roofing", "carpentry", "fencing", "painting", "tiling", "asphalt",
  "service", "services",
]);
const SUPPORTED_SOCIAL_HOSTS = ["facebook.com", "instagram.com", "g.page", "google.com", "linkedin.com", "tiktok.com"];
const SOCIAL_PATH_MARKERS = new Set([
  "p", "post", "posts", "reel", "reels", "photo", "photos", "video", "videos", "story", "stories",
  "share", "profile.php", "profile php", "photo.php", "photo php", "groups", "group", "search", "explore", "hashtag", "hashtags", "marketplace",
  "directory", "tagged",
]);
const REDIRECT_QUERY_KEYS = ["uddg", "u", "url", "rurl", "mediaurl", "imgurl", "imageurl", "original", "originalurl", "href", "link", "target", "dest", "destination"];
const TRACKING_QUERY_RE = /^(?:utm_[a-z0-9_]+|fbclid|igshid|igsh|mibextid|ref|refsrc|__tn__|__cft__|eav|tracking|trk|share_source|share_medium|source)$/i;
const SOCIAL_IDENTITY_QUERY_KEYS = new Set(["id", "fbid", "profile_id", "story_fbid", "set", "username", "photo_id", "media_id", "comment_id"]);

class ProviderError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
  }
}

type ImageIntent = "logo" | "work";
type ImageQuery = { query: string; intent: ImageIntent };
type SearchInput = {
  businessName: string;
  trade: string;
  location: string;
  website: string;
  socialUrls: string[];
  knownSourceUrls: string[];
};
type TrustedSourceAnchor = {
  url: string;
  kind: "social" | "website";
};
type SearchItem = { title: string; url: string; description: string; score: number };
type PageData = {
  url: string;
  title: string;
  description: string;
  markdown: string;
  rawHtml: string;
  images: unknown;
};
type ImageRef = { url: string; context: string; signal: string; order: number };
type IdentityCheck = {
  accepted: boolean;
  official: boolean;
  exactName: boolean;
  exactHandle: boolean;
  linkedProfile: boolean;
  evidence: string;
};
type Candidate = {
  sourceImageUrl: string;
  sourcePageUrl: string;
  pageTitle: string;
  altText: string;
  sourceLabel?: string;
  kind: "logo" | "work" | "unknown";
  confidence: "high" | "medium";
  identity: IdentityCheck;
  order: number;
  queryIntent?: ImageIntent;
  width?: number;
  height?: number;
  logoScore: number;
};
type PublicImageResult = {
  imageUrl: string;
  sourceImageUrl: string;
  originalImageUrl: string;
  sourcePageUrl: string;
  title: string;
  altText: string;
  sourceLabel: string;
  query: string;
  queryIntent: ImageIntent;
  width?: number;
  height?: number;
};
type PublicImageCandidate = PublicImageResult & {
  kind: "logo" | "work";
  confidence: "high" | "medium";
  identity: IdentityCheck;
  logoScore: number;
};
type ImageMatchDiagnostics = {
  sourceUrlsReceived: number;
  socialSourceMatches: number;
  identityMatches: number;
  rejectedForMissingSource: number;
  rejectedForWeakIdentity: number;
  rejectedForConflictingIdentity: number;
  rejectedForSafety: number;
  logoIntentCandidates: number;
  workIntentCandidates: number;
  promotedLogoFromIntent: number;
  acceptedLogoCount: number;
  acceptedWorkCount: number;
};
type ParsedPublicImageResults = {
  results: PublicImageResult[];
  sourceEvidence: PublicImageResult[];
  sourceUrlsReceived: number;
  rejectedForMissingSource: number;
  rejectedForSafety: number;
};
type PublicImageSearchOutcome = {
  candidates: PublicImageCandidate[];
  queryCount: number;
  resultCount: number;
  matchedSourcePages: number;
  providerStatus: "completed" | "provider_unavailable" | "no_matched_pages" | "no_images";
  failures: string[];
  diagnostics: ImageMatchDiagnostics;
};

function responseJson(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

function compact(value: unknown, max = MAX_INPUT_TEXT) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#x2f;/gi, "/")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      try { return String.fromCodePoint(Number(code)); } catch { return ""; }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try { return String.fromCodePoint(parseInt(code, 16)); } catch { return ""; }
    });
}

function isUnsafeHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.includes(":")) return true;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function publicUrl(value: unknown, baseUrl = "") {
  if (typeof value !== "string") return "";
  const candidate = decodeEntities(value.trim());
  if (!candidate || /^(?:data|blob|javascript):/i.test(candidate)) return "";
  try {
    const parsed = new URL(candidate, baseUrl || undefined);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || isUnsafeHostname(parsed.hostname)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function socialHostFamilyFromHost(value: string) {
  const host = value.toLowerCase().replace(/^www\./, "").replace(/^(?:m|mbasic|mobile|touch)\./, "");
  const facebook = ["facebook.com", "fb.com"].some((known) => host === known || host.endsWith(`.${known}`));
  if (facebook) return "facebook.com";
  const instagram = host === "instagram.com" || host.endsWith(".instagram.com");
  if (instagram) return "instagram.com";
  if (host === "g.page" || host.endsWith(".g.page")) return "g.page";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin.com";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok.com";
  return "";
}

function isSearchHostname(value: string) {
  const host = value.toLowerCase().replace(/^www\./, "");
  return host.includes("google.") || host === "google.com" || host.endsWith(".google.com") || host === "bing.com" || host.endsWith(".bing.com") || host.includes("search.yahoo.") || host === "duckduckgo.com" || host.endsWith(".duckduckgo.com") || host.endsWith(".ecosia.org") || host.endsWith(".yandex.com") || host.endsWith(".yandex.ru");
}

function isImageProxyHostname(value: string) {
  const host = value.toLowerCase().replace(/^www\./, "");
  return IMAGE_PROXY_HOSTS.some((proxy) => host === proxy || host.endsWith(`.${proxy}`)) || host === "external-content.duckduckgo.com";
}

function redirectTarget(parsed: URL, kind: "source" | "image") {
  const host = parsed.hostname.toLowerCase();
  const shim = /^(?:l|lm)\.(?:facebook|instagram)\.com$/i.test(host)
    || /^(?:www\.)?(?:facebook|instagram)\.com$/i.test(host) && /\/(?:l\.php|redirect|link)$/i.test(parsed.pathname)
    || /\/url$|\/imgres$|\/ck\/a$/i.test(parsed.pathname);
  const search = isSearchHostname(host);
  const imageProxy = isImageProxyHostname(host);
  if (!shim && !search && !imageProxy) return "";
  const keys = kind === "source"
    ? ["url", "rurl", "link", "target", "dest", "destination", "href", "uddg", "u", "originalurl", "original", "mediaurl", "imgurl", "imageurl"]
    : ["mediaurl", "imgurl", "imageurl", "u", "original", "originalurl", "url", "rurl", "link", "target", "dest", "destination", "href", "uddg"];
  for (const key of keys) {
    const value = parsed.searchParams.get(key);
    if (value && /^https?:\/\//i.test(decodeEntities(value))) return value;
  }
  return "";
}

function canonicalizePublicUrl(value: unknown, kind: "source" | "image", baseUrl = "") {
  let current = publicUrl(value, baseUrl);
  for (let hop = 0; current && hop <= MAX_IMAGE_REDIRECTS; hop += 1) {
    let parsed: URL;
    try { parsed = new URL(current); } catch { return ""; }
    const nested = redirectTarget(parsed, kind);
    if (nested) {
      if (hop >= MAX_IMAGE_REDIRECTS) return "";
      const next = publicUrl(nested, current);
      if (next && next !== current) {
        current = next;
        continue;
      }
    }
    const family = socialHostFamilyFromHost(parsed.hostname);
    if (family) parsed.hostname = family;
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_QUERY_RE.test(key) && !SOCIAL_IDENTITY_QUERY_KEYS.has(key.toLowerCase())) parsed.searchParams.delete(key);
    }
    parsed.hash = "";
    if (kind === "source" && (isSearchHostname(parsed.hostname) || isImageProxyHostname(parsed.hostname))) return "";
    if (kind === "image" && (isSearchHostname(parsed.hostname) || isImageProxyHostname(parsed.hostname)) && !redirectTarget(parsed, kind)) return "";
    return parsed.toString();
  }
  return "";
}

function sourceUrl(value: unknown) {
  return canonicalizePublicUrl(value, "source");
}

function hostWithoutWww(value: string) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function isHostOrSubdomain(host: string, knownHost: string) {
  return Boolean(host && knownHost && (host === knownHost || host.endsWith(`.${knownHost}`)));
}

function normalizePhrase(value: unknown) {
  return compact(value, 500)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericBusinessName(value: unknown) {
  const phrase = normalizePhrase(value);
  return !phrase || /^(?:local business(?: co| company)?|business(?: company)?|company|local|unknown|n a|na|official profile|public profile)$/.test(phrase);
}

function compactPhrase(value: unknown) { return normalizePhrase(value).replace(/\s+/g, ""); }

function identityTokenVariants(value: string) {
  const token = normalizePhrase(value).replace(/\s+/g, "");
  if (!token) return [];
  const variants = new Set([token]);
  if (token.length > 6 && token.endsWith("ing")) {
    const stem = token.slice(0, -3);
    variants.add(stem);
    variants.add(`${stem}e`);
  }
  if (token.length > 5 && token.endsWith("ies")) variants.add(token.slice(0, -3) + "y");
  if (token.length > 5 && token.endsWith("es")) variants.add(token.slice(0, -2));
  if (token.length > 4 && token.endsWith("s")) variants.add(token.slice(0, -1));
  if (token.length > 5 && token.endsWith("e")) variants.add(token.slice(0, -1));
  return [...variants];
}

function tokensMatch(left: string, right: string) {
  const leftVariants = identityTokenVariants(left);
  const rightVariants = identityTokenVariants(right);
  return leftVariants.some((leftVariant) => rightVariants.some((rightVariant) => {
    if (leftVariant === rightVariant) return true;
    const shorter = leftVariant.length <= rightVariant.length ? leftVariant : rightVariant;
    const longer = leftVariant.length > rightVariant.length ? leftVariant : rightVariant;
    return shorter.length >= 5 && longer.startsWith(shorter) && longer.length - shorter.length <= 3;
  }));
}

function identityTokens(value: string) {
  return normalizePhrase(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !GENERIC_NAME_WORDS.has(token) && !URL_NOISE_WORDS.has(token));
}

function strongIdentityTokens(value: string) {
  return identityTokens(value).filter((token) => token.length >= 4);
}

function tokenInWordSet(token: string, words: Set<string>) {
  return [...words].some((word) => tokensMatch(token, word));
}

function imageTradeIdentityTokens(input: SearchInput) {
  const suppliedTrade = strongIdentityTokens(input.trade);
  const businessTokens = strongIdentityTokens(input.businessName);
  return [...new Set([
    ...suppliedTrade,
    ...businessTokens.filter((token) => tokenInWordSet(token, IMAGE_TRADE_WORDS) || suppliedTrade.some((tradeToken) => tokensMatch(token, tradeToken))),
  ])];
}

function imageBrandIdentityTokens(input: SearchInput) {
  const tradeTokens = imageTradeIdentityTokens(input);
  const nameTokens = strongIdentityTokens(input.businessName);
  const handleTokens = trustedSourceAnchors(input)
    .filter((source) => source.kind === "social")
    .flatMap((source) => socialPathTokens(source.url));
  return [...new Set([
    ...nameTokens.filter((token) => !tradeTokens.some((tradeToken) => tokensMatch(token, tradeToken))),
    ...handleTokens.filter((token) => !tradeTokens.some((tradeToken) => tokensMatch(token, tradeToken))),
  ])];
}

function labelContainsTargetBrand(value: string, input: SearchInput) {
  const brandTokens = imageBrandIdentityTokens(input);
  const tradeTokens = imageTradeIdentityTokens(input);
  return identityTokens(value).some((textToken) => {
    const text = compactPhrase(textToken);
    if (!text) return false;
    return brandTokens.some((brandToken) => {
      const brand = compactPhrase(brandToken);
      if (!brand || text === brand || !text.startsWith(brand)) return false;
      const suffix = text.slice(brand.length);
      return tradeTokens.some((tradeToken) => identityTokenVariants(tradeToken).some((variant) => suffix === variant));
    });
  });
}

function isDomainOnlyLabel(value: string) {
  const candidate = decodeEntities(value).trim();
  const withoutProtocol = candidate.includes("://") ? candidate.slice(candidate.indexOf("://") + 3) : candidate;
  const host = withoutProtocol.split("/")[0].split("?")[0].split("#")[0];
  return /^[a-z0-9.-]+(?::[0-9]+)?$/i.test(host) && host.includes(".");
}

function isGenericImageSourceLabel(value: string) {
  const normalized = normalizePhrase(value);
  if (!normalized || isDomainOnlyLabel(value)) return true;
  const tokens = identityTokens(value);
  return !tokens.length || tokens.every((token) => tokenInWordSet(token, IMAGE_PROVIDER_WORDS) || tokenInWordSet(token, IMAGE_PROJECT_WORDS));
}

type IdentityConflict = { conflict: boolean; evidence: string };

function sourcePageIdentityText(value: string) {
  const url = sourceUrl(value) || value;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname} ${parsed.pathname} ${socialPathTokens(url).join(" ")}`;
  } catch {
    return value;
  }
}

function conflictingIdentityLabel(value: string, input: SearchInput, sourceLabel = false): IdentityConflict {
  const label = compact(value, MAX_PROVIDER_SOURCE_LABEL);
  if (!label || isGenericImageSourceLabel(label)) return { conflict: false, evidence: "" };
  const rawTokens = identityTokens(label);
  if (!rawTokens.length) return { conflict: false, evidence: "" };
  const targetTradeTokens = imageTradeIdentityTokens(input);
  const targetBrandTokens = imageBrandIdentityTokens(input);
  const isTargetIdentityToken = (token: string) =>
    targetBrandTokens.some((brandToken) => compactPhrase(token) === compactPhrase(brandToken)) || labelContainsTargetBrand(token, input);
  const compoundResiduals = sourceLabel
    ? rawTokens.flatMap((token) => targetTradeTokens.flatMap((tradeToken) => {
      const tradeVariants = identityTokenVariants(tradeToken);
      const match = tradeVariants.find((variant) => token.length > variant.length + 2 && token.endsWith(variant));
      return match ? [token.slice(0, -match.length)] : [];
    }))
    : [];
  const tokens = [...new Set([...rawTokens, ...compoundResiduals])];
  const tradeMatches = overlapTokens(targetTradeTokens, tokens);
  const labelWords = normalizePhrase(label).split(" ").filter(Boolean);
  const residual = tokens.filter((token) =>
    !tokenInWordSet(token, IMAGE_PROVIDER_WORDS) &&
    !tokenInWordSet(token, IMAGE_PROJECT_WORDS) &&
    !isTargetIdentityToken(token) &&
    !targetTradeTokens.some((tradeToken) => tokensMatch(token, tradeToken)) &&
    !strongIdentityTokens(input.location).some((locationToken) => tokensMatch(token, locationToken)),
  );
  const hasTradeLikeContext = labelWords.some((token) => tokenInWordSet(token, IMAGE_TRADE_WORDS)) || tradeMatches.length > 0;
  const businessShapeWords = new Set([
    "group", "business", "company", "companies", "co", "inc", "llc", "ltd", "service", "services",
    "contracting", "contractor", "contractors", "construction", "earthmoving", "concreting",
  ]);
  const businessShape = label.includes("'") || label.includes("’") || label.includes("&") || labelWords.some((token) => businessShapeWords.has(token));
  const conflictEvidence = { conflict: true, evidence: `conflicting-label:${label.slice(0, 120)}` };
  if (sourceLabel && residual.length >= 1) return conflictEvidence;
  if (residual.length >= 2) {
    if (hasTradeLikeContext && businessShape) return conflictEvidence;
  } else if (residual.length === 1 && hasTradeLikeContext && businessShape) {
    return conflictEvidence;
  }
  return { conflict: false, evidence: "" };
}

function imageResultIdentityConflict(result: PublicImageResult, input: SearchInput): IdentityConflict {
  const sourcePageValue = trustedWebsiteSourceMatchesPage(result.sourcePageUrl, input)
    ? normalizedPath(result.sourcePageUrl)
    : sourcePageIdentityText(result.sourcePageUrl);
  const checks = [
    { value: sourcePageValue, sourceLabel: true },
    { value: result.sourceLabel, sourceLabel: true },
    { value: result.title, sourceLabel: false },
    { value: result.altText, sourceLabel: false },
  ];
  for (const check of checks) {
    const conflict = conflictingIdentityLabel(check.value, input, check.sourceLabel);
    if (conflict.conflict) return conflict;

  }
  return { conflict: false, evidence: "" };
}

function candidateIdentityConflict(candidate: Candidate, input: SearchInput): IdentityConflict {
  const result: PublicImageResult = {
    imageUrl: candidate.sourceImageUrl,
    sourceImageUrl: candidate.sourceImageUrl,
    originalImageUrl: candidate.sourceImageUrl,
    sourcePageUrl: candidate.sourcePageUrl,
    title: candidate.pageTitle,
    altText: candidate.altText,
    sourceLabel: candidate.sourceLabel || "",
    query: "",
    queryIntent: candidate.queryIntent || "work",
  };
  const identity = identityForImageResult(result, input);
  if (identity.accepted) return { conflict: false, evidence: "" };
  return { conflict: true, evidence: identity.evidence || "unverified-source-identity" };
}

function imageIdentityFixtureChecks() {
  const acmeSource = "https://facebook.com/acme-concrete-earthmoving";
  const acmeInput: SearchInput = {
    businessName: "Acme Concrete & Earthmoving",
    trade: "Concrete & Earthmoving",
    location: "",
    website: "",
    socialUrls: [acmeSource],
    knownSourceUrls: [acmeSource, "https://facebook.com/shannons-concreting"],
  };
  const newGenSource = "https://facebook.com/newgen-concreting-earthmoving";
  const newGenInput: SearchInput = {
    businessName: "NewGen Concreting & Earthmoving",
    trade: "Concrete & Earthmoving",
    location: "Newcastle NSW",
    website: "https://newgenconcreting.com.au",
    socialUrls: [newGenSource],
    knownSourceUrls: [newGenSource, "https://facebook.com/shannons-concreting", "https://shannonsconcreting.com.au/gallery"],
  };
  const fixture = (input: SearchInput, overrides: Partial<PublicImageResult>): PublicImageResult => ({
    imageUrl: "https://images.example.test/business-photo.jpg",
    sourceImageUrl: "https://images.example.test/business-photo.jpg",
    originalImageUrl: "https://images.example.test/business-photo.jpg",
    sourcePageUrl: "https://example.com/gallery",
    title: "Project photo",
    altText: "concrete driveway before and after",
    sourceLabel: "Image Results",
    query: "business images",
    queryIntent: "work",
    ...overrides,
  });
  const accepted = (input: SearchInput, overrides: Partial<PublicImageResult>, expected: boolean) => identityForImageResult(fixture(input, overrides), input).accepted === expected;
  const finalCandidateAccepted = (input: SearchInput, overrides: Partial<Candidate>, expected: boolean) => {
    const candidate: Candidate = {
      sourceImageUrl: "https://images.example.test/final-candidate.jpg",
      sourcePageUrl: "https://example.com/gallery",
      pageTitle: "Project photo",
      altText: "concrete driveway before and after",
      sourceLabel: "Image Results",
      kind: "logo",
      confidence: "high",
      identity: { accepted: true, official: true, exactName: true, exactHandle: true, linkedProfile: true, evidence: "stale-identity" },
      order: 0,
      queryIntent: "logo",
      logoScore: 999,
      ...overrides,
    };
    return (!candidateIdentityConflict(candidate, input).conflict) === expected;
  };
  const sourceFixture = (label: string, expectedConflict: boolean) => conflictingIdentityLabel(label, acmeInput, true).conflict === expectedConflict;
  const captionFixture = (label: string, expectedConflict: boolean) => conflictingIdentityLabel(label, acmeInput, false).conflict === expectedConflict;
  const trustedNewGenCaption = {
    sourcePageUrl: newGenSource,
    sourceLabel: "Facebook",
    title: "Project photo",
    altText: "concrete driveway before and after",
    queryIntent: "work" as const,
  };
  const verifiedWebsiteCaption = {
    sourcePageUrl: "https://newgenconcreting.com.au/projects",
    sourceLabel: "NewGen Concreting & Earthmoving",
    title: "NewGen Concreting & Earthmoving projects",
    altText: "NewGen Concreting completed driveway work",
    queryIntent: "work" as const,
  };
  const genericWebsiteCaption = {
    sourcePageUrl: "https://newgenconcreting.com.au/projects",
    sourceLabel: "Image Results",
    title: "Completed driveway projects",
    altText: "Concrete driveway installation and earthmoving projects",
    queryIntent: "work" as const,
  };
  const hostOnlyWebsiteCaption = {
    sourcePageUrl: "https://newgenconcreting.com.au/",
    sourceLabel: "newgenconcreting.com.au",
    title: "newgenconcreting.com.au",
    altText: "",
    queryIntent: "work" as const,
  };
  const conflictingWebsiteCaption = {
    sourcePageUrl: "https://newgenconcreting.com.au/gallery",
    sourceLabel: "NewGen Concreting & Earthmoving",
    title: "Shannon's Concreting gallery",
    altText: "Shannon's Concreting concrete driveway project",
    queryIntent: "work" as const,
  };
  const foreignWebsiteCaption = {
    sourcePageUrl: "https://shannonsconcreting.com.au/gallery",
    sourceLabel: "Shannon's Concreting",
    title: "Shannon's Concreting gallery",
    altText: "Concrete driveway project",
    queryIntent: "work" as const,
  };
  return [
    sourceFixture("Acme Concrete", false),
    sourceFixture("Acme Concreting & Earthmoving", false),
    captionFixture("Acme Concreting & Earthmoving", false),
    sourceFixture("Rival's Concreting & Earthmoving Services", true),
    captionFixture("Rival's Concreting & Earthmoving Services", true),
    sourceFixture("Diggers Earthmoving & Construction", true),
    captionFixture("Diggers Earthmoving & Construction", true),
    sourceFixture("Stronger Foundations", true),
    captionFixture("Stronger Foundations", false),
    sourceFixture("concrete driveway", false),
    captionFixture("concrete driveway", false),
    sourceFixture("concrete driveway before and after", false),
    captionFixture("concrete driveway before and after", false),
    sourceFixture("projects portfolio gallery", false),
    captionFixture("projects portfolio gallery", false),
    sourceFixture("Facebook", false),
    sourceFixture("Image Results", false),
    sourceFixture("Public Profile", false),
    sourceFixture("Official Page", false),
    sourceFixture("Photo", false),
    sourceFixture("Media", false),
    imageSourceMatchesKnownPage(acmeSource, acmeInput),
    accepted(newGenInput, trustedNewGenCaption, true),
    accepted(newGenInput, verifiedWebsiteCaption, true),
    accepted(newGenInput, genericWebsiteCaption, false),
    accepted(newGenInput, hostOnlyWebsiteCaption, false),
    accepted(newGenInput, conflictingWebsiteCaption, false),
    accepted(newGenInput, foreignWebsiteCaption, false),
    accepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://example.com/gallery" }, false),
    accepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://example.com/gallery", title: "Logo", altText: "logo", queryIntent: "logo" }, false),
    accepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://facebook.com/shannons-concreting" }, false),
    accepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://shannonsconcreting.com.au/gallery" }, false),
    accepted(newGenInput, { ...trustedNewGenCaption, title: "Shannon's Concreting" }, false),
    accepted(newGenInput, { ...trustedNewGenCaption, sourceLabel: "Shannon's Concreting" }, false),
    accepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://instagram.com/shannons_concreting", sourceLabel: "Instagram" }, false),
    finalCandidateAccepted(newGenInput, trustedNewGenCaption, true),
    finalCandidateAccepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://example.com/gallery", pageTitle: "Logo", altText: "logo" }, false),
    finalCandidateAccepted(newGenInput, { ...trustedNewGenCaption, sourcePageUrl: "https://shannonsconcreting.com.au/gallery" }, false),
    Boolean(sourcePageUrlCandidate(acmeSource)),
    !imageUrl("https://tse1.mm.bing.net/th?id=fixture", ""),
  ].every(Boolean);
}

function overlapTokens(source: string[], target: string[]) {
  const matched: string[] = [];
  source.forEach((token) => {
    if (target.some((candidate) => tokensMatch(token, candidate)) && !matched.includes(token)) matched.push(token);
  });
  return matched;
}

function orderedTokenSequenceMatch(value: string, tokens: string[]) {
  const compactValue = normalizePhrase(value).replace(/\s+/g, "");
  if (!compactValue || !tokens.length) return false;
  let cursor = 0;
  for (const token of tokens) {
    const variants = identityTokenVariants(token).sort((left, right) => right.length - left.length);
    const match = variants
      .map((variant) => ({ variant, index: compactValue.indexOf(variant, cursor) }))
      .filter((candidate) => candidate.index >= cursor)
      .sort((left, right) => left.index - right.index || right.variant.length - left.variant.length)[0];
    if (!match) return false;
    cursor = match.index + match.variant.length;
  }
  return true;
}

function socialHostFamily(value: string) {
  const host = hostWithoutWww(value);
  return socialHostFamilyFromHost(host);
}

function isSupportedSocialHost(value: string) {
  return Boolean(socialHostFamily(value));
}

function socialPathSegments(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.pathname.split("/").filter(Boolean).map((segment) => {
      try { return decodeURIComponent(segment); } catch { return segment; }
    });
  } catch {
    return [];
  }
}

function isOpaqueSocialSegment(value: string, previous: string) {
  const normalized = normalizePhrase(value);
  const marker = normalizePhrase(previous).replace(/\s+/g, "");
  if (!normalized || /^\d+$/.test(normalized)) return true;
  if (marker === "share") return true;
  if (!SOCIAL_PATH_MARKERS.has(normalized) && marker !== "p") return false;
  if (/[ _-]/.test(value)) return false;
  return /\d/.test(normalized);
}

function socialPathTokens(value: string) {
  try {
    const parsed = new URL(value);
    const tokens: string[] = [];
    const segments = socialPathSegments(value);
    segments.forEach((decoded, index) => {
      const normalized = normalizePhrase(decoded);
      const previous = segments[index - 1] || "";
      if (!normalized || SOCIAL_PATH_MARKERS.has(normalized) || isOpaqueSocialSegment(decoded, previous)) return;
      identityTokens(normalized).forEach((token) => {
        if (!tokens.includes(token)) tokens.push(token);
      });
    });
    ["username", "profile_id"].forEach((key) => {
      const queryValue = parsed.searchParams.get(key);
      if (!queryValue || isOpaqueSocialSegment(queryValue, key)) return;
      identityTokens(queryValue).forEach((token) => {
        if (!tokens.includes(token)) tokens.push(token);
      });
    });
    return tokens;
  } catch { return []; }
}

function handleFromUrl(value: string) {
  return socialPathTokens(value).join(" ");
}

function nameFromSourceUrls(urls: string[]) {
  const readable = urls
    .map(handleFromUrl)
    .filter((handle) => identityTokens(handle).length > 0)
    .sort((left, right) => identityTokens(right).length - identityTokens(left).length || right.length - left.length);
  return readable[0] || "";
}

type IdentityEvidence = {
  nameMatches: string[];
  brandMatches: string[];
  tradeMatches: string[];
  handleMatches: string[];
  exactName: boolean;
  exactHandle: boolean;
  strong: boolean;
};

function identityEvidence(value: string, input: SearchInput): IdentityEvidence {
  const textTokens = identityTokens(value);
  const nameTokens = strongIdentityTokens(input.businessName);
  const tradeTokens = strongIdentityTokens(input.trade);
  const brandTokens = nameTokens.filter((token) => !tradeTokens.some((tradeToken) => tokensMatch(token, tradeToken)));
  const nameMatches = overlapTokens(nameTokens, textTokens);
  const brandMatches = overlapTokens(brandTokens, textTokens);
  const tradeMatches = overlapTokens(tradeTokens, textTokens);
  const handleGroups = trustedSourceAnchors(input)
    .filter((source) => source.kind === "social")
    .map((source) => socialPathTokens(source.url))
    .filter((tokens) => tokens.length > 0);
  const handleTokens = [...new Set(handleGroups.flat())];
  const handleMatches = overlapTokens(handleTokens, textTokens);
  const nameSequence = nameTokens.length >= 2 && orderedTokenSequenceMatch(value, nameTokens);
  const compactNameSequence = nameTokens.length >= 2 && orderedTokenSequenceMatch(value.replace(/&/g, " and "), nameTokens);
  const handleSequence = handleGroups.some((tokens) => tokens.length >= 2 && orderedTokenSequenceMatch(value, tokens));
  const exactName = Boolean(nameTokens.length && (nameMatches.length === nameTokens.length || nameSequence || compactNameSequence));
  const exactHandle = Boolean(handleGroups.some((tokens) => tokens.length >= 2 && (
    overlapTokens(tokens, textTokens).length >= Math.min(2, tokens.length) || orderedTokenSequenceMatch(value, tokens)
  )));
  const strong = Boolean(
    (brandMatches.length > 0 && tradeMatches.length > 0) ||
    (exactName && nameTokens.length >= 2) ||
    compactNameSequence ||
    (handleSequence && (brandMatches.length > 0 || tradeMatches.length > 0)) ||
    (exactHandle && (brandMatches.length > 0 || tradeMatches.length > 0)),
  );
  return { nameMatches, brandMatches, tradeMatches, handleMatches, exactName, exactHandle, strong };
}

function socialPathHasStrongBusinessIdentity(value: string, input: SearchInput) {
  const pathTokens = socialPathTokens(value);
  const pathEvidence = identityEvidence(pathTokens.join(" "), input);
  if (pathEvidence.strong) return true;
  let pathValue = value;
  try { pathValue = new URL(value).pathname; } catch { /* Use the supplied value when it is already path-like. */ }
  const nameTokens = strongIdentityTokens(input.businessName);
  const tradeTokens = strongIdentityTokens(input.trade);
  const compactPathHasName = nameTokens.length >= 2 && orderedTokenSequenceMatch(pathValue, nameTokens);
  const compactPathHasBrandAndTrade = Boolean(
    nameTokens.some((token) => orderedTokenSequenceMatch(pathValue, [token])) &&
    tradeTokens.some((token) => orderedTokenSequenceMatch(pathValue, [token])),
  );
  const handlePathMatch = trustedSourceAnchors(input).some((known) => {
    if (known.kind !== "social") return false;
    const knownTokens = socialPathTokens(known.url);
    return knownTokens.length >= 2 && orderedTokenSequenceMatch(pathValue, knownTokens);
  });
  return compactPathHasName || compactPathHasBrandAndTrade || handlePathMatch;
}

function socialPathHasDirectTargetIdentity(value: string, input: SearchInput) {
  let pathValue = value;
  try { pathValue = new URL(value).pathname; } catch { /* Use the supplied value when it is already path-like. */ }
  const nameTokens = strongIdentityTokens(input.businessName);
  const tradeTokens = imageTradeIdentityTokens(input);
  const brandTokens = nameTokens.filter((token) => !tradeTokens.some((tradeToken) => tokensMatch(token, tradeToken)));
  const compactName = nameTokens.length >= 2 && orderedTokenSequenceMatch(pathValue, nameTokens);
  const brandAndTrade = Boolean(
    brandTokens.some((token) => orderedTokenSequenceMatch(pathValue, [token])) &&
    tradeTokens.some((token) => orderedTokenSequenceMatch(pathValue, [token])),
  );
  return compactName || brandAndTrade;
}

function verifiedWebsiteSource(value: string) {
  const url = sourceUrl(value);
  if (!url) return "";
  const host = hostWithoutWww(url);
  if (!host || isSearchHostname(host) || isImageProxyHostname(host) || isSupportedSocialHost(url)) return "";
  if (STOCK_HOSTS.some((stock) => host === stock || host.endsWith(`.${stock}`))) return "";
  return url;
}

function trustedSourceAnchors(input: SearchInput): TrustedSourceAnchor[] {
  const explicitSocial = new Set(input.socialUrls.map(sourceUrl).filter(Boolean));
  const submittedCandidates = [...new Set([
    ...input.socialUrls.map(sourceUrl),
    ...input.knownSourceUrls.map(sourceUrl),
  ].filter(Boolean))];
  const socialAnchors = submittedCandidates
    .filter((url) => isSupportedSocialHost(url) && !isSocialListingPage(url) && !isSocialContentPage(url) && !isOpaqueSocialPath(url))
    .filter((url) => explicitSocial.has(url) || socialPathHasDirectTargetIdentity(url, input))
    .map((url) => ({ url, kind: "social" as const }));
  const website = verifiedWebsiteSource(input.website);
  const anchors = [...socialAnchors];
  if (website) anchors.push({ url: website, kind: "website" });
  return [...new Map(anchors.map((anchor) => [`${anchor.kind}|${anchor.url}`, anchor])).values()];
}

function trustedWebsiteSourceMatchesPage(pageUrl: string, input: SearchInput) {
  const page = sourceUrl(pageUrl);
  const website = verifiedWebsiteSource(input.website);
  if (!page || !website) return false;
  const pageHost = hostWithoutWww(page);
  const websiteHost = hostWithoutWww(website);
  return Boolean(pageHost && websiteHost && isHostOrSubdomain(pageHost, websiteHost));
}

function trustedSocialSourceMatchesPage(pageUrl: string, input: SearchInput) {
  const page = sourceUrl(pageUrl);
  if (!page) return false;
  const pageFamily = socialHostFamily(page);
  if (!pageFamily) return false;
  return trustedSourceAnchors(input).some((anchor) => {
    if (anchor.kind !== "social") return false;
    const anchorFamily = socialHostFamily(anchor.url);
    return Boolean(anchorFamily && pageFamily === anchorFamily && socialPathsEquivalent(page, anchor.url));
  });
}

function websiteIdentityEvidenceFields(result: PublicImageResult) {
  return [result.title, result.altText, result.sourceLabel, normalizedPath(result.sourcePageUrl)]
    .map((value) => compact(value, 1_000))
    .filter((value) => Boolean(value && value !== "/" && !isDomainOnlyLabel(value)));
}

function websitePageHasPositiveIdentity(result: PublicImageResult, input: SearchInput) {
  const fields = websiteIdentityEvidenceFields(result);
  if (!fields.length) return false;
  const evidence = identityEvidence(fields.join(" "), input);
  return Boolean(evidence.strong || evidence.exactName || evidence.exactHandle);
}

function quote(value: string) { return value ? `"${value.replace(/["\r\n]/g, " ").slice(0, 120)}"` : ""; }

function normalizeInputs(body: Record<string, unknown>): SearchInput {
  const rawSocial = Array.isArray(body.socialUrls)
    ? body.socialUrls
    : body.socialUrls && typeof body.socialUrls === "object"
      ? Object.values(body.socialUrls as Record<string, unknown>)
      : [];
  const rawKnown = Array.isArray(body.knownSourceUrls) ? body.knownSourceUrls : [];
  const socialUrls = [...rawSocial, body.facebookUrl, body.instagramUrl, body.googleBusinessUrl]
    .map(sourceUrl)
    .filter(Boolean);
  const knownSourceUrls = [...rawKnown, ...socialUrls, body.website]
    .map(sourceUrl)
    .filter(Boolean);
  const dedupe = (items: string[]) => [...new Set(items)].slice(0, MAX_SOURCE_URLS);
  const website = sourceUrl(body.website);
  const suppliedName = compact(body.businessName);
  const businessName = !isGenericBusinessName(suppliedName) ? suppliedName : nameFromSourceUrls(dedupe(socialUrls));
  return {
    businessName,
    trade: compact(body.trade),
    location: compact(body.location),
    website,
    socialUrls: dedupe(socialUrls),
    knownSourceUrls: dedupe(knownSourceUrls),
  };
}

function buildQueries(input: SearchInput) {
  const trustedUrls = trustedSourceAnchors(input).map((source) => source.url);
  const name = !isGenericBusinessName(input.businessName) ? input.businessName : nameFromSourceUrls(trustedUrls);
  if (!name) return [];
  const trade = input.trade && !GENERIC_NAME_WORDS.has(normalizePhrase(input.trade)) ? input.trade : "local business";
  const location = input.location ? quote(input.location) : "";
  const websiteHost = hostWithoutWww(input.website);
  const first = [quote(name), quote(trade), location].filter(Boolean).join(" ");
  const siteHint = websiteHost ? ` site:${websiteHost}` : "";
  const second = [quote(name), quote(trade), quote("projects portfolio gallery"), location].filter(Boolean).join(" ") + siteHint;
  return [...new Set([first, second].filter(Boolean))].slice(0, 2);
}

function buildImageQueries(input: SearchInput): ImageQuery[] {
  const trustedUrls = trustedSourceAnchors(input).map((source) => source.url);
  const name = !isGenericBusinessName(input.businessName) ? input.businessName : nameFromSourceUrls(trustedUrls);
  if (!name) return [];
  const trade = input.trade && !GENERIC_NAME_WORDS.has(normalizePhrase(input.trade)) ? input.trade : "local business";
  const location = input.location ? quote(input.location) : "";
  const logoQuery = [quote(name), quote(trade), quote("logo profile avatar"), location].filter(Boolean).join(" ");
  const workQuery = [quote(name), quote(trade), quote("projects portfolio gallery work"), location].filter(Boolean).join(" ");
  return [
    { query: logoQuery, intent: "logo" },
    { query: workQuery, intent: "work" },
  ].filter((item) => item.query).slice(0, MAX_IMAGE_QUERIES);
}

async function readTextLimited(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) return "";
  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= maxBytes ? text : "";
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* Ignore cancellation errors. */ }
        return "";
      }
      chunks.push(next.value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* Ignore reader cleanup errors. */ }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  return new TextDecoder().decode(bytes);
}

async function fetchJson(url: string, body: unknown, apiKey: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await readTextLimited(response, MAX_PAGE_RESPONSE_BYTES);
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { throw new ProviderError("FIRECRAWL_INVALID_JSON", "The public search provider returned an unreadable response.", 502); }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new ProviderError("FIRECRAWL_AUTH_FAILED", "The public image search provider rejected its server connection.", 502);
      if (response.status === 429) throw new ProviderError("FIRECRAWL_RATE_LIMITED", "Public image search is temporarily rate-limited. Try again shortly.", 429);
      throw new ProviderError("FIRECRAWL_HTTP_ERROR", "The public image search provider is unavailable right now.", 502);
    }
    return payload;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as any)?.name === "AbortError") throw new ProviderError("FIRECRAWL_TIMEOUT", "The public image search provider took too long to respond.", 504);
    throw new ProviderError("FIRECRAWL_UNAVAILABLE", "The public image search provider could not be reached.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicText(url: string, init: RequestInit, timeoutMs = IMAGE_RESULTS_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      throw new ProviderError("IMAGE_RESULTS_HTTP_ERROR", "The public image-results provider is unavailable.", status);
    }
    const text = await readTextLimited(response, MAX_IMAGE_RESPONSE_BYTES);
    if (!text) throw new ProviderError("IMAGE_RESULTS_EMPTY", "The public image-results provider returned no usable response.", 502);
    return text;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as any)?.name === "AbortError") throw new ProviderError("IMAGE_RESULTS_TIMEOUT", "The public image-results provider took too long to respond.", 504);
    throw new ProviderError("IMAGE_RESULTS_UNAVAILABLE", "The public image-results provider could not be reached.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

function duckDuckGoToken(html: string) {
  const patterns = [
    /(?:vqd|vqdToken)\s*[:=]\s*["']?([A-Za-z0-9_-]+)["']?/i,
    /["']vqd["']\s*:\s*["']([^"']+)["']/i,
    /vqd%3D([A-Za-z0-9_-]+)/i,
  ];
  for (const pattern of patterns) {
    const token = html.match(pattern)?.[1]?.trim();
    if (token && token.length >= 6 && token.length <= 180) return token;
  }
  return "";
}

function imageResultsArray(payload: any) {
  const values = [payload?.results, payload?.data?.results, payload?.images, payload?.data?.images, payload?.data];
  for (const value of values) if (Array.isArray(value)) return value;
  return [];
}

async function fetchDuckDuckGoImageResults(query: string) {
  const landingParams = new URLSearchParams({ q: query, ia: "images", iax: "images" });
  const landingUrl = `${DUCKDUCKGO_HTML_URL}?${landingParams.toString()}`;
  const headers = {
    "Accept": "text/html,application/xhtml+xml",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  };
  const landingHtml = await fetchPublicText(landingUrl, { headers });
  const token = duckDuckGoToken(landingHtml);
  if (!token) throw new ProviderError("IMAGE_RESULTS_TOKEN_MISSING", "The public image-results provider did not expose a search token.", 502);
  const params = new URLSearchParams({
    l: "us-en",
    o: "json",
    q: query,
    vqd: token,
    f: ",,,,",
    p: "1",
    s: "0",
  });
  const responseText = await fetchPublicText(`${DUCKDUCKGO_IMAGE_URL}?${params.toString()}`, {
    headers: {
      "Accept": "application/json",
      "Referer": landingUrl,
      "User-Agent": headers["User-Agent"],
    },
  });
  try {
    return imageResultsArray(JSON.parse(responseText)).slice(0, MAX_IMAGE_RESULT_ITEMS);
  } catch {
    throw new ProviderError("IMAGE_RESULTS_INVALID_JSON", "The public image-results provider returned an unreadable response.", 502);
  }
}

function recoverImageParameter(value: unknown) {
  const url = publicUrl(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    for (const key of ["mediaurl", "imgurl", "imageurl", "original", "originalurl", "u"]) {
      const nested = parsed.searchParams.get(key);
      if (nested && /^https?:\/\//i.test(nested)) return nested;
    }
    return url;
  } catch {
    return "";
  }
}

function originalImageUrl(raw: any) {
  const preferred = [
    raw?.image,
    raw?.mediaurl,
    raw?.mediaUrl,
    raw?.imgurl,
    raw?.imgUrl,
    raw?.original,
    raw?.originalUrl,
    raw?.imageUrl,
    raw?.image_url,
    raw?.contentUrl,
    raw?.content_url,
    raw?.murl,
    raw?.media?.image,
  ];
  for (const value of preferred) {
    const recovered = recoverImageParameter(value);
    if (recovered) return recovered;
  }
  for (const value of [raw?.url, raw?.link, raw?.href, raw?.rurl, raw?.purl]) {
    const recovered = recoverImageParameter(value);
    if (recovered && recovered !== publicUrl(value)) {
      return recovered;
    }
  }
  return recoverImageParameter(raw?.thumbnail) || recoverImageParameter(raw?.thumb);
}

function resultSourcePageValues(raw: any): unknown[] {
  return [
    raw?.url,
    raw?.sourcePageUrl,
    raw?.source_page_url,
    raw?.pageUrl,
    raw?.page_url,
    raw?.sourceUrl,
    raw?.source_url,
    raw?.link,
    raw?.href,
    raw?.rurl,
    raw?.purl,
    raw?.media?.sourceUrl,
    raw?.media?.pageUrl,
    raw?.media?.sourcePageUrl,
    raw?.media?.source_page_url,
  ];
}

function providerLabelText(value: unknown, depth = 0): string {
  if (depth > 2) return "";
  if (typeof value === "string") return compact(decodeEntities(value), MAX_PROVIDER_SOURCE_LABEL);
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["name", "label", "title", "text", "displayName", "display_name", "domain", "site", "publisher"]) {
    const label = providerLabelText(record[key], depth + 1);
    if (label) return label;
  }
  return "";
}

function resultSourceLabel(raw: any) {
  const values = [
    raw?.sourceLabel,
    raw?.source_label,
    raw?.source,
    raw?.site,
    raw?.publisher,
    raw?.domain,
    raw?.author,
    raw?.media?.sourceLabel,
    raw?.media?.source_label,
    raw?.media?.source,
    raw?.media?.site,
    raw?.media?.publisher,
    raw?.media?.domain,
    raw?.media?.author,
    raw?.metadata?.source,
    raw?.metadata?.site,
    raw?.metadata?.publisher,
  ];
  const labels = [...new Set(values.map((value) => providerLabelText(value)).filter(Boolean))];
  return compact(labels.slice(0, 3).join(" · "), MAX_PROVIDER_SOURCE_LABEL);
}

function mergeResultText(values: unknown[], max: number) {
  const seen = new Set<string>();
  const parts: string[] = [];
  values.forEach((value) => {
    const text = compact(value, max);
    const key = normalizePhrase(text);
    if (!text || seen.has(key)) return;
    seen.add(key);
    parts.push(text);
  });
  return compact(parts.join(" · "), max);
}

function publicImageResultKey(result: PublicImageResult) {
  return `${result.sourceImageUrl}|${result.sourcePageUrl}|${result.title}|${result.altText}|${result.sourceLabel}|${result.queryIntent}`;
}

function mergePublicImageResults(left: PublicImageResult, right: PublicImageResult) {
  const preferred = right.queryIntent === "logo" && left.queryIntent === "work" ? right : left;
  return {
    ...preferred,
    title: mergeResultText([left.title, right.title], 360),
    altText: mergeResultText([left.altText, right.altText], 500),
    sourceLabel: mergeResultText([left.sourceLabel, right.sourceLabel], MAX_PROVIDER_SOURCE_LABEL),
  };
}

function looksLikeImageUrl(value: string) {
  try {
    const parsed = new URL(value);
    return /\.(?:avif|bmp|gif|jpe?g|png|tiff?|webp)(?:$|\?)/i.test(parsed.pathname) || /(?:image|img|thumbnail|media|photo)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function sourcePageUrlCandidate(value: unknown) {
  const url = sourceUrl(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (isSearchHostname(host) || isImageProxyHostname(host)) return "";
    if (STOCK_HOSTS.some((stock) => host === stock || host.endsWith(`.${stock}`))) return "";
    const socialPage = isSupportedSocialHost(url) && !/\.(?:avif|bmp|gif|jpe?g|png|tiff?|webp|svg|ico)$/i.test(parsed.pathname);
    if (looksLikeImageUrl(url) && !socialPage) return "";
    return url;
  } catch {
    return "";
  }
}

function resultSourcePageUrl(raw: any) {
  for (const value of resultSourcePageValues(raw)) {
    const url = sourcePageUrlCandidate(value);
    if (url) return url;
  }
  return "";
}

type ParsedPublicImageRow = PublicImageResult;

function parsePublicImageResults(payload: any[], imageQuery: ImageQuery): ParsedPublicImageResults {
  const results: ParsedPublicImageRow[] = [];
  const sourceEvidence: ParsedPublicImageRow[] = [];
  let sourceUrlsReceived = 0;
  let rejectedForMissingSource = 0;
  let rejectedForSafety = 0;
  payload.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const sourceValues = resultSourcePageValues(raw);
    const hasSourceValue = sourceValues.some((value) => Boolean(publicUrl(value)) && !looksLikeImageUrl(publicUrl(value)));
    if (hasSourceValue) sourceUrlsReceived += 1;
    const sourcePage = resultSourcePageUrl(raw);
    const original = originalImageUrl(raw);
    const image = imageUrl(original, "");
    if (!sourcePage) {
      if (hasSourceValue || original) rejectedForMissingSource += 1;
      return;
    }
    const title = compact(raw.title || raw.name || raw.caption || raw.media?.title || raw.context, 360);
    const altText = compact([raw.alt, raw.description, raw.caption, raw.title, raw.context, raw.media?.alt].filter(Boolean).join(" "), 500);
    const sourceLabel = resultSourceLabel(raw);
    const result: ParsedPublicImageRow = {
      imageUrl: image,
      sourceImageUrl: image,
      originalImageUrl: image,
      sourcePageUrl: sourcePage,
      title,
      altText,
      sourceLabel,
      query: imageQuery.query,
      queryIntent: imageQuery.intent,
      width: Number.isFinite(Number(raw.width)) ? Math.max(0, Math.min(10_000, Number(raw.width))) : undefined,
      height: Number.isFinite(Number(raw.height)) ? Math.max(0, Math.min(10_000, Number(raw.height))) : undefined,
    };
    sourceEvidence.push(result);
    if (image) results.push(result);
    else if (original) rejectedForSafety += 1;
  });
  return { results, sourceEvidence, sourceUrlsReceived, rejectedForMissingSource, rejectedForSafety };
}

async function searchPublicImageResults(input: SearchInput): Promise<PublicImageSearchOutcome> {
  if (!imageIdentityFixtureChecks()) {
    console.error("[search-business-images] identity fixture checks failed");
    throw new ProviderError("IMAGE_IDENTITY_GUARD_FAILED", "The image identity safety checks failed.", 500);
  }
  const queries = buildImageQueries(input);
  const emptyDiagnostics: ImageMatchDiagnostics = {
    sourceUrlsReceived: 0,
    socialSourceMatches: 0,
    identityMatches: 0,
    rejectedForMissingSource: 0,
    rejectedForWeakIdentity: 0,
    rejectedForConflictingIdentity: 0,
    rejectedForSafety: 0,
    logoIntentCandidates: 0,
    workIntentCandidates: 0,
    promotedLogoFromIntent: 0,
    acceptedLogoCount: 0,
    acceptedWorkCount: 0,
  };
  if (!queries.length) {
    return {
      candidates: [],
      queryCount: 0,
      resultCount: 0,
      matchedSourcePages: 0,
      providerStatus: "no_images",
      failures: [],
      diagnostics: emptyDiagnostics,
    };
  }

  const results: PublicImageResult[] = [];
  const sourceEvidence: PublicImageResult[] = [];
  const failures: string[] = [];
  let resultCount = 0;
  let sourceUrlsReceived = 0;
  let rejectedForMissingSource = 0;
  let rejectedForSafety = 0;
  await Promise.all(queries.map(async (imageQuery) => {
    try {
      const payload = await fetchDuckDuckGoImageResults(imageQuery.query);
      resultCount += payload.length;
      const parsed = parsePublicImageResults(payload, imageQuery);
      results.push(...parsed.results);
      sourceEvidence.push(...parsed.sourceEvidence);
      sourceUrlsReceived += parsed.sourceUrlsReceived;
      rejectedForMissingSource += parsed.rejectedForMissingSource;
      rejectedForSafety += parsed.rejectedForSafety;
    } catch (error) {
      const provider = error instanceof ProviderError
        ? error
        : new ProviderError("IMAGE_RESULTS_UNAVAILABLE", "The public image-results provider could not be reached.");
      failures.push(provider.code);
    }
  }));

  const uniqueResultMap = new Map<string, PublicImageResult>();
  results.forEach((result) => {
    const key = `${result.sourceImageUrl}|${result.sourcePageUrl}`;
    const previous = uniqueResultMap.get(key);
    uniqueResultMap.set(key, previous ? mergePublicImageResults(previous, result) : result);
  });
  const uniqueResults = [...uniqueResultMap.values()].slice(0, MAX_IMAGE_QUERIES * MAX_IMAGE_RESULT_ITEMS);
  const uniqueSourceEvidence = [...new Map(sourceEvidence.map((result) => [
    publicImageResultKey(result),
    result,
  ])).values()].slice(0, MAX_IMAGE_QUERIES * MAX_IMAGE_RESULT_ITEMS);
  const candidates: PublicImageCandidate[] = [];
  const seenImages = new Set<string>();
  const matchedPages = new Set<string>();
  const socialMatchedPages = new Set<string>();
  let rejectedForWeakIdentity = 0;
  let rejectedForConflictingIdentity = 0;

  uniqueSourceEvidence.forEach((result) => {
    const conflict = imageResultIdentityConflict(result, input);
    const identity = identityForImageResult(result, input);
    if (isSupportedSocialHost(result.sourcePageUrl) && (imageSourceMatchesKnownPage(result.sourcePageUrl, input) || identity.accepted)) {
      socialMatchedPages.add(result.sourcePageUrl);
    }
    if (identity.accepted) matchedPages.add(result.sourcePageUrl);
    else if (conflict.conflict) rejectedForConflictingIdentity += 1;
    else rejectedForWeakIdentity += 1;
  });

  uniqueResults.forEach((result) => {
    const classification = classifyPublicImage(result, input);
    if (!classification || seenImages.has(result.sourceImageUrl)) return;
    seenImages.add(result.sourceImageUrl);
    candidates.push({
      ...result,
      kind: classification.kind,
      confidence: classification.confidence,
      identity: classification.identity,
      logoScore: classification.logoScore,
    });
  });

  const sorted = [...candidates].sort((left, right) => right.logoScore - left.logoScore || left.queryIntent.localeCompare(right.queryIntent));
  const explicitLogoCandidate = sorted.find((candidate) => candidate.logoScore >= 48);
  const logoIntentCandidates = candidates.filter((candidate) => candidate.queryIntent === "logo");
  const workIntentCandidates = candidates.filter((candidate) => candidate.queryIntent === "work");
  const fallbackLogoCandidate = explicitLogoCandidate
    ? undefined
    : logoIntentCandidates
      .map((candidate, index) => ({ candidate, score: logoIntentFallbackScore(candidate), index }))
      .filter(({ score }) => score >= LOGO_INTENT_FALLBACK_THRESHOLD)
      .sort((left, right) =>
        right.score - left.score ||
        right.candidate.logoScore - left.candidate.logoScore ||
        (right.candidate.confidence === "high" ? 1 : 0) - (left.candidate.confidence === "high" ? 1 : 0) ||
        left.index - right.index,
      )[0]?.candidate;
  const logoCandidate = explicitLogoCandidate || fallbackLogoCandidate;
  const promotedLogoFromIntent = !explicitLogoCandidate && fallbackLogoCandidate ? 1 : 0;
  const rankedCandidates = sorted.map((candidate) => ({
    ...candidate,
    kind: logoCandidate && candidate.sourceImageUrl === logoCandidate.sourceImageUrl ? "logo" as const : "work" as const,
  }));
  const rankedLogo = logoCandidate ? rankedCandidates.find((candidate) => candidate.sourceImageUrl === logoCandidate.sourceImageUrl) : undefined;
  const selectedCandidates = [
    ...(rankedLogo ? [rankedLogo] : []),
    ...rankedCandidates.filter((candidate) => !logoCandidate || candidate.sourceImageUrl !== logoCandidate.sourceImageUrl),
  ].slice(0, MAX_RETURNED_CANDIDATES);
  const acceptedLogoCount = selectedCandidates.filter((candidate) => candidate.kind === "logo").length;
  const acceptedWorkCount = selectedCandidates.filter((candidate) => candidate.kind === "work").length;

  let providerStatus: PublicImageSearchOutcome["providerStatus"] = "no_images";
  if (selectedCandidates.length) providerStatus = "completed";
  else if (failures.length === queries.length && !resultCount) providerStatus = "provider_unavailable";
  else if (!matchedPages.size) providerStatus = "no_matched_pages";

  return {
    candidates: selectedCandidates,
    queryCount: queries.length,
    resultCount,
    matchedSourcePages: matchedPages.size,
    providerStatus,
    failures: [...new Set(failures)].slice(0, 4),
    diagnostics: {
      sourceUrlsReceived,
      socialSourceMatches: socialMatchedPages.size,
      identityMatches: matchedPages.size,
      rejectedForMissingSource,
      rejectedForWeakIdentity,
      rejectedForConflictingIdentity,
      rejectedForSafety,
      logoIntentCandidates: logoIntentCandidates.length,
      workIntentCandidates: workIntentCandidates.length,
      promotedLogoFromIntent,
      acceptedLogoCount,
      acceptedWorkCount,
    },
  };
}

function arrayFromResponse(payload: any) {
  const candidates = [
    payload?.data?.web, payload?.data?.results, payload?.web, payload?.results,
    payload?.data?.data, payload?.data,
  ];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function searchItems(payload: any, input: SearchInput) {
  const locationTokens = identityTokens(input.location);
  const websiteHost = hostWithoutWww(input.website);
  const knownHosts = trustedSourceAnchors(input).map((source) => hostWithoutWww(source.url)).filter(Boolean);
  const items: SearchItem[] = [];
  const seen = new Set<string>();
  arrayFromResponse(payload).slice(0, MAX_SEARCH_RESULTS * 2).forEach((raw: any) => {
    if (!raw || typeof raw !== "object") return;
    const url = publicUrl(raw.url || raw.link || raw.sourceUrl || raw.href);
    if (!url) return;
    const host = hostWithoutWww(url);
    if (!host || SEARCH_HOSTS.some((term) => host.includes(term))) return;
    const key = `${new URL(url).origin}${new URL(url).pathname}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const title = compact(raw.title || raw.name || raw.metadata?.title, 360);
    const description = compact(raw.description || raw.snippet || raw.text || raw.metadata?.description, 700);
    const evidence = identityEvidence(`${title} ${description} ${url}`, input);
    let score = 0;
    if (evidence.strong) score += 10;
    else if (evidence.exactName || evidence.exactHandle) score += 5;
    if (evidence.brandMatches.length) score += 3;
    if (evidence.tradeMatches.length) score += 2;
    if (locationTokens.length && overlapTokens(locationTokens, identityTokens(`${title} ${description}`)).length) score += 1;
    if (websiteHost && isHostOrSubdomain(host, websiteHost)) score += 7;
    if (knownHosts.some((knownHost) => isHostOrSubdomain(host, knownHost))) score += 4;
    if (/portfolio|project|gallery|work|photo|before|after/i.test(`${title} ${description}`)) score += 2;
    if (/search|results|image|thumbnail|cache|redirect/i.test(url)) score -= 3;
    items.push({ title, url, description, score });
  });
  return items.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).slice(0, MAX_SEARCH_RESULTS);
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeEntities((match?.[1] || match?.[2] || match?.[3] || "").trim());
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MARKDOWN_CHARS);
}

function imageUrl(value: unknown, baseUrl: string) {
  const url = canonicalizePublicUrl(value, "image", baseUrl);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const lower = url.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (STOCK_HOSTS.some((stock) => host === stock || host.endsWith(`.${stock}`))) return "";
    if (host === "external-content.duckduckgo.com" || IMAGE_PROXY_HOSTS.some((proxy) => host === proxy || lower.includes(proxy))) return "";
    if (isSearchHostname(host)) return "";
    if (/\.(?:svg|ico)$/i.test(path) || /(?:pixel|tracker|beacon|spacer|transparent|favicon|sprite|spinner|blank\.)/i.test(lower)) return "";
    return parsed.toString();
  } catch { return ""; }
}

function addRef(refs: ImageRef[], seen: Set<string>, value: unknown, context: unknown, signal: string, baseUrl: string) {
  if (refs.length >= MAX_PAGE_IMAGE_REFS) return;
  const url = imageUrl(value, baseUrl);
  if (!url || seen.has(url)) return;
  seen.add(url);
  refs.push({ url, context: compact(context, 500), signal, order: refs.length });
}

function addSrcset(refs: ImageRef[], seen: Set<string>, value: string, context: string, signal: string, baseUrl: string) {
  value.split(",").slice(0, 8).forEach((part) => addRef(refs, seen, part.trim().split(/\s+/)[0], context, signal, baseUrl));
}

function collectHtmlRefs(html: string, baseUrl: string, refs: ImageRef[], seen: Set<string>) {
  const metaRe = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRe.exec(html)) !== null) {
    const tag = match[0];
    const key = (attr(tag, "property") || attr(tag, "name") || attr(tag, "itemprop")).toLowerCase();
    if (/^(?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src|image|thumbnail|thumbnailurl|logo)$/i.test(key)) {
      addRef(refs, seen, attr(tag, "content"), `${key} ${attr(tag, "alt")} ${attr(tag, "title")}`, key.includes("logo") ? "logo-metadata" : "metadata", baseUrl);
    }
  }
  const imgRe = /<(?:img|source)\b[^>]*>/gi;
  while ((match = imgRe.exec(html)) !== null) {
    const tag = match[0];
    const context = `${attr(tag, "alt")} ${attr(tag, "title")} ${attr(tag, "aria-label")} ${attr(tag, "class")} ${attr(tag, "id")}`;
    const nearby = stripHtml(html.slice(Math.max(0, (match.index || 0) - 120), Math.min(html.length, (match.index || 0) + 620)));
    const fullContext = `${context} ${nearby}`;
    const logo = /\b(?:logo|brand[-_ ]?mark|avatar|profile[-_ ]?(?:photo|picture|image))\b/i.test(fullContext);
    const attrs = ["src", "data-src", "data-lazy-src", "data-original", "data-image", "data-url", "data-avatar", "data-profile-picture", "data-fsrc"];
    attrs.forEach((name) => addRef(refs, seen, attr(tag, name), fullContext, logo ? "logo-markup" : name.startsWith("data-") ? "lazy-markup" : "markup", baseUrl));
    ["srcset", "data-srcset"].forEach((name) => {
      const value = attr(tag, name);
      if (value) addSrcset(refs, seen, value, fullContext, logo ? "logo-srcset" : "srcset", baseUrl);
    });
  }
  const figureRe = /<(?:figure|a|div)\b[^>]*>[\s\S]{0,1800}?<\/\s*(?:figure|a|div)>/gi;
  while ((match = figureRe.exec(html)) !== null) {
    const block = match[0];
    const image = block.match(/<(?:img|source)\b[^>]*>/i)?.[0] || "";
    if (!image) continue;
    const context = stripHtml(block).slice(0, 700);
    const url = attr(image, "src") || attr(image, "data-src") || attr(image, "data-original");
    addRef(refs, seen, url, context, /\b(?:project|portfolio|gallery|work|installation|completed|before|after)\b/i.test(context) ? "work-caption" : "caption", baseUrl);
  }
  const backgroundRe = /background(?:-image)?\s*:\s*[^;{}]*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((match = backgroundRe.exec(html)) !== null) addRef(refs, seen, match[1], "background image", "background", baseUrl);
}

function collectJsonRefs(value: unknown, key: string, baseUrl: string, refs: ImageRef[], seen: Set<string>, depth = 0) {
  if (depth > 6 || refs.length >= MAX_PAGE_IMAGE_REFS) return;
  const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
  const imageKey = ["image", "logo", "contenturl", "thumbnailurl", "photo", "photourl"].includes(normalizedKey);
  if (typeof value === "string") {
    if (imageKey) addRef(refs, seen, value, `${key} ${value.slice(0, 220)}`, normalizedKey === "logo" ? "logo-jsonld" : "jsonld", baseUrl);
    return;
  }
  if (Array.isArray(value)) {
    value.slice(0, 20).forEach((item) => collectJsonRefs(item, key, baseUrl, refs, seen, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (imageKey) {
    const signal = normalizedKey === "logo" ? "logo-jsonld" : "jsonld";
    ["url", "contentUrl", "contentURL", "src", "imageUrl", "image_url"].forEach((nestedKey) => {
      if (typeof record[nestedKey] === "string") addRef(refs, seen, record[nestedKey], `${key} ${nestedKey}`, signal, baseUrl);
    });
  }
  Object.entries(record).slice(0, 60).forEach(([childKey, childValue]) => collectJsonRefs(childValue, childKey, baseUrl, refs, seen, depth + 1));
}

function collectJsonLdRefs(html: string, baseUrl: string, refs: ImageRef[], seen: Set<string>) {
  const jsonRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonRe.exec(html)) !== null) {
    try { collectJsonRefs(JSON.parse(decodeEntities(match[1].trim())), "", baseUrl, refs, seen); } catch { /* Raw HTML and markdown remain available. */ }
  }
}

function collectMarkdownRefs(markdown: string, baseUrl: string, refs: ImageRef[], seen: Set<string>) {
  const markdownRe = /!\[([^\]]*)\]\(\s*<?([^\s)>]+)[^)]*\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownRe.exec(markdown)) !== null) addRef(refs, seen, match[2], match[1], "markdown", baseUrl);
}

function collectImagePayload(value: unknown, baseUrl: string, refs: ImageRef[], seen: Set<string>, context = "", depth = 0) {
  if (depth > 5 || refs.length >= MAX_PAGE_IMAGE_REFS) return;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) addRef(refs, seen, value, context, "firecrawl-images", baseUrl);
    return;
  }
  if (Array.isArray(value)) {
    value.slice(0, 36).forEach((item) => collectImagePayload(item, baseUrl, refs, seen, context, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const nextContext = compact([context, record.alt, record.title, record.caption, record.description, record.name].filter(Boolean).join(" "), 600);
  ["url", "imageUrl", "image_url", "src", "sourceUrl", "originalUrl", "contentUrl"].forEach((key) => {
    if (typeof record[key] === "string") addRef(refs, seen, record[key], nextContext || key, "firecrawl-images", baseUrl);
  });
  Object.entries(record).slice(0, 25).forEach(([key, child]) => {
    if (!["url", "imageUrl", "image_url", "src", "sourceUrl", "originalUrl", "contentUrl", "alt", "title", "caption", "description", "name"].includes(key)) collectImagePayload(child, baseUrl, refs, seen, nextContext || key, depth + 1);
  });
}

function pageText(page: PageData) {
  return compact(`${page.title} ${page.description} ${page.markdown} ${stripHtml(page.rawHtml)}`, 80_000);
}

function normalizedPath(value: string) {
  try {
    const path = new URL(value).pathname.replace(/\/+$/, "");
    return path || "/";
  } catch { return ""; }
}

function socialIdentityQueryValues(value: string) {
  try {
    const parsed = new URL(value);
    const keys = ["id", "profile_id", "username", "fbid", "story_fbid", "set", "photo_id", "media_id"];
    return keys.map((key) => parsed.searchParams.get(key)?.trim().toLowerCase() || "").filter(Boolean);
  } catch { return []; }
}

function isOpaqueSocialPath(value: string) {
  const segments = socialPathSegments(value);
  if (!segments.length) return false;
  const marker = normalizePhrase(segments[0]).replace(/\s+/g, "");
  if (marker === "share") return true;
  if (marker === "profile.php" || marker === "profilephp" || marker === "photo.php" || marker === "photophp") return socialPathTokens(value).length === 0;
  if (!SOCIAL_PATH_MARKERS.has(normalizePhrase(segments[0]))) return false;
  return Boolean(segments[1] && isOpaqueSocialSegment(segments[1], segments[0]));
}

function socialPathsEquivalent(pageUrl: string, knownUrl: string) {
  const pagePath = normalizedPath(pageUrl);
  const knownPath = normalizedPath(knownUrl);
  if (!pagePath || !knownPath || pagePath !== knownPath) return false;
  const contentPath = /\/(?:profile\.php|photo(?:\.php)?|photos|post|posts|reel|reels|video|videos|story|stories)$/i.test(pagePath) || isOpaqueSocialPath(pageUrl) || isOpaqueSocialPath(knownUrl);
  if (!contentPath) return true;
  const pageIds = socialIdentityQueryValues(pageUrl);
  const knownIds = socialIdentityQueryValues(knownUrl);
  return pageIds.length > 0 && knownIds.length > 0 && pageIds.some((id) => knownIds.includes(id));
}

function sourceMatchesKnownPage(pageUrl: string, knownUrls: string[], input?: SearchInput) {
  if (input) return trustedSourceMatchesPage(pageUrl, input);
  const page = sourceUrl(pageUrl);
  if (!page) return false;
  return knownUrls.some((known) => sourceUrl(known) === page);
}

function linkedOfficialProfile(rawHtml: string, pageUrl: string, knownUrls: string[], input?: SearchInput) {
  const hrefs: string[] = [];
  const linkRe = /<(?:a|link)\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(rawHtml)) !== null) {
    const href = publicUrl(attr(match[0], "href"), pageUrl);
    if (href) hrefs.push(href);
  }
  return hrefs.some((href) => sourceMatchesKnownPage(href, knownUrls, input));
}

function pageIdentityResult(page: PageData, search: SearchItem, context = ""): PublicImageResult {
  return {
    imageUrl: "",
    sourceImageUrl: "",
    originalImageUrl: "",
    sourcePageUrl: page.url,
    title: mergeResultText([page.title, search.title], 360),
    altText: compact([context, page.description, search.description, page.markdown, stripHtml(page.rawHtml)].filter(Boolean).join(" "), MAX_MARKDOWN_CHARS),
    sourceLabel: search.title,
    query: "",
    queryIntent: "work",
  };
}

function pageImageResult(ref: ImageRef, page: PageData, search: SearchItem): PublicImageResult {
  const sourcePage = sourceUrl(page.url) || page.url;
  return {
    imageUrl: ref.url,
    sourceImageUrl: ref.url,
    originalImageUrl: ref.url,
    sourcePageUrl: sourcePage,
    title: mergeResultText([page.title, search.title], 360),
    altText: compact([ref.context, ref.signal, page.description, search.description].filter(Boolean).join(" "), 500),
    sourceLabel: compact(search.title, MAX_PROVIDER_SOURCE_LABEL),
    query: "",
    queryIntent: "work",
  };
}

function identityForPage(page: PageData, search: SearchItem, input: SearchInput): IdentityCheck {
  return identityForImageResult(pageIdentityResult(page, search, pageText(page)), input);
}

function imageIsUnrelatedLogo(context: string, input: SearchInput) {
  const lower = normalizePhrase(context);
  if (!/\b(?:logo|brand mark|avatar|profile photo|profile picture|profile image)\b/i.test(context)) return false;
  const evidence = identityEvidence(context, input);
  if (evidence.strong || evidence.exactName) return false;
  return UNRELATED_LOGO_WORDS.some((word) => lower.includes(normalizePhrase(word)));
}

function isSocialProfileHost(value: string) {
  return isSupportedSocialHost(value);
}

function isSocialContentPage(value: string) {
  try {
    return new URL(value).pathname.split("/").filter(Boolean).some((segment) => /^(?:p|post|posts|reel|reels|photo(?:\.php)?|photos|video|videos|story|stories|profile\.php)$/i.test(segment));
  } catch {
    return false;
  }
}

function isSocialListingPage(value: string) {
  try {
    return new URL(value).pathname.split("/").filter(Boolean).some((segment) => /^(?:groups?|search|explore|hashtag|hashtags|marketplace|directory|tagged)$/i.test(segment));
  } catch {
    return false;
  }
}

function isSocialProfileAlias(value: string, input: SearchInput) {
  if (!isSupportedSocialHost(value) || isSocialListingPage(value)) return false;
  return !isSocialContentPage(value) && socialPathHasStrongBusinessIdentity(value, input);
}

function socialPathMatchesKnownPage(pageUrl: string, knownUrl: string, input?: SearchInput) {
  const pageFamily = socialHostFamily(pageUrl);
  const knownFamily = socialHostFamily(knownUrl);
  if (!pageFamily || !knownFamily || pageFamily !== knownFamily || isSocialListingPage(pageUrl)) return false;
  if (socialPathsEquivalent(pageUrl, knownUrl)) return true;
  const pageTokens = socialPathTokens(pageUrl);
  const knownTokens = socialPathTokens(knownUrl);
  const sharedTokens = overlapTokens(pageTokens, knownTokens).length;
  const pageStrong = Boolean(input && socialPathHasStrongBusinessIdentity(pageUrl, input));
  const knownStrong = Boolean(input && socialPathHasStrongBusinessIdentity(knownUrl, input));
  const pageOpaque = isOpaqueSocialPath(pageUrl);
  const knownOpaque = isOpaqueSocialPath(knownUrl);
  if (pageStrong && knownOpaque) return true;
  if (knownStrong && !pageOpaque && sharedTokens >= 2) return true;
  if (sharedTokens >= 2 && (pageStrong || knownStrong) && !pageOpaque) return true;
  return sharedTokens >= 2 && !isSocialContentPage(pageUrl);
}

function trustedSourceMatchesPage(pageUrl: string, input: SearchInput) {
  return trustedWebsiteSourceMatchesPage(pageUrl, input) || trustedSocialSourceMatchesPage(pageUrl, input);
}

function imageSourceMatchesKnownPage(pageUrl: string, input: SearchInput) {
  return trustedSourceMatchesPage(pageUrl, input);
}

function socialPathConflictsWithIdentity(value: string, input: SearchInput) {
  if (!isSupportedSocialHost(value) || isSocialListingPage(value) || isOpaqueSocialPath(value) || isSocialContentPage(value)) return false;
  if (imageSourceMatchesKnownPage(value, input)) return false;
  if (socialPathHasDirectTargetIdentity(value, input) || socialPathHasStrongBusinessIdentity(value, input)) return false;
  const pathTokens = socialPathTokens(value);
  if (!pathTokens.length) return false;
  const targetTokens = [...strongIdentityTokens(input.businessName), ...strongIdentityTokens(input.trade)];
  return targetTokens.length > 0 && overlapTokens(pathTokens, targetTokens).length === 0;
}

function identityForImageResult(result: PublicImageResult, input: SearchInput): IdentityCheck {
  const sourcePage = sourceUrl(result.sourcePageUrl) || result.sourcePageUrl;
  const trustedWebsiteSource = trustedWebsiteSourceMatchesPage(sourcePage, input);
  const trustedSocialSource = trustedSocialSourceMatchesPage(sourcePage, input);
  const socialSource = isSupportedSocialHost(sourcePage);
  const conflictingIdentity = imageResultIdentityConflict({ ...result, sourcePageUrl: sourcePage }, input);
  const captionText = `${result.sourceLabel} ${result.title} ${result.altText}`;
  const sourceText = `${captionText} ${socialSource ? sourcePage : normalizedPath(sourcePage)}`;
  const textEvidence = identityEvidence(sourceText, input);
  const captionEvidence = identityEvidence(captionText, input);
  const pathEvidence = identityEvidence(
    socialSource ? `${socialPathTokens(sourcePage).join(" ")} ${normalizedPath(sourcePage)}` : normalizedPath(sourcePage),
    input,
  );
  const pathBusinessIdentity = socialSource && socialPathHasStrongBusinessIdentity(sourcePage, input);
  const exactName = textEvidence.exactName || pathEvidence.exactName;
  const exactHandle = textEvidence.exactHandle || pathEvidence.exactHandle || pathBusinessIdentity;
  const exactTargetIdentity = Boolean(exactName || exactHandle || pathBusinessIdentity);
  const tradeOrLocationCorroboration = Boolean(
    captionEvidence.tradeMatches.length > 0 ||
    textEvidence.tradeMatches.length > 0 ||
    overlapTokens(identityTokens(input.location), identityTokens(captionText)).length > 0,
  );
  const strongIdentity = textEvidence.strong || pathEvidence.strong || pathBusinessIdentity;
  const websiteIdentityMatched = trustedWebsiteSource && websitePageHasPositiveIdentity(result, input);
  const trustedSource = trustedSocialSource || websiteIdentityMatched;
  const blockedSocialPage = socialSource && isSocialListingPage(sourcePage);
  const conflictingSocialPath = !trustedSource && socialPathConflictsWithIdentity(sourcePage, input);
  const accepted = Boolean(
    !blockedSocialPage &&
    !conflictingSocialPath &&
    !conflictingIdentity.conflict &&
    (trustedSource || (exactTargetIdentity && tradeOrLocationCorroboration)),
  );
  const trustedSocial = trustedSocialSource && socialSource;
  const evidence = trustedSource
    ? trustedSocial ? "social-source-page-match" : "verified-website-page-identity"
    : exactTargetIdentity && tradeOrLocationCorroboration
      ? "exact-target-identity-and-trade"
      : strongIdentity
        ? "identity-without-trusted-source"
        : "";
  return {
    accepted,
    official: websiteIdentityMatched,
    exactName,
    exactHandle,
    linkedProfile: trustedSocial,
    evidence,
  };
}

function explicitLogoContext(value: string) {
  return /\b(?:logo|brand[-_ ]?mark|avatar|profile[-_ ]?(?:photo|picture|image)|account[-_ ]?(?:photo|image)|headshot|brand identity)\b/i.test(value);
}

function workContext(value: string) {
  return /\b(?:project|projects|portfolio|gallery|our work|recent work|completed|installation|before|after|case stud|work photo|service photo|property|earthworks?)\b/i.test(value);
}

function logoScoreForContext(context: string, identity: IdentityCheck, input: SearchInput, options: { queryIntent?: ImageIntent; width?: number; height?: number; profileRoot?: boolean } = {}) {
  let score = 0;
  if (explicitLogoContext(context)) score += 90;
  if (options.queryIntent === "logo") score += 42;
  if (identity.linkedProfile) score += 24;
  if (options.profileRoot) score += 28;
  if (identity.exactName) score += 10;
  if (options.width && options.height) {
    const ratio = options.width / Math.max(options.height, 1);
    if (ratio >= 0.82 && ratio <= 1.22) score += 12;
  }
  if (options.queryIntent === "work") score -= 22;
  if (workContext(context)) score -= 42;
  if (/\b(?:logo|avatar|profile)\b/i.test(context) && identity.accepted) score += 8;
  return score;
}

function classifyPublicImage(result: PublicImageResult, input: SearchInput): { kind: "logo" | "work"; confidence: "high" | "medium"; identity: IdentityCheck; logoScore: number } | null {
  const identity = identityForImageResult(result, input);
  if (!identity.accepted) return null;
  const context = `${result.sourceLabel} ${result.title} ${result.altText} ${result.sourcePageUrl}`;
  const profileRoot = isSocialProfileHost(result.sourcePageUrl) && !isSocialListingPage(result.sourcePageUrl) && !isSocialContentPage(result.sourcePageUrl) && socialPathHasStrongBusinessIdentity(result.sourcePageUrl, input);
  if (imageIsUnrelatedLogo(context, input) && !identity.linkedProfile) return null;
  const logoScore = logoScoreForContext(context, identity, input, {
    queryIntent: result.queryIntent,
    width: result.width,
    height: result.height,
    profileRoot,
  });
  const logoSignal = logoScore >= 48;
  const confidence: "high" | "medium" = identity.official || identity.linkedProfile || (identity.exactName && logoSignal) ? "high" : "medium";
  return { kind: logoSignal ? "logo" : "work", confidence, identity, logoScore };
}

function logoIntentFallbackScore(candidate: PublicImageCandidate) {
  if (candidate.queryIntent !== "logo" || !candidate.identity.accepted) return -1;
  const context = `${candidate.sourceLabel} ${candidate.title} ${candidate.altText} ${candidate.sourcePageUrl}`;
  const socialSource = isSupportedSocialHost(candidate.sourcePageUrl);
  const exactBusinessIdentity = candidate.identity.exactName || candidate.identity.exactHandle;
  const verifiedSocialSource = socialSource && (candidate.identity.linkedProfile || candidate.identity.official);
  if (!verifiedSocialSource && !exactBusinessIdentity && !candidate.identity.official) return -1;

  let score = 40;
  if (candidate.identity.linkedProfile) score += 18;
  else if (verifiedSocialSource) score += 12;
  else if (candidate.identity.official) score += 14;
  if (candidate.identity.exactName) score += 12;
  if (candidate.identity.exactHandle) score += 8;
  if (candidate.width && candidate.height) {
    const ratio = candidate.width / Math.max(candidate.height, 1);
    if (ratio >= 0.82 && ratio <= 1.22) score += 12;
  }
  if (explicitLogoContext(context)) score += 8;
  if (workContext(context)) score -= 36;
  return Math.max(0, Math.min(80, score));
}

function classify(ref: ImageRef, page: PageData, search: SearchItem, input: SearchInput): { kind: Candidate["kind"]; confidence: Candidate["confidence"]; identity: IdentityCheck; logoScore: number } | null {
  const result = pageImageResult(ref, page, search);
  const identity = identityForImageResult(result, input);
  if (!identity.accepted) return null;
  const context = `${ref.context} ${ref.signal} ${result.title} ${search.description} ${result.sourcePageUrl}`;
  if (imageIsUnrelatedLogo(context, input)) return null;
  const lower = normalizePhrase(context);
  const profileRoot = isSocialProfileHost(result.sourcePageUrl) && !isSocialListingPage(result.sourcePageUrl) && !isSocialContentPage(result.sourcePageUrl) && socialPathHasStrongBusinessIdentity(result.sourcePageUrl, input);
  const socialMetadataSignal = isSocialProfileHost(result.sourcePageUrl) && identity.official && profileRoot && /(?:metadata|og:image|twitter:image)/i.test(ref.signal);
  const logoScore = logoScoreForContext(context, identity, input, { profileRoot: socialMetadataSignal || profileRoot });
  const explicitLogoSignal = explicitLogoContext(context) || socialMetadataSignal;
  const workSignal = workContext(context);
  const kind: Candidate["kind"] = logoScore >= 48 || explicitLogoSignal ? "logo" : workSignal || identity.official ? "work" : "unknown";
  const confidence: Candidate["confidence"] = identity.official || identity.linkedProfile || (identity.exactName && (explicitLogoSignal || workSignal)) ? "high" : "medium";
  return { kind, confidence, identity, logoScore };
}

function extractPageRefs(page: PageData) {
  const refs: ImageRef[] = [];
  const seen = new Set<string>();
  const baseUrl = page.url;
  if (page.rawHtml) {
    collectHtmlRefs(page.rawHtml.slice(0, MAX_HTML_CHARS), baseUrl, refs, seen);
    collectJsonLdRefs(page.rawHtml.slice(0, MAX_HTML_CHARS), baseUrl, refs, seen);
  }
  if (page.markdown) collectMarkdownRefs(page.markdown.slice(0, MAX_MARKDOWN_CHARS), baseUrl, refs, seen);
  collectImagePayload(page.images, baseUrl, refs, seen);
  return refs.slice(0, MAX_PAGE_IMAGE_REFS);
}

async function scrapePage(item: SearchItem, apiKey: string): Promise<PageData> {
  const payload = await fetchJson(FIRECRAWL_SCRAPE_URL, {
    url: item.url,
    formats: [
      { type: "markdown" },
      { type: "rawHtml" },
      { type: "images" },
    ],
  }, apiKey, SCRAPE_TIMEOUT_MS + 2_000);
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return {
    url: publicUrl(data?.metadata?.sourceURL || data?.metadata?.url || item.url) || item.url,
    title: compact(data?.metadata?.title || data?.title || item.title, 360),
    description: compact(data?.metadata?.description || data?.description || item.description, 800),
    markdown: typeof data?.markdown === "string" ? data.markdown : "",
    rawHtml: typeof data?.rawHtml === "string" ? data.rawHtml : typeof data?.html === "string" ? data.html : "",
    images: data?.images || payload?.images || [],
  };
}

async function readLimitedBytes(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) return null;
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength <= maxBytes ? bytes : null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* Ignore cancellation errors. */ }
        return null;
      }
      chunks.push(next.value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* Ignore reader cleanup errors. */ }
  }
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.byteLength; });
  return result;
}

function storedUrl(value: unknown) {
  const url = publicUrl(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.username || parsed.password ? "" : parsed.toString();
  } catch { return ""; }
}

function extension(contentType: string, url: string) {
  const type = contentType.split("/")[1]?.split(";")[0]?.toLowerCase();
  if (type === "jpeg") return "jpg";
  if (type && /^[a-z0-9]+$/.test(type)) return type;
  try { return new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "jpg"; } catch { return "jpg"; }
}

async function fetchImage(url: string, refererUrl = "") {
  let current = url;
  const referer = sourceUrl(refererUrl);
  for (let redirect = 0; redirect <= MAX_IMAGE_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    try {
      const headers: Record<string, string> = { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", "User-Agent": "Mozilla/5.0" };
      if (referer) headers.Referer = referer;
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers,
      });
      if (response.status >= 300 && response.status < 400) {
        const next = publicUrl(response.headers.get("location") || "", current);
        if (!next) return null;
        current = next;
        continue;
      }
      if (!response.ok) return null;
      const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const hasImageType = contentType.startsWith("image/") && contentType !== "image/svg+xml" && contentType !== "image/x-icon";
      const hasImageExtension = /\.(?:avif|bmp|gif|jpe?g|png|tiff?|webp)(?:$|\?)/i.test(new URL(current).pathname);
      if (!hasImageType && !hasImageExtension) return null;
      const bytes = await readLimitedBytes(response, MAX_IMAGE_BYTES);
      if (!bytes || bytes.byteLength < 128) return null;
      return { bytes, contentType: hasImageType ? contentType : "image/jpeg", sourceUrl: current };
    } catch { return null; } finally { clearTimeout(timeout); }
  }
  return null;
}

async function cacheCandidates(candidates: Candidate[], superdev: any, headers: Record<string, string>) {
  const delivered = new Map<string, string>();
  candidates.forEach((candidate) => delivered.set(candidate.sourceImageUrl, candidate.sourceImageUrl));
  const attempts = candidates.slice(0, MAX_CACHE_ATTEMPTS).filter((candidate) => !/\/storage\/v1\/(?:object|render)\/public\//i.test(candidate.sourceImageUrl));
  let cached = 0;
  let attempted = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < attempts.length) {
      const index = cursor++;
      const candidate = attempts[index];
      attempted += 1;
      try {
        const fetched = await fetchImage(candidate.sourceImageUrl, candidate.sourcePageUrl);
        if (!fetched) continue;
        const file = new File([fetched.bytes], `business-image-${index + 1}.${extension(fetched.contentType, fetched.sourceUrl)}`, { type: fetched.contentType });
        const upload = await Promise.race([
          superdev.integrations.core.uploadFile({ file }, { headers }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("upload timeout")), UPLOAD_TIMEOUT_MS)),
        ]);
        const managed = storedUrl(upload?.file_url);
        if (!managed) continue;
        delivered.set(candidate.sourceImageUrl, managed);
        cached += 1;
      } catch {
        // The verified source URL remains the safe fallback for this candidate.
      }
    }
  };
  await Promise.all([worker(), worker()]);
  return { delivered, attempted, cached, fallbacks: attempted - cached };
}

function bearer(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  return token.length >= 8 && token.length <= 4096 ? { token, header } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return responseJson({ error: "Method not allowed, use POST", errorCode: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const auth = bearer(req);
    if (!auth) return responseJson({ error: "Authentication required", errorCode: "AUTHENTICATION_REQUIRED" }, 401);
    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
      body = parsed as Record<string, unknown>;
    } catch {
      return responseJson({ error: "Invalid request body", errorCode: "INVALID_REQUEST" }, 400);
    }

    const input = normalizeInputs(body);
    const queries = buildQueries(input);
    if (!queries.length) return responseJson({ error: "A business name or public profile link is required", errorCode: "BUSINESS_IDENTITY_REQUIRED" }, 400);
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) return responseJson({ error: "Public image search is not configured on this workspace", errorCode: "FIRECRAWL_API_KEY_MISSING" }, 503);
    const appId = Deno.env.get("SUPERDEV_APP_ID");
    if (!appId) return responseJson({ error: "Image search is temporarily unavailable", errorCode: "SUPERDEV_APP_ID_MISSING" }, 503);

    const superdev = createSuperdevClient({ appId }) as any;
    superdev.auth.setToken(auth.token);
    const origin = req.headers.get("Origin");
    const integrationHeaders: Record<string, string> = { Authorization: auth.header };
    if (origin) integrationHeaders.Origin = origin;
    try {
      const user = await superdev.auth.me();
      if (!user || typeof user.email !== "string" || !user.email.trim()) throw new Error("Authentication required");
    } catch {
      return responseJson({ error: "Authentication required", errorCode: "AUTHENTICATION_REQUIRED" }, 401);
    }

    const providerFailures: { code: string; message: string }[] = [];
    const successfulSearches: any[] = [];
    const imageQueries = buildImageQueries(input);
    console.info("[search-business-images] request-start", {
      searchRequests: queries.length,
      imageQueries: imageQueries.length,
      knownSourceUrls: input.knownSourceUrls.length,
    });
    const [imageOutcome] = await Promise.all([
      searchPublicImageResults(input),
      Promise.all(queries.slice(0, 2).map(async (query) => {
        try {
          const result = await fetchJson(FIRECRAWL_SEARCH_URL, { query, limit: 8 }, apiKey, SEARCH_TIMEOUT_MS);
          successfulSearches.push(result);
        } catch (error) {
          const provider = error instanceof ProviderError ? error : new ProviderError("FIRECRAWL_UNAVAILABLE", "Provider unavailable");
          providerFailures.push({ code: provider.code, message: provider.message });
        }
      })),
    ]);
    imageOutcome.failures.forEach((code) => providerFailures.push({ code, message: "A public image-results request was unavailable." }));
    if (!successfulSearches.length && !imageOutcome.candidates.length) {
      const diagnostics = {
        searchRequests: queries.length,
        successfulSearchRequests: 0,
        imageQueries: imageOutcome.queryCount,
        imageResultCount: imageOutcome.resultCount,
        imageMatchedSourcePages: imageOutcome.matchedSourcePages,
        imageProviderStatus: imageOutcome.providerStatus,
        ...imageOutcome.diagnostics,
        acceptedCandidates: 0,
        logoCount: 0,
        workCount: 0,
        cacheAttempted: 0,
        cacheSucceeded: 0,
        cacheFallbacks: 0,
        cacheResults: { attempted: 0, succeeded: 0, fallbacks: 0 },
        providerFailures: providerFailures.map((item) => item.code).slice(0, 8),
      };
      console.info("[search-business-images] completed", {
        searchRequests: diagnostics.searchRequests,
        imageQueries: diagnostics.imageQueries,
        imageResultCount: diagnostics.imageResultCount,
        imageMatchedSourcePages: diagnostics.imageMatchedSourcePages,
        sourceUrlsReceived: diagnostics.sourceUrlsReceived,
        socialSourceMatches: diagnostics.socialSourceMatches,
        identityMatches: diagnostics.identityMatches,
        rejectedForMissingSource: diagnostics.rejectedForMissingSource,
        rejectedForWeakIdentity: diagnostics.rejectedForWeakIdentity,
        rejectedForConflictingIdentity: diagnostics.rejectedForConflictingIdentity,
        rejectedForSafety: diagnostics.rejectedForSafety,
        logoIntentCandidates: diagnostics.logoIntentCandidates,
        workIntentCandidates: diagnostics.workIntentCandidates,
        promotedLogoFromIntent: diagnostics.promotedLogoFromIntent,
        acceptedLogoCount: diagnostics.acceptedLogoCount,
        acceptedWorkCount: diagnostics.acceptedWorkCount,
        cacheAttempted: 0,
        cacheSucceeded: 0,
        cacheFallbacks: 0,
      });
      return responseJson({
        candidates: [],
        error: "No verified business images were found from the supplied public sources.",
        errorCode: "NO_VERIFIED_IMAGES",
        diagnostics,
      });
    }

    const searchResults = successfulSearches.flatMap((payload) => searchItems(payload, input));
    const uniqueResults = [...new Map(searchResults.map((item) => [item.url, item])).values()]
      .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
      .slice(0, MAX_SCRAPE_PAGES);
    const pages: PageData[] = [];
    let scrapedPages = 0;
    await Promise.all(uniqueResults.map(async (item) => {
      try {
        const page = await scrapePage(item, apiKey);
        pages.push(page);
        scrapedPages += 1;
      } catch (error) {
        const provider = error instanceof ProviderError ? error : new ProviderError("FIRECRAWL_SCRAPE_FAILED", "A matched public page could not be read");
        providerFailures.push({ code: provider.code, message: provider.message });
      }
    }));

    const rawCandidates: Candidate[] = [];
    let rawImageCount = 0;
    let identityMatchedPages = 0;
    pages.forEach((page) => {
      const search = uniqueResults.find((item) => item.url === page.url) || uniqueResults.find((item) => hostWithoutWww(item.url) === hostWithoutWww(page.url)) || { title: page.title, url: page.url, description: page.description, score: 0 };
      const identity = identityForPage(page, search, input);
      if (!identity.accepted) return;
      identityMatchedPages += 1;
      const refs = extractPageRefs(page);
      rawImageCount += refs.length;
      refs.forEach((ref) => {
        const classification = classify(ref, page, search, input);
        if (!classification) return;
        rawCandidates.push({
          sourceImageUrl: ref.url,
          sourcePageUrl: sourceUrl(page.url) || page.url,
          pageTitle: page.title || search.title,
          altText: compact(ref.context, 360),
          sourceLabel: compact(search.title, MAX_PROVIDER_SOURCE_LABEL),
          kind: classification.kind,
          confidence: classification.confidence,
          identity: classification.identity,
          order: rawCandidates.length,
          logoScore: classification.logoScore,
        });
      });
    });

    imageOutcome.candidates.forEach((candidate) => {
      rawCandidates.push({
        sourceImageUrl: candidate.originalImageUrl || candidate.sourceImageUrl || candidate.imageUrl,
        sourcePageUrl: candidate.sourcePageUrl,
        pageTitle: candidate.title || candidate.sourcePageUrl,
        altText: compact(candidate.altText, 360),
        sourceLabel: candidate.sourceLabel,
        kind: candidate.kind,
        confidence: candidate.confidence,
        identity: candidate.identity,
        order: rawCandidates.length,
        queryIntent: candidate.queryIntent,
        width: candidate.width,
        height: candidate.height,
        logoScore: candidate.logoScore,
      });
    });

    let rejectedForConflictingRawCandidates = 0;
    const verifiedRawCandidates = rawCandidates.filter((candidate) => {
      const conflict = candidateIdentityConflict(candidate, input);
      if (conflict.conflict) rejectedForConflictingRawCandidates += 1;
      return !conflict.conflict;
    });
    const mergedByImage = new Map<string, Candidate>();
    verifiedRawCandidates.forEach((candidate) => {
      const key = canonicalizePublicUrl(candidate.sourceImageUrl, "image") || candidate.sourceImageUrl;
      const previous = mergedByImage.get(key);
      const preferLogoKind = candidate.kind === "logo" && previous?.kind !== "logo";
      if (!previous || preferLogoKind || candidate.logoScore > previous.logoScore || (candidate.logoScore === previous.logoScore && candidate.confidence === "high" && previous.confidence !== "high")) {
        mergedByImage.set(key, candidate);
      }
    });
    const ranked = [...mergedByImage.values()].sort((left, right) =>
      right.logoScore - left.logoScore ||
      (right.confidence === "high" ? 1 : 0) - (left.confidence === "high" ? 1 : 0) ||
      left.order - right.order,
    );
    const logoCandidate = ranked.find((candidate) => candidate.kind === "logo" || candidate.logoScore >= 48);
    const acceptedCandidates = [
      ...(logoCandidate ? [{ ...logoCandidate, kind: "logo" as const }] : []),
      ...ranked.filter((candidate) => !logoCandidate || candidate.sourceImageUrl !== logoCandidate.sourceImageUrl).map((candidate) => ({ ...candidate, kind: "work" as const })),
    ].slice(0, MAX_RETURNED_CANDIDATES);

    const cacheResult = await cacheCandidates(acceptedCandidates, superdev, integrationHeaders);
    const candidates = acceptedCandidates.map((candidate) => ({
      imageUrl: cacheResult.delivered.get(candidate.sourceImageUrl) || candidate.sourceImageUrl,
      sourceImageUrl: candidate.sourceImageUrl,
      sourcePageUrl: candidate.sourcePageUrl,
      pageTitle: mergeResultText([candidate.pageTitle, candidate.sourceLabel], 360),
      sourceLabel: candidate.sourceLabel || "",
      altText: candidate.altText,
      originalImageUrl: candidate.sourceImageUrl,
      queryIntent: candidate.queryIntent,
      width: candidate.width,
      height: candidate.height,
      kind: candidate.kind,
      confidence: candidate.confidence,
      identityEvidence: candidate.identity.evidence,
    }));
    const logoCount = candidates.filter((candidate) => candidate.kind === "logo").length;
    const workCount = candidates.filter((candidate) => candidate.kind === "work" || candidate.kind === "unknown").length;
    const diagnostics = {
      searchRequests: queries.length,
      successfulSearchRequests: successfulSearches.length,
      matchedResultPages: uniqueResults.length,
      scrapedPages,
      identityMatchedPages,
      rawImageReferences: rawImageCount,
      imageQueries: imageOutcome.queryCount,
      imageResultCount: imageOutcome.resultCount,
      imageMatchedSourcePages: imageOutcome.matchedSourcePages,
      imageProviderStatus: imageOutcome.providerStatus,
      imageProviderFailures: imageOutcome.failures,
      sourceUrlsReceived: imageOutcome.diagnostics.sourceUrlsReceived,
      socialSourceMatches: imageOutcome.diagnostics.socialSourceMatches,
      identityMatches: imageOutcome.diagnostics.identityMatches,
      rejectedForMissingSource: imageOutcome.diagnostics.rejectedForMissingSource,
      rejectedForWeakIdentity: imageOutcome.diagnostics.rejectedForWeakIdentity,
      rejectedForConflictingIdentity: imageOutcome.diagnostics.rejectedForConflictingIdentity + rejectedForConflictingRawCandidates,
      rejectedForSafety: imageOutcome.diagnostics.rejectedForSafety,
      logoIntentCandidates: imageOutcome.diagnostics.logoIntentCandidates,
      workIntentCandidates: imageOutcome.diagnostics.workIntentCandidates,
      promotedLogoFromIntent: imageOutcome.diagnostics.promotedLogoFromIntent,
      rejectedForWeakIdentityPages: Math.max(uniqueResults.length - identityMatchedPages, 0),
      acceptedCandidates: candidates.length,
      logoCount,
      workCount,
      acceptedLogoCount: logoCount,
      acceptedWorkCount: workCount,
      cacheAttempted: cacheResult.attempted,
      cacheSucceeded: cacheResult.cached,
      cacheFallbacks: cacheResult.fallbacks,
      cacheResults: {
        attempted: cacheResult.attempted,
        succeeded: cacheResult.cached,
        fallbacks: cacheResult.fallbacks,
      },
      providerFailures: providerFailures.map((failure) => failure.code).slice(0, 8),
    };
    console.info("[search-business-images] completed", {
      searchRequests: diagnostics.searchRequests,
      successfulSearchRequests: diagnostics.successfulSearchRequests,
      imageQueries: diagnostics.imageQueries,
      imageResultCount: diagnostics.imageResultCount,
      imageMatchedSourcePages: diagnostics.imageMatchedSourcePages,
      sourceUrlsReceived: diagnostics.sourceUrlsReceived,
      socialSourceMatches: diagnostics.socialSourceMatches,
      identityMatches: diagnostics.identityMatches,
      rejectedForMissingSource: diagnostics.rejectedForMissingSource,
      rejectedForWeakIdentity: diagnostics.rejectedForWeakIdentity,
      rejectedForConflictingIdentity: diagnostics.rejectedForConflictingIdentity,
      rejectedForSafety: diagnostics.rejectedForSafety,
      logoIntentCandidates: diagnostics.logoIntentCandidates,
      workIntentCandidates: diagnostics.workIntentCandidates,
      promotedLogoFromIntent: diagnostics.promotedLogoFromIntent,
      acceptedLogoCount: diagnostics.acceptedLogoCount,
      acceptedWorkCount: diagnostics.acceptedWorkCount,
      cacheAttempted: diagnostics.cacheAttempted,
      cacheSucceeded: diagnostics.cacheSucceeded,
      cacheFallbacks: diagnostics.cacheFallbacks,
    });
    const warnings = [
      ...(providerFailures.length ? ["Some public result pages were unavailable."] : []),
      ...(cacheResult.fallbacks > 0 ? ["Some verified images could not be copied into managed storage, so their original source links remain available."] : []),
    ].slice(0, 3);
    const response: Record<string, unknown> = {
      candidates,
      diagnostics,
      warnings,
    };
    if (!candidates.length) {
      response.error = "No verified business images were found from the supplied public sources.";
      response.errorCode = "NO_VERIFIED_IMAGES";
    }
    return responseJson(response);
  } catch (error: any) {
    console.error("[search-business-images] failed", { code: error?.code || "UNEXPECTED_ERROR", message: error?.message || "unknown" });
    return responseJson({ error: "Public image search failed. Try another public business link.", errorCode: error?.code || "UNEXPECTED_ERROR" }, 500);
  }
});

```
