# Central Hub source bundle, part 08

## Manifest

1. `src/lib/hub-operations.ts`
2. `src/lib/growth-local-visibility.ts`
3. `src/lib/client-onboarding.ts`
4. `src/lib/delivery-helpers.ts`
5. `src/lib/invoice-catalog.ts`
6. `src/lib/lead-build.ts`
7. `src/lib/sales-playbook.ts`
8. `src/lib/seo.ts`
9. `src/lib/checkout-session.ts`

## `src/lib/hub-operations.ts`

```ts
import type { ActivePackageId, GrowthWorkstreamId } from "@/lib/hub-data";
import { GROWTH_WORKSTREAM_OPTIONS } from "@/lib/hub-data";
import type { ConversionChecklistItem, ConversionSnapshot, GbpActionLogEntry, GbpActionStatus, KeywordApprovalState, KeywordCalendarHandoff, KeywordIntent, KeywordPriority, KeywordStatus, KeywordTarget, LocalChecklistStatus, LocalTruthPatch, LocalVisibilityChecklistItem, LocalVisibilitySite, MonthlyVisibilityNote, ReviewMetrics, ReviewSnapshot, SeoFoundationChecklistItem, SeoFoundationChecklistStatus, SeoFoundationGroupId, SeoFoundationReadinessBreakdown, SnapshotSourceType } from "@/lib/growth-local-visibility";

export { CONVERSION_CHECKLIST_ITEMS, GBP_ACTION_STATUS_OPTIONS, KEYWORD_APPROVAL_OPTIONS, KEYWORD_INTENT_OPTIONS, KEYWORD_PRIORITY_OPTIONS, KEYWORD_STATUS_OPTIONS, LOCAL_CHECKLIST_ITEMS, LOCAL_CHECKLIST_STATUS_OPTIONS, REVIEW_SNAPSHOT_SOURCE_OPTIONS, SEO_FOUNDATION_CHECKS, SEO_FOUNDATION_GROUPS, SEO_FOUNDATION_STATUS_OPTIONS, SNAPSHOT_SOURCE_OPTIONS, CONVERSION_CHECKLIST_ITEMS as GROWTH_CONVERSION_CHECKLIST_ITEMS, calculateLocalReadinessScore, conversionRates, duplicateMonthKeys, hasConversionActivity, hasReviewVelocity, isReviewActivityStale, keywordTargetCount, missingLocalFacts, normalizeConversionChecklist, normalizeConversionSnapshots, normalizeKeywordTargets, normalizeLocalVisibilityChecklist, normalizeReviewMetrics, normalizeReviewSnapshots, normalizeSeoFoundationChecklist, readinessBreakdown, safeRate, seoFoundationReadinessBreakdown, seoFoundationStatusLabel, suggestedLocalActions, validateConversionSnapshot, validateKeywordTarget, validateReviewMetrics, validateReviewSnapshot, validateSeoFoundationChecklist } from "@/lib/growth-local-visibility";
export type { ConversionChecklistItem, ConversionSnapshot, GbpActionLogEntry, GbpActionStatus, KeywordApprovalState, KeywordCalendarHandoff, KeywordIntent, KeywordPriority, KeywordStatus, KeywordTarget, LocalChecklistStatus, LocalTruthPatch, LocalVisibilityChecklistItem, LocalVisibilitySite, MonthlyVisibilityNote, ReviewMetrics, ReviewSnapshot, SeoFoundationChecklistItem, SeoFoundationChecklistStatus, SeoFoundationGroupId, SeoFoundationReadinessBreakdown, SnapshotSourceType } from "@/lib/growth-local-visibility";

export const HOSTING_STATUS_OPTIONS = ["pending", "active", "paused", "attention"] as const;
export const SSL_STATUS_OPTIONS = ["active", "expiring", "missing", "unknown"] as const;
export const CDN_STATUS_OPTIONS = ["active", "inactive", "unknown"] as const;
export const HOSTING_OPERATIONAL_OPTIONS = ["healthy", "attention", "maintenance", "unknown"] as const;
export const GROWTH_TIER_OPTIONS = ["Basic Growth", "Full Growth", "Aggressive"] as const;
export const GROWTH_LIFECYCLE_OPTIONS = ["onboarding", "active", "paused", "completed"] as const;
export const GROWTH_ATTENTION_OPTIONS = ["healthy", "attention", "resolved"] as const;
export const GROWTH_BILLING_STATUS_OPTIONS = ["not_set", "active", "past_due", "paused", "ended"] as const;
export const GROWTH_WORK_STATUS_OPTIONS = ["planned", "in_progress", "blocked", "delivered"] as const;

export type HostingStatus = (typeof HOSTING_STATUS_OPTIONS)[number];
export type SslStatus = (typeof SSL_STATUS_OPTIONS)[number];
export type CdnStatus = (typeof CDN_STATUS_OPTIONS)[number];
export type HostingOperationalStatus = (typeof HOSTING_OPERATIONAL_OPTIONS)[number];
export type GrowthTier = (typeof GROWTH_TIER_OPTIONS)[number];
export type GrowthLifecycleStatus = (typeof GROWTH_LIFECYCLE_OPTIONS)[number];
export type GrowthAttentionStatus = (typeof GROWTH_ATTENTION_OPTIONS)[number];
export type GrowthBillingStatus = (typeof GROWTH_BILLING_STATUS_OPTIONS)[number];
export type GrowthWorkStatus = (typeof GROWTH_WORK_STATUS_OPTIONS)[number];
type RecordMeta = { id: string; created_at?: string; updated_at?: string };

export type HostingRecord = RecordMeta & {
  clientSiteId: string; businessName: string; domain: string; sslStatus: SslStatus; cdnStatus: CdnStatus; hostingStatus: HostingStatus;
  bandwidthUsedGb: number; bandwidthLimitGb: number; storageUsedGb: number; storageLimitGb: number; uptimePercentage: number;
  lastCheckedAt: string; nextCheckDate: string; renewalDate: string; notes: string; operationalStatus: HostingOperationalStatus; actionNeeded: string;
};
export type HostingRecordInput = Omit<HostingRecord, "id" | "created_at" | "updated_at">;

export type GrowthWorkPlanItem = {
  id: string; workstream: GrowthWorkstreamId; title: string; status: GrowthWorkStatus; owner: string; dueDate: string; notes: string; deliveredDate: string;
};
export type GrowthDeliveryLog = { id: string; month: string; summary: string; deliveredItems: string[]; outcomeNotes: string; nextAction: string };
export type GrowthStackRecord = RecordMeta & {
  clientSiteId: string; leadId: string; packageTier: GrowthTier; lifecycleStatus: GrowthLifecycleStatus; currentFocus: string; nextAction: string;
  ownerNotes: string; attentionStatus: GrowthAttentionStatus; lastActivityAt: string; nextReviewDate: string; targetWebsite: string; googleBusinessUrl: string;
  activePackageSnapshot: ActivePackageId[]; monthlyRetainer: number | null; billingStatus: GrowthBillingStatus; owner: string; blockers: string; lastWin: string;
  localVisibilityChecklist?: LocalVisibilityChecklistItem[]; keywordTargets?: KeywordTarget[]; reviewMetrics?: ReviewMetrics; reviewSnapshots?: ReviewSnapshot[];
  seoFoundationChecklist?: SeoFoundationChecklistItem[]; primaryCanonicalUrl?: string; technicalSeoNotes?: string;
  aeoChecklist?: AeoChecklistItem[];
  conversionSnapshots?: ConversionSnapshot[]; conversionSetupChecklist?: ConversionChecklistItem[]; gbpActionLog?: GbpActionLogEntry[]; monthlyVisibilityNotes?: MonthlyVisibilityNote[];
  workPlan: GrowthWorkPlanItem[]; monthlyDeliveryLog: GrowthDeliveryLog[];
  seoCount: number; localVisibilityCount: number; contentCount: number; emailCount: number; communityCount: number; campaignsCount: number; reportingCount: number;
};
export type GrowthStackRecordInput = Omit<GrowthStackRecord, "id" | "created_at" | "updated_at">;

export const AEO_CHECKLIST_STATUS_OPTIONS = ["missing", "in_review", "verified"] as const;
export type AeoChecklistStatus = (typeof AEO_CHECKLIST_STATUS_OPTIONS)[number];
export type AeoChecklistItem = { id: string; label: string; status: AeoChecklistStatus; evidence: string; note: string; verifiedAt: string; verifiedBy: string };
export const AEO_FOUNDATION_CHECKS = [
  { id: "entity_consistency", label: "Entity consistency", description: "Business name, service, area, contact, and identity details agree across visible sources.", nextAction: "Compare the client truth record with the public website and local profiles." },
  { id: "local_business_schema", label: "LocalBusiness schema draft", description: "A reviewed draft describes the supplied local business facts without filling gaps.", nextAction: "Prepare a schema draft from confirmed business facts, then review it before implementation." },
  { id: "organization_same_as", label: "Organization sameAs", description: "Public social and profile links are current, relevant, and owned by the business.", nextAction: "Collect the business-owned profile links and check each one before adding it." },
  { id: "service_area_answers", label: "Service-area answers", description: "Customers can find direct, useful answers about real services and confirmed areas.", nextAction: "Choose one confirmed service and area, then plan a useful answer asset." },
  { id: "faq_coverage", label: "FAQ coverage", description: "Common customer questions are answered from supplied business information.", nextAction: "List real customer questions and draft answers from first-party notes." },
  { id: "howto_coverage", label: "HowTo coverage", description: "Where useful, the business process is explained in clear, practical steps.", nextAction: "Document a real process the business performs, with each step checked by the operator." },
  { id: "review_freshness", label: "Review freshness", description: "Review activity and response notes are current enough to support trust work.", nextAction: "Refresh the review snapshot or record why current activity is unavailable." },
  { id: "fresh_photos", label: "Fresh photos", description: "Current, approved business or project photos are available for visible use.", nextAction: "Request recent approved photos from the business or mark the evidence gap clearly." },
] as const;
export type AeoAssetType = "" | "service_area_answer" | "faq_cluster" | "howto_process" | "proof_case" | "cost_process";
export const AEO_ASSET_TYPE_OPTIONS = ["service_area_answer", "faq_cluster", "howto_process", "proof_case", "cost_process"] as const;
export const AEO_SCHEMA_TYPE_OPTIONS = ["LocalBusiness", "Organization", "Service", "FAQPage", "HowTo", "Article"] as const;

export function normalizeAeoChecklist(value: unknown): AeoChecklistItem[] {
  const records = Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
  const byId = new Map(records.map((record) => [readText(record.id), record]));
  const known = AEO_FOUNDATION_CHECKS.map((check) => { const raw = byId.get(check.id); return { id: check.id, label: check.label, status: oneOf(raw?.status, AEO_CHECKLIST_STATUS_OPTIONS, "missing"), evidence: readText(raw?.evidence), note: readText(raw?.note), verifiedAt: dateInputValue(raw?.verifiedAt), verifiedBy: readText(raw?.verifiedBy) }; });
  const knownIds = new Set(known.map((item) => item.id));
  const extras = records.filter((record) => { const id = readText(record.id); return id && !knownIds.has(id); }).map((record, index) => ({ id: readText(record.id, `aeo-${index}`), label: readText(record.label, "Additional answer-readiness check"), status: oneOf(record.status, AEO_CHECKLIST_STATUS_OPTIONS, "missing"), evidence: readText(record.evidence), note: readText(record.note), verifiedAt: dateInputValue(record.verifiedAt), verifiedBy: readText(record.verifiedBy) }));
  return [...known, ...extras];
}
export function aeoReadinessBreakdown(value: unknown) { const checklist = normalizeAeoChecklist(value); const recorded = Array.isArray(value) && value.length > 0; const verifiedCount = checklist.filter((item) => item.status === "verified").length; const inReviewCount = checklist.filter((item) => item.status === "in_review").length; return { score: recorded && checklist.length ? Math.round((verifiedCount / checklist.length) * 100) : null, totalCount: checklist.length, verifiedCount, inReviewCount, missingCount: checklist.filter((item) => item.status === "missing").length }; }
export function aeoStatusLabel(value: unknown) { return String(value || "missing").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
export function normalizeAeoAssetType(value: unknown): AeoAssetType { const normalized = String(value || "").trim().toLowerCase(); return AEO_ASSET_TYPE_OPTIONS.find((option) => option === normalized) || ""; }
export function aeoAssetTypeLabel(value: unknown) { const normalized = normalizeAeoAssetType(value); return normalized ? normalized.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "No answer-ready type"; }
export function aeoAssetTypeForIntent(value: unknown): AeoAssetType { const intent = String(value || "").trim().toLowerCase(); if (!intent) return ""; if (/(cost|price|pricing|quote)/.test(intent)) return "cost_process"; if (/(howto|how-to|process|steps)/.test(intent)) return "howto_process"; if (intent === "service" || intent === "commercial" || intent === "emergency") return "service_area_answer"; return "faq_cluster"; }
export function schemaTypesForAeoType(value: unknown): string[] { switch (normalizeAeoAssetType(value)) { case "service_area_answer": return ["LocalBusiness", "Service"]; case "faq_cluster": return ["FAQPage"]; case "howto_process": return ["HowTo"]; case "proof_case": return ["Article"]; case "cost_process": return ["Service", "FAQPage"]; default: return []; } }
export function normalizeSchemaTypes(value: unknown): string[] { if (!Array.isArray(value)) return []; const allowed = new Set<string>(AEO_SCHEMA_TYPE_OPTIONS); return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))); }

export function readText(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
export function readNumber(value: unknown, fallback = 0) { const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) ? number : fallback; }
export function readNullableNumber(value: unknown) { if (value === null || value === undefined || value === "") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
export function oneOf<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] { const normalized = String(value || "").trim().toLowerCase(); return options.find((option) => option.toLowerCase() === normalized) || fallback; }

export function dateInputValue(value: unknown) { const text = readText(value); if (!text) return ""; const date = new Date(text); return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : ""; }
export function storedDateOnlyValue(value: string) { const text = value.trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return ""; const date = new Date(`${text}T12:00:00`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : ""; }
export function storedDateValue(value: string) { const dateOnly = storedDateOnlyValue(value); return dateOnly ? new Date(`${dateOnly}T12:00:00`).toISOString() : ""; }
export function formatOperationalDate(value: unknown) { const text = readText(value); if (!text) return "Not set"; const timestamp = Date.parse(text); if (!Number.isFinite(timestamp)) return "Invalid date"; return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(timestamp); }

export function normalizeDomain(value: string) { return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].replace(/\.$/, "").toLowerCase(); }
export function isValidDomain(value: string) { const domain = normalizeDomain(value); return domain.length <= 253 && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain); }
export function safeExternalUrl(value: string) { const text = value.trim(); if (!text) return ""; const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`; try { const url = new URL(candidate); return (url.protocol === "https:" || url.protocol === "http:") && url.hostname && !url.hostname.includes(" ") ? url.toString() : ""; } catch { return ""; } }
export function isValidTargetWebsite(value: string) { const text = value.trim(); if (!text) return true; return /^https?:\/\//i.test(text) ? Boolean(safeExternalUrl(text)) : isValidDomain(text); }
export function isReviewOverdue(value: unknown, now = new Date()) { const text = readText(value); if (!text) return false; const dateOnly = text.slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false; const due = new Date(`${dateOnly}T23:59:59`); return Number.isFinite(due.getTime()) && due.getTime() < now.getTime(); }
export function workPlanProgress(items: GrowthWorkPlanItem[]) { const total = items.length; const delivered = items.filter((item) => item.status === "delivered").length; return { total, delivered, percent: total ? Math.round((delivered / total) * 100) : 0 }; }
export function errorMessage(error: unknown, fallback: string) { return error instanceof Error && error.message.trim() ? error.message.trim() : fallback; }

function generatedItemId(prefix: string, index: number) { return `${prefix}-${index}-${Math.random().toString(36).slice(2, 8)}`; }
export function normalizeGrowthWorkPlan(value: unknown): GrowthWorkPlanItem[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(GROWTH_WORKSTREAM_OPTIONS.map((option) => option.id));
  return value.filter((item) => item && typeof item === "object").map((item, index) => {
    const record = item as Record<string, unknown>;
    const workstream = String(record.workstream || "reporting") as GrowthWorkstreamId;
    return {
      id: readText(record.id, generatedItemId("task", index)), workstream: allowed.has(workstream) ? workstream : "reporting",
      title: readText(record.title), status: oneOf(record.status, GROWTH_WORK_STATUS_OPTIONS, "planned"), owner: readText(record.owner),
      dueDate: dateInputValue(record.dueDate), notes: readText(record.notes), deliveredDate: dateInputValue(record.deliveredDate),
    };
  });
}
export function normalizeGrowthDeliveryLog(value: unknown): GrowthDeliveryLog[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object").map((item, index) => {
    const record = item as Record<string, unknown>;
    return { id: readText(record.id, generatedItemId("log", index)), month: readText(record.month), summary: readText(record.summary), deliveredItems: Array.isArray(record.deliveredItems) ? record.deliveredItems.filter((entry): entry is string => typeof entry === "string" && entry.trim()).map((entry) => entry.trim()) : [], outcomeNotes: readText(record.outcomeNotes), nextAction: readText(record.nextAction) };
  });
}

export const SIGNATURE_STATUS_OPTIONS = ["brief_collected", "draft", "client_approved", "delivered", "seasonal_update"] as const;
export type SignatureStatus = (typeof SIGNATURE_STATUS_OPTIONS)[number];
export type SignatureSocialLinks = { facebook: string; instagram: string; linkedin: string; tiktok: string; googleBusiness: string };
export type SignatureTeamMember = { id: string; name: string; role: string; email: string; phone: string; licenceDetails: string; insuranceDetails: string };
export type SignatureHistoryEntry = { version: number; status: SignatureStatus; savedAt: string; approvedAt: string; deliveryDate: string; notes: string };
export type EmailSignatureRecord = RecordMeta & {
  clientSiteId: string; version: number; status: SignatureStatus; businessName: string; tagline: string; logoImageUrl: string; primaryColor: string; secondaryColor: string; phone: string; email: string; website: string; address: string; bookingUrl: string; socialLinks: SignatureSocialLinks; teamMembers: SignatureTeamMember[]; signatureHtml: string; signaturePlainText: string; installationGuides: { gmail: string; outlook: string; appleMail: string }; approvalConfirmed: boolean; approvedBy: string; approvedAt: string; deliveryDate: string; deliveryRecipient: string; deliveryNotes: string; seasonalUpdateNotes: string; operatorNotes: string; versionHistory: SignatureHistoryEntry[]; lastUpdatedAt: string;
};
export type EmailSignatureRecordInput = Omit<EmailSignatureRecord, "id" | "created_at" | "updated_at">;

export const AUDIT_STATUS_OPTIONS = ["draft", "intake", "analysis", "qa_review", "approved", "delivered", "needs_clarification"] as const;
export type AuditWorkflowStatus = (typeof AUDIT_STATUS_OPTIONS)[number];
export const AUDIT_PROVIDER_OPTIONS = ["myob", "xero", "other"] as const;
export const AUDIT_SEVERITY_OPTIONS = ["low", "medium", "high"] as const;
export const AUDIT_RECOMMENDATION_STATUS_OPTIONS = ["open", "in_progress", "complete", "deferred"] as const;
export type AuditMetrics = { revenue: number | null; cogs: number | null; grossProfit: number | null; operatingExpenses: number | null; netProfit: number | null; cashOnHand: number | null; totalReceivables: number | null; overdueReceivables: number | null; payables: number | null; averageMonthlyOutflows: number | null; sourceNotes: string };
export type AuditAccessChecklist = { provider: string; organisationName: string; requestedAt: string; grantedAt: string; revokedAt: string; readOnlyConfirmed: boolean; clarificationNotes: string };
export type AuditSourceChecklist = { profitAndLoss: boolean; balanceSheet: boolean; agedReceivables: boolean; cashPosition: boolean; agedPayables: boolean; otherSourceNotes: boolean };
export type AuditUploadedReport = { id: string; fileName: string; fileType: string; fileSize: number; sourceCategory: string; uploadedAt: string; privateFileUrl: string; notes: string };
export type AuditDerivedCalculations = { grossMargin: number | null; operatingMargin: number | null; overdueDebtorPercentage: number | null; cashRunwayMonths: number | null; priorRevenueVariance: number | null; priorNetProfitVariance: number | null };
export type AuditPeriodComparison = { priorPeriodKey: string; priorRevenue: number | null; priorNetProfit: number | null; priorCashOnHand: number | null; sourceNotes: string };
export type AuditCommentary = { pAndL: string; cashFlowWatch: string; debtorWatchlist: string; payablesWatch: string; expenseTrend: string; growthOpportunities: string; dataQualityIssues: string };
export type AuditRisk = { severity: (typeof AUDIT_SEVERITY_OPTIONS)[number]; title: string; detail: string; impact: string };
export type AuditRecommendation = { id: string; title: string; detail: string; impact: string; effort: string; owner: string; dueDate: string; status: (typeof AUDIT_RECOMMENDATION_STATUS_OPTIONS)[number] };
export type AuditDeliveryHistory = { status: string; date: string; recipient: string; notes: string };
export type FinancialHealthAuditRecord = RecordMeta & {
  clientSiteId: string; periodKey: string; periodLabel: string; periodStart: string; periodEnd: string; workflowStatus: AuditWorkflowStatus; dataCutoffDate: string; accessChecklist: AuditAccessChecklist; sourceChecklist: AuditSourceChecklist; uploadedReports: AuditUploadedReport[]; dataQualityFlags: string; metrics: AuditMetrics; derivedCalculations: AuditDerivedCalculations; periodComparison: AuditPeriodComparison; commentary: AuditCommentary; risks: AuditRisk[]; recommendations: AuditRecommendation[]; assumptions: string; limitations: string; limitationsAcknowledged: boolean; qaApproved: boolean; qaApprovedBy: string; qaApprovedAt: string; clientReadySummary: string; deliveryDate: string; deliveryRecipient: string; deliveryNotes: string; nextReviewDate: string; loomUrl: string; deliveryHistory: AuditDeliveryHistory[]; lastUpdatedAt: string;
};
export type FinancialHealthAuditRecordInput = Omit<FinancialHealthAuditRecord, "id" | "created_at" | "updated_at">;
export function auditPeriodLabel(periodKey: string) { if (!/^\d{4}-\d{2}$/.test(periodKey)) return periodKey; const date = new Date(`${periodKey}-01T12:00:00`); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(date) : periodKey; }

export const SOCIAL_REVAMP_PLATFORM_OPTIONS = ["facebook", "instagram", "linkedin", "tiktok"] as const;
export type SocialRevampPlatform = (typeof SOCIAL_REVAMP_PLATFORM_OPTIONS)[number];
export const SOCIAL_REVAMP_STATUS_OPTIONS = ["brief_collected", "audit_ready", "strategy_draft", "design_draft", "client_review", "approved", "delivered", "ongoing_marketing", "paused"] as const;
export type SocialRevampStatus = (typeof SOCIAL_REVAMP_STATUS_OPTIONS)[number];
export const SOCIAL_REVAMP_ASSET_TYPES = ["logo", "photo", "banner", "reference", "other"] as const;
export type SocialRevampAssetType = (typeof SOCIAL_REVAMP_ASSET_TYPES)[number];
export type SocialRevampSourceProfileUrls = Record<SocialRevampPlatform, string>;
export type SocialRevampAsset = { id: string; fileName: string; fileType: string; fileSize: number; assetType: SocialRevampAssetType; privateFileUrl: string; uploadedAt: string; notes: string };
export type SocialRevampVersionEntry = { version: number; status: SocialRevampStatus; savedAt: string; approvedAt: string; deliveryDate: string; notes: string };
export type SocialRevampRecord = RecordMeta & {
  clientSiteId: string; businessName: string; selectedPlatforms: SocialRevampPlatform[]; sourceProfileUrls: SocialRevampSourceProfileUrls;
  clientBrief: string; audience: string; servicesOffers: string; location: string; goals: string; primaryCta: string; brandVoice: string; visualDirection: string; constraints: string;
  uploadedAssets: SocialRevampAsset[]; status: SocialRevampStatus; revisionNotes: string; nextAction: string; operatorNotes: string;
  approvalConfirmed: boolean; approvedBy: string; approvedAt: string; deliveryDate: string; deliveryRecipient: string; deliveryNotes: string; version: number; versionHistory: SocialRevampVersionEntry[]; lastUpdatedAt: string;
};
export type SocialRevampRecordInput = Omit<SocialRevampRecord, "id" | "created_at" | "updated_at">;
export function socialRevampPlatformLabel(value: unknown) { return { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok" }[String(value || "").toLowerCase()] || String(value || "Platform"); }
export function socialRevampStatusLabel(value: unknown) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Brief collected"; }
export function normalizeSocialPlatforms(value: unknown): SocialRevampPlatform[] { if (!Array.isArray(value)) return []; return value.filter((item): item is SocialRevampPlatform => SOCIAL_REVAMP_PLATFORM_OPTIONS.includes(String(item || "").toLowerCase() as SocialRevampPlatform)); }
export function normalizeSocialProfileUrls(value: unknown): SocialRevampSourceProfileUrls { const raw = value && typeof value === "object" ? value as Record<string, unknown> : {}; return { facebook: readText(raw.facebook), instagram: readText(raw.instagram), linkedin: readText(raw.linkedin), tiktok: readText(raw.tiktok) }; }
export function normalizeSocialAssets(value: unknown): SocialRevampAsset[] { if (!Array.isArray(value)) return []; return value.filter((item) => item && typeof item === "object").map((item, index) => { const raw = item as Record<string, unknown>; return { id: readText(raw.id, `asset-${index}`), fileName: readText(raw.fileName, "Unnamed asset"), fileType: readText(raw.fileType), fileSize: readNumber(raw.fileSize), assetType: oneOf(raw.assetType, SOCIAL_REVAMP_ASSET_TYPES, "other"), privateFileUrl: readText(raw.privateFileUrl), uploadedAt: readText(raw.uploadedAt), notes: readText(raw.notes) }; }); }
export function normalizeSocialHistory(value: unknown): SocialRevampVersionEntry[] { if (!Array.isArray(value)) return []; return value.filter((item) => item && typeof item === "object").map((item) => { const raw = item as Record<string, unknown>; return { version: Math.max(1, readNumber(raw.version, 1)), status: oneOf(raw.status, SOCIAL_REVAMP_STATUS_OPTIONS, "brief_collected"), savedAt: readText(raw.savedAt), approvedAt: readText(raw.approvedAt), deliveryDate: readText(raw.deliveryDate), notes: readText(raw.notes) }; }); }
export function socialRevampNeedsAttention(record: Pick<SocialRevampRecord, "status" | "nextAction" | "approvalConfirmed" | "deliveryDate">) { return record.status === "client_review" || (record.status === "approved" && !record.deliveryDate) || (record.status !== "paused" && !record.nextAction.trim()) || (record.status === "delivered" && !record.approvalConfirmed); }

```

## `src/lib/growth-local-visibility.ts`

```ts
import type { ClientSite } from "@/lib/hub-data";

export const LOCAL_CHECKLIST_STATUS_OPTIONS = ["missing", "in_review", "verified", "not_applicable"] as const;
export const KEYWORD_INTENT_OPTIONS = ["service", "commercial", "emergency", "informational"] as const;
export const KEYWORD_PRIORITY_OPTIONS = ["high", "medium", "low"] as const;
export const KEYWORD_STATUS_OPTIONS = ["draft", "approved", "in_progress", "published", "paused"] as const;
export const KEYWORD_APPROVAL_OPTIONS = ["draft", "approved", "rejected"] as const;
export const SNAPSHOT_SOURCE_OPTIONS = ["manual", "client_reported", "automatic"] as const;
export const REVIEW_SNAPSHOT_SOURCE_OPTIONS = SNAPSHOT_SOURCE_OPTIONS;
export const GBP_ACTION_STATUS_OPTIONS = ["draft", "approved", "completed", "blocked"] as const;

export const LOCAL_CHECKLIST_ITEMS = [
  { id: "category", label: "Primary and secondary categories", description: "Recorded categories match the business and available evidence" },
  { id: "services", label: "Services", description: "Services are clearly recorded and supported by client facts" },
  { id: "service_areas", label: "Service areas", description: "Suburbs, towns, regions, or postcodes are confirmed" },
  { id: "hours", label: "Business hours and holiday notes", description: "Regular and seasonal hours are recorded" },
  { id: "contact_details", label: "Contact details and NAP", description: "Name, address, phone, and contact path are checked" },
  { id: "photos", label: "Photos", description: "Current, approved business or project photos are available" },
  { id: "review_link", label: "Review link", description: "An honest-feedback request link is recorded" },
  { id: "utm_website", label: "UTM-tagged website link", description: "The website path and attribution plan are documented" },
  { id: "trust_information", label: "Trust information", description: "Licence, insurance, ABN, and other evidence are checked where relevant" },
] as const;

export const SEO_FOUNDATION_STATUS_OPTIONS = ["missing", "in_review", "verified", "blocked", "not_applicable"] as const;
export type SeoFoundationChecklistStatus = (typeof SEO_FOUNDATION_STATUS_OPTIONS)[number];
export type SeoFoundationGroupId = "technical" | "content_structure" | "entity_schema" | "conversion_proof";
export const SEO_FOUNDATION_GROUPS: { id: SeoFoundationGroupId; label: string; description: string }[] = [
  { id: "technical", label: "Technical foundation", description: "Canonical, indexability, crawl access, metadata, mobile behaviour, and internal links." },
  { id: "content_structure", label: "Content structure", description: "Headings and page structure that help people and answer systems understand the offer." },
  { id: "entity_schema", label: "Entity and structured data", description: "Public business facts and structured data that agree with visible content." },
  { id: "conversion_proof", label: "Conversion and proof", description: "A clear contact path supported by truthful first-party evidence." },
];
export const SEO_FOUNDATION_CHECKS: { id: string; group: SeoFoundationGroupId; label: string; description: string; nextAction: string }[] = [
  { id: "canonical_url", group: "technical", label: "Canonical URL selected", description: "The public domain or page root used as the canonical reference is recorded and intentional.", nextAction: "Confirm the preferred public URL with the operator before using it in metadata." },
  { id: "indexability", group: "technical", label: "Indexability basics reviewed", description: "Indexing access, noindex directives, and important page visibility have been checked.", nextAction: "Review the page-level indexing controls and record the source or blocker." },
  { id: "robots_sitemap", group: "technical", label: "Robots and sitemap reviewed", description: "Robots rules and sitemap availability are recorded without assuming they are correct.", nextAction: "Check the public robots file and sitemap, then note the observed result." },
  { id: "metadata", group: "technical", label: "Titles and descriptions reviewed", description: "Important pages have useful, truthful title tags and meta descriptions.", nextAction: "List the pages checked and record any missing or duplicate metadata." },
  { id: "mobile_performance", group: "technical", label: "Mobile and performance observed", description: "Mobile layout and practical performance observations are recorded for the selected site.", nextAction: "Review the main customer path on a phone and record specific observations." },
  { id: "internal_links", group: "technical", label: "Internal linking reviewed", description: "Important service, area, proof, and contact pages connect through useful internal links.", nextAction: "Map the key customer path and identify the next internal link to add or review." },
  { id: "headings_structure", group: "content_structure", label: "Headings and content structure reviewed", description: "Page headings and visible copy describe the business, services, and customer questions clearly.", nextAction: "Check the main heading and section order on the priority page." },
  { id: "structured_data", group: "entity_schema", label: "Structured data matches visible facts", description: "Schema drafts or published markup use supplied facts and match what customers can see.", nextAction: "Compare structured data with the visible page and remove unsupported claims." },
  { id: "entity_consistency", group: "entity_schema", label: "Business entity consistency reviewed", description: "Name, services, areas, contact details, hours, and public profiles agree across sources.", nextAction: "Compare the client truth record with the website and owned public profiles." },
  { id: "conversion_path", group: "conversion_proof", label: "Primary conversion path reviewed", description: "The main phone, form, booking, or enquiry path is clear and appropriate for the business.", nextAction: "Test the primary contact path and record where a customer could get stuck." },
  { id: "first_party_proof", group: "conversion_proof", label: "First-party proof is ready", description: "Approved photos, reviews, credentials, case notes, or other proof are available where relevant.", nextAction: "Record the approved proof source or the exact evidence request still outstanding." },
];
export type SeoFoundationChecklistItem = { id: string; label: string; group: SeoFoundationGroupId; status: SeoFoundationChecklistStatus; evidence: string; notes: string; updatedAt: string };
export type SeoFoundationReadinessBreakdown = { score: number | null; recorded: boolean; totalCount: number; applicableCount: number; verifiedCount: number; inReviewCount: number; missingCount: number; blockedCount: number; notApplicableCount: number; missingItems: SeoFoundationChecklistItem[]; blockedItems: SeoFoundationChecklistItem[] };

export const CONVERSION_CHECKLIST_ITEMS = [
  { id: "tap_to_call", label: "Tap-to-call path", description: "A phone action is visible and tested on mobile" },
  { id: "quote_form", label: "Short quote form", description: "The form asks only for useful qualification details" },
  { id: "source_tracking", label: "Source and UTM tracking", description: "The source of an enquiry can be recorded" },
  { id: "follow_up_owner", label: "Follow-up ownership", description: "Someone owns callback or enquiry follow-up" },
] as const;

export type LocalChecklistStatus = (typeof LOCAL_CHECKLIST_STATUS_OPTIONS)[number];
export type KeywordIntent = (typeof KEYWORD_INTENT_OPTIONS)[number];
export type KeywordPriority = (typeof KEYWORD_PRIORITY_OPTIONS)[number];
export type KeywordStatus = (typeof KEYWORD_STATUS_OPTIONS)[number];
export type KeywordApprovalState = (typeof KEYWORD_APPROVAL_OPTIONS)[number];
export type SnapshotSourceType = (typeof SNAPSHOT_SOURCE_OPTIONS)[number];
export type GbpActionStatus = (typeof GBP_ACTION_STATUS_OPTIONS)[number];
export type LocalVisibilitySite = Pick<ClientSite, "businessName" | "trade" | "location" | "services" | "areasServed" | "serviceAreas" | "phone" | "email" | "legalBusinessName" | "abn" | "primaryGoogleBusinessCategory" | "secondaryGoogleBusinessCategories" | "businessHoursNotes" | "holidayHoursNotes" | "licenceInsuranceNotes" | "googleBusinessUrl" | "reviewLink" | "napTrustVerificationNotes" | "website" | "photoUrls">;
export type LocalTruthPatch = Partial<Pick<ClientSite, "businessName" | "trade" | "location" | "phone" | "email" | "services" | "areasServed" | "serviceAreas" | "legalBusinessName" | "abn" | "primaryGoogleBusinessCategory" | "secondaryGoogleBusinessCategories" | "businessHoursNotes" | "holidayHoursNotes" | "licenceInsuranceNotes" | "googleBusinessUrl" | "reviewLink" | "napTrustVerificationNotes" | "photoUrls">>;
export type KeywordCalendarHandoff = { title?: string; brief?: string; contentType?: string; channel?: string; callToAction?: string; keyword?: string; area?: string; service?: string; intent?: string; targetUrl?: string; aeoType?: string; targetEntity?: string; firstPartyEvidence?: string; schemaTypes?: string[] };
export type LocalVisibilityChecklistItem = { id: string; label: string; status: LocalChecklistStatus; evidence: string; notes: string; updatedAt: string };
export type KeywordTarget = { id: string; service: string; area: string; keyword: string; intent: KeywordIntent; targetUrl: string; priority: KeywordPriority; status: KeywordStatus; approvalState: KeywordApprovalState; notes: string };
export type ReviewMetrics = { totalReviews: number | null; averageRating: number | null; newReviewsThisMonth: number | null; responseRate: number | null; lastRequestDate: string; reviewRequestLink: string; notes: string };
export type ReviewSnapshot = { id: string; month: string; totalReviews: number | null; averageRating: number | null; newReviews: number | null; responseRate: number | null; source: string; notes: string };
export type ConversionSnapshot = { id: string; month: string; calls: number | null; formEnquiries: number | null; qualifiedLeads: number | null; bookedJobs: number | null; averageResponseMinutes: number | null; source: string; sourceType: SnapshotSourceType; notes: string };
export type ConversionChecklistItem = { id: string; label: string; complete: boolean; notes: string };
export type GbpActionLogEntry = { id: string; date: string; action: string; status: GbpActionStatus; notes: string };
export type MonthlyVisibilityNote = { id: string; month: string; summary: string; notes: string; nextAction: string };
export type ReadinessBreakdown = { score: number | null; applicableCount: number; verifiedCount: number; inReviewCount: number; missingCount: number; notApplicableCount: number };
export type LocalAction = { id: string; title: string; detail: string; tone: "warning" | "primary" | "muted" };
export type LocalVisibilityRecordLike = { localVisibilityChecklist?: unknown; keywordTargets?: unknown; reviewMetrics?: unknown; reviewSnapshots?: unknown; conversionSnapshots?: unknown; conversionSetupChecklist?: unknown };

type RawRecord = Record<string, unknown>;
function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function number(value: unknown) { if (value === null || value === undefined || value === "") return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function nonNegative(value: unknown) { const parsed = number(value); return parsed !== null && parsed >= 0 ? parsed : null; }
function bounded(value: unknown, min: number, max: number) { const parsed = number(value); return parsed !== null && parsed >= min && parsed <= max ? parsed : null; }
function pick<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] { const normalized = String(value || "").trim().toLowerCase(); return options.find((option) => option.toLowerCase() === normalized) || fallback; }
function idFor(prefix: string, index: number) { return `${prefix}-${index}`; }
function arrayRecords(value: unknown) { return Array.isArray(value) ? value.filter((item): item is RawRecord => Boolean(item && typeof item === "object" && !Array.isArray(item))) : []; }
function dateOnly(value: unknown) { const raw = text(value); if (!raw) return ""; if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; const parsed = Date.parse(raw); return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : ""; }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()) : []; }
function hasNumber(value: number | null | undefined) { return value !== null && value !== undefined; }
function validHttpUrl(value: string) { if (!value.trim()) return true; return /^https?:\/\/[^\s]+$/i.test(value.trim()); }

export function monthKey(value: unknown) { const raw = text(value); if (/^\d{4}-\d{2}$/.test(raw)) return raw; const date = dateOnly(raw); return date ? date.slice(0, 7) : ""; }
export function duplicateMonthKeys(value: Array<{ month?: unknown }>) { const seen = new Set<string>(); const duplicates = new Set<string>(); value.map((item) => monthKey(item.month)).filter(Boolean).forEach((month) => { if (seen.has(month)) duplicates.add(month); seen.add(month); }); return Array.from(duplicates); }
export function defaultLocalVisibilityChecklist(): LocalVisibilityChecklistItem[] { return LOCAL_CHECKLIST_ITEMS.map((item) => ({ id: item.id, label: item.label, status: "missing", evidence: "", notes: "", updatedAt: "" })); }
export function normalizeLocalVisibilityChecklist(value: unknown): LocalVisibilityChecklistItem[] {
  const records = arrayRecords(value); const byId = new Map(records.map((record) => [text(record.id), record]));
  const known = LOCAL_CHECKLIST_ITEMS.map((item) => { const raw = byId.get(item.id); return { id: item.id, label: item.label, status: pick(raw?.status, LOCAL_CHECKLIST_STATUS_OPTIONS, "missing"), evidence: text(raw?.evidence), notes: text(raw?.notes), updatedAt: dateOnly(raw?.updatedAt) }; });
  const knownIds = new Set(known.map((item) => item.id));
  const extras = records.filter((record) => { const id = text(record.id); return id && !knownIds.has(id); }).map((record, index) => ({ id: text(record.id, idFor("check", index)), label: text(record.label, "Additional local check"), status: pick(record.status, LOCAL_CHECKLIST_STATUS_OPTIONS, "missing"), evidence: text(record.evidence), notes: text(record.notes), updatedAt: dateOnly(record.updatedAt) }));
  return [...known, ...extras];
}
export function defaultSeoFoundationChecklist(): SeoFoundationChecklistItem[] { return SEO_FOUNDATION_CHECKS.map((check) => ({ id: check.id, label: check.label, group: check.group, status: "missing", evidence: "", notes: "", updatedAt: "" })); }
export function normalizeSeoFoundationChecklist(value: unknown): SeoFoundationChecklistItem[] {
  const records = arrayRecords(value); const byId = new Map(records.map((record) => [text(record.id), record]));
  const normalizeStatus = (record: RawRecord | undefined) => { const status = pick(record?.status, SEO_FOUNDATION_STATUS_OPTIONS, "missing"); const supported = Boolean(text(record?.evidence) || text(record?.notes)); return ["verified", "blocked", "not_applicable"].includes(status) && !supported ? "missing" as SeoFoundationChecklistStatus : status; };
  const known = SEO_FOUNDATION_CHECKS.map((check) => { const raw = byId.get(check.id); return { id: check.id, label: check.label, group: check.group, status: normalizeStatus(raw), evidence: text(raw?.evidence), notes: text(raw?.notes), updatedAt: dateOnly(raw?.updatedAt) }; });
  const knownIds = new Set(known.map((item) => item.id));
  const extras = records.filter((record) => { const id = text(record.id); return id && !knownIds.has(id); }).map((record, index) => { const group = SEO_FOUNDATION_GROUPS.some((item) => item.id === record.group) ? record.group as SeoFoundationGroupId : "technical"; return { id: text(record.id, idFor("seo-check", index)), label: text(record.label, "Additional SEO foundation check"), group, status: normalizeStatus(record), evidence: text(record.evidence), notes: text(record.notes), updatedAt: dateOnly(record.updatedAt) }; });
  return [...known, ...extras];
}
export function validateSeoFoundationChecklist(value: unknown): string[] {
  return arrayRecords(value).flatMap((record) => { const status = pick(record.status, SEO_FOUNDATION_STATUS_OPTIONS, "missing"); const label = text(record.label, "This SEO check"); const supported = Boolean(text(record.evidence) || text(record.notes)); return ["verified", "blocked", "not_applicable"].includes(status) && !supported ? `${label} needs evidence or a clear note before it can be marked ${seoFoundationStatusLabel(status).toLowerCase()}.` : []; });
}
export function seoFoundationStatusLabel(value: unknown) { return { missing: "Not started", in_review: "In progress", verified: "Verified", blocked: "Blocked", not_applicable: "Not applicable" }[pick(value, SEO_FOUNDATION_STATUS_OPTIONS, "missing")]; }
export function normalizeKeywordTargets(value: unknown): KeywordTarget[] { return arrayRecords(value).map((raw, index) => ({ id: text(raw.id, idFor("target", index)), service: text(raw.service), area: text(raw.area), keyword: text(raw.keyword), intent: pick(raw.intent, KEYWORD_INTENT_OPTIONS, "service"), targetUrl: text(raw.targetUrl), priority: pick(raw.priority, KEYWORD_PRIORITY_OPTIONS, "medium"), status: pick(raw.status, KEYWORD_STATUS_OPTIONS, "draft"), approvalState: pick(raw.approvalState, KEYWORD_APPROVAL_OPTIONS, "draft"), notes: text(raw.notes) })); }
export function normalizeReviewMetrics(value: unknown): ReviewMetrics { const raw = value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : {}; return { totalReviews: nonNegative(raw.totalReviews), averageRating: bounded(raw.averageRating, 0, 5), newReviewsThisMonth: nonNegative(raw.newReviewsThisMonth), responseRate: bounded(raw.responseRate, 0, 100), lastRequestDate: dateOnly(raw.lastRequestDate), reviewRequestLink: text(raw.reviewRequestLink), notes: text(raw.notes) }; }
export function normalizeReviewSnapshots(value: unknown): ReviewSnapshot[] { return arrayRecords(value).map((raw, index) => ({ id: text(raw.id, idFor("review", index)), month: monthKey(raw.month), totalReviews: nonNegative(raw.totalReviews), averageRating: bounded(raw.averageRating, 0, 5), newReviews: nonNegative(raw.newReviews), responseRate: bounded(raw.responseRate, 0, 100), source: text(raw.source, "manual"), notes: text(raw.notes) })).filter((item) => item.month || item.totalReviews !== null || item.averageRating !== null || item.newReviews !== null || item.responseRate !== null); }
export function normalizeConversionSnapshots(value: unknown): ConversionSnapshot[] { return arrayRecords(value).map((raw, index) => ({ id: text(raw.id, idFor("conversion", index)), month: monthKey(raw.month), calls: nonNegative(raw.calls), formEnquiries: nonNegative(raw.formEnquiries), qualifiedLeads: nonNegative(raw.qualifiedLeads), bookedJobs: nonNegative(raw.bookedJobs), averageResponseMinutes: nonNegative(raw.averageResponseMinutes), source: text(raw.source, "manual"), sourceType: pick(raw.sourceType, SNAPSHOT_SOURCE_OPTIONS, "manual"), notes: text(raw.notes) })).filter((item) => item.month || item.calls !== null || item.formEnquiries !== null || item.qualifiedLeads !== null || item.bookedJobs !== null || item.averageResponseMinutes !== null); }
export function defaultConversionSetupChecklist(): ConversionChecklistItem[] { return CONVERSION_CHECKLIST_ITEMS.map((item) => ({ id: item.id, label: item.label, complete: false, notes: "" })); }
export function normalizeConversionChecklist(value: unknown): ConversionChecklistItem[] { const records = arrayRecords(value); const byId = new Map(records.map((record) => [text(record.id), record])); return CONVERSION_CHECKLIST_ITEMS.map((item) => ({ id: item.id, label: item.label, complete: byId.get(item.id)?.complete === true, notes: text(byId.get(item.id)?.notes) })); }
export function normalizeGbpActionLog(value: unknown): GbpActionLogEntry[] { return arrayRecords(value).map((raw, index) => ({ id: text(raw.id, idFor("gbp", index)), date: dateOnly(raw.date), action: text(raw.action), status: pick(raw.status, GBP_ACTION_STATUS_OPTIONS, "draft"), notes: text(raw.notes) })); }
export function normalizeMonthlyVisibilityNotes(value: unknown): MonthlyVisibilityNote[] { return arrayRecords(value).map((raw, index) => ({ id: text(raw.id, idFor("visibility", index)), month: monthKey(raw.month), summary: text(raw.summary), notes: text(raw.notes), nextAction: text(raw.nextAction) })); }

export function readinessBreakdown(value: unknown): ReadinessBreakdown { const checklist = normalizeLocalVisibilityChecklist(value); const applicable = checklist.filter((item) => item.status !== "not_applicable"); const verifiedCount = applicable.filter((item) => item.status === "verified").length; const inReviewCount = applicable.filter((item) => item.status === "in_review").length; const missingCount = applicable.filter((item) => item.status === "missing").length; return { score: applicable.length ? Math.round(((verifiedCount + inReviewCount * 0.5) / applicable.length) * 100) : null, applicableCount: applicable.length, verifiedCount, inReviewCount, missingCount, notApplicableCount: checklist.length - applicable.length }; }
export function seoFoundationReadinessBreakdown(value: unknown): SeoFoundationReadinessBreakdown {
  const checklist = normalizeSeoFoundationChecklist(value); const recorded = Array.isArray(value) && value.length > 0; const applicable = checklist.filter((item) => item.status !== "not_applicable");
  const verifiedCount = applicable.filter((item) => item.status === "verified").length; const inReviewCount = applicable.filter((item) => item.status === "in_review").length; const missingItems = applicable.filter((item) => item.status === "missing"); const blockedItems = applicable.filter((item) => item.status === "blocked");
  return { score: recorded && applicable.length ? Math.round(((verifiedCount + inReviewCount * 0.5) / applicable.length) * 100) : null, recorded, totalCount: checklist.length, applicableCount: applicable.length, verifiedCount, inReviewCount, missingCount: missingItems.length, blockedCount: blockedItems.length, notApplicableCount: checklist.length - applicable.length, missingItems, blockedItems };
}
export function calculateLocalReadinessScore(value: unknown) { return readinessBreakdown(value).score; }
export function safeRate(numerator: number | null | undefined, denominator: number | null | undefined) { if (numerator == null || denominator == null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 || numerator < 0 || numerator > denominator) return null; return Math.round((numerator / denominator) * 1000) / 10; }
export function conversionRates(snapshot: Pick<ConversionSnapshot, "calls" | "formEnquiries" | "qualifiedLeads" | "bookedJobs">) { const enquiries = snapshot.calls !== null && snapshot.formEnquiries !== null ? snapshot.calls + snapshot.formEnquiries : null; return { enquiryToQualified: safeRate(snapshot.qualifiedLeads, enquiries), qualifiedToBooked: safeRate(snapshot.bookedJobs, snapshot.qualifiedLeads), enquiryToBooked: safeRate(snapshot.bookedJobs, enquiries) }; }
export function hasReviewVelocity(metrics: ReviewMetrics, snapshots: ReviewSnapshot[] = []) { return metrics.newReviewsThisMonth !== null || snapshots.some((snapshot) => snapshot.newReviews !== null); }
export function hasConversionActivity(snapshots: ConversionSnapshot[] = []) { return snapshots.some((snapshot) => [snapshot.calls, snapshot.formEnquiries, snapshot.qualifiedLeads, snapshot.bookedJobs, snapshot.averageResponseMinutes].some((value) => value !== null)); }
export function keywordTargetCount(value: unknown) { return normalizeKeywordTargets(value).filter((target) => target.keyword).length; }
export function formatCount(value: number | null | undefined) { return value == null ? "Not recorded" : new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(value); }
export function formatPercent(value: number | null | undefined) { return value == null ? "Not recorded" : `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(value)}%`; }

function monthEndTimestamp(month: string) { const match = /^(\d{4})-(\d{2})$/.exec(month); if (!match) return NaN; const year = Number(match[1]); const monthNumber = Number(match[2]); return monthNumber >= 1 && monthNumber <= 12 ? Date.UTC(year, monthNumber, 0, 23, 59, 59) : NaN; }
export function isReviewActivityStale(metrics: ReviewMetrics, snapshots: ReviewSnapshot[] = [], days = 45, now = new Date()) { if (metrics.newReviewsThisMonth !== null && metrics.newReviewsThisMonth > 0) return false; const timestamps = [dateOnly(metrics.lastRequestDate) ? Date.parse(`${dateOnly(metrics.lastRequestDate)}T23:59:59`) : NaN, ...snapshots.map((snapshot) => monthEndTimestamp(snapshot.month))].filter(Number.isFinite); const latest = timestamps.length ? Math.max(...timestamps) : NaN; return !Number.isFinite(latest) || now.getTime() - latest > days * 86_400_000; }
export function missingLocalFacts(site?: LocalVisibilitySite | null) { const missing: { id: string; label: string; detail: string }[] = []; const add = (id: string, label: string, detail: string) => missing.push({ id, label, detail }); const services = stringList(site?.services); const areas = stringList(site?.serviceAreas).length ? stringList(site?.serviceAreas) : stringList(site?.areasServed); if (!text(site?.businessName)) add("business_name", "Business name", "Confirm the trading name used across local profiles."); if (!text(site?.trade)) add("trade", "Trade or service type", "Record the specific business category used for targeting."); if (!text(site?.location)) add("location", "Primary location", "Record the base location used for local context."); if (!text(site?.legalBusinessName)) add("legal_name", "Legal business name", "Add it when supplied for NAP and trust checking."); if (!text(site?.primaryGoogleBusinessCategory)) add("primary_category", "Primary Google Business category", "Record the current category before recommending changes."); if (!services.length) add("services", "Confirmed services", "Add the services the business actually sells."); if (!areas.length) add("service_areas", "Confirmed service areas", "Add real suburbs, towns, regions, or postcodes only."); if (!text(site?.businessHoursNotes)) add("hours", "Business hours", "Record regular and holiday-hours notes when available."); if (!text(site?.phone) && !text(site?.email)) add("contact", "Contact path", "Record a phone or email so the local profile can be checked."); if (!text(site?.googleBusinessUrl)) add("google_business", "Google Business URL", "Save the public profile or Maps link for review."); if (!text(site?.reviewLink)) add("review_link", "Review request link", "Save the link used for honest customer feedback."); if (!text(site?.licenceInsuranceNotes) && !text(site?.abn)) add("trust", "Trust evidence", "Record licence, insurance, ABN, or a note that evidence is not relevant."); if (!text(site?.napTrustVerificationNotes)) add("nap", "NAP and trust verification", "Note what has been checked and what still needs client evidence."); return missing; }

export function validateKeywordTarget(target: Partial<KeywordTarget>, facts?: { services?: string[]; areas?: string[] }) { const errors: string[] = []; const service = text(target.service); const area = text(target.area); const keyword = text(target.keyword); if (!service) errors.push("Choose a real service for every target."); if (!area) errors.push("Choose a confirmed suburb, town, region, or postcode for every target."); if (!keyword) errors.push("Add a keyword before saving the target."); if (target.targetUrl && !validHttpUrl(text(target.targetUrl))) errors.push("Target URLs must begin with http:// or https://."); if (facts?.services?.length && service && !facts.services.some((item) => item.trim().toLowerCase() === service.toLowerCase())) errors.push("Target service must match a confirmed client service."); if (facts?.areas?.length && area && !facts.areas.some((item) => item.trim().toLowerCase() === area.toLowerCase())) errors.push("Target area must match a confirmed client service area."); return errors; }
export function filterKeywordTargetsToFacts(value: unknown, facts: { services: string[]; areas: string[] }) { const services = facts.services.map((item) => item.trim().toLowerCase()); const areas = facts.areas.map((item) => item.trim().toLowerCase()); return normalizeKeywordTargets(value).filter((target) => services.includes(target.service.toLowerCase()) && areas.includes(target.area.toLowerCase()) && target.keyword); }
export function validateReviewMetrics(metrics: Partial<ReviewMetrics>) { const errors: string[] = []; if (hasNumber(metrics.totalReviews) && (!Number.isFinite(metrics.totalReviews) || metrics.totalReviews! < 0)) errors.push("Total reviews cannot be negative."); if (hasNumber(metrics.averageRating) && (!Number.isFinite(metrics.averageRating) || metrics.averageRating! < 0 || metrics.averageRating! > 5)) errors.push("Average rating must be between 0 and 5."); if (hasNumber(metrics.newReviewsThisMonth) && (!Number.isFinite(metrics.newReviewsThisMonth) || metrics.newReviewsThisMonth! < 0)) errors.push("New reviews cannot be negative."); if (hasNumber(metrics.responseRate) && (!Number.isFinite(metrics.responseRate) || metrics.responseRate! < 0 || metrics.responseRate! > 100)) errors.push("Response rate must be between 0 and 100%."); if (metrics.reviewRequestLink && !validHttpUrl(metrics.reviewRequestLink)) errors.push("Review request links must begin with http:// or https://."); return errors; }
export function validateReviewSnapshot(snapshot: ReviewSnapshot) { const errors: string[] = snapshot.month ? [] : ["Every review snapshot needs a month."]; if (hasNumber(snapshot.totalReviews) && snapshot.totalReviews! < 0) errors.push("Review totals cannot be negative."); if (hasNumber(snapshot.averageRating) && (snapshot.averageRating! < 0 || snapshot.averageRating! > 5)) errors.push("Snapshot ratings must be between 0 and 5."); if (hasNumber(snapshot.newReviews) && snapshot.newReviews! < 0) errors.push("New review counts cannot be negative."); if (hasNumber(snapshot.responseRate) && (snapshot.responseRate! < 0 || snapshot.responseRate! > 100)) errors.push("Snapshot response rates must be between 0 and 100%."); return errors; }
export function validateConversionSnapshot(snapshot: ConversionSnapshot) { const errors: string[] = snapshot.month ? [] : ["Every conversion snapshot needs a month."]; const values = [snapshot.calls, snapshot.formEnquiries, snapshot.qualifiedLeads, snapshot.bookedJobs, snapshot.averageResponseMinutes]; if (values.some((value) => hasNumber(value) && (!Number.isFinite(value) || value! < 0))) errors.push("Conversion values cannot be negative."); const enquiries = snapshot.calls !== null && snapshot.formEnquiries !== null ? snapshot.calls + snapshot.formEnquiries : null; if (enquiries !== null && snapshot.qualifiedLeads !== null && snapshot.qualifiedLeads > enquiries) errors.push("Qualified leads cannot exceed recorded calls plus form enquiries."); if (snapshot.qualifiedLeads !== null && snapshot.bookedJobs !== null && snapshot.bookedJobs > snapshot.qualifiedLeads) errors.push("Booked jobs cannot exceed qualified leads."); return errors; }

export function suggestedLocalActions(record: LocalVisibilityRecordLike, site?: LocalVisibilitySite | null) { const actions: LocalAction[] = []; const facts = missingLocalFacts(site); if (facts.length) actions.push({ id: "facts", title: "Complete the client truth record", detail: `${facts.length} local fact${facts.length === 1 ? " is" : "s are"} still missing or unverified.`, tone: "warning" }); const checklist = normalizeLocalVisibilityChecklist(record.localVisibilityChecklist); if (checklist.some((item) => item.status === "missing")) actions.push({ id: "checklist", title: "Review missing local checks", detail: "Mark each applicable profile item in review or verified with evidence.", tone: "warning" }); const targets = normalizeKeywordTargets(record.keywordTargets).filter((target) => target.keyword); const unapproved = targets.filter((target) => target.approvalState !== "approved"); if (!targets.length || unapproved.length) actions.push({ id: "targets", title: "Approve service-area targets", detail: !targets.length ? "Create targets from confirmed services and areas before planning content." : `${unapproved.length} editable target${unapproved.length === 1 ? " needs" : "s need"} an operator decision.`, tone: "primary" }); if (isReviewActivityStale(normalizeReviewMetrics(record.reviewMetrics), normalizeReviewSnapshots(record.reviewSnapshots))) actions.push({ id: "reviews", title: "Refresh review activity", detail: "The last request or review snapshot is stale or unavailable.", tone: "warning" }); const conversions = normalizeConversionSnapshots(record.conversionSnapshots); const latest = conversions.slice().sort((left, right) => right.month.localeCompare(left.month))[0]; if (!latest || [latest.calls, latest.formEnquiries, latest.qualifiedLeads, latest.bookedJobs].every((value) => value === null)) actions.push({ id: "conversion", title: "Record conversion inputs", detail: "Add a monthly client-reported or manual snapshot before judging lead flow.", tone: "primary" }); return actions; }

```

## `src/lib/client-onboarding.ts`

```ts
import { ClientSite as ClientSiteEntity, EmailSignatureRecord as EmailSignatureEntity, FinancialHealthAuditRecord as FinancialAuditEntity, GrowthStackRecord as GrowthStackEntity, HostingRecord as HostingEntity, SocialRevampRecord as SocialRevampEntity } from "@/entities";
import { SIGNATURE_GUIDES } from "@/lib/delivery-helpers";
import { BUSINESS_TYPE_OPTIONS, PACKAGE_OPTIONS, normalizeActivePackages, type ActivePackageId, type BusinessType, type ClientKind, type WebsiteSource } from "@/lib/hub-data";
import { defaultConversionSetupChecklist, defaultLocalVisibilityChecklist, defaultSeoFoundationChecklist } from "@/lib/growth-local-visibility";
import { auditPeriodLabel, isValidDomain, normalizeAeoChecklist, normalizeDomain, safeExternalUrl, type EmailSignatureRecordInput, type FinancialHealthAuditRecordInput, type GrowthStackRecordInput, type HostingRecordInput, type SocialRevampRecordInput, type SocialRevampPlatform } from "@/lib/hub-operations";
import { SOCIAL_REVAMP_PLATFORM_OPTIONS } from "@/lib/hub-operations";

export type OnboardingStep = 1 | 2 | 3 | 4;
export type OnboardingDestination = "clients" | "growthstack" | "socialRevamp" | "signatures" | "financialAudits" | "hosting" | "calendar" | "reports";

export type OnboardingDraft = {
  businessName: string;
  businessType: BusinessType;
  trade: string;
  location: string;
  phone: string;
  email: string;
  description: string;
  clientKind: ClientKind;
  websiteSource: WebsiteSource;
  website: string;
  services: string;
  serviceAreas: string;
  legalBusinessName: string;
  abn: string;
  googleBusinessUrl: string;
  reviewLink: string;
  businessHoursNotes: string;
  holidayHoursNotes: string;
  licenceInsuranceNotes: string;
  napTrustVerificationNotes: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  activePackages: ActivePackageId[];
  socialPlatforms: SocialRevampPlatform[];
  prepareEmailSignature: boolean;
  prepareFinancialAudit: boolean;
  prepareHosting: boolean;
};

export type OnboardingRecordSummary = { key: string; label: string; id?: string };
export type OnboardingIssue = { key: string; label: string; reason: string; id?: string };
export type ClientOnboardingResult = {
  clientSite: { id: string; businessName: string; created: boolean };
  created: OnboardingRecordSummary[];
  skipped: OnboardingIssue[];
  failed: OnboardingIssue[];
  ready: OnboardingRecordSummary[];
};

type NormalizedDraft = Omit<OnboardingDraft, "services" | "serviceAreas" | "website" | "googleBusinessUrl" | "reviewLink" | "facebookUrl" | "instagramUrl" | "linkedinUrl" | "tiktokUrl" | "trade"> & {
  trade: string;
  website: string;
  services: string[];
  serviceAreas: string[];
  googleBusinessUrl: string;
  reviewLink: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
};

const GROWTH_PACKAGE_IDS = new Set<ActivePackageId>(PACKAGE_OPTIONS.map((option) => option.id));
const SOCIAL_PACKAGE_IDS = new Set<ActivePackageId>(["social_revamp", "social_growth"]);
const EMPTY_REVIEW_METRICS = { totalReviews: null, averageRating: null, newReviewsThisMonth: null, responseRate: null, lastRequestDate: "", reviewRequestLink: "", notes: "" };

export function emptyOnboardingDraft(): OnboardingDraft {
  return {
    businessName: "", businessType: "other", trade: "", location: "", phone: "", email: "", description: "", clientKind: "client", websiteSource: "no_website", website: "",
    services: "", serviceAreas: "", legalBusinessName: "", abn: "", googleBusinessUrl: "", reviewLink: "", businessHoursNotes: "", holidayHoursNotes: "", licenceInsuranceNotes: "", napTrustVerificationNotes: "",
    facebookUrl: "", instagramUrl: "", linkedinUrl: "", tiktokUrl: "", activePackages: PACKAGE_OPTIONS.map((option) => option.id), socialPlatforms: [...SOCIAL_REVAMP_PLATFORM_OPTIONS], prepareEmailSignature: true, prepareFinancialAudit: true, prepareHosting: false,
  };
}

export function validateOnboardingDraft(draft: OnboardingDraft, step?: OnboardingStep): string[] {
  const errors: string[] = [];
  if (!step || step === 1) {
    if (!draft.businessName.trim()) errors.push("Add the business name before continuing.");
    if (draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) errors.push("Enter a valid email address or leave it blank.");
    if (draft.websiteSource === "existing_website" && !publicUrl(draft.website)) errors.push("Enter a valid public website URL beginning with http:// or https://.");
  }
  if (!step || step === 2) {
    const urls: Array<[string, string]> = [["Google Business", draft.googleBusinessUrl], ["review", draft.reviewLink], ["Facebook", draft.facebookUrl], ["Instagram", draft.instagramUrl], ["LinkedIn", draft.linkedinUrl], ["TikTok", draft.tiktokUrl]];
    urls.forEach(([label, value]) => { if (value.trim() && !publicUrl(value)) errors.push(`Add a valid public ${label} URL or leave it blank.`); });
  }
  if (!step || step === 3) {
    const hasSocial = draft.activePackages.some((id) => SOCIAL_PACKAGE_IDS.has(id));
    if (hasSocial && !draft.socialPlatforms.length) errors.push("Select at least one social platform for the social workspace.");
  }
  return errors;
}

function publicUrl(value: string) {
  const normalized = safeExternalUrl(value);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (url.username || url.password || host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) return "";
    return normalized;
  } catch { return ""; }
}

function lines(value: string) {
  const seen = new Set<string>();
  return value.split(/\r?\n/).map((item) => item.trim()).filter((item) => { const key = item.toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
function cleanUrl(value: string) { return value.trim() ? publicUrl(value) : ""; }
function normaliseDraft(draft: OnboardingDraft): NormalizedDraft {
  const businessTypeLabel = BUSINESS_TYPE_OPTIONS.find((option) => option.id === draft.businessType)?.label || "Business";
  return {
    ...draft, businessName: draft.businessName.trim(), trade: draft.trade.trim() || businessTypeLabel, location: draft.location.trim(), phone: draft.phone.trim(), email: draft.email.trim(), description: draft.description.trim(), website: draft.websiteSource === "existing_website" ? cleanUrl(draft.website) : "", services: lines(draft.services), serviceAreas: lines(draft.serviceAreas), legalBusinessName: draft.legalBusinessName.trim(), abn: draft.abn.trim(), googleBusinessUrl: cleanUrl(draft.googleBusinessUrl), reviewLink: cleanUrl(draft.reviewLink), businessHoursNotes: draft.businessHoursNotes.trim(), holidayHoursNotes: draft.holidayHoursNotes.trim(), licenceInsuranceNotes: draft.licenceInsuranceNotes.trim(), napTrustVerificationNotes: draft.napTrustVerificationNotes.trim(), facebookUrl: cleanUrl(draft.facebookUrl), instagramUrl: cleanUrl(draft.instagramUrl), linkedinUrl: cleanUrl(draft.linkedinUrl), tiktokUrl: cleanUrl(draft.tiktokUrl), activePackages: Array.from(new Set(normalizeActivePackages(draft.activePackages))), socialPlatforms: Array.from(new Set(draft.socialPlatforms)),
  };
}
function record(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function recordId(value: unknown) { const id = record(value)?.id; return typeof id === "string" && id.trim() ? id.trim() : ""; }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function identity(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function siteDuplicate(value: unknown, draft: NormalizedDraft) {
  const raw = record(value); if (!raw) return false;
  const nameMatches = identity(text(raw.businessName)) === identity(draft.businessName);
  if (!nameMatches) return false;
  const existingWebsite = normalizeDomain(text(raw.website)); const incomingWebsite = normalizeDomain(draft.website);
  if (incomingWebsite && existingWebsite && incomingWebsite === existingWebsite) return true;
  const existingLocation = identity(text(raw.location)); const incomingLocation = identity(draft.location);
  const existingTrade = identity(text(raw.trade)); const incomingTrade = identity(draft.trade);
  return (!incomingLocation || !existingLocation || existingLocation === incomingLocation) && (!incomingTrade || !existingTrade || existingTrade === incomingTrade);
}
function message(error: unknown, fallback: string) { return error instanceof Error && error.message.trim() ? error.message.trim() : fallback; }
async function list(entity: any, label: string) { const result = await entity.list("-updated_at", 500); if (!Array.isArray(result)) throw new Error(`${label} records returned an invalid response.`); return result; }
function socialLinks(draft: NormalizedDraft) { return { facebookUrl: draft.facebookUrl, instagramUrl: draft.instagramUrl, tiktokUrl: draft.tiktokUrl, linkedinUrl: draft.linkedinUrl, googleBusinessUrl: draft.googleBusinessUrl }; }
function socialList(draft: NormalizedDraft) { return [["Facebook", draft.facebookUrl], ["Instagram", draft.instagramUrl], ["LinkedIn", draft.linkedinUrl], ["TikTok", draft.tiktokUrl], ["Google Business", draft.googleBusinessUrl]].filter(([, url]) => Boolean(url)).map(([platform, url]) => ({ platform, url })); }
function blankAuditMetrics() { return { revenue: null, cogs: null, grossProfit: null, operatingExpenses: null, netProfit: null, cashOnHand: null, totalReceivables: null, overdueReceivables: null, payables: null, averageMonthlyOutflows: null, sourceNotes: "" }; }
function monthBounds() { const date = new Date(); const periodKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); return { periodKey, periodStart: `${periodKey}-01`, periodEnd: `${periodKey}-${String(lastDay).padStart(2, "0")}` }; }

function clientSitePayload(draft: NormalizedDraft) {
  const hasWebsite = Boolean(draft.website);
  return {
    businessName: draft.businessName, businessType: draft.businessType, trade: draft.trade, clientKind: draft.clientKind, websiteSource: draft.websiteSource, activePackages: draft.activePackages, hostingRequired: draft.prepareHosting && hasWebsite,
    description: draft.description, services: draft.services, areasServed: draft.serviceAreas, serviceAreas: draft.serviceAreas, location: draft.location, phone: draft.phone, email: draft.email, website: draft.website,
    legalBusinessName: draft.legalBusinessName, abn: draft.abn, primaryGoogleBusinessCategory: "", secondaryGoogleBusinessCategories: [], businessHoursNotes: draft.businessHoursNotes, holidayHoursNotes: draft.holidayHoursNotes, licenceInsuranceNotes: draft.licenceInsuranceNotes, googleBusinessUrl: draft.googleBusinessUrl, reviewLink: draft.reviewLink, napTrustVerificationNotes: draft.napTrustVerificationNotes,
    primaryColor: "", secondaryColor: "", logoImageUrl: "", photoUrls: [], reviewSnippets: [], generatedSiteHtml: "", sourceLeadId: "", previewToken: "", status: draft.websiteSource === "existing_website" ? "live" : "draft", tier: "None", socialLinks: socialLinks(draft), socialLinkList: socialList(draft), contactDetails: { phones: draft.phone ? [draft.phone] : [], emails: draft.email ? [draft.email] : [], contactPageUrl: "", bookingUrl: "", physicalAddress: "", serviceAreas: draft.serviceAreas, openingHours: draft.businessHoursNotes }, paymentConfig: { stripeEnabled: false, stripePublishableKey: "", paypalEnabled: false, paypalEmail: "", squareEnabled: false, adyenEnabled: false }, siteType: "service", products: [], includePromotions: false, brandVoice: "", brandAttitude: "", contentStyle: "", customerLanguage: [], visualVibe: "", visualStyle: "", colorFromImages: [], typographyVibe: "", extractedImageUrls: [], customSections: [],
  };
}
function growthPayload(siteId: string, draft: NormalizedDraft, now: string): GrowthStackRecordInput {
  const hasWebsite = Boolean(draft.website);
  return {
    clientSiteId: siteId, leadId: "", packageTier: "Basic Growth", lifecycleStatus: "onboarding", currentFocus: "Confirm the supplied business facts and public website before planning growth work.", nextAction: "Confirm the business facts, public profiles, and primary website or domain.", ownerNotes: "Created during onboarding. Confirm facts and public sources before marking checks verified.", attentionStatus: "healthy", lastActivityAt: now, nextReviewDate: "", targetWebsite: draft.website, googleBusinessUrl: draft.googleBusinessUrl, activePackageSnapshot: draft.activePackages, monthlyRetainer: null, billingStatus: "not_set", owner: "", blockers: "", lastWin: "", localVisibilityChecklist: defaultLocalVisibilityChecklist(), seoFoundationChecklist: defaultSeoFoundationChecklist(), primaryCanonicalUrl: hasWebsite ? draft.website : "", technicalSeoNotes: "Onboarding foundation created. Record technical observations only after the public website is checked.", aeoChecklist: normalizeAeoChecklist([]), keywordTargets: [], reviewMetrics: { ...EMPTY_REVIEW_METRICS }, reviewSnapshots: [], conversionSnapshots: [], conversionSetupChecklist: defaultConversionSetupChecklist(), gbpActionLog: [], monthlyVisibilityNotes: [], workPlan: [], monthlyDeliveryLog: [], seoCount: 0, localVisibilityCount: 0, contentCount: 0, emailCount: 0, communityCount: 0, campaignsCount: 0, reportingCount: 0,
  };
}
function socialPayload(siteId: string, draft: NormalizedDraft, now: string): SocialRevampRecordInput {
  return { clientSiteId: siteId, businessName: draft.businessName, selectedPlatforms: draft.socialPlatforms, sourceProfileUrls: { facebook: draft.facebookUrl, instagram: draft.instagramUrl, linkedin: draft.linkedinUrl, tiktok: draft.tiktokUrl }, clientBrief: "", audience: "", servicesOffers: draft.services.join(", "), location: draft.location, goals: "", primaryCta: "", brandVoice: "", visualDirection: "", constraints: "", uploadedAssets: [], status: "brief_collected", revisionNotes: "", nextAction: "Collect the social brief, audience, goals, and approved assets.", operatorNotes: "Created during onboarding. Public profile links are supplied only; no social account is connected.", approvalConfirmed: false, approvedBy: "", approvedAt: "", deliveryDate: "", deliveryRecipient: "", deliveryNotes: "", version: 1, versionHistory: [], lastUpdatedAt: now };
}
function signaturePayload(siteId: string, draft: NormalizedDraft, now: string): EmailSignatureRecordInput {
  return { clientSiteId: siteId, version: 1, status: "brief_collected", businessName: draft.businessName, tagline: "", logoImageUrl: "", primaryColor: "", secondaryColor: "", phone: draft.phone, email: draft.email, website: draft.website, address: draft.location, bookingUrl: "", socialLinks: { facebook: draft.facebookUrl, instagram: draft.instagramUrl, linkedin: draft.linkedinUrl, tiktok: draft.tiktokUrl, googleBusiness: draft.googleBusinessUrl }, teamMembers: [], signatureHtml: "", signaturePlainText: "", installationGuides: SIGNATURE_GUIDES, approvalConfirmed: false, approvedBy: "", approvedAt: "", deliveryDate: "", deliveryRecipient: "", deliveryNotes: "", seasonalUpdateNotes: "", operatorNotes: "Created during onboarding. Add an approved team member before producing a signature.", versionHistory: [], lastUpdatedAt: now };
}
function auditPayload(siteId: string, now: string): FinancialHealthAuditRecordInput {
  const period = monthBounds();
  return { clientSiteId: siteId, periodKey: period.periodKey, periodLabel: auditPeriodLabel(period.periodKey), periodStart: period.periodStart, periodEnd: period.periodEnd, workflowStatus: "draft", dataCutoffDate: "", accessChecklist: { provider: "", organisationName: "", requestedAt: "", grantedAt: "", revokedAt: "", readOnlyConfirmed: false, clarificationNotes: "" }, sourceChecklist: { profitAndLoss: false, balanceSheet: false, agedReceivables: false, cashPosition: false, agedPayables: false, otherSourceNotes: false }, uploadedReports: [], dataQualityFlags: "", metrics: blankAuditMetrics(), derivedCalculations: { grossMargin: null, operatingMargin: null, overdueDebtorPercentage: null, cashRunwayMonths: null, priorRevenueVariance: null, priorNetProfitVariance: null }, periodComparison: { priorPeriodKey: "", priorRevenue: null, priorNetProfit: null, priorCashOnHand: null, sourceNotes: "" }, commentary: { pAndL: "", cashFlowWatch: "", debtorWatchlist: "", payablesWatch: "", expenseTrend: "", growthOpportunities: "", dataQualityIssues: "" }, risks: [], recommendations: [], assumptions: "", limitations: "Onboarding created an empty intake record. No financial conclusions have been prepared.", limitationsAcknowledged: false, qaApproved: false, qaApprovedBy: "", qaApprovedAt: "", clientReadySummary: "", deliveryDate: "", deliveryRecipient: "", deliveryNotes: "", nextReviewDate: "", loomUrl: "", deliveryHistory: [], lastUpdatedAt: now };
}
function hostingPayload(siteId: string, businessName: string, domain: string): HostingRecordInput {
  return { clientSiteId: siteId, businessName, domain, sslStatus: "unknown", cdnStatus: "unknown", hostingStatus: "pending", bandwidthUsedGb: 0, bandwidthLimitGb: 0, storageUsedGb: 0, storageLimitGb: 0, uptimePercentage: 0, lastCheckedAt: "", nextCheckDate: "", renewalDate: "", notes: "Created during onboarding. Provider, plan limits, and checks still need to be confirmed manually.", operationalStatus: "unknown", actionNeeded: "Confirm the hosting provider, plan limits, and next manual check." };
}

async function prepareOptional(result: ClientOnboardingResult, key: string, label: string, entity: any, siteId: string, payload: unknown, matcher: (value: Record<string, unknown>) => boolean) {
  try {
    const records = await list(entity, label);
    const duplicate = records.find((item) => matcher(record(item) || {}));
    if (duplicate) { result.skipped.push({ key, label, id: recordId(duplicate), reason: "An existing linked workspace was kept unchanged." }); return recordId(duplicate); }
    const created = await entity.create(payload);
    const id = recordId(created);
    if (!id) throw new Error(`${label} was saved without a usable record id.`);
    result.created.push({ key, label, id }); return id;
  } catch (error) {
    result.failed.push({ key, label, reason: message(error, `${label} could not be prepared.`) }); return "";
  }
}

export async function createClientOnboarding(draft: OnboardingDraft): Promise<ClientOnboardingResult> {
  const validation = validateOnboardingDraft(draft);
  if (validation.length) throw new Error(validation[0]);
  const normalized = normaliseDraft(draft);
  const siteRecords = await list(ClientSiteEntity, "Client and business");
  const existingSite = siteRecords.find((item) => siteDuplicate(item, normalized));
  let siteId = "";
  let siteCreated = false;
  const result: ClientOnboardingResult = { clientSite: { id: "", businessName: normalized.businessName, created: false }, created: [], skipped: [], failed: [], ready: [] };

  if (existingSite) {
    siteId = recordId(existingSite);
    if (!siteId) throw new Error("The matching client record does not have a usable id.");
    result.clientSite = { id: siteId, businessName: text(record(existingSite)?.businessName) || normalized.businessName, created: false };
    result.skipped.push({ key: "clientSite", label: "Client / business record", id: siteId, reason: "A matching client record already exists, so it was kept unchanged." });
  } else {
    try {
      const created = await ClientSiteEntity.create(clientSitePayload(normalized));
      siteId = recordId(created);
      if (!siteId) throw new Error("The client record was saved without a usable id.");
      siteCreated = true;
      result.clientSite = { id: siteId, businessName: normalized.businessName, created: true };
      result.created.push({ key: "clientSite", label: "Client / business record", id: siteId });
    } catch (error) {
      throw new Error(message(error, "The client or business record could not be saved. No workspace records were created."));
    }
  }

  const now = new Date().toISOString();
  const shouldCreateGrowth = normalized.activePackages.some((id) => GROWTH_PACKAGE_IDS.has(id));
  let growthReady = false;
  if (shouldCreateGrowth) {
    const growthId = await prepareOptional(result, "growthstack", "GrowthStack", GrowthStackEntity, siteId, growthPayload(siteId, normalized, now), (item) => text(item.clientSiteId) === siteId);
    growthReady = Boolean(growthId);
  } else {
    result.skipped.push({ key: "growthstack", label: "GrowthStack", reason: "No growth package was selected." });
  }

  const socialSelected = normalized.activePackages.some((id) => SOCIAL_PACKAGE_IDS.has(id));
  if (socialSelected) await prepareOptional(result, "socialRevamp", "Social Revamp", SocialRevampEntity, siteId, socialPayload(siteId, normalized, now), (item) => text(item.clientSiteId) === siteId);
  if (normalized.prepareEmailSignature) await prepareOptional(result, "signatures", "Email Signature", EmailSignatureEntity, siteId, signaturePayload(siteId, normalized, now), (item) => text(item.clientSiteId) === siteId);
  if (normalized.prepareFinancialAudit) {
    const period = monthBounds();
    await prepareOptional(result, "financialAudits", "Financial Audit", FinancialAuditEntity, siteId, auditPayload(siteId, now), (item) => text(item.clientSiteId) === siteId && text(item.periodKey) === period.periodKey);
  }
  if (normalized.prepareHosting) {
    const domain = normalizeDomain(normalized.website);
    if (!domain || !isValidDomain(domain)) result.skipped.push({ key: "hosting", label: "Hosting", reason: "A public website domain is still needed before a hosting record can be prepared." });
    else await prepareOptional(result, "hosting", "Hosting", HostingEntity, siteId, hostingPayload(siteId, result.clientSite.businessName, domain), (item) => text(item.clientSiteId) === siteId || normalizeDomain(text(item.domain)) === domain);
  }

  if (growthReady) {
    result.ready.push({ key: "reports", label: "Reports", id: siteId });
    if (normalized.activePackages.includes("content")) result.ready.push({ key: "calendar", label: "Content Calendar", id: siteId });
  } else if (normalized.activePackages.includes("content")) {
    result.failed.push({ key: "calendar", label: "Content Calendar", reason: "GrowthStack was not available, so the content planning workstream still needs setup." });
  }
  if (!siteCreated && !result.skipped.some((item) => item.key === "clientSite")) result.skipped.push({ key: "clientSite", label: "Client / business record", reason: "The existing client record was kept unchanged." });
  return result;
}

```

## `src/lib/delivery-helpers.ts`

```ts
import type {
  AuditMetrics,
  AuditPeriodComparison,
  AuditDerivedCalculations,
  EmailSignatureRecord,
  SignatureSocialLinks,
  SignatureTeamMember,
} from "@/lib/hub-operations";

export const SIGNATURE_GUIDES = {
  gmail: "Gmail / Google Workspace: open Settings, choose See all settings, then General. Scroll to Signature, create or select the team signature, paste the rendered signature, and choose Save Changes.",
  outlook: "Outlook / Microsoft 365: open Settings, choose Mail, then Compose and reply. Paste the rendered signature, set it for new messages and replies, then save. Classic Outlook uses File, Options, Mail, Signatures.",
  appleMail: "Apple Mail: open Mail, Settings, then Signatures. Select the account, add a signature, and paste the rendered version. If formatting is lost, use the plain-text fallback and add the links manually.",
};

export function readText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function readNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function validHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value.trim());
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function validHexColor(value: string) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

export function signatureColor(value: string, fallback: string) {
  return validHexColor(value) ? value.trim() : fallback;
}

export function dateInputValue(value: unknown) {
  const text = readText(value);
  if (!text) return "";
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

export function dateTimeValue(value: unknown) {
  const text = readText(value);
  if (!text) return "";
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function escapeHtml(value: unknown) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function signatureUrl(value: string) {
  return validHttpUrl(value) && value.trim() ? value.trim() : "";
}

export function buildSignatureHtml(record: Pick<EmailSignatureRecord, "businessName" | "tagline" | "logoImageUrl" | "primaryColor" | "secondaryColor" | "phone" | "email" | "website" | "address" | "bookingUrl" | "socialLinks">, member: SignatureTeamMember) {
  const primary = signatureColor(record.primaryColor, "#BAFB3A");
  const secondary = signatureColor(record.secondaryColor, "#1CC7E0");
  const website = signatureUrl(record.website);
  const booking = signatureUrl(record.bookingUrl);
  const logo = signatureUrl(record.logoImageUrl);
  const socials = Object.entries(record.socialLinks || {} as SignatureSocialLinks).filter(([, url]) => Boolean(signatureUrl(String(url || ""))));
  const links = [website ? `<a href="${escapeHtml(website)}" style="color:${escapeHtml(primary)};text-decoration:none;">${escapeHtml(website.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : "", booking ? `<a href="${escapeHtml(booking)}" style="color:${escapeHtml(secondary)};text-decoration:none;">Book / enquire</a>` : "", ...socials.map(([name, url]) => `<a href="${escapeHtml(signatureUrl(String(url)))}" style="color:#667085;text-decoration:none;">${escapeHtml(name === "googleBusiness" ? "Google Business" : name[0].toUpperCase() + name.slice(1))}</a>`)].filter(Boolean);
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#17202a;max-width:620px;border-collapse:collapse;"><tr><td style="padding:0 16px 0 0;vertical-align:top;">${logo ? `<img src="${escapeHtml(logo)}" width="72" alt="${escapeHtml(record.businessName)} logo" style="display:block;width:72px;height:auto;max-height:72px;object-fit:contain;border:0;">` : `<div style="width:56px;height:56px;background:${escapeHtml(primary)};border-radius:12px;"></div>`}</td><td style="border-left:3px solid ${escapeHtml(primary)};padding:0 0 0 16px;vertical-align:top;"><div style="font-size:17px;line-height:22px;font-weight:700;">${escapeHtml(member.name)}</div><div style="font-size:12px;line-height:18px;color:#667085;">${member.role ? `${escapeHtml(member.role)}${record.businessName ? " · " : ""}` : ""}${record.businessName ? escapeHtml(record.businessName) : ""}</div>${record.tagline ? `<div style="margin-top:7px;font-size:12px;line-height:17px;color:#475467;">${escapeHtml(record.tagline)}</div>` : ""}<div style="margin-top:10px;font-size:12px;line-height:19px;color:#475467;">${member.email || record.email ? `<a href="mailto:${escapeHtml(member.email || record.email)}" style="color:#475467;text-decoration:none;">${escapeHtml(member.email || record.email)}</a>` : ""}${member.phone || record.phone ? `${member.email || record.email ? " &nbsp;·&nbsp; " : ""}<a href="tel:${escapeHtml(member.phone || record.phone)}" style="color:#475467;text-decoration:none;">${escapeHtml(member.phone || record.phone)}</a>` : ""}${record.address ? `<br>${escapeHtml(record.address)}` : ""}</div>${member.licenceDetails || member.insuranceDetails ? `<div style="margin-top:7px;font-size:11px;line-height:16px;color:#667085;">${escapeHtml([member.licenceDetails, member.insuranceDetails].filter(Boolean).join(" · "))}</div>` : ""}${links.length ? `<div style="margin-top:9px;font-size:11px;line-height:18px;">${links.join(" &nbsp;·&nbsp; ")}</div>` : ""}</td></tr></table>`;
}

export function buildSignaturePlainText(record: Pick<EmailSignatureRecord, "businessName" | "tagline" | "phone" | "email" | "website" | "address" | "bookingUrl">, member: SignatureTeamMember) {
  return [member.name, [member.role, record.businessName].filter(Boolean).join(" · "), record.tagline, [member.email || record.email, member.phone || record.phone].filter(Boolean).join(" · "), record.address, record.website, record.bookingUrl ? `Book / enquire: ${record.bookingUrl}` : "", [member.licenceDetails, member.insuranceDetails].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
}

export function deriveAuditCalculations(metrics: AuditMetrics, comparison: AuditPeriodComparison): AuditDerivedCalculations {
  const grossProfit = metrics.grossProfit ?? (metrics.revenue != null && metrics.cogs != null ? metrics.revenue - metrics.cogs : null);
  const grossMargin = metrics.revenue != null && metrics.revenue > 0 && grossProfit != null ? (grossProfit / metrics.revenue) * 100 : null;
  const operatingMargin = metrics.revenue != null && metrics.revenue > 0 && metrics.netProfit != null ? (metrics.netProfit / metrics.revenue) * 100 : null;
  const overdueDebtorPercentage = metrics.totalReceivables != null && metrics.totalReceivables > 0 && metrics.overdueReceivables != null ? (metrics.overdueReceivables / metrics.totalReceivables) * 100 : null;
  const cashRunwayMonths = metrics.cashOnHand != null && metrics.averageMonthlyOutflows != null && metrics.averageMonthlyOutflows > 0 ? metrics.cashOnHand / metrics.averageMonthlyOutflows : null;
  const priorRevenueVariance = metrics.revenue != null && comparison.priorRevenue != null && comparison.priorRevenue > 0 ? ((metrics.revenue - comparison.priorRevenue) / comparison.priorRevenue) * 100 : null;
  const priorNetProfitVariance = metrics.netProfit != null && comparison.priorNetProfit != null && comparison.priorNetProfit !== 0 ? ((metrics.netProfit - comparison.priorNetProfit) / Math.abs(comparison.priorNetProfit)) * 100 : null;
  return { grossMargin, operatingMargin, overdueDebtorPercentage, cashRunwayMonths, priorRevenueVariance, priorNetProfitVariance };
}

export function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${value.toFixed(1)}%`;
}

export function formatMonths(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${value.toFixed(1)} months`;
}
```

## `src/lib/invoice-catalog.ts`

```ts
import { CATALOG } from "@/lib/checkout-session";

export const CENTRAL_HUB_INVOICE_LOGO = "https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/project-favicons/63753488-afdd-47d8-b23e-cc9601d992a7/dwlmeq5ucpc0rdauxaan6-f7101c28-5c8a-4dec-b50e-5c2ef983aa7a.png";
export const DEFAULT_INVOICE_BRAND = { primaryColor: "#BAFB3A", secondaryColor: "#141820", accentColor: "#1CC7E0" } as const;

export type InvoiceTermId = "monthly" | "three_month" | "six_month" | "annual";
export type InvoiceLineKind = "website" | "marketing" | "addon";
export type InvoiceStatus = "draft" | "paid" | "cancelled";

export const INVOICE_TERM_OPTIONS: { id: InvoiceTermId; label: string; shortLabel: string; months: number; note: string }[] = [
  { id: "monthly", label: "Monthly prepaid", shortLabel: "1 month", months: 1, note: "One month is invoiced upfront." },
  { id: "three_month", label: "3-month prepaid", shortLabel: "3 months", months: 3, note: "Three months are invoiced upfront." },
  { id: "six_month", label: "6-month prepaid", shortLabel: "6 months", months: 6, note: "Six months are invoiced upfront." },
  { id: "annual", label: "Annual prepaid", shortLabel: "12 months", months: 12, note: "Twelve months are invoiced upfront at the regular monthly rate." },
];

function catalogAmount(id: string) {
  return Number(CATALOG[id]?.amountCents || 0);
}

export type MarketingPackage = {
  id: "basic" | "standard" | "all_inclusive";
  name: string;
  monthlyCents: number;
  annualCents: number;
  summary: string;
  inclusions: string[];
};

export const PUBLIC_MARKETING_PACKAGES: MarketingPackage[] = [
  {
    id: "basic",
    name: "Startup GrowthStack",
    monthlyCents: catalogAmount("growthstack_basic_monthly"),
    annualCents: catalogAmount("growthstack_basic_yearly"),
    summary: "A polished local foundation for enquiries, bookings, and online selling.",
    inclusions: ["Bespoke website with hosting, SSL, domain, and CDN", "Local SEO foundation and Google Business Profile setup", "On-page optimisation for up to 10 core pages", "Monthly health, speed, uptime, and rank reporting"],
  },
  {
    id: "standard",
    name: "Scale GrowthStack",
    monthlyCents: catalogAmount("growthstack_standard_monthly"),
    annualCents: catalogAmount("growthstack_standard_yearly"),
    summary: "More visibility, content, and support to turn attention into enquiries.",
    inclusions: ["Everything in Startup with a deeper monthly growth plan", "Eight content assets per month", "Competitor tracking, local landing pages, and schema", "Bi-weekly update and one strategy call each month"],
  },
  {
    id: "all_inclusive",
    name: "Enterprise GrowthStack",
    monthlyCents: catalogAmount("growthstack_all_inclusive_monthly"),
    annualCents: catalogAmount("growthstack_all_inclusive_yearly"),
    summary: "A full managed growth system for owners who want the details handled.",
    inclusions: ["Everything in Scale with the deepest GrowthStack support", "Fifteen content pieces per month and advanced topical clusters", "Conversion work, campaigns, reporting, and priority support", "Financial Health Advisory, email signatures, and Social Revamp setup add-on"],
  },
];

export type InvoiceLineItem = {
  id: string;
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  unitAmount: number;
  lineTotal: number;
  termLabel?: string;
};

export type InvoiceSettingsRecord = {
  id?: string;
  legalName: string;
  tradingName: string;
  abn: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bankAccountName: string;
  bankName: string;
  bsb: string;
  accountNumber: string;
  payid: string;
  paymentTerms: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  gstEnabled: boolean;
  gstRate: number;
  footerNote: string;
  updated_at?: string;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientSiteId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  websiteAmount: number;
  marketingPackageId: string;
  marketingTerm: InvoiceTermId | "";
  lineItems: InvoiceLineItem[];
  billingTerms: string;
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  total: number;
  notes: string;
  paymentInstructionSnapshot: Partial<InvoiceSettingsRecord>;
  created_at?: string;
  updated_at?: string;
};

export function packageById(id: string) {
  return PUBLIC_MARKETING_PACKAGES.find((item) => item.id === id);
}

export function termById(id: string) {
  return INVOICE_TERM_OPTIONS.find((item) => item.id === id);
}

export function packageAmountCents(packageId: string, termId: InvoiceTermId) {
  const pack = packageById(packageId);
  const term = termById(termId);
  if (!pack || !term) return 0;
  return term.id === "annual" ? pack.annualCents : pack.monthlyCents * term.months;
}

export function packageAmount(packageId: string, termId: InvoiceTermId) {
  return packageAmountCents(packageId, termId) / 100;
}

export function formatAud(value: number, whole = false) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(Number.isFinite(value) ? value : 0);
}

export function invoiceTotals(lines: InvoiceLineItem[], gstEnabled: boolean, gstRate: number) {
  const subtotal = lines.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitAmount) || 0), 0);
  const gstAmount = gstEnabled ? subtotal * Math.max(0, Number(gstRate) || 0) / 100 : 0;
  return { subtotal, gstAmount, total: subtotal + gstAmount };
}

export function nextInvoiceNumber(prefix: string, number: number) {
  const cleanPrefix = prefix.trim() || "INV-";
  const sequence = Math.max(1, Math.floor(Number(number) || 1));
  return `${cleanPrefix}${String(sequence).padStart(4, "0")}`;
}

export function datePlusDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultInvoiceSettings(): InvoiceSettingsRecord {
  return { legalName: "", tradingName: "", abn: "", address: "", email: "", phone: "", website: "", logoUrl: "", primaryColor: "", secondaryColor: "", accentColor: "", bankAccountName: "", bankName: "", bsb: "", accountNumber: "", payid: "", paymentTerms: "", invoicePrefix: "INV-", nextInvoiceNumber: 1, gstEnabled: false, gstRate: 10, footerNote: "" };
}

export function brandForSettings(settings?: Partial<InvoiceSettingsRecord>) {
  return { logoUrl: settings?.logoUrl?.trim() || CENTRAL_HUB_INVOICE_LOGO, primaryColor: settings?.primaryColor?.trim() || DEFAULT_INVOICE_BRAND.primaryColor, secondaryColor: settings?.secondaryColor?.trim() || DEFAULT_INVOICE_BRAND.secondaryColor, accentColor: settings?.accentColor?.trim() || DEFAULT_INVOICE_BRAND.accentColor };
}

export function hasPaymentDetails(settings?: Partial<InvoiceSettingsRecord>) {
  return Boolean(settings?.bankAccountName?.trim() || settings?.bankName?.trim() || settings?.bsb?.trim() || settings?.accountNumber?.trim() || settings?.payid?.trim());
}

export function paymentSnapshot(settings: InvoiceSettingsRecord): Partial<InvoiceSettingsRecord> {
  const { id: _id, updated_at: _updatedAt, ...snapshot } = settings;
  return { ...snapshot };
}
```

## `src/lib/lead-build.ts`

```ts
export type LeadBuildState = "none" | "queued" | "building" | "ready" | "incomplete" | "failed" | "blocked";

export type BundleCompleteness = {
  complete: boolean;
  previewUrl: string | null;
  missing: string[];
  hasAnyAsset: boolean;
};

type LeadLike = Record<string, unknown>;

const PREVIEW_ORIGIN = "https://laydbackapps.com";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validOutreachText(value: unknown): boolean {
  const normalized = text(value);
  if (normalized.length < 24) return false;
  return !/\[[^\]\r\n]+\]|\{[^}\r\n]+\}|<\s*(?:business|trade|location|preview|website|name)\b[^>]*>/i.test(normalized);
}

/** Accept only the tokenized private store URL issued by the draft builder. */
export function safePrivatePreviewUrl(value: unknown, clientSiteId?: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol !== "https:" ||
      parsed.origin !== PREVIEW_ORIGIN ||
      parsed.username ||
      parsed.password ||
      parsed.search
    ) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length !== 2 || segments[0] !== "store" || !segments[1]) return null;
    const expectedSiteId = text(clientSiteId);
    if (expectedSiteId && segments[1] !== expectedSiteId) return null;

    const token = parsed.hash.startsWith("#token=") ? parsed.hash.slice(7) : "";
    if (!/^[a-f0-9]{64}$/i.test(token)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function hasExactPreviewLinkLine(value: unknown, previewUrl: unknown): boolean {
  const link = text(previewUrl);
  if (!link || typeof value !== "string" || !value.trim()) return false;
  return value.split(/\r?\n/).some((line) => line.trim() === link);
}

export function diagnoseBundleCompleteness(lead: LeadLike): BundleCompleteness {
  const previewUrl = safePrivatePreviewUrl(lead.previewUrl, lead.clientSiteId);
  const missing: string[] = [];
  const pitchDm = text(lead.pitchDm);
  const followUpDm = text(lead.followUpDm);
  const coldCallPitch = text(lead.coldCallPitch);

  if (!previewUrl) missing.push("private preview link");
  if (!validOutreachText(pitchDm)) missing.push(pitchDm ? "valid first outreach DM" : "first outreach DM");
  else if (!previewUrl || !hasExactPreviewLinkLine(pitchDm, previewUrl)) missing.push("first DM with the exact private link");
  if (!validOutreachText(followUpDm)) missing.push(followUpDm ? "valid follow-up DM" : "follow-up DM");
  else if (!previewUrl || !hasExactPreviewLinkLine(followUpDm, previewUrl)) missing.push("follow-up DM with the exact private link");
  if (!validOutreachText(coldCallPitch)) missing.push(coldCallPitch ? "valid cold-call script" : "cold-call script");

  return {
    complete: missing.length === 0,
    previewUrl,
    missing,
    hasAnyAsset: Boolean(text(lead.previewUrl) || pitchDm || followUpDm || coldCallPitch),
  };
}

export function buildStateForLead(lead: LeadLike, eligible: boolean): LeadBuildState {
  const bundle = diagnoseBundleCompleteness(lead);
  const raw = text(lead.siteBuildStatus).toLowerCase();

  // A finished bundle remains reviewable even if its source later needs re-verification.
  if (bundle.complete) return "ready";
  if (raw === "blocked" || !eligible) return "blocked";
  if (raw === "queued" || raw === "building" || raw === "failed") return raw;
  if (raw === "ready" || bundle.hasAnyAsset) return "incomplete";
  return "none";
}
```

## `src/lib/sales-playbook.ts`

```ts
export type SalesPlaybookCategory = {
  id: string;
  label: string;
  eyebrow: string;
  description: string;
  accent: "lime" | "cyan" | "amber" | "violet";
  points: string[];
};

export type SalesPlaybookSection = {
  id: string;
  label: string;
  description: string;
  points: string[];
};

export const SALES_PLAYBOOK_CATEGORIES: SalesPlaybookCategory[] = [
  {
    id: "website-store",
    label: "Website & store builds",
    eyebrow: "START WITH THE FOUNDATION",
    description: "Use this when a business needs a better place to explain its work, take enquiries, accept bookings, or sell online.",
    accent: "lime",
    points: ["We build a bespoke website or store around the business, its services, products, and customers.", "The layout makes the important information easy to find, with clear paths to enquire, book, call, or buy.", "Stores can include a product catalogue, product detail pages, cart, checkout, and practical inventory fields when online selling matters.", "We start from the business information and visual material already available, then shape the first version around what customers need to know.", "The site is reviewed before launch. Details, copy, sections, and calls to action can be refined around the owner’s feedback."] ,
  },
  {
    id: "hosting-care",
    label: "Hosting & ongoing care",
    eyebrow: "KEEP THE SITE READY",
    description: "Position the technical foundation as ongoing care, so the owner knows what happens after the initial build.",
    accent: "cyan",
    points: ["Hosting, SSL, domain, and CDN support are part of the managed website foundation where the selected package includes them.", "When a service changes, a promotion starts, or a page needs work, the owner can send the request for an update.", "We keep practical security, speed, uptime, and maintenance work visible in the operator workflow.", "Hosting and maintenance support does not replace a registrar, email provider, accountant, or other specialist service unless that work is explicitly agreed.", "Say what is included in the chosen package and confirm any custom work before promising it."] ,
  },
  {
    id: "growthstack",
    label: "GrowthStack packages",
    eyebrow: "MATCH THE LEVEL OF SUPPORT",
    description: "Use the public Basic, Standard, and All-Inclusive catalogue. Quote the website build separately when a custom site price applies.",
    accent: "lime",
    points: ["Basic, A$199/month or A$1,990/year: website foundation, hosting, local SEO foundation, core on-page work, lead paths, and monthly health reporting.", "Standard, A$349/month or A$3,490/year: everything in Basic, plus monthly content, competitor tracking, local landing pages, and schema", "All-Inclusive, A$699/month or A$6,990/year: the deepest managed support, including content, monitoring, campaigns, conversion work, weekly reporting, and priority support.", "Annual public pricing is prepaid for 12 months at the published annual amount, priced at 10 months of service. It is not an automatic recurring charge in this invoice phase.", "GST wording stays ‘GST added if applicable’ until the business confirms its registration status. Do not promise rankings, traffic, leads, or guaranteed outcomes."] ,
  },
  {
    id: "social",
    label: "Social Media Revamp & Growth",
    eyebrow: "MAKE SOCIAL SUPPORT TRUST",
    description: "Keep this offer separate from GrowthStack unless the owner chooses All-Inclusive, where the focused revamp is an included setup add-on.",
    accent: "cyan",
    points: ["Full Social Media Revamp is currently A$349.50 one-time, covering profile positioning, branded templates, launch posts, and a platform audit.", "Social Growth is A$274.50/month or A$2,745/year on the current promotion, with content planning, posts or carousels, captions, publishing support, ad creative, and reporting.", "The annual Social Growth option is prepaid for 12 months, with the published price covering 10 months of service.", "The All-Inclusive setup add-on covers the focused revamp and launch setup. Ongoing Social Growth remains a separate continuing offer.", "Ask which platforms matter, what the owner wants customers to notice, and who approves content before anything is published."] ,
  },
  {
    id: "financial",
    label: "Financial Health Advisory",
    eyebrow: "PLAIN-ENGLISH BUSINESS GUIDANCE",
    description: "This is advisory based on information the business supplies. Keep the boundary clear and refer regulated work to qualified professionals.",
    accent: "amber",
    points: ["All-Inclusive includes a monthly review of supplied MYOB or Xero information, covering revenue, cash flow, debtors, expenses, and practical next steps.", "The service explains business information in plain English so the owner can decide what to review with their accountant or bookkeeper.", "It does not replace accounting, bookkeeping, tax, audit, investment, financial planning, legal, or other regulated advice.", "We do not prepare or lodge tax returns, certify accounts, make accounting entries, or guarantee financial outcomes.", "The business remains responsible for its records and compliance and should consult qualified professionals for statutory or regulated matters."] ,
  },
  {
    id: "signatures",
    label: "Professional custom email signatures",
    eyebrow: "LOOK CONSISTENT IN EVERY REPLY",
    description: "Describe this as a managed design and setup service, with the business approving all details before use.",
    accent: "violet",
    points: ["We design and help set up branded team signatures with approved logo, name, role, phone, email, and business details.", "Signatures can include licence or insurance information, tap-to-call links, social links, review calls to action, and occasional campaign or seasonal banners.", "The business supplies and approves the details used, including any regulated or licence information.", "This is a managed design and setup service, not an automated signature platform, universal email-client deployment, analytics product, or deliverability guarantee.", "Ask who needs a signature, which email client they use, and whether the business has approved the footer details."] ,
  },
  {
    id: "addons",
    label: "Add-ons & custom work",
    eyebrow: "QUOTE THE REAL SCOPE",
    description: "Use custom line items when a client needs work outside a public package or wants a website price tailored to their build.",
    accent: "amber",
    points: ["Quote the custom website or store build as its own line item, because the build price depends on the agreed scope.", "A public GrowthStack package can sit beside the website build on the same invoice, with the selected prepaid term shown clearly.", "Social Revamp, Social Growth, extra content, additional pages, or other agreed work can be added as separate lines after confirming the scope.", "Describe the outcome and the included work in plain language, then confirm anything that depends on client-supplied information or approval.", "Never invent a price, discount, banking detail, legal detail, GST status, guarantee, or delivery promise during a call."] ,
  },
];

export const SALES_PLAYBOOK_SECTIONS: SalesPlaybookSection[] = [
  { id: "discovery", label: "Discovery questions", description: "Keep the call moving toward a useful recommendation.", points: ["What do you want a new customer to understand or do within the first minute on your site?", "Are most enquiries coming from calls, forms, bookings, walk-ins, referrals, or social messages?", "Which services, products, suburbs, or job types are most important to sell more consistently?", "What currently gets in the way when someone finds you online?", "Who supplies the photos, service details, reviews, approvals, and account access needed for the work?", "Would you prefer a foundation you manage yourself, ongoing visibility support, or the fuller managed option?"] },
  { id: "objections", label: "Common objections", description: "Answer clearly, then bring the conversation back to the owner’s situation.", points: ["‘I already have a website.’ Ask whether it explains the priority services clearly and makes the next action easy. Offer a review of what is working before suggesting a rebuild.", "‘I need to think about it.’ Ask which part needs more clarity: the scope, the timing, the package, or the price. Offer to send the written outline rather than pushing.", "‘SEO sounds risky.’ Explain that the work focuses on observable foundations, useful content, local visibility, and reporting. Never promise a ranking or lead result.", "‘I only need social.’ Keep Social Media Revamp & Growth separate, explain what setup and ongoing work cover, and ask which platforms and approval process matter.", "‘Can you do my tax or accounts?’ State the Financial Health Advisory boundary and recommend a qualified accountant or bookkeeper for regulated work.", "‘Can you send an invoice?’ Confirm the agreed scope, client details, due date, and payment instructions before creating the draft. Payment is bank transfer or PayID in this phase."] },
  { id: "close", label: "Close & next steps", description: "Finish with a specific action, without making promises that are not agreed.", points: ["Summarise the agreed build, selected package, prepaid term, and any separate add-ons in the owner’s words.", "Confirm the client or trading name, billing email, phone, address, and the person approving the work.", "Create the branded invoice draft with the custom website price and selected public package, then check every line before printing or sending it manually.", "Explain that the invoice shows bank transfer and PayID instructions when configured, and that this first phase does not use automatic card or recurring billing.", "Agree what the owner will send next, such as photos, service details, social links, brand files, or approval notes.", "End with a clear follow-up time and the next review point. Do not auto-send anything from this workspace."] },
];

export const PACKAGE_COMPARISON = [
  { id: "basic", label: "Basic", price: "A$199/mo · A$1,990/yr", bestFor: "Owners who need the managed foundation and local visibility basics.", included: ["Website, hosting, SSL, domain, CDN", "Local SEO foundation", "Core on-page work", "Monthly health and rank reporting"] },
  { id: "standard", label: "Standard", price: "A$349/mo · A$3,490/yr", bestFor: "Businesses ready for consistent content, local visibility, and conversion work.", included: ["Everything in Basic", "Eight content assets each month", "Competitor and local visibility work", "Monthly strategy call"] },
  { id: "all-inclusive", label: "All-Inclusive", price: "A$699/mo · A$6,990/yr", bestFor: "Owners who want the broadest managed support around the business presence.", included: ["Everything in Standard", "Fifteen content pieces each month", "Campaigns, conversion, and weekly reporting", "Advisory, signatures, and Social Revamp setup"] },
];

export function searchablePlaybookText(item: SalesPlaybookCategory | SalesPlaybookSection) {
  return [item.label, item.eyebrow, item.description, ...item.points].join(" ").toLowerCase();
}
```

## `src/lib/seo.ts`

```ts
import { HUB_LOGO } from "@/lib/hub-data";

export const PRIMARY_DOMAIN = "https://laydbackapps.com";
export const SITE_NAME = "Lay'd Back";

const STORAGE_OBJECT_PATH = "/storage/v1/object/public/";
const STORAGE_RENDER_PATH = "/storage/v1/render/image/public/";

export type PublicSeoContext = { publicOrigin?: string; siteName?: string; logo?: string };

export function normalizePublicOrigin(value?: string): string {
  const text = String(value || "").trim();
  if (!text) return PRIMARY_DOMAIN;
  const candidate = text.startsWith("//") ? `https:${text}` : /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return `${parsed.protocol}//${parsed.host}`;
  } catch {
    // Fall back to the Lay'd Back public origin when an operator value is malformed.
  }
  return PRIMARY_DOMAIN;
}

export function toAbsoluteUrl(value?: string, baseOrigin?: string): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `${normalizePublicOrigin(baseOrigin)}/${value.replace(/^\/+/, "")}`;
}

export function optimizeStorageImage(value?: string, width = 1200, baseOrigin?: string): string | undefined {
  const absolute = toAbsoluteUrl(value, baseOrigin);
  if (!absolute) return undefined;
  if (!absolute.includes(STORAGE_OBJECT_PATH) && !absolute.includes(STORAGE_RENDER_PATH)) return absolute;
  const base = absolute.split("?")[0].replace(STORAGE_OBJECT_PATH, STORAGE_RENDER_PATH);
  return `${base}?width=${width}&resize=contain&quality=75`;
}

export const DEFAULT_OG_IMAGE = optimizeStorageImage(HUB_LOGO, 1200) || HUB_LOGO;

export function canonicalUrl(value = "/", baseOrigin?: string): string {
  let pathname = value;
  try {
    if (/^https?:\/\//i.test(value)) pathname = new URL(value).pathname;
  } catch {
    pathname = "/";
  }
  pathname = pathname.split(/[?#]/)[0] || "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname === "/landing" || pathname === "/landing/") pathname = "/";
  if (pathname !== "/") pathname = pathname.replace(/\/+$/, "");
  return `${normalizePublicOrigin(baseOrigin)}${pathname}`;
}

export const PUBLIC_SEO = {
  home: {
    title: "Websites, Stores & Growth for Australian Trades | Lay'd Back",
    description: "Websites, stores, SEO and GrowthStack support for Australian trades and service businesses, with managed packages from A$299/month. GST added if applicable.",
  },
  blog: {
    title: "Australian Trade Website & SEO Insights | Lay'd Back",
    description: "Practical website, SEO and growth guidance for Australian trade businesses, with advice on content, local visibility, online stores and Lay'd Back packages.",
  },
  financialAdvisory: {
    title: "Financial Health Advisory for Australian Trades | Lay'd Back",
    description: "Monthly MYOB and Xero review for Australian trade businesses, with plain-English guidance on cash flow, debtors, expenses and next steps. Advisory only.",
  },
} as const;

type ResolvedPublicSeoContext = { origin: string; siteName: string; logo?: string };

function resolvePublicSeoContext(input?: PublicSeoContext): ResolvedPublicSeoContext {
  const origin = normalizePublicOrigin(input?.publicOrigin);
  const siteName = input?.siteName?.trim() || SITE_NAME;
  const logoSource = input?.logo?.trim() || (origin === PRIMARY_DOMAIN ? DEFAULT_OG_IMAGE : "");
  return { origin, siteName, logo: logoSource ? optimizeStorageImage(logoSource, 1200, origin) : undefined };
}

function identityEntities(context: ResolvedPublicSeoContext) {
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${context.origin}/#organization`,
    name: context.siteName,
    url: `${context.origin}/`,
  };
  if (context.logo) organization.logo = context.logo;
  return [
    organization,
    {
      "@type": "WebSite",
      "@id": `${context.origin}/#website`,
      name: context.siteName,
      url: `${context.origin}/`,
      publisher: { "@id": `${context.origin}/#organization` },
      inLanguage: "en-AU",
    },
  ];
}

const pricingOffers = [
  ["Startup GrowthStack, monthly", 299, "Managed website, hosting, local SEO and support billed monthly."],
  ["Startup GrowthStack, quarterly", 897, "Startup GrowthStack prepaid for three months at the regular monthly rate."],
  ["Startup GrowthStack, half-yearly", 1794, "Startup GrowthStack prepaid for six months at the regular monthly rate."],
  ["Startup GrowthStack, annual", 3588, "Startup GrowthStack prepaid for twelve months at the regular monthly rate."],
  ["Scale GrowthStack, monthly", 599, "Website foundation with ongoing content, local visibility, reporting and conversion support billed monthly."],
  ["Scale GrowthStack, quarterly", 1797, "Scale GrowthStack prepaid for three months at the regular monthly rate."],
  ["Scale GrowthStack, half-yearly", 3594, "Scale GrowthStack prepaid for six months at the regular monthly rate."],
  ["Scale GrowthStack, annual", 7188, "Scale GrowthStack prepaid for twelve months at the regular monthly rate."],
  ["Enterprise GrowthStack, monthly", 999, "Managed website and growth support with content, monitoring, outreach, reporting and conversion work billed monthly."],
  ["Enterprise GrowthStack, quarterly", 2997, "Enterprise GrowthStack prepaid for three months at the regular monthly rate."],
  ["Enterprise GrowthStack, half-yearly", 5994, "Enterprise GrowthStack prepaid for six months at the regular monthly rate."],
  ["Enterprise GrowthStack, annual", 11988, "Enterprise GrowthStack prepaid for twelve months at the regular monthly rate."],
  ["Full Social Media Revamp, one-time", 699, "Profile rebrand, branded templates, launch posts and a platform audit."],
  ["Social Growth, monthly", 549, "Content planning, posts, captions, publishing support, ad creative and reporting billed monthly."],
  ["Social Growth, quarterly", 1647, "Social Growth prepaid for three months at the regular monthly rate."],
  ["Social Growth, half-yearly", 3294, "Social Growth prepaid for six months at the regular monthly rate."],
  ["Social Growth, annual", 6588, "Social Growth prepaid for twelve months at the regular monthly rate."],
] as const;

export function buildSiteIdentitySchema(input?: PublicSeoContext) {
  const context = resolvePublicSeoContext(input);
  return { "@context": "https://schema.org", "@graph": identityEntities(context) };
}

export function buildHomeSchema(input?: PublicSeoContext) {
  const context = resolvePublicSeoContext(input);
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...identityEntities(context),
      {
        "@type": "Service",
        "@id": `${context.origin}/#web-services`,
        name: "Websites, stores and growth support",
        description: "Bespoke websites, online stores and ongoing visibility support for Australian trade and service businesses.",
        provider: { "@id": `${context.origin}/#organization` },
        areaServed: { "@type": "Country", name: "Australia" },
        serviceType: ["Website design", "Online store development", "SEO and growth support"],
        url: `${context.origin}/#pricing`,
        offers: pricingOffers.map(([name, price, description]) => ({
          "@type": "Offer",
          name,
          description,
          price,
          priceCurrency: "AUD",
          url: `${context.origin}/#pricing`,
        })),
      },
    ],
  };
}

export function buildAdvisorySchema(input?: PublicSeoContext) {
  const context = resolvePublicSeoContext(input);
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...identityEntities(context),
      {
        "@type": "Service",
        "@id": `${context.origin}/financial-advisory#service`,
        name: "Financial Health Advisory",
        description: "Strategic business guidance based on information supplied by the business, covering cash flow, debtors, expenses and practical next steps.",
        provider: { "@id": `${context.origin}/#organization` },
        areaServed: { "@type": "Country", name: "Australia" },
        serviceType: "Financial Health Advisory",
        url: canonicalUrl("/financial-advisory", context.origin),
      },
    ],
  };
}

export function articleMetaDescription(excerpt?: string): string {
  const normalized = String(excerpt || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const fallback = "Practical guidance from Lay'd Back for Australian trade businesses on websites, SEO, online stores and digital growth, with clear next steps for owners.";
  if (!normalized) return fallback;
  const contextual = `${normalized} Read practical guidance from Lay'd Back for Australian trade businesses.`;
  return contextual.length < 150 ? fallback : contextual.length > 160 ? `${contextual.slice(0, 159).trimEnd()}…` : contextual;
}

function validIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function buildBlogPostingSchema(input: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedAt?: string;
  modifiedAt?: string;
  authorName?: string;
  publicOrigin?: string;
  siteName?: string;
  publisherLogo?: string;
}) {
  const context = resolvePublicSeoContext({ publicOrigin: input.publicOrigin, siteName: input.siteName, logo: input.publisherLogo });
  const published = validIsoDate(input.publishedAt);
  const modified = validIsoDate(input.modifiedAt);
  const articleUrl = schemaUrl(input.url, context.origin) || input.url;
  const image = optimizeStorageImage(input.image, 1200, context.origin) || context.logo;
  const publisher: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${context.origin}/#organization`,
    name: context.siteName,
  };
  if (context.logo) publisher.logo = { "@type": "ImageObject", url: context.logo };
  const article: Record<string, unknown> = {
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    headline: input.title,
    description: input.description,
    url: articleUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    publisher,
    inLanguage: "en-AU",
  };
  if (image) article.image = [image];
  if (published) article.datePublished = published;
  if (modified) article.dateModified = modified;
  if (input.authorName?.trim()) article.author = { "@type": "Person", name: input.authorName.trim() };
  return { "@context": "https://schema.org", ...article };
}

export type LocalBusinessAddress = {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
};

export type VerifiedLocalBusinessTrust = {
  legalName?: string;
  identifier?: string;
  priceRange?: string;
  hasMap?: string;
};

export type LocalBusinessSchemaInput = {
  businessName: string;
  url?: string;
  phone?: string;
  email?: string;
  address?: string | LocalBusinessAddress;
  serviceAreas?: string[];
  hours?: string[];
  logo?: string;
  socialLinks?: string[];
  categories?: string[];
  verifiedTrustDetails?: VerifiedLocalBusinessTrust;
  publicOrigin?: string;
};

function schemaUrl(value?: string, baseOrigin?: string): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (/^https?:\/\//i.test(text)) {
    try {
      const parsed = new URL(text);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
    } catch {
      return undefined;
    }
  }
  return text.startsWith("/") ? canonicalUrl(text, baseOrigin) : undefined;
}

function validSchemaUrls(values?: string[]) {
  return (values || []).map((value) => schemaUrl(value)).filter((value): value is string => Boolean(value));
}

/**
 * Builds draft LocalBusiness markup from supplied, reviewed facts only.
 * Structured data describes visible facts, but does not guarantee rankings or citations.
 */
export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput) {
  const name = input.businessName?.trim();
  if (!name) return undefined;
  const url = schemaUrl(input.url, input.publicOrigin);
  const business: Record<string, unknown> = { "@type": "LocalBusiness", name };
  if (url) { business.url = url; business["@id"] = `${url.replace(/\/$/, "")}#local-business`; }
  if (input.phone?.trim()) business.telephone = input.phone.trim();
  if (input.email?.trim()) business.email = input.email.trim();
  if (input.address && typeof input.address === "string" && input.address.trim()) business.address = input.address.trim();
  if (input.address && typeof input.address === "object") {
    const address = Object.fromEntries(Object.entries(input.address).filter(([, value]) => typeof value === "string" && value.trim()));
    if (Object.keys(address).length) business.address = { "@type": "PostalAddress", ...address };
  }
  const areas = (input.serviceAreas || []).filter((area) => typeof area === "string" && area.trim()).map((area) => ({ "@type": "Place", name: area.trim() }));
  if (areas.length) business.areaServed = areas;
  const hours = (input.hours || []).filter((hour) => typeof hour === "string" && hour.trim()).map((hour) => hour.trim());
  if (hours.length) business.openingHours = hours;
  const categories = (input.categories || []).filter((category) => typeof category === "string" && category.trim()).map((category) => category.trim());
  if (categories.length) business.category = categories.length === 1 ? categories[0] : categories;
  const logoUrl = schemaUrl(input.logo);
  if (logoUrl) business.logo = optimizeStorageImage(logoUrl, 600);
  const sameAs = validSchemaUrls(input.socialLinks);
  if (sameAs.length) business.sameAs = sameAs;
  const trust = input.verifiedTrustDetails;
  if (trust?.legalName?.trim()) business.legalName = trust.legalName.trim();
  if (trust?.identifier?.trim()) business.identifier = trust.identifier.trim();
  if (trust?.priceRange?.trim()) business.priceRange = trust.priceRange.trim();
  const mapUrl = schemaUrl(trust?.hasMap);
  if (mapUrl) business.hasMap = mapUrl;
  return { "@context": "https://schema.org", ...business };
}

export type VisibleFaqPair = { question: string; answer: string };

/**
 * Builds FAQPage markup from question and answer pairs already visible on a page.
 * Empty pairs are omitted, and markup does not guarantee rankings or citations.
 */
export function buildFAQPageSchema(input: { questions?: VisibleFaqPair[]; url?: string; publicOrigin?: string }) {
  const questions = (input.questions || [])
    .map((pair) => ({ question: pair.question?.trim(), answer: pair.answer?.trim() }))
    .filter((pair): pair is { question: string; answer: string } => Boolean(pair.question && pair.answer));
  if (!questions.length) return undefined;
  const url = schemaUrl(input.url, input.publicOrigin);
  const faq: Record<string, unknown> = { "@type": "FAQPage", mainEntity: questions.map((pair) => ({ "@type": "Question", name: pair.question, acceptedAnswer: { "@type": "Answer", text: pair.answer } })) };
  if (url) { faq.url = url; faq["@id"] = `${url.replace(/\/$/, "")}#faq`; }
  return { "@context": "https://schema.org", ...faq };
}

export function serializeJsonLd(value: unknown): string | undefined {
  const clean = (input: unknown): unknown => {
    if (input === null || input === undefined || input === "") return undefined;
    if (typeof input === "number" && !Number.isFinite(input)) return undefined;
    if (Array.isArray(input)) {
      const items = input.map(clean).filter((item) => item !== undefined);
      return items.length ? items : undefined;
    }
    if (typeof input === "object") {
      const entries = Object.entries(input as Record<string, unknown>)
        .map(([key, item]) => [key, clean(item)] as const)
        .filter(([, item]) => item !== undefined);
      return entries.length ? Object.fromEntries(entries) : undefined;
    }
    return input;
  };
  const cleaned = clean(value);
  if (cleaned === undefined) return undefined;
  const escapedCharacters: Record<string, string> = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" };
  return JSON.stringify(cleaned).replace(/[<>&]/g, (character) => escapedCharacters[character] || character);
}
```

## `src/lib/checkout-session.ts`

```ts
export type CatalogKind = "one_time" | "subscription";
export type SubscriptionCadence = "monthly" | "quarterly" | "half_yearly" | "yearly";
export type CatalogCadence = "one-time" | SubscriptionCadence;
export type CatalogItem = { id: string; name: string; kind: CatalogKind; cadence: CatalogCadence; amountCents: number };
export type CartLine = { id: string; quantity: number };

export const CART_KEY = "layd-back-public-cart-v1";
export const CATALOG: Record<string, CatalogItem> = {
  growthstack_basic_monthly: { id: "growthstack_basic_monthly", name: "Startup GrowthStack", kind: "subscription", cadence: "monthly", amountCents: 29900 },
  growthstack_basic_quarterly: { id: "growthstack_basic_quarterly", name: "Startup GrowthStack", kind: "subscription", cadence: "quarterly", amountCents: 89700 },
  growthstack_basic_half_yearly: { id: "growthstack_basic_half_yearly", name: "Startup GrowthStack", kind: "subscription", cadence: "half_yearly", amountCents: 179400 },
  growthstack_basic_yearly: { id: "growthstack_basic_yearly", name: "Startup GrowthStack", kind: "subscription", cadence: "yearly", amountCents: 358800 },
  growthstack_standard_monthly: { id: "growthstack_standard_monthly", name: "Scale GrowthStack", kind: "subscription", cadence: "monthly", amountCents: 59900 },
  growthstack_standard_quarterly: { id: "growthstack_standard_quarterly", name: "Scale GrowthStack", kind: "subscription", cadence: "quarterly", amountCents: 179700 },
  growthstack_standard_half_yearly: { id: "growthstack_standard_half_yearly", name: "Scale GrowthStack", kind: "subscription", cadence: "half_yearly", amountCents: 359400 },
  growthstack_standard_yearly: { id: "growthstack_standard_yearly", name: "Scale GrowthStack", kind: "subscription", cadence: "yearly", amountCents: 718800 },
  growthstack_all_inclusive_monthly: { id: "growthstack_all_inclusive_monthly", name: "Enterprise GrowthStack", kind: "subscription", cadence: "monthly", amountCents: 99900 },
  growthstack_all_inclusive_quarterly: { id: "growthstack_all_inclusive_quarterly", name: "Enterprise GrowthStack", kind: "subscription", cadence: "quarterly", amountCents: 299700 },
  growthstack_all_inclusive_half_yearly: { id: "growthstack_all_inclusive_half_yearly", name: "Enterprise GrowthStack", kind: "subscription", cadence: "half_yearly", amountCents: 599400 },
  growthstack_all_inclusive_yearly: { id: "growthstack_all_inclusive_yearly", name: "Enterprise GrowthStack", kind: "subscription", cadence: "yearly", amountCents: 1198800 },
  full_social_media_revamp: { id: "full_social_media_revamp", name: "Full Social Media Revamp", kind: "one_time", cadence: "one-time", amountCents: 69900 },
  social_growth_monthly: { id: "social_growth_monthly", name: "Social Growth", kind: "subscription", cadence: "monthly", amountCents: 54900 },
  social_growth_quarterly: { id: "social_growth_quarterly", name: "Social Growth", kind: "subscription", cadence: "quarterly", amountCents: 164700 },
  social_growth_half_yearly: { id: "social_growth_half_yearly", name: "Social Growth", kind: "subscription", cadence: "half_yearly", amountCents: 329400 },
  social_growth_yearly: { id: "social_growth_yearly", name: "Social Growth", kind: "subscription", cadence: "yearly", amountCents: 658800 },
};

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const lines = new Map<string, CartLine>();
    parsed.forEach((raw) => {
      if (!raw || typeof raw.id !== "string" || !CATALOG[raw.id]) return;
      const item = CATALOG[raw.id];
      const quantity = item.kind === "subscription" ? 1 : Math.min(10, Math.max(1, Math.floor(Number(raw.quantity) || 1)));
      lines.set(raw.id, { id: raw.id, quantity });
    });
    return [...lines.values()];
  } catch {
    return [];
  }
}

export const SUBSCRIPTION_SUCCESS_SESSION_KEY = "layd-back-subscription-success-v1";
const CHECKOUT_CUSTOMER_SESSION_KEY = "layd-back-checkout-customer-v1";

export type SubscriptionSuccessReceipt = {
  version: 1;
  savedAt: number;
  status: "active";
  checkoutReference: string;
  customer: { name: string; email: string };
  packageName: string;
  cadence: SubscriptionCadence;
  amountCents: number;
  currency: "AUD";
};

function safeReceiptText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function centsFromReceiptAmount(value: unknown) {
  const text = safeReceiptText(value, 30);
  if (!/^\d+\.\d{2}$/.test(text)) return null;
  const [whole, fraction] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function isSubscriptionCadence(value: unknown): value is SubscriptionCadence {
  return value === "monthly" || value === "quarterly" || value === "half_yearly" || value === "yearly";
}

export function buildSubscriptionReceipt(result: any, customer: { name: string; email: string }): SubscriptionSuccessReceipt | null {
  const item = Array.isArray(result?.items) && result.items.length === 1 ? result.items[0] : null;
  const checkoutReference = safeReceiptText(result?.checkoutReference, 100);
  const packageName = safeReceiptText(item?.name, 127);
  const itemAmountCents = centsFromReceiptAmount(item?.unitAmount);
  const totalAmountCents = centsFromReceiptAmount(result?.amount);
  const cadence = isSubscriptionCadence(item?.cadence) ? item.cadence : null;
  const customerName = safeReceiptText(customer.name, 120);
  const customerEmail = safeReceiptText(customer.email, 254).toLowerCase();
  if (result?.success !== true || result.status !== "active" || result.kind !== "subscription" || !item || item.kind !== "subscription" || item.quantity !== 1 || packageName.length < 2 || !cadence || itemAmountCents === null || itemAmountCents !== totalAmountCents || safeReceiptText(item.currency, 10).toUpperCase() !== "AUD" || safeReceiptText(result.currency, 10).toUpperCase() !== "AUD" || !/^lb_[a-f0-9]{32}$/.test(checkoutReference) || customerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(customerEmail)) return null;
  return { version: 1, savedAt: Date.now(), status: "active", checkoutReference, customer: { name: customerName, email: customerEmail }, packageName, cadence, amountCents: itemAmountCents, currency: "AUD" };
}

export function persistCheckoutCustomer(customer: { name: string; email: string }) {
  if (typeof window === "undefined") return false;
  try { window.sessionStorage.setItem(CHECKOUT_CUSTOMER_SESSION_KEY, JSON.stringify(customer)); return true; } catch { return false; }
}

export function readCheckoutCustomer() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_CUSTOMER_SESSION_KEY);
    if (!raw || raw.length > 600) return null;
    const value = JSON.parse(raw) as { name?: unknown; email?: unknown };
    const name = safeReceiptText(value?.name, 120);
    const email = safeReceiptText(value?.email, 254).toLowerCase();
    return name.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) ? { name, email } : null;
  } catch { return null; }
}

export function clearCheckoutCustomer() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(CHECKOUT_CUSTOMER_SESSION_KEY); } catch { /* storage is optional */ }
}

export function writeCartNow(lines: CartLine[]) {
  if (typeof window === "undefined") return false;
  try { window.localStorage.setItem(CART_KEY, JSON.stringify(lines)); return true; } catch { return false; }
}

export function persistSubscriptionReceipt(receipt: SubscriptionSuccessReceipt) {
  if (typeof window === "undefined") return false;
  try { window.sessionStorage.setItem(SUBSCRIPTION_SUCCESS_SESSION_KEY, JSON.stringify(receipt)); return true; } catch { return false; }
}

export function clearSubscriptionReceipt() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(SUBSCRIPTION_SUCCESS_SESSION_KEY); } catch { /* storage is optional */ }
}

export function completedSubscriptionId(receipt: SubscriptionSuccessReceipt) {
  return Object.values(CATALOG).find((item) => item.kind === "subscription" && item.name === receipt.packageName && item.cadence === receipt.cadence && item.amountCents === receipt.amountCents)?.id || "";
}
```

