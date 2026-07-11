# Wix Studio + Velo — V1 Blueprint Limitations Audit
## What Cannot (or Cannot Fully) Be Done

---

> [!CAUTION]
> This document is a frank engineering assessment. Every item listed is a **genuine constraint** of the Wix platform. Some have workarounds; many do not. These must be communicated to the client before development begins to avoid re-architecture mid-project.

---

## 🔴 HARD BLOCKERS — Impossible on Wix

These features **cannot be built** on Wix in any meaningful form, regardless of Velo skill level.

---

### 1. SSR Dual-Payload (Crawler vs. Client)
**V1 Requirement:**
> *"`.setStructuredData()` injects the complete, un-truncated article body strictly for SEO/GEO crawlers (Layer A SSR Delivery), while the client-side DOM receives `null` for `premium_content_html`."*

**Why it's impossible:**
Wix is **not a true server-side rendering framework**. It does not allow you to conditionally serve different HTML payloads to Googlebot vs. a logged-in user at the HTTP response level. Wix's `setSEOTags()` API controls meta tags only — it cannot inject full article body text into a server-rendered HTML response for crawlers while simultaneously withholding it from the browser DOM.

**Real consequence:**
Either the full premium article is exposed in the DOM (security hole), or it is hidden from crawlers too (SEO loss). **You cannot have both simultaneously on Wix.**

**Workaround:**
None that is native. Would require migrating to Next.js or a custom headless CMS architecture using Wix Headless (separate product, different pricing, different dev model).

---

### 2. IP-Based Corporate Authentication
**V1 Requirement:**
> *"Corporate & Library IP-Authenticated Licensing ($2,500/year Corporate Tier)"*

**Why it's impossible:**
Wix has no native IP whitelisting or IP-range authentication system. The Velo `wix-users` and `wix-members` APIs authenticate via session tokens only. There is no mechanism to grant access to an entire organization based on their office network's IP address range.

**Workaround:**
None on Wix. Would require a third-party SSO provider (e.g., Okta, Auth0) and a headless architecture.

---

### 3. Academic ID / Credential Verification
**V1 Requirement:**
> *"Education Rates: $60/year — Requires valid academic ID"*

**Why it's impossible:**
Wix has no form validation against external academic credential databases (e.g., SheerID, UNiDAYS, or `.edu` email domain verification logic with backend confirmation). There is no Velo API for identity document verification.

**Workaround:**
Manual review process only — user uploads an ID via a Wix Form submission, and a human grants the Education tier manually via the Members dashboard. This does not scale.

---

### 4. True Multi-User / Org-Level Corporate Accounts
**V1 Requirement:**
> *"Multi-user corporate provisioning tailored for design firms, studios, and agencies."*

**Why it's impossible:**
Wix Members operates on a **strictly individual account model**. There is no concept of a parent "organization" account with child user seats. You cannot:
- Create group/team accounts
- Manage seat allocation (add/remove users to a corporate license)
- Set org-wide access permissions

**Workaround:**
Manually create and manage individual Wix Member accounts for each seat. This is operationally fragile, non-scalable, and has no self-service for the corporate client.

---

### 5. True Off-Canvas Sidebar Drawer
**V1 Requirement:**
> *"An expansive, off-canvas panel that slides in from the right viewport boundary."*

**Why it's impossible (natively):**
Wix Studio has no native off-canvas component. The hamburger menu in Wix is a **full-screen overlay or a top/side panel** — not a true off-canvas drawer that slides over content while keeping the page visible and scrollable underneath.

**Workaround:**
Simulate with a hidden container + CSS `transform: translateX(100%)` toggled via Velo `show()`/`hide()`. **It will work visually** but:
- Requires heavy custom CSS fighting Wix's own style system
- May have scroll-locking issues on mobile
- Wix's z-index management can conflict with fixed header elements

---

### 6. Custom Subdomain Routing Per Node
**V1 Implicit Requirement:**
The architecture implies `academy.classicplanning.org`, `studio.classicplanning.org`, `herald.classicplanning.org` as distinct experiences.

**Why it's impossible:**
Wix allows **one custom domain per site**. You cannot route subdomains to different "sections" of the same Wix site with isolated headers, footers, or navigation. All four nodes (Institute, Academy, Studio, Herald) must share the same global header/footer on the same Wix site instance.

**Workaround:**
Use URL path routing only (`/academy`, `/studio`, `/herald`). Simulate node-specific headers by programmatically hiding/showing header elements via Velo on page load — but this causes a visible flash of incorrect UI (FOUC) before JavaScript executes.

---

## 🟠 MAJOR LIMITATIONS — Possible but Severely Constrained

These features can be built but will be **significantly degraded** from the V1 specification.

---

### 7. The LMS (Student Portal / Virtual Campus)
**V1 Requirement:**
> *"A bespoke Learning Management System... displaying grades, calendars, and syllabus archives dynamically."*

**What Wix can actually do:**
- Create private CMS collections for students/courses ✅
- Build a member-gated page at `/academy/dashboard` ✅
- Display static course materials in a Repeater ✅

**What it cannot do:**
- Native grade calculation or gradebook logic
- Calendar integration (no native Wix calendar widget with event management)
- Video progress tracking (no native `video.currentTime` persistence across sessions)
- SCORM / xAPI content packaging (zero support)
- Assignment submission and file review workflows
- Discussion forums or cohort communication tools
- Email notification triggers on assignment due dates

**Real consequence:**
The "LMS" on Wix will be a **gated resource library** at best — not a true LMS. A real LMS would require Teachable, Thinkific, or a custom Next.js build.

---

### 8. Global CSS & Custom Class Architecture
**V1 Requirement:**
> *"Developers must map the provided source HTML structure to Wix Repeaters and custom CSS classes within `global.css`."*
> Classes like `.summary-item`, `.summary-item__hed`, `.summary-item__rubric`, `.CarouselContainer`, `.MultiPackageContainer`, etc.

**Wix Studio reality:**
- Wix Studio does allow custom CSS via the **Custom CSS panel** ✅
- You CAN write `.summary-item__hed { font-family: ... }` ✅

**Limitations:**
- Wix **scopes CSS to the current page** — true global utility classes across all pages are unreliable
- Wix generates its own class names internally; **you cannot override Wix's internal component classes** (e.g., you cannot directly style a Repeater's internal DOM)
- `display: grid` with `grid-template-columns: repeat(4, 1fr)` on a Wix Repeater **may conflict** with Wix's own layout engine; the Repeater has its own grid system
- `scroll-snap-type: x mandatory` on horizontal Repeaters — works in Chrome/Safari but Wix wraps Repeaters in additional `div` layers that can break snap behavior
- `aspect-ratio` CSS property — supported in modern browsers but Wix's image components use their own `width/height` attribute system that can override CSS aspect-ratio

---

### 9. `backdrop-filter: blur()` on the Paywall Overlay
**V1 Requirement:**
> *"`backdrop-filter: blur(8px)` applied to `.paywall-fade-overlay`"*

**Wix Studio reality:**
- Custom CSS with `backdrop-filter` is writable ✅
- Works in Chrome and Safari ✅

**Limitations:**
- Wix renders its content inside nested `iframe`-like shadow DOM layers in some configurations — `backdrop-filter` **does not pierce shadow DOM** and may render as transparent/invisible
- Firefox had limited support historically
- Wix's z-index stacking context often breaks `backdrop-filter` — the filter applies to elements *behind* the element in the same stacking context, but Wix's fixed headers create a new stacking context that can interfere
- **Not testable until deployed** — Wix Preview mode does not perfectly replicate live site rendering

---

### 10. Context-Aware Dual-Scope Search Modal
**V1 Requirement:**
> *"If triggered while on `/herald/*` URL path, default scope to 'Herald Archive'. Otherwise, default to 'Entire Institute'."*

**What Wix can do:**
- `wixLocation.url` gives you the current URL ✅
- Multi-collection `wixData.query()` calls are possible ✅

**Limitations:**
- Wix has **no native search modal component** — must be built from scratch with a lightbox
- Federated search across multiple CMS collections requires **multiple sequential async queries** — no single API call for multi-collection search
- Performance degrades significantly with 4+ collections: each `.find()` is a separate network call — expect 800ms–2s latency on global scope search
- No native autocomplete/typeahead — must be custom-built with debounced Velo queries, adding complexity

---

### 11. Wix Repeater Performance at Scale
**V1 Requirement:**
> *"Zero-Dataset pure Velo mandate... `.limit(12)`... skeleton grid during load."*

**Wix Repeater reality:**
- Programmatic data binding via `$w('#repeater').data = items` works ✅
- `.limit(12)` with pagination works ✅

**Limitations:**
- Wix Repeaters **re-render the entire DOM** when `.data` is reassigned — the "append on Load More" pattern (V1's `currentData.concat(results.items)`) causes a **full repeater re-render**, not a true DOM append. This means every "Load More" click causes a visible flash/re-render of all existing cards
- Maximum practical Repeater data size is **~100 items** before noticeable lag
- Skeleton CSS grid must be a **separate static element** shown/hidden — Wix has no native skeleton component
- Velo `wix-data` queries from the frontend are **subject to rate limiting** (Wix enforces query quotas per site per minute)

---

### 12. `wixPricingPlans.startPlanPurchase()` + Wix Pay Mixing
**V1 Requirement:**
- Recurring subscriptions via Wix Pricing Plans
- One-time book purchase via Wix Pay / Wix Stores
- Single Issue (one-time) + Annual subscription tiers coexisting

**Limitations:**
- **Wix Pricing Plans** handles recurring subscriptions ✅
- **Wix Stores** handles one-time product purchases ✅
- **These are two separate systems** — you cannot mix them in a single checkout flow
- A user buying a "Single Issue (Digital)" at $40 cannot be automatically granted article access via the same permissions system as a recurring subscriber without manual Velo bridging logic
- `wixPricingPlans` and `wixStores` use **different member benefit/access APIs** — syncing entitlements between them requires custom backend logic that Wix does not natively support
- **Print + Shipping** ($65 physical issue, $500 Print Collector): Wix Stores can handle physical product shipping but has no **print-on-demand** integration. Shipping carrier rate calculation is basic (flat rate or manual) — no UPS/FedEx dynamic rate API

---

### 13. State-Aware Header (LMS Isolation)
**V1 Requirement:**
> *"When a student authenticates via the Student Portal, the standard corporate top bar must collapse or be replaced by a dedicated Virtual Campus Header."*

**Wix limitations:**
- Wix has **one global header** per site — it cannot be programmatically replaced with a different component per page without a visible flash (FOUC) as Velo executes post-render
- Collapsing/hiding header sections via `$w('#header').hide()` works but the original header renders first for ~200–500ms before Velo can hide it
- The "Virtual Campus Header" would need to be a **second hidden container** inside the same header element — always loaded, toggled via Velo. This inflates page payload and initial render time for all users

---

### 14. 3D Book Cover Mockup
**V1 Requirement:**
> *"Must feature a 3D book cover mockup..."*

**Wix limitation:**
There is no native 3D CSS perspective or Three.js integration in Wix Studio. A "3D mockup" would be a **static pre-rendered image** of the book in a 3D perspective (generated externally via Photoshop/Canva) placed in an Image element. No interactive rotation or real-time 3D rendering is possible.

---

### 15. OAuth Social Login (Google / Apple) UI Customization
**V1 Requirement:**
> *"Two full-width buttons with borders: 'Continue with Google' (featuring the Google logo) and 'Continue with Apple'."*

**Wix limitation:**
- Wix has **native Google and Apple login** built into its Members system ✅
- However, the **UI of these buttons is controlled entirely by Wix** — you cannot replace them with fully custom-styled HTML buttons that trigger the Wix OAuth flow
- The exact pixel-perfect NYT-style full-width button design from V1 cannot be achieved; the buttons will look like Wix's standard social login buttons
- Custom button → `wixUsers.promptLogin()` triggers the **entire Wix login modal**, not just the OAuth flow — you lose control of the modal UI entirely

---

## 🟡 MINOR LIMITATIONS — Works but with Caveats

### 16. Horizontal Carousel CSS (`scroll-snap-type`)
Works in Wix Studio custom CSS on most browsers, but:
- Wix wraps Repeaters in extra `div` containers that may require targeting `nth-child` selectors — not guaranteed to be stable across Wix version updates
- Hiding scrollbars via `scrollbar-width: none` works on Firefox/Chrome but Wix's own overflow handling may conflict on Safari iOS

### 17. `clamp()` Typography
Supported in modern browsers and Wix's custom CSS ✅ — but Wix's **Text components have their own font size settings** that may override CSS `font-size: clamp(...)` unless the text element is set to "Custom Size" in the editor.

### 18. Sticky Right Rail
`position: sticky` in Wix Studio works ✅ but Wix's page layout uses absolute positioning internally — sticky elements inside Wix containers may not stick correctly if parent containers have `overflow: hidden` set (which Wix often applies automatically).

### 19. Wix CMS Bulk Import
V1 requires bulk migration of articles from an Excel matrix. Wix's CSV import tool:
- Supports flat CSV import ✅
- Does NOT support relational data — you cannot import `issue_ref` references in bulk; each reference must be set manually or via a custom Velo import script using `wixData.insertReference()`
- Rich Content (`hook_100_words`, `premium_content_html`) **cannot be imported via CSV** — Rich Content fields must be populated manually through the CMS editor or via the Velo `wixData` API using the Ricos JSON format

### 20. `wix-data` Query Rate Limits
Wix enforces undocumented but real rate limits on `wixData.query()` calls:
- High-traffic pages with complex taxonomy filtering can hit throttle limits
- No native query result caching at the Wix infrastructure level (V1's client-side caching mitigates this but only within a single session)

---

## Summary Traffic-Light Table

| V1 Feature | Status | Notes |
|---|---|---|
| SSR dual-payload (crawler vs client) | 🔴 Impossible | No true SSR on Wix |
| IP-based corporate auth | 🔴 Impossible | No IP auth in Wix |
| Academic ID verification | 🔴 Impossible | No credential DB integration |
| Multi-user org accounts (corporate) | 🔴 Impossible | Individual accounts only |
| True off-canvas drawer | 🔴 Not native | Simulation only; FOUC risk |
| Subdomain routing per node | 🔴 Impossible | One domain per Wix site |
| Full LMS (grades, calendar, SCORM) | 🟠 Severely limited | Resource library only |
| Global CSS utility classes | 🟠 Partially | Page-scoped; conflicts with Wix engine |
| `backdrop-filter: blur()` | 🟠 Unreliable | Shadow DOM / stacking context issues |
| Federated multi-collection search | 🟠 Possible but slow | Sequential queries; 800ms–2s latency |
| Repeater "Load More" append | 🟠 Full re-render | No true DOM append; flash on click |
| Pricing Plans + Wix Stores mixing | 🟠 Separate systems | Manual entitlement bridging needed |
| Print/shipping logistics | 🟠 Basic only | No print-on-demand or dynamic carrier rates |
| LMS isolated header (no FOUC) | 🟠 FOUC guaranteed | Header renders before Velo executes |
| 3D book mockup | 🟠 Static image only | No real 3D rendering |
| OAuth button custom UI | 🟠 Wix-controlled | Cannot fully replicate NYT button spec |
| `scroll-snap-type` carousel | 🟡 Usually works | May break across Wix updates |
| `clamp()` typography | 🟡 Usually works | May be overridden by Wix text settings |
| Sticky right rail | 🟡 Possible | Parent `overflow:hidden` may break it |
| Bulk CMS import (relational) | 🟡 Flat data only | References must be set manually |
| `wix-data` rate limits | 🟡 Monitor needed | Can throttle on high-traffic pages |

---

## Architectural Recommendation

> [!WARNING]
> If the following V1 features are **non-negotiable** for launch, Wix is the wrong platform:
> - SSR dual-payload for SEO + security
> - IP-based corporate authentication
> - True multi-user organizational accounts
> - A functional LMS (not just a resource library)
> - Academic credential verification
>
> **These require a headless architecture** — e.g., Wix Headless + Next.js frontend, or a full custom stack (Next.js + Sanity CMS + Stripe + Auth0).

> [!TIP]
> **If Wix Studio is a firm constraint**, the following V1 features should be **descoped or re-specified** before development begins:
> 1. Replace SSR dual-payload with backend-only `null` stripping (accept the SEO tradeoff)
> 2. Replace IP corporate auth with manual seat provisioning by admin
> 3. Replace academic ID verification with honor-system email domain check (`.edu`)
> 4. Replace LMS spec with "gated resource library" language
> 5. Accept that the off-canvas drawer will have minor FOUC and simulate with show/hide
> 6. Accept that `hook_100_words` preview content will always be in the DOM (just visually blurred) — backend `null` stripping only applies to `premium_content_html`
