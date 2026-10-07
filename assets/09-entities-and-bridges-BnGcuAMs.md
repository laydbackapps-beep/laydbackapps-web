# Central Hub source bundle, part 09

## Manifest

1. `entities/ClientSite.json`
2. `entities/Lead.json`
3. `entities/WorkspaceSettings.json`
4. `entities/HostingRecord.json`
5. `entities/GrowthStackRecord.json`
6. `entities/ContentCalendarRecord.json`
7. `entities/ReportRecord.json`
8. `entities/EmailSignatureRecord.json`
9. `entities/FinancialHealthAuditRecord.json`
10. `entities/SocialRevampRecord.json`
11. `entities/Invoice.json`
12. `entities/InvoiceSettings.json`
13. `src/entities/index.ts`
14. `src/functions/index.ts`
15. `src/integrations/core.ts`

## `entities/ClientSite.json`

```json
{
  "name": "ClientSite",
  "description": "A client business site generated from social profile import — supports any business type with product catalog, inventory, and eCommerce",
  "properties": {
    "businessName": { "type": "string", "description": "Extracted business name" },
    "businessType": { "type": "string", "description": "Detected business type enum: retail, restaurant, salon, fitness, healthcare, professional_services, real_estate, automotive, education, hospitality, construction, home_services, other" },
    "trade": { "type": "string", "description": "Legacy category / industry label" },
    "clientKind": { "type": "string", "description": "Record kind: client or own_business" },
    "websiteSource": { "type": "string", "description": "Website source: buildy_built, existing_website, or no_website" },
    "activePackages": { "type": "array", "description": "Selected active package ids such as seo, local_visibility, social_revamp, social_growth, content, email_marketing, or paid_campaigns", "items": { "type": "string" } },
    "hostingRequired": { "type": "boolean", "description": "Whether hosting is required for this client or business record" },
    "description": { "type": "string", "description": "Business description extracted from socials" },
    "services": { "type": "array", "description": "List of services or offerings", "items": { "type": "string" } },
    "areasServed": { "type": "array", "description": "Legacy list of areas or locations served", "items": { "type": "string" } },
    "serviceAreas": { "type": "array", "description": "Confirmed suburbs, towns, regions, or postcodes the business serves", "items": { "type": "string" } },
    "location": { "type": "string", "description": "Primary location" },
    "phone": { "type": "string", "description": "Phone number if found" },
    "email": { "type": "string", "description": "Email if found" },
    "website": { "type": "string", "description": "Original or existing website URL" },
    "legalBusinessName": { "type": "string", "description": "Legal business name when supplied by the operator or client" },
    "abn": { "type": "string", "description": "Australian Business Number when supplied by the operator or client" },
    "primaryGoogleBusinessCategory": { "type": "string", "description": "Primary Google Business category recorded by the operator" },
    "secondaryGoogleBusinessCategories": { "type": "array", "description": "Secondary Google Business categories recorded by the operator", "items": { "type": "string" } },
    "businessHoursNotes": { "type": "string", "description": "Operator notes about regular business hours" },
    "holidayHoursNotes": { "type": "string", "description": "Operator notes about holiday or seasonal hours" },
    "licenceInsuranceNotes": { "type": "string", "description": "Operator notes about licence, insurance, or other trust evidence" },
    "googleBusinessUrl": { "type": "string", "description": "Public Google Business Profile or Maps URL" },
    "reviewLink": { "type": "string", "description": "Public link used to request an honest customer review" },
    "napTrustVerificationNotes": { "type": "string", "description": "Operator notes verifying name, address, phone, and trust details" },
    "primaryColor": { "type": "string", "description": "Extracted or inferred primary brand color hex" },
    "secondaryColor": { "type": "string", "description": "Secondary brand color hex" },
    "logoImageUrl": { "type": "string", "description": "URL of logo image if found" },
    "photoUrls": { "type": "array", "description": "Array of approved photo URLs used by the generated site", "items": { "type": "string" } },
    "verifiedMedia": {
      "type": "array",
      "description": "Original and processed manual uploads with human approval and quality metadata",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "description": "Stable manual media record id" },
          "fileName": { "type": "string", "description": "Original uploaded file name" },
          "originalUrl": { "type": "string", "description": "Preserved original upload URL" },
          "processedUrl": { "type": "string", "description": "Separate web-ready processed upload URL" },
          "role": { "type": "string", "description": "Approved role: logo, work, unassigned, or excluded" },
          "approvalStatus": { "type": "string", "description": "Manual review status: pending, approved, or excluded" },
          "width": { "type": "number", "description": "Processed image width in pixels" },
          "height": { "type": "number", "description": "Processed image height in pixels" },
          "originalWidth": { "type": "number", "description": "Original image width in pixels" },
          "originalHeight": { "type": "number", "description": "Original image height in pixels" },
          "fileSize": { "type": "number", "description": "Original file size in bytes" },
          "processedFileSize": { "type": "number", "description": "Processed file size in bytes" },
          "format": { "type": "string", "description": "Processed file format" },
          "qualityStatus": { "type": "string", "description": "Quality result, good or low_resolution" },
          "source": { "type": "string", "description": "manual_upload" },
          "suggestedRole": { "type": "string", "description": "Conservative suggested role shown to the operator" },
          "createdAt": { "type": "string", "description": "Upload timestamp" },
          "updatedAt": { "type": "string", "description": "Last review or processing timestamp" }
        }
      }
    },
    "reviewSnippets": {
      "type": "array",
      "description": "Review excerpts from social profiles",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "author": { "type": "string" },
          "rating": { "type": "number" }
        }
      }
    },
    "generatedSiteHtml": { "type": "string", "description": "Generated single-page site HTML markup" },
    "sourceLeadId": { "type": "string", "description": "Lead record that requested this automatic draft" },
    "previewToken": { "type": "string", "description": "SHA-256 hash of the raw token required to view a draft preview" },
    "status": { "type": "string", "description": "Site status draft or live" },
    "tier": { "type": "string", "description": "GrowthStack tier" },
    "socialLinks": {
      "type": "object",
      "description": "Legacy social URL object kept for existing client workflows",
      "properties": {
        "facebookUrl": { "type": "string" },
        "instagramUrl": { "type": "string" },
        "tiktokUrl": { "type": "string" },
        "linkedinUrl": { "type": "string" },
        "googleBusinessUrl": { "type": "string" }
      }
    },
    "socialLinkList": {
      "type": "array",
      "description": "Normalized public business social and profile links retained from the saved lead",
      "items": {
        "type": "object",
        "properties": {
          "platform": { "type": "string", "description": "Public platform name" },
          "url": { "type": "string", "description": "Safe public HTTP or HTTPS URL" }
        }
      }
    },
    "contactDetails": {
      "type": "object",
      "description": "Normalized public business contact details retained from the saved lead",
      "properties": {
        "phones": { "type": "array", "items": { "type": "string" } },
        "emails": { "type": "array", "items": { "type": "string" } },
        "contactPageUrl": { "type": "string" },
        "bookingUrl": { "type": "string" },
        "physicalAddress": { "type": "string" },
        "serviceAreas": { "type": "array", "items": { "type": "string" } },
        "openingHours": { "type": "string" }
      }
    },
    "publicPeople": {
      "type": "array",
      "description": "Publicly listed owners, decision-makers, or business people with source URLs",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "role": { "type": "string" },
          "sourceUrl": { "type": "string" }
        }
      }
    },
    "researchSourceUrls": {
      "type": "array",
      "description": "Public source URLs used for the saved lead enrichment",
      "items": { "type": "string" }
    },
    "paymentConfig": {
      "type": "object",
      "description": "eCommerce payment gateway configuration for this client store",
      "properties": {
        "stripeEnabled": { "type": "boolean" },
        "stripePublishableKey": { "type": "string" },
        "paypalEnabled": { "type": "boolean" },
        "paypalEmail": { "type": "string" },
        "squareEnabled": { "type": "boolean" },
        "adyenEnabled": { "type": "boolean" }
      }
    },
    "siteType": { "type": "string", "description": "Site type: service | ecommerce | both, default service" },
    "products": {
      "type": "array",
      "description": "Product catalog with inventory",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "price": { "type": "number" },
          "description": { "type": "string" },
          "category": { "type": "string" },
          "imageUrl": { "type": "string" },
          "sku": { "type": "string", "description": "Stock keeping unit" },
          "stock": { "type": "number", "description": "Inventory quantity" },
          "isActive": { "type": "boolean", "description": "Whether product is active for sale" },
          "compareAtPrice": { "type": "number", "description": "Original price for sale display" },
          "variants": {
            "type": "array",
            "description": "Variant groups like Size, Color",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string", "description": "Variant type e.g. Size" },
                "options": { "type": "array", "items": { "type": "string" }, "description": "Options e.g. S,M,L" }
              }
            }
          }
        }
      }
    },
    "includePromotions": { "type": "boolean", "description": "Whether promotional landing page is included" },
    "brandVoice": { "type": "string", "description": "Detected brand voice e.g luxury & refined, friendly & warm" },
    "brandAttitude": { "type": "string", "description": "Core attitude e.g confident and direct" },
    "contentStyle": { "type": "string", "description": "Writing style e.g short punchy lines, storytelling" },
    "customerLanguage": { "type": "array", "description": "Signature phrases the business uses", "items": { "type": "string" } },
    "visualVibe": { "type": "string", "description": "Visual energy e.g clean and airy, bold and loud" },
    "visualStyle": { "type": "string", "description": "Dominant visual aesthetic e.g photography-heavy, minimal product shots, lifestyle imagery" },
    "colorFromImages": { "type": "array", "description": "Dominant colors inferred from imagery as hex codes", "items": { "type": "string" } },
    "typographyVibe": { "type": "string", "description": "Typography style e.g elegant serif, clean display" },
    "extractedImageUrls": { "type": "array", "description": "Raw image URLs extracted from scraped pages", "items": { "type": "string" } },
    "customSections": {
      "type": "array",
      "description": "Drag-and-drop customized enterprise sections layout with module configs",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "type": { "type": "string" },
          "label": { "type": "string" },
          "description": { "type": "string" },
          "icon": { "type": "string" },
          "required": { "type": "boolean" },
          "config": { "type": "object" }
        }
      }
    }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "update": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "delete": { "user_condition": { "role": "administrator" } }
  }
}
```

## `entities/Lead.json`

```json
{
  "name": "Lead",
  "description": "A real business lead found through public research or added manually, with business details, website evidence, and optional website opportunity ranking",
  "properties": {
    "businessName": { "type": "string", "description": "Name of the business" },
    "trade": { "type": "string", "description": "Business type or industry, kept as the legacy storage field for compatibility" },
    "location": { "type": "string", "description": "Location, service area, region, or online market" },
    "phone": { "type": "string", "description": "Primary public business phone number" },
    "email": { "type": "string", "description": "Primary public business email address" },
    "website": { "type": "string", "description": "Official homepage URL when publicly verified" },
    "websiteStatus": { "type": "string", "description": "Compatibility summary: none | dodgy | outdated | good" },
    "instagramUrl": { "type": "string", "description": "Official Instagram profile URL" },
    "facebookUrl": { "type": "string", "description": "Official Facebook page URL" },
    "tiktokUrl": { "type": "string", "description": "Official TikTok profile URL" },
    "linkedinUrl": { "type": "string", "description": "Official LinkedIn profile or company URL" },
    "googleBusinessUrl": { "type": "string", "description": "Public Google Business Profile URL" },
    "socialLinks": {
      "type": "array",
      "description": "All clearly discoverable public business social or profile links from the bounded research pages",
      "items": {
        "type": "object",
        "properties": {
          "platform": { "type": "string", "description": "Public platform name" },
          "url": { "type": "string", "description": "Safe public HTTP or HTTPS profile URL" }
        }
      }
    },
    "contactDetails": {
      "type": "object",
      "description": "Complete public business contact details found in the bounded research pages",
      "properties": {
        "phones": { "type": "array", "items": { "type": "string" }, "description": "Unique publicly listed business phone numbers" },
        "emails": { "type": "array", "items": { "type": "string" }, "description": "Unique publicly listed business email addresses" },
        "contactPageUrl": { "type": "string", "description": "Public contact or enquiry page URL" },
        "bookingUrl": { "type": "string", "description": "Public booking, appointment, quote, or reservation URL" },
        "physicalAddress": { "type": "string", "description": "Physical business address when explicitly public" },
        "serviceAreas": { "type": "array", "items": { "type": "string" }, "description": "Publicly stated areas or markets served" },
        "openingHours": { "type": "string", "description": "Publicly stated opening or trading hours" }
      }
    },
    "businessSummary": { "type": "string", "description": "Concise factual summary of the business from public pages" },
    "services": { "type": "array", "items": { "type": "string" }, "description": "Publicly stated services, products, treatments, or offerings" },
    "ownerName": { "type": "string", "description": "Publicly identified owner or decision-maker name, only when explicitly associated with the business" },
    "ownerRole": { "type": "string", "description": "Public role associated with the owner or decision-maker name" },
    "ownerSourceUrl": { "type": "string", "description": "Public source URL that identifies the owner or decision-maker" },
    "publicPeople": {
      "type": "array",
      "description": "Other publicly identified business people with an explicit business role and source URL",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "Publicly listed person name" },
          "role": { "type": "string", "description": "Explicit public business role" },
          "sourceUrl": { "type": "string", "description": "Public source URL for the person and role" }
        }
      }
    },
    "researchSourceUrls": { "type": "array", "items": { "type": "string" }, "description": "Compact public URLs used as source traceability for the enrichment" },
    "leadKey": { "type": "string", "description": "Stable canonical public evidence or legacy identity key used for duplicate detection" },
    "clientSiteId": { "type": "string", "description": "Linked ClientSite draft created for this lead" },
    "previewUrl": { "type": "string", "description": "Safe HTTP or HTTPS preview URL for a linked or manually supplied private draft site" },
    "pitchDm": { "type": "string", "description": "Editable saved-lead social direct-message draft for manual review, copying, and sending" },
    "followUpDm": { "type": "string", "description": "Editable follow-up direct message asking whether the lead viewed the private preview" },
    "coldCallPitch": { "type": "string", "description": "Editable saved-lead cold-call draft tailored to the saved public business facts" },
    "outreachVersion": { "type": "string", "description": "Version of the saved-lead outreach drafts currently stored on this lead" },
    "pitchDmEdited": { "type": "boolean", "description": "Whether operator wording was manually edited and must be preserved during outreach regeneration" },
    "followUpDmEdited": { "type": "boolean", "description": "Whether the follow-up DM was manually edited and must be protected from automatic replacement" },
    "coldCallPitchEdited": { "type": "boolean", "description": "Whether operator wording was manually edited and must be preserved during outreach regeneration" },
    "siteBuildStatus": { "type": "string", "description": "Automatic site build status: none | queued | building | ready | failed" },
    "siteBuildError": { "type": "string", "description": "Short status or error message from the latest automatic site build" },
    "siteBuiltAt": { "type": "string", "format": "date-time", "description": "Timestamp when the automatic draft site was completed" },
    "status": { "type": "string", "description": "Lead pipeline status: new | contacted | replied | meeting | won | lost | not_interested, default new" },
    "notes": { "type": "string", "description": "Internal notes about outreach or the business" },
    "lastContactedAt": { "type": "string", "format": "date-time", "description": "Timestamp of the last contact attempt" },
    "contactMethod": { "type": "string", "description": "How the lead was last contacted: email | phone | dm | in_person" },
    "source": { "type": "string", "description": "How the lead was found, such as web_search, manual, or referral" },
    "fallbackBuildApproved": { "type": "boolean", "description": "Legacy approval flag for a private draft build, without changing verified search status" },
    "priority": { "type": "string", "description": "Lead priority: low | medium | high, default medium" },
    "socialBio": { "type": "string", "description": "Public business description or profile snippet" },
    "followerCount": { "type": "number", "description": "Approximate follower count if publicly extractable" },
    "score": { "type": "number", "description": "Deterministic website opportunity score from 0 to 100, based on verified public signals" },
    "leadCategory": { "type": "string", "description": "Website opportunity category: hot | warm | cold" },
    "scoreReasons": { "type": "array", "items": { "type": "string" }, "description": "Short factual reasons explaining the website opportunity score" },
    "websiteSignals": { "type": "object", "description": "Compact factual homepage inspection signals used for the ranking" },
    "websiteLastCheckedAt": { "type": "string", "format": "date-time", "description": "Timestamp when the public homepage was last inspected" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/WorkspaceSettings.json`

```json
{
  "name": "WorkspaceSettings",
  "description": "Private operator preferences for the authenticated Central Hub workspace",
  "properties": {
    "workspaceName": { "type": "string", "description": "Display name for the operator workspace" },
    "timezone": { "type": "string", "description": "IANA timezone used for workspace planning and date context" },
    "operatorNotes": { "type": "string", "description": "Private notes for the workspace operator" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/HostingRecord.json`

```json
{
  "name": "HostingRecord",
  "description": "An owner-maintained hosting operations record linked to a saved client site",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Linked ClientSite record id" },
    "businessName": { "type": "string", "description": "Display name copied from the linked client site" },
    "domain": { "type": "string", "description": "Managed domain name without a protocol" },
    "sslStatus": { "type": "string", "description": "Operator-maintained SSL state: active | expiring | missing | unknown" },
    "cdnStatus": { "type": "string", "description": "Operator-maintained CDN state: active | inactive | unknown" },
    "hostingStatus": { "type": "string", "description": "Hosting lifecycle state: pending | active | paused | attention" },
    "bandwidthUsedGb": { "type": "number", "description": "Bandwidth used in GB for the recorded period" },
    "bandwidthLimitGb": { "type": "number", "description": "Bandwidth allowance in GB for the recorded period" },
    "storageUsedGb": { "type": "number", "description": "Storage used in GB" },
    "storageLimitGb": { "type": "number", "description": "Storage allowance in GB" },
    "uptimePercentage": { "type": "number", "description": "Operator-recorded uptime percentage from 0 to 100" },
    "lastCheckedAt": { "type": "string", "format": "date-time", "description": "When the operator last checked this record" },
    "nextCheckDate": { "type": "string", "format": "date", "description": "Next planned operator check date" },
    "renewalDate": { "type": "string", "format": "date", "description": "Domain or hosting renewal date when known" },
    "notes": { "type": "string", "description": "Internal hosting notes" },
    "operationalStatus": { "type": "string", "description": "Operational attention state: healthy | attention | maintenance | unknown" },
    "actionNeeded": { "type": "string", "description": "Next manual action required, if any" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/GrowthStackRecord.json`

```json
{
  "name": "GrowthStackRecord",
  "description": "A private operator work record linked to any saved client or business, with package planning and local visibility measurement",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Linked ClientSite record id. The client can have a Buildy site, an external site, or no website." },
    "leadId": { "type": "string", "description": "Optional linked Lead record id" },
    "packageTier": { "type": "string", "description": "Legacy GrowthStack tier label retained for compatibility: Basic Growth | Full Growth | Aggressive" },
    "lifecycleStatus": { "type": "string", "description": "Work lifecycle: onboarding | active | paused | completed" },
    "currentFocus": { "type": "string", "description": "The main growth focus for the current work period" },
    "nextAction": { "type": "string", "description": "The next manual operator action" },
    "ownerNotes": { "type": "string", "description": "Private notes about strategy, approvals, and delivery context" },
    "attentionStatus": { "type": "string", "description": "Attention state: healthy | attention | resolved" },
    "lastActivityAt": { "type": "string", "format": "date-time", "description": "When work was last recorded" },
    "nextReviewDate": { "type": "string", "format": "date", "description": "Next planned operator review date" },
    "targetWebsite": { "type": "string", "description": "Website or domain being supported by the current work" },
    "googleBusinessUrl": { "type": "string", "description": "Google Business Profile or public Google Business URL" },
    "activePackageSnapshot": { "type": "array", "description": "Active package ids copied from the linked ClientSite when this work record is saved", "items": { "type": "string" } },
    "monthlyRetainer": { "type": ["number", "null"], "description": "Optional monthly retainer amount in AUD. Null means it has not been entered." },
    "billingStatus": { "type": "string", "description": "Manual billing status: not_set | active | past_due | paused | ended" },
    "owner": { "type": "string", "description": "Operator responsible for the current work record" },
    "blockers": { "type": "string", "description": "Current dependencies, missing access, approvals, or delivery blockers" },
    "lastWin": { "type": "string", "description": "Most recent operator-recorded win" },
    "localVisibilityChecklist": {
      "type": "array",
      "description": "Operator-maintained Lay'd Back local readiness checklist with evidence and notes",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "status": { "type": "string", "description": "missing | in_review | verified | not_applicable" },
          "evidence": { "type": "string" },
          "notes": { "type": "string" },
          "updatedAt": { "type": "string" }
        }
      }
    },
    "aeoChecklist": {
      "type": "array",
      "description": "Private operator-maintained Answer Engine Optimization foundation checks. Status is missing | in_review | verified. Verification records evidence and does not guarantee rankings, citations, or AI answer placement.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "description": "Stable foundation check id" },
          "label": { "type": "string", "description": "Foundation check label" },
          "status": { "type": "string", "description": "missing | in_review | verified" },
          "evidence": { "type": "string", "description": "Operator or client-supplied evidence supporting the check" },
          "note": { "type": "string", "description": "Private operator note or next context" },
          "verifiedAt": { "type": "string", "format": "date", "description": "Date the check was marked verified" },
          "verifiedBy": { "type": "string", "description": "Operator or client contact who verified the check" }
        }
      }
    },
    "seoFoundationChecklist": {
      "type": "array",
      "description": "Operator-maintained SEO foundation checks. Verification requires supporting evidence or a clear note; this records readiness work and does not claim rankings.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "description": "Stable SEO foundation check id" },
          "label": { "type": "string", "description": "SEO foundation check label" },
          "group": { "type": "string", "description": "technical | content_structure | entity_schema | conversion_proof" },
          "status": { "type": "string", "description": "missing | in_review | verified | blocked | not_applicable" },
          "evidence": { "type": "string", "description": "Public source, operator record, or client evidence supporting the check" },
          "notes": { "type": "string", "description": "Private operator note, blocker, or next context" },
          "updatedAt": { "type": "string", "format": "date", "description": "Date the check was last updated" }
        }
      }
    },
    "primaryCanonicalUrl": { "type": "string", "description": "Operator-selected canonical public domain or page root for this business" },
    "technicalSeoNotes": { "type": "string", "description": "Private technical SEO notes, blockers, and observations for this business" },
    "keywordTargets": {
      "type": "array",
      "description": "Editable service and area keyword targets. Approval does not publish content or change a public site.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "service": { "type": "string" },
          "area": { "type": "string" },
          "keyword": { "type": "string" },
          "intent": { "type": "string", "description": "service | commercial | emergency | informational" },
          "targetUrl": { "type": "string" },
          "priority": { "type": "string", "description": "high | medium | low" },
          "status": { "type": "string", "description": "draft | approved | in_progress | published | paused" },
          "approvalState": { "type": "string", "description": "draft | approved | rejected" },
          "notes": { "type": "string" }
        }
      }
    },
    "reviewMetrics": {
      "type": "object",
      "description": "Current operator-entered review and reputation metrics. Blank values remain unavailable.",
      "properties": {
        "totalReviews": { "type": ["number", "null"] },
        "averageRating": { "type": ["number", "null"] },
        "newReviewsThisMonth": { "type": ["number", "null"] },
        "responseRate": { "type": ["number", "null"] },
        "lastRequestDate": { "type": "string", "format": "date" },
        "reviewRequestLink": { "type": "string" },
        "notes": { "type": "string" }
      }
    },
    "reviewSnapshots": {
      "type": "array",
      "description": "Monthly operator-entered review snapshots, one per month",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "month": { "type": "string", "format": "date" },
          "totalReviews": { "type": ["number", "null"] },
          "averageRating": { "type": ["number", "null"] },
          "newReviews": { "type": ["number", "null"] },
          "responseRate": { "type": ["number", "null"] },
          "source": { "type": "string" },
          "notes": { "type": "string" }
        }
      }
    },
    "conversionSnapshots": {
      "type": "array",
      "description": "Monthly calls, enquiries, leads, and booked-job snapshots. Values are recorded, not inferred.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "month": { "type": "string", "format": "date" },
          "calls": { "type": ["number", "null"] },
          "formEnquiries": { "type": ["number", "null"] },
          "qualifiedLeads": { "type": ["number", "null"] },
          "bookedJobs": { "type": ["number", "null"] },
          "averageResponseMinutes": { "type": ["number", "null"] },
          "source": { "type": "string" },
          "sourceType": { "type": "string", "description": "manual | client_reported | automatic" },
          "notes": { "type": "string" }
        }
      }
    },
    "conversionSetupChecklist": {
      "type": "array",
      "description": "Operator checklist for call, form, attribution, and follow-up readiness",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "complete": { "type": "boolean" },
          "notes": { "type": "string" }
        }
      }
    },
    "gbpActionLog": {
      "type": "array",
      "description": "Draft and approved Google Business actions recorded for operator review",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "date": { "type": "string", "format": "date" },
          "action": { "type": "string" },
          "status": { "type": "string", "description": "draft | approved | completed | blocked" },
          "notes": { "type": "string" }
        }
      }
    },
    "monthlyVisibilityNotes": {
      "type": "array",
      "description": "Monthly local visibility notes and next actions, one entry per month",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "month": { "type": "string", "format": "date" },
          "summary": { "type": "string" },
          "notes": { "type": "string" },
          "nextAction": { "type": "string" }
        }
      }
    },
    "workPlan": {
      "type": "array",
      "description": "Manual work-plan tasks. Saving a task does not publish, send, or run a campaign.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "workstream": { "type": "string", "description": "Google Business & Maps, on-page service/entity work, service-area targets, reviews, content answers, conversion, legacy channel work, or reporting" },
          "title": { "type": "string" },
          "status": { "type": "string", "description": "planned | in_progress | blocked | delivered" },
          "owner": { "type": "string" },
          "dueDate": { "type": "string", "format": "date" },
          "notes": { "type": "string" },
          "deliveredDate": { "type": "string", "format": "date" }
        }
      }
    },
    "monthlyDeliveryLog": {
      "type": "array",
      "description": "Manual monthly delivery and outcome notes. This log records work and does not execute a channel workflow.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "month": { "type": "string", "format": "date" },
          "summary": { "type": "string" },
          "deliveredItems": { "type": "array", "items": { "type": "string" } },
          "outcomeNotes": { "type": "string" },
          "nextAction": { "type": "string" }
        }
      }
    },
    "seoCount": { "type": "number", "description": "Legacy recorded SEO work count retained for old records" },
    "localVisibilityCount": { "type": "number", "description": "Legacy recorded local visibility work count retained for old records" },
    "contentCount": { "type": "number", "description": "Legacy recorded content work count retained for old records" },
    "emailCount": { "type": "number", "description": "Legacy recorded email work count retained for old records" },
    "communityCount": { "type": "number", "description": "Legacy recorded community work count retained for old records" },
    "campaignsCount": { "type": "number", "description": "Legacy recorded campaign work count retained for old records" },
    "reportingCount": { "type": "number", "description": "Legacy recorded reporting work count retained for old records" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/ContentCalendarRecord.json`

```json
{
  "name": "ContentCalendarRecord",
  "description": "An owner-maintained content planning record for a saved client site or an unlinked content idea. This workspace is review-only and never publishes or sends content.",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Optional linked ClientSite id. Leave blank for an unlinked planning item." },
    "title": { "type": "string", "description": "Working title for the content item" },
    "contentType": { "type": "string", "description": "Content type: social_post | blog_article | email | newsletter | video | image | other" },
    "channel": { "type": "string", "description": "Intended channel: instagram | facebook | linkedin | tiktok | website | email | other" },
    "workflowStatus": { "type": "string", "description": "Manual workflow status: planned | drafted | approved | scheduled | published. Published means manually marked published only." },
    "scheduledAt": { "type": "string", "format": "date-time", "description": "Optional planned date and time. Required when workflowStatus is approved or scheduled." },
    "reviewState": { "type": "string", "description": "Manual review state: not_reviewed | needs_review | changes_requested | approved" },
    "ownerNotes": { "type": "string", "description": "Private operator notes about approvals, context, or handoff" },
    "callToAction": { "type": "string", "description": "Optional call to action or conversion instruction for the draft" },
    "brief": { "type": "string", "description": "Optional content brief, angle, or draft direction" },
    "aeoType": { "type": "string", "description": "Optional answer-ready asset type: service_area_answer | faq_cluster | howto_process | proof_case | cost_process. Planning label only, never automatic publishing." },
    "targetEntity": { "type": "string", "description": "Concise service, area, or business entity context for the answer-ready draft" },
    "firstPartyEvidence": { "type": "string", "description": "Operator or client-supplied evidence notes only. Do not use invented proof, claims, prices, or outcomes." },
    "schemaTypes": { "type": "array", "description": "Selected draft schema types for manual review before any public implementation", "items": { "type": "string" } },
    "lastActivityAt": { "type": "string", "format": "date-time", "description": "Optional date and time of the last manually recorded activity" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/ReportRecord.json`

```json
{
  "name": "ReportRecord",
  "description": "An owner-maintained reporting snapshot for a saved client site or an unlinked reporting period. Values are entered by the operator and are not connected to analytics, exports, or delivery.",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Optional linked ClientSite id. Leave blank for an unlinked reporting snapshot." },
    "periodLabel": { "type": "string", "description": "Human-readable reporting period label, such as July 2026" },
    "periodStart": { "type": "string", "format": "date", "description": "Start date of the reporting period" },
    "periodEnd": { "type": "string", "format": "date", "description": "End date of the reporting period" },
    "reportStatus": { "type": "string", "description": "Manual report status: draft | in_review | final" },
    "executiveSummary": { "type": "string", "description": "Operator-entered summary of the reporting period" },
    "wins": { "type": "string", "description": "Operator-entered wins, one per line when useful" },
    "risks": { "type": "string", "description": "Operator-entered risks or watch items, one per line when useful" },
    "nextActions": { "type": "string", "description": "Operator-entered next actions for the following period" },
    "recordedTraffic": { "type": ["number", "null"], "description": "Optional recorded traffic value. Blank means no traffic value was entered." },
    "recordedLeads": { "type": ["number", "null"], "description": "Optional recorded leads value. Blank means no leads value was entered." },
    "recordedConversions": { "type": ["number", "null"], "description": "Optional recorded conversions value. Blank means no conversions value was entered." },
    "notes": { "type": "string", "description": "Private operator notes for the snapshot" },
    "lastUpdatedAt": { "type": "string", "format": "date-time", "description": "Timestamp of the last successful manual save" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/EmailSignatureRecord.json`

```json
{
  "name": "EmailSignatureRecord",
  "description": "A private operator-managed email signature workspace linked to a saved client or business record",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Linked ClientSite record id" },
    "version": { "type": "number", "description": "Current signature version number" },
    "status": { "type": "string", "description": "Signature delivery stage: brief_collected | draft | client_approved | delivered | seasonal_update" },
    "businessName": { "type": "string", "description": "Approved business name shown in the signature" },
    "tagline": { "type": "string", "description": "Optional approved business tagline" },
    "logoImageUrl": { "type": "string", "description": "Managed logo URL used by the signature" },
    "primaryColor": { "type": "string", "description": "Approved primary brand colour" },
    "secondaryColor": { "type": "string", "description": "Approved secondary brand colour" },
    "phone": { "type": "string", "description": "Approved business phone number" },
    "email": { "type": "string", "description": "Approved business email address" },
    "website": { "type": "string", "description": "Approved business website URL" },
    "address": { "type": "string", "description": "Approved business address or service area" },
    "bookingUrl": { "type": "string", "description": "Optional approved booking or enquiry URL" },
    "socialLinks": {
      "type": "object",
      "description": "Approved social and profile URLs",
      "properties": {
        "facebook": { "type": "string" },
        "instagram": { "type": "string" },
        "linkedin": { "type": "string" },
        "tiktok": { "type": "string" },
        "googleBusiness": { "type": "string" }
      }
    },
    "teamMembers": {
      "type": "array",
      "description": "Approved team members who may use the signature",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "role": { "type": "string" },
          "email": { "type": "string" },
          "phone": { "type": "string" },
          "licenceDetails": { "type": "string" },
          "insuranceDetails": { "type": "string" }
        }
      }
    },
    "signatureHtml": { "type": "string", "description": "Generated email-client-friendly HTML for the primary team member" },
    "signaturePlainText": { "type": "string", "description": "Generated plain-text fallback for the primary team member" },
    "installationGuides": {
      "type": "object",
      "description": "Operator-approved installation instructions",
      "properties": {
        "gmail": { "type": "string" },
        "outlook": { "type": "string" },
        "appleMail": { "type": "string" }
      }
    },
    "approvalConfirmed": { "type": "boolean", "description": "Whether the operator recorded client approval of the supplied details" },
    "approvedBy": { "type": "string", "description": "Name or initials of the approving client contact" },
    "approvedAt": { "type": "string", "format": "date-time", "description": "Approval date and time" },
    "deliveryDate": { "type": "string", "format": "date-time", "description": "Date and time the signature package was marked delivered" },
    "deliveryRecipient": { "type": "string", "description": "Client recipient or team receiving the package" },
    "deliveryNotes": { "type": "string", "description": "Notes about the recorded delivery and manual installation handoff" },
    "seasonalUpdateNotes": { "type": "string", "description": "Notes for the next seasonal, campaign, or offer update" },
    "operatorNotes": { "type": "string", "description": "Private operator notes about the signature work" },
    "versionHistory": {
      "type": "array",
      "description": "Private record of saved signature versions and delivery milestones",
      "items": {
        "type": "object",
        "properties": {
          "version": { "type": "number" },
          "status": { "type": "string" },
          "savedAt": { "type": "string", "format": "date-time" },
          "approvedAt": { "type": "string", "format": "date-time" },
          "deliveryDate": { "type": "string", "format": "date-time" },
          "notes": { "type": "string" }
        }
      }
    },
    "lastUpdatedAt": { "type": "string", "format": "date-time", "description": "Last successful operator save" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "update": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "delete": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    }
  }
}
```

## `entities/FinancialHealthAuditRecord.json`

```json
{
  "name": "FinancialHealthAuditRecord",
  "description": "A private monthly management-advisory review based on operator-entered client information",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Linked ClientSite record id" },
    "periodKey": { "type": "string", "description": "Unique client reporting period identity in YYYY-MM format" },
    "periodLabel": { "type": "string", "description": "Human-readable reporting period label" },
    "periodStart": { "type": "string", "format": "date", "description": "Reporting period start date" },
    "periodEnd": { "type": "string", "format": "date", "description": "Reporting period end date" },
    "workflowStatus": { "type": "string", "description": "Review stage: draft | intake | analysis | qa_review | approved | delivered | needs_clarification" },
    "dataCutoffDate": { "type": "string", "format": "date", "description": "Monthly data cut-off date" },
    "accessChecklist": {
      "type": "object",
      "description": "Logged read-only accounting access handoff, never credentials",
      "properties": {
        "provider": { "type": "string" },
        "organisationName": { "type": "string" },
        "requestedAt": { "type": "string", "format": "date-time" },
        "grantedAt": { "type": "string", "format": "date-time" },
        "revokedAt": { "type": "string", "format": "date-time" },
        "readOnlyConfirmed": { "type": "boolean" },
        "clarificationNotes": { "type": "string" }
      }
    },
    "sourceChecklist": {
      "type": "object",
      "description": "Required monthly source report checklist",
      "properties": {
        "profitAndLoss": { "type": "boolean" },
        "balanceSheet": { "type": "boolean" },
        "agedReceivables": { "type": "boolean" },
        "cashPosition": { "type": "boolean" },
        "agedPayables": { "type": "boolean" },
        "otherSourceNotes": { "type": "boolean" }
      }
    },
    "uploadedReports": {
      "type": "array",
      "description": "Private uploaded report metadata and private storage references",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "fileName": { "type": "string" },
          "fileType": { "type": "string" },
          "fileSize": { "type": "number" },
          "sourceCategory": { "type": "string" },
          "uploadedAt": { "type": "string", "format": "date-time" },
          "privateFileUrl": { "type": "string" },
          "notes": { "type": "string" }
        }
      }
    },
    "dataQualityFlags": { "type": "string", "description": "Known data quality flags for this period" },
    "metrics": {
      "type": "object",
      "description": "Operator-entered management metrics, blank values remain unavailable",
      "properties": {
        "revenue": { "type": "number" },
        "cogs": { "type": "number" },
        "grossProfit": { "type": "number" },
        "operatingExpenses": { "type": "number" },
        "netProfit": { "type": "number" },
        "cashOnHand": { "type": "number" },
        "totalReceivables": { "type": "number" },
        "overdueReceivables": { "type": "number" },
        "payables": { "type": "number" },
        "averageMonthlyOutflows": { "type": "number" },
        "sourceNotes": { "type": "string" }
      }
    },
    "derivedCalculations": {
      "type": "object",
      "description": "Transparent management calculations based only on supplied metrics",
      "properties": {
        "grossMargin": { "type": "number" },
        "operatingMargin": { "type": "number" },
        "overdueDebtorPercentage": { "type": "number" },
        "cashRunwayMonths": { "type": "number" },
        "priorRevenueVariance": { "type": "number" },
        "priorNetProfitVariance": { "type": "number" }
      }
    },
    "periodComparison": {
      "type": "object",
      "description": "Prior period figures used for percentage variance",
      "properties": {
        "priorPeriodKey": { "type": "string" },
        "priorRevenue": { "type": "number" },
        "priorNetProfit": { "type": "number" },
        "priorCashOnHand": { "type": "number" },
        "sourceNotes": { "type": "string" }
      }
    },
    "commentary": {
      "type": "object",
      "description": "Structured operator commentary for the monthly review",
      "properties": {
        "pAndL": { "type": "string" },
        "cashFlowWatch": { "type": "string" },
        "debtorWatchlist": { "type": "string" },
        "payablesWatch": { "type": "string" },
        "expenseTrend": { "type": "string" },
        "growthOpportunities": { "type": "string" },
        "dataQualityIssues": { "type": "string" }
      }
    },
    "risks": {
      "type": "array",
      "description": "Structured risks requiring operator review",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string" },
          "title": { "type": "string" },
          "detail": { "type": "string" },
          "impact": { "type": "string" }
        }
      }
    },
    "recommendations": {
      "type": "array",
      "description": "Structured management recommendations with accountability fields",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "detail": { "type": "string" },
          "impact": { "type": "string" },
          "effort": { "type": "string" },
          "owner": { "type": "string" },
          "dueDate": { "type": "string", "format": "date" },
          "status": { "type": "string" }
        }
      }
    },
    "assumptions": { "type": "string", "description": "Operator assumptions used in the advisory review" },
    "limitations": { "type": "string", "description": "Limitations and missing information" },
    "limitationsAcknowledged": { "type": "boolean", "description": "Operator acknowledged limitations before approval" },
    "qaApproved": { "type": "boolean", "description": "Operator completed internal QA review" },
    "qaApprovedBy": { "type": "string", "description": "Operator name or initials approving QA" },
    "qaApprovedAt": { "type": "string", "format": "date-time", "description": "QA approval timestamp" },
    "clientReadySummary": { "type": "string", "description": "Client-facing summary prepared for print or copy" },
    "deliveryDate": { "type": "string", "format": "date-time", "description": "Date and time the review was marked delivered" },
    "deliveryRecipient": { "type": "string", "description": "Client recipient for the delivered review" },
    "deliveryNotes": { "type": "string", "description": "Notes about the recorded delivery" },
    "nextReviewDate": { "type": "string", "format": "date", "description": "Next planned monthly review date" },
    "loomUrl": { "type": "string", "description": "Optional Loom walkthrough URL" },
    "deliveryHistory": {
      "type": "array",
      "description": "Private history of QA, approval, and delivery milestones",
      "items": {
        "type": "object",
        "properties": {
          "status": { "type": "string" },
          "date": { "type": "string", "format": "date-time" },
          "recipient": { "type": "string" },
          "notes": { "type": "string" }
        }
      }
    },
    "lastUpdatedAt": { "type": "string", "format": "date-time", "description": "Last successful operator save" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "update": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "delete": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    }
  }
}
```

## `entities/SocialRevampRecord.json`

```json
{
  "name": "SocialRevampRecord",
  "description": "A private client-linked social media revamp brief and delivery workspace for public profile work",
  "properties": {
    "clientSiteId": { "type": "string", "description": "Linked ClientSite record id" },
    "businessName": { "type": "string", "description": "Business name snapshot captured when the revamp was saved" },
    "selectedPlatforms": { "type": "array", "description": "Selected public social platforms: facebook | instagram | linkedin | tiktok", "items": { "type": "string" } },
    "sourceProfileUrls": {
      "type": "object",
      "description": "Public profile URLs supplied for the selected platforms. Never stores passwords or private access details.",
      "properties": {
        "facebook": { "type": "string" },
        "instagram": { "type": "string" },
        "linkedin": { "type": "string" },
        "tiktok": { "type": "string" }
      }
    },
    "clientBrief": { "type": "string", "description": "The client's requested social media revamp brief" },
    "audience": { "type": "string", "description": "Priority audience and customers the revamp should speak to" },
    "servicesOffers": { "type": "string", "description": "Services, products, offers, or priorities to feature" },
    "location": { "type": "string", "description": "Service area or location to reflect in positioning" },
    "goals": { "type": "string", "description": "Business and social goals for the revamp" },
    "primaryCta": { "type": "string", "description": "Primary action the profiles should drive" },
    "brandVoice": { "type": "string", "description": "Approved or requested writing voice" },
    "visualDirection": { "type": "string", "description": "Requested visual direction and presentation cues" },
    "constraints": { "type": "string", "description": "Client constraints, inclusions, exclusions, or compliance notes" },
    "uploadedAssets": {
      "type": "array",
      "description": "Private metadata for client-supplied logos, photos, and reference assets",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "fileName": { "type": "string" },
          "fileType": { "type": "string" },
          "fileSize": { "type": "number" },
          "assetType": { "type": "string" },
          "privateFileUrl": { "type": "string" },
          "uploadedAt": { "type": "string", "format": "date-time" },
          "notes": { "type": "string" }
        }
      }
    },
    "status": { "type": "string", "description": "Revamp stage: brief_collected | audit_ready | strategy_draft | design_draft | client_review | approved | delivered | ongoing_marketing | paused" },
    "revisionNotes": { "type": "string", "description": "Client or operator revision notes for the current version" },
    "nextAction": { "type": "string", "description": "Next manual operator action for this revamp" },
    "operatorNotes": { "type": "string", "description": "Private operator notes and delivery context" },
    "approvalConfirmed": { "type": "boolean", "description": "Whether client approval was recorded for the current revamp direction" },
    "approvedBy": { "type": "string", "description": "Client contact or operator recording approval" },
    "approvedAt": { "type": "string", "format": "date-time", "description": "Approval date and time" },
    "deliveryDate": { "type": "string", "format": "date-time", "description": "Date and time the revamp pack was marked delivered" },
    "deliveryRecipient": { "type": "string", "description": "Client contact or team receiving the revamp pack" },
    "deliveryNotes": { "type": "string", "description": "Manual handoff notes and installation guidance" },
    "version": { "type": "number", "description": "Current saved revamp version" },
    "versionHistory": {
      "type": "array",
      "description": "Private history of saved versions and approval or delivery milestones",
      "items": {
        "type": "object",
        "properties": {
          "version": { "type": "number" },
          "status": { "type": "string" },
          "savedAt": { "type": "string", "format": "date-time" },
          "approvedAt": { "type": "string", "format": "date-time" },
          "deliveryDate": { "type": "string", "format": "date-time" },
          "notes": { "type": "string" }
        }
      }
    },
    "lastUpdatedAt": { "type": "string", "format": "date-time", "description": "Last successful operator save" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "update": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    },
    "delete": {
      "$or": [
        { "created_by": "{{user.email}}" },
        { "user_condition": { "role": "administrator" } }
      ]
    }
  }
}
```

## `entities/Invoice.json`

```json
{
  "name": "Invoice",
  "description": "Private operator-created client invoice drafts and payment records",
  "properties": {
    "invoiceNumber": { "type": "string", "description": "Human-readable invoice number" },
    "status": { "type": "string", "description": "Invoice status: draft, paid, or cancelled" },
    "clientSiteId": { "type": "string", "description": "Optional linked ClientSite record id" },
    "clientName": { "type": "string", "description": "Client or business name shown on the invoice" },
    "clientEmail": { "type": "string", "description": "Client email address" },
    "clientPhone": { "type": "string", "description": "Client phone number" },
    "clientAddress": { "type": "string", "description": "Client billing address" },
    "issueDate": { "type": "string", "description": "Invoice issue date in ISO date format" },
    "dueDate": { "type": "string", "description": "Invoice due date in ISO date format" },
    "currency": { "type": "string", "description": "Invoice currency, currently AUD" },
    "websiteAmount": { "type": "number", "description": "Custom website or store build amount in AUD" },
    "marketingPackageId": { "type": "string", "description": "Selected public marketing package id" },
    "marketingTerm": { "type": "string", "description": "Prepaid term: monthly, three_month, six_month, or annual" },
    "lineItems": {
      "type": "array",
      "description": "Invoice line items with descriptions, quantities, unit amounts, and totals",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "kind": { "type": "string" },
          "description": { "type": "string" },
          "quantity": { "type": "number" },
          "unitAmount": { "type": "number" },
          "lineTotal": { "type": "number" },
          "termLabel": { "type": "string" }
        }
      }
    },
    "billingTerms": { "type": "string", "description": "Plain-language prepaid billing terms shown to the client" },
    "subtotal": { "type": "number", "description": "Invoice subtotal in AUD before GST" },
    "gstEnabled": { "type": "boolean", "description": "Whether GST is included in the calculation" },
    "gstRate": { "type": "number", "description": "GST rate percentage used for this invoice" },
    "gstAmount": { "type": "number", "description": "GST amount in AUD" },
    "total": { "type": "number", "description": "Invoice total in AUD" },
    "notes": { "type": "string", "description": "Private or client-facing invoice notes" },
    "paymentInstructionSnapshot": {
      "type": "object",
      "description": "Payment and brand details copied into the invoice at save time",
      "properties": {
        "legalName": { "type": "string" },
        "tradingName": { "type": "string" },
        "abn": { "type": "string" },
        "address": { "type": "string" },
        "email": { "type": "string" },
        "phone": { "type": "string" },
        "website": { "type": "string" },
        "logoUrl": { "type": "string" },
        "primaryColor": { "type": "string" },
        "secondaryColor": { "type": "string" },
        "accentColor": { "type": "string" },
        "bankAccountName": { "type": "string" },
        "bankName": { "type": "string" },
        "bsb": { "type": "string" },
        "accountNumber": { "type": "string" },
        "payid": { "type": "string" },
        "paymentTerms": { "type": "string" },
        "footerNote": { "type": "string" }
      }
    }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `entities/InvoiceSettings.json`

```json
{
  "name": "InvoiceSettings",
  "description": "Private operator business, brand, tax, and payment instructions for invoices",
  "properties": {
    "legalName": { "type": "string", "description": "Legal business name" },
    "tradingName": { "type": "string", "description": "Trading or public business name" },
    "abn": { "type": "string", "description": "Australian Business Number when supplied" },
    "address": { "type": "string", "description": "Business address" },
    "email": { "type": "string", "description": "Business email" },
    "phone": { "type": "string", "description": "Business phone" },
    "website": { "type": "string", "description": "Business website" },
    "logoUrl": { "type": "string", "description": "Logo URL used on invoices" },
    "primaryColor": { "type": "string", "description": "Primary invoice brand colour" },
    "secondaryColor": { "type": "string", "description": "Secondary invoice brand colour" },
    "accentColor": { "type": "string", "description": "Accent invoice brand colour" },
    "bankAccountName": { "type": "string", "description": "Bank account name for transfers" },
    "bankName": { "type": "string", "description": "Bank name for transfers" },
    "bsb": { "type": "string", "description": "Bank BSB" },
    "accountNumber": { "type": "string", "description": "Bank account number" },
    "payid": { "type": "string", "description": "PayID payment detail" },
    "paymentTerms": { "type": "string", "description": "Default payment terms shown on invoices" },
    "invoicePrefix": { "type": "string", "description": "Prefix used when suggesting invoice numbers" },
    "nextInvoiceNumber": { "type": "number", "description": "Next numeric invoice sequence value" },
    "gstEnabled": { "type": "boolean", "description": "Whether GST is enabled by the operator" },
    "gstRate": { "type": "number", "description": "GST rate percentage" },
    "footerNote": { "type": "string", "description": "Footer note printed on invoices" }
  },
  "rls": {
    "create": { "created_by": "{{user.email}}" },
    "read": { "created_by": "{{user.email}}" },
    "update": { "created_by": "{{user.email}}" },
    "delete": { "created_by": "{{user.email}}" }
  }
}
```

## `src/entities/index.ts`

```ts
import { superdevClient } from "@/lib/superdev/client";

export const User = superdevClient.auth;
export const ClientSite = superdevClient.entity("ClientSite");
export const Category = superdevClient.entity("Category");
export const Post = superdevClient.entity("Post");
export const Lead = superdevClient.entity("Lead");
export const HostingRecord = superdevClient.entity("HostingRecord");
export const GrowthStackRecord = superdevClient.entity("GrowthStackRecord");
export const ContentCalendarRecord = superdevClient.entity("ContentCalendarRecord");
export const ReportRecord = superdevClient.entity("ReportRecord");
export const EmailSignatureRecord = superdevClient.entity("EmailSignatureRecord");
export const FinancialHealthAuditRecord = superdevClient.entity("FinancialHealthAuditRecord");
export const SocialRevampRecord = superdevClient.entity("SocialRevampRecord");
export const WorkspaceSettings = superdevClient.entity("WorkspaceSettings");
export const PayPalPlan = superdevClient.entity("PayPalPlan");
export const PayPalTransaction = superdevClient.entity("PayPalTransaction");
export const Invoice = superdevClient.entity("Invoice");
export const InvoiceSettings = superdevClient.entity("InvoiceSettings");
```

## `src/functions/index.ts`

```ts
import { superdevClient } from "@/lib/superdev/client";

type FunctionInvoker = (...args: any[]) => unknown;

function invokeSiteBuilderFunction(name: "importSocialProfile" | "searchBusinessImages", args: any[]) {
  const functionRegistry = (superdevClient as any)?.functions as Record<string, unknown> | undefined;
  const candidate = functionRegistry?.[name];
  if (typeof candidate !== "function") {
    const error = new Error("The Site Builder import connection is unavailable.");
    (error as Error & { code?: string }).code = "SITE_BUILDER_FUNCTION_UNAVAILABLE";
    throw error;
  }
  return (candidate as FunctionInvoker).apply(functionRegistry, args);
}

export const importSocialProfile = (...args: any[]) => invokeSiteBuilderFunction("importSocialProfile", args);
export const searchBusinessImages = (...args: any[]) => invokeSiteBuilderFunction("searchBusinessImages", args);
export const searchLeads = superdevClient.functions.searchLeads;
export const getPublicStore = superdevClient.functions.getPublicStore;
export const buildHotLeadSite = superdevClient.functions.buildHotLeadSite;
export const generateSavedLeadOutreach = superdevClient.functions.generateSavedLeadOutreach;
export const resetLeadFinder = superdevClient.functions.resetLeadFinder;
export const reverifySavedLeads = superdevClient.functions.reverifySavedLeads;
export const syncLeadsFromDataManagement = superdevClient.functions.syncLeadsFromDataManagement;
export const paypalCheckout = superdevClient.functions.paypalCheckout;
export const paypalCapture = superdevClient.functions.paypalCapture;
export const scanWebsiteSeo = superdevClient.functions.scanWebsiteSeo;
```

## `src/integrations/core.ts`

```ts
import { superdevClient } from "../lib/superdev/client";

export const core = superdevClient.integrations.core;
export const uploadFile = superdevClient.integrations.core.uploadFile;
export const invokeLLM = superdevClient.integrations.core.invokeLLM;
export const generateImage = superdevClient.integrations.core.generateImage;
export const editImage = superdevClient.integrations.core.editImage;
export const getUploadedFile = superdevClient.integrations.core.getUploadedFile;
export const sendEmail = superdevClient.integrations.core.sendEmail;
export const extractDataFromUploadedFile =
  superdevClient.integrations.core.extractDataFromUploadedFile;
export const contacts = superdevClient.integrations.core.contacts;
export const events = superdevClient.integrations.core.events;
export const textAgentChat = superdevClient.integrations.core.textAgentChat;
export const createVoiceWebCall =
  superdevClient.integrations.core.createVoiceWebCall;
export const createVoiceOutboundCall =
  superdevClient.integrations.core.createVoiceOutboundCall;
```
