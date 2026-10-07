# Central Hub source bundle, part 02A

This part contains the complete current source for client management and hosting operations.

## Manifest

- `src/components/hub/ClientWorkspace.tsx`, the client directory workspace and onboarding entry point
- `src/components/hub/ClientCard.tsx`, client and business record cards with linked actions
- `src/components/hub/ClientControls.tsx`, client status filters and layout controls
- `src/components/hub/ClientOnboardingWizard.tsx`, the private multi-step client setup flow
- `src/components/hub/ClientSiteManualForm.tsx`, the manual client and business record form
- `src/components/hub/BusinessTypeBadge.tsx`, the detected business type badge
- `src/components/hub/SocialLinksBar.tsx`, normalized public-link rendering
- `src/components/hub/HostingWorkspace.tsx`, hosting records, filters, summaries, and operations
- `src/components/hub/HostingRecordForm.tsx`, the hosting record create and edit form

The exact current source is preserved below. Every listed file is complete, in the same order as the manifest, with no omitted sections or placeholders.

## src/components/hub/ClientWorkspace.tsx

```tsx
import { useState } from "react";
import { SearchX, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientCard } from "@/components/hub/ClientCard";
import { ClientOnboardingWizard } from "@/components/hub/ClientOnboardingWizard";
import { ClientControls, type StatusFilter, type ViewMode } from "@/components/hub/ClientControls";
import { Button } from "@/components/ui/button";
import type { ClientSite } from "@/lib/hub-data";
import type { ClientOnboardingResult, OnboardingDestination } from "@/lib/client-onboarding";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ClientWorkspaceProps = {
  sites: ClientSite[];
  filteredSites: ClientSite[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  search: string;
  onClearFilters: () => void;
  onOpenLeadDetails?: (leadId: string) => void;
  onOpenEmailSignature?: (siteId: string) => void;
  onOpenFinancialAudit?: (siteId: string) => void;
  onNavigate?: (destination: OnboardingDestination, siteId: string, businessName: string) => void;
  onRefresh?: () => void;
};

export function ClientWorkspace({ sites, filteredSites, statusFilter, onStatusFilterChange, viewMode, onViewModeChange, search, onClearFilters, onOpenLeadDetails, onOpenEmailSignature, onOpenFinancialAudit, onNavigate, onRefresh }: ClientWorkspaceProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleCompleted = (result: ClientOnboardingResult) => {
    if (result.failed.length) toast.warning("Client saved. Some workspaces need follow-up");
    else toast.success("Client setup prepared");
  };

  const handleNavigate = (destination: OnboardingDestination, siteId: string, businessName: string) => {
    setWizardOpen(false);
    onNavigate?.(destination, siteId, businessName);
  };

  return (
    <section aria-label="Client and business directory" className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ClientControls statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange} viewMode={viewMode} onViewModeChange={onViewModeChange} resultCount={filteredSites.length} totalCount={sites.length} />
        <Button type="button" onClick={() => setWizardOpen(true)} className="h-10 shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" aria-hidden="true" />Onboard client</Button>
      </div>

      <AnimatePresence mode="wait">
        {filteredSites.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary"><SearchX className="h-6 w-6 text-muted-foreground" aria-hidden /></div>
            <h3 className="font-display text-lg font-semibold text-ivory">No matching clients or businesses</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{search ? `Nothing matched “${search}” with the current status filter.` : "No client or business records match this status filter."} Clear filters to see the full directory.</p>
            <button type="button" onClick={onClearFilters} className="mt-5 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-ivory transition-colors hover:border-primary/30 hover:text-primary">Clear search and filters</button>
          </motion.div>
        ) : (
          <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn(viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3")}>
            {filteredSites.map((site, index) => <ClientCard key={site.id} site={site} viewMode={viewMode} index={index} onOpenLeadDetails={onOpenLeadDetails} onOpenEmailSignature={onOpenEmailSignature} onOpenFinancialAudit={onOpenFinancialAudit} />)}
          </motion.div>
        )}
      </AnimatePresence>

      <ClientOnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} onRefresh={onRefresh} onCompleted={handleCompleted} onNavigate={handleNavigate} />
    </section>
  );
}

```

## src/components/hub/ClientCard.tsx

```tsx
import type { CSSProperties, KeyboardEvent, SyntheticEvent } from "react";
import { ArrowUpRight, ClipboardCheck, ExternalLink, Mail, MapPin, Store } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { clientKindLabel, packageLabel, type ClientSite, statusLabel, websiteSourceLabel } from "@/lib/hub-data";
import { cn } from "@/lib/utils";

type ClientCardProps = { site: ClientSite; viewMode: "grid" | "list"; index: number; onOpenLeadDetails?: (leadId: string) => void; onOpenEmailSignature?: (siteId: string) => void; onOpenFinancialAudit?: (siteId: string) => void };

function statusStyles(status: ClientSite["status"]) {
  if (status === "live") return "bg-primary/12 text-primary ring-primary/20";
  if (status === "draft") return "bg-secondary text-muted-foreground ring-border";
  return "bg-warning/12 text-warning ring-warning/25";
}

function tierStyles(tier: ClientSite["tier"]) {
  if (tier === "Scale") return "text-cyan-accent";
  if (tier === "Growth") return "text-primary";
  if (tier === "Starter") return "text-ivory/80";
  return "text-muted-foreground";
}

function validExternalUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !url.hostname.includes(" ");
  } catch { return false; }
}

function isNestedClientCardInteraction(event: SyntheticEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const nestedControl = target.closest("a,button,input,textarea,select,label,[role=\"button\"],[role=\"combobox\"],[contenteditable=\"true\"],[data-lead-interaction=\"true\"]");
  return Boolean(nestedControl && nestedControl !== event.currentTarget);
}

export function ClientCard({ site, viewMode, index, onOpenLeadDetails, onOpenEmailSignature, onOpenFinancialAudit }: ClientCardProps) {
  const isList = viewMode === "list";
  const leadId = site.sourceLeadId?.trim();
  const canOpenLeadDetails = Boolean(leadId && onOpenLeadDetails);
  const isBuildyBuilt = (site.websiteSource || "buildy_built") === "buildy_built";
  const isExternalWebsite = site.websiteSource === "existing_website" && validExternalUrl(site.website);
  const packageIds = site.activePackages || [];
  const canOpenEmailSignature = Boolean(site.id && onOpenEmailSignature);
  const canOpenFinancialAudit = Boolean(site.id && onOpenFinancialAudit);
  const openLeadDetails = () => { if (leadId && onOpenLeadDetails) onOpenLeadDetails(leadId); };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canOpenLeadDetails || isNestedClientCardInteraction(event) || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openLeadDetails();
  };

  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.28), ease: [0.22, 1, 0.36, 1] }} onClick={canOpenLeadDetails ? (event) => { if (!isNestedClientCardInteraction(event)) openLeadDetails(); } : undefined} onKeyDown={canOpenLeadDetails ? handleCardKeyDown : undefined} role={canOpenLeadDetails ? "button" : undefined} tabIndex={canOpenLeadDetails ? 0 : undefined} aria-label={canOpenLeadDetails ? `Open lead details for ${site.businessName}` : undefined} className={cn("group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300", "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg", canOpenLeadDetails && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", isList ? "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5" : "flex h-full flex-col p-5")}>
      <div className={cn("min-w-0", isList ? "flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5" : "")}>
        <div className={cn(isList ? "min-w-0 sm:w-[250px]" : "")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset", statusStyles(site.status))}>{statusLabel(site.status)}</span><span className={cn("text-[11px] font-medium uppercase tracking-wide", tierStyles(site.tier))}>{site.tier === "None" ? "No GrowthStack" : site.tier}</span></div>
              <h3 className="mt-2 truncate font-display text-lg font-semibold tracking-tight text-ivory">{site.businessName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{site.trade}</p>
            </div>
            {isBuildyBuilt && !isList && site.status !== "draft" && <div className="health-ring flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ "--health": site.health } as CSSProperties} role="img" aria-label={`Site health ${site.health} out of 100`}><span className="font-mono text-xs font-semibold text-primary">{site.health}</span></div>}
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" aria-hidden />{site.location}<span className="text-border">·</span>Updated {site.lastActivity}</p>
          <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full border border-border bg-secondary/70 px-2 py-1 text-[10px] text-ivory">{clientKindLabel(site.clientKind)}</span><span className="rounded-full border border-border bg-secondary/70 px-2 py-1 text-[10px] text-muted-foreground">{websiteSourceLabel(site.websiteSource)}</span>{packageIds.slice(0, 3).map((packageId) => <span key={packageId} className="rounded-full border border-primary/20 bg-primary/[0.06] px-2 py-1 text-[10px] text-primary">{packageLabel(packageId)}</span>)}{packageIds.length > 3 && <span className="rounded-full border border-border bg-secondary/70 px-2 py-1 text-[10px] text-muted-foreground">+{packageIds.length - 3} more</span>}</div>
        </div>

        {isBuildyBuilt ? <dl className={cn(isList ? "grid grid-cols-3 gap-3 sm:flex-1" : "mt-5 grid grid-cols-3 gap-3 border-t border-border/80 pt-4")}><div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">MRR</dt><dd className="mt-1 font-mono text-sm font-medium text-ivory">{site.mrr > 0 ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(site.mrr) : "—"}</dd></div><div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Health</dt><dd className={cn("mt-1 font-mono text-sm font-medium", site.health >= 90 ? "text-primary" : site.health >= 70 ? "text-warning" : site.health > 0 ? "text-destructive" : "text-muted-foreground")}>{site.status === "draft" && site.health === 0 ? "Pending" : `${site.health}`}</dd></div><div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Uptime</dt><dd className="mt-1 font-mono text-sm font-medium text-ivory">{site.uptime > 0 ? `${site.uptime.toFixed(2)}%` : "—"}</dd></div></dl> : <dl className={cn(isList ? "grid grid-cols-3 gap-3 sm:flex-1" : "mt-5 grid grid-cols-3 gap-3 border-t border-border/80 pt-4")}><div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Packages</dt><dd className="mt-1 font-mono text-sm font-medium text-ivory">{packageIds.length || "None"}</dd></div><div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Hosting</dt><dd className="mt-1 text-sm font-medium text-ivory">{site.hostingRequired === false ? "Optional" : "Required"}</dd></div><div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Website</dt><dd className="mt-1 text-sm font-medium text-ivory">{websiteSourceLabel(site.websiteSource)}</dd></div></dl>}
      </div>

      <div className={cn(isList ? "flex flex-col gap-2 sm:shrink-0 sm:flex-row" : "mt-5 flex flex-col gap-2")}>
        {canOpenLeadDetails && <Button type="button" onClick={(event) => { event.stopPropagation(); openLeadDetails(); }} aria-label={`Open lead details for ${site.businessName}`} className={cn("h-10 w-full gap-1.5 bg-secondary text-ivory hover:bg-secondary/80 hover:text-primary", isList && "sm:w-auto")}>Open lead details<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Button>}
        {isBuildyBuilt && site.status === "live" && site.id && <Button type="button" variant="outline" className={cn("h-10 w-full gap-1.5 rounded-xl border-border bg-card/60 text-ivory hover:border-primary/20 hover:bg-primary/10 hover:text-primary", isList && "sm:w-auto")} onClick={(event) => { event.stopPropagation(); window.open(`/store/${site.id}`, "_blank", "noopener,noreferrer"); }} aria-label={`View Buildy site for ${site.businessName}`}><Store className="h-4 w-4" />View Buildy site<ExternalLink className="h-3.5 w-3.5 opacity-70" /></Button>}
        {isExternalWebsite && <Button type="button" variant="outline" className={cn("h-10 w-full gap-1.5 rounded-xl border-border bg-card/60 text-ivory hover:border-cyan-accent/20 hover:bg-cyan-accent/10 hover:text-cyan-accent", isList && "sm:w-auto")} onClick={(event) => { event.stopPropagation(); window.open(site.website, "_blank", "noopener,noreferrer"); }} aria-label={`Open existing website for ${site.businessName}`}><ExternalLink className="h-4 w-4" />Open website</Button>}
        {canOpenEmailSignature && <Button type="button" variant="outline" onClick={(event) => { event.stopPropagation(); onOpenEmailSignature?.(site.id); }} aria-label={`Open email signature workspace for ${site.businessName}`} className={cn("h-10 w-full gap-1.5 rounded-xl border-cyan-accent/20 bg-card/60 text-ivory hover:border-cyan-accent/35 hover:bg-cyan-accent/10 hover:text-cyan-accent", isList && "sm:w-auto")}><Mail className="h-4 w-4" aria-hidden="true" />Email signature</Button>}
        {canOpenFinancialAudit && <Button type="button" variant="outline" onClick={(event) => { event.stopPropagation(); onOpenFinancialAudit?.(site.id); }} aria-label={`Open financial audit workspace for ${site.businessName}`} className={cn("h-10 w-full gap-1.5 rounded-xl border-warning/20 bg-card/60 text-ivory hover:border-warning/35 hover:bg-warning/10 hover:text-warning", isList && "sm:w-auto")}><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Financial audit</Button>}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
    </motion.article>
  );
}

```

## src/components/hub/ClientControls.tsx

```tsx
import { LayoutGrid, ListFilter, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SiteStatus } from "@/lib/hub-data";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | SiteStatus;
export type ViewMode = "grid" | "list";

type ClientControlsProps = {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resultCount: number;
  totalCount: number;
};

export function ClientControls({
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
}: ClientControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-ivory">
          Clients / Sites
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Showing {resultCount} of {totalCount} client or business records
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
          >
            <SelectTrigger
              className="h-10 w-[170px] border-border bg-card text-sm text-foreground"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="attention">Needs attention</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          className="inline-flex rounded-xl border border-border bg-card p-1"
          role="group"
          aria-label="View layout"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("grid")}
            aria-pressed={viewMode === "grid"}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              viewMode === "grid"
                ? "bg-secondary text-ivory hover:bg-secondary"
                : "text-muted-foreground hover:text-ivory"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Grid
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("list")}
            aria-pressed={viewMode === "list"}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              viewMode === "list"
                ? "bg-secondary text-ivory hover:bg-secondary"
                : "text-muted-foreground hover:text-ivory"
            )}
          >
            <Rows3 className="h-3.5 w-3.5" aria-hidden />
            List
          </Button>
        </div>
      </div>
    </div>
  );
}

```

## src/components/hub/ClientOnboardingWizard.tsx

```tsx
import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Loader2, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_TYPE_OPTIONS, CLIENT_KIND_OPTIONS, PACKAGE_OPTIONS, WEBSITE_SOURCE_OPTIONS, packageLabel, type ActivePackageId, type BusinessType, type ClientKind, type WebsiteSource } from "@/lib/hub-data";
import { SOCIAL_REVAMP_PLATFORM_OPTIONS, socialRevampPlatformLabel } from "@/lib/hub-operations";
import { createClientOnboarding, emptyOnboardingDraft, validateOnboardingDraft, type ClientOnboardingResult, type OnboardingDestination, type OnboardingDraft, type OnboardingStep } from "@/lib/client-onboarding";

const inputClass = "h-10 border-border bg-background/70 text-foreground placeholder:text-muted-foreground";
const selectClass = "h-10 border-border bg-background/70 text-foreground";
const stepLabels = ["Business basics", "SEO & local facts", "Services", "Review & create"];

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onRefresh?: () => void; onCompleted?: (result: ClientOnboardingResult) => void; onNavigate?: (destination: OnboardingDestination, siteId: string, businessName: string) => void };
function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) { return <div className="space-y-2"><Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>{children}{hint && <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p>}</div>; }
function pretty(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function selectedWorkspace(result: ClientOnboardingResult, key: string) { return [...result.created, ...result.skipped, ...result.ready].some((item) => item.key === key && Boolean(item.id)); }

export function ClientOnboardingWizard({ open, onOpenChange, onRefresh, onCompleted, onNavigate }: Props) {
  const [draft, setDraft] = useState<OnboardingDraft>(() => emptyOnboardingDraft());
  const [step, setStep] = useState<OnboardingStep>(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<ClientOnboardingResult | null>(null);
  const setField = <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const togglePackage = (id: ActivePackageId, checked: boolean) => setDraft((current) => ({ ...current, activePackages: checked ? Array.from(new Set([...current.activePackages, id])) : current.activePackages.filter((item) => item !== id) }));
  const togglePlatform = (id: OnboardingDraft["socialPlatforms"][number], checked: boolean) => setDraft((current) => ({ ...current, socialPlatforms: checked ? Array.from(new Set([...current.socialPlatforms, id])) : current.socialPlatforms.filter((item) => item !== id) }));
  const updateWebsiteSource = (value: WebsiteSource) => setDraft((current) => ({ ...current, websiteSource: value, prepareHosting: value === "no_website" ? false : current.prepareHosting || value === "existing_website" }));
  const hasSocial = draft.activePackages.includes("social_revamp") || draft.activePackages.includes("social_growth");
  const hasWebsiteOption = draft.websiteSource !== "no_website";
  const reviewWorkspaces = useMemo(() => { const items = ["GrowthStack"]; if (hasSocial) items.push("Social Revamp"); if (draft.prepareEmailSignature) items.push("Email Signature"); if (draft.prepareFinancialAudit) items.push("Financial Audit"); if (draft.prepareHosting) items.push("Hosting"); if (draft.activePackages.includes("content")) items.push("Content Calendar planning"); items.push("Reports workstream"); return draft.activePackages.length ? items : items.filter((item) => !["GrowthStack", "Reports workstream"].includes(item)); }, [draft.activePackages, draft.prepareEmailSignature, draft.prepareFinancialAudit, draft.prepareHosting, hasSocial]);
  const nextStep = () => {
    const errors = validateOnboardingDraft(draft, step);
    if (errors.length) { setFormError(errors[0]); return; }
    if (step === 2) {
      const suppliedPlatforms = SOCIAL_REVAMP_PLATFORM_OPTIONS.filter((platform) => {
        const field = `${platform}Url` as keyof OnboardingDraft;
        const value = draft[field];
        return typeof value === "string" && Boolean(value.trim());
      });
      if (suppliedPlatforms.length) setDraft((current) => ({ ...current, socialPlatforms: suppliedPlatforms }));
    }
    setFormError("");
    setStep((current) => Math.min(4, current + 1) as OnboardingStep);
  };
  const previousStep = () => { setFormError(""); setStep((current) => Math.max(1, current - 1) as OnboardingStep); };
  const create = async () => { if (saving) return; const errors = validateOnboardingDraft(draft); if (errors.length) { setFormError(errors[0]); return; } setSaving(true); setFormError(""); try { const created = await createClientOnboarding(draft); setResult(created); onCompleted?.(created); onRefresh?.(); } catch (error) { setFormError(error instanceof Error ? error.message : "The client setup could not be completed. Your details are still here to retry."); } finally { setSaving(false); } };
  const close = (nextOpen: boolean) => { if (saving) return; if (!nextOpen && result) { setDraft(emptyOnboardingDraft()); setStep(1); setResult(null); setFormError(""); } onOpenChange(nextOpen); };
  const goTo = (destination: OnboardingDestination) => { if (!result) return; close(false); onNavigate?.(destination, result.clientSite.id, result.clientSite.businessName); };

  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[94vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-4xl"><DialogHeader><div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" aria-hidden="true" /><span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Client setup</span></div><DialogTitle className="font-display text-2xl text-ivory">{result ? "Client setup complete" : "Onboard a new client"}</DialogTitle><DialogDescription className="max-w-2xl text-muted-foreground">{result ? "Review what was prepared, then open the next workspace without losing the private setup record." : "Capture the business once, prepare the selected workspaces, and keep every public fact tied to the right business."}</DialogDescription></DialogHeader>
    {result ? <Completion result={result} onNavigate={goTo} /> : <><div className="grid grid-cols-4 gap-2 border-b border-border pb-5" aria-label="Onboarding progress">{stepLabels.map((label, index) => { const number = index + 1; const active = number === step; const complete = number < step; return <div key={label} className="min-w-0"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${complete ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : number}</span><span className={`hidden truncate text-[11px] font-medium sm:block ${active ? "text-ivory" : "text-muted-foreground"}`}>{label}</span></div><div className={`mt-2 h-1 rounded-full ${complete || active ? "bg-primary" : "bg-secondary"}`} /></div>; })}</div><div className="py-5">{step === 1 && <Basics draft={draft} setField={setField} updateWebsiteSource={updateWebsiteSource} />}{step === 2 && <Facts draft={draft} setField={setField} />}{step === 3 && <Services draft={draft} setField={setField} hasSocial={hasSocial} hasWebsiteOption={hasWebsiteOption} togglePackage={togglePackage} togglePlatform={togglePlatform} />}{step === 4 && <Review draft={draft} workspaces={reviewWorkspaces} />}</div>{formError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</p>}<DialogFooter className="flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between"><Button type="button" variant="ghost" onClick={() => close(false)} disabled={saving} className="text-muted-foreground hover:bg-secondary hover:text-ivory">Cancel</Button><div className="flex gap-2"><Button type="button" variant="outline" onClick={previousStep} disabled={step === 1 || saving} className="gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><ArrowLeft className="h-4 w-4" />Back</Button>{step < 4 ? <Button type="button" onClick={nextStep} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">Next<ArrowRight className="h-4 w-4" /></Button> : <Button type="button" onClick={() => void create()} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? "Preparing workspaces..." : "Create private setup"}</Button>}</div></DialogFooter></>}</DialogContent></Dialog>;
}

function Basics({ draft, setField, updateWebsiteSource }: { draft: OnboardingDraft; setField: <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void; updateWebsiteSource: (value: WebsiteSource) => void }) {
  return <div className="space-y-5"><div><h3 className="font-display text-lg font-semibold text-ivory">Start with the business</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Only the business name is required. Add what you know now, then complete missing facts from the specialist workspaces.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Business name" htmlFor="onboard-business-name" hint="Required."><Input id="onboard-business-name" autoFocus value={draft.businessName} onChange={(event) => setField("businessName", event.target.value)} placeholder="Northside Plumbing" className={inputClass} /></Field><Field label="Business type" htmlFor="onboard-business-type"><Select value={draft.businessType} onValueChange={(value) => setField("businessType", value as BusinessType)}><SelectTrigger id="onboard-business-type" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{BUSINESS_TYPE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></Field><Field label="Industry or trade" htmlFor="onboard-trade" hint="Optional. Use a more specific label when it helps. "><Input id="onboard-trade" value={draft.trade} onChange={(event) => setField("trade", event.target.value)} placeholder="Residential plumbing" className={inputClass} /></Field><Field label="Primary location or market" htmlFor="onboard-location"><Input id="onboard-location" value={draft.location} onChange={(event) => setField("location", event.target.value)} placeholder="Newcastle, NSW" className={inputClass} /></Field><Field label="Phone" htmlFor="onboard-phone"><Input id="onboard-phone" type="tel" value={draft.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(02) 4000 0000" className={inputClass} /></Field><Field label="Email" htmlFor="onboard-email"><Input id="onboard-email" type="email" value={draft.email} onChange={(event) => setField("email", event.target.value)} placeholder="hello@business.com" className={inputClass} /></Field><Field label="Record kind" htmlFor="onboard-kind" hint="Choose your own business for internal work you operate yourself."><Select value={draft.clientKind} onValueChange={(value) => setField("clientKind", value as ClientKind)}><SelectTrigger id="onboard-kind" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{CLIENT_KIND_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></Field><Field label="Website source" htmlFor="onboard-website-source"><Select value={draft.websiteSource} onValueChange={(value) => updateWebsiteSource(value as WebsiteSource)}><SelectTrigger id="onboard-website-source" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{WEBSITE_SOURCE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></Field></div>{draft.websiteSource === "existing_website" && <Field label="Existing website URL" htmlFor="onboard-website" hint="Use a public HTTP or HTTPS link. No logins or private preview links."><Input id="onboard-website" type="url" value={draft.website} onChange={(event) => setField("website", event.target.value)} placeholder="https://business.com" className={inputClass} /></Field>}<Field label="Business description" htmlFor="onboard-description" hint="Use supplied facts only. This can be refined later."><Textarea id="onboard-description" value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="What the business does, who it serves, and the work you are preparing." className="min-h-[90px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field></div>;
}

function Facts({ draft, setField }: { draft: OnboardingDraft; setField: <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void }) {
  return <div className="space-y-5"><div><h3 className="font-display text-lg font-semibold text-ivory">Capture the facts behind the visibility work</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">These fields seed the SEO foundation, local visibility checks, social brief, signature, and future AEO planning. Blank facts stay blank.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Services or products" htmlFor="onboard-services" hint="One per line."><Textarea id="onboard-services" value={draft.services} onChange={(event) => setField("services", event.target.value)} placeholder={"Emergency plumbing\nHot water repairs\nBathroom renovations"} className="min-h-[105px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Service areas" htmlFor="onboard-service-areas" hint="One suburb, town, region, or postcode per line."><Textarea id="onboard-service-areas" value={draft.serviceAreas} onChange={(event) => setField("serviceAreas", event.target.value)} placeholder={"Newcastle\nLake Macquarie\nHunter Valley"} className="min-h-[105px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Legal business name" htmlFor="onboard-legal-name"><Input id="onboard-legal-name" value={draft.legalBusinessName} onChange={(event) => setField("legalBusinessName", event.target.value)} placeholder="Optional registered name" className={inputClass} /></Field><Field label="ABN" htmlFor="onboard-abn"><Input id="onboard-abn" value={draft.abn} onChange={(event) => setField("abn", event.target.value)} placeholder="Optional" className={inputClass} /></Field><Field label="Google Business URL" htmlFor="onboard-google-business"><Input id="onboard-google-business" type="url" value={draft.googleBusinessUrl} onChange={(event) => setField("googleBusinessUrl", event.target.value)} placeholder="https://maps.google.com/..." className={inputClass} /></Field><Field label="Review link" htmlFor="onboard-review-link"><Input id="onboard-review-link" type="url" value={draft.reviewLink} onChange={(event) => setField("reviewLink", event.target.value)} placeholder="https://g.page/.../review" className={inputClass} /></Field><Field label="Business hours" htmlFor="onboard-hours"><Textarea id="onboard-hours" value={draft.businessHoursNotes} onChange={(event) => setField("businessHoursNotes", event.target.value)} placeholder="Regular opening hours, if supplied" className="min-h-[82px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Holiday and seasonal hours" htmlFor="onboard-holiday-hours"><Textarea id="onboard-holiday-hours" value={draft.holidayHoursNotes} onChange={(event) => setField("holidayHoursNotes", event.target.value)} placeholder="Holiday closures or seasonal changes, if supplied" className="min-h-[82px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Licence or insurance notes" htmlFor="onboard-licence"><Textarea id="onboard-licence" value={draft.licenceInsuranceNotes} onChange={(event) => setField("licenceInsuranceNotes", event.target.value)} placeholder="Only supplied evidence or a note that it is still outstanding" className="min-h-[82px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="NAP and trust notes" htmlFor="onboard-nap"><Textarea id="onboard-nap" value={draft.napTrustVerificationNotes} onChange={(event) => setField("napTrustVerificationNotes", event.target.value)} placeholder="What has been checked, and what still needs confirmation" className="min-h-[82px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field></div><div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Public social profiles</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Add public links only. Accounts will not be connected.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Facebook" htmlFor="onboard-facebook"><Input id="onboard-facebook" type="url" value={draft.facebookUrl} onChange={(event) => setField("facebookUrl", event.target.value)} placeholder="https://facebook.com/..." className={inputClass} /></Field><Field label="Instagram" htmlFor="onboard-instagram"><Input id="onboard-instagram" type="url" value={draft.instagramUrl} onChange={(event) => setField("instagramUrl", event.target.value)} placeholder="https://instagram.com/..." className={inputClass} /></Field><Field label="LinkedIn" htmlFor="onboard-linkedin"><Input id="onboard-linkedin" type="url" value={draft.linkedinUrl} onChange={(event) => setField("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/company/..." className={inputClass} /></Field><Field label="TikTok" htmlFor="onboard-tiktok"><Input id="onboard-tiktok" type="url" value={draft.tiktokUrl} onChange={(event) => setField("tiktokUrl", event.target.value)} placeholder="https://tiktok.com/@..." className={inputClass} /></Field></div></div></div>;
}

function Services({ draft, setField, hasSocial, hasWebsiteOption, togglePackage, togglePlatform }: { draft: OnboardingDraft; setField: <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void; hasSocial: boolean; hasWebsiteOption: boolean; togglePackage: (id: ActivePackageId, checked: boolean) => void; togglePlatform: (id: OnboardingDraft["socialPlatforms"][number], checked: boolean) => void }) {
  return <div className="space-y-5"><div><h3 className="font-display text-lg font-semibold text-ivory">Choose what to prepare now</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Everything starts selected. Untick work that does not apply. Preparation creates private records only.</p></div><fieldset className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Growth packages</legend>{PACKAGE_OPTIONS.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/35 p-4 transition-colors hover:border-primary/30"><Checkbox checked={draft.activePackages.includes(option.id)} onCheckedChange={(value) => togglePackage(option.id, value === true)} className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">{option.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></span></label>)}</fieldset>{hasSocial && <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Social channels to prepare</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Supplied public links are carried into the brief. A blank link means the operator still needs to collect it.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{SOCIAL_REVAMP_PLATFORM_OPTIONS.map((platform) => <label key={platform} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5"><Checkbox checked={draft.socialPlatforms.includes(platform)} onCheckedChange={(value) => togglePlatform(platform, value === true)} /><span className="text-sm text-ivory">{socialRevampPlatformLabel(platform)}</span>{draft[`${platform}Url`] && <span className="ml-auto text-[10px] text-primary">Link supplied</span>}</label>)}</div></section>}<section className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Optional linked workspaces</p><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/35 p-4 hover:border-primary/30"><Checkbox checked={draft.prepareEmailSignature} onCheckedChange={(value) => setField("prepareEmailSignature", value === true)} className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">Email Signature workspace</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Starts a brief with supplied contact and public profile details. A team member is added later.</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/35 p-4 hover:border-primary/30"><Checkbox checked={draft.prepareFinancialAudit} onCheckedChange={(value) => setField("prepareFinancialAudit", value === true)} className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">Financial health audit intake</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Creates the current month as a blank private intake. It does not start an audit or make a financial conclusion.</span></span></label><label className={`flex items-start gap-3 rounded-2xl border border-border bg-background/35 p-4 ${hasWebsiteOption ? "cursor-pointer hover:border-primary/30" : "opacity-60"}`}><Checkbox checked={draft.prepareHosting} disabled={!hasWebsiteOption} onCheckedChange={(value) => setField("prepareHosting", value === true)} className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">Hosting operations</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{hasWebsiteOption ? "Prepares a pending domain record when a public website domain is available." : "Add a website or domain before preparing hosting operations."}</span></span></label></section></div>;
}

function Review({ draft, workspaces }: { draft: OnboardingDraft; workspaces: string[] }) {
  const businessType = BUSINESS_TYPE_OPTIONS.find((option) => option.id === draft.businessType)?.label || pretty(draft.businessType);
  const website = draft.websiteSource === "existing_website" ? draft.website || "Website URL still needed" : WEBSITE_SOURCE_OPTIONS.find((option) => option.id === draft.websiteSource)?.label;
  return <div className="space-y-5"><div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Ready to save privately</p><p className="mt-2 text-sm leading-6 text-ivory">The setup will create one shared business record, then prepare only the selected linked workspaces. Missing facts remain visible for follow-up.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Business identity</p><p className="mt-2 font-display text-xl font-semibold text-ivory">{draft.businessName || "Business name needed"}</p><p className="mt-1 text-sm text-muted-foreground">{businessType}{draft.trade ? ` · ${draft.trade}` : ""}{draft.location ? ` · ${draft.location}` : ""}</p><p className="mt-3 text-xs text-muted-foreground">{draft.clientKind === "own_business" ? "Your own business" : "Client business"} · {website}</p></div><div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected packages</p><div className="mt-3 flex flex-wrap gap-2">{draft.activePackages.length ? draft.activePackages.map((id) => <span key={id} className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-xs text-primary">{packageLabel(id)}</span>) : <span className="text-sm text-muted-foreground">No growth packages selected</span>}</div><p className="mt-3 text-xs text-muted-foreground">{draft.socialPlatforms.length ? `${draft.socialPlatforms.length} social channel${draft.socialPlatforms.length === 1 ? "" : "s"} selected` : "No social channels selected"}</p></div></div><section className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Workspaces to prepare</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{workspaces.map((workspace) => <li key={workspace} className="flex items-center gap-2 text-sm text-ivory"><Check className="h-4 w-4 text-primary" aria-hidden="true" />{workspace}</li>)}</ul></section><p className="text-xs leading-5 text-muted-foreground">Creation prepares private operator records. It does not publish a website, send messages, connect accounts, start a financial review, schedule content, run ads, or spend money.</p></div>;
}

function Completion({ result, onNavigate }: { result: ClientOnboardingResult; onNavigate: (destination: OnboardingDestination) => void }) {
  const actionItems: Array<[OnboardingDestination, string]> = [["clients", "Clients / Sites"], ["growthstack", "GrowthStack"], ["socialRevamp", "Social Revamp"], ["signatures", "Email Signatures"], ["financialAudits", "Financial Audits"], ["hosting", "Hosting"], ["calendar", "Content Calendar"], ["reports", "Reports"]];
  return <div className="space-y-5 py-4"><div className="rounded-2xl border border-cyan-accent/20 bg-cyan-accent/[0.06] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-accent" /><div><p className="font-display text-lg font-semibold text-ivory">{result.clientSite.businessName} is in the hub</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{result.clientSite.created ? "The shared business record was created." : "The matching business record was kept and linked safely."} Review the setup below before opening the next workspace.</p></div></div></div>{result.created.length > 0 && <StatusGroup icon={<CheckCircle2 className="h-4 w-4 text-primary" />} title="Prepared" items={result.created.map((item) => item.label)} tone="good" />}{result.ready.length > 0 && <StatusGroup icon={<Circle className="h-4 w-4 text-cyan-accent" />} title="Ready for manual planning" items={result.ready.map((item) => `${item.label}, no placeholder record was created`)} tone="ready" />}{result.skipped.length > 0 && <StatusGroup icon={<Circle className="h-4 w-4 text-muted-foreground" />} title="Kept or skipped" items={result.skipped.map((item) => `${item.label}: ${item.reason}`)} tone="muted" />}{result.failed.length > 0 && <StatusGroup icon={<XCircle className="h-4 w-4 text-warning" />} title="Needs follow-up" items={result.failed.map((item) => `${item.label}: ${item.reason}`)} tone="warning" />}{result.failed.length > 0 && <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-warning">The client record remains safe. Open the relevant workspace to retry any item listed above.</p>}<section><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Open the next workspace</p><div className="mt-3 flex flex-wrap gap-2">{actionItems.filter(([destination]) => destination === "clients" || selectedWorkspace(result, destination)).map(([destination, label]) => <Button key={destination} type="button" variant={destination === "clients" ? "default" : "outline"} onClick={() => onNavigate(destination)} className={destination === "clients" ? "gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" : "gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"}>{label}<ArrowRight className="h-3.5 w-3.5" /></Button>)}</div></section></div>;
}
function StatusGroup({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: "good" | "ready" | "muted" | "warning" }) { const style = tone === "warning" ? "border-warning/20 bg-warning/[0.05]" : tone === "good" ? "border-primary/20 bg-primary/[0.04]" : "border-border bg-background/30"; return <section className={`rounded-2xl border p-4 ${style}`}><div className="flex items-center gap-2">{icon}<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p></div><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-5 text-ivory"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />{item}</li>)}</ul></section>; }

```

## src/components/hub/ClientSiteManualForm.tsx

```tsx
import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientSite as ClientSiteEntity } from "@/entities";
import { BUSINESS_TYPE_OPTIONS, CLIENT_KIND_OPTIONS, PACKAGE_OPTIONS, WEBSITE_SOURCE_OPTIONS, type ActivePackageId, type BusinessType, type ClientKind, type WebsiteSource } from "@/lib/hub-data";
import { errorMessage } from "@/lib/hub-operations";

export type ClientSiteCreated = { id?: string; businessName: string };
type ClientSiteManualFormProps = { onSaved: (site?: ClientSiteCreated) => void; onCancel: () => void };
type Draft = { businessName: string; businessType: BusinessType; trade: string; location: string; phone: string; email: string; description: string; clientKind: ClientKind; websiteSource: WebsiteSource; website: string; activePackages: ActivePackageId[]; hostingRequired: boolean };

const inputClass = "h-10 border-border bg-background/70 text-foreground placeholder:text-muted-foreground";
const selectClass = "h-10 border-border bg-background/70 text-foreground";
const initialDraft: Draft = { businessName: "", businessType: "other", trade: "", location: "", phone: "", email: "", description: "", clientKind: "client", websiteSource: "no_website", website: "", activePackages: [], hostingRequired: false };

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>{children}{hint && <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p>}</div>;
}

function validExternalUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !url.hostname.includes(" ");
  } catch { return false; }
}

export function ClientSiteManualForm({ onSaved, onCancel }: ClientSiteManualFormProps) {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [hostingTouched, setHostingTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const setField = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const setWebsiteSource = (value: WebsiteSource) => {
    setDraft((current) => ({ ...current, websiteSource: value, hostingRequired: hostingTouched ? current.hostingRequired : value === "buildy_built" }));
  };
  const togglePackage = (id: ActivePackageId, checked: boolean) => setField("activePackages", checked ? [...draft.activePackages, id] : draft.activePackages.filter((item) => item !== id));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const errors: string[] = [];
    if (!draft.businessName.trim()) errors.push("Add a business name.");
    if (draft.websiteSource === "existing_website" && !validExternalUrl(draft.website)) errors.push("Enter a valid website URL beginning with http:// or https://.");
    if (draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) errors.push("Enter a valid email address or leave it blank.");
    if (errors.length) { setFormError(errors[0]); return; }
    const trade = draft.trade.trim() || BUSINESS_TYPE_OPTIONS.find((option) => option.id === draft.businessType)?.label || "Business";
    const website = draft.websiteSource === "existing_website" ? draft.website.trim() : "";
    setSaving(true);
    try {
      const created = await (ClientSiteEntity as any).create({
        businessName: draft.businessName.trim(), businessType: draft.businessType, trade, clientKind: draft.clientKind, websiteSource: draft.websiteSource, activePackages: draft.activePackages, hostingRequired: draft.hostingRequired,
        location: draft.location.trim(), phone: draft.phone.trim(), email: draft.email.trim(), description: draft.description.trim(), website,
        services: [], areasServed: [], primaryColor: "", secondaryColor: "", logoImageUrl: "", photoUrls: [], reviewSnippets: [], generatedSiteHtml: "", sourceLeadId: "", previewToken: "",
        status: draft.websiteSource === "existing_website" ? "live" : "draft", tier: "None", socialLinks: { facebookUrl: "", instagramUrl: "", googleBusinessUrl: "" }, paymentConfig: { stripeEnabled: false, stripePublishableKey: "", paypalEnabled: false, paypalEmail: "", squareEnabled: false, adyenEnabled: false }, siteType: "service", products: [], includePromotions: false,
        brandVoice: "", brandAttitude: "", contentStyle: "", customerLanguage: [], visualVibe: "", visualStyle: "", colorFromImages: [], typographyVibe: "", extractedImageUrls: [], customSections: [],
      });
      const createdRecord = created && typeof created === "object" && !Array.isArray(created) ? created as Record<string, unknown> : undefined;
      const createdId = typeof createdRecord?.id === "string" && createdRecord.id.trim() ? createdRecord.id.trim() : undefined;
      onSaved({ id: createdId, businessName: draft.businessName.trim() });
    } catch (error) {
      setFormError(errorMessage(error, "The client record could not be saved. Check your access and try again."));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-xs leading-5 text-muted-foreground">This creates a private, persistent record. You can attach GrowthStack work even when the business has no website.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="manual-business-name" hint="Required."><Input id="manual-business-name" value={draft.businessName} onChange={(event) => setField("businessName", event.target.value)} placeholder="Northside Plumbing" autoFocus className={inputClass} /></Field>
        <Field label="Business type" htmlFor="manual-business-type"><Select value={draft.businessType} onValueChange={(value) => setField("businessType", value as BusinessType)}><SelectTrigger id="manual-business-type" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{BUSINESS_TYPE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Industry or trade" htmlFor="manual-trade" hint="Optional. Add a more specific service label."><Input id="manual-trade" value={draft.trade} onChange={(event) => setField("trade", event.target.value)} placeholder="Residential plumbing" className={inputClass} /></Field>
        <Field label="Location" htmlFor="manual-location"><Input id="manual-location" value={draft.location} onChange={(event) => setField("location", event.target.value)} placeholder="Newcastle, NSW" className={inputClass} /></Field>
        <Field label="Phone" htmlFor="manual-phone"><Input id="manual-phone" type="tel" value={draft.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(02) 4000 0000" className={inputClass} /></Field>
        <Field label="Email" htmlFor="manual-email"><Input id="manual-email" type="email" value={draft.email} onChange={(event) => setField("email", event.target.value)} placeholder="hello@business.com" className={inputClass} /></Field>
      </div>
      <Field label="Description" htmlFor="manual-description" hint="A short note about the business and the work you provide."><Textarea id="manual-description" value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="What the business does, who it serves, and what you are helping with." className="min-h-[86px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Record kind" htmlFor="manual-client-kind" hint="Use My own business for your own SEO or marketing work."><Select value={draft.clientKind} onValueChange={(value) => setField("clientKind", value as ClientKind)}><SelectTrigger id="manual-client-kind" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{CLIENT_KIND_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Website source" htmlFor="manual-website-source" hint="Choose the current website situation."><Select value={draft.websiteSource} onValueChange={(value) => setWebsiteSource(value as WebsiteSource)}><SelectTrigger id="manual-website-source" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{WEBSITE_SOURCE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
      </div>
      {draft.websiteSource === "existing_website" && <Field label="Existing website URL" htmlFor="manual-website" hint="Include https:// or http://. The saved link opens from the client card."><Input id="manual-website" type="url" value={draft.website} onChange={(event) => setField("website", event.target.value)} placeholder="https://business.com" className={inputClass} autoComplete="url" /></Field>}
      <fieldset className="rounded-2xl border border-border bg-background/40 p-4"><legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active packages</legend><p className="mt-1 text-xs leading-5 text-muted-foreground">Record the services this client or business is buying. This does not start any work automatically.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{PACKAGE_OPTIONS.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/50 p-3 transition-colors hover:border-primary/30"><Checkbox checked={draft.activePackages.includes(option.id)} onCheckedChange={(checked) => togglePackage(option.id, checked === true)} aria-label={option.label} className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">{option.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{option.description}</span></span></label>)}</div></fieldset>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/50 p-3"><Checkbox checked={draft.hostingRequired} onCheckedChange={(checked) => { setHostingTouched(true); setField("hostingRequired", checked === true); }} aria-label="Hosting required" className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">Hosting required</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">Hosting defaults on for Buildy-built sites and off for external or no-website records. You can change it.</span></span></label>
      {formError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="border-border bg-transparent text-foreground hover:bg-secondary">Cancel</Button><Button type="submit" disabled={saving} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving…" : "Save client"}</Button></div>
    </form>
  );
}

```

## src/components/hub/BusinessTypeBadge.tsx

```tsx
import { BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/hub-data";
import { Building2, ShoppingBag, Utensils, Scissors, Dumbbell, HeartPulse, Briefcase, Car, GraduationCap, Bed, HardHat, Wrench, Store } from "lucide-react";

const iconMap: Record<string, any> = {
  ShoppingBag, Utensils, Scissors, Dumbbell, HeartPulse, Briefcase, Building2, Car, GraduationCap, Bed, HardHat, Wrench, Store
};

type Props = {
  businessType: BusinessType;
  size?: "sm" | "md";
  showDesc?: boolean;
};

export function BusinessTypeBadge({ businessType, size="md", showDesc=false }: Props) {
  const meta = BUSINESS_TYPE_OPTIONS.find(b=>b.id===businessType) || BUSINESS_TYPE_OPTIONS.find(b=>b.id==="other")!;
  const Icon = (iconMap as any)[meta.icon] || Store;
  const isSmall = size==="sm";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 ${isSmall ? "px-2.5 py-1" : "px-3.5 py-2"}`}>
      <span className={`flex items-center justify-center rounded-full bg-primary/15 text-primary ${isSmall ? "h-5 w-5" : "h-7 w-7"}`}><Icon className={isSmall ? "h-3.5 w-3.5" : "h-4 w-4"} /></span>
      <div className="text-left">
        <p className={`font-semibold leading-none text-primary ${isSmall ? "text-xs" : "text-sm"}`}>Detected: {meta.label}</p>
        {showDesc && <p className="mt-0.5 text-[11px] leading-none text-primary/70">{meta.desc}</p>}
      </div>
      <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">AI</span>
    </div>
  );
}

```

## src/components/hub/SocialLinksBar.tsx

```tsx
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NormalizedSocialLink = {
  platform?: string | null;
  url?: string | null;
};

export type SocialLinkFields = {
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
  googleBusinessUrl?: string | null;
  website?: string | null;
  socialLinks?: NormalizedSocialLink[] | null;
};

type SocialLinksBarProps = SocialLinkFields & {
  className?: string;
  showLabels?: boolean;
};

type LinkDefinition = {
  key: Exclude<keyof SocialLinkFields, "socialLinks">;
  label: string;
  icon: LucideIcon;
};

type RenderedLink = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

const LINK_DEFINITIONS: LinkDefinition[] = [
  { key: "instagramUrl", label: "Instagram", icon: Instagram },
  { key: "facebookUrl", label: "Facebook", icon: Facebook },
  { key: "tiktokUrl", label: "TikTok", icon: Globe },
  { key: "linkedinUrl", label: "LinkedIn", icon: Linkedin },
  { key: "googleBusinessUrl", label: "Google Business", icon: MapPin },
  { key: "website", label: "Website", icon: Globe },
];

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
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

function platformLabel(url: string, value: unknown) {
  const hint = typeof value === "string" && value.trim() ? value.trim() : "";
  if (hint) return hint;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const known = [
      ["instagram.com", "Instagram"], ["facebook.com", "Facebook"], ["tiktok.com", "TikTok"],
      ["linkedin.com", "LinkedIn"], ["youtube.com", "YouTube"], ["x.com", "X"], ["twitter.com", "X"],
      ["pinterest.com", "Pinterest"], ["threads.net", "Threads"], ["whatsapp.com", "WhatsApp"], ["wa.me", "WhatsApp"],
      ["reddit.com", "Reddit"], ["vimeo.com", "Vimeo"], ["twitch.tv", "Twitch"], ["medium.com", "Medium"], ["behance.net", "Behance"], ["dribbble.com", "Dribbble"], ["linktr.ee", "Linktree"], ["bluesky.app", "Bluesky"],
      ["g.page", "Google Business"], ["yelp.com", "Yelp"], ["tripadvisor.com", "Tripadvisor"],
    ] as const;
    return known.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] || host;
  } catch {
    return "Public profile";
  }
}

function iconFor(label: string): LucideIcon {
  const lower = label.toLowerCase();
  if (lower === "instagram") return Instagram;
  if (lower === "facebook") return Facebook;
  if (lower === "linkedin") return Linkedin;
  if (lower === "google business") return MapPin;
  if (lower === "youtube") return Youtube;
  return Globe;
}

function readableUrl(value: string) {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/\/+$/, "");
    const display = `${parsed.hostname.replace(/^www\./, "")}${path}`;
    return display.length > 34 ? `${display.slice(0, 31)}…` : display;
  } catch {
    return value;
  }
}

export function SocialLinksBar({ className, showLabels = false, ...fields }: SocialLinksBarProps) {
  const legacyLinks: RenderedLink[] = LINK_DEFINITIONS.flatMap((definition) => {
    const href = safeHttpUrl(fields[definition.key]);
    return href ? [{ key: definition.key, label: definition.label, icon: definition.icon, href }] : [];
  });
  const normalizedLinks: RenderedLink[] = (fields.socialLinks || []).flatMap((item, index) => {
    const href = safeHttpUrl(item?.url);
    if (!href) return [];
    const label = platformLabel(href, item?.platform);
    return [{ key: `social-${index}-${canonicalUrl(href)}`, label, icon: iconFor(label), href }];
  });
  const seen = new Set<string>();
  const links = [...legacyLinks, ...normalizedLinks].filter((link) => {
    const key = canonicalUrl(link.href);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (links.length === 0) return null;

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)} aria-label="Available online links">
      {links.map(({ key, label, icon: Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${label}: ${readableUrl(href)}`}
          aria-label={`Open ${label} for this lead`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-zinc-900 px-2 text-zinc-400 transition-colors",
            "hover:border-[#BAFB3A]/40 hover:bg-[#BAFB3A]/10 hover:text-[#BAFB3A]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BAFB3A]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
            showLabels ? "max-w-full" : "w-8 px-0",
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className={cn(showLabels ? "truncate text-[11px]" : "sr-only")}>{label}</span>
          <span className="sr-only">{readableUrl(href)}</span>
        </a>
      ))}
    </div>
  );
}

export default SocialLinksBar;

```

## src/components/hub/HostingWorkspace.tsx

```tsx
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit3, Filter, HardDrive, Plus, RefreshCw, Search, Server, Trash2, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientSite as ClientSiteEntity, HostingRecord as HostingRecordEntity } from "@/entities";
import type { ClientSite } from "@/lib/hub-data";
import { cn } from "@/lib/utils";
import { errorMessage, formatOperationalDate, HOSTING_OPERATIONAL_OPTIONS, HOSTING_STATUS_OPTIONS, readNumber, readText, oneOf, type HostingOperationalStatus, type HostingRecord, type HostingRecordInput, type HostingStatus, type SslStatus, type CdnStatus, SSL_STATUS_OPTIONS, CDN_STATUS_OPTIONS } from "@/lib/hub-operations";
import { HostingRecordForm } from "@/components/hub/HostingRecordForm";
import { toast } from "sonner";

type LoadState = "loading" | "ready" | "unavailable";
type HostingFilter = "all" | HostingStatus;
type StatusFilter = "all" | SslStatus;
type CdnFilter = "all" | CdnStatus;
type AttentionFilter = "all" | HostingOperationalStatus;
type SiteOption = Pick<ClientSite, "id" | "businessName" | "trade" | "location"> & { hostingRequired: boolean };

type HostingWorkspaceProps = {
  search: string;
  onSearchChange: (value: string) => void;
  refreshKey: number;
  onMutation?: () => void;
  onSummaryChange?: (summary: { attentionCount: number; recordCount: number }) => void;
};

function mapSite(value: unknown): SiteOption | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readText(record.id);
  if (!id) return null;
  return { id, businessName: readText(record.businessName, "Untitled business"), trade: readText(record.trade, "Business type not set"), location: readText(record.location, "Location not set"), hostingRequired: typeof record.hostingRequired === "boolean" ? record.hostingRequired : true };
}

function mapHosting(value: unknown): HostingRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readText(record.id);
  if (!id) return null;
  return {
    id,
    clientSiteId: readText(record.clientSiteId),
    businessName: readText(record.businessName, "Saved client or business"),
    domain: readText(record.domain, "Domain not set"),
    sslStatus: oneOf(record.sslStatus, SSL_STATUS_OPTIONS, "unknown"),
    cdnStatus: oneOf(record.cdnStatus, CDN_STATUS_OPTIONS, "unknown"),
    hostingStatus: oneOf(record.hostingStatus, HOSTING_STATUS_OPTIONS, "pending"),
    bandwidthUsedGb: readNumber(record.bandwidthUsedGb),
    bandwidthLimitGb: readNumber(record.bandwidthLimitGb),
    storageUsedGb: readNumber(record.storageUsedGb),
    storageLimitGb: readNumber(record.storageLimitGb),
    uptimePercentage: readNumber(record.uptimePercentage),
    lastCheckedAt: readText(record.lastCheckedAt),
    nextCheckDate: readText(record.nextCheckDate),
    renewalDate: readText(record.renewalDate),
    notes: readText(record.notes),
    operationalStatus: oneOf(record.operationalStatus, HOSTING_OPERATIONAL_OPTIONS, "unknown"),
    actionNeeded: readText(record.actionNeeded),
    created_at: readText(record.created_at),
    updated_at: readText(record.updated_at),
  };
}

function isAttention(record: HostingRecord) {
  return record.operationalStatus === "attention" || record.hostingStatus === "attention" || Boolean(record.actionNeeded);
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(value: string) {
  if (["active", "healthy"].includes(value)) return "border-primary/25 bg-primary/10 text-primary";
  if (["attention", "expiring", "maintenance"].includes(value)) return "border-warning/25 bg-warning/10 text-warning";
  if (["missing", "paused"].includes(value)) return "border-destructive/25 bg-destructive/10 text-red-200";
  return "border-border bg-secondary text-muted-foreground";
}

function usagePercent(used: number, limit: number) {
  return limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
}

function gb(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)} GB`;
}

export function HostingWorkspace({ search, onSearchChange, refreshKey, onMutation, onSummaryChange }: HostingWorkspaceProps) {
  const [records, setRecords] = useState<HostingRecord[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [recordsState, setRecordsState] = useState<LoadState>("loading");
  const [sitesState, setSitesState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [hostingFilter, setHostingFilter] = useState<HostingFilter>("all");
  const [sslFilter, setSslFilter] = useState<StatusFilter>("all");
  const [cdnFilter, setCdnFilter] = useState<CdnFilter>("all");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HostingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostingRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // Refreshes are keyed to data changes. The summary callback stays out to avoid refetch loops for inline handlers.
  useEffect(() => {
    let cancelled = false;
    setRecordsState("loading");
    setSitesState("loading");
    setLoadError("");
    const load = async () => {
      const [recordsResult, sitesResult] = await Promise.allSettled([
        (HostingRecordEntity as any).list("-updated_at", 200),
        (ClientSiteEntity as any).list("-updated_at", 200),
      ]);
      if (cancelled) return;
      const nextRecords = recordsResult.status === "fulfilled" && Array.isArray(recordsResult.value) ? recordsResult.value.map(mapHosting).filter(Boolean) as HostingRecord[] : [];
      const nextSites = sitesResult.status === "fulfilled" && Array.isArray(sitesResult.value) ? sitesResult.value.map(mapSite).filter(Boolean) as SiteOption[] : [];
      setRecords(nextRecords);
      setSites(nextSites);
      if (recordsResult.status === "fulfilled" && Array.isArray(recordsResult.value)) setRecordsState("ready");
      else { setRecordsState("unavailable"); setLoadError("Hosting records could not be loaded. Try again before changing operations."); }
      setSitesState(sitesResult.status === "fulfilled" && Array.isArray(sitesResult.value) ? "ready" : "unavailable");
      onSummaryChange?.({ attentionCount: nextRecords.filter(isAttention).length, recordCount: nextRecords.length });
    };
    void load();
    return () => { cancelled = true; };
  }, [refreshKey, retryKey]);

  const siteMap = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const eligibleSites = useMemo(() => sites.filter((site) => site.hostingRequired !== false), [sites]);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const site = siteMap.get(record.clientSiteId);
      const matchesSearch = !query || [record.businessName, record.domain, site?.businessName, site?.trade, site?.location].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch && (hostingFilter === "all" || record.hostingStatus === hostingFilter) && (sslFilter === "all" || record.sslStatus === sslFilter) && (cdnFilter === "all" || record.cdnStatus === cdnFilter) && (attentionFilter === "all" || record.operationalStatus === attentionFilter);
    });
  }, [attentionFilter, cdnFilter, hostingFilter, records, search, siteMap, sslFilter]);

  const attentionCount = records.filter(isAttention).length;
  const averageUptime = records.filter((record) => record.uptimePercentage > 0).reduce((total, record, _, list) => total + record.uptimePercentage / list.length, 0);
  const clearFilters = () => { onSearchChange(""); setHostingFilter("all"); setSslFilter("all"); setCdnFilter("all"); setAttentionFilter("all"); };
  const openCreate = () => { if (!eligibleSites.length) return; setEditing(null); setFormOpen(true); };
  const openEdit = (record: HostingRecord) => { setEditing(record); setFormOpen(true); };

  const saveRecord = async (payload: HostingRecordInput) => {
    try {
      if (editing) await (HostingRecordEntity as any).update(editing.id, payload);
      else await (HostingRecordEntity as any).create(payload);
      setFormOpen(false);
      setEditing(null);
      toast.success(editing ? "Hosting record updated" : "Hosting record added");
      setRetryKey((value) => value + 1);
      onMutation?.();
    } catch (error) {
      throw new Error(errorMessage(error, "The hosting record could not be saved. Check your access and try again."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await (HostingRecordEntity as any).delete(deleteTarget.id);
      toast.success("Hosting record deleted");
      setDeleteTarget(null);
      setRetryKey((value) => value + 1);
      onMutation?.();
    } catch (error) {
      setDeleteError(errorMessage(error, "The hosting record could not be deleted."));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="hosting-workspace-title">
      <div className="flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-accent/20 bg-cyan-accent/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-accent"><Server className="h-3.5 w-3.5" aria-hidden="true" />Operator-maintained</div><h2 id="hosting-workspace-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-ivory">Hosting operations</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep domains, capacity, certificates, and manual checks tied to the right client or business. These records describe your operations and do not connect to a provider.</p></div>
        <Button type="button" onClick={openCreate} disabled={sitesState !== "ready" || eligibleSites.length === 0} className="h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90" title={eligibleSites.length ? "Add an operator-maintained hosting record" : "Hosting is optional. Mark a client or business as hosting required first."}><Plus className="h-4 w-4" aria-hidden="true" />Add hosting record</Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Hosting records</p><p className="mt-2 font-display text-3xl font-bold text-ivory">{recordsState === "ready" ? records.length : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">Saved against client and business records</p></div><div className={cn("rounded-2xl border bg-card p-4", attentionCount ? "border-warning/25" : "border-border")}><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Needs attention</p><p className={cn("mt-2 font-display text-3xl font-bold", attentionCount ? "text-warning" : "text-ivory")}>{recordsState === "ready" ? attentionCount : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">Manual follow-up items</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Domains tracked</p><p className="mt-2 font-display text-3xl font-bold text-ivory">{recordsState === "ready" ? new Set(records.map((record) => record.domain).filter(Boolean)).size : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">No registrar connection implied</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Average uptime</p><p className="mt-2 font-display text-3xl font-bold text-ivory">{recordsState === "ready" && averageUptime > 0 ? `${averageUptime.toFixed(2)}%` : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">From recorded checks only</p></div></div>

      <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search business, domain, trade, or location" aria-label="Search hosting records" className="h-10 border-border bg-background/70 pl-10 text-foreground placeholder:text-muted-foreground" /></div><div className="flex flex-wrap items-center gap-2"><Filter className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" /><Select value={hostingFilter} onValueChange={(value) => setHostingFilter(value as HostingFilter)}><SelectTrigger className="h-10 w-[142px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter hosting status"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All hosting</SelectItem>{HOSTING_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select><Select value={sslFilter} onValueChange={(value) => setSslFilter(value as StatusFilter)}><SelectTrigger className="h-10 w-[126px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter SSL status"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All SSL</SelectItem>{SSL_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>SSL {label(value)}</SelectItem>)}</SelectContent></Select><Select value={cdnFilter} onValueChange={(value) => setCdnFilter(value as CdnFilter)}><SelectTrigger className="h-10 w-[126px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter CDN status"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All CDN</SelectItem>{CDN_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>CDN {label(value)}</SelectItem>)}</SelectContent></Select><Select value={attentionFilter} onValueChange={(value) => setAttentionFilter(value as AttentionFilter)}><SelectTrigger className="h-10 w-[150px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter hosting attention state"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All attention</SelectItem>{HOSTING_OPERATIONAL_OPTIONS.map((value) => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select><div className="inline-flex rounded-xl border border-border bg-background/70 p-1"><Button type="button" variant="ghost" size="sm" onClick={() => setViewMode("cards")} aria-pressed={viewMode === "cards"} className={cn("h-8 px-3 text-xs", viewMode === "cards" ? "bg-secondary text-ivory" : "text-muted-foreground")}>Cards</Button><Button type="button" variant="ghost" size="sm" onClick={() => setViewMode("table")} aria-pressed={viewMode === "table"} className={cn("h-8 px-3 text-xs", viewMode === "table" ? "bg-secondary text-ivory" : "text-muted-foreground")}>Table</Button></div></div></div></div>

      {sitesState === "unavailable" && recordsState === "ready" && <p className="mt-4 flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-xs text-warning"><AlertCircle className="h-4 w-4" aria-hidden="true" />Client and business names are unavailable. Existing hosting records remain safe to review, but wait for records to load before creating a new link.</p>}
      {recordsState === "loading" && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-52 rounded-2xl bg-card" />)}</div>}
      {recordsState === "unavailable" && <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-300" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold text-ivory">Hosting records are unavailable</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{loadError || "The records could not be read right now."} No changes have been made.</p><Button type="button" variant="outline" onClick={() => setRetryKey((value) => value + 1)} className="mt-5 gap-2 border-border bg-card text-foreground hover:bg-secondary"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</Button></div>}
      {recordsState === "ready" && filteredRecords.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"><Wifi className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold text-ivory">{records.length ? "No hosting records match" : "No hosting records yet"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{records.length ? "Try a different search or clear the filters. Your saved records remain unchanged." : eligibleSites.length ? "Add the first operator-maintained record to keep domain and capacity details beside the right client or business." : sites.length ? "Hosting is optional. Add or edit a client or business in Clients / Sites and mark hosting required before adding operations." : "Add a client or business in Clients / Sites, then mark hosting required if hosting operations are needed."}</p><div className="mt-5 flex flex-wrap justify-center gap-2">{records.length > 0 && <Button type="button" variant="outline" onClick={clearFilters} className="border-border bg-card text-foreground hover:bg-secondary">Clear filters</Button>}{!records.length && eligibleSites.length > 0 && <Button type="button" onClick={openCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" aria-hidden="true" />Add hosting record</Button>}</div></div>}
      {recordsState === "ready" && filteredRecords.length > 0 && (viewMode === "cards" ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredRecords.map((record, index) => { const site = siteMap.get(record.clientSiteId); const attention = isAttention(record); return <motion.article key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-cyan-accent/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusClass(record.hostingStatus))}>{label(record.hostingStatus)}</span>{attention && <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">Attention</span>}</div><h3 className="mt-3 truncate font-display text-lg font-semibold text-ivory">{site?.businessName || record.businessName}</h3><p className="mt-1 truncate text-sm text-cyan-accent">{record.domain}</p><p className="mt-1 text-xs text-muted-foreground">{site?.trade || "Client / business link unavailable"}{site?.location ? ` · ${site.location}` : ""}</p></div><Server className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/80 pt-4"><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">SSL</p><p className={cn("mt-1 text-sm font-medium", statusClass(record.sslStatus).split(" ").find((item) => item.startsWith("text-")))}>{label(record.sslStatus)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">CDN</p><p className={cn("mt-1 text-sm font-medium", statusClass(record.cdnStatus).split(" ").find((item) => item.startsWith("text-")))}>{label(record.cdnStatus)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Uptime</p><p className="mt-1 text-sm font-medium text-ivory">{record.uptimePercentage > 0 ? `${record.uptimePercentage.toFixed(2)}%` : "Not checked"}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last checked</p><p className="mt-1 text-sm font-medium text-ivory">{formatOperationalDate(record.lastCheckedAt)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Next check</p><p className="mt-1 text-sm font-medium text-ivory">{formatOperationalDate(record.nextCheckDate)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Renewal</p><p className="mt-1 text-sm font-medium text-ivory">{formatOperationalDate(record.renewalDate)}</p></div></div><div className="mt-4 space-y-3"><div><div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Wifi className="h-3 w-3" aria-hidden="true" />Bandwidth</span><span>{gb(record.bandwidthUsedGb)} / {gb(record.bandwidthLimitGb)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-cyan-accent transition-all" style={{ width: `${usagePercent(record.bandwidthUsedGb, record.bandwidthLimitGb)}%` }} /></div></div><div><div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><HardDrive className="h-3 w-3" aria-hidden="true" />Storage</span><span>{gb(record.storageUsedGb)} / {gb(record.storageLimitGb)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usagePercent(record.storageUsedGb, record.storageLimitGb)}%` }} /></div></div></div><p className={cn("mt-4 rounded-xl border px-3 py-2 text-xs leading-5", record.actionNeeded ? "border-warning/20 bg-warning/[0.06] text-warning" : "border-border bg-secondary/40 text-muted-foreground")}>Next action: {record.actionNeeded || "No open action recorded"}</p><div className="mt-5 flex gap-2"><Button type="button" variant="outline" onClick={() => openEdit(record)} className="h-9 flex-1 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />Edit</Button><Button type="button" variant="outline" onClick={() => { setDeleteError(""); setDeleteTarget(record); }} className="h-9 gap-1.5 border-destructive/25 bg-transparent text-red-200 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</Button></div></motion.article>; })}</div> : <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card"><Table><TableHeader><TableRow className="border-border hover:bg-transparent"><TableHead>Client / domain</TableHead><TableHead>Hosting</TableHead><TableHead>SSL / CDN</TableHead><TableHead>Capacity</TableHead><TableHead>Uptime / checks</TableHead><TableHead>Next action</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredRecords.map((record) => { const site = siteMap.get(record.clientSiteId); return <TableRow key={record.id} className="border-border"><TableCell><p className="font-medium text-ivory">{site?.businessName || record.businessName}</p><p className="mt-1 text-xs text-cyan-accent">{record.domain}</p></TableCell><TableCell><span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide", statusClass(record.hostingStatus))}>{label(record.hostingStatus)}</span>{isAttention(record) && <p className="mt-2 text-xs text-warning">Attention</p>}</TableCell><TableCell><p className="text-xs text-ivory">SSL {label(record.sslStatus)}</p><p className="mt-1 text-xs text-muted-foreground">CDN {label(record.cdnStatus)}</p></TableCell><TableCell><p className="text-xs text-muted-foreground">{gb(record.bandwidthUsedGb)} / {gb(record.bandwidthLimitGb)} bandwidth</p><p className="mt-1 text-xs text-muted-foreground">{gb(record.storageUsedGb)} / {gb(record.storageLimitGb)} storage</p></TableCell><TableCell><p className="text-xs text-ivory">{record.uptimePercentage > 0 ? `${record.uptimePercentage.toFixed(2)}%` : "Not checked"}</p><p className="mt-1 text-xs text-muted-foreground">Last: {formatOperationalDate(record.lastCheckedAt)}</p><p className="mt-1 text-xs text-muted-foreground">Next: {formatOperationalDate(record.nextCheckDate)}</p></TableCell><TableCell><p className="max-w-[180px] text-xs text-muted-foreground">{record.actionNeeded || "No open action"}</p></TableCell><TableCell><div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="icon" onClick={() => openEdit(record)} aria-label={`Edit hosting record for ${record.businessName}`} className="text-muted-foreground hover:bg-secondary hover:text-primary"><Edit3 className="h-4 w-4" aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => { setDeleteError(""); setDeleteTarget(record); }} aria-label={`Delete hosting record for ${record.businessName}`} className="text-muted-foreground hover:bg-destructive/10 hover:text-red-200"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div>)}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditing(null); } }}><DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-4xl"><DialogHeader><DialogTitle className="font-display text-xl text-ivory">{editing ? "Edit hosting record" : "Add hosting record"}</DialogTitle><DialogDescription className="text-muted-foreground">Keep the operational snapshot current for one client or business record.</DialogDescription></DialogHeader><HostingRecordForm key={editing?.id || "new-hosting"} eligibleSites={eligibleSites} record={editing} onSave={saveRecord} onCancel={() => { setFormOpen(false); setEditing(null); }} /></DialogContent></Dialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleteBusy) setDeleteTarget(null); }}><AlertDialogContent className="border-border bg-card text-foreground"><AlertDialogHeader><AlertDialogTitle className="font-display text-ivory">Delete hosting record?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">This removes the operator-maintained hosting record for {deleteTarget?.businessName || "this client or business"}. The linked client or business record remains unchanged.</AlertDialogDescription></AlertDialogHeader>{deleteError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{deleteError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={deleteBusy} className="border-border bg-transparent text-foreground hover:bg-secondary">Keep record</AlertDialogCancel><AlertDialogAction disabled={deleteBusy} onClick={(event) => { event.preventDefault(); void confirmDelete(); }} className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleteBusy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}Delete record</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  );
}

```

## src/components/hub/HostingRecordForm.tsx

```tsx
import { useState, type ReactNode } from "react";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientSite } from "@/lib/hub-data";
import {
  CDN_STATUS_OPTIONS,
  HOSTING_OPERATIONAL_OPTIONS,
  HOSTING_STATUS_OPTIONS,
  SSL_STATUS_OPTIONS,
  type HostingRecord,
  type HostingRecordInput,
  dateInputValue,
  isValidDomain,
  normalizeDomain,
  storedDateValue,
} from "@/lib/hub-operations";

type HostingDraft = {
  clientSiteId: string;
  domain: string;
  sslStatus: string;
  cdnStatus: string;
  hostingStatus: string;
  bandwidthUsedGb: string;
  bandwidthLimitGb: string;
  storageUsedGb: string;
  storageLimitGb: string;
  uptimePercentage: string;
  lastCheckedAt: string;
  nextCheckDate: string;
  renewalDate: string;
  notes: string;
  operationalStatus: string;
  actionNeeded: string;
};

type SiteOption = Pick<ClientSite, "id" | "businessName" | "trade">;

type HostingRecordFormProps = {
  eligibleSites: SiteOption[];
  record?: HostingRecord | null;
  onSave: (payload: HostingRecordInput) => Promise<void>;
  onCancel: () => void;
};

function prettyLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeDraft(record?: HostingRecord | null): HostingDraft {
  return {
    clientSiteId: record?.clientSiteId || "",
    domain: record?.domain || "",
    sslStatus: record?.sslStatus || "unknown",
    cdnStatus: record?.cdnStatus || "unknown",
    hostingStatus: record?.hostingStatus || "pending",
    bandwidthUsedGb: String(record?.bandwidthUsedGb ?? 0),
    bandwidthLimitGb: String(record?.bandwidthLimitGb ?? 0),
    storageUsedGb: String(record?.storageUsedGb ?? 0),
    storageLimitGb: String(record?.storageLimitGb ?? 0),
    uptimePercentage: record && record.uptimePercentage > 0 ? String(record.uptimePercentage) : "",
    lastCheckedAt: dateInputValue(record?.lastCheckedAt),
    nextCheckDate: dateInputValue(record?.nextCheckDate),
    renewalDate: dateInputValue(record?.renewalDate),
    notes: record?.notes || "",
    operationalStatus: record?.operationalStatus || "unknown",
    actionNeeded: record?.actionNeeded || "",
  };
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputClass = "h-10 border-border bg-background/70 text-foreground placeholder:text-muted-foreground";
const selectClass = "h-10 border-border bg-background/70 text-foreground";

export function HostingRecordForm({ eligibleSites, record, onSave, onCancel }: HostingRecordFormProps) {
  const [draft, setDraft] = useState<HostingDraft>(() => makeDraft(record));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const siteOptions = eligibleSites.map((site) => ({ id: site.id, businessName: site.businessName, trade: site.trade }));
  if (record?.clientSiteId && !siteOptions.some((site) => site.id === record.clientSiteId)) {
    siteOptions.push({ id: record.clientSiteId, businessName: record.businessName || "Saved client or business", trade: "Saved record link" });
  }

  const setField = <K extends keyof HostingDraft>(field: K, value: HostingDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const domain = normalizeDomain(draft.domain);
    const bandwidthUsed = Number(draft.bandwidthUsedGb);
    const bandwidthLimit = Number(draft.bandwidthLimitGb);
    const storageUsed = Number(draft.storageUsedGb);
    const storageLimit = Number(draft.storageLimitGb);
    const uptime = draft.uptimePercentage.trim() ? Number(draft.uptimePercentage) : 0;
    const errors: string[] = [];

    if (!draft.clientSiteId) errors.push("Choose a client or business for this hosting record.");
    if (!isValidDomain(domain)) errors.push("Enter a domain such as example.com, without a path.");
    if (![bandwidthUsed, bandwidthLimit, storageUsed, storageLimit, uptime].every(Number.isFinite)) errors.push("Usage, limits, and uptime must be valid numbers.");
    if (bandwidthLimit <= 0 || storageLimit <= 0) errors.push("Bandwidth and storage limits must be greater than zero.");
    if (bandwidthUsed < 0 || storageUsed < 0 || uptime < 0) errors.push("Usage and uptime cannot be negative.");
    if (bandwidthUsed > bandwidthLimit) errors.push("Bandwidth used cannot exceed its limit.");
    if (storageUsed > storageLimit) errors.push("Storage used cannot exceed its limit.");
    if (uptime > 100) errors.push("Uptime must be between 0 and 100 percent.");
    if (errors.length) {
      setFormError(errors[0]);
      return;
    }

    const selectedSite = siteOptions.find((site) => site.id === draft.clientSiteId);
    const payload: HostingRecordInput = {
      clientSiteId: draft.clientSiteId,
      businessName: selectedSite?.businessName || record?.businessName || "Saved client or business",
      domain,
      sslStatus: draft.sslStatus as HostingRecordInput["sslStatus"],
      cdnStatus: draft.cdnStatus as HostingRecordInput["cdnStatus"],
      hostingStatus: draft.hostingStatus as HostingRecordInput["hostingStatus"],
      bandwidthUsedGb: bandwidthUsed,
      bandwidthLimitGb: bandwidthLimit,
      storageUsedGb: storageUsed,
      storageLimitGb: storageLimit,
      uptimePercentage: uptime,
      lastCheckedAt: storedDateValue(draft.lastCheckedAt),
      nextCheckDate: storedDateValue(draft.nextCheckDate),
      renewalDate: storedDateValue(draft.renewalDate),
      notes: draft.notes.trim(),
      operationalStatus: draft.operationalStatus as HostingRecordInput["operationalStatus"],
      actionNeeded: draft.actionNeeded.trim(),
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The hosting record could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="rounded-xl border border-cyan-accent/20 bg-cyan-accent/[0.06] px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        Statuses here are operator-maintained. Saving a record does not change DNS, renew a domain, or connect a monitoring service.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client / business with hosting enabled" htmlFor="hosting-client-site" hint="New records use clients marked as hosting required. Existing records keep their current link if hosting is later turned off.">
          <Select value={draft.clientSiteId} onValueChange={(value) => setField("clientSiteId", value)} disabled={!siteOptions.length}>
            <SelectTrigger id="hosting-client-site" className={selectClass}><SelectValue placeholder={siteOptions.length ? "Select a client or business" : "No hosting-enabled clients"} /></SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              {siteOptions.map((site) => <SelectItem key={site.id} value={site.id}>{site.businessName} · {site.trade}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Domain" htmlFor="hosting-domain" hint="Use the domain only, for example example.com.">
          <Input id="hosting-domain" value={draft.domain} onChange={(event) => setField("domain", event.target.value)} placeholder="example.com" className={inputClass} autoComplete="url" />
        </Field>
        <Field label="Hosting status" htmlFor="hosting-status">
          <Select value={draft.hostingStatus} onValueChange={(value) => setField("hostingStatus", value)}>
            <SelectTrigger id="hosting-status" className={selectClass}><SelectValue /></SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">{HOSTING_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{prettyLabel(value)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Operational state" htmlFor="hosting-operational" hint="Use attention when a manual follow-up is open.">
          <Select value={draft.operationalStatus} onValueChange={(value) => setField("operationalStatus", value)}>
            <SelectTrigger id="hosting-operational" className={selectClass}><SelectValue /></SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">{HOSTING_OPERATIONAL_OPTIONS.map((value) => <SelectItem key={value} value={value}>{prettyLabel(value)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="SSL" htmlFor="hosting-ssl">
          <Select value={draft.sslStatus} onValueChange={(value) => setField("sslStatus", value)}>
            <SelectTrigger id="hosting-ssl" className={selectClass}><SelectValue /></SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">{SSL_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{prettyLabel(value)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="CDN" htmlFor="hosting-cdn">
          <Select value={draft.cdnStatus} onValueChange={(value) => setField("cdnStatus", value)}>
            <SelectTrigger id="hosting-cdn" className={selectClass}><SelectValue /></SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">{CDN_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{prettyLabel(value)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <div className="rounded-2xl border border-border bg-background/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capacity and checks</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Bandwidth used (GB)" htmlFor="hosting-bandwidth-used"><Input id="hosting-bandwidth-used" type="number" min="0" step="0.1" value={draft.bandwidthUsedGb} onChange={(event) => setField("bandwidthUsedGb", event.target.value)} className={inputClass} /></Field>
          <Field label="Bandwidth limit (GB)" htmlFor="hosting-bandwidth-limit"><Input id="hosting-bandwidth-limit" type="number" min="0" step="0.1" value={draft.bandwidthLimitGb} onChange={(event) => setField("bandwidthLimitGb", event.target.value)} className={inputClass} /></Field>
          <Field label="Storage used (GB)" htmlFor="hosting-storage-used"><Input id="hosting-storage-used" type="number" min="0" step="0.1" value={draft.storageUsedGb} onChange={(event) => setField("storageUsedGb", event.target.value)} className={inputClass} /></Field>
          <Field label="Storage limit (GB)" htmlFor="hosting-storage-limit"><Input id="hosting-storage-limit" type="number" min="0" step="0.1" value={draft.storageLimitGb} onChange={(event) => setField("storageLimitGb", event.target.value)} className={inputClass} /></Field>
          <Field label="Uptime (%)" htmlFor="hosting-uptime" hint="Leave blank until checked."><Input id="hosting-uptime" type="number" min="0" max="100" step="0.01" value={draft.uptimePercentage} onChange={(event) => setField("uptimePercentage", event.target.value)} placeholder="Not checked" className={inputClass} /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Last checked" htmlFor="hosting-last-checked"><Input id="hosting-last-checked" type="date" value={draft.lastCheckedAt} onChange={(event) => setField("lastCheckedAt", event.target.value)} className={inputClass} /></Field>
          <Field label="Next check" htmlFor="hosting-next-check"><Input id="hosting-next-check" type="date" value={draft.nextCheckDate} onChange={(event) => setField("nextCheckDate", event.target.value)} className={inputClass} /></Field>
          <Field label="Renewal date" htmlFor="hosting-renewal"><Input id="hosting-renewal" type="date" value={draft.renewalDate} onChange={(event) => setField("renewalDate", event.target.value)} className={inputClass} /></Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Next action needed" htmlFor="hosting-action" hint="Keep this manual and specific, such as “Confirm renewal date”."><Input id="hosting-action" value={draft.actionNeeded} onChange={(event) => setField("actionNeeded", event.target.value)} placeholder="No open action" className={inputClass} /></Field>
        <Field label="Internal notes" htmlFor="hosting-notes"><Textarea id="hosting-notes" value={draft.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Record provider, plan, or handover details." className="min-h-[88px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field>
      </div>

      {formError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="border-border bg-transparent text-foreground hover:bg-secondary">Cancel</Button>
        <Button type="submit" disabled={saving || !siteOptions.length} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving…" : record ? "Save changes" : "Add hosting record"}</Button>
      </div>
    </form>
  );
}

```
