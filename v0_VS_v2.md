# V0 vs V1 — Technical Blueprint Comparison

## The Herald Digital Ecosystem → The Classic Planning Institute Digital Ecosystem

---

> [!IMPORTANT]
> **Core Philosophical Shift**: V0 is a **standalone publication platform** (The Herald only). V1 is a **Corporate Umbrella Ecosystem** housing four sovereign operational arms: The Institute, The Academy, The Studio, and The Herald — each as a distinct, independently architected node.

---

## 1. Scope & Information Architecture

| Dimension | V0 (Herald Only) | V1 (CPI Umbrella) |
|---|---|---|
| **Platform Identity** | Single-publication digital magazine | Multi-arm institutional holding platform |
| **Navigation Model** | Single primary node: "The Herald" with sub-dropdown | Four sovereign center nodes: The Institute, The Academy, The Studio, The Herald |
| **Header Zones** | Unspecified layout — just a persistent Log In/Subscribe CTA | Strict 3-zone anatomy: Identity (left) / Sovereign Nodes (center) / Utility Layer (right) |
| **Homepage** | Primary Feed = article-led masonry homepage | Corporate umbrella homepage (`/`) distinct from editorial feed |
| **Off-Canvas Menu** | Not specified | Full Executive Sitemap Drawer (hamburger `☰`) — slides from right, houses complete taxonomy + account management |
| **Design Aesthetic** | Editorial/publication-first | "Quiet Luxury" — strict white space, zero visual noise |

---

## 2. Navigation Structure

### V0 — Simple Herald Menu

```
The Herald (primary link → feed)
  └── Categories (dynamic routing links)
  └── The Issue Archive (PDF download landing)
[Log In / Subscribe] — persistent header CTA
```

### V1 — Enterprise Sub-Navigation Matrix

```
The Institute    → About Us / The Monograph / Membership / Endowment / Institutional Inquiry
The Academy      → Academic Programs / Admissions / Research Infrastructure / Student Portal (LMS)
The Studio       → Practice Areas / Selected Works / Commission an Inquiry
The Herald       → Primary Feed / Issue Archive / The Curated Canon
[🔍 Search] | [Log In] | [Subscribe] | [☰ Menu]
```

> [!NOTE]
> V1 explicitly **bans nested duplicate headings** (e.g., repeating "The Academy" inside the Academy dropdown) — a UX anti-pattern not addressed in V0.

---

## 3. Search Architecture

| Feature | V0 | V1 |
|---|---|---|
| **Search Type** | Simple free-text input + button above repeater | Context-Aware **Dual-Scope Search Modal** |
| **Scope Logic** | Single collection query only | Auto-detects URL context: `/herald/*` → searches Herald only; other pages → global federated search |
| **Query Fields** | `title`, `author_name` via `.contains()` | Herald scope: `title`, `author_name`, `category_tags`, `hook_100_words`; Global scope: multi-collection CMS |
| **UI** | Plain text input + Search button | Modal with scope dropdown `[v Scope]` |

---

## 4. The Herald Architecture (Internal Differences)

### 4.1 Archive Landing Page

| Feature | V0 | V1 |
|---|---|---|
| **Structure** | Clean minimalist grid of magazine covers (3–4 columns) | Complex multi-block hub: Hero Banner + Latest Issues carousel + "EXPLORE PAST ISSUES" block + Categorized Exploration Rows |
| **Hero Copy** | Not specified | Defined verbatim: *"Become a member to receive access to the Herald Archive…"* |
| **Carousels** | Not specified | Horizontal scroll carousels for Latest Issues + Featured Videos (CSS: `overflow-x: auto; scroll-snap-type: x mandatory`) |
| **Right Rail** | Not specified | Full right-rail (25% width): "Editor's Desk" trending widget + Book e-commerce widget + Sticky paywall banner |

### 4.2 Article Feed Layout

| Feature | V0 | V1 |
|---|---|---|
| **Layout** | Masonry or structured grid | Three-column layout: Left taxonomy tree (20%) + Center feed (55%) + Right rail (25%) |
| **Toggle** | Not specified | Segmented toggle: `[ View Latest Articles ]` / `[ Explore Issue Archive ]` |
| **Article Card DOM** | `cover_image`, `title`, `author_name`, taxonomy tags | Full structured anatomy: `.summary-item__rubric` (category) / `.summary-item__hed` (H3 serif) / `.summary-item__dek` (description) / `.summary-item__byline` |
| **Card Aspect Ratio** | Not specified | Strict 16:9 or 3:4 via `aspect-ratio` + `object-fit: cover` |

### 4.3 Hook Word Count

| Feature | V0 | V1 |
|---|---|---|
| **Preview Field Name** | `hook_300_words` | `hook_100_words` (field renamed; 300-word spec **deprecated**) |
| **Preview Length** | 300 words | 100 words |

> [!WARNING]
> **Breaking Schema Change**: V0's `hook_300_words` field is **deprecated** in V1. All public preview copy must be migrated to `hook_100_words`. This affects the CMS collection schema and all Velo bindings.

---

## 5. Data Architecture & CMS Collections

### V0 — Single Collection

| Collection | Fields |
|---|---|
| `CPA_Herald_Articles` | `cover_image`, `title`, `author_name`, `category_tags`, `is_premium`, `hook_300_words`, `premium_content_html` |

### V1 — Relational Parent-Child Model

| Collection | Role | Key Fields |
|---|---|---|
| `CPA_Herald_Issues` (Parent) | Magazine edition as curated collection | `issue_number`, `cover_image`, `theme_title`, `print_edition_pdf`, `published_date` |
| `CPA_Herald_Articles` (Child) | Individual treatises within an issue | `issue_ref` (→ Issues), `hook_100_words`, `premium_content_html`, `category_tags`, `is_premium` |

> [!IMPORTANT]
> V1 introduces a **formal relational data model** with a `$Reference` link (`issue_ref`) between Articles and Issues. V0 treats articles as a flat, unrelated collection with no issue-level grouping.

---

## 6. Velo Engineering Mandates

| Mandate | V0 | V1 |
|---|---|---|
| **Dataset Usage** | Uses Wix visual Datasets implicitly | **Zero-Dataset Mandate** — all binding via pure Velo `wix-data` API; visual datasets **strictly prohibited** |
| **Pagination** | Not specified | Hard limit: `.limit(12)` on all initial queries |
| **Loading UI** | Not specified | **No native Wix spinners** — mandatory CSS Skeleton Grid injection during data fetch |
| **Loading Transition** | Not specified | Fade out at 0.3 opacity (150ms) → skeleton → fade in at 1.0 (200ms) |
| **Client Caching** | Not specified | JSON payload cached client-side to prevent redundant DB trips on feed toggle |
| **Boilerplate Code** | Not provided | Full production boilerplate provided: `/pages/herald-archive.js` with `loadArticleFeed()`, `setupRepeaterItemReady()`, pagination, tag filtering |

---

## 7. Taxonomy & Filtering

### V0 Tag Categories (Flat List)

Architecture, Urbanism, Landscape Architecture, Building Materials & Construction, History of Architecture, History of Urbanism, Theory & Principles, Philosophy & Aesthetics, Criticism, Neuroscience & Cognitive Science, Ecology & Environment, Economy & Finance, Sociology & Community, Technology & Digital Tools, Education & Pedagogy, Advocacy, Planning Policy & Regulation, Housing, Heritage & Conservation, Real Estate & Development, North America, Europe, Latin America, Global South, Middle East, Asia, Interview, Essay, Project Feature, Book Review, Travel & Place

### V1 Tag Taxonomy (Consolidated & Branded)

**I. Disciplinary Core** (condensed into 7 branded nodes):
`Architecture` | `Urbanism` | `Landscape` | `Tectonics` | `Historiography` | `Integrated Studies` | `Praxis`

**II. Editorial Life** (curated brand collections):
`Design Archetypes` | `Private Collections` | `The Grand Tour` | `The Canon` | `The Chronicle`

**III. Geographic Regions** (renamed/consolidated):
`North America` | `Europe` | `Latin America` | `Asia-Pacific` | `Middle East & Africa`

> [!NOTE]
> V1 **eliminates "Global South"** as a standalone tag and merges it into `Middle East & Africa` and `Asia-Pacific`. V1 also **renames raw descriptors** into branded editorial identities (e.g., "Travel & Place" → "The Grand Tour"; "Iconic Architecture" → "The Canon").

---

## 8. Paywall Architecture

| Layer | V0 | V1 |
|---|---|---|
| **Blur Overlay Height** | `height: 120px; margin-top: -60px` | `height: 150px` (taller fade zone) |
| **Blur Opacity Stop** | `rgba(255,255,255,0.95) 70%` | `rgba(255,255,255,0.95) 80%` (later fade = more content visible) |
| **CSS Assignment** | `.paywall-fade-overlay` with `backdrop-filter: blur(10px)` | Same class; blur reduced to `blur(8px)` |
| **Overlay Position** | `position: relative` | `position: absolute; bottom: 0; left: 0; width: 100%` — **more precise DOM anchoring** |
| **Subscription CTA Route** | Links to pricing plans modal | Routes to dedicated `/subscribe` landing page |
| **Backend Gateway** | `backend/herald.jsw` — strips `premium_content_html` to `null` | Same — plus explicit SSR/GEO injection note: `setStructuredData()` feeds SEO crawlers full content while client DOM receives `null` |
| **Free Reg Wall Copy** | "Read this article for free." / "Log in to continue." | Same |

---

## 9. New Nodes Introduced in V1 (Not in V0)

### 9.1 The Academy (LMS)

- Bespoke Learning Management System via Wix Velo
- Private CMS collections for students, courses, grades
- Secure student dashboard at `/academy/dashboard`
- **LMS Isolation**: When students authenticate, the standard top bar **programmatically collapses** and is replaced by a Virtual Campus Header (grades, calendar, syllabus)
- Not present in V0 at all

### 9.2 The Studio (Portfolio)

- Full-bleed minimalist masonry CSS grid
- Visual-first — index shows only image + project title
- Dynamic item page reveals full specifications on click
- Not present in V0

### 9.3 The Bookstore (E-Commerce)

- Dedicated product landing page for *The Art of Classic Planning* (Dr. Nir Haim Buras, Harvard University Press, 2019)
- Right-rail widget: 3D book cover mockup + editorial excerpt + `[ Buy Direct - $85 ]`
- Wix Pay / Wix Stores integration for single-item purchase
- Bypasses subscription funnel entirely
- Not present in V0

### 9.4 The Subscription Landing Page (`/subscribe`)

V1 introduces a fully spec'd dedicated page with 7 distinct DOM sections:

1. Hero container (`#F9EEE5` background, H1 copy defined)
2. Dynamic offer grid (interactive selectable cards, not radio buttons)
3. "Best Offer" badge on Individual All-Access tier
4. Payment processor SVG icons (Card, Apple Pay, Google Pay, PayPal)
5. Sticky checkout footer CTA (`position: fixed`)
6. Benefits carousel (Wix Repeater, horizontal)
7. FAQ accordion + legal legalese footer

V0 only referenced the pricing modal via `wixPricingPlans.startPlanPurchase()` with no dedicated page spec.

---

## 10. State-Aware UI Logic

| Feature | V0 | V1 |
|---|---|---|
| **Subscribe CTA** | Always visible | **Dynamically transforms** — authenticated subscribers see `[My Account]` or `[Archive Access]` instead of `[Subscribe]` |
| **Student LMS Nav** | Not applicable | Corporate top bar collapses on LMS entry; replaced by academic dashboard header |
| **Search Auto-Scope** | Not applicable | Defaults to Herald scope when on `/herald/*`; global scope elsewhere |

---

## 11. Responsive / Mobile Specifications

| Feature | V0 | V1 |
|---|---|---|
| **Mobile Rules** | Not explicitly specified | Strict breakpoint rules: `< 768px` = horizontal layouts **forbidden** |
| **Card Reflow** | Not specified | Side-by-side cards → stacked vertical (image top, text bottom) |
| **Feed Width** | Not specified | Center feed expands to `100% viewport` via `minmax(0px, 1fr)` |

---

## 12. CSS Architecture

| Feature | V0 | V1 |
|---|---|---|
| **CSS File** | Referenced but not detailed | Must write to `global.css`; named classes fully specified |
| **Card Classes** | Not specified | Full `.summary-item` DOM tree specified (rubric, hed, dek, byline) |
| **Typography** | Not specified | Serif H3 via `clamp()` (e.g., Crimson Text); rubric in `uppercase, letter-spacing: 0.1em, 11px` |
| **Carousel CSS** | Not specified | `display: flex; flex-direction: row; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none` |
| **Grid Columns** | Not specified | `grid-template-columns: repeat(4, 1fr)` desktop → 1 column mobile |

---

## Summary: Key Decisions When Moving from V0 → V1

| # | Change | Impact Level |
|---|---|---|
| 1 | Expand from single Herald to 4-arm CPI umbrella | 🔴 Architecture-level |
| 2 | `hook_300_words` → `hook_100_words` (schema rename + data migration) | 🔴 Breaking DB change |
| 3 | Flat article collection → relational Issues + Articles model | 🔴 Breaking DB change |
| 4 | Visual Datasets → Zero-Dataset pure Velo mandate | 🔴 Full re-engineering |
| 5 | Simple menu → 3-zone header + 4-node sub-nav matrix | 🟠 Major UI rebuild |
| 6 | Basic search → context-aware dual-scope search modal | 🟠 Major feature add |
| 7 | No loading states → skeleton grid + opacity transitions | 🟡 UX polish |
| 8 | No `/subscribe` page → full 7-section conversion landing page | 🟠 New page build |
| 9 | Always-visible Subscribe CTA → state-aware dynamic CTA | 🟡 Conditional logic |
| 10 | No mobile specs → strict breakpoint enforcement | 🟡 Responsive layer |
| 11 | Academy/Studio/Bookstore nodes (net new) | 🔴 Architecture-level |
| 12 | Off-canvas sitemap drawer | 🟡 New nav component |
