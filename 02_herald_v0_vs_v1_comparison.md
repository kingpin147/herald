# The Herald — V0 vs V1 Comparison
## Herald-Specific Differences Only

---

> [!IMPORTANT]
> This document isolates **only The Herald node** across both blueprints. V1's new arms (Academy, Studio, Institute) are excluded — this is purely about what changed *inside* The Herald itself between versions.

---

## 1. Herald Navigation & Entry Point

| Feature | V0 Herald | V1 Herald |
|---|---|---|
| **Primary Menu Label** | "The Herald" (master link → Primary Feed) | "The Herald" (one of 4 sovereign center nodes) |
| **Sub-Menu Items** | Categories + The Issue Archive | Primary Feed + Issue Archive + **The Curated Canon** (new) |
| **Dropdown Trigger** | Hover state | Hover or click |
| **Category Routing** | `/herald/urbanism`, `/herald/neuroscience`, etc. | Routes via query param: `/herald?tag=Tectonics` (no URL path per category) |
| **Tag Discovery Location** | Sub-menu dropdown | **Moved to Off-Canvas Drawer** — complete taxonomy lives in the hamburger `☰` menu |

> [!NOTE]
> **New in V1**: "The Curated Canon" appears as a third Herald sub-menu item — a dedicated view of seminal architectural collections. Not present in V0.

---

## 2. Herald Taxonomy — Tag System

### V0 Tags (28 raw descriptors, flat list)
```
Architecture, Urbanism, Landscape Architecture, Building Materials & Construction,
History of Architecture, History of Urbanism, Theory & Principles, Philosophy & Aesthetics,
Criticism, Neuroscience & Cognitive Science, Ecology & Environment, Economy & Finance,
Sociology & Community, Technology & Digital Tools, Education & Pedagogy,
Advocacy, Planning Policy & Regulation, Housing, Heritage & Conservation,
Real Estate & Development, North America, Europe, Latin America, Global South,
Middle East, Asia, Interview, Essay, Project Feature, Book Review, Travel & Place
```

### V1 Tags (Condensed into 3 branded tiers)

**I. Disciplinary Core** *(7 nodes — consolidates V0's 20+ academic tags)*
| V0 Raw Term | V1 Branded Node |
|---|---|
| Architecture | **Architecture** |
| Urbanism | **Urbanism** |
| Landscape Architecture | **Landscape** |
| Building Materials & Construction | **Tectonics** |
| History of Architecture / Theory / Philosophy / Criticism | **Historiography** |
| Neuroscience / Ecology / Technology / Economy / Sociology | **Integrated Studies** |
| Advocacy / Policy / Housing / Heritage / Real Estate | **Praxis** |

**II. Editorial Life** *(5 curated brand identities — new in V1)*
| V1 Tag | V0 Equivalent | Difference |
|---|---|---|
| Design Archetypes | *(none)* | New — visual motifs & spatial logic |
| Private Collections | *(none)* | New — patronage & historic estates |
| **The Grand Tour** | "Travel & Place" | Rebranded with editorial identity |
| **The Canon** | "Project Feature" / partial | Rebranded — canonical masterpieces only |
| **The Chronicle** | "Interview / Essay" / partial | Rebranded — industry dispatches |

**III. Geographic Regions** *(5 consolidated)*
| V0 | V1 | Change |
|---|---|---|
| North America | North America | Same |
| Europe | Europe | Same |
| Latin America | Latin America | Same |
| Global South | *(removed)* | **Deleted** — absorbed into below |
| Middle East | **Middle East & Africa** | Expanded |
| Asia | **Asia-Pacific** | Expanded |

> [!WARNING]
> V0's "Global South" tag is **eliminated** in V1. Any articles tagged "Global South" must be re-tagged to "Middle East & Africa" or "Asia-Pacific" during migration.

---

## 3. Herald Archive Page Architecture

### V0 Archive Page
- Clean **minimalist grid** (3–4 columns) of magazine covers only
- Clicking cover → modal or dynamic page with "Download Full Issue" CTA
- No further structural specification

### V1 Archive Page (Major Expansion)
A full multi-section hub page with 6 distinct structural blocks:

```
┌─────────────────────────────────────────────────────────────┐
│  HERO BANNER                                                │
│  "Become a member to receive access to the Herald           │
│   Archive — plus, get unlimited digital access to           │
│   classicplanning.org!"                                     │
├─────────────────────────────────────────────────────────────┤
│  LATEST ISSUES BLOCK (horizontal scroll carousel)           │
│  → Most recent magazine covers                              │
├─────────────────────────────────────────────────────────────┤
│  "EXPLORE PAST ISSUES" / CPI's Top Picks                    │
│  → Dynamic repeater of high-value editorial content         │
├─────────────────────────────────────────────────────────────┤
│  CATEGORIZED EXPLORATION ROWS                               │
│  → Featured Disciplines (Architecture, Urbanism, etc.)      │
│  → Featured Architects & Planners                           │
├─────────────────────────────────────────────────────────────┤
│  SEARCH                                                     │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Article Feed Layout

### V0 — Single Column / Grid
```
┌──────────────────────────────────────────────────────┐
│  [Tag Filter Bar]  [Search Input] [Search Button]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│   Article Card Grid (masonry or structured grid)     │
│   Full-width, no side columns                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### V1 — Three-Column Editorial Layout
```
┌─────────────┬──────────────────────────────┬──────────────┐
│  LEFT RAIL  │      CENTER FEED             │  RIGHT RAIL  │
│   ~20%      │          ~55%                │    ~25%      │
│             │                              │              │
│  Taxonomy   │  [View Articles] [Issues]    │  Editor's    │
│  Tree /     │  ─────────────────────────  │  Desk        │
│  Accordion  │  Article cards (vertical     │  (trending)  │
│             │  stream, 12 per load)        │              │
│  Category   │                              │  Book        │
│  Filter     │  ─────────────────────────  │  Widget      │
│  Nodes      │  [Load More] button          │  (buy $85)   │
│             │                              │              │
│             │                              │  Sticky      │
│             │                              │  Paywall     │
│             │                              │  Banner      │
└─────────────┴──────────────────────────────┴──────────────┘
```

---

## 5. Article Feed Toggle (New in V1)

V0 has **no toggle** — only one view exists (article grid).

V1 introduces a **Segmented View Toggle** at the top of the center column:

```
[ View Latest Articles ] | [ Explore Issue Archive ]
```

- **Mode A (Default)**: Continuous vertical stream of articles by `published_date DESC`
- **Mode B**: Rebinds repeater to `CPA_Herald_Issues` collection → 2-column masonry grid of magazine covers

Client-side JSON caching prevents redundant DB queries when toggling between modes.

---

## 6. CMS Schema — Breaking Changes

### V0 Schema (CPA_Herald_Articles — flat)
```
cover_image          Image
title                Text
author_name          Text
category_tags        Array of Strings
is_premium           Boolean
hook_300_words       Rich Content   ← PUBLIC PREVIEW
premium_content_html Rich Content   ← GATED CONTENT
published_date       Date
```

### V1 Schema (Relational — Two Collections)

**CPA_Herald_Issues (Parent — NEW collection)**
```
issue_number       Number (Indexed)
cover_image        Image (High-Res)
theme_title        Text
print_edition_pdf  Document URL   ← Level 3+ gated
published_date     Date
slug               Text
```

**CPA_Herald_Articles (Child — modified)**
```
issue_ref            $Reference → CPA_Herald_Issues  ← NEW field
cover_image          Image
title                Text
author_name          Text
category_tags        Array of Strings
is_premium           Boolean
hook_100_words       Rich Content   ← RENAMED from hook_300_words
premium_content_html Rich Content
published_date       Date
slug                 Text
```

> [!CAUTION]
> **Two breaking changes in one migration:**
> 1. `hook_300_words` **renamed** to `hook_100_words` — all Velo bindings must be updated
> 2. `CPA_Herald_Issues` collection must be **created from scratch** and articles linked via `issue_ref`

---

## 7. Hook / Preview — Word Count

| | V0 | V1 |
|---|---|---|
| **Field Name** | `hook_300_words` | `hook_100_words` |
| **Word Count** | 300 words | **100 words** |
| **Blur Overlay Overlap** | `margin-top: -60px` | No negative margin — `position: absolute; bottom: 0` |
| **Blur Height** | `120px` | `150px` |
| **Blur Intensity** | `backdrop-filter: blur(10px)` | `backdrop-filter: blur(8px)` |
| **Opacity Fade Stop** | 70% | 80% (more content visible before fade) |

---

## 8. Article Card DOM Anatomy

### V0 Card (Loosely Specified)
- `cover_image`
- `title`
- `author_name`
- Taxonomy tags
- Lock icon or "Subscriber Exclusive" badge if `is_premium`

### V1 Card (Fully Specified DOM Structure)
```html
<div class="summary-item">

  <!-- MEDIA WRAPPER -->
  <div class="summary-item__asset-container">
    <!-- aspect-ratio: 16/9 or 3/4 enforced via CSS -->
    <img style="object-fit: cover; width: 100%; height: 100%;" />
    <!-- Premium badge: top-right corner overlay -->
    <span id="badgeSubscriberExclusive">SUBSCRIBER EXCLUSIVE</span>
  </div>

  <!-- TEXT WRAPPER -->
  <div class="summary-item__content">
    <span class="summary-item__rubric">ARCHITECTURE</span>  <!-- uppercase, 11px, letter-spacing: 0.1em -->
    <h3 class="summary-item__hed">Article Title Here</h3>   <!-- Serif font, clamp() sizing -->
    <p class="summary-item__dek">Short description text</p> <!-- Sans-serif, 14px -->
    <span class="summary-item__byline">Author Name</span>
    <!-- First 2–3 sentences of hook_100_words rendered below title -->
  </div>

</div>
```

> [!NOTE]
> V1 mandates **Crimson Text** (or Adobe Garamond equivalent) for `__hed` headlines and sans-serif for `__dek`. Typography spec absent entirely in V0.

---

## 9. Search & Filtering

| Feature | V0 | V1 |
|---|---|---|
| **Filter UI** | "Selection Tags" element (Wix native) above repeater | Left-rail taxonomy accordion + dedicated search modal |
| **Filter Method** | `.hasSome("category_tags", selectedTag)` | Same — but executed inside `loadArticleFeed()` function |
| **Search Input** | Plain text input + Search button on page | Context-aware modal (auto-scopes to Herald when on `/herald/*`) |
| **Search Fields** | `title`, `author_name` | `title`, `author_name`, `category_tags`, `hook_100_words` |
| **Page Reload on Filter** | No (dynamic) | No (dynamic) — with skeleton loading transition |
| **Tag Routing** | Sub-menu link → URL path per category | Query param: `/herald?tag=Tectonics` |

---

## 10. Velo Engineering Rules (Herald Pages)

| Rule | V0 | V1 |
|---|---|---|
| **Data Binding** | Visual Wix Datasets permitted | **Strictly banned** — pure `wix-data` API only |
| **Pagination** | Not specified | `.limit(12)` — hard enforced on every query |
| **Loading State** | Not specified | CSS Skeleton Grid — native Wix spinner **banned** |
| **Fade Transition** | Not specified | Opacity 0.3 (150ms out) → skeleton → opacity 1.0 (200ms in) |
| **Client Cache** | Not specified | Active JSON payload cached in memory during feed toggle |
| **Boilerplate** | Not provided | Full production file provided: `/pages/herald-archive.js` |
| **"Load More"** | Not specified | `#btnLoadMore` with label states ("Explore More Treatises" / "Loading Canonical Archive...") |

### V1 Velo File: `/pages/herald-archive.js` (structure)
```javascript
// State variables
let currentPage = 0;
let activeTag = null;
let isFetching = false;

$w.onReady(async () => {
    setupRepeaterItemReady();    // Bind DOM elements
    await loadArticleFeed(true); // Initial hydration
    // Taxonomy accordion listeners
    // Load More pagination
});

async function loadArticleFeed(resetData) {
    // Fade out → show skeleton
    // wixData.query("CPA_Herald_Articles")
    //   .descending("published_date")
    //   .limit(12).skip(page * 12)
    //   .hasSome("category_tags", [activeTag])  ← if tag active
    // Append or replace repeater data
    // Hide skeleton → fade in
}

function setupRepeaterItemReady() {
    // Bind: title, author_name, hook_100_words,
    //       cover_image, category_tags[0], is_premium badge
    // Routing: onClick → /herald/article/{slug}
}
```

---

## 11. Issue Page — Dual-Interaction Model (New in V1)

V0 specifies: click cover → modal or dynamic page → "Download Full Issue" CTA.

V1 expands the Issue Page into **two distinct user paths**:

```
Issue Page (e.g., "9th Edition")
├── Path A: [ Download Full Issue ] ← Level 3+ subscribers only
│           (print_edition_pdf payload — backend stripped if unauthorized)
│
└── Path B: Article Breakdown Grid
            └── Every article in the issue displayed as cards
                ├── cover_image
                ├── brief description
                └── taxonomy tags (clickable filters)
```

Additionally, V1 introduces a separate **`/herald/articles`** page — a continuous masonry feed of *all* individual articles across *all* issues, with an "Explore the Archive" banner routing back to the issue view.

---

## 12. Paywall CSS — Side-by-Side

```css
/* ── V0 ──────────────────────────────────────────── */
.paywall-fade-overlay {
    position: relative;
    margin-top: -60px;
    height: 120px;
    background: linear-gradient(
        180deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.95) 70%,    /* fades earlier */
        rgba(255,255,255,1) 100%
    );
    backdrop-filter: blur(10px);       /* stronger blur */
    -webkit-backdrop-filter: blur(10px);
    pointer-events: none;
    z-index: 10;
}

/* ── V1 ──────────────────────────────────────────── */
.paywall-fade-overlay {
    position: absolute;                /* anchored precisely */
    bottom: 0;
    left: 0;
    width: 100%;
    height: 150px;                     /* taller zone */
    background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(255,255,255,0.95) 80%,    /* more content visible */
        rgba(255,255,255,1) 100%
    );
    backdrop-filter: blur(8px);        /* softer blur */
    -webkit-backdrop-filter: blur(8px);
    z-index: 10;
}
```

---

## 13. Subscription CTA (Herald Context)

| Feature | V0 | V1 |
|---|---|---|
| **CTA Location** | Nested over blur overlay | Right rail sticky banner + `/subscribe` page |
| **CTA Route** | `wixPricingPlans.startPlanPurchase()` modal | Deep-link to `/subscribe` landing page |
| **Right Rail Banner** | Not present | Sticky — scrolls with user; highlights $150/year or $40 single issue |
| **Book Widget** | Not present | Right rail: 3D cover mockup + `[ Buy Direct - $85 ]` → Wix Pay |
| **State-Aware CTA** | Always shows Subscribe | Transforms to `[My Account]` / `[Archive Access]` for authenticated subscribers |

---

## 14. SEO / GEO Layer (New in V1)

V0 has no SEO-specific directive for the Herald article page.

V1 adds:
> *"Developers must ensure that `.setStructuredData()` injects the complete, un-truncated article body strictly for SEO/GEO crawlers (Layer A SSR Delivery), while the client-side DOM receives `null` for `premium_content_html` unless authenticated."*

This means the backend must serve **two different payloads**:
- **SSR / Crawler**: Full article body for indexing
- **Client DOM**: `null` for `premium_content_html` unless subscription verified

---

## 15. Responsive / Mobile (Herald Pages)

| Feature | V0 | V1 |
|---|---|---|
| **Mobile Spec** | Not mentioned | Breakpoint `< 768px`: horizontal layouts **forbidden** |
| **Card Reflow** | Not specified | Image top → Title/Hook bottom (stacked vertical) |
| **3-Column Layout** | N/A (single column V0) | Collapses to center feed at `100% viewport` (`minmax(0px, 1fr)`) |

---

## Developer Migration Checklist: V0 Herald → V1 Herald

| Priority | Task |
|---|---|
| 🔴 | Rename DB field `hook_300_words` → `hook_100_words`; migrate all content to 100-word limit |
| 🔴 | Create `CPA_Herald_Issues` collection and add `issue_ref` reference field to `CPA_Herald_Articles` |
| 🔴 | Remove all visual Wix Dataset bindings from Herald pages; rebuild with pure `wix-data` Velo |
| 🔴 | Re-tag articles: remove "Global South" → redistribute to "Middle East & Africa" / "Asia-Pacific" |
| 🟠 | Build 3-column layout (left taxonomy rail + center feed + right rail) |
| 🟠 | Implement segmented view toggle (Articles ↔ Issues) with client-side caching |
| 🟠 | Build full Herald Archive hub page (hero + carousels + categorized rows) |
| 🟠 | Build Issue Page dual-path (Download CTA + Article Breakdown grid) |
| 🟠 | Update taxonomy tags to V1 branded nodes (Tectonics, Historiography, Integrated Studies, Praxis, etc.) |
| 🟡 | Implement CSS skeleton loading grid; remove all Wix native spinners |
| 🟡 | Add `.limit(12)` + Load More pagination to all feed queries |
| 🟡 | Update paywall CSS: height `120px` → `150px`, blur `10px` → `8px`, repositioning to `absolute` |
| 🟡 | Add right-rail sticky subscription banner + book e-commerce widget |
| 🟡 | Implement state-aware CTA: Subscribe → My Account for logged-in subscribers |
| 🟡 | Add SSR dual-payload: full body for crawlers, `null` for unauthorized client DOM |
| 🟡 | Apply full article card DOM spec (rubric, hed, dek, byline classes + typography) |
| 🟡 | Add "The Curated Canon" as third Herald sub-menu item |
