# Central Hub source bundle, part 05: Social Revamp, Sales, Invoices, and Settings

This part contains the complete current source for the Social Revamp, Sales Desk, invoice, billing, and Settings sections.

## Manifest

1. `src/components/hub/SocialRevampWorkspace.tsx`, the Social Revamp and Marketing workspace with client-linked records, filters, and review dialogs
2. `src/components/hub/SocialRevampDetail.tsx`, the client-ready Social Revamp pack review, export, and approval view
3. `src/components/hub/SocialRevampRecordForm.tsx`, the Social Revamp brief, profile, asset, workflow, and handoff form
4. `src/components/hub/SalesPlaybookWorkspace.tsx`, the private sales call desk with talking points and package comparison
5. `src/components/hub/InvoiceWorkspace.tsx`, the invoice register, draft editor orchestration, and saved-record operations
6. `src/components/hub/InvoiceForm.tsx`, the invoice client, scope, terms, and draft editor
7. `src/components/hub/InvoiceList.tsx`, the searchable invoice register and status actions
8. `src/components/hub/InvoicePreview.tsx`, the branded print-ready invoice preview and payment instructions
9. `src/components/hub/InvoiceSettingsWorkspace.tsx`, private invoice identity, branding, payment, and default settings
10. `src/pages/BillingDashboard.tsx`, the read-only operator billing and payment-connection view
11. `src/components/hub/SettingsWorkspace.tsx`, workspace preferences, account access, team access, and integration destinations

`src/components/hub/ComingSoonWorkspace.tsx` is intentionally omitted because it is not imported by the authenticated Hub route.

This is a documentation-only source capture. The exact current source is preserved below in manifest order, with no omitted sections, placeholders, user records, secrets, deployment URLs, or generated artifacts.

## src/components/hub/SocialRevampWorkspace.tsx

```tsx
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Edit3, Eye, Plus, RefreshCw, Search, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialRevampRecord as SocialRevampEntity } from "@/entities";
import { SocialRevampRecordForm } from "@/components/hub/SocialRevampRecordForm";
import { SocialRevampDetail } from "@/components/hub/SocialRevampDetail";
import type { ClientSite } from "@/lib/hub-data";
import { clientKindLabel, packageLabel, websiteSourceLabel } from "@/lib/hub-data";
import { errorMessage, normalizeSocialAssets, normalizeSocialHistory, normalizeSocialPlatforms, normalizeSocialProfileUrls, oneOf, readNumber, readText, SOCIAL_REVAMP_PLATFORM_OPTIONS, SOCIAL_REVAMP_STATUS_OPTIONS, socialRevampNeedsAttention, socialRevampPlatformLabel, socialRevampStatusLabel, type SocialRevampPlatform, type SocialRevampRecord, type SocialRevampRecordInput, type SocialRevampStatus } from "@/lib/hub-operations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "unavailable";
type Props = { sites: ClientSite[]; sitesState: LoadState; search: string; onSearchChange: (value: string) => void; refreshKey: number; onMutation?: () => void; onOpenCalendar?: (siteId: string) => void };
function mapRecord(value: unknown): SocialRevampRecord | null { if (!value || typeof value !== "object") return null; const raw = value as Record<string, unknown>; const id = readText(raw.id); if (!id) return null; return { id, clientSiteId: readText(raw.clientSiteId), businessName: readText(raw.businessName, "Unnamed business"), selectedPlatforms: normalizeSocialPlatforms(raw.selectedPlatforms), sourceProfileUrls: normalizeSocialProfileUrls(raw.sourceProfileUrls), clientBrief: readText(raw.clientBrief), audience: readText(raw.audience), servicesOffers: readText(raw.servicesOffers), location: readText(raw.location), goals: readText(raw.goals), primaryCta: readText(raw.primaryCta), brandVoice: readText(raw.brandVoice), visualDirection: readText(raw.visualDirection), constraints: readText(raw.constraints), uploadedAssets: normalizeSocialAssets(raw.uploadedAssets), status: oneOf(raw.status, SOCIAL_REVAMP_STATUS_OPTIONS, "brief_collected"), revisionNotes: readText(raw.revisionNotes), nextAction: readText(raw.nextAction), operatorNotes: readText(raw.operatorNotes), approvalConfirmed: raw.approvalConfirmed === true, approvedBy: readText(raw.approvedBy), approvedAt: readText(raw.approvedAt), deliveryDate: readText(raw.deliveryDate), deliveryRecipient: readText(raw.deliveryRecipient), deliveryNotes: readText(raw.deliveryNotes), version: Math.max(1, readNumber(raw.version, 1)), versionHistory: normalizeSocialHistory(raw.versionHistory), lastUpdatedAt: readText(raw.lastUpdatedAt || raw.updated_at), created_at: readText(raw.created_at), updated_at: readText(raw.updated_at) }; }
function formatDate(value: string) { const time = Date.parse(value); return Number.isFinite(time) ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(time) : "Not recorded"; }
function siteMatches(site: ClientSite, query: string) { return !query || [site.businessName, site.trade, site.location, site.website, site.email, site.clientKind, site.websiteSource].some((value) => String(value || "").toLowerCase().includes(query)); }
function prettyDate(value: string) { return value ? formatDate(value) : "Not set"; }

export function SocialRevampWorkspace({ sites, sitesState, search, onSearchChange, refreshKey, onMutation, onOpenCalendar }: Props) {
  const [records, setRecords] = useState<SocialRevampRecord[]>([]); const [recordsState, setRecordsState] = useState<LoadState>("loading"); const [loadError, setLoadError] = useState(""); const [retryKey, setRetryKey] = useState(0); const [statusFilter, setStatusFilter] = useState<"all" | SocialRevampStatus>("all"); const [platformFilter, setPlatformFilter] = useState<"all" | SocialRevampPlatform>("all"); const [selectedClientId, setSelectedClientId] = useState(""); const [formOpen, setFormOpen] = useState(false); const [detailOpen, setDetailOpen] = useState(false); const [editing, setEditing] = useState<SocialRevampRecord | null>(null);
  useEffect(() => { let cancelled = false; setRecordsState("loading"); setLoadError(""); const load = async () => { try { const result = await (SocialRevampEntity as any).list("-updated_at", 300); if (cancelled) return; if (!Array.isArray(result)) throw new Error("Invalid social revamp response"); setRecords(result.map(mapRecord).filter(Boolean) as SocialRevampRecord[]); setRecordsState("ready"); } catch (error) { if (!cancelled) { console.warn("Failed to load social revamp records", error); setRecords([]); setRecordsState("unavailable"); setLoadError("Social revamp records could not be loaded. Try again before changing a client pack."); } } }; void load(); return () => { cancelled = true; }; }, [refreshKey, retryKey]);
  const query = search.trim().toLowerCase(); const visibleSites = useMemo(() => sites.filter((site) => siteMatches(site, query)), [query, sites]); const activeClientId = selectedClientId || (visibleSites.length === 1 ? visibleSites[0].id : "");
  const visibleRecords = useMemo(() => records.filter((record) => { const site = sites.find((item) => item.id === record.clientSiteId); const searchValues = [record.businessName, record.clientBrief, record.audience, record.nextAction, site?.businessName, site?.trade, site?.location]; const matchesSearch = !query || searchValues.some((value) => String(value || "").toLowerCase().includes(query)); return (!selectedClientId || record.clientSiteId === selectedClientId) && matchesSearch && (statusFilter === "all" || record.status === statusFilter) && (platformFilter === "all" || record.selectedPlatforms.includes(platformFilter)); }).sort((left, right) => (Date.parse(right.lastUpdatedAt) || 0) - (Date.parse(left.lastUpdatedAt) || 0)), [platformFilter, query, records, selectedClientId, sites, statusFilter]);
  const attentionCount = records.filter((record) => socialRevampNeedsAttention(record)).length; const openCreate = () => { setEditing(null); setFormOpen(true); }; const openDetail = (record: SocialRevampRecord) => { setEditing(record); setDetailOpen(true); };
  const saveRecord = async (payload: SocialRevampRecordInput, existing?: SocialRevampRecord | null) => { try { if (existing) await (SocialRevampEntity as any).update(existing.id, payload); else await (SocialRevampEntity as any).create(payload); setFormOpen(false); setDetailOpen(false); setEditing(null); setRetryKey((value) => value + 1); onMutation?.(); toast.success(existing ? "Social revamp version saved" : "Social revamp brief saved"); } catch (error) { throw new Error(errorMessage(error, "The social revamp record could not be saved. Check private workspace access and try again.")); } };
  const clearFilters = () => { onSearchChange(""); setSelectedClientId(""); setStatusFilter("all"); setPlatformFilter("all"); };

  return <section className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="social-revamp-title"><div className="flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"><Share2 className="h-3.5 w-3.5" aria-hidden="true" />Paid delivery workspace</div><h2 id="social-revamp-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-ivory">Social Revamp &amp; Marketing</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Build one custom, approval-ready social identity for each client from their real offer, public profiles, and supplied assets. This foundation records the work without logging in or publishing for you.</p></div><Button type="button" onClick={openCreate} disabled={recordsState !== "ready"} className="h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" aria-hidden="true" />New social revamp</Button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Saved revamps</p><p className="mt-2 font-display text-3xl font-bold text-ivory">{recordsState === "ready" ? records.length : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">Private client-linked packs</p></div><div className={cn("rounded-2xl border bg-card p-4", attentionCount ? "border-warning/25" : "border-border")}><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Needs a next step</p><p className={cn("mt-2 font-display text-3xl font-bold", attentionCount ? "text-warning" : "text-ivory")}>{recordsState === "ready" ? attentionCount : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">Review, delivery, or action follow-ups</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Approved or delivered</p><p className="mt-2 font-display text-3xl font-bold text-cyan-accent">{recordsState === "ready" ? records.filter((record) => ["approved", "delivered", "ongoing_marketing"].includes(record.status)).length : "No data"}</p><p className="mt-1 text-xs text-muted-foreground">Manual approval milestones</p></div></div><div className="mt-6 rounded-2xl border border-border bg-card/70 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search client, brief, audience, or next action" aria-label="Search social revamps" className="h-10 border-border bg-background/70 pl-10 text-foreground placeholder:text-muted-foreground" /></div><div className="flex flex-wrap gap-2"><Select value={selectedClientId || "all"} onValueChange={(value) => setSelectedClientId(value === "all" ? "" : value)}><SelectTrigger className="h-10 w-[190px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter by client"><SelectValue placeholder="All clients" /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All clients</SelectItem>{visibleSites.map((site) => <SelectItem key={site.id} value={site.id}>{site.businessName}</SelectItem>)}</SelectContent></Select><Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value as typeof platformFilter)}><SelectTrigger className="h-10 w-[140px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter by platform"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All platforms</SelectItem>{SOCIAL_REVAMP_PLATFORM_OPTIONS.map((value) => <SelectItem key={value} value={value}>{socialRevampPlatformLabel(value)}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><SelectTrigger className="h-10 w-[150px] border-border bg-background/70 text-xs text-foreground" aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="all">All stages</SelectItem>{SOCIAL_REVAMP_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{socialRevampStatusLabel(value)}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" onClick={() => setRetryKey((value) => value + 1)} className="h-10 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Refresh</Button></div></div></div>{sitesState === "unavailable" && <p className="mt-4 flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-xs text-warning"><AlertCircle className="h-4 w-4" aria-hidden="true" />Client names are unavailable. Existing private packs remain safe to review, and you can still create a client inline when starting a new pack.</p>}{recordsState === "unavailable" && <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-300" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold text-ivory">Social revamp records are unavailable</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{loadError} No changes have been made.</p><Button type="button" variant="outline" onClick={() => setRetryKey((value) => value + 1)} className="mt-5 gap-2 border-border bg-card text-foreground hover:bg-secondary"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</Button></div>}{recordsState === "loading" && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-72 rounded-2xl bg-card" /><Skeleton className="h-72 rounded-2xl bg-card" /><Skeleton className="h-72 rounded-2xl bg-card" /></div>}{recordsState === "ready" && visibleRecords.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"><Share2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold text-ivory">{records.length ? "No revamps match these filters" : "No social revamps yet"}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{records.length ? "Clear a filter or search another client. Saved packs remain unchanged." : "Start with the client’s actual offer, choose the profiles they paid to refresh, and save the first approval-ready brief."}</p><div className="mt-5 flex justify-center gap-2">{records.length ? <Button type="button" variant="outline" onClick={clearFilters} className="border-border bg-card text-foreground hover:bg-secondary">Clear filters</Button> : <Button type="button" onClick={openCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" aria-hidden="true" />Create first revamp</Button>}</div></div>}{recordsState === "ready" && visibleRecords.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleRecords.map((record, index) => { const site = sites.find((item) => item.id === record.clientSiteId); const attention = socialRevampNeedsAttention(record); return <motion.article key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/25"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{socialRevampStatusLabel(record.status)}</span>{attention && <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">Attention</span>}</div><h3 className="mt-3 truncate font-display text-lg font-semibold text-ivory">{site?.businessName || record.businessName}</h3><p className="mt-1 text-sm text-muted-foreground">Version {record.version} · Updated {formatDate(record.lastUpdatedAt)}</p></div><Share2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /></div><div className="mt-4 flex flex-wrap gap-1.5">{record.selectedPlatforms.map((platform) => <span key={platform} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">{socialRevampPlatformLabel(platform)}</span>)}{(site?.activePackages || []).map((packageId) => <span key={packageId} className="rounded-full border border-cyan-accent/20 bg-cyan-accent/[0.06] px-2 py-0.5 text-[10px] text-cyan-accent">{packageLabel(packageId)}</span>)}<span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{site ? `${clientKindLabel(site.clientKind)} · ${websiteSourceLabel(site.websiteSource)}` : "Client record unavailable"}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/80 pt-4 text-xs"><div><p className="text-muted-foreground">Assets</p><p className="mt-1 font-medium text-ivory">{record.uploadedAssets.length || "None"}</p></div><div><p className="text-muted-foreground">Delivery</p><p className="mt-1 font-medium text-ivory">{prettyDate(record.deliveryDate)}</p></div></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{record.clientBrief || "Brief still needs the client’s point of view."}</p><div className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Next action</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground">{record.nextAction || "Add the next manual action."}</p></div><div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={() => openDetail(record)} className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"><Eye className="h-3.5 w-3.5" aria-hidden="true" />Open pack</Button><Button type="button" variant="outline" onClick={() => openDetail(record)} className="h-9 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />Edit</Button>{onOpenCalendar && <Button type="button" variant="outline" onClick={() => onOpenCalendar(record.clientSiteId)} disabled={!record.clientSiteId} className="h-9 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Calendar</Button>}</div></motion.article>; })}</div>}<Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditing(null); } }}><DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-6xl"><DialogHeader><DialogTitle className="font-display text-xl text-ivory">Create social revamp brief</DialogTitle><DialogDescription className="text-muted-foreground">Capture the client’s inputs and supplied assets before the custom strategy and visual studio phase.</DialogDescription></DialogHeader><SocialRevampRecordForm key={`new-social-${activeClientId}`} sites={sites} defaultClientSiteId={activeClientId} onSave={saveRecord} onCancel={() => setFormOpen(false)} onClientCreated={() => onMutation?.()} /></DialogContent></Dialog><Dialog open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setEditing(null); } }}><DialogContent className="max-h-[94vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-6xl"><DialogHeader><DialogTitle className="font-display text-xl text-ivory">{editing?.businessName || "Social revamp pack"}</DialogTitle><DialogDescription className="text-muted-foreground">Review the working brief, record approval, and prepare a client-ready pack for manual application.</DialogDescription></DialogHeader>{editing && <SocialRevampDetail record={editing} site={sites.find((site) => site.id === editing.clientSiteId)} sites={sites} onSave={(payload) => saveRecord(payload, editing)} onCancel={() => { setDetailOpen(false); setEditing(null); }} onOpenCalendar={onOpenCalendar} />}</DialogContent></Dialog></section>;
}

```

## src/components/hub/SocialRevampDetail.tsx

```tsx
import { useMemo, useState } from "react";
import { CalendarDays, Clipboard, Download, ExternalLink, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SocialRevampRecordForm } from "@/components/hub/SocialRevampRecordForm";
import type { ClientSite } from "@/lib/hub-data";
import { clientKindLabel, websiteSourceLabel } from "@/lib/hub-data";
import { safeExternalUrl, socialRevampPlatformLabel, socialRevampStatusLabel, type SocialRevampRecord, type SocialRevampRecordInput } from "@/lib/hub-operations";
import { toast } from "sonner";

type Props = { record: SocialRevampRecord; site?: ClientSite; sites: ClientSite[]; onSave: (payload: SocialRevampRecordInput) => Promise<void>; onCancel: () => void; onOpenCalendar?: (siteId: string) => void };
function formatDate(value: string) { const time = Date.parse(value); return Number.isFinite(time) ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(time) : "Not recorded"; }
function formatBytes(value: number) { if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function plainPack(record: SocialRevampRecord, site?: ClientSite) { return [`${record.businessName} · Social Revamp Pack v${record.version}`, `Status: ${socialRevampStatusLabel(record.status)}`, `Platforms: ${record.selectedPlatforms.map(socialRevampPlatformLabel).join(", ") || "Not selected"}`, site ? `Client record: ${clientKindLabel(site.clientKind)} · ${websiteSourceLabel(site.websiteSource)}` : "Client record: linked record", "", "Client brief", record.clientBrief || "Not supplied", "", "Audience", record.audience || "Not supplied", "", "Offer", record.servicesOffers || "Not supplied", "", "Goals", record.goals || "Not supplied", "", "Primary CTA", record.primaryCta || "Not supplied", "", "Brand voice", record.brandVoice || "Not supplied", "", "Visual direction", record.visualDirection || "Not supplied", "", `Next action: ${record.nextAction || "Not recorded"}`, "", "Final profile changes are applied manually inside each social account. This pack does not log in, publish, or schedule."].join("\n"); }
function DetailBlock({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-background/35 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{value || "Not supplied"}</p></div>; }

export function SocialRevampDetail({ record, site, sites, onSave, onCancel, onOpenCalendar }: Props) {
  const [editing, setEditing] = useState(false); const [copying, setCopying] = useState(false); const platformLinks = useMemo(() => record.selectedPlatforms.map((platform) => ({ platform, url: record.sourceProfileUrls[platform] || "" })), [record]); const packText = useMemo(() => plainPack(record, site), [record, site]);
  const copyPack = async () => { if (!navigator.clipboard) { toast.error("Copy is unavailable in this browser. Use the download or print option."); return; } setCopying(true); try { await navigator.clipboard.writeText(packText); toast.success("Client-ready pack copied as plain text"); } catch { toast.error("Copy was blocked by the browser. Use the download instead."); } finally { setCopying(false); } };
  const downloadPack = () => { const blob = new Blob([packText], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${record.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "social-revamp"}-v${record.version}-pack.txt`; link.click(); URL.revokeObjectURL(url); };
  if (editing) return <SocialRevampRecordForm sites={sites} record={record} onSave={onSave} onCancel={() => setEditing(false)} />;
  return <div className="space-y-5"><div className="print-hide flex flex-wrap gap-2"><Button type="button" onClick={() => setEditing(true)} className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit working brief</Button><Button type="button" variant="outline" onClick={() => void copyPack()} disabled={copying} className="h-9 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><Clipboard className="h-3.5 w-3.5" aria-hidden="true" />{copying ? "Copying…" : "Copy pack"}</Button><Button type="button" variant="outline" onClick={downloadPack} className="h-9 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><Download className="h-3.5 w-3.5" aria-hidden="true" />Download text</Button><Button type="button" variant="outline" onClick={() => window.print()} className="h-9 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><Printer className="h-3.5 w-3.5" aria-hidden="true" />Print pack</Button>{onOpenCalendar && <Button type="button" variant="outline" onClick={() => onOpenCalendar(record.clientSiteId)} disabled={!record.clientSiteId} className="h-9 gap-1.5 border-border bg-transparent text-foreground hover:bg-secondary"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Open calendar</Button>}</div><div className="social-revamp-print-surface space-y-6"><div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Client-ready social revamp pack</p><h3 className="mt-2 font-display text-3xl font-bold tracking-tight text-ivory">{record.businessName}</h3><p className="mt-2 text-sm text-muted-foreground">Version {record.version} · {socialRevampStatusLabel(record.status)} · Last saved {formatDate(record.lastUpdatedAt)}</p></div><div className="rounded-2xl border border-border bg-background/40 px-4 py-3 text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Approval</p><p className="mt-1 text-sm font-semibold text-ivory">{record.approvalConfirmed ? "Recorded" : "Pending"}</p>{record.approvedBy && <p className="mt-1 text-xs text-muted-foreground">{record.approvedBy}</p>}</div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{platformLinks.map(({ platform, url }) => <div key={platform} className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-xs font-semibold text-ivory">{socialRevampPlatformLabel(platform)}</p>{url ? <a href={safeExternalUrl(url) || undefined} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-cyan-accent underline decoration-cyan-accent/40 underline-offset-2">{url}</a> : <p className="mt-2 text-xs leading-5 text-muted-foreground">Public profile link not supplied</p>}</div>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><DetailBlock label="Client record" value={site ? `${clientKindLabel(site.clientKind)} · ${websiteSourceLabel(site.websiteSource)}${site.location ? ` · ${site.location}` : ""}` : "Linked ClientSite details unavailable"} /><DetailBlock label="Priority audience" value={record.audience} /><DetailBlock label="Services, products, or offers" value={record.servicesOffers} /><DetailBlock label="Business goals" value={record.goals} /><DetailBlock label="Primary call to action" value={record.primaryCta} /><DetailBlock label="Client brief" value={record.clientBrief} /></div><div className="grid gap-3 md:grid-cols-2"><DetailBlock label="Brand voice" value={record.brandVoice} /><DetailBlock label="Visual direction" value={record.visualDirection} /><DetailBlock label="Constraints or exclusions" value={record.constraints} /><DetailBlock label="Revision notes" value={record.revisionNotes} /></div><section><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Supplied assets</p><p className="mt-1 text-xs text-muted-foreground">Private files to reference while preparing the approved revamp.</p></div><p className="text-xs text-foreground">{record.uploadedAssets.length} recorded</p></div>{record.uploadedAssets.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{record.uploadedAssets.map((asset) => <div key={asset.id} className="rounded-xl border border-border bg-background/35 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-ivory">{asset.fileName}</p><p className="mt-1 text-[11px] text-muted-foreground">{asset.assetType} · {formatBytes(asset.fileSize)} · {asset.fileType || "File"}</p></div>{safeExternalUrl(asset.privateFileUrl) && <a href={safeExternalUrl(asset.privateFileUrl)} target="_blank" rel="noreferrer" className="shrink-0 text-cyan-accent" aria-label={`Open ${asset.fileName}`}><ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}</div>{asset.notes && <p className="mt-2 text-xs leading-5 text-muted-foreground">{asset.notes}</p>}</div>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">No client assets have been supplied yet.</p>}</section><section className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Approval checklist</p><ul className="mt-3 space-y-2 text-sm text-foreground"><li>{record.clientBrief ? "✓" : "○"} Brief supplied</li><li>{record.selectedPlatforms.length ? "✓" : "○"} Platforms selected</li><li>{record.approvalConfirmed ? "✓" : "○"} Client approval recorded</li><li>{record.deliveryDate ? "✓" : "○"} Delivery date recorded</li></ul></div><div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Delivery notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{record.deliveryNotes || "No delivery notes recorded."}</p><p className="mt-3 text-xs text-muted-foreground">Recipient: {record.deliveryRecipient || "Not recorded"}</p></div></section><section className="rounded-2xl border border-warning/25 bg-warning/[0.05] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">Application instructions</p><p className="mt-2 text-sm leading-6 text-foreground">The operator or client applies the final profile edits inside Facebook, Instagram, LinkedIn, and TikTok. This pack does not request account passwords, log in, auto-publish, schedule posts, or change ad settings.</p><p className="mt-3 text-sm font-medium text-ivory">Next action: {record.nextAction || "Record the next manual action."}</p></section>{record.versionHistory.length > 0 && <section className="print-hide rounded-2xl border border-border bg-background/30 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Version history</p><div className="mt-3 space-y-2">{[...record.versionHistory].reverse().map((entry) => <div key={`${entry.version}-${entry.savedAt}`} className="flex flex-wrap justify-between gap-2 text-xs"><span className="text-ivory">Version {entry.version} · {socialRevampStatusLabel(entry.status)}</span><span className="text-muted-foreground">{formatDate(entry.savedAt)}</span></div>)}</div></section>}</div></div>;
}

```

## src/components/hub/SocialRevampRecordForm.tsx

```tsx
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Check, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientSiteManualForm, type ClientSiteCreated } from "@/components/hub/ClientSiteManualForm";
import { uploadFile } from "@/integrations/core";
import type { ClientSite } from "@/lib/hub-data";
import { clientKindLabel, packageLabel, websiteSourceLabel } from "@/lib/hub-data";
import { dateInputValue, errorMessage, normalizeSocialHistory, safeExternalUrl, SOCIAL_REVAMP_ASSET_TYPES, SOCIAL_REVAMP_PLATFORM_OPTIONS, SOCIAL_REVAMP_STATUS_OPTIONS, storedDateValue, type SocialRevampAsset, type SocialRevampAssetType, type SocialRevampPlatform, type SocialRevampRecord, type SocialRevampRecordInput, type SocialRevampSourceProfileUrls, type SocialRevampStatus } from "@/lib/hub-operations";

const inputClass = "h-10 border-border bg-background/70 text-foreground placeholder:text-muted-foreground";
const selectClass = "h-10 border-border bg-background/70 text-foreground";
const EMPTY_URLS: SocialRevampSourceProfileUrls = { facebook: "", instagram: "", linkedin: "", tiktok: "" };

type Props = { sites: ClientSite[]; defaultClientSiteId?: string; record?: SocialRevampRecord | null; onSave: (payload: SocialRevampRecordInput) => Promise<void>; onCancel: () => void; onClientCreated?: (site?: ClientSiteCreated) => void | Promise<void> };
type Draft = { clientSiteId: string; businessName: string; selectedPlatforms: SocialRevampPlatform[]; sourceProfileUrls: SocialRevampSourceProfileUrls; clientBrief: string; audience: string; servicesOffers: string; location: string; goals: string; primaryCta: string; brandVoice: string; visualDirection: string; constraints: string; uploadedAssets: SocialRevampAsset[]; status: SocialRevampStatus; revisionNotes: string; nextAction: string; operatorNotes: string; approvalConfirmed: boolean; approvedBy: string; approvedAt: string; deliveryDate: string; deliveryRecipient: string; deliveryNotes: string };

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) { return <div className="space-y-2"><Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>{children}{hint && <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p>}</div>; }
function profileUrlsForSite(site?: ClientSite): SocialRevampSourceProfileUrls { const legacy = site?.socialLinks || {}; const links = site?.socialLinkList || []; const fromList = (name: string) => links.find((item) => item.platform.toLowerCase().replace(/[\s-]/g, "").includes(name))?.url || ""; return { facebook: legacy.facebookUrl || fromList("facebook"), instagram: legacy.instagramUrl || fromList("instagram"), linkedin: legacy.linkedinUrl || fromList("linkedin"), tiktok: legacy.tiktokUrl || fromList("tiktok") }; }
function makeDraft(record: SocialRevampRecord | null | undefined, site: ClientSite | undefined, defaultClientSiteId = ""): Draft { const contact = site?.contactDetails; const sourceUrls = profileUrlsForSite(site); const preselected = SOCIAL_REVAMP_PLATFORM_OPTIONS.filter((platform) => Boolean(sourceUrls[platform])); return { clientSiteId: record?.clientSiteId || defaultClientSiteId, businessName: record?.businessName || site?.businessName || "", selectedPlatforms: record?.selectedPlatforms?.length ? record.selectedPlatforms : preselected, sourceProfileUrls: record?.sourceProfileUrls || sourceUrls, clientBrief: record?.clientBrief || "", audience: record?.audience || "", servicesOffers: record?.servicesOffers || site?.services?.join(", ") || "", location: record?.location || site?.location || contact?.serviceAreas?.join(", ") || "", goals: record?.goals || "", primaryCta: record?.primaryCta || "", brandVoice: record?.brandVoice || "", visualDirection: record?.visualDirection || "", constraints: record?.constraints || "", uploadedAssets: record?.uploadedAssets || [], status: record?.status || "brief_collected", revisionNotes: record?.revisionNotes || "", nextAction: record?.nextAction || "", operatorNotes: record?.operatorNotes || "", approvalConfirmed: record?.approvalConfirmed === true, approvedBy: record?.approvedBy || "", approvedAt: dateInputValue(record?.approvedAt), deliveryDate: dateInputValue(record?.deliveryDate), deliveryRecipient: record?.deliveryRecipient || "", deliveryNotes: record?.deliveryNotes || "" }; }
function compactObject(value: Record<string, unknown>) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")); }
function formatBytes(value: number) { if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function localClient(created: ClientSiteCreated): ClientSite { return { id: created.id || `local-${Date.now()}`, businessName: created.businessName, trade: "Business type not set", status: "draft", tier: "None", mrr: 0, health: 0, uptime: 0, location: "Location not set", lastActivity: "just now", clientKind: "client", websiteSource: "no_website", activePackages: [] }; }

export function SocialRevampRecordForm({ sites, defaultClientSiteId, record, onSave, onCancel, onClientCreated }: Props) {
  const [createdClient, setCreatedClient] = useState<ClientSite | null>(null);
  const availableSites = useMemo(() => createdClient && !sites.some((site) => site.id === createdClient.id) ? [...sites, createdClient] : sites, [createdClient, sites]);
  const initialSite = availableSites.find((site) => site.id === (record?.clientSiteId || defaultClientSiteId));
  const [draft, setDraft] = useState<Draft>(() => makeDraft(record, initialSite, defaultClientSiteId));
  const selectedSite = availableSites.find((site) => site.id === draft.clientSiteId);
  const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false); const [clientDialogOpen, setClientDialogOpen] = useState(false); const [assetType, setAssetType] = useState<SocialRevampAssetType>("reference"); const [assetNotes, setAssetNotes] = useState(""); const [formError, setFormError] = useState("");
  const setField = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const togglePlatform = (platform: SocialRevampPlatform, checked: boolean) => setField("selectedPlatforms", checked ? [...draft.selectedPlatforms, platform] : draft.selectedPlatforms.filter((item) => item !== platform));
  const selectClient = (clientSiteId: string) => { const site = availableSites.find((item) => item.id === clientSiteId); setDraft((current) => ({ ...current, clientSiteId, businessName: site?.businessName || current.businessName, location: site?.location === "Location not set" ? "" : site?.location || current.location, servicesOffers: site?.services?.join(", ") || current.servicesOffers, sourceProfileUrls: profileUrlsForSite(site), selectedPlatforms: site ? SOCIAL_REVAMP_PLATFORM_OPTIONS.filter((platform) => Boolean(profileUrlsForSite(site)[platform])) : current.selectedPlatforms })); };
  const handleClientCreated = async (created?: ClientSiteCreated) => { if (!created?.businessName) return; const client = localClient(created); setCreatedClient(client); setDraft((current) => ({ ...current, clientSiteId: client.id, businessName: client.businessName, location: "", servicesOffers: "", sourceProfileUrls: EMPTY_URLS, selectedPlatforms: [] })); setClientDialogOpen(false); await onClientCreated?.(created); };

  const handleAssetUpload = async (file?: File) => { if (!file) return; if (!(file.type.startsWith("image/") || file.type === "application/pdf")) { setFormError("Upload an image or PDF logo, photo, banner, or reference file."); return; } if (file.size > 10 * 1024 * 1024) { setFormError("Keep each supplied asset under 10 MB."); return; } setFormError(""); setUploading(true); try { const result = await uploadFile({ file }); if (!result?.file_url) throw new Error("The upload did not return a usable private file link."); const asset: SocialRevampAsset = { id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size, assetType, privateFileUrl: result.file_url, uploadedAt: new Date().toISOString(), notes: assetNotes.trim() }; setField("uploadedAssets", [...draft.uploadedAssets, asset]); setAssetNotes(""); } catch (error) { setFormError(errorMessage(error, "The asset could not be uploaded. Try again or save the brief without it.")); } finally { setUploading(false); } };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setFormError(""); const errors: string[] = []; const selectedPlatforms = [...draft.selectedPlatforms]; const sourceProfileUrls = { ...EMPTY_URLS }; selectedPlatforms.forEach((platform) => { const value = draft.sourceProfileUrls[platform].trim(); if (value && !safeExternalUrl(value)) errors.push(`Add a valid public ${platform} profile link or leave it blank.`); sourceProfileUrls[platform] = value ? safeExternalUrl(value) : ""; }); const approvalDate = draft.approvalConfirmed ? storedDateValue(draft.approvedAt) || new Date().toISOString() : ""; const deliveryDate = storedDateValue(draft.deliveryDate); if (!draft.clientSiteId) errors.push("Choose a client or create a new client record first."); if (!draft.businessName.trim()) errors.push("Add the business name for this revamp."); if (!selectedPlatforms.length) errors.push("Select at least one social platform for the revamp."); if (draft.approvedAt.trim() && !approvalDate) errors.push("Approval date must be a valid date or left blank."); if (draft.deliveryDate.trim() && !deliveryDate) errors.push("Delivery date must be a valid date or left blank."); if (["approved", "delivered", "ongoing_marketing"].includes(draft.status) && (!draft.approvalConfirmed || !draft.approvedBy.trim())) errors.push("Record who approved the revamp before moving it beyond client review."); if (draft.status === "delivered" && (!deliveryDate || !draft.deliveryRecipient.trim())) errors.push("Add a delivery date and recipient before marking the revamp delivered."); if (errors.length) { setFormError(errors[0]); return; } const now = new Date().toISOString(); const history = normalizeSocialHistory(record?.versionHistory); const previous = record && !history.some((entry) => entry.version === record.version) ? [{ version: record.version, status: record.status, savedAt: record.lastUpdatedAt || now, approvedAt: record.approvedAt, deliveryDate: record.deliveryDate, notes: record.revisionNotes || record.operatorNotes || "" }] : []; const payload = compactObject({ clientSiteId: draft.clientSiteId, businessName: draft.businessName.trim(), selectedPlatforms, sourceProfileUrls, clientBrief: draft.clientBrief.trim(), audience: draft.audience.trim(), servicesOffers: draft.servicesOffers.trim(), location: draft.location.trim(), goals: draft.goals.trim(), primaryCta: draft.primaryCta.trim(), brandVoice: draft.brandVoice.trim(), visualDirection: draft.visualDirection.trim(), constraints: draft.constraints.trim(), uploadedAssets: draft.uploadedAssets.length ? draft.uploadedAssets : undefined, status: draft.status, revisionNotes: draft.revisionNotes.trim(), nextAction: draft.nextAction.trim(), operatorNotes: draft.operatorNotes.trim(), approvalConfirmed: draft.approvalConfirmed, approvedBy: draft.approvedBy.trim(), approvedAt: approvalDate || undefined, deliveryDate: deliveryDate || undefined, deliveryRecipient: draft.deliveryRecipient.trim(), deliveryNotes: draft.deliveryNotes.trim(), version: record ? record.version + 1 : 1, versionHistory: [...history, ...previous], lastUpdatedAt: now }) as SocialRevampRecordInput; setSaving(true); try { await onSave(payload); } catch (error) { setFormError(errorMessage(error, "The social revamp brief could not be saved.")); } finally { setSaving(false); } };

  return <><form onSubmit={handleSubmit} className="space-y-6"><p className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-xs leading-5 text-muted-foreground">This workspace prepares a custom revamp pack from public profile links and supplied brand assets. It never asks for passwords, logs into accounts, or publishes changes.</p><section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><h3 className="font-display text-lg font-semibold text-ivory">Client record</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Use any saved ClientSite, including an external website, no-website, marketing-only, or owner-business record.</p></div><Button type="button" variant="outline" onClick={() => setClientDialogOpen(true)} className="h-9 shrink-0 gap-1.5 border-primary/25 bg-primary/[0.06] text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" aria-hidden="true" />Create client</Button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Client / business" htmlFor="social-client"><Select value={draft.clientSiteId || "none"} onValueChange={(value) => value !== "none" && selectClient(value)}><SelectTrigger id="social-client" className={selectClass}><SelectValue placeholder="Select a client or business" /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground"><SelectItem value="none">Select a client or business</SelectItem>{availableSites.map((site) => <SelectItem key={site.id} value={site.id}>{site.businessName} · {site.trade}</SelectItem>)}</SelectContent></Select></Field><Field label="Business name snapshot" htmlFor="social-business" hint="Prefilled from the selected record. Confirm the spelling before saving."><Input id="social-business" value={draft.businessName} onChange={(event) => setField("businessName", event.target.value)} placeholder="Business name" className={inputClass} /></Field></div>{selectedSite && <div className="flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-muted-foreground">{clientKindLabel(selectedSite.clientKind)}</span><span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-muted-foreground">{websiteSourceLabel(selectedSite.websiteSource)}</span>{(selectedSite.activePackages || []).map((item) => <span key={item} className="rounded-full border border-cyan-accent/20 bg-cyan-accent/[0.06] px-2.5 py-1 text-cyan-accent">{packageLabel(item)}</span>)}</div>}</section><section className="space-y-4"><div><h3 className="font-display text-lg font-semibold text-ivory">Profiles to revamp</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Select the channels covered by the paid revamp. Add public links only. A missing link can be supplied later.</p></div><div className="grid gap-3 sm:grid-cols-2">{SOCIAL_REVAMP_PLATFORM_OPTIONS.map((platform) => { const selected = draft.selectedPlatforms.includes(platform); return <div key={platform} className={`rounded-2xl border p-4 transition-colors ${selected ? "border-primary/30 bg-primary/[0.05]" : "border-border bg-background/35"}`}><label className="flex cursor-pointer items-center gap-3"><Checkbox checked={selected} onCheckedChange={(value) => togglePlatform(platform, value === true)} className="mt-0.5" /><span className="text-sm font-medium text-ivory">{platform === "linkedin" ? "LinkedIn" : platform[0].toUpperCase() + platform.slice(1)}</span>{selected && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden="true" />}</label>{selected && <Input value={draft.sourceProfileUrls[platform]} onChange={(event) => setDraft((current) => ({ ...current, sourceProfileUrls: { ...current.sourceProfileUrls, [platform]: event.target.value } }))} placeholder={`Public ${platform} profile URL`} className={`mt-3 ${inputClass}`} aria-label={`${platform} public profile URL`} />}</div>; })}</div></section><section className="space-y-4"><div><h3 className="font-display text-lg font-semibold text-ivory">Revamp brief and positioning</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Capture the client’s real offer and the change they expect to see across their profiles.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Client brief" htmlFor="social-brief" hint="What is changing, and why did the client buy this revamp?"><Textarea id="social-brief" value={draft.clientBrief} onChange={(event) => setField("clientBrief", event.target.value)} placeholder="The profile currently feels inconsistent. The client wants a clearer first impression and more enquiries." className="min-h-[108px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Priority audience" htmlFor="social-audience"><Textarea id="social-audience" value={draft.audience} onChange={(event) => setField("audience", event.target.value)} placeholder="Who should recognise themselves in the profile within five seconds?" className="min-h-[108px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Services, products, or offers" htmlFor="social-offers"><Textarea id="social-offers" value={draft.servicesOffers} onChange={(event) => setField("servicesOffers", event.target.value)} placeholder="List the services, products, packages, or priority offer to feature." className="min-h-[92px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Service area or location" htmlFor="social-location"><Input id="social-location" value={draft.location} onChange={(event) => setField("location", event.target.value)} placeholder="Newcastle, NSW · Australia-wide" className={inputClass} /></Field><Field label="Business goals" htmlFor="social-goals"><Textarea id="social-goals" value={draft.goals} onChange={(event) => setField("goals", event.target.value)} placeholder="Generate more quote requests, make the offer easier to understand, support a launch." className="min-h-[92px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Primary call to action" htmlFor="social-cta"><Input id="social-cta" value={draft.primaryCta} onChange={(event) => setField("primaryCta", event.target.value)} placeholder="Book a consultation · Call now · Shop the collection" className={inputClass} /></Field></div></section><section className="grid gap-4 sm:grid-cols-2"><Field label="Brand voice" htmlFor="social-voice" hint="Words the client wants the audience to feel and hear."><Textarea id="social-voice" value={draft.brandVoice} onChange={(event) => setField("brandVoice", event.target.value)} placeholder="Warm, capable, direct, and grounded in local expertise." className="min-h-[96px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Visual direction" htmlFor="social-visual" hint="Reference colours, photography, layout energy, or examples supplied by the client."><Textarea id="social-visual" value={draft.visualDirection} onChange={(event) => setField("visualDirection", event.target.value)} placeholder="Clean editorial layouts, generous space, real work photography, and one strong accent colour." className="min-h-[96px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Constraints or exclusions" htmlFor="social-constraints"><Textarea id="social-constraints" value={draft.constraints} onChange={(event) => setField("constraints", event.target.value)} placeholder="Claims to avoid, compliance notes, required wording, or assets not approved for use." className="min-h-[88px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field><Field label="Revision notes" htmlFor="social-revisions"><Textarea id="social-revisions" value={draft.revisionNotes} onChange={(event) => setField("revisionNotes", event.target.value)} placeholder="Client feedback or changes still required for this version." className="min-h-[88px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field></section><section className="space-y-4"><div><h3 className="font-display text-lg font-semibold text-ivory">Supplied brand assets</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Upload client-provided logos, photos, banners, or references. Files stay in the private workspace and are recorded with their type and size.</p></div><div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end"><Field label="Asset type" htmlFor="social-asset-type"><Select value={assetType} onValueChange={(value) => setAssetType(value as SocialRevampAssetType)}><SelectTrigger id="social-asset-type" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{SOCIAL_REVAMP_ASSET_TYPES.map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></Field><Field label="Asset note" htmlFor="social-asset-note"><Input id="social-asset-note" value={assetNotes} onChange={(event) => setAssetNotes(event.target.value)} placeholder="Optional usage note, campaign, or approval context" className={inputClass} /></Field><label className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:border-primary/30 hover:text-primary"><UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />{uploading ? "Uploading…" : "Upload asset"}<input type="file" accept="image/*,.pdf" className="sr-only" disabled={uploading} onChange={(event) => { void handleAssetUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div>{draft.uploadedAssets.length > 0 && <div className="space-y-2">{draft.uploadedAssets.map((asset) => <div key={asset.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/35 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium text-ivory">{asset.fileName}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{asset.assetType} · {formatBytes(asset.fileSize)} · {asset.fileType || "File"}</p></div><Button type="button" variant="ghost" onClick={() => setField("uploadedAssets", draft.uploadedAssets.filter((item) => item.id !== asset.id))} className="h-8 gap-1.5 text-red-200 hover:bg-destructive/10 hover:text-red-100"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove</Button></div>)}</div>}</section><section className="space-y-4"><div><h3 className="font-display text-lg font-semibold text-ivory">Workflow and handoff</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Move the brief through review stages as the manual work progresses. No social account is changed from this screen.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Status" htmlFor="social-status"><Select value={draft.status} onValueChange={(value) => setField("status", value as SocialRevampStatus)}><SelectTrigger id="social-status" className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{SOCIAL_REVAMP_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</SelectItem>)}</SelectContent></Select></Field><Field label="Next action" htmlFor="social-next-action" hint="Keep the next manual move visible for the operator."><Input id="social-next-action" value={draft.nextAction} onChange={(event) => setField("nextAction", event.target.value)} placeholder="Send the first direction draft for client review" className={inputClass} /></Field><Field label="Approved by" htmlFor="social-approved-by"><Input id="social-approved-by" value={draft.approvedBy} onChange={(event) => setField("approvedBy", event.target.value)} placeholder="Client contact or operator initials" className={inputClass} /></Field><Field label="Approval date" htmlFor="social-approved-date"><Input id="social-approved-date" type="date" value={draft.approvedAt} onChange={(event) => setField("approvedAt", event.target.value)} className={inputClass} /></Field><Field label="Delivery date" htmlFor="social-delivery-date"><Input id="social-delivery-date" type="date" value={draft.deliveryDate} onChange={(event) => setField("deliveryDate", event.target.value)} className={inputClass} /></Field><Field label="Delivery recipient" htmlFor="social-delivery-recipient"><Input id="social-delivery-recipient" value={draft.deliveryRecipient} onChange={(event) => setField("deliveryRecipient", event.target.value)} placeholder="Person or team receiving the pack" className={inputClass} /></Field><Field label="Delivery notes" htmlFor="social-delivery-notes"><Textarea id="social-delivery-notes" value={draft.deliveryNotes} onChange={(event) => setField("deliveryNotes", event.target.value)} placeholder="Record the manual handoff and what the client should apply in each account." className="min-h-[84px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field></div><label className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3"><Checkbox checked={draft.approvalConfirmed} onCheckedChange={(value) => setField("approvalConfirmed", value === true)} className="mt-0.5" /><span><span className="block text-sm font-medium text-ivory">Client approval recorded</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">The client has approved the current direction and supplied details for this version.</span></span></label></section><Field label="Private operator notes" htmlFor="social-operator"><Textarea id="social-operator" value={draft.operatorNotes} onChange={(event) => setField("operatorNotes", event.target.value)} placeholder="Keep internal context, dependencies, and delivery reminders here." className="min-h-[88px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground" /></Field>{formError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</p>}<div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel} disabled={saving || uploading} className="border-border bg-transparent text-foreground hover:bg-secondary">Cancel</Button><Button type="submit" disabled={saving || uploading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving…" : record ? `Save version ${(record.version || 0) + 1}` : "Save revamp brief"}</Button></div></form><Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}><DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-3xl"><DialogHeader><DialogTitle className="font-display text-xl text-ivory">Create a client record</DialogTitle><DialogDescription className="text-muted-foreground">Add an external, no-website, marketing-only, owner-business, or Buildy-built record without leaving this revamp.</DialogDescription></DialogHeader><ClientSiteManualForm onSaved={handleClientCreated} onCancel={() => setClientDialogOpen(false)} /></DialogContent></Dialog></>;
}

```

## src/components/hub/SalesPlaybookWorkspace.tsx

```tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, ChevronRight, Clipboard, Copy, MessageCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CENTRAL_HUB_INVOICE_LOGO, PUBLIC_MARKETING_PACKAGES } from "@/lib/invoice-catalog";
import { PACKAGE_COMPARISON, SALES_PLAYBOOK_CATEGORIES, SALES_PLAYBOOK_SECTIONS, searchablePlaybookText } from "@/lib/sales-playbook";
import { optimizeStorageImage } from "@/lib/seo";
import type { NavId } from "@/lib/hub-data";

type Props = { search: string; onSearchChange: (value: string) => void; onNavigate?: (id: NavId) => void };

const accents = {
  lime: "border-primary/20 bg-primary/[0.045] text-primary",
  cyan: "border-cyan-accent/20 bg-cyan-accent/[0.045] text-cyan-accent",
  amber: "border-amber-300/20 bg-amber-300/[0.045] text-amber-200",
  violet: "border-violet-300/20 bg-violet-300/[0.045] text-violet-200",
} as const;

function CopyButton({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: (text: string) => void }) {
  return <Button type="button" variant="outline" size="sm" onClick={() => onCopy(text)} className="h-8 shrink-0 gap-1.5 border-border bg-background/50 px-2.5 text-[11px] text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary"><span className="sr-only">Copy talking point</span>{copied ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}{copied ? "Copied" : "Copy"}</Button>;
}

export function SalesPlaybookWorkspace({ search, onSearchChange, onNavigate }: Props) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [copiedKey, setCopiedKey] = useState("");
  const query = search.trim().toLowerCase();
  const logo = optimizeStorageImage(CENTRAL_HUB_INVOICE_LOGO, 96) || CENTRAL_HUB_INVOICE_LOGO;
  const visibleCategories = useMemo(() => SALES_PLAYBOOK_CATEGORIES.filter((category) => (categoryFilter === "all" || category.id === categoryFilter) && (!query || searchablePlaybookText(category).includes(query))), [categoryFilter, query]);
  const visibleSections = useMemo(() => SALES_PLAYBOOK_SECTIONS.filter((section) => !query || searchablePlaybookText(section).includes(query)), [query]);

  const copyText = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedKey(key); window.setTimeout(() => setCopiedKey((current) => current === key ? "" : current), 1400); } catch { setCopiedKey(""); }
  };

  return (
    <section className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="sales-desk-title">
      <div className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/[0.1] via-card to-card p-5 shadow-lg shadow-black/10 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-accent/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl"><div className="flex flex-wrap items-center gap-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-secondary"><img src={logo} alt="Central Hub" className="h-full w-full object-cover" /></div><span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />Private call desk</span></div><h2 id="sales-desk-title" className="mt-5 font-display text-3xl font-bold tracking-tight text-ivory sm:text-4xl">Keep the call focused on the owner’s next move.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Search the services, package boundaries, discovery questions, and close prompts you need while speaking with a lead. Copy a point when you need a quick reference, then keep the conversation human.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-background/45 px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Topics</p><p className="mt-1 font-display text-2xl font-bold text-ivory">{SALES_PLAYBOOK_CATEGORIES.length}</p></div><div className="rounded-2xl border border-border bg-background/45 px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Packages</p><p className="mt-1 font-display text-2xl font-bold text-ivory">3</p></div><div className="col-span-2 rounded-2xl border border-cyan-accent/20 bg-cyan-accent/[0.06] px-4 py-3 sm:col-span-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-accent">Guardrail</p><p className="mt-1 text-xs leading-5 text-muted-foreground">No auto-send. Confirm scope first.</p></div></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-4 xl:sticky xl:top-28"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search the desk" aria-label="Search the sales desk" className="h-10 border-border bg-background/60 pl-9 text-sm" /></div><div className="mt-5"><p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Jump to a topic</p><div className="mt-2 space-y-1">{[{ id: "all", label: "All call notes" }, ...SALES_PLAYBOOK_CATEGORIES.map((item) => ({ id: item.id, label: item.label }))].map((item) => <button key={item.id} type="button" onClick={() => setCategoryFilter(item.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${categoryFilter === item.id ? "bg-primary/[0.09] text-primary" : "text-muted-foreground hover:bg-secondary hover:text-ivory"}`}><span className="truncate">{item.label}</span>{categoryFilter === item.id && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}</button>)}</div></div><div className="mt-5 rounded-xl border border-border bg-background/40 p-3"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><p className="text-[11px] leading-5 text-muted-foreground">Use approved facts and client-supplied details. If a price or scope is unknown, say you will confirm it.</p></div></div></aside>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-accent">Live-call reference</p><h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-ivory">Service talking points</h3></div><span className="text-xs text-muted-foreground">{visibleCategories.length} {visibleCategories.length === 1 ? "topic" : "topics"} shown</span></div>
          {visibleCategories.length ? <div className="grid gap-4 lg:grid-cols-2">{visibleCategories.map((category, index) => <motion.article key={category.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accents[category.accent]}`}>{category.eyebrow}</div><Button type="button" variant="ghost" size="sm" onClick={() => void copyText(category.points.join("\n"), `${category.id}-all`)} className="h-8 shrink-0 gap-1.5 px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-ivory"><Clipboard className="h-3.5 w-3.5" aria-hidden="true" />Copy all</Button></div><h4 className="mt-4 font-display text-xl font-semibold text-ivory">{category.label}</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">{category.description}</p><ul className="mt-4 space-y-2.5">{category.points.map((point, pointIndex) => { const key = `${category.id}-${pointIndex}`; return <li key={key} className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/30 p-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/[0.1] text-primary"><Check className="h-3 w-3" aria-hidden="true" /></span><p className="min-w-0 flex-1 text-xs leading-5 text-foreground/85">{point}</p><CopyButton text={point} copied={copiedKey === key} onCopy={(value) => void copyText(value, key)} /></li>; })}</ul></motion.article>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center"><Search className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-ivory">No call notes match that search.</p><p className="mt-1 text-xs text-muted-foreground">Try a service name, package, objection, or customer question.</p></div>}

          {visibleSections.length > 0 && <div className="grid gap-4 lg:grid-cols-3">{visibleSections.map((section) => <article key={section.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-cyan-accent"><MessageCircle className="h-4 w-4" aria-hidden="true" /><h4 className="font-display text-lg font-semibold text-ivory">{section.label}</h4></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{section.description}</p><ul className="mt-4 space-y-3">{section.points.map((point, index) => { const key = `${section.id}-${index}`; return <li key={key} className="flex items-start gap-2.5"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-accent" /><span className="min-w-0 flex-1 text-xs leading-5 text-foreground/80">{point}</span><CopyButton text={point} copied={copiedKey === key} onCopy={(value) => void copyText(value, key)} /></li>; })}</ul></article>)}</div>}

          <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 sm:p-6" aria-labelledby="package-comparison-title"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" aria-hidden="true" /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Public catalogue</p></div><h3 id="package-comparison-title" className="mt-2 font-display text-2xl font-bold text-ivory">Compare the three starting points</h3></div><p className="text-xs text-muted-foreground">Prepaid invoice terms, not automatic billing</p></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{PACKAGE_COMPARISON.map((pack) => { const source = PUBLIC_MARKETING_PACKAGES.find((item) => item.id === pack.id.replace("-", "_")); return <div key={pack.id} className="rounded-2xl border border-border bg-background/45 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-display text-lg font-semibold text-ivory">{pack.label}</h4><p className="mt-1 text-[11px] font-semibold text-primary">{pack.price}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{source ? "Public" : ""}</span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{pack.bestFor}</p><ul className="mt-4 space-y-2">{pack.included.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-foreground/80"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></div>; })}</div><div className="mt-5 flex flex-col gap-3 rounded-xl border border-cyan-accent/20 bg-cyan-accent/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground"><strong className="text-ivory">Ready to quote?</strong> Open Invoices to combine a custom website price with one of these public terms.</p>{onNavigate && <Button type="button" onClick={() => onNavigate("invoices")} className="h-9 gap-2 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Open invoice builder <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>}</div></section>
        </div>
      </div>
    </section>
  );
}

```

## src/components/hub/InvoiceWorkspace.tsx

```tsx
import { useEffect, useState } from "react";
import { AlertCircle, FilePlus2, Landmark, Receipt, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Invoice as InvoiceEntity, InvoiceSettings as InvoiceSettingsEntity } from "@/entities";
import { InvoiceForm } from "@/components/hub/InvoiceForm";
import { InvoiceList } from "@/components/hub/InvoiceList";
import type { ClientSite, NavId } from "@/lib/hub-data";
import { datePlusDays, defaultInvoiceSettings, hasPaymentDetails, invoiceTotals, isoToday, nextInvoiceNumber, paymentSnapshot, type InvoiceRecord, type InvoiceSettingsRecord, type InvoiceStatus } from "@/lib/invoice-catalog";

type Props = { sites: ClientSite[]; search: string; onSearchChange: (value: string) => void; onNavigate: (id: NavId) => void };
type LoadState = "loading" | "ready" | "unavailable";
type DashboardRecord = Record<string, unknown>;

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as DashboardRecord : {}; }
function mapSettings(value: unknown): InvoiceSettingsRecord | null { const raw = object(value); const id = text(raw.id); if (!id) return null; const base = defaultInvoiceSettings(); return { ...base, id, legalName: text(raw.legalName), tradingName: text(raw.tradingName), abn: text(raw.abn), address: text(raw.address), email: text(raw.email), phone: text(raw.phone), website: text(raw.website), logoUrl: text(raw.logoUrl), primaryColor: text(raw.primaryColor), secondaryColor: text(raw.secondaryColor), accentColor: text(raw.accentColor), bankAccountName: text(raw.bankAccountName), bankName: text(raw.bankName), bsb: text(raw.bsb), accountNumber: text(raw.accountNumber), payid: text(raw.payid), paymentTerms: text(raw.paymentTerms), invoicePrefix: text(raw.invoicePrefix) || "INV-", nextInvoiceNumber: Math.max(1, Math.floor(number(raw.nextInvoiceNumber, 1))), gstEnabled: Boolean(raw.gstEnabled), gstRate: Math.max(0, number(raw.gstRate, 10)), footerNote: text(raw.footerNote), updated_at: text(raw.updated_at) || undefined }; }
function mapInvoice(value: unknown): InvoiceRecord | null { const raw = object(value); const id = text(raw.id); if (!id) return null; const statusValue = text(raw.status).toLowerCase(); const status: InvoiceStatus = statusValue === "paid" || statusValue === "cancelled" ? statusValue : "draft"; const gstEnabled = Boolean(raw.gstEnabled); const gstRate = Math.max(0, number(raw.gstRate)); const rawLines = Array.isArray(raw.lineItems) ? raw.lineItems : []; const lineItems = rawLines.map((value, index) => { const item = object(value); const quantity = Math.max(1, number(item.quantity, 1)); const unitAmount = Math.max(0, number(item.unitAmount)); return { id: text(item.id) || `line-${index}`, kind: ["website", "marketing", "addon"].includes(text(item.kind)) ? text(item.kind) as "website" | "marketing" | "addon" : "addon", description: text(item.description), quantity, unitAmount, lineTotal: quantity * unitAmount, termLabel: text(item.termLabel) || undefined }; }); const totals = invoiceTotals(lineItems, gstEnabled, gstRate); const termValue = text(raw.marketingTerm); const marketingTerm = ["monthly", "three_month", "six_month", "annual"].includes(termValue) ? termValue as InvoiceRecord["marketingTerm"] : ""; return { id, invoiceNumber: text(raw.invoiceNumber), status, clientSiteId: text(raw.clientSiteId), clientName: text(raw.clientName), clientEmail: text(raw.clientEmail), clientPhone: text(raw.clientPhone), clientAddress: text(raw.clientAddress), issueDate: text(raw.issueDate), dueDate: text(raw.dueDate), currency: text(raw.currency) || "AUD", websiteAmount: Math.max(0, number(raw.websiteAmount)), marketingPackageId: text(raw.marketingPackageId), marketingTerm, lineItems, billingTerms: text(raw.billingTerms), ...totals, gstEnabled, gstRate, notes: text(raw.notes), paymentInstructionSnapshot: object(raw.paymentInstructionSnapshot) as Partial<InvoiceSettingsRecord>, created_at: text(raw.created_at) || undefined, updated_at: text(raw.updated_at) || undefined }; }
function sequenceFromInvoice(invoiceNumber: string, prefix: string) { const clean = prefix.trim() || "INV-"; return invoiceNumber.startsWith(clean) ? Math.floor(Number(invoiceNumber.slice(clean.length))) || 0 : 0; }
function nextSuggestedNumber(invoices: InvoiceRecord[], settings: InvoiceSettingsRecord) { const highest = invoices.reduce((max, invoice) => Math.max(max, sequenceFromInvoice(invoice.invoiceNumber, settings.invoicePrefix)), 0); return nextInvoiceNumber(settings.invoicePrefix, Math.max(settings.nextInvoiceNumber, highest + 1)); }
function emptyInvoice(settings: InvoiceSettingsRecord, invoices: InvoiceRecord[]): InvoiceRecord { const issueDate = isoToday(); return { id: "", invoiceNumber: nextSuggestedNumber(invoices, settings), status: "draft", clientSiteId: "", clientName: "", clientEmail: "", clientPhone: "", clientAddress: "", issueDate, dueDate: datePlusDays(issueDate, 7), currency: "AUD", websiteAmount: 0, marketingPackageId: "", marketingTerm: "", lineItems: [], billingTerms: "", subtotal: 0, gstEnabled: settings.gstEnabled, gstRate: settings.gstRate, gstAmount: 0, total: 0, notes: "", paymentInstructionSnapshot: paymentSnapshot(settings) }; }
function savePayload(invoice: InvoiceRecord, settings: InvoiceSettingsRecord) { const lines = invoice.lineItems.map((item) => ({ ...item, lineTotal: Math.max(1, number(item.quantity, 1)) * Math.max(0, number(item.unitAmount)) })); const totals = invoiceTotals(lines, invoice.gstEnabled, invoice.gstRate); return { invoiceNumber: invoice.invoiceNumber.trim(), status: invoice.status, clientSiteId: invoice.clientSiteId, clientName: invoice.clientName.trim(), clientEmail: invoice.clientEmail.trim(), clientPhone: invoice.clientPhone.trim(), clientAddress: invoice.clientAddress.trim(), issueDate: invoice.issueDate, dueDate: invoice.dueDate, currency: "AUD", websiteAmount: Math.max(0, number(invoice.websiteAmount)), marketingPackageId: invoice.marketingPackageId, marketingTerm: invoice.marketingTerm, lineItems: lines, billingTerms: invoice.billingTerms.trim(), ...totals, gstEnabled: Boolean(invoice.gstEnabled), gstRate: Math.max(0, number(invoice.gstRate)), notes: invoice.notes.trim(), paymentInstructionSnapshot: paymentSnapshot(settings) }; }

export function InvoiceWorkspace({ sites, search, onSearchChange, onNavigate }: Props) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]); const [settings, setSettings] = useState<InvoiceSettingsRecord>(() => defaultInvoiceSettings()); const [editor, setEditor] = useState<InvoiceRecord | null>(null); const [loadState, setLoadState] = useState<LoadState>("loading"); const [settingsUnavailable, setSettingsUnavailable] = useState(false); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const [retryKey, setRetryKey] = useState(0); const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all"); const [clientFilter, setClientFilter] = useState("all");
  useEffect(() => { let cancelled = false; setLoadState("loading"); setMessage(""); const load = async () => { const [invoiceResult, settingsResult] = await Promise.allSettled([(InvoiceEntity as any).list("-updated_at", 200), (InvoiceSettingsEntity as any).list("-updated_at", 10)]); if (cancelled) return; if (invoiceResult.status === "fulfilled" && Array.isArray(invoiceResult.value)) { setInvoices(invoiceResult.value.map(mapInvoice).filter(Boolean) as InvoiceRecord[]); setLoadState("ready"); } else { console.error("Failed to load saved invoices", invoiceResult.status === "rejected" ? invoiceResult.reason : "Invalid invoice response"); setInvoices([]); setLoadState("unavailable"); setMessage("Saved invoices could not be loaded. Try again before creating a draft."); } if (settingsResult.status === "fulfilled" && Array.isArray(settingsResult.value)) { const next = settingsResult.value.map(mapSettings).filter(Boolean)[0] as InvoiceSettingsRecord | undefined; setSettings(next || defaultInvoiceSettings()); setSettingsUnavailable(false); } else { console.warn("Invoice settings are unavailable", settingsResult.status === "rejected" ? settingsResult.reason : "Invalid settings response"); setSettings(defaultInvoiceSettings()); setSettingsUnavailable(true); } }; void load(); return () => { cancelled = true; }; }, [retryKey]);
  const reserveNextNumber = async (invoiceNumber: string) => { const usedNext = Math.max(settings.nextInvoiceNumber, sequenceFromInvoice(invoiceNumber, settings.invoicePrefix) + 1, 1); if (settings.id) { await (InvoiceSettingsEntity as any).update(settings.id, { nextInvoiceNumber: usedNext }); setSettings((current) => ({ ...current, nextInvoiceNumber: usedNext })); return; } const payload = { ...defaultInvoiceSettings(), ...settings, nextInvoiceNumber: usedNext }; const response = await (InvoiceSettingsEntity as any).create(payload); const saved = mapSettings(response); setSettings(saved || { ...payload }); setSettingsUnavailable(false); };
  const handleSave = async () => { if (!editor) return; if (loadState !== "ready") { setMessage("Wait for saved invoices to load before saving."); return; } if (!editor.invoiceNumber.trim()) { setMessage("Add an invoice number before saving."); return; } if (!editor.clientName.trim()) { setMessage("Add a client or business name before saving."); return; } if (!editor.lineItems.length) { setMessage("Add a website price, marketing package, or add-on line before saving."); return; } setSaving(true); setMessage(""); try { const payload = savePayload(editor, settings); if (!editor.id) await reserveNextNumber(payload.invoiceNumber); const response = editor.id ? await (InvoiceEntity as any).update(editor.id, payload) : await (InvoiceEntity as any).create(payload); const saved = mapInvoice(response); if (saved) { setInvoices((current) => editor.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]); setEditor(saved); setMessage(`${saved.invoiceNumber} saved as a draft.`); } else { setEditor(null); setRetryKey((key) => key + 1); setMessage("Invoice saved. Refresh the register to reopen it."); } } catch (error) { console.error("Failed to save invoice", error); setMessage(error instanceof Error && error.message ? error.message : "Invoice could not be saved. Check your access and try again."); } finally { setSaving(false); } };
  const updateStatus = async (invoice: InvoiceRecord, status: InvoiceStatus) => { if (!invoice.id) return; setSaving(true); setMessage(""); try { const response = await (InvoiceEntity as any).update(invoice.id, { status }); const next = mapInvoice(response) || { ...invoice, status }; setInvoices((current) => current.map((item) => item.id === invoice.id ? next : item)); setEditor((current) => current?.id === invoice.id ? next : current); setMessage(`${invoice.invoiceNumber} marked ${status === "paid" ? "paid" : "cancelled"}.`); } catch (error) { console.error("Failed to update invoice status", error); setMessage("Invoice status could not be updated. Try again."); } finally { setSaving(false); } };
  const duplicate = (invoice: InvoiceRecord) => setEditor({ ...invoice, id: "", invoiceNumber: nextSuggestedNumber(invoices, settings), status: "draft", issueDate: isoToday(), dueDate: datePlusDays(isoToday(), 7), paymentInstructionSnapshot: paymentSnapshot(settings) });
  const createNew = () => { setMessage(""); setEditor(emptyInvoice(settings, invoices)); };
  const printInvoice = () => { if (typeof window !== "undefined") window.print(); };
  const paymentConfigured = hasPaymentDetails(settings);

  return <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="invoices-title"><div className="flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2 text-cyan-accent"><Receipt className="h-4 w-4" aria-hidden="true" /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Private operator workspace</p></div><h2 id="invoices-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-ivory sm:text-4xl">Build an invoice clients can trust.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Combine a custom website price with a public GrowthStack tier, choose a prepaid term, and keep bank transfer or PayID instructions in a branded print-ready draft.</p></div><div className="flex flex-wrap gap-2 print-hide"><Button type="button" variant="outline" onClick={() => onNavigate("invoiceSettings")} className="h-9 gap-1.5 border-border bg-card text-xs text-foreground"><Settings2 className="h-3.5 w-3.5" aria-hidden="true" />Invoice settings</Button><Button type="button" onClick={createNew} className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"><FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />Create draft</Button></div></div>{(message || settingsUnavailable || !paymentConfigured) && <div role={message && loadState === "unavailable" ? "alert" : "status"} className={`mt-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${message && loadState === "unavailable" ? "border-destructive/25 bg-destructive/[0.06] text-red-200" : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"}`}><span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{message || (settingsUnavailable ? "Invoice settings are not available yet. You can prepare a draft, then save private payment details in Invoice Settings." : "Bank transfer and PayID details are not configured. The preview will show a warning until you add them.")}</span></span>{loadState === "unavailable" && <Button type="button" variant="outline" onClick={() => setRetryKey((key) => key + 1)} className="h-8 gap-1.5 self-start border-border bg-card text-xs text-foreground sm:self-auto"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Try again</Button>}{!paymentConfigured && <Button type="button" variant="outline" onClick={() => onNavigate("invoiceSettings")} className="h-8 gap-1.5 self-start border-amber-300/25 bg-transparent text-xs text-amber-100 sm:self-auto"><Landmark className="h-3.5 w-3.5" aria-hidden="true" />Configure payment details</Button>}</div>}
    <div className={`mt-6 grid gap-6 ${editor ? "xl:grid-cols-[350px_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}><InvoiceList invoices={invoices} loading={loadState === "loading"} query={search} onQueryChange={onSearchChange} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} clientFilter={clientFilter} onClientFilterChange={setClientFilter} selectedId={editor?.id || ""} onSelect={setEditor} onNew={createNew} onDuplicate={duplicate} onMarkPaid={(invoice) => void updateStatus(invoice, "paid")} onCancel={(invoice) => void updateStatus(invoice, "cancelled")} />{editor ? <InvoiceForm invoice={editor} settings={settings} sites={sites} saving={saving} onChange={setEditor} onSave={() => void handleSave()} onClose={() => setEditor(null)} onDuplicate={() => duplicate(editor)} onMarkPaid={() => void updateStatus(editor, "paid")} onCancelInvoice={() => void updateStatus(editor, "cancelled")} onPrint={printInvoice} onNavigate={onNavigate} /> : <div className="hidden rounded-[24px] border border-dashed border-border bg-card/40 p-8 xl:block"><div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.08] text-primary"><Landmark className="h-6 w-6" aria-hidden="true" /></div><h3 className="mt-5 font-display text-2xl font-semibold text-ivory">Select a draft to review</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Open a saved invoice from the register, or create a new one when the scope and price are agreed.</p><Button type="button" onClick={createNew} className="mt-5 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><FilePlus2 className="h-4 w-4" aria-hidden="true" />Create invoice draft</Button></div></div>}</div></section>;
}

```

## src/components/hub/InvoiceForm.tsx

```tsx
import { AlertTriangle, ArrowLeft, Check, Copy, Eye, Landmark, Plus, Printer, Save, Settings2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvoicePreview } from "@/components/hub/InvoicePreview";
import { formatAud, invoiceTotals, packageAmount, packageById, termById, type InvoiceLineItem, type InvoiceRecord, type InvoiceSettingsRecord } from "@/lib/invoice-catalog";
import type { ClientSite, NavId } from "@/lib/hub-data";

type Props = { invoice: InvoiceRecord; settings: InvoiceSettingsRecord; sites: ClientSite[]; saving: boolean; onChange: (invoice: InvoiceRecord) => void; onSave: () => void; onClose: () => void; onDuplicate: () => void; onMarkPaid: () => void; onCancelInvoice: () => void; onPrint: () => void; onNavigate: (id: NavId) => void };
const inputClass = "h-10 border-border bg-background/60 text-foreground placeholder:text-muted-foreground";
const areaClass = "min-h-[96px] border-border bg-background/60 text-foreground placeholder:text-muted-foreground";
function numberValue(value: string) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, number) : 0; }
function amountLabel(cents: number) { return cents ? formatAud(cents / 100) : "Price not set"; }
function lineRows(invoice: InvoiceRecord): InvoiceLineItem[] {
  const rows: InvoiceLineItem[] = [];
  if (invoice.websiteAmount > 0) rows.push({ id: "website", kind: "website", description: "Custom website or store build", quantity: 1, unitAmount: invoice.websiteAmount, lineTotal: invoice.websiteAmount });
  const pack = packageById(invoice.marketingPackageId);
  const term = termById(invoice.marketingTerm);
  if (pack && term) rows.push({ id: "marketing", kind: "marketing", description: pack.name, quantity: 1, unitAmount: packageAmount(pack.id, term.id), lineTotal: packageAmount(pack.id, term.id), termLabel: `${term.label}. ${term.note}` });
  invoice.lineItems.filter((item) => item.kind === "addon").forEach((item) => rows.push({ ...item, quantity: Math.max(1, Number(item.quantity) || 1), unitAmount: Math.max(0, Number(item.unitAmount) || 0), lineTotal: Math.max(1, Number(item.quantity) || 1) * Math.max(0, Number(item.unitAmount) || 0) }));
  return rows;
}
function withTotals(invoice: InvoiceRecord, patch: Partial<InvoiceRecord>): InvoiceRecord {
  const next = { ...invoice, ...patch, websiteAmount: Math.max(0, Number(patch.websiteAmount ?? invoice.websiteAmount) || 0), gstRate: Math.max(0, Number(patch.gstRate ?? invoice.gstRate) || 0) };
  const lines = lineRows(next);
  const totals = invoiceTotals(lines, next.gstEnabled, next.gstRate);
  return { ...next, lineItems: lines, ...totals };
}
function siteAddress(site?: ClientSite) { return site?.contactDetails?.physicalAddress || site?.location || ""; }
function defaultTermCopy(invoice: InvoiceRecord) { return termById(invoice.marketingTerm)?.note || ""; }

export function InvoiceForm({ invoice, settings, sites, saving, onChange, onSave, onClose, onDuplicate, onMarkPaid, onCancelInvoice, onPrint, onNavigate }: Props) {
  const update = (patch: Partial<InvoiceRecord>) => onChange(withTotals(invoice, patch));
  const selectedSite = sites.find((site) => site.id === invoice.clientSiteId);
  const setSite = (value: string) => {
    if (value === "manual") return update({ clientSiteId: "" });
    const site = sites.find((item) => item.id === value);
    if (!site) return update({ clientSiteId: "" });
    update({ clientSiteId: site.id, clientName: site.businessName, clientEmail: site.email || site.contactDetails?.emails?.[0] || "", clientPhone: site.phone || site.contactDetails?.phones?.[0] || "", clientAddress: siteAddress(site) });
  };
  const setPackage = (value: string) => {
    const marketingPackageId = value === "none" ? "" : value;
    const marketingTerm = marketingPackageId ? (invoice.marketingTerm || "monthly") : "";
    update({ marketingPackageId, marketingTerm, billingTerms: marketingPackageId ? (termById(marketingTerm)?.note || invoice.billingTerms) : "" });
  };
  const setTerm = (value: string) => update({ marketingTerm: value === "none" ? "" : value as InvoiceRecord["marketingTerm"], billingTerms: value === "none" ? "" : (termById(value)?.note || invoice.billingTerms) });
  const addAddon = () => update({ lineItems: [...invoice.lineItems.filter((item) => item.kind === "addon"), { id: `addon-${Date.now()}`, kind: "addon", description: "", quantity: 1, unitAmount: 0, lineTotal: 0 }] });
  const updateAddon = (id: string, patch: Partial<InvoiceLineItem>) => update({ lineItems: invoice.lineItems.filter((item) => item.kind === "addon").map((item) => item.id === id ? { ...item, ...patch } : item) });
  const removeAddon = (id: string) => update({ lineItems: invoice.lineItems.filter((item) => item.kind === "addon" && item.id !== id) });
  const packageSelected = packageById(invoice.marketingPackageId);
  const termSelected = termById(invoice.marketingTerm);
  const previewSettings = invoice.id ? (invoice.paymentInstructionSnapshot as InvoiceSettingsRecord) : settings;

  return <section className="space-y-5" aria-labelledby="invoice-editor-title">
    <div className="flex flex-col gap-4 rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-card to-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><button type="button" onClick={onClose} className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back to register</button><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{invoice.id ? "Saved invoice" : "New draft"}</p><h2 id="invoice-editor-title" className="mt-1 font-display text-2xl font-bold tracking-tight text-ivory sm:text-3xl">{invoice.invoiceNumber || "Invoice draft"}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">{invoice.status === "paid" ? "Paid" : invoice.status === "cancelled" ? "Cancelled" : "Draft"}</span><span className="text-xs text-muted-foreground">AUD · prepaid terms only</span></div></div><div className="flex flex-wrap gap-2 print-hide"><Button type="button" variant="outline" onClick={onPrint} className="h-9 gap-1.5 border-border bg-background/50 text-xs text-foreground"><Printer className="h-3.5 w-3.5" aria-hidden="true" />Print / PDF</Button><Button type="button" variant="outline" onClick={onDuplicate} className="h-9 gap-1.5 border-border bg-background/50 text-xs text-foreground"><Copy className="h-3.5 w-3.5" aria-hidden="true" />Duplicate</Button></div></div></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.86fr)]"><div className="space-y-5">
      <article className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-accent">Client details</p><h3 className="mt-1 font-display text-lg font-semibold text-ivory">Who is this invoice for?</h3></div><span className="text-[11px] text-muted-foreground">Link a saved site or enter manually</span></div><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="invoice-client-site">Saved client or site</Label><select id="invoice-client-site" value={selectedSite ? selectedSite.id : "manual"} onChange={(event) => setSite(event.target.value)} disabled={saving} className="h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground"><option value="manual">Manual client details</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.businessName}</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-client-name">Client / business name</Label><Input id="invoice-client-name" value={invoice.clientName} onChange={(event) => update({ clientName: event.target.value })} placeholder="Business or client name" disabled={saving} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-client-email">Billing email</Label><Input id="invoice-client-email" type="email" value={invoice.clientEmail} onChange={(event) => update({ clientEmail: event.target.value })} placeholder="client@example.com" disabled={saving} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-client-phone">Phone</Label><Input id="invoice-client-phone" value={invoice.clientPhone} onChange={(event) => update({ clientPhone: event.target.value })} placeholder="Optional" disabled={saving} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-client-address">Billing address</Label><Input id="invoice-client-address" value={invoice.clientAddress} onChange={(event) => update({ clientAddress: event.target.value })} placeholder="Optional" disabled={saving} className={inputClass} /></div></div></div></article>
      <article className="rounded-2xl border border-border bg-card p-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Agreed scope</p><h3 className="mt-1 font-display text-lg font-semibold text-ivory">Build, package, and add-ons</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">The website price is custom. Marketing tiers use the public catalogue and are invoiced upfront for the selected term.</p></div><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="invoice-website-amount">Custom website or store build, AUD</Label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">A$</span><Input id="invoice-website-amount" type="number" min="0" step="0.01" value={invoice.websiteAmount || ""} onChange={(event) => update({ websiteAmount: numberValue(event.target.value) })} placeholder="Enter the agreed build price" disabled={saving} className={`${inputClass} pl-9`} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-package">Marketing package</Label><select id="invoice-package" value={packageSelected?.id || "none"} onChange={(event) => setPackage(event.target.value)} disabled={saving} className="h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground"><option value="none">No marketing package</option>{["basic", "standard", "all_inclusive"].map((id) => { const pack = packageById(id); return pack ? <option key={pack.id} value={pack.id}>{pack.name} · {amountLabel(pack.monthlyCents)}/mo</option> : null; })}</select></div><div className="space-y-2"><Label htmlFor="invoice-term">Prepaid term</Label><select id="invoice-term" value={termSelected?.id || "none"} onChange={(event) => setTerm(event.target.value)} disabled={saving || !packageSelected} className="h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground"><option value="none">Select a package first</option><option value="monthly">Monthly prepaid</option><option value="three_month">3-month prepaid</option><option value="six_month">6-month prepaid</option><option value="annual">Annual prepaid</option></select></div></div>{packageSelected && termSelected && <div className="rounded-xl border border-primary/20 bg-primary/[0.055] p-3 text-xs text-muted-foreground"><span className="font-semibold text-primary">{packageSelected.name}: {formatAud(packageAmount(packageSelected.id, termSelected.id))}</span><span className="ml-2">{termSelected.note}</span></div>}<div><div className="flex items-center justify-between gap-3"><div><Label>Custom add-ons</Label><p className="mt-1 text-[11px] text-muted-foreground">Use separate lines for approved work outside the public package.</p></div><Button type="button" variant="outline" onClick={addAddon} disabled={saving} className="h-8 gap-1.5 border-border bg-background/50 px-2.5 text-[11px] text-foreground"><Plus className="h-3.5 w-3.5" aria-hidden="true" />Add line</Button></div><div className="mt-3 space-y-2">{invoice.lineItems.filter((item) => item.kind === "addon").map((item) => <div key={item.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_78px_102px_auto]"><Input value={item.description} onChange={(event) => updateAddon(item.id, { description: event.target.value })} placeholder="Add-on description" disabled={saving} aria-label="Add-on description" className={inputClass} /><Input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateAddon(item.id, { quantity: Math.max(1, Math.floor(numberValue(event.target.value))) })} aria-label="Add-on quantity" disabled={saving} className={inputClass} /><Input type="number" min="0" step="0.01" value={item.unitAmount || ""} onChange={(event) => updateAddon(item.id, { unitAmount: numberValue(event.target.value) })} placeholder="Amount" aria-label="Add-on amount" disabled={saving} className={inputClass} /><Button type="button" variant="ghost" size="icon" onClick={() => removeAddon(item.id)} disabled={saving} aria-label="Remove add-on" className="h-10 w-10 text-muted-foreground hover:bg-destructive/[0.08] hover:text-red-200"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div>)}</div></div></div></article>
      <article className="rounded-2xl border border-border bg-card p-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-number">Invoice number</Label><Input id="invoice-number" value={invoice.invoiceNumber} onChange={(event) => update({ invoiceNumber: event.target.value })} placeholder="INV-0001" disabled={saving} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-issue-date">Issue date</Label><Input id="invoice-issue-date" type="date" value={invoice.issueDate} onChange={(event) => update({ issueDate: event.target.value })} disabled={saving} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-due-date">Due date</Label><Input id="invoice-due-date" type="date" value={invoice.dueDate} onChange={(event) => update({ dueDate: event.target.value })} disabled={saving} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-gst-rate">GST rate (%)</Label><Input id="invoice-gst-rate" type="number" min="0" max="100" step="0.1" value={invoice.gstRate} onChange={(event) => update({ gstRate: numberValue(event.target.value) })} disabled={saving} className={inputClass} /></div></div><label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground"><input type="checkbox" checked={invoice.gstEnabled} onChange={(event) => update({ gstEnabled: event.target.checked })} disabled={saving} className="mt-0.5 h-4 w-4 accent-lime" /><span><strong className="text-ivory">Add GST to this invoice</strong><span className="mt-1 block">Only use this when the business GST position is confirmed.</span></span></label><div className="mt-4 space-y-2"><Label htmlFor="invoice-terms-copy">Client billing terms</Label><Textarea id="invoice-terms-copy" value={invoice.billingTerms || defaultTermCopy(invoice)} onChange={(event) => update({ billingTerms: event.target.value })} placeholder="Select a prepaid term or enter approved wording" disabled={saving} className={areaClass} /></div><div className="mt-4 space-y-2"><Label htmlFor="invoice-notes">Notes</Label><Textarea id="invoice-notes" value={invoice.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Approved project notes, inclusions, or next steps" disabled={saving} className={areaClass} /></div></article>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between print-hide"><p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Landmark className="mt-0.5 h-4 w-4 shrink-0 text-cyan-accent" aria-hidden="true" />Payment instructions are copied into the invoice when you save. Configure them in Invoice Settings before sending.</p><div className="flex flex-wrap gap-2 sm:justify-end"><Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-9 border-border bg-background/50 text-xs text-foreground">Close</Button>{invoice.id && invoice.status === "draft" && <Button type="button" variant="outline" onClick={onCancelInvoice} disabled={saving} className="h-9 gap-1.5 border-destructive/25 bg-destructive/[0.06] text-xs text-red-200 hover:bg-destructive/10"><XCircle className="h-3.5 w-3.5" aria-hidden="true" />Cancel invoice</Button>}{invoice.id && invoice.status === "draft" && <Button type="button" variant="outline" onClick={onMarkPaid} disabled={saving} className="h-9 gap-1.5 border-primary/25 bg-primary/[0.06] text-xs text-primary hover:bg-primary/10"><Check className="h-3.5 w-3.5" aria-hidden="true" />Mark paid</Button>}<Button type="button" onClick={onSave} disabled={saving} className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Save className="h-3.5 w-3.5" aria-hidden="true" />{saving ? "Saving…" : "Save draft"}</Button></div></div>
    </div><aside className="space-y-4 xl:sticky xl:top-28 xl:self-start"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-cyan-accent"><Eye className="h-4 w-4" aria-hidden="true" /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Client-ready preview</p></div><Button type="button" variant="ghost" onClick={() => onNavigate("invoiceSettings")} className="h-8 gap-1.5 px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-ivory"><Settings2 className="h-3.5 w-3.5" aria-hidden="true" />Invoice settings</Button></div><p className="text-xs leading-5 text-muted-foreground">Print this preview and choose Save as PDF. Sending and public invoice links are planned for a later phase.</p><InvoicePreview invoice={invoice} settings={previewSettings} /><div className="rounded-xl border border-cyan-accent/20 bg-cyan-accent/[0.05] p-3 text-xs leading-5 text-muted-foreground"><AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-cyan-accent" aria-hidden="true" />Check the client details, agreed scope, dates, GST setting, and payment instructions before sharing the PDF.</div></aside></div>
  </section>;
}

```

## src/components/hub/InvoiceList.tsx

```tsx
import { CalendarDays, Check, Copy, FileText, Plus, ReceiptText, SearchX, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAud, type InvoiceRecord, type InvoiceStatus } from "@/lib/invoice-catalog";

type Props = {
  invoices: InvoiceRecord[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: InvoiceStatus | "all";
  onStatusFilterChange: (value: InvoiceStatus | "all") => void;
  clientFilter: string;
  onClientFilterChange: (value: string) => void;
  selectedId: string;
  onSelect: (invoice: InvoiceRecord) => void;
  onNew: () => void;
  onDuplicate: (invoice: InvoiceRecord) => void;
  onMarkPaid: (invoice: InvoiceRecord) => void;
  onCancel: (invoice: InvoiceRecord) => void;
};

function dateLabel(value: string) {
  if (!value) return "Due date not set";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusLabel(status: InvoiceStatus) {
  return status === "paid" ? "Paid" : status === "cancelled" ? "Cancelled" : "Draft";
}

function statusClass(status: InvoiceStatus) {
  return status === "paid" ? "border-primary/25 bg-primary/[0.08] text-primary" : status === "cancelled" ? "border-destructive/25 bg-destructive/[0.07] text-red-200" : "border-amber-300/25 bg-amber-300/[0.08] text-amber-200";
}

export function InvoiceList({ invoices, loading, query, onQueryChange, statusFilter, onStatusFilterChange, clientFilter, onClientFilterChange, selectedId, onSelect, onNew, onDuplicate, onMarkPaid, onCancel }: Props) {
  const clients = [...new Set(invoices.map((invoice) => invoice.clientName.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const normalizedQuery = query.trim().toLowerCase();
  const visible = invoices.filter((invoice) => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesClient = clientFilter === "all" || invoice.clientName === clientFilter;
    const haystack = `${invoice.invoiceNumber} ${invoice.clientName} ${invoice.clientEmail}`.toLowerCase();
    return matchesStatus && matchesClient && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  return (
    <section className="rounded-[24px] border border-border bg-card/80 p-4 shadow-sm sm:p-5" aria-labelledby="saved-invoices-title">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-accent">Saved records</p><h2 id="saved-invoices-title" className="mt-1 font-display text-xl font-semibold text-ivory">Invoice register</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Owner-only drafts and payment status, stored as real invoice records.</p></div>
        <Button type="button" onClick={onNew} className="h-9 shrink-0 gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" aria-hidden="true" />New invoice</Button>
      </div>
      <div className="mt-5 space-y-2.5"><div className="relative"><ReceiptText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search number or client" aria-label="Search saved invoices" className="h-10 border-border bg-background/60 pl-9 text-sm" /></div><div className="grid gap-2 sm:grid-cols-2"><select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as InvoiceStatus | "all")} aria-label="Filter invoices by status" className="h-10 rounded-md border border-border bg-background/60 px-3 text-sm text-foreground"><option value="all">All statuses</option><option value="draft">Drafts</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select><select value={clientFilter} onChange={(event) => onClientFilterChange(event.target.value)} aria-label="Filter invoices by client" className="h-10 min-w-0 rounded-md border border-border bg-background/60 px-3 text-sm text-foreground"><option value="all">All clients</option>{clients.map((client) => <option key={client} value={client}>{client}</option>)}</select></div></div>
      <div className="mt-5 space-y-2.5">
        {loading ? <>{[1, 2, 3].map((item) => <div key={item} className="h-[102px] animate-pulse rounded-2xl border border-border bg-background/40" />)}</> : visible.length ? visible.map((invoice, index) => <motion.article key={invoice.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className={`rounded-2xl border p-3.5 transition-colors ${selectedId === invoice.id ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-background/35 hover:border-border/80 hover:bg-secondary/40"}`}><div className="flex items-start gap-3"><button type="button" onClick={() => onSelect(invoice)} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-ivory">{invoice.invoiceNumber || "Unnumbered"}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(invoice.status)}`}>{statusLabel(invoice.status)}</span></div><p className="mt-2 truncate text-sm font-semibold text-foreground">{invoice.clientName || "Client details to add"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{invoice.clientEmail || "No client email"}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span className="font-semibold text-ivory">{formatAud(invoice.total)}</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" aria-hidden="true" />{dateLabel(invoice.dueDate)}</span></div></button><div className="flex shrink-0 flex-col gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => onDuplicate(invoice)} className="h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:bg-secondary hover:text-ivory"><Copy className="h-3 w-3" aria-hidden="true" />Duplicate</Button>{invoice.status === "draft" && <Button type="button" variant="ghost" size="sm" onClick={() => onMarkPaid(invoice)} className="h-7 gap-1 px-2 text-[10px] text-primary hover:bg-primary/[0.08]"><Check className="h-3 w-3" aria-hidden="true" />Paid</Button>}{invoice.status === "draft" && <Button type="button" variant="ghost" size="sm" onClick={() => onCancel(invoice)} className="h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:bg-destructive/[0.08] hover:text-red-200"><X className="h-3 w-3" aria-hidden="true" />Cancel</Button>}</div></div></motion.article>) : <div className="rounded-2xl border border-dashed border-border bg-background/30 px-5 py-12 text-center"><SearchX className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-ivory">{invoices.length ? "No invoices match these filters." : "No invoices saved yet."}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{invoices.length ? "Clear the search or filters to see the full register." : "Create a draft when you have agreed the client scope and price."}</p>{invoices.length === 0 && <Button type="button" variant="outline" onClick={onNew} className="mt-4 h-9 border-border bg-secondary text-xs text-ivory hover:bg-secondary/80"><FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Start a draft</Button>}</div>}
      </div>
    </section>
  );
}

```

## src/components/hub/InvoicePreview.tsx

```tsx
import { AlertTriangle, Landmark, Smartphone } from "lucide-react";
import { CENTRAL_HUB_INVOICE_LOGO, brandForSettings, formatAud, hasPaymentDetails, type InvoiceLineItem, type InvoiceRecord, type InvoiceSettingsRecord } from "@/lib/invoice-catalog";
import { optimizeStorageImage } from "@/lib/seo";

type PreviewInvoice = Partial<InvoiceRecord> & { lineItems?: InvoiceLineItem[] };
type Props = { invoice: PreviewInvoice; settings?: Partial<InvoiceSettingsRecord>; templateOnly?: boolean };

function displayDate(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function value(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function PaymentInstructions({ settings }: { settings: Partial<InvoiceSettingsRecord> }) {
  const details = hasPaymentDetails(settings);
  const bankAccountName = value(settings.bankAccountName);
  const bankName = value(settings.bankName);
  const bsb = value(settings.bsb);
  const accountNumber = value(settings.accountNumber);
  const payid = value(settings.payid);
  const hasBankDetails = Boolean(bankAccountName || bankName || bsb || accountNumber);
  if (!details) return <div className="invoice-payment-warning flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /><div><p className="font-semibold">Payment details still need configuring</p><p className="mt-1 text-xs leading-5 text-amber-900/75">Add bank transfer or PayID details in Invoice Settings before sending this invoice to a client.</p></div></div>;
  return <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">{hasBankDetails && <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><Landmark className="h-3.5 w-3.5" aria-hidden="true" />Bank transfer</div><div className="mt-3 space-y-1.5 text-sm text-slate-800">{bankAccountName && <p><span className="text-slate-500">Account name:</span> {bankAccountName}</p>}{bankName && <p><span className="text-slate-500">Bank:</span> {bankName}</p>}{bsb && <p><span className="text-slate-500">BSB:</span> {bsb}</p>}{accountNumber && <p><span className="text-slate-500">Account number:</span> {accountNumber}</p>}</div></div>}{payid && <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><Smartphone className="h-3.5 w-3.5" aria-hidden="true" />PayID</div><p className="mt-3 break-words text-sm font-semibold text-slate-900">{payid}</p><p className="mt-1 text-xs leading-5 text-slate-500">Use the invoice number as the payment reference.</p></div>}</div>;
}

export function InvoicePreview({ invoice, settings, templateOnly = false }: Props) {
  const currentSettings = settings || invoice.paymentInstructionSnapshot || {};
  const brand = brandForSettings(currentSettings);
  const logo = optimizeStorageImage(brand.logoUrl || CENTRAL_HUB_INVOICE_LOGO, 180) || brand.logoUrl || CENTRAL_HUB_INVOICE_LOGO;
  const lineItems = invoice.lineItems?.length ? invoice.lineItems : [{ id: "preview", kind: "addon", description: "Your agreed service or package", quantity: 1, unitAmount: 0, lineTotal: 0 }];
  const issuerName = value(currentSettings.tradingName) || value(currentSettings.legalName) || "Your business name";
  const clientName = value(invoice.clientName) || "Client name";
  const subtotal = Number(invoice.subtotal || 0);
  const gstAmount = Number(invoice.gstAmount || 0);
  const total = Number(invoice.total || subtotal + gstAmount);
  const showPayment = !templateOnly;

  return <article className="invoice-print-surface overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)]" style={{ borderTopColor: brand.primaryColor, borderTopWidth: 7 }} aria-label="Branded invoice preview">
    <div className="px-5 py-6 sm:px-9 sm:py-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-100"><img src={logo} alt="Business logo" className="h-full w-full object-contain" /></div><div><p className="text-lg font-bold tracking-tight" style={{ color: brand.secondaryColor }}>{issuerName}</p>{value(currentSettings.legalName) && issuerName !== value(currentSettings.legalName) && <p className="mt-0.5 text-xs text-slate-500">{value(currentSettings.legalName)}</p>}<p className="mt-1 text-xs text-slate-500">{value(currentSettings.email) || "Business email"}{value(currentSettings.phone) ? ` · ${value(currentSettings.phone)}` : ""}</p></div></div><div className="sm:text-right"><p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.accentColor }}>Invoice</p><p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: brand.secondaryColor }}>{value(invoice.invoiceNumber) || "INV-0001"}</p><p className="mt-2 text-xs text-slate-500">Issued {displayDate(invoice.issueDate)}</p><p className="mt-0.5 text-xs text-slate-500">Due {displayDate(invoice.dueDate)}</p></div></div><div className="mt-7 grid gap-5 border-y border-slate-200 py-5 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Billed to</p><p className="mt-2 font-semibold text-slate-900">{clientName}</p>{value(invoice.clientEmail) && <p className="mt-1 text-xs text-slate-500">{value(invoice.clientEmail)}</p>}{value(invoice.clientPhone) && <p className="mt-0.5 text-xs text-slate-500">{value(invoice.clientPhone)}</p>}{value(invoice.clientAddress) && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">{value(invoice.clientAddress)}</p>}</div><div className="sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Billing terms</p><p className="mt-2 text-sm font-semibold text-slate-800">{value(invoice.billingTerms) || "Payment terms to be confirmed"}</p><p className="mt-1 text-xs text-slate-500">All amounts are in Australian dollars.</p></div></div><div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-[1fr_70px_120px]"><span>Description</span><span className="text-right">Qty</span><span className="text-right">Amount</span></div>{lineItems.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:grid-cols-[1fr_70px_120px]"><div><p className="font-semibold text-slate-800">{item.description || "Service"}</p>{item.termLabel && <p className="mt-1 text-xs text-slate-500">{item.termLabel}</p>}</div><span className="text-right text-slate-500">{item.quantity}</span><span className="text-right font-semibold text-slate-800">{formatAud(item.lineTotal || item.quantity * item.unitAmount)}</span></div>)}</div><div className="mt-6 flex justify-end"><div className="w-full max-w-xs space-y-2 text-sm"><div className="flex justify-between gap-4 text-slate-500"><span>Subtotal</span><span>{formatAud(subtotal)}</span></div>{invoice.gstEnabled && <div className="flex justify-between gap-4 text-slate-500"><span>GST ({Number(invoice.gstRate || 0)}%)</span><span>{formatAud(gstAmount)}</span></div>}<div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-bold" style={{ color: brand.secondaryColor }}><span>Total</span><span>{formatAud(total)}</span></div></div></div>{showPayment && <div className="mt-7"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: brand.accentColor }}>How to pay</p><PaymentInstructions settings={currentSettings} /></div>}{value(invoice.notes) && <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Notes</p><p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{value(invoice.notes)}</p></div>}{value(currentSettings.paymentTerms) && <p className="mt-5 text-xs leading-5 text-slate-500">{value(currentSettings.paymentTerms)}</p>}<div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-400 sm:flex-row sm:items-end sm:justify-between"><span>{value(currentSettings.abn) ? `ABN ${value(currentSettings.abn)}` : "ABN to be added"}</span><span className="sm:text-right">{value(currentSettings.footerNote) || "Thank you for your business."}</span></div></div>
  </article>;
}

```

## src/components/hub/InvoiceSettingsWorkspace.tsx

```tsx
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Eye, Landmark, LockKeyhole, Palette, Save, ShieldCheck, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceSettings as InvoiceSettingsEntity } from "@/entities";
import type { NavId } from "@/lib/hub-data";
import { defaultInvoiceSettings, type InvoiceSettingsRecord } from "@/lib/invoice-catalog";
import { InvoicePreview } from "@/components/hub/InvoicePreview";

type Props = { onNavigate: (id: NavId) => void };
type LoadState = "loading" | "ready" | "unavailable";
type SaveState = "idle" | "saving" | "saved" | "error";

const inputClass = "h-10 border-border bg-background/60 text-foreground placeholder:text-muted-foreground";
const textAreaClass = "min-h-[96px] border-border bg-background/60 text-foreground placeholder:text-muted-foreground";
const stringFields: (keyof InvoiceSettingsRecord)[] = ["legalName", "tradingName", "abn", "address", "email", "phone", "website", "logoUrl", "primaryColor", "secondaryColor", "accentColor", "bankAccountName", "bankName", "bsb", "accountNumber", "payid", "paymentTerms", "invoicePrefix", "footerNote"];

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function mapSettings(value: unknown): InvoiceSettingsRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const base = defaultInvoiceSettings();
  return { ...base, id: text(raw.id) || undefined, legalName: text(raw.legalName), tradingName: text(raw.tradingName), abn: text(raw.abn), address: text(raw.address), email: text(raw.email), phone: text(raw.phone), website: text(raw.website), logoUrl: text(raw.logoUrl), primaryColor: text(raw.primaryColor), secondaryColor: text(raw.secondaryColor), accentColor: text(raw.accentColor), bankAccountName: text(raw.bankAccountName), bankName: text(raw.bankName), bsb: text(raw.bsb), accountNumber: text(raw.accountNumber), payid: text(raw.payid), paymentTerms: text(raw.paymentTerms), invoicePrefix: text(raw.invoicePrefix) || "INV-", nextInvoiceNumber: Math.max(1, Math.floor(Number(raw.nextInvoiceNumber) || 1)), gstEnabled: Boolean(raw.gstEnabled), gstRate: Number.isFinite(Number(raw.gstRate)) ? Number(raw.gstRate) : 10, footerNote: text(raw.footerNote), updated_at: text(raw.updated_at) || undefined };
}

function cleanDraft(draft: InvoiceSettingsRecord) {
  const payload: Record<string, unknown> = {};
  stringFields.forEach((field) => { payload[field] = String(draft[field] || "").trim(); });
  payload.nextInvoiceNumber = Math.max(1, Math.floor(Number(draft.nextInvoiceNumber) || 1));
  payload.gstEnabled = Boolean(draft.gstEnabled);
  payload.gstRate = Math.max(0, Math.min(100, Number(draft.gstRate) || 0));
  return payload;
}

export function InvoiceSettingsWorkspace({ onNavigate }: Props) {
  const [settings, setSettings] = useState<InvoiceSettingsRecord | null>(null);
  const [draft, setDraft] = useState<InvoiceSettingsRecord>(defaultInvoiceSettings);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setMessage("");
    const load = async () => {
      try {
        const records = await (InvoiceSettingsEntity as any).list("-updated_at", 10);
        if (cancelled) return;
        const next = Array.isArray(records) ? records.map(mapSettings).filter(Boolean)[0] as InvoiceSettingsRecord | undefined : undefined;
        setSettings(next || null);
        setDraft(next || defaultInvoiceSettings());
        setLoadState("ready");
      } catch (error) {
        console.error("Failed to load invoice settings", error);
        if (!cancelled) { setLoadState("unavailable"); setMessage("Invoice settings could not be loaded. Try again before saving."); }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [retryKey]);

  const setField = (field: keyof InvoiceSettingsRecord, value: string | number | boolean) => { setDraft((current) => ({ ...current, [field]: value })); setSaveState("idle"); setMessage(""); };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loadState !== "ready") { setSaveState("error"); setMessage("Wait for the private settings to load, then try again."); return; }
    if (draft.primaryColor && !/^#[0-9a-f]{6}$/i.test(draft.primaryColor.trim())) { setSaveState("error"); setMessage("Primary colour must be a six-digit hex value, such as #BAFB3A, or left blank to use the Central Hub default."); return; }
    if (draft.secondaryColor && !/^#[0-9a-f]{6}$/i.test(draft.secondaryColor.trim())) { setSaveState("error"); setMessage("Secondary colour must be a six-digit hex value, such as #141820, or left blank to use the Central Hub default."); return; }
    if (draft.accentColor && !/^#[0-9a-f]{6}$/i.test(draft.accentColor.trim())) { setSaveState("error"); setMessage("Accent colour must be a six-digit hex value, such as #1CC7E0, or left blank to use the Central Hub default."); return; }
    const payload = cleanDraft(draft);
    setSaveState("saving");
    try {
      const response = settings ? await (InvoiceSettingsEntity as any).update(settings.id, payload) : await (InvoiceSettingsEntity as any).create(payload);
      const next = mapSettings(response) || { ...draft, ...payload } as InvoiceSettingsRecord;
      setSettings(next); setDraft(next); setSaveState("saved"); setMessage("Private invoice settings saved. New drafts will use these details.");
    } catch (error) {
      console.error("Failed to save invoice settings", error);
      setSaveState("error"); setMessage(error instanceof Error && error.message ? error.message : "Invoice settings could not be saved. Check your access and try again.");
    }
  };

  const disabled = loadState !== "ready" || saveState === "saving";
  const previewInvoice = { invoiceNumber: "INV-0001", issueDate: new Date().toISOString().slice(0, 10), dueDate: "", clientName: "Client name", billingTerms: draft.paymentTerms || "Prepaid term shown here", lineItems: [{ id: "preview", kind: "addon" as const, description: "Your agreed service or package", quantity: 1, unitAmount: 0, lineTotal: 0 }], subtotal: 0, gstEnabled: draft.gstEnabled, gstRate: draft.gstRate, gstAmount: 0, total: 0, notes: "Preview only. This is not a saved invoice." };

  return <section className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="invoice-settings-title"><div className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><Button type="button" variant="ghost" onClick={() => onNavigate("invoices")} className="mb-3 h-8 gap-2 px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-ivory"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back to invoices</Button><div className="flex items-center gap-2 text-cyan-accent"><Landmark className="h-4 w-4" aria-hidden="true" /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Private invoice settings</p></div><h2 id="invoice-settings-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-ivory sm:text-4xl">Set the details clients will see.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Keep legal, tax, brand, bank transfer, and PayID details here. Nothing is invented for you, and payment information stays inside your owner-only invoice records.</p></div><div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3.5 py-3 text-xs text-primary"><LockKeyhole className="h-4 w-4" aria-hidden="true" />Owner-only settings</div></div>{message && <div role={saveState === "error" ? "alert" : "status"} className={`mt-5 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm ${saveState === "error" ? "border-destructive/25 bg-destructive/[0.06] text-red-200" : "border-primary/20 bg-primary/[0.06] text-primary"}`}>{saveState === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}{message}{loadState === "unavailable" && <Button type="button" variant="outline" onClick={() => setRetryKey((key) => key + 1)} className="ml-auto h-8 border-border bg-card text-xs text-foreground">Try again</Button>}</div>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]"><form onSubmit={handleSubmit} className="space-y-5"><article className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div><div><h3 className="font-display text-xl font-semibold text-ivory">Business identity</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Leave unknown values blank. The preview uses the Central Hub logo and brand colours only as a visual fallback.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-trading-name">Trading name</Label><Input id="invoice-trading-name" value={draft.tradingName} onChange={(e) => setField("tradingName", e.target.value)} placeholder="Leave blank until confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-legal-name">Legal business name</Label><Input id="invoice-legal-name" value={draft.legalName} onChange={(e) => setField("legalName", e.target.value)} placeholder="Leave blank until confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-abn">ABN</Label><Input id="invoice-abn" value={draft.abn} onChange={(e) => setField("abn", e.target.value)} placeholder="Enter only when confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-email">Business email</Label><Input id="invoice-email" type="email" value={draft.email} onChange={(e) => setField("email", e.target.value)} placeholder="hello@yourbusiness.com" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-phone">Business phone</Label><Input id="invoice-phone" value={draft.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Enter when confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-website">Website</Label><Input id="invoice-website" value={draft.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://" disabled={disabled} className={inputClass} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="invoice-address">Business address</Label><Textarea id="invoice-address" value={draft.address} onChange={(e) => setField("address", e.target.value)} placeholder="Leave blank until confirmed" disabled={disabled} className={textAreaClass} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="invoice-logo">Logo URL</Label><Input id="invoice-logo" value={draft.logoUrl} onChange={(e) => setField("logoUrl", e.target.value)} placeholder="Leave blank to use the existing Central Hub logo" disabled={disabled} className={inputClass} /></div></div></article>
      <article className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-accent/10 text-cyan-accent"><Palette className="h-5 w-5" aria-hidden="true" /></div><div><h3 className="font-display text-xl font-semibold text-ivory">Brand colours</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Use six-digit hex values, or leave each blank to keep the Central Hub defaults.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-3">{[["primaryColor", "Primary", "#BAFB3A"], ["secondaryColor", "Secondary", "#141820"], ["accentColor", "Accent", "#1CC7E0"]].map(([field, label, placeholder]) => <div key={field} className="space-y-2"><Label htmlFor={`invoice-${field}`}>{label}</Label><Input id={`invoice-${field}`} value={draft[field as keyof InvoiceSettingsRecord] as string} onChange={(e) => setField(field as keyof InvoiceSettingsRecord, e.target.value)} placeholder={placeholder} disabled={disabled} className={inputClass} /></div>)}</div></article>
      <article className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><Landmark className="h-5 w-5" aria-hidden="true" /></div><div><h3 className="font-display text-xl font-semibold text-ivory">Bank transfer & PayID</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">These values appear on an invoice only after you enter and save them.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-bank-account">Account name</Label><Input id="invoice-bank-account" value={draft.bankAccountName} onChange={(e) => setField("bankAccountName", e.target.value)} placeholder="Enter when confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-bank-name">Bank name</Label><Input id="invoice-bank-name" value={draft.bankName} onChange={(e) => setField("bankName", e.target.value)} placeholder="Enter when confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-bsb">BSB</Label><Input id="invoice-bsb" value={draft.bsb} onChange={(e) => setField("bsb", e.target.value)} placeholder="Enter when confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-account-number">Account number</Label><Input id="invoice-account-number" value={draft.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} placeholder="Enter when confirmed" disabled={disabled} className={inputClass} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="invoice-payid">PayID</Label><div className="relative"><Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="invoice-payid" value={draft.payid} onChange={(e) => setField("payid", e.target.value)} placeholder="Email or mobile PayID, when confirmed" disabled={disabled} className={`${inputClass} pl-9`} /></div></div></div></article>
      <article className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h3 className="font-display text-xl font-semibold text-ivory">Invoice defaults</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-payment-terms">Payment terms</Label><Input id="invoice-payment-terms" value={draft.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)} placeholder="Example: Payment due before work begins" disabled={disabled} className={inputClass} /><p className="text-[11px] leading-5 text-muted-foreground">Use wording you have approved for your business.</p></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="invoice-prefix">Number prefix</Label><Input id="invoice-prefix" value={draft.invoicePrefix} onChange={(e) => setField("invoicePrefix", e.target.value)} disabled={disabled} className={inputClass} /></div><div className="space-y-2"><Label htmlFor="invoice-next-number">Next number</Label><Input id="invoice-next-number" type="number" min="1" value={draft.nextInvoiceNumber} onChange={(e) => setField("nextInvoiceNumber", Number(e.target.value))} disabled={disabled} className={inputClass} /></div></div><label className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground sm:col-span-2"><input type="checkbox" checked={draft.gstEnabled} onChange={(e) => setField("gstEnabled", e.target.checked)} disabled={disabled} className="mt-0.5 h-4 w-4 accent-lime" /><span><strong className="text-ivory">Add GST to new invoices</strong><span className="mt-1 block">Only enable this after confirming the business GST position.</span></span></label><div className="space-y-2"><Label htmlFor="invoice-gst-rate">GST rate (%)</Label><Input id="invoice-gst-rate" type="number" min="0" max="100" step="0.1" value={draft.gstRate} onChange={(e) => setField("gstRate", Number(e.target.value))} disabled={disabled} className={inputClass} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="invoice-footer">Footer note</Label><Textarea id="invoice-footer" value={draft.footerNote} onChange={(e) => setField("footerNote", e.target.value)} placeholder="Optional approved note for the invoice footer" disabled={disabled} className={textAreaClass} /></div></div><div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 text-primary" aria-hidden="true" />Only your account can read or update these details.</p><Button type="submit" disabled={disabled} className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-4 w-4" aria-hidden="true" />{saveState === "saving" ? "Saving…" : settings ? "Save settings" : "Save private settings"}</Button></div></article></form>
      <div className="space-y-4 xl:sticky xl:top-28 xl:self-start"><div className="flex items-center gap-2 text-cyan-accent"><Eye className="h-4 w-4" aria-hidden="true" /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Live branded preview</p></div><p className="text-xs leading-5 text-muted-foreground">Preview only. This example is not saved and contains no customer record. The payment panel will warn until you configure bank transfer or PayID details.</p><InvoicePreview invoice={previewInvoice} settings={draft} /></div>
    </div></section>;
}

```

## src/pages/BillingDashboard.tsx

```tsx
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  CircleOff,
  CreditCard,
  Info,
  Landmark,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const metricCards = [
  { label: "MRR", description: "Unavailable without live billing data" },
  { label: "One-time this month", description: "No confirmed charges to report" },
  { label: "YTD total revenue", description: "No connected revenue source" },
  { label: "Active subscriptions", description: "No subscription records connected" },
  { label: "Churn rate", description: "Unavailable until subscription history exists" },
];

function StatusBadge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warning" }) {
  return (
    <Badge
      variant="outline"
      className={tone === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-border bg-secondary text-muted-foreground"}
    >
      {children}
    </Badge>
  );
}

function EmptyPanel({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-border bg-card/70 p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-ivory">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default function BillingDashboard() {
  return (
    <div className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-8 py-2">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> No payment provider connected
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ivory sm:text-[2.15rem]">Subscriptions &amp; Billing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              This is the operator revenue view for your business. It currently has no connected billing data, so no charges, subscriptions, or payment actions are active.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            <span className="font-semibold text-ivory">Currency</span> AUD · GST added if applicable
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative overflow-hidden rounded-[20px] border border-border bg-card p-5"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
              <p className="relative text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{metric.label}</p>
              <p className="relative mt-3 font-display text-3xl font-bold tracking-tight text-ivory">—</p>
              <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{metric.description}</p>
            </motion.div>
          ))}
        </div>

        <section className="rounded-[24px] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.09] via-card to-card p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-200">
              <CircleOff className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-ivory">Billing is ready for live data</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                No payment connection is configured for this project. This screen will remain read-only until a supported provider is connected through Buildy payment settings. After that, confirmed payments can populate revenue, subscriptions, and transaction history here.
              </p>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> No credentials stored here</span>
                <span className="inline-flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> AUD reporting</span>
                <span className="inline-flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> No actions enabled</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-ivory">Payment connections</h2>
              <p className="mt-1 text-sm text-muted-foreground">These operator connections are separate from client store gateway preferences in TradeSite Builder.</p>
            </div>
            <StatusBadge tone="warning">Read-only status</StatusBadge>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[20px] border border-amber-500/20 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-200"><CreditCard className="h-5 w-5" /></div>
                <StatusBadge tone="warning">Not connected</StatusBadge>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ivory">Stripe</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Card payments, recurring plans, and Stripe transaction events are unavailable in this project.</p>
              <p className="mt-4 text-xs text-amber-200">No Stripe connection action is enabled here.</p>
            </div>

            <div className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground"><Landmark className="h-5 w-5" /></div>
                <StatusBadge>Unavailable</StatusBadge>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ivory">Bank transfer</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">No bank payout instructions, reconciliation, or invoice collection workflow is configured for this view.</p>
              <p className="mt-4 text-xs text-muted-foreground">No bank details have been collected.</p>
            </div>

            <div className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground"><Wallet className="h-5 w-5" /></div>
                <StatusBadge>Unavailable</StatusBadge>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ivory">PayPal</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">PayPal is not connected for operator billing. A client store preference does not create a payout connection here.</p>
              <p className="mt-4 text-xs text-muted-foreground">No merchant account is linked.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="flex items-center gap-2 font-display text-base font-semibold text-ivory"><Users className="h-4 w-4 text-primary" /> Subscriptions</h2><p className="mt-1 text-xs text-muted-foreground">No active or past subscription records are connected.</p></div>
              <StatusBadge>No data</StatusBadge>
            </div>
            <div className="mt-5"><EmptyPanel icon={Users} title="Nothing to manage" description="Upgrade, downgrade, cancellation, and new subscription controls stay unavailable until real subscription data is connected." /></div>
          </div>

          <div className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="flex items-center gap-2 font-display text-base font-semibold text-ivory"><Receipt className="h-4 w-4 text-primary" /> Transaction history</h2><p className="mt-1 text-xs text-muted-foreground">No confirmed charges or refunds are available.</p></div>
              <StatusBadge>No data</StatusBadge>
            </div>
            <div className="mt-5"><EmptyPanel icon={Receipt} title="No transactions yet" description="Export and transaction management stay unavailable because this project has no connected payment event source." /></div>
          </div>
        </section>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> <span><strong className="text-ivory">AUD and GST:</strong> Future billing records will be reported in Australian dollars, with GST added if applicable. This page does not create invoices, charges, subscriptions, payment credentials, or client orders. Client checkout preferences remain in TradeSite Builder.</span></p>
        </div>
      </div>
    </div>
  );
}

```

## src/components/hub/SettingsWorkspace.tsx

```tsx
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, BarChart3, CalendarDays, CheckCircle2, CreditCard, Globe2, LockKeyhole, RefreshCw, Rocket, Save, Server, Settings2, ShieldCheck, UserRound, UsersRound, AlertCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceSettings as WorkspaceSettingsEntity, User } from "@/entities";
import type { NavId } from "@/lib/hub-data";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "unavailable";
type SaveState = "idle" | "saving" | "saved" | "error";
type WorkspaceSettingsRecord = { id: string; workspaceName: string; timezone: string; operatorNotes: string; updated_at?: string };
type SettingsDraft = Omit<WorkspaceSettingsRecord, "id" | "updated_at">;
type AccountSnapshot = { email: string; displayName: string; role: string };
type Props = { onNavigate: (id: NavId) => void; onWorkspaceNameChange?: (name: string) => void };

type Destination = { id: NavId; label: string; detail: string; icon: LucideIcon; accent: string };
const DESTINATIONS: Destination[] = [
  { id: "billing", label: "Billing", detail: "Payment records are not connected", icon: CreditCard, accent: "text-amber-200" },
  { id: "hosting", label: "Hosting", detail: "Manual hosting records only", icon: Server, accent: "text-cyan-accent" },
  { id: "growthstack", label: "GrowthStack", detail: "Operator work records only", icon: Rocket, accent: "text-primary" },
  { id: "calendar", label: "Content Calendar", detail: "Planning records, no publishing", icon: CalendarDays, accent: "text-amber-200" },
  { id: "reports", label: "Reports", detail: "Entered snapshots, no analytics feed", icon: BarChart3, accent: "text-violet-300" },
];

const inputClass = "h-11 border-border bg-background/70 text-foreground placeholder:text-muted-foreground";
const textAreaClass = "min-h-[122px] border-border bg-background/70 text-foreground placeholder:text-muted-foreground";

function readText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function validTimezone(value: string) {
  try {
    if (!value.trim()) return false;
    new Intl.DateTimeFormat("en-US", { timeZone: value.trim() }).format();
    return true;
  } catch {
    return false;
  }
}

function mapSettings(value: unknown): WorkspaceSettingsRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readText(record.id);
  return id ? { id, workspaceName: readText(record.workspaceName), timezone: readText(record.timezone), operatorNotes: readText(record.operatorNotes), updated_at: readText(record.updated_at) } : null;
}

function mapAccount(value: unknown): AccountSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const email = readText(record.email);
  const displayName = readText(record.full_name || record.fullName || record.name, "Name not provided");
  const role = readText(record.role, "Role unavailable");
  return email || displayName !== "Name not provided" || role !== "Role unavailable" ? { email: email || "Email unavailable", displayName, role } : null;
}

function prettyRole(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function savedLabel(value?: string) {
  if (!value) return "No preferences saved yet";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? `Last saved ${new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(timestamp)}` : "Saved preferences loaded";
}

export function SettingsWorkspace({ onNavigate, onWorkspaceNameChange }: Props) {
  const [settings, setSettings] = useState<WorkspaceSettingsRecord | null>(null);
  const [draft, setDraft] = useState<SettingsDraft>(() => ({ workspaceName: "", timezone: browserTimezone(), operatorNotes: "" }));
  const [settingsState, setSettingsState] = useState<LoadState>("loading");
  const [accountState, setAccountState] = useState<LoadState>("loading");
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSettingsState("loading");
    setAccountState("loading");
    setLoadError("");
    const load = async () => {
      const [settingsResult, accountResult] = await Promise.allSettled([
        (WorkspaceSettingsEntity as any).list("-updated_at", 20),
        (User as any).me(),
      ]);
      if (cancelled) return;
      if (settingsResult.status === "fulfilled" && Array.isArray(settingsResult.value)) {
        const nextSettings = settingsResult.value.map(mapSettings).filter(Boolean)[0] as WorkspaceSettingsRecord | undefined;
        setSettings(nextSettings || null);
        setDraft({ workspaceName: nextSettings?.workspaceName || "", timezone: nextSettings?.timezone || browserTimezone(), operatorNotes: nextSettings?.operatorNotes || "" });
        setSettingsState("ready");
      } else {
        console.warn("Failed to load workspace settings", settingsResult.status === "rejected" ? settingsResult.reason : "Invalid workspace settings response");
        setSettings(null);
        setSettingsState("unavailable");
        setLoadError("Workspace preferences could not be loaded. Try again before saving changes.");
      }
      if (accountResult.status === "fulfilled") {
        const nextAccount = mapAccount(accountResult.value);
        setAccount(nextAccount);
        setAccountState(nextAccount ? "ready" : "unavailable");
      } else {
        console.warn("Managed account details are unavailable", accountResult.reason);
        setAccount(null);
        setAccountState("unavailable");
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [retryKey]);

  const setField = (field: keyof SettingsDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveState("idle");
    setSaveError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const workspaceName = draft.workspaceName.trim().replace(/\s+/g, " ");
    const timezone = draft.timezone.trim();
    const operatorNotes = draft.operatorNotes.trim();
    if (settingsState !== "ready") { setSaveState("error"); setSaveError("Wait for workspace preferences to load, then try again."); return; }
    if (workspaceName.length < 2) { setSaveState("error"); setSaveError("Enter a workspace name with at least two characters."); return; }
    if (workspaceName.length > 64) { setSaveState("error"); setSaveError("Keep the workspace name to 64 characters or fewer."); return; }
    if (!validTimezone(timezone)) { setSaveState("error"); setSaveError("Enter a valid IANA timezone, such as Australia/Sydney or UTC."); return; }
    if (operatorNotes.length > 2000) { setSaveState("error"); setSaveError("Keep operator notes to 2,000 characters or fewer."); return; }

    setSaveState("saving");
    setSaveError("");
    const payload = { workspaceName, timezone, operatorNotes };
    try {
      const response = settings
        ? await (WorkspaceSettingsEntity as any).update(settings.id, payload)
        : await (WorkspaceSettingsEntity as any).create(payload);
      let nextSettings = mapSettings(response);
      if (!nextSettings && settings) nextSettings = { ...settings, ...payload, updated_at: new Date().toISOString() };
      if (!nextSettings) {
        const refreshed = await (WorkspaceSettingsEntity as any).list("-updated_at", 1);
        nextSettings = Array.isArray(refreshed) ? mapSettings(refreshed[0]) : null;
      }
      if (!nextSettings) throw new Error("Preferences were saved, but the saved record could not be reloaded. Refresh before saving again.");
      setSettings(nextSettings);
      setDraft(payload);
      setSaveState("saved");
      onWorkspaceNameChange?.(workspaceName);
    } catch (error) {
      console.error("Failed to save workspace preferences", error);
      setSaveState("error");
      setSaveError(error instanceof Error && error.message.trim() ? error.message : "Workspace preferences could not be saved. Check your access and try again.");
    }
  };

  const formDisabled = settingsState !== "ready" || saveState === "saving";
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="settings-workspace-title">
      <div className="flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-slate-300/20 bg-slate-300/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200"><Settings2 className="h-3.5 w-3.5" aria-hidden="true" />Workspace control</div><h2 id="settings-workspace-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-ivory sm:text-4xl">Settings / Team</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Save the preferences that shape your operator desk, then use Buildy’s managed account controls for access and roles.</p></div><div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />Owner-only preferences</div>
      </div>

      {loadError && <div role="alert" className="mt-5 flex flex-col gap-3 rounded-2xl border border-destructive/25 bg-destructive/[0.06] px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{loadError}</span><Button type="button" variant="outline" onClick={() => setRetryKey((value) => value + 1)} className="h-9 gap-2 self-start border-border bg-card text-foreground hover:bg-secondary sm:self-auto"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Try again</Button></div>}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="account-access-title"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-accent/10 text-cyan-accent"><UserRound className="h-5 w-5" aria-hidden="true" /></div><div><h3 id="account-access-title" className="font-display text-xl font-semibold text-ivory">Account & access</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">These details come from the authenticated Buildy account and cannot be edited here.</p></div></div>{accountState === "loading" ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><Skeleton className="h-16 rounded-xl bg-secondary" /><Skeleton className="h-16 rounded-xl bg-secondary" /><Skeleton className="h-16 rounded-xl bg-secondary" /></div> : account ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-background/45 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email</p><p className="mt-2 truncate text-sm font-medium text-ivory" title={account.email}>{account.email}</p></div><div className="rounded-xl border border-border bg-background/45 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Display name</p><p className="mt-2 truncate text-sm font-medium text-ivory">{account.displayName}</p></div><div className="rounded-xl border border-border bg-background/45 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Role</p><p className="mt-2 text-sm font-medium text-ivory">{prettyRole(account.role)}</p></div></div> : <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/[0.06] p-3 text-sm leading-6 text-warning"><AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />Managed account details are unavailable right now. The dashboard remains protected, and no account changes were made.</div>}</article>

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="preferences-title"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Globe2 className="h-5 w-5" aria-hidden="true" /></div><div><h3 id="preferences-title" className="font-display text-xl font-semibold text-ivory">Workspace preferences</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Keep the operator desk recognisable without storing credentials or connection details.</p></div></div><span className="hidden rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">{savedLabel(settings?.updated_at)}</span></div><form onSubmit={handleSubmit} className="mt-6 space-y-5"><div className="space-y-2"><Label htmlFor="workspace-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace name</Label><Input id="workspace-name" value={draft.workspaceName} onChange={(event) => setField("workspaceName", event.target.value)} placeholder="Central Hub" maxLength={64} disabled={formDisabled} className={inputClass} /><p className="text-[11px] leading-5 text-muted-foreground">This name appears in the dashboard sidebar after a successful save.</p></div><div className="space-y-2"><Label htmlFor="workspace-timezone" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Default timezone</Label><Input id="workspace-timezone" list="workspace-timezones" value={draft.timezone} onChange={(event) => setField("timezone", event.target.value)} placeholder="Australia/Sydney" disabled={formDisabled} className={inputClass} /><datalist id="workspace-timezones"><option value="UTC" /><option value="Australia/Sydney" /><option value="Australia/Melbourne" /><option value="Australia/Brisbane" /><option value="Australia/Perth" /><option value="Asia/Singapore" /><option value="Asia/Tokyo" /><option value="Europe/London" /><option value="Europe/Paris" /><option value="America/New_York" /><option value="America/Chicago" /><option value="America/Denver" /><option value="America/Los_Angeles" /></datalist><p className="text-[11px] leading-5 text-muted-foreground">Use an IANA timezone such as UTC, Australia/Sydney, or America/Los_Angeles.</p></div><div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="operator-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Private operator notes</Label><span className="text-[11px] text-muted-foreground">{draft.operatorNotes.length}/2000</span></div><Textarea id="operator-notes" value={draft.operatorNotes} onChange={(event) => setField("operatorNotes", event.target.value)} placeholder="Keep handover notes, review context, or reminders for your next session." maxLength={2000} disabled={formDisabled} className={textAreaClass} /></div>{saveState === "saved" && <p role="status" className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-sm text-primary"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Preferences saved. The sidebar name is up to date.</p>}{(saveState === "error" || saveError) && <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{saveError}</p>}<div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />Only your account can read or change these preferences.</p><Button type="submit" disabled={formDisabled} className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-4 w-4" aria-hidden="true" />{saveState === "saving" ? "Saving…" : settings ? "Save changes" : "Save preferences"}</Button></div></form></article>
        </div>

        <div className="space-y-5">
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="team-access-title"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-300/10 text-slate-200"><UsersRound className="h-5 w-5" aria-hidden="true" /></div><div><h3 id="team-access-title" className="font-display text-xl font-semibold text-ivory">Team access</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Buildy manages authentication, invitations, and role controls for this dashboard.</p></div></div><div className="mt-5 space-y-3"><div className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Your account session protects this workspace. This screen does not create invitations, edit team membership, or assign roles.</p></div><div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />Managed account controls</div></div></article>

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="integrations-title"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-accent/10 text-cyan-accent"><Settings2 className="h-5 w-5" aria-hidden="true" /></div><div><h3 id="integrations-title" className="font-display text-xl font-semibold text-ivory">Integrations status</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">These links open saved dashboard areas. External providers remain unconnected until a separate setup exists.</p></div></div><div className="mt-5 space-y-2">{DESTINATIONS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background/35 p-3 text-left transition-colors hover:border-border/80 hover:bg-secondary/70"><Icon className={cn("h-4 w-4 shrink-0", item.accent)} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ivory">{item.label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></button>; })}</div><p className="mt-4 text-[11px] leading-5 text-muted-foreground">This dashboard stores preferences and operator-entered records. It does not request API keys, payment secrets, passwords, or access tokens here.</p></article>
        </div>
      </div>
    </section>
  );
}

```
