# Central Hub source bundle, part 01

This part contains the complete authenticated Central Hub shell and overview runtime.

## Manifest

- `src/App.tsx`, application providers, routes, and the protected dashboard entry
- `src/pages/Index.tsx`, the complete authenticated dashboard screen and overview orchestration
- `src/components/hub/HubSidebar.tsx`, the primary dashboard navigation
- `src/components/hub/WorkspaceHeader.tsx`, the dashboard header, alerts, profile, and search
- `src/components/hub/SummaryMetrics.tsx`, the overview metric cards
- `src/lib/hub-data.ts`, shared dashboard types, navigation data, defaults, and labels
- `src/main.tsx`, the application entry point
- `index.html`, the document shell and runtime-loaded assets
- `src/index.css`, global theme and dashboard styling
- `tailwind.config.ts`, the utility theme configuration
- `src/lib/superdev/client.ts`, the platform client setup
- `src/lib/utils.ts`, the shared class-name utility

The exact current source is preserved below. Every listed file is complete, with no omitted sections or placeholders.

## src/App.tsx

```tsx
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import Storefront from "./pages/Storefront";
import FinancialAdvisory from "./pages/FinancialAdvisory";
import Checkout from "./pages/Checkout";
import CheckoutIssue from "./pages/CheckoutIssue";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import { superdevClient } from "@/lib/superdev/client";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#BAFB3A] animate-spin" />
        <span className="text-[11px] tracking-[0.2em] text-white/40">TRADESITE</span>
      </div>
    </div>
  );
}

function ProtectedDashboard() {
  const [authState, setAuthState] = useState<"loading" | "authed" | "guest">("loading");

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const isAuth = await superdevClient.isAuthenticated();
        if (!mounted) return;
        setAuthState(isAuth ? "authed" : "guest");
      } catch {
        if (!mounted) return;
        setAuthState("guest");
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (authState === "loading") return <LoadingScreen />;
  if (authState === "guest") {
    return <Navigate to="/" replace />;
  }
  return <Index />;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<ProtectedDashboard />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/blog/*" element={<Blog />} />
            <Route path="/store/:storeId" element={<Storefront />} />
            <Route path="/store/:id" element={<Storefront />} />
            <Route path="/s/:storeId" element={<Storefront />} />
            <Route path="/s/:id" element={<Storefront />} />
            <Route path="/financial-advisory" element={<FinancialAdvisory />} />
            <Route path="/checkout/success" element={<SubscriptionSuccess />} />
            <Route path="/checkout/issue" element={<CheckoutIssue />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

```

## src/pages/Index.tsx

```tsx
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HubSidebar } from "@/components/hub/HubSidebar";
import { WorkspaceHeader } from "@/components/hub/WorkspaceHeader";
import { SummaryMetrics, type SummaryMetric } from "@/components/hub/SummaryMetrics";
import { SettingsWorkspace } from "@/components/hub/SettingsWorkspace";
import { ClientWorkspace } from "@/components/hub/ClientWorkspace";
import { HostingWorkspace } from "@/components/hub/HostingWorkspace";
import { GrowthStackWorkspace } from "@/components/hub/GrowthStackWorkspace";
import { ContentCalendarWorkspace } from "@/components/hub/ContentCalendarWorkspace";
import { ReportsWorkspace } from "@/components/hub/ReportsWorkspace";
import { EmailSignatureWorkspace } from "@/components/hub/EmailSignatureWorkspace";
import { FinancialHealthAuditWorkspace } from "@/components/hub/FinancialHealthAuditWorkspace";
import { SocialRevampWorkspace } from "@/components/hub/SocialRevampWorkspace";
import { SalesPlaybookWorkspace } from "@/components/hub/SalesPlaybookWorkspace";
import { InvoiceWorkspace } from "@/components/hub/InvoiceWorkspace";
import { InvoiceSettingsWorkspace } from "@/components/hub/InvoiceSettingsWorkspace";
import type { StatusFilter, ViewMode } from "@/components/hub/ClientControls";
import { normalizeActivePackages, normalizeClientKind, normalizeWebsiteSource, type NavId, type ClientSite } from "@/lib/hub-data";
import type { KeywordCalendarHandoff } from "@/lib/growth-local-visibility";
import type { OnboardingDestination } from "@/lib/client-onboarding";
import TradeSiteBuilder from "@/pages/TradeSiteBuilder";
import BillingDashboard from "@/pages/BillingDashboard";
import LeadFinder from "@/components/hub/LeadFinder";
import SavedLeadStudioWorkspace from "@/components/hub/SavedLeadStudioWorkspace";
import { ClientSite as ClientSiteEntity, Lead as LeadEntity, WorkspaceSettings as WorkspaceSettingsEntity } from "@/entities";

const STALE_BUILD_MS = 15 * 60 * 1000;
const CLIENT_SITE_WIPE_MARKER = "central-hub:client-site-wipe:v1";
const CLIENT_SITE_WIPE_LIST_LIMIT = 500;
type RecordLoadState = "loading" | "ready" | "unavailable";
type DashboardRecord = Record<string, unknown>;

let clientSiteWipePromise: Promise<boolean> | null = null;

function clientSiteWipeMarkerIsSet() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLIENT_SITE_WIPE_MARKER) === "complete";
  } catch {
    return false;
  }
}

function markClientSiteWipeComplete() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLIENT_SITE_WIPE_MARKER, "complete");
  } catch {
    // The in-memory promise still guards this dashboard session if storage is unavailable.
  }
}

async function listClientSitesForWipe() {
  const records = await (ClientSiteEntity as any).list("-created_at", CLIENT_SITE_WIPE_LIST_LIMIT);
  if (!Array.isArray(records)) throw new Error("Invalid client site response during the one-time wipe");
  return records as DashboardRecord[];
}

async function ensureClientSiteWipe() {
  if (clientSiteWipeMarkerIsSet()) return true;
  if (clientSiteWipePromise) return clientSiteWipePromise;

  const attempt = (async () => {
    try {
      const initialRecords = await listClientSitesForWipe();
      const deletionFailures = (await Promise.all(initialRecords.map(async (record) => {
        const id = textValue(record.id, "");
        if (!id) {
          console.warn("Skipped a client/site record without a record id during the one-time wipe");
          return true;
        }
        try {
          await (ClientSiteEntity as any).delete(id);
          return false;
        } catch (error) {
          console.warn(`Failed to remove client/site record ${id} during the one-time wipe`, error);
          return true;
        }
      }))).filter(Boolean).length;

      const refreshedRecords = await listClientSitesForWipe();
      if (deletionFailures === 0 && refreshedRecords.length === 0) {
        markClientSiteWipeComplete();
        return true;
      }

      if (deletionFailures > 0) {
        console.warn(`The one-time client/site wipe had ${deletionFailures} deletion failure(s); it will retry on a later Dashboard load`);
      }
      if (refreshedRecords.length > 0) {
        console.warn(`The one-time client/site wipe left ${refreshedRecords.length} record(s); it will retry on a later Dashboard load`);
      }
      return false;
    } catch (error) {
      console.warn("The one-time client/site wipe did not complete", error);
      return false;
    }
  })();

  const guardedAttempt = attempt.then((completed) => {
    if (!completed) clientSiteWipePromise = null;
    return completed;
  });
  clientSiteWipePromise = guardedAttempt;
  return guardedAttempt;
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeSiteStatus(value: unknown): ClientSite["status"] {
  const status = String(value || "draft").trim().toLowerCase();
  return status === "live" || status === "attention" || status === "draft" ? status : "draft";
}

function normalizeTier(value: unknown): ClientSite["tier"] {
  const tier = String(value || "none").trim();
  return tier === "Starter" || tier === "Growth" || tier === "Scale" || tier === "None" ? tier : "None";
}

function formatActivity(value: unknown) {
  const timestamp = Date.parse(String(value || ""));
  if (!Number.isFinite(timestamp)) return "No activity date";
  const age = Math.max(0, Date.now() - timestamp);
  if (age < 60_000) return "just now";
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(timestamp);
}

function plainRecord(value: unknown): DashboardRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DashboardRecord : undefined;
}

function optionalText(value: unknown) {
  return textValue(value, "") || undefined;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim());
  return values.length ? values : undefined;
}

function mapSiteRecord(record: DashboardRecord): ClientSite {
  const socialRecord = plainRecord(record.socialLinks);
  const socialLinks = socialRecord ? {
    facebookUrl: optionalText(socialRecord.facebookUrl),
    instagramUrl: optionalText(socialRecord.instagramUrl),
    tiktokUrl: optionalText(socialRecord.tiktokUrl),
    linkedinUrl: optionalText(socialRecord.linkedinUrl),
    googleBusinessUrl: optionalText(socialRecord.googleBusinessUrl),
  } : undefined;
  const socialLinkList = Array.isArray(record.socialLinkList)
    ? record.socialLinkList.map((item) => {
      const entry = plainRecord(item);
      const platform = optionalText(entry?.platform);
      const url = optionalText(entry?.url);
      return platform && url ? { platform, url } : null;
    }).filter((item): item is { platform: string; url: string } => Boolean(item))
    : undefined;
  const contactRecord = plainRecord(record.contactDetails);
  const contactDetails = contactRecord ? {
    phones: stringArray(contactRecord.phones),
    emails: stringArray(contactRecord.emails),
    contactPageUrl: optionalText(contactRecord.contactPageUrl),
    bookingUrl: optionalText(contactRecord.bookingUrl),
    physicalAddress: optionalText(contactRecord.physicalAddress),
    serviceAreas: stringArray(contactRecord.serviceAreas),
    openingHours: optionalText(contactRecord.openingHours),
  } : undefined;

  return {
    id: textValue(record.id, ""),
    businessName: textValue(record.businessName, "Untitled business"),
    trade: textValue(record.trade, "Business type not set"),
    businessType: optionalText(record.businessType),
    website: optionalText(record.website),
    status: normalizeSiteStatus(record.status),
    tier: normalizeTier(record.tier),
    mrr: 0,
    health: 0,
    uptime: 0,
    location: textValue(record.location, "Location not set"),
    lastActivity: formatActivity(record.updated_at || record.created_at),
    sourceLeadId: optionalText(record.sourceLeadId),
    clientKind: normalizeClientKind(record.clientKind),
    websiteSource: normalizeWebsiteSource(record.websiteSource),
    activePackages: normalizeActivePackages(record.activePackages),
    hostingRequired: typeof record.hostingRequired === "boolean" ? record.hostingRequired : true,
    phone: optionalText(record.phone),
    email: optionalText(record.email),
    logoImageUrl: optionalText(record.logoImageUrl),
    primaryColor: optionalText(record.primaryColor),
    secondaryColor: optionalText(record.secondaryColor),
    socialLinks,
    socialLinkList,
    contactDetails,
    services: stringArray(record.services),
  };
}

function numericValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function isHotLead(lead: DashboardRecord) {
  return String(lead.leadCategory || "").trim().toLowerCase() === "hot" && (numericValue(lead.score) ?? -Infinity) >= 70;
}

function needsAttention(lead: DashboardRecord) {
  const buildStatus = String(lead.siteBuildStatus || "").trim().toLowerCase();
  if (buildStatus === "failed") return true;
  if (buildStatus === "queued" || buildStatus === "building") {
    const updatedAt = Date.parse(String(lead.updated_at || ""));
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > STALE_BUILD_MS) return true;
  }
  return ["new", "replied", "meeting"].includes(String(lead.status || "").trim().toLowerCase());
}

const Index = () => {
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [realSites, setRealSites] = useState<ClientSite[]>([]);
  const [savedLeads, setSavedLeads] = useState<DashboardRecord[]>([]);
  const [siteLoadState, setSiteLoadState] = useState<RecordLoadState>("loading");
  const [leadLoadState, setLeadLoadState] = useState<RecordLoadState>("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [requestedLeadId, setRequestedLeadId] = useState<string | null>(null);
  const [hostingSummary, setHostingSummary] = useState({ attentionCount: 0, recordCount: 0 });
  const [growthStackSummary, setGrowthStackSummary] = useState({ attentionCount: 0, recordCount: 0 });
  const [workspaceName, setWorkspaceName] = useState("");
  const [calendarClientSiteId, setCalendarClientSiteId] = useState("");
  const [calendarHandoffDraft, setCalendarHandoffDraft] = useState<KeywordCalendarHandoff | undefined>();
  const [reportsClientSiteId, setReportsClientSiteId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSiteLoadState("loading");
    setLeadLoadState("loading");

    const load = async () => {
      const [sitesResult, leadsResult] = await Promise.allSettled([
        (async () => {
          await ensureClientSiteWipe();
          return (ClientSiteEntity as any).list("-created_at", 100);
        })(),
        (LeadEntity as any).list("-created_at", 200),
      ]);
      if (cancelled) return;

      if (sitesResult.status === "fulfilled" && Array.isArray(sitesResult.value)) {
        setRealSites((sitesResult.value as DashboardRecord[]).map(mapSiteRecord));
        setSiteLoadState("ready");
      } else {
        console.warn("Failed to load real client sites", sitesResult.status === "rejected" ? sitesResult.reason : "Invalid site response");
        setRealSites([]);
        setSiteLoadState("unavailable");
      }

      if (leadsResult.status === "fulfilled" && Array.isArray(leadsResult.value)) {
        setSavedLeads((leadsResult.value as DashboardRecord[]).filter((record) => Boolean(record && typeof record === "object")));
        setLeadLoadState("ready");
      } else {
        console.warn("Failed to load real leads", leadsResult.status === "rejected" ? leadsResult.reason : "Invalid lead response");
        setSavedLeads([]);
        setLeadLoadState("unavailable");
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const loadWorkspaceName = async () => {
      try {
        const records = await (WorkspaceSettingsEntity as any).list("-updated_at", 1);
        if (cancelled) return;
        const record = Array.isArray(records) ? records[0] as DashboardRecord | undefined : undefined;
        setWorkspaceName(textValue(record?.workspaceName, ""));
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load workspace name", error);
          setWorkspaceName("");
        }
      }
    };
    void loadWorkspaceName();
    return () => { cancelled = true; };
  }, []);

  const liveSites = useMemo(() => realSites.filter((site) => site.status === "live"), [realSites]);
  const draftSites = useMemo(() => realSites.filter((site) => site.status === "draft"), [realSites]);
  const hotLeads = useMemo(() => savedLeads.filter(isHotLead), [savedLeads]);
  const attentionLeads = useMemo(() => savedLeads.filter(needsAttention), [savedLeads]);
  const operationalAttentionCount = hostingSummary.attentionCount + growthStackSummary.attentionCount;

  const overviewMetrics = useMemo<SummaryMetric[]>(() => {
    const sitesUnavailable = siteLoadState !== "ready";
    const leadsUnavailable = leadLoadState !== "ready";
    const siteCountDetail = sitesUnavailable
      ? "Client records unavailable"
      : realSites.length === 0 ? "No records yet" : `${liveSites.length} live · ${draftSites.length} draft`;
    const leadCountDetail = leadsUnavailable
      ? "Lead records unavailable"
      : savedLeads.length === 0 ? "No records yet" : `${hotLeads.length} HOT ${hotLeads.length === 1 ? "lead" : "leads"}`;

    return [
      { id: "mrr", label: "Monthly recurring revenue", value: "—", detail: "Billing data not connected yet", unavailable: true, dominant: true },
      { id: "sites", label: "Client / business records", value: sitesUnavailable ? "—" : String(realSites.length), detail: siteCountDetail, unavailable: sitesUnavailable },
      { id: "liveSites", label: "Live records", value: sitesUnavailable ? "—" : String(liveSites.length), detail: sitesUnavailable ? "Client records unavailable" : liveSites.length ? "Published or active" : "No records yet", unavailable: sitesUnavailable },
      { id: "draftSites", label: "Draft records", value: sitesUnavailable ? "—" : String(draftSites.length), detail: sitesUnavailable ? "Client records unavailable" : draftSites.length ? "Awaiting launch" : "No records yet", unavailable: sitesUnavailable },
      { id: "health", label: "Average site health", value: "—", detail: "Health monitoring not connected yet", unavailable: true },
      { id: "savedLeads", label: "Saved leads", value: leadsUnavailable ? "—" : String(savedLeads.length), detail: leadCountDetail, unavailable: leadsUnavailable },
      { id: "hotLeads", label: "HOT leads", value: leadsUnavailable ? "—" : String(hotLeads.length), detail: leadsUnavailable ? "Lead records unavailable" : hotLeads.length ? "Verified score 70+ leads" : "No verified HOT leads yet", unavailable: leadsUnavailable },
      { id: "attention", label: "Needs attention", value: leadsUnavailable ? "—" : String(attentionLeads.length + operationalAttentionCount), detail: leadsUnavailable ? "Lead records unavailable" : attentionLeads.length + operationalAttentionCount ? "Lead and operational follow-ups" : "No open attention items", unavailable: leadsUnavailable },
    ];
  }, [attentionLeads.length, draftSites.length, hotLeads.length, leadLoadState, liveSites.length, operationalAttentionCount, realSites.length, savedLeads.length, siteLoadState]);

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();
    return realSites.filter((site) => {
      const matchesStatus = statusFilter === "all" || site.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return site.businessName.toLowerCase().includes(query) || site.trade.toLowerCase().includes(query) || site.location.toLowerCase().includes(query) || site.tier.toLowerCase().includes(query) || String(site.businessType || "").toLowerCase().includes(query) || String(site.website || "").toLowerCase().includes(query) || String(site.clientKind || "").toLowerCase().includes(query) || String(site.websiteSource || "").toLowerCase().includes(query) || (site.activePackages || []).some((packageId) => packageId.includes(query));
    });
  }, [search, statusFilter, realSites]);

  const handleNavigate = (id: NavId) => {
    if (id === "calendar") { setCalendarClientSiteId(""); setCalendarHandoffDraft(undefined); }
    if (id === "reports") setReportsClientSiteId("");
    if (id === "salesDesk" || id === "invoices" || id === "invoiceSettings") setSearch("");
    setActiveNav(id);
    setMobileNavOpen(false);
  };

  const handleOpenLeadDetails = (leadId: string) => {
    const normalizedId = String(leadId || "").trim();
    if (!normalizedId) return;
    setRequestedLeadId(normalizedId);
    setActiveNav("leadFinder");
    setMobileNavOpen(false);
  };

  const handleOpenClientSite = (siteId: string) => {
    const site = realSites.find((item) => item.id === siteId);
    setSearch(site?.businessName || "");
    setStatusFilter("all");
    setActiveNav("clients");
    setMobileNavOpen(false);
  };

  const handleOpenDeliveryWorkspace = (siteId: string, workspace: "signatures" | "financialAudits") => {
    const site = realSites.find((item) => item.id === siteId);
    setSearch(site?.businessName || "");
    setStatusFilter("all");
    setActiveNav(workspace);
    setMobileNavOpen(false);
  };

  const handleOpenEmailSignature = (siteId: string) => handleOpenDeliveryWorkspace(siteId, "signatures");
  const handleOpenFinancialAudit = (siteId: string) => handleOpenDeliveryWorkspace(siteId, "financialAudits");

  const handleOpenCalendarForClient = (siteId: string, draft?: KeywordCalendarHandoff) => {
    const site = realSites.find((item) => item.id === siteId);
    setCalendarClientSiteId(siteId);
    setCalendarHandoffDraft(draft);
    setSearch(site?.businessName || "");
    setActiveNav("calendar");
    setMobileNavOpen(false);
  };

  const handleOpenReportsForClient = (siteId: string) => {
    const site = realSites.find((item) => item.id === siteId);
    setReportsClientSiteId(siteId);
    setSearch(site?.businessName || "");
    setActiveNav("reports");
    setMobileNavOpen(false);
  };

  const handleOnboardingNavigate = (destination: OnboardingDestination, siteId: string, businessName: string) => {
    setSearch(businessName);
    setStatusFilter("all");
    setMobileNavOpen(false);

    switch (destination) {
      case "clients":
        setCalendarClientSiteId("");
        setCalendarHandoffDraft(undefined);
        setReportsClientSiteId("");
        setActiveNav("clients");
        return;
      case "growthstack":
        setActiveNav("growthstack");
        return;
      case "socialRevamp":
        setActiveNav("socialRevamp");
        return;
      case "signatures":
        setActiveNav("signatures");
        return;
      case "financialAudits":
        setActiveNav("financialAudits");
        return;
      case "hosting":
        setActiveNav("hosting");
        return;
      case "calendar":
        setCalendarClientSiteId(siteId);
        setCalendarHandoffDraft(undefined);
        setActiveNav("calendar");
        return;
      case "reports":
        setReportsClientSiteId(siteId);
        setActiveNav("reports");
        return;
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const isOverview = activeNav === "overview";
  const isClients = activeNav === "clients";
  const isBuilder = activeNav === "tradesite";
  const isSavedLeadStudio = activeNav === "savedLeadStudio";
  const isBilling = activeNav === "billing";
  const isLeadFinder = activeNav === "leadFinder";
  const isHosting = activeNav === "hosting";
  const isGrowthStack = activeNav === "growthstack";
  const isSocialRevamp = activeNav === "socialRevamp";
  const isCalendar = activeNav === "calendar";
  const isReports = activeNav === "reports";
  const isSignatures = activeNav === "signatures";
  const isFinancialAudits = activeNav === "financialAudits";
  const isSalesDesk = activeNav === "salesDesk";
  const isInvoices = activeNav === "invoices";
  const isInvoiceSettings = activeNav === "invoiceSettings";
  const isSettings = activeNav === "settings";
  const alertCount = leadLoadState === "ready" ? attentionLeads.length + operationalAttentionCount : operationalAttentionCount;
  const overviewBadge = siteLoadState === "unavailable"
    ? "Client and business records unavailable"
    : siteLoadState === "loading"
      ? "Loading saved client records"
      : realSites.length > 0
        ? `${realSites.length} saved client or business record${realSites.length === 1 ? "" : "s"}`
        : "No saved client records yet. Add a client or build a site";

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <div className="hub-noise absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 hidden lg:block"><div className="sticky top-0 h-screen"><HubSidebar activeNav={activeNav} onNavigate={handleNavigate} workspaceName={workspaceName} /></div></div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[288px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-ivory">
          <HubSidebar activeNav={activeNav} onNavigate={handleNavigate} workspaceName={workspaceName} className="h-full w-full border-r-0" />
        </SheetContent>
      </Sheet>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader activeNav={activeNav} search={search} onSearchChange={setSearch} onOpenMobileNav={() => setMobileNavOpen(true)} alertCount={alertCount} />
        <main className="hub-scrollbar flex-1 overflow-y-auto">
          <div className={isLeadFinder ? "block" : "hidden"} aria-hidden={!isLeadFinder}>
            <LeadFinder initialOpenLeadId={requestedLeadId} onInitialOpenHandled={(leadId) => setRequestedLeadId((current) => current === leadId ? null : current)} />
          </div>
          {isBuilder ? <div className="py-6"><TradeSiteBuilder onSiteCreated={() => setRefreshKey((key) => key + 1)} /></div>
            : isSavedLeadStudio ? <SavedLeadStudioWorkspace search={search} onSearchChange={setSearch} />
              : isBilling ? <div className="py-6"><BillingDashboard /></div>
                : isLeadFinder ? null
                : isHosting ? <HostingWorkspace search={search} onSearchChange={setSearch} refreshKey={refreshKey} onMutation={() => setRefreshKey((key) => key + 1)} onSummaryChange={setHostingSummary} />
                  : isGrowthStack ? <GrowthStackWorkspace search={search} onSearchChange={setSearch} refreshKey={refreshKey} onMutation={() => setRefreshKey((key) => key + 1)} onSummaryChange={setGrowthStackSummary} onOpenClient={handleOpenClientSite} onOpenLead={handleOpenLeadDetails} onOpenCalendar={handleOpenCalendarForClient} onOpenReports={handleOpenReportsForClient} />
                    : isSocialRevamp ? <SocialRevampWorkspace sites={realSites} sitesState={siteLoadState} search={search} onSearchChange={setSearch} refreshKey={refreshKey} onMutation={() => setRefreshKey((key) => key + 1)} onOpenCalendar={handleOpenCalendarForClient} />
                      : isCalendar ? <ContentCalendarWorkspace sites={realSites} sitesState={siteLoadState} search={search} onSearchChange={setSearch} refreshKey={refreshKey} onOpenClient={handleOpenClientSite} forcedClientSiteId={calendarClientSiteId} handoffDraft={calendarHandoffDraft} onHandoffConsumed={() => setCalendarHandoffDraft(undefined)} />
                      : isReports ? <ReportsWorkspace sites={realSites} sitesState={siteLoadState} search={search} onSearchChange={setSearch} refreshKey={refreshKey} onOpenClient={handleOpenClientSite} forcedClientSiteId={reportsClientSiteId} />
                        : isSignatures ? <EmailSignatureWorkspace sites={realSites} sitesState={siteLoadState} search={search} onSearchChange={setSearch} refreshKey={refreshKey} onMutation={() => setRefreshKey((key) => key + 1)} />
                          : isFinancialAudits ? <FinancialHealthAuditWorkspace sites={realSites} sitesState={siteLoadState} search={search} onSearchChange={setSearch} refreshKey={refreshKey} onMutation={() => setRefreshKey((key) => key + 1)} />
                            : isSalesDesk ? <SalesPlaybookWorkspace search={search} onSearchChange={setSearch} onNavigate={handleNavigate} />
                              : isInvoices ? <InvoiceWorkspace sites={realSites} search={search} onSearchChange={setSearch} onNavigate={handleNavigate} />
                                : isInvoiceSettings ? <InvoiceSettingsWorkspace onNavigate={handleNavigate} />
                                  : isSettings ? <SettingsWorkspace onNavigate={handleNavigate} onWorkspaceNameChange={setWorkspaceName} />
                  : (
                    <div className="mx-auto w-full max-w-[1400px] space-y-8 py-6">
                      <div className="px-4 sm:px-6 lg:px-8">
                        {isOverview ? (
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />{overviewBadge}</div>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A live view of saved client and business records, plus lead activity. Revenue and health remain unavailable until those data sources are connected.</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace directory</p>
                            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ivory">Clients and businesses</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Search saved clients, existing websites, and your own businesses. Open linked lead details when available.</p>
                          </div>
                        )}
                      </div>
                      {isOverview && <SummaryMetrics metrics={overviewMetrics} />}
                      <ClientWorkspace sites={realSites} filteredSites={filteredSites} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} viewMode={viewMode} onViewModeChange={setViewMode} search={search} onClearFilters={clearFilters} onOpenLeadDetails={handleOpenLeadDetails} onOpenEmailSignature={handleOpenEmailSignature} onOpenFinancialAudit={handleOpenFinancialAudit} onNavigate={handleOnboardingNavigate} onRefresh={() => setRefreshKey((key) => key + 1)} />
                    </div>
                  )}
        </main>
      </div>
    </div>
  );
};

export default Index;

```

## src/components/hub/HubSidebar.tsx

```tsx
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  Receipt,
  Mail,
  Rocket,
  Search,
  Server,
  Settings,
  Share2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { HUB_LOGO, NAV_ITEMS, BUILD_NAV_IDS, MONITOR_NAV_IDS, GROWTH_NAV_IDS, type NavId } from "@/lib/hub-data";
import { cn } from "@/lib/utils";

const ICONS: Record<(typeof NAV_ITEMS)[number]["icon"], LucideIcon> = {
  LayoutDashboard,
  Building2,
  Wand2,
  Search,
  CreditCard,
  BookOpen,
  Receipt,
  Landmark,
  FolderOpen,
  Server,
  Rocket,
  CalendarDays,
  BarChart3,
  Mail,
  ClipboardCheck,
  Settings,
  Share2,
};

type HubSidebarProps = {
  activeNav: NavId;
  onNavigate: (id: NavId) => void;
  workspaceName?: string;
  className?: string;
};

function NavButton({ item, active, onNavigate }: { item: typeof NAV_ITEMS[number]; active: boolean; onNavigate: (id: NavId) => void }) {
  const Icon = ICONS[item.icon];
  return (
    <button
      key={item.id}
      type="button"
      onClick={() => onNavigate(item.id as NavId)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
        active
          ? "bg-sidebar-accent text-ivory shadow-[inset_0_0_0_1px_hsl(var(--lime)/0.18)]"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-ivory"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-cyan-accent"
        )}
        aria-hidden
      />
      <span className="truncate font-medium">{item.label}</span>
      {item.id === "tradesite" && !active && (
        <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary">NEW</span>
      )}
    </button>
  );
}

export function HubSidebar({ activeNav, onNavigate, workspaceName, className }: HubSidebarProps) {
  const displayWorkspaceName = typeof workspaceName === "string" && workspaceName.trim() ? workspaceName.trim() : "Central Hub";
  const monitorItems = NAV_ITEMS.filter((i) => MONITOR_NAV_IDS.includes(i.id as NavId));
  const buildItems = NAV_ITEMS.filter((i) => BUILD_NAV_IDS.includes(i.id as NavId));
  const growthItems = NAV_ITEMS.filter((i) => GROWTH_NAV_IDS.includes(i.id as NavId));

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex h-full w-[272px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className
      )}
      aria-label="Primary"
    >
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-secondary ring-1 ring-border">
          <img src={HUB_LOGO} alt="" width={44} height={44} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold tracking-tight text-ivory" title={displayWorkspaceName}>{displayWorkspaceName}</p>
          <p className="truncate text-xs text-muted-foreground">Operator command centre</p>
        </div>
      </div>

      <nav className="hub-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Workspace">
        <div className="space-y-1">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">Operations</p>
          {monitorItems.map((item) => (
            <NavButton key={item.id} item={item} active={activeNav === item.id} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="space-y-1">
          <div className="mx-3 mb-3 h-px bg-gradient-to-r from-border/0 via-border to-border/0" />
          <p className="mb-2 flex items-center gap-2 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="h-px w-3 bg-primary/60" />
            Build
          </p>
          {buildItems.map((item) => (
            <NavButton key={item.id} item={item} active={activeNav === item.id} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="space-y-1">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">Growth & System</p>
          {growthItems.map((item) => (
            <NavButton key={item.id} item={item} active={activeNav === item.id} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">System</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Online
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Private drafts stay in review until you choose what happens next.
          </p>
        </div>
      </div>
    </motion.aside>
  );
}

```

## src/components/hub/WorkspaceHeader.tsx

```tsx
import { Bell, Menu, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NavId } from "@/lib/hub-data";
import { NAV_ITEMS } from "@/lib/hub-data";

type WorkspaceHeaderProps = {
  activeNav: NavId;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenMobileNav: () => void;
  alertCount: number;
};

export function WorkspaceHeader({
  activeNav,
  search,
  onSearchChange,
  onOpenMobileNav,
  alertCount,
}: WorkspaceHeaderProps) {
  const title = NAV_ITEMS.find((item) => item.id === activeNav)?.label ?? "Overview";

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-xl"
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mt-0.5 shrink-0 border-border bg-card text-foreground hover:bg-secondary lg:hidden"
              onClick={onOpenMobileNav}
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Portfolio operations
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ivory sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Monitor recurring revenue, site health, and client workspaces from one operator desk.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative border-border bg-card text-foreground hover:bg-secondary"
              aria-label={`${alertCount} alerts needing attention`}
            >
              <Bell className="h-4 w-4" />
              {alertCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {alertCount}
                </span>
              )}
            </Button>

            <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-2.5 py-1.5 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 font-display text-sm font-bold text-primary">
                HP
              </div>
              <div className="pr-1">
                <p className="text-sm font-medium leading-none text-ivory">Heath Penfold</p>
                <p className="mt-1 text-xs text-muted-foreground">Lead operator</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search clients, trades, or locations…"
            aria-label="Search clients and sites"
            className="h-11 border-border bg-card pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/60"
          />
        </div>
      </div>
    </motion.header>
  );
}

```

## src/components/hub/SummaryMetrics.tsx

```tsx
import type { CSSProperties } from "react";
import { Activity, AlertTriangle, BarChart3, Flame, Globe2, TrendingDown, TrendingUp, Users, Wallet, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SummaryMetricId = "mrr" | "sites" | "liveSites" | "draftSites" | "health" | "savedLeads" | "hotLeads" | "attention";

type SummaryTrend = {
  direction: "up" | "down";
  label: string;
};

export type SummaryMetric = {
  id: SummaryMetricId;
  label: string;
  value: string;
  suffix?: string;
  detail: string;
  trend?: SummaryTrend;
  healthValue?: number;
  unavailable?: boolean;
  dominant?: boolean;
};

type SummaryMetricsProps = {
  metrics: SummaryMetric[];
};

const ICONS: Record<SummaryMetricId, LucideIcon> = {
  mrr: Wallet,
  sites: Globe2,
  liveSites: Globe2,
  draftSites: BarChart3,
  health: Activity,
  savedLeads: Users,
  hotLeads: Flame,
  attention: AlertTriangle,
};

export function SummaryMetrics({ metrics }: SummaryMetricsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-label="Portfolio summary" className="px-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = ICONS[metric.id];
          const Trend = metric.trend?.direction === "up" ? TrendingUp : TrendingDown;
          const hasHealthValue = metric.id === "health" && typeof metric.healthValue === "number";
          const detailTone = metric.trend
            ? metric.trend.direction === "up" ? "text-primary" : "text-warning"
            : metric.unavailable ? "text-muted-foreground" : "text-muted-foreground";

          return (
            <motion.article
              key={metric.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                delay: reduceMotion ? 0 : 0.08 + index * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm",
                metric.dominant
                  ? "border-primary/25 bg-gradient-to-br from-card via-card to-primary/[0.07] md:col-span-2 xl:col-span-1"
                  : "border-border"
              )}
            >
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                  <div className="mt-3 flex items-end gap-1.5">
                    <p
                      className={cn(
                        "font-display font-bold tracking-tight",
                        metric.unavailable ? "text-2xl text-muted-foreground" : "text-ivory",
                        !metric.unavailable && (metric.dominant ? "text-4xl sm:text-[2.75rem]" : "text-3xl")
                      )}
                    >
                      {metric.value}
                    </p>
                    {metric.suffix && <span className="mb-1 text-sm text-muted-foreground">{metric.suffix}</span>}
                  </div>
                  <p className={cn("mt-3 inline-flex items-center gap-1.5 text-xs font-medium", detailTone)}>
                    {metric.trend ? <Trend className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden="true" />}
                    {metric.trend?.label || metric.detail}
                  </p>
                </div>

                {hasHealthValue ? (
                  <div
                    className="health-ring relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                    style={{ "--health": metric.healthValue } as CSSProperties}
                    role="img"
                    aria-label={`Average health ${metric.healthValue} out of 100`}
                  >
                    <span className="font-mono text-sm font-semibold text-primary">{metric.healthValue}</span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                      metric.dominant
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : metric.id === "attention"
                          ? "border-warning/20 bg-warning/10 text-warning"
                          : metric.id === "hotLeads"
                            ? "border-red-500/20 bg-red-500/10 text-red-400"
                            : "border-border bg-secondary text-cyan-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}
              </div>

              {metric.dominant && (
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
              )}
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

```

## src/lib/hub-data.ts

```ts
export type SiteStatus = "live" | "draft" | "attention";
export type GrowthStackTier = "Starter" | "Growth" | "Scale" | "None";
export type ClientKind = "client" | "own_business";
export type WebsiteSource = "buildy_built" | "existing_website" | "no_website";
export type ActivePackageId =
  | "seo"
  | "local_visibility"
  | "social_revamp"
  | "social_growth"
  | "content"
  | "email_marketing"
  | "paid_campaigns";

export const CLIENT_KIND_OPTIONS: { id: ClientKind; label: string; description: string }[] = [
  { id: "client", label: "Client", description: "A business you manage for a client" },
  { id: "own_business", label: "My own business", description: "A business you own or operate" },
];

export const WEBSITE_SOURCE_OPTIONS: { id: WebsiteSource; label: string; description: string }[] = [
  { id: "buildy_built", label: "Buildy-built", description: "A site built and managed in this workspace" },
  { id: "existing_website", label: "Existing website", description: "A website built somewhere else" },
  { id: "no_website", label: "No website", description: "A business record for growth work without a site" },
];

export const PACKAGE_OPTIONS: { id: ActivePackageId; label: string; description: string }[] = [
  { id: "seo", label: "SEO", description: "Search visibility and on-page improvements" },
  { id: "local_visibility", label: "Local visibility", description: "Maps, listings, and local search" },
  { id: "social_revamp", label: "Social media revamp", description: "Profile positioning and presentation" },
  { id: "social_growth", label: "Social growth", description: "Ongoing social audience growth" },
  { id: "content", label: "Content", description: "Planned content and publishing support" },
  { id: "email_marketing", label: "Email marketing", description: "Email campaigns and customer follow-up" },
  { id: "paid_campaigns", label: "Paid campaigns", description: "Managed advertising campaigns" },
];

export type GrowthWorkstreamId = "seo" | "local_visibility" | "google_business" | "on_page" | "service_area_targets" | "reviews_reputation" | "content_answers" | "conversion" | "social_revamp" | "social_growth" | "content" | "email" | "paid_campaigns" | "reporting";
export const GROWTH_WORKSTREAM_OPTIONS: { id: GrowthWorkstreamId; label: string; description: string; packageId?: ActivePackageId }[] = [
  { id: "google_business", label: "Google Business & Maps", description: "Categories, services, hours, photos, and approved Maps work", packageId: "local_visibility" },
  { id: "on_page", label: "On-page service/entity work", description: "Service pages, entity details, and trust signals", packageId: "seo" },
  { id: "service_area_targets", label: "Service-area targets", description: "Approved service and suburb targets for content planning", packageId: "local_visibility" },
  { id: "reviews_reputation", label: "Reviews & Reputation", description: "Honest review requests, response tracking, and proof", packageId: "local_visibility" },
  { id: "content_answers", label: "Content & AI-citable answers", description: "Useful answers, FAQs, and operator-approved content briefs", packageId: "content" },
  { id: "conversion", label: "Conversion", description: "Calls, forms, source tracking, and follow-up ownership", packageId: "local_visibility" },
  { id: "seo", label: "SEO", description: "Legacy search visibility tasks", packageId: "seo" },
  { id: "local_visibility", label: "Local Visibility (legacy)", description: "Legacy local search tasks retained for old records", packageId: "local_visibility" },
  { id: "social_revamp", label: "Social Revamp", description: "Profile positioning and presentation", packageId: "social_revamp" },
  { id: "social_growth", label: "Social Growth", description: "Ongoing social audience work", packageId: "social_growth" },
  { id: "content", label: "Content", description: "Planned content and publishing support", packageId: "content" },
  { id: "email", label: "Email", description: "Email planning and follow-up", packageId: "email_marketing" },
  { id: "paid_campaigns", label: "Paid Campaigns", description: "Campaign planning and review", packageId: "paid_campaigns" },
  { id: "reporting", label: "Reporting", description: "Manual reporting and review notes" },
];
export function workstreamLabel(value: unknown) { return GROWTH_WORKSTREAM_OPTIONS.find((option) => option.id === value)?.label || String(value || "Reporting"); }
export function workstreamsForPackages(value: unknown) {
  const packages = normalizeActivePackages(value);
  return GROWTH_WORKSTREAM_OPTIONS.filter((option) => option.packageId && packages.includes(option.packageId));
}

export type LeadFinderSuggestion = { label: string; value: string; description: string };

export const LEAD_FINDER_SUGGESTIONS: LeadFinderSuggestion[] = [
  { label: "Trades & home services", value: "trades and home services", description: "Plumbing, electrical, cleaning, landscaping" },
  { label: "Retail & ecommerce", value: "retail and ecommerce", description: "Boutiques, product brands, online stores" },
  { label: "Restaurants & hospitality", value: "restaurants and hospitality", description: "Cafes, restaurants, hotels, venues" },
  { label: "Professional services", value: "professional services", description: "Accounting, legal, agencies, consultants" },
  { label: "Health & wellness", value: "health and wellness", description: "Clinics, dentists, gyms, therapists" },
  { label: "Automotive", value: "automotive businesses", description: "Garages, dealers, detailing, parts" },
  { label: "Real estate", value: "real estate businesses", description: "Agents, property managers, developers" },
  { label: "Education", value: "education and training", description: "Schools, tutors, courses, training" },
  { label: "Other business", value: "", description: "Search any category in your own words" },
];

export type ClientSite = {
  id: string;
  businessName: string;
  trade: string;
  status: SiteStatus;
  tier: GrowthStackTier;
  mrr: number;
  health: number;
  uptime: number;
  location: string;
  lastActivity: string;
  sourceLeadId?: string;
  businessType?: string;
  website?: string;
  researchSourceUrls?: string[];
  clientKind?: ClientKind;
  websiteSource?: WebsiteSource;
  activePackages?: ActivePackageId[];
  hostingRequired?: boolean;
  phone?: string;
  email?: string;
  logoImageUrl?: string;
  photoUrls?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  socialLinks?: { facebookUrl?: string; instagramUrl?: string; tiktokUrl?: string; linkedinUrl?: string; googleBusinessUrl?: string };
  socialLinkList?: { platform: string; url: string }[];
  contactDetails?: { phones?: string[]; emails?: string[]; contactPageUrl?: string; bookingUrl?: string; physicalAddress?: string; serviceAreas?: string[]; openingHours?: string };
  services?: string[];
  areasServed?: string[];
  serviceAreas?: string[];
  legalBusinessName?: string;
  abn?: string;
  primaryGoogleBusinessCategory?: string;
  secondaryGoogleBusinessCategories?: string[];
  businessHoursNotes?: string;
  holidayHoursNotes?: string;
  licenceInsuranceNotes?: string;
  googleBusinessUrl?: string;
  reviewLink?: string;
  napTrustVerificationNotes?: string;
};

export type ClientSiteTruthPatch = {
  businessName?: string;
  trade?: string;
  location?: string;
  phone?: string;
  email?: string;
  services?: string[];
  areasServed?: string[];
  legalBusinessName?: string;
  abn?: string;
  primaryGoogleBusinessCategory?: string;
  secondaryGoogleBusinessCategories?: string[];
  serviceAreas?: string[];
  businessHoursNotes?: string;
  holidayHoursNotes?: string;
  licenceInsuranceNotes?: string;
  googleBusinessUrl?: string;
  reviewLink?: string;
  napTrustVerificationNotes?: string;
  photoUrls?: string[];
};

export function normalizeClientKind(value: unknown): ClientKind {
  return value === "own_business" ? "own_business" : "client";
}

export function normalizeWebsiteSource(value: unknown): WebsiteSource {
  return value === "existing_website" || value === "no_website" ? value : "buildy_built";
}

export function normalizeActivePackages(value: unknown): ActivePackageId[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(PACKAGE_OPTIONS.map((option) => option.id));
  return value.filter((item): item is ActivePackageId => typeof item === "string" && allowed.has(item as ActivePackageId));
}

export function clientKindLabel(value: unknown) {
  return CLIENT_KIND_OPTIONS.find((option) => option.id === normalizeClientKind(value))?.label || "Client";
}

export function websiteSourceLabel(value: unknown) {
  return WEBSITE_SOURCE_OPTIONS.find((option) => option.id === normalizeWebsiteSource(value))?.label || "Buildy-built";
}

export function packageLabel(value: unknown) {
  return PACKAGE_OPTIONS.find((option) => option.id === value)?.label || String(value || "Package");
}

export type SiteType = "service" | "ecommerce" | "both";

// Universal business type system
export type BusinessType =
  | "retail"
  | "restaurant"
  | "salon"
  | "fitness"
  | "healthcare"
  | "professional_services"
  | "real_estate"
  | "automotive"
  | "education"
  | "hospitality"
  | "construction"
  | "home_services"
  | "other";

export const BUSINESS_TYPE_OPTIONS: { id: BusinessType; label: string; desc: string; icon: string }[] = [
  { id: "retail", label: "Retail Store", desc: "Shops, boutiques, product sellers", icon: "ShoppingBag" },
  { id: "restaurant", label: "Restaurant & Cafe", desc: "Food, bars, coffee, kitchens", icon: "Utensils" },
  { id: "salon", label: "Salon & Beauty", desc: "Hairdressers, barbers, spa, aesthetics", icon: "Scissors" },
  { id: "fitness", label: "Fitness & Wellness", desc: "Gyms, studios, trainers, wellness", icon: "Dumbbell" },
  { id: "healthcare", label: "Healthcare", desc: "Clinics, dentists, therapy, medical", icon: "HeartPulse" },
  { id: "professional_services", label: "Professional Services", desc: "Agencies, legal, accounting, consulting", icon: "Briefcase" },
  { id: "real_estate", label: "Real Estate", desc: "Agents, property management, lettings", icon: "Building2" },
  { id: "automotive", label: "Automotive", desc: "Garages, dealerships, detailing", icon: "Car" },
  { id: "education", label: "Education", desc: "Schools, courses, tutors, training", icon: "GraduationCap" },
  { id: "hospitality", label: "Hospitality", desc: "Hotels, rentals, venues, events", icon: "Bed" },
  { id: "construction", label: "Construction", desc: "Builders, contractors, developers", icon: "HardHat" },
  { id: "home_services", label: "Home Services", desc: "Plumbing, electrical, cleaning, trades", icon: "Wrench" },
  { id: "other", label: "Other Local Business", desc: "Any other business model", icon: "Store" },
];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = Object.fromEntries(
  BUSINESS_TYPE_OPTIONS.map((o) => [o.id, o.label])
) as Record<BusinessType, string>;

export type ProductCategory =
  | "Parts"
  | "Tools"
  | "Accessories"
  | "Maintenance"
  | "Merchandise"
  | "Other"
  | "Fixtures"
  | "Kits"
  | "Apparel"
  | "Food"
  | "Drinks"
  | "Beauty"
  | "Services"
  | "Memberships"
  | "Menu"
  | "Retail"
  | "Home Goods";

export type ProductVariant = {
  name: string;
  options: string[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  category: ProductCategory;
  imageUrl: string;
  sku: string;
  stock: number;
  variants: ProductVariant[];
  isActive: boolean;
  compareAtPrice?: number;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Retail", "Apparel", "Menu", "Food", "Drinks", "Beauty", "Services", "Memberships",
  "Parts", "Tools", "Fixtures", "Accessories", "Maintenance", "Kits", "Merchandise", "Home Goods", "Other",
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function mk(p: Omit<Product, "id"> & { id?: string }): Product {
  return {
    id: p.id || uid(), name: p.name, price: p.price, description: p.description, category: p.category,
    imageUrl: p.imageUrl, sku: p.sku || `SKU-${uid().toUpperCase()}`, stock: p.stock ?? Math.floor(Math.random() * 40) + 5,
    variants: p.variants || [], isActive: p.isActive ?? true, compareAtPrice: p.compareAtPrice,
  };
}

export const COR10_STORE_ID = "74ddf759-c165-40b8-aa1f-103daf646fe9";
const COR10_PLACEHOLDER_IMAGE = "https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/files/chat-generated-images/project-dwlmeq5ucpc0rdauxaan6/e5d17d74-249d-4edc-991a-b19e79094c1d.png";

function cor10Products(): Product[] {
  return [
    mk({ id: "cor10-freestanding", name: "COR10 STEEL Freestanding Letterbox", price: 890, description: "Signature architectural freestanding letterbox fabricated from 3mm genuine COR10 STEEL. Develops a rich, living patina that deepens with age. Laser-cut house numbers, hidden fixings, and weather-sealed parcel chute. Australian made to endure coastal and rural conditions.", category: "Fixtures", imageUrl: COR10_PLACEHOLDER_IMAGE, sku: "COR10-FS-STD-001", stock: 12, compareAtPrice: 1050, variants: [{ name: "Size", options: ["Standard 900mm", "Large 1200mm", "Extra Large 1500mm"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL", "Powder Coated Black"] }, { name: "Mounting", options: ["Freestanding", "Bolt-down Base"] }, { name: "Number Style", options: ["Modern Sans", "Classic Serif", "Custom Laser-Cut"] }] }),
    mk({ id: "cor10-wall", name: "COR10 STEEL Wall-Mount Letterbox", price: 545, description: "Minimal wall-mounted letterbox with soft-close flap and concealed drainage. 2mm COR10 STEEL shell with fully welded seams. Perfect for rendered, brick or timber facades. Includes stainless mounting kit.", category: "Fixtures", imageUrl: "", sku: "COR10-WM-STD-002", stock: 18, variants: [{ name: "Size", options: ["Standard", "Large"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL", "Powder Coated Black"] }, { name: "Number Style", options: ["Modern Sans", "Classic Serif", "Custom Laser-Cut"] }] }),
    mk({ id: "cor10-parcel", name: "COR10 STEEL Parcel Letterbox", price: 1250, description: "Extra-deep parcel letterbox for secure deliveries. Anti-theft baffle, dual-access rear door, and full-width letter slot. Fabricated for high-security residential. Fits AusPost large parcels.", category: "Fixtures", imageUrl: "", sku: "COR10-PARCEL-003", stock: 8, compareAtPrice: 1450, variants: [{ name: "Size", options: ["Standard 1000mm", "Large 1300mm"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL", "Powder Coated Black"] }, { name: "Mounting", options: ["Freestanding", "Wall-Mounted"] }] }),
    mk({ id: "cor10-multi", name: "Commercial Multi-Unit Letterbox", price: 2250, description: "Architectural multi-unit bank for townhouses, apartments and workplaces. Modular COR10 STEEL facade with individually keyed mailboxes. Numbered laser-cut identifiers and master key option. Spec for 4 to 12 units.", category: "Fixtures", imageUrl: "", sku: "COR10-MULTI-004", stock: 3, variants: [{ name: "Size", options: ["4-Unit Bank", "6-Unit Bank", "8-Unit Bank", "12-Unit Bank"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL"] }, { name: "Mounting", options: ["Freestanding Frame", "Wall-Integrated"] }, { name: "Number Style", options: ["Modern Sans", "Classic Serif"] }] }),
    mk({ id: "cor10-custom", name: "Architectural Custom Letterbox", price: 2800, description: "Bespoke commission piece. Collaborate with COR10 on proportions, perforation pattern, integrated lighting and house number typography. Fully custom, shop drawings included. Lead time 3-4 weeks.", category: "Fixtures", imageUrl: "", sku: "COR10-CUSTOM-005", stock: 5, variants: [{ name: "Size", options: ["Custom — Discuss in Notes"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL", "Powder Coated Black"] }, { name: "Number Style", options: ["Modern Sans", "Classic Serif", "Custom Laser-Cut", "Illuminated LED"] }] }),
    mk({ id: "cor10-post", name: "Post-Mounted Letterbox", price: 675, description: "COR10 STEEL letterbox head on galvanised post with COR10 STEEL sleeve. Height-adjustable, tamper-resistant fixings. Ideal for rural or acreage sets where front boundary mounting is required.", category: "Fixtures", imageUrl: "", sku: "COR10-POST-006", stock: 14, variants: [{ name: "Size", options: ["Standard Head", "Large Head"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL"] }, { name: "Mounting", options: ["Post-Mounted", "Post + Slab Mount"] }, { name: "Number Style", options: ["Modern Sans", "Classic Serif"] }] }),
    mk({ id: "cor10-timber", name: "COR10 STEEL Letterbox with Timber Post", price: 980, description: "Warm contrast of weathered COR10 STEEL and spotted gum hardwood post. Oiled timber with blackened STEEL brackets. Sculptural at the gate, built to patina together. Stainless fixings throughout.", category: "Fixtures", imageUrl: "", sku: "COR10-TIMBER-007", stock: 6, compareAtPrice: 1150, variants: [{ name: "Size", options: ["Standard 1100mm", "Large 1300mm"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Sealed COR10 STEEL + Oiled Timber"] }, { name: "Mounting", options: ["Freestanding", "In-Ground Post"] }] }),
    mk({ id: "cor10-slim", name: "Slimline COR10 STEEL Letterbox", price: 495, description: "Narrow-profile letterbox for tight entry courtyards and side fences. Full letter capacity despite compact footprint. Recessed finger pull, soft-close detail.", category: "Fixtures", imageUrl: "", sku: "COR10-SLIM-008", stock: 22, variants: [{ name: "Size", options: ["Standard", "Large"] }, { name: "Finish", options: ["Raw COR10 STEEL (Natural Patina)", "Powder Coated Black"] }, { name: "Mounting", options: ["Wall-Mounted", "Fence-Mounted"] }, { name: "Number Style", options: ["Modern Sans", "Classic Serif"] }] }),
  ];
}

export function getDefaultProductsForBusinessType(businessType: BusinessType | string): Product[] {
  const bt = (businessType || "other").toLowerCase() as BusinessType;
  const low = String(businessType || "").toLowerCase();
  if (low === "ecommerce" || low === "shop" || low === "store" || low === "retail") return cor10Products();
  switch (bt) {
    case "retail": return cor10Products();
    case "restaurant": return [
      mk({ name: "Margherita Pizza - Wood Fired", price: 13.5, description: "San Marzano tomato, fior di latte, fresh basil, extra virgin olive.", category: "Menu", imageUrl: "", sku: "REST-MARG", stock: 999 }),
      mk({ name: "Double Smash Burger + Fries", price: 16, description: "Two patties, American cheese, pickles, house sauce, skin-on fries.", category: "Menu", imageUrl: "", sku: "REST-SMASH", stock: 999 }),
      mk({ name: "Seasonal Greens Salad", price: 11, description: "Heritage leaves, toasted seeds, citrus vinaigrette, vegan.", category: "Food", imageUrl: "", sku: "REST-SALAD", stock: 999 }),
      mk({ name: "Cold Brew Bottle (500ml)", price: 5.5, description: "Single origin, brewed 18h, ready to drink.", category: "Drinks", imageUrl: "", sku: "REST-CB-500", stock: 42 }),
      mk({ name: "Family Feast Box", price: 48, description: "Feeds 4: 2 mains, 2 sides, dips + dessert. Pre-order.", category: "Menu", imageUrl: "", sku: "REST-FEAST", stock: 12, compareAtPrice: 58 }),
      mk({ name: "Merch Tee - Staff Edition", price: 26, description: "Restaurant staff tee, soft wash.", category: "Apparel", imageUrl: "", sku: "REST-TEE-STF", stock: 15, variants: [{ name: "Size", options: ["S", "M", "L"] }] }),
    ];
    case "salon": return [
      mk({ name: "Signature Cut & Finish", price: 65, description: "Consultation, cut, wash and styling with senior stylist.", category: "Services", imageUrl: "", sku: "SAL-CUT-01", stock: 999 }),
      mk({ name: "Balayage Package", price: 145, description: "Full balayage, toner, bond protector and blow dry.", category: "Services", imageUrl: "", sku: "SAL-BAL-01", stock: 999 }),
      mk({ name: "Repair Shampoo 250ml", price: 18, description: "Sulphate-free, keratin repair for damaged hair.", category: "Beauty", imageUrl: "", sku: "SAL-SHAM-250", stock: 22 }),
      mk({ name: "Hydrating Hair Mask", price: 24, description: "Weekly deep condition, argan + shea.", category: "Beauty", imageUrl: "", sku: "SAL-MASK-HYD", stock: 9, compareAtPrice: 32 }),
      mk({ name: "Gift Voucher - Blow Dry Course", price: 120, description: "3 blow dries, valid 6 months.", category: "Services", imageUrl: "", sku: "SAL-GFT-BLOW", stock: 999 }),
    ];
    case "fitness": return [
      mk({ name: "Unlimited Monthly Membership", price: 59, description: "All classes, open gym, showers and towel service.", category: "Memberships", imageUrl: "", sku: "FIT-MEM-UNL", stock: 999 }),
      mk({ name: "10 Class Pack", price: 120, description: "Any class, 3-month expiry, share with a friend.", category: "Memberships", imageUrl: "", sku: "FIT-10PACK", stock: 999 }),
      mk({ name: "Performance Tee", price: 32, description: "Sweat-wicking, lightweight, flatlock seams.", category: "Apparel", imageUrl: "", sku: "FIT-TEE-PERF", stock: 28, variants: [{ name: "Size", options: ["XS", "S", "M", "L", "XL"] }] }),
      mk({ name: "Whey Protein 1kg - Vanilla", price: 38, description: "24g protein per serving, low sugar.", category: "Food", imageUrl: "", sku: "FIT-WHEY-VAN", stock: 14 }),
      mk({ name: "Resistance Bands Set", price: 22, description: "3 levels, door anchor, carry bag.", category: "Tools", imageUrl: "", sku: "FIT-BAND-SET", stock: 5, compareAtPrice: 29 }),
    ];
    case "healthcare": return [
      mk({ name: "Initial Consultation (60min)", price: 85, description: "Assessment and personalised plan.", category: "Services", imageUrl: "", sku: "HLT-CONS-60", stock: 999 }),
      mk({ name: "Follow-up Session (45min)", price: 65, description: "Continued care, adjustments and review.", category: "Services", imageUrl: "", sku: "HLT-FUP-45", stock: 999 }),
      mk({ name: "Posture Corrector Brace", price: 34, description: "Adjustable, breathable, daily wear.", category: "Retail", imageUrl: "", sku: "HLT-BRC-PST", stock: 18 }),
      mk({ name: "Wellness Supplement Bundle", price: 42, description: "30-day vitamins D, magnesium and omega.", category: "Retail", imageUrl: "", sku: "HLT-SUPP-30", stock: 26, compareAtPrice: 54 }),
    ];
    case "professional_services": return [
      mk({ name: "Discovery Workshop (Half Day)", price: 650, description: "Roadmap your brand, website and growth plan.", category: "Services", imageUrl: "", sku: "PRO-DISC-HD", stock: 999 }),
      mk({ name: "Website & Brand Audit", price: 350, description: "Detailed audit with fixes prioritised.", category: "Services", imageUrl: "", sku: "PRO-AUDT-WEB", stock: 999 }),
      mk({ name: "Growth Retainer - Starter", price: 1200, description: "Monthly content, ads management and reporting.", category: "Services", imageUrl: "", sku: "PRO-RET-STR", stock: 999, compareAtPrice: 1500 }),
      mk({ name: "Template Pack - Business Essentials", price: 79, description: "Contracts, proposals, invoices, ready to use.", category: "Retail", imageUrl: "", sku: "PRO-TPL-ESS", stock: 999 }),
    ];
    case "real_estate": return [
      mk({ name: "Home Valuation Report", price: 0, description: "Free comparable market analysis for your property.", category: "Services", imageUrl: "", sku: "RE-VAL-FREE", stock: 999 }),
      mk({ name: "Premium Listing Photos Package", price: 249, description: "Professional photography, drone, and floor plan.", category: "Services", imageUrl: "", sku: "RE-PHOT-PREM", stock: 999 }),
      mk({ name: "Moving Boxes Kit (20)", price: 35, description: "Double-wall boxes, tape, and markers.", category: "Retail", imageUrl: "", sku: "RE-BOX-20", stock: 30 }),
    ];
    case "automotive": return [
      mk({ name: "Full Service - Standard Car", price: 189, description: "Oil, filters, 30-point check, wash.", category: "Services", imageUrl: "", sku: "AUTO-SVC-STD", stock: 999 }),
      mk({ name: "Ceramic Coating Package", price: 450, description: "2-year protection, paint enhancement.", category: "Services", imageUrl: "", sku: "AUTO-CERM", stock: 999 }),
      mk({ name: "Performance Brake Pads (Front)", price: 89, description: "Low dust, high bite, OE fit.", category: "Parts", imageUrl: "", sku: "AUTO-BRK-FT", stock: 7, variants: [{ name: "Fitment", options: ["Audi A3", "BMW 3 Series", "Golf MK8"] }] }),
      mk({ name: "Detailing Kit - Interior", price: 52, description: "Cleaner, brush, microfibres, dressing.", category: "Kits", imageUrl: "", sku: "AUTO-KIT-INT", stock: 19, compareAtPrice: 68 }),
    ];
    case "construction":
    case "home_services": return [
      mk({ name: "Site Survey & Quote", price: 0, description: "In-person assessment, fixed-price quote within 24h.", category: "Services", imageUrl: "", sku: "HS-SURV-0", stock: 999 }),
      mk({ name: "Emergency Callout", price: 95, description: "Same-day response, first hour included.", category: "Services", imageUrl: "", sku: "HS-CALL-EMG", stock: 999 }),
      mk({ name: "Maintenance Plan - Annual", price: 199, description: "Inspection, preventative care, priority booking.", category: "Services", imageUrl: "", sku: "HS-MNT-ANN", stock: 999, compareAtPrice: 250 }),
      mk({ name: "Parts & Fixings Kit", price: 34, description: "Trade essential consumables.", category: "Kits", imageUrl: "", sku: "HS-KIT-PARTS", stock: 41 }),
      mk({ name: "Work Hoodie", price: 45, description: "Hard-wearing branded hoodie.", category: "Merchandise", imageUrl: "", sku: "HS-HOOD-01", stock: 22, variants: [{ name: "Size", options: ["M", "L", "XL", "XXL"] }] }),
    ];
    case "hospitality": return [
      mk({ name: "One Night - Deluxe Room", price: 145, description: "King bed, city view, breakfast included.", category: "Services", imageUrl: "", sku: "HOSP-DLX-1N", stock: 3, variants: [{ name: "Bed", options: ["King", "Twin"] }] }),
      mk({ name: "Weekend Escape Package", price: 350, description: "2 nights, dinner, late checkout.", category: "Services", imageUrl: "", sku: "HOSP-WKD-2N", stock: 2, compareAtPrice: 420 }),
      mk({ name: "Gift Voucher - Afternoon Tea", price: 55, description: "Tea for two with pastries.", category: "Services", imageUrl: "", sku: "HOSP-AFT-2", stock: 999 }),
    ];
    case "education": return [
      mk({ name: "Starter Course - 4 Weeks", price: 199, description: "Foundations with live feedback.", category: "Services", imageUrl: "", sku: "EDU-4W-STR", stock: 999 }),
      mk({ name: "1-to-1 Tutoring (60min)", price: 55, description: "Personalised session, any level.", category: "Services", imageUrl: "", sku: "EDU-1TO1-60", stock: 999 }),
      mk({ name: "Workbook - Printed Edition", price: 24, description: "160 pages, exercises, and templates.", category: "Retail", imageUrl: "", sku: "EDU-WB-01", stock: 18, compareAtPrice: 32 }),
    ];
    default: return [
      mk({ name: "Business Consultation (30min)", price: 0, description: "Free intro call, no obligation.", category: "Services", imageUrl: "", sku: "OTH-CONS-FREE", stock: 999 }),
      mk({ name: "Standard Service Package", price: 149, description: "Done-for-you essentials with clear pricing.", category: "Services", imageUrl: "", sku: "OTH-SVC-STD", stock: 999, compareAtPrice: 199 }),
      mk({ name: "Premium Bundle", price: 299, description: "Everything in standard plus priority support.", category: "Services", imageUrl: "", sku: "OTH-BND-PREM", stock: 999 }),
      mk({ name: "Gift Card - $25", price: 25, description: "For services or retail.", category: "Retail", imageUrl: "", sku: "OTH-GIFT-25", stock: 999 }),
      mk({ name: "Branded Tote", price: 18, description: "Everyday carry, supports local.", category: "Merchandise", imageUrl: "", sku: "OTH-TOTE-01", stock: 33 }),
      mk({ name: "Care Kit", price: 29, description: "Maintenance essentials.", category: "Kits", imageUrl: "", sku: "OTH-KIT-CARE", stock: 4, compareAtPrice: 39 }),
    ];
  }
}

// Legacy wrapper for backwards compatibility
export function getDefaultProductsForTrade(trade: string): Product[] {
  const lower = trade.toLowerCase();
  if (lower.includes("plumb") || lower.includes("electr") || lower.includes("roof") || lower.includes("landscap") || lower.includes("hvac") || lower.includes("joinery") || lower.includes("carpent")) return getDefaultProductsForBusinessType("home_services");
  return getDefaultProductsForBusinessType("other");
}

export const DEFAULT_PRODUCTS: Product[] = getDefaultProductsForBusinessType("other");
export const SITE_TYPE_OPTIONS: { id: SiteType; label: string; desc: string; icon: string }[] = [
  { id: "service", label: "Service Business", desc: "Bookings, menu, portfolio, team", icon: "Briefcase" },
  { id: "ecommerce", label: "eCommerce Store", desc: "Catalog, cart, checkout, promos", icon: "ShoppingBag" },
  { id: "both", label: "Service + Store", desc: "Full site with integrated shop", icon: "Layers" },
];

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" as const },
  { id: "clients", label: "Clients / Sites", icon: "Building2" as const },
  { id: "tradesite", label: "Site Builder", icon: "Wand2" as const },
  { id: "savedLeadStudio", label: "Saved Leads", icon: "FolderOpen" as const },
  { id: "leadFinder", label: "Lead Finder", icon: "Search" as const },
  { id: "billing", label: "Subscriptions & Billing", icon: "CreditCard" as const },
  { id: "salesDesk", label: "Sales Desk", icon: "BookOpen" as const },
  { id: "invoices", label: "Invoices", icon: "Receipt" as const },
  { id: "invoiceSettings", label: "Invoice Settings", icon: "Landmark" as const },
  { id: "hosting", label: "Hosting", icon: "Server" as const },
  { id: "growthstack", label: "GrowthStack", icon: "Rocket" as const },
  { id: "socialRevamp", label: "Social Revamp & Marketing", icon: "Share2" as const },
  { id: "calendar", label: "Content Calendar", icon: "CalendarDays" as const },
  { id: "reports", label: "Reports", icon: "BarChart3" as const },
  { id: "signatures", label: "Email Signatures", icon: "Mail" as const },
  { id: "financialAudits", label: "Financial Audits", icon: "ClipboardCheck" as const },
  { id: "settings", label: "Settings / Team", icon: "Settings" as const },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];
export const MONITOR_NAV_IDS: NavId[] = ["overview", "clients", "billing", "salesDesk", "invoices", "hosting"];
export const BUILD_NAV_IDS: NavId[] = ["tradesite", "savedLeadStudio"];
export const GROWTH_NAV_IDS: NavId[] = ["leadFinder", "growthstack", "socialRevamp", "calendar", "reports", "signatures", "financialAudits", "invoiceSettings", "settings"];
export const PREVIEW_SITES: ClientSite[] = [];
export const SUMMARY_STATS = { mrr: 0, mrrChange: 0, activeSites: 0, activeSitesChange: 0, avgHealth: 0, avgHealthChange: 0, needsAttention: 0, needsAttentionChange: 0 };
export const HUB_LOGO = "https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/files/chat-generated-images/project-dwlmeq5ucpc0rdauxaan6/c6aa55d6-add9-4d7e-8b63-9121d1d7bfb8.png";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
}

export type BillingPackageTier = "Basic Growth" | "Full Growth" | "Aggressive";
export type BillingSubscriptionStatus = "active" | "past_due" | "canceled";
export type TransactionStatus = "succeeded" | "pending" | "failed";
export type BillingSubscriptionRow = { id: string; clientName: string; trade: string; packageTier: BillingPackageTier; monthlyAmount: number; nextBilling: string; status: BillingSubscriptionStatus; startedAt: string };
export type TransactionRow = { id: string; date: string; clientName: string; description: string; amount: number; type: "subscription" | "one_time" | "refund"; status: TransactionStatus };
export const BILLING_METRICS = { mrr: 0, mrrChange: 0, oneTimeThisMonth: 0, oneTimeChange: 0, ytdRevenue: 0, ytdChange: 0, activeSubscriptions: 0, activeChange: 0, churnRate: 0, churnChange: 0 };
export const SAMPLE_SUBSCRIPTIONS: BillingSubscriptionRow[] = [];
export const SAMPLE_TRANSACTIONS: TransactionRow[] = [];
export function statusLabel(status: SiteStatus) { if (status === "live") return "Live"; if (status === "draft") return "Draft"; return "Needs attention"; }

// Professional section modules
export type SectionModuleType = "hero" | "services" | "about" | "gallery" | "testimonials" | "contact" | "team_bios" | "case_studies" | "white_papers" | "faq" | "pricing_table" | "process_timeline" | "certifications" | "before_after" | "video_embed" | "social_proof" | "location_map" | "newsletter" | "featured_products" | "promotions";
export type SectionModule = { id: string; type: SectionModuleType; label: string; description: string; icon: string; config: Record<string, any>; required?: boolean };
export const AVAILABLE_MODULES: { type: SectionModuleType; label: string; description: string; icon: string; category: "core" | "professional" | "marketing" | "commerce" }[] = [
  { type: "hero", label: "Hero Section", description: "Main headline, tagline, CTAs", icon: "Layout", category: "core" },
  { type: "services", label: "Services / Products", description: "What you offer", icon: "Briefcase", category: "core" },
  { type: "about", label: "About Us", description: "Your story, mission", icon: "Users", category: "core" },
  { type: "gallery", label: "Gallery", description: "Photos of your work", icon: "Image", category: "core" },
  { type: "testimonials", label: "Testimonials", description: "Customer reviews", icon: "Star", category: "core" },
  { type: "contact", label: "Contact / Booking", description: "Form, map, hours", icon: "Mail", category: "core" },
  { type: "team_bios", label: "Team Bios", description: "Meet the team", icon: "Users", category: "professional" },
  { type: "case_studies", label: "Case Studies", description: "Portfolio with results", icon: "FileText", category: "professional" },
  { type: "white_papers", label: "Resources", description: "Guides, downloads", icon: "File", category: "professional" },
  { type: "faq", label: "FAQ Section", description: "Common questions", icon: "HelpCircle", category: "professional" },
  { type: "pricing_table", label: "Pricing Table", description: "Transparent pricing", icon: "DollarSign", category: "professional" },
  { type: "process_timeline", label: "Process / Timeline", description: "How you work", icon: "Clock", category: "professional" },
  { type: "certifications", label: "Certifications", description: "Licenses, awards", icon: "Award", category: "professional" },
  { type: "before_after", label: "Before / After", description: "Transformation showcase", icon: "Eye", category: "professional" },
  { type: "video_embed", label: "Video Section", description: "Embedded video", icon: "Video", category: "marketing" },
  { type: "social_proof", label: "Social Proof Bar", description: "Logos, stats", icon: "TrendingUp", category: "marketing" },
  { type: "location_map", label: "Service Area Map", description: "Where you work", icon: "MapPin", category: "marketing" },
  { type: "newsletter", label: "Newsletter Signup", description: "Email capture", icon: "Mail", category: "marketing" },
  { type: "featured_products", label: "Featured Products", description: "Highlight products", icon: "ShoppingBag", category: "commerce" },
  { type: "promotions", label: "Promotions", description: "Deals and offers", icon: "Tag", category: "commerce" },
];
export function getModuleInfo(type: SectionModuleType) { return AVAILABLE_MODULES.find((m) => m.type === type); }
export function createSectionModule(type: SectionModuleType): SectionModule { const def = AVAILABLE_MODULES.find((m) => m.type === type)!; return { id: `${type}-${Math.random().toString(36).slice(2, 6)}`, type, label: def.label, description: def.description, icon: def.icon, config: getDefaultConfig(type), required: type === "hero" }; }
function getDefaultConfig(type: SectionModuleType): Record<string, any> {
  switch (type) {
    case "hero": return { headline: "", subheading: "", ctaPrimary: "", ctaSecondary: "", showRating: true, height: "tall" };
    case "team_bios": return { members: [{ name: "", role: "", bio: "", photoUrl: "" }], layout: "grid", columns: 3 };
    case "case_studies": return { studies: [{ title: "", client: "", challenge: "", solution: "", results: "", imageUrl: "" }], count: 3 };
    case "white_papers": return { papers: [{ title: "", summary: "", downloadLabel: "Download PDF", fileUrl: "" }], layout: "list" };
    case "faq": return { questions: [{ question: "", answer: "" }], style: "accordion" };
    case "pricing_table": return { tiers: [{ name: "", price: "", period: "monthly", features: [""], highlighted: false, cta: "Get Started" }], currency: "$" };
    case "process_timeline": return { steps: [{ title: "", description: "", icon: "" }], layout: "horizontal" };
    case "certifications": return { badges: [{ name: "", issuer: "", imageUrl: "", year: "" }], layout: "grid" };
    case "before_after": return { pairs: [{ beforeUrl: "", afterUrl: "", label: "" }], layout: "slider" };
    case "video_embed": return { videoUrl: "", title: "", thumbnail: "", aspectRatio: "16:9" };
    case "social_proof": return { metrics: [{ label: "", value: "" }], logos: [], style: "bar" };
    case "newsletter": return { heading: "Stay in the loop", incentive: "", fields: ["email"] };
    case "promotions": return { offers: [{ headline: "", discount: "", code: "", expires: "", cta: "" }], showCountdown: true };
    case "featured_products": return { productIds: [], layout: "carousel", count: 4 };
    case "location_map": return { address: "", embedUrl: "", showHours: true };
    default: return {};
  }
}
export function getDefaultSectionLayoutForBusinessType(businessType: BusinessType): SectionModuleType[] {
  const base: SectionModuleType[] = ["hero", "services", "about", "gallery", "testimonials", "contact"];
  const map: Record<string, SectionModuleType[]> = {
    retail: ["hero", "featured_products", "services", "social_proof", "about", "testimonials", "newsletter", "contact"], restaurant: ["hero", "services", "gallery", "testimonials", "social_proof", "promotions", "contact"], salon: ["hero", "services", "team_bios", "before_after", "gallery", "pricing_table", "testimonials", "contact"], fitness: ["hero", "social_proof", "services", "team_bios", "pricing_table", "featured_products", "testimonials", "contact"], healthcare: ["hero", "services", "team_bios", "certifications", "testimonials", "faq", "contact"], professional_services: ["hero", "social_proof", "services", "case_studies", "process_timeline", "team_bios", "certifications", "testimonials", "faq", "contact"], real_estate: ["hero", "featured_products", "services", "team_bios", "social_proof", "testimonials", "contact", "location_map"], automotive: ["hero", "services", "featured_products", "before_after", "certifications", "testimonials", "contact"], education: ["hero", "social_proof", "services", "team_bios", "process_timeline", "pricing_table", "testimonials", "faq", "contact"], hospitality: ["hero", "featured_products", "services", "gallery", "social_proof", "testimonials", "location_map", "contact"], construction: ["hero", "social_proof", "services", "process_timeline", "case_studies", "certifications", "gallery", "contact"], home_services: ["hero", "social_proof", "services", "process_timeline", "certifications", "testimonials", "contact", "location_map"], other: base,
  };
  return map[businessType] || base;
}
export type AdConcept = { id: string; headline: string; primaryText: string; visualDescription: string; cta: string; placement: "feed" | "stories" | "reels" | "all"; targetAudience: string };
export type AdCreativeSet = { concepts: AdConcept[]; generatedFor: string; generatedAt: string; brandVoice: string };
export type ExtractedProfile = { businessName: string; trade: string; description: string; services: string[]; areasServed: string[]; location: string; phone: string; email: string; website: string; primaryColor: string; secondaryColor: string; logoImageUrl: string; photoUrls: string[]; reviewSnippets: { text: string; author: string; rating: number }[]; socialLinks: { facebookUrl: string; instagramUrl: string; googleBusinessUrl: string }; businessType: BusinessType; brandVoice?: string; brandAttitude?: string; contentStyle?: string; customerLanguage?: string[]; visualVibe?: string; visualStyle?: string; colorFromImages?: string[]; typographyVibe?: string; extractedImageUrls?: string[]; errors?: { source: string; url: string; message: string }[]; scrapedSources?: { source: string; ok: boolean }[] };

```

## src/main.tsx

```tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/superdev/client";

createRoot(document.getElementById("root")!).render(<App />);

```

## index.html

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta http-equiv="Content-Security-Policy" content="connect-src 'self' https: wss://*.livekit.cloud wss://*.production.livekit.cloud;" />
    <link rel="icon" type="image/png" href="https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/project-favicons/63753488-afdd-47d8-b23e-cc9601d992a7/dwlmeq5ucpc0rdauxaan6-f7101c28-5c8a-4dec-b50e-5c2ef983aa7a.png?v=1785883141739">
    <link rel="apple-touch-icon" href="https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/project-favicons/63753488-afdd-47d8-b23e-cc9601d992a7/dwlmeq5ucpc0rdauxaan6-f7101c28-5c8a-4dec-b50e-5c2ef983aa7a.png?v=1785883141739">
    <meta property="og:image" content="https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/files/chat-generated-images/project-dwlmeq5ucpc0rdauxaan6/c6aa55d6-add9-4d7e-8b63-9121d1d7bfb8.png?v=1785586776474">
    <meta name="twitter:image" content="https://ellprnxjjzatijdxcogk.supabase.co/storage/v1/object/public/files/chat-generated-images/project-dwlmeq5ucpc0rdauxaan6/c6aa55d6-add9-4d7e-8b63-9121d1d7bfb8.png?v=1785586776474">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Websites, Stores &amp; Growth for Australian Trades | Lay'd Back</title>
    <meta name="description" content="Websites, stores, SEO and GrowthStack support for Australian trades and service businesses, with managed packages from A$299/month. GST added if applicable." />
    <meta name="author" content="Lay'd Back" />
    <link rel="canonical" href="https://laydbackapps.com/" />
    <meta property="og:title" content="Websites, Stores &amp; Growth for Australian Trades | Lay'd Back" />
    <meta property="og:description" content="Websites, stores, SEO and GrowthStack support for Australian trades and service businesses, with managed packages from A$299/month. GST added if applicable." />
    <meta property="og:url" content="https://laydbackapps.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Lay'd Back" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Websites, Stores &amp; Growth for Australian Trades | Lay'd Back" />
    <meta name="twitter:description" content="Websites, stores, SEO and GrowthStack support for Australian trades and service businesses, with managed packages from A$299/month. GST added if applicable." />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet">
  </head>

  <body>
    <div id="root"></div>
    <!-- VERY IMPORTANT: THESE IMPORTS ARE REQUIRED FOR FUNCTIONALITY. DO NOT REMOVE THESE IMPORTS!!! -->
    <script src="https://api.superdev.build/storage/v1/object/public/cdn/console-capture.js" type="module"></script>
    <script type="module" src="/src/main.tsx"></script>
    <!-- VERY IMPORTANT: THESE IMPORTS ARE REQUIRED FOR FUNCTIONALITY. DO NOT REMOVE THESE IMPORTS!!! -->
    <script data-cfasync="false">
      (function () {
        try { window.sophiie?.chat?.destroy?.(); } catch (e) {}
        var loaded = false;
        function init() {
          if (loaded) return;
          loaded = true;
          window.sophiie.chat.load({
            orgId: 'org_22i7ymGAwtJiQp9VoxpNqSbBtHKj',
            render: { mode: 'overlay' }
          });
        }
        if (typeof window.sophiie?.chat?.load === 'function') { init(); return; }
        var s = document.createElement('script');
        s.async = true;
        s.type = 'module';
        s.setAttribute('data-cfasync', 'false');
        s.addEventListener('load', function () {
          if (typeof window.sophiie?.chat?.load === 'function') init();
          else console.error('[sophiie] chatbot bundle loaded but did not expose window.sophiie.chat.load');
        });
        s.addEventListener('error', function () { console.error('[sophiie] chatbot bundle failed to load'); });
        s.src = 'https://cdn.sophiie.ai/chatbot/bundle.mjs';
        (document.head || document.documentElement).appendChild(s);
        (function fallback() {
          if (loaded) return;
          if (typeof window.sophiie?.chat?.load === 'function') { init(); return; }
          setTimeout(fallback, 1000);
        })();
      })();
    </script>
  </body>
</html>

```

## src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 18% 6%;
    --foreground: 42 28% 93%;
    --card: 220 16% 9%;
    --card-foreground: 42 28% 93%;
    --popover: 220 16% 10%;
    --popover-foreground: 42 28% 93%;
    --primary: 78 96% 55%;
    --primary-foreground: 220 20% 6%;
    --secondary: 220 14% 14%;
    --secondary-foreground: 42 20% 88%;
    --muted: 220 12% 13%;
    --muted-foreground: 220 10% 62%;
    --accent: 188 92% 52%;
    --accent-foreground: 220 20% 6%;
    --destructive: 0 72% 58%;
    --destructive-foreground: 0 0% 100%;
    --warning: 38 95% 58%;
    --warning-foreground: 220 20% 6%;
    --border: 220 12% 18%;
    --input: 220 12% 16%;
    --ring: 78 96% 55%;
    --chart-1: 78 96% 55%;
    --chart-2: 188 92% 52%;
    --chart-3: 42 28% 75%;
    --chart-4: 0 72% 58%;
    --chart-5: 38 95% 58%;
    --sidebar-background: 220 20% 5%;
    --sidebar-foreground: 42 18% 86%;
    --sidebar-primary: 78 96% 55%;
    --sidebar-primary-foreground: 220 20% 6%;
    --sidebar-accent: 220 14% 12%;
    --sidebar-accent-foreground: 42 28% 93%;
    --sidebar-border: 220 12% 14%;
    --sidebar-ring: 78 96% 55%;
    --font-sans: "Outfit", ui-sans-serif, system-ui, sans-serif;
    --font-display: "Syne", "Outfit", ui-sans-serif, system-ui, sans-serif;
    --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
    --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    --radius: 0.75rem;
    --lime: 78 96% 55%;
    --cyan: 188 92% 52%;
    --ivory: 42 28% 93%;
    --surface-elevated: 220 15% 11%;
    --shadow-x: 0px;
    --shadow-y: 8px;
    --shadow-blur: 24px;
    --shadow-spread: 0px;
    --shadow-opacity: 0.45;
    --shadow-color: hsl(220 40% 2%);
    --shadow-2xs: 0 1px 2px hsl(220 40% 2% / 0.2);
    --shadow-xs: 0 1px 3px hsl(220 40% 2% / 0.25);
    --shadow-sm: 0 2px 8px hsl(220 40% 2% / 0.3);
    --shadow: 0 4px 16px hsl(220 40% 2% / 0.35);
    --shadow-md: 0 8px 24px hsl(220 40% 2% / 0.4);
    --shadow-lg: 0 16px 40px hsl(220 40% 2% / 0.45);
    --shadow-xl: 0 24px 56px hsl(220 40% 2% / 0.5);
    --shadow-2xl: 0 32px 72px hsl(220 40% 2% / 0.55);
    --tracking-normal: 0em;
    --spacing: 0.25rem;
  }

  * {
    @apply border-border;
  }

  html {
    @apply antialiased;
    color-scheme: dark;
  }

  body {
    @apply bg-background text-foreground font-sans;
    background-image:
      radial-gradient(ellipse 80% 50% at 10% -10%, hsl(78 96% 55% / 0.06), transparent 50%),
      radial-gradient(ellipse 60% 40% at 90% 0%, hsl(188 92% 52% / 0.05), transparent 45%),
      linear-gradient(180deg, hsl(220 18% 7%) 0%, hsl(220 18% 5%) 100%);
    background-attachment: fixed;
    min-height: 100vh;
  }

  ::selection {
    background: hsl(var(--lime) / 0.28);
    color: hsl(var(--ivory));
  }

  :focus-visible {
    @apply outline-none ring-2 ring-primary/70 ring-offset-2 ring-offset-background;
  }
}

@layer utilities {
  .font-display {
    font-family: var(--font-display);
  }

  .text-ivory {
    color: hsl(var(--ivory));
  }

  .text-lime {
    color: hsl(var(--lime));
  }

  .text-cyan-accent {
    color: hsl(var(--cyan));
  }

  .bg-lime {
    background-color: hsl(var(--lime));
  }

  .bg-cyan-accent {
    background-color: hsl(var(--cyan));
  }

  .bg-surface-elevated {
    background-color: hsl(var(--surface-elevated));
  }

  .border-lime\/20 {
    border-color: hsl(var(--lime) / 0.2);
  }

  .hub-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.035;
    pointer-events: none;
  }

  .hub-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .hub-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .hub-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(220 12% 22%);
    border-radius: 999px;
  }

  .hub-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(220 12% 30%);
  }

  .health-ring {
    background:
      radial-gradient(closest-side, hsl(var(--card)) 78%, transparent 80% 100%),
      conic-gradient(hsl(var(--lime)) calc(var(--health) * 1%), hsl(220 12% 18%) 0);
  }
}

@media print {
  body * {
    visibility: hidden;
  }

  .audit-print-surface,
  .audit-print-surface *,
  .signature-print-surface,
  .signature-print-surface *,
  .social-revamp-print-surface,
  .social-revamp-print-surface *,
  .invoice-print-surface,
  .invoice-print-surface * {
    visibility: visible;
  }

  .audit-print-surface,
  .signature-print-surface,
  .social-revamp-print-surface,
  .invoice-print-surface {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 24px;
    background: #ffffff;
    color: #111827;
  }

  .invoice-print-surface {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .social-revamp-print-surface,
  .social-revamp-print-surface * {
    color: #111827 !important;
    border-color: #d1d5db !important;
  }

  .print-hide {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

```

## tailwind.config.ts

```ts
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
				colors: {
					border: 'hsl(var(--border))',
					input: 'hsl(var(--input))',
					ring: 'hsl(var(--ring))',
					background: 'hsl(var(--background))',
					foreground: 'hsl(var(--foreground))',
					primary: {
						DEFAULT: 'hsl(var(--primary))',
						foreground: 'hsl(var(--primary-foreground))'
					},
					secondary: {
						DEFAULT: 'hsl(var(--secondary))',
						foreground: 'hsl(var(--secondary-foreground))'
					},
					destructive: {
						DEFAULT: 'hsl(var(--destructive))',
						foreground: 'hsl(var(--destructive-foreground))'
					},
					warning: {
						DEFAULT: 'hsl(var(--warning))',
						foreground: 'hsl(var(--warning-foreground))'
					},
					muted: {
						DEFAULT: 'hsl(var(--muted))',
						foreground: 'hsl(var(--muted-foreground))'
					},
					accent: {
						DEFAULT: 'hsl(var(--accent))',
						foreground: 'hsl(var(--accent-foreground))'
					},
					lime: 'hsl(var(--lime))',
					cyan: {
						accent: 'hsl(var(--cyan))'
					},
					ivory: 'hsl(var(--ivory))',
					'surface-elevated': 'hsl(var(--surface-elevated))',
					popover: {
						DEFAULT: 'hsl(var(--popover))',
						foreground: 'hsl(var(--popover-foreground))'
					},
					card: {
						DEFAULT: 'hsl(var(--card))',
						foreground: 'hsl(var(--card-foreground))'
					},
					sidebar: {
						DEFAULT: 'hsl(var(--sidebar-background))',
						foreground: 'hsl(var(--sidebar-foreground))',
						primary: 'hsl(var(--sidebar-primary))',
						'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
						accent: 'hsl(var(--sidebar-accent))',
						'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
						border: 'hsl(var(--sidebar-border))',
						ring: 'hsl(var(--sidebar-ring))'
					},
					chart: {
						'1': 'hsl(var(--chart-1))',
						'2': 'hsl(var(--chart-2))',
						'3': 'hsl(var(--chart-3))',
						'4': 'hsl(var(--chart-4))',
						'5': 'hsl(var(--chart-5))'
					}
				},
				borderRadius: {
					xl: 'calc(var(--radius) + 4px)',
					lg: 'var(--radius)',
					md: 'calc(var(--radius) - 2px)',
					sm: 'calc(var(--radius) - 4px)'
				},
				fontFamily: {
					sans: ['var(--font-sans)'],
					display: ['var(--font-display)'],
					serif: ['var(--font-serif)'],
					mono: ['var(--font-mono)']
				},
				keyframes: {
					'accordion-down': {
						from: {
							height: '0'
						},
						to: {
							height: 'var(--radix-accordion-content-height)'
						}
					},
					'accordion-up': {
						from: {
							height: 'var(--radix-accordion-content-height)'
						},
						to: {
							height: '0'
						}
					}
				},
				animation: {
					'accordion-down': 'accordion-down 0.2s ease-out',
					'accordion-up': 'accordion-up 0.2s ease-out'
				}
			}
		},
		plugins: [require("tailwindcss-animate")],
} satisfies Config;

```

## src/lib/superdev/client.ts

```ts
import { createSuperdevClient } from "@superdevhq/client";

export const superdevClient = createSuperdevClient({
  appId: import.meta.env.VITE_APP_ID,
  requiresAuth: ['/dashboard'],
  showBranding: false,
  affiliateId: '',
  baseUrl: import.meta.env.VITE_SUPERDEV_BASE_URL,
  loginUrl: `${import.meta.env.VITE_SUPERDEV_BASE_URL}/auth/app-login?app_id=${
    import.meta.env.VITE_APP_ID
  }`,
  cmsActive: true,
});

```

## src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```
