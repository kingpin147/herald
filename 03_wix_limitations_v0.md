# Wix Studio + Velo — V0 Blueprint Limitations Audit
## Herald-Only Ecosystem — What Cannot Be Done

---

> [!NOTE]
> V0 is significantly simpler than V1 (single publication, no LMS, no multi-arm umbrella). As a result, fewer hard blockers exist. However, several V0-specific requirements still hit genuine Wix walls — particularly around layout, Rich Content handling, PDF security, and the paywall architecture.

---

## 🔴 HARD BLOCKERS — Impossible in V0 on Wix

---

### 1. True Masonry Layout
**V0 Requirement:**
> *"The main landing page must render as a continuous, dynamic masonry or structured grid of individual article cards, identical to The Architectural Digest homepage."*

**Why it's impossible:**
Wix Studio has **no native masonry layout engine**. The Wix Repeater supports:
- Fixed grid (equal-height rows)
- List (single column)
- Horizontal scroll

A true masonry layout (Pinterest/AD-style where cards fill vertical columns at varying heights based on content) requires CSS `columns` or JavaScript libraries like Masonry.js. **Neither can be injected into Wix.** You cannot import npm packages or external JS libraries into Wix Velo.

**What you actually get:**
A uniform CSS grid with fixed card heights — cards will all be the same height, images cropped to fit. This is a "structured grid," not masonry. The AD homepage aesthetic of organically varied card heights **cannot be replicated**.

**Workaround:**
None. Accept a uniform grid layout and design cards accordingly with strict aspect ratios.

---

### 2. Secure PDF Gating (True URL Protection)
**V0 Requirement:**
> *"The print_edition_pdf payload is strictly gated and accessible only to Level 3 (Print/Digital) subscribers."*

**Why it's a hard limitation:**
In Wix, the `print_edition_pdf` field stores a **Wix Media Manager URL** (e.g., `https://static.wixstatic.com/media/...pdf`). This URL is:
- Publicly accessible to anyone who knows the URL
- **Cannot be protected at the CDN/server level** within Wix
- Once a user copies the direct Wix Media URL, Wix has no mechanism to revoke or gate access to it

**What the Velo backend CAN do:**
Strip the URL from the data payload before sending to unauthorized users — so the URL is never exposed in the DOM. ✅

**The remaining vulnerability:**
If a Level 3 subscriber shares the PDF URL with a non-subscriber, **Wix cannot block that shared URL**. There is no token-signed URL or expiring download link system in Wix Media Manager.

**Workaround:**
Host PDFs on an external service (AWS S3 with pre-signed URLs, or Cloudflare R2) and store only a reference key in the Wix CMS. Generate the pre-signed download URL server-side via a Velo `http-functions` call. This works but adds infrastructure outside of Wix.

---

### 3. Rich Content Bulk Import
**V0 Requirement:**
> *"Developers must access the 0_Website folder... The Excel Matrix contains the definitive mapping of every article to its respective category tags... ingest this matrix to accurately populate the CMS during bulk database import."*

**Why it's impossible:**
Wix's CSV bulk import tool supports **plain text, numbers, dates, booleans, and images** — but it **does not support Rich Content (Ricos) fields**.

The `hook_300_words` and `premium_content_html` fields are both Rich Content type. These fields store JSON-formatted Ricos documents (not plain HTML or plain text). **There is no official Wix bulk import pathway for Rich Content fields.**

**What this means in practice:**
Every article's body content must be entered **manually** through the Wix CMS Rich Content editor, one article at a time. For a large archive (50+ articles), this is weeks of manual data entry.

**Partial workaround:**
Write a custom Velo backend script using `wixData.insert()` with a manually constructed Ricos JSON object to programmatically insert Rich Content. This is possible but:
- Requires understanding the undocumented Ricos JSON schema
- Must be done article-by-article via script
- No official Wix documentation for bulk Ricos insertion

---

## 🟠 MAJOR LIMITATIONS — Possible but Significantly Degraded

---

### 4. NYT-Style Registration Lightbox (Exact UI Spec)
**V0 Requirement:**
> *"A clean, white, center-aligned container. Bold header: 'Read this article for free.' Email input. Full-width black 'Continue' button. Divider. Two full-width OAuth buttons (Google logo, Apple logo)."*

**What Wix Lightbox can do:**
- Create a custom lightbox with white background ✅
- Add text, inputs, and buttons ✅
- Block background scrolling ✅
- Display the article hero image behind the lightbox ✅

**What it cannot do:**
- **Background hero image visibility**: The Wix Lightbox always renders as a full overlay on top of the page. You cannot reliably show the article's specific hero image in the background *behind* the lightbox while blocking scroll — Wix lightboxes use a backdrop color/opacity layer that covers the page content
- **Custom OAuth buttons**: The Google and Apple login triggers are bound to Wix's internal `wixUsers.promptLogin()` — you cannot create custom-styled buttons that *only* trigger the Google or Apple OAuth flow independently. Clicking them opens Wix's full login modal, replacing your custom lightbox design
- **"Continue with Email" flow**: Wix's email-first login (enter email → receive magic link or set password) is a specific Wix Members flow that cannot be replicated with a custom input + button without fully rebuilding Wix's auth logic in Velo, which is not permitted via the public API

**Net result:**
The lightbox will look approximately correct but the OAuth buttons and email flow will defer to Wix's native UI, breaking the seamless NYT-style experience.

---

### 5. `backdrop-filter: blur()` on the Paywall Overlay
**V0 Requirement:**
```css
.paywall-fade-overlay {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}
```

**Wix Studio reality:**
This is the same constraint as V1. Wix renders page content inside nested container layers that create **new CSS stacking contexts**. `backdrop-filter` requires that the blurred element sits above its target content in the same stacking context — Wix's internal DOM wrapping often breaks this relationship.

**Observed failure mode:**
The overlay renders as a white/transparent rectangle with no blur effect, because the text it's supposed to blur is in a different stacking context (a different Wix container layer).

**Workaround:**
Use `linear-gradient` fade only (the white-to-transparent gradient still creates a soft visual truncation without the glass blur). This is 80% of the visual effect — just without the frosted-glass blur. Most users won't notice.

---

### 6. Dual RichContentViewer Paywall Architecture
**V0 Requirement:**
> *"Stack two RichContentViewer elements vertically — one for `hook_300_words` (free), one for `premium_content_html` (gated). For authenticated subscribers, trigger `.collapse()` on the blur overlay."*

**What Wix can do:**
- Two RichContentViewer elements on one page ✅
- Backend strips `premium_content_html` to `null` for unauthorized users ✅
- `.collapse()` on the overlay div ✅

**Limitations:**
- **RichContentViewer height is dynamic** — it auto-sizes to content. The CSS paywall gradient overlay (`position: relative; margin-top: -60px`) requires knowing the exact rendered height of the first viewer. Since Ricos content height varies per article, the `-60px` overlap may cut off too much or too little text depending on the article
- **RichContentViewer has no exposed DOM** — you cannot query its internal elements with Wix Velo. You cannot programmatically detect when a user reaches the "bottom" of the preview or apply truncation at a specific word count. The 300-word limit is enforced editorially (Flavio must manually stop at 300 words in the CMS) — it **cannot be technically enforced by code**
- **`.collapse()` animation**: Wix's `.collapse()` removes the element from layout flow — it does not smoothly transition. There will be a layout jump when the paywall disappears and the second RichContentViewer renders

---

### 7. Wix Selection Tags + Repeater Filtering
**V0 Requirement:**
> *"When a user clicks a tag, the Velo script must dynamically filter the repeater without reloading the page."*

**What Wix can do:**
- Wix Selection Tags element exists ✅
- Velo `.hasSome("category_tags", selectedTag)` works ✅
- No page reload ✅

**The hidden limitation — Full Repeater Re-Render:**
Every time a taxonomy tag is clicked, Velo re-executes the full `wixData.query()` and **replaces the entire repeater dataset**. This means:
- All existing article cards disappear and re-render from scratch
- On slower connections, there is a blank white flash (300–800ms) before new cards appear
- Without the skeleton loading implementation (see V1 requirement), this looks broken

V0 does not specify skeleton loading — meaning **the default V0 filter UX will show a blank repeater during every query**. The Selection Tags UI is also visually basic (Wix default styling) and cannot be fully CSS-overridden to match a premium editorial aesthetic.

---

### 8. Issue Archive Modal
**V0 Requirement:**
> *"Clicking a cover opens a modal or dedicated dynamic page focused on the issue, featuring a prominent 'Download Full Issue' CTA."*

**Modal option limitation:**
Wix Lightboxes (modals) can display dynamic content, but passing data dynamically to a lightbox (e.g., which issue was clicked) requires `wixWindow.openLightbox("issueLightbox", { issueData: item })` and reading it inside the lightbox via `wixWindow.lightbox.getContext()`. This works ✅ but:
- The lightbox has its own separate page context — you cannot share Velo state between the main page and the lightbox directly
- Styling the lightbox to match the editorial design requires duplicate CSS declarations

**Dynamic page option:**
A `/herald/issue/{slug}` dynamic page is more robust but requires the relational `CPA_Herald_Issues` collection (which is a V1 addition — V0's flat schema makes this harder to organize).

---

### 9. Newsletter Sign-Up for Free Subscription Tier
**V0 Requirement:**
> *"FOR FREE SUBSCRIPTION MUST INCLUDE Newsletter Sign Up"*

**What Wix can do:**
- Wix Ascend has a native email marketing / newsletter tool ✅
- Wix Forms can capture email subscriptions ✅

**Limitations:**
- **No native double opt-in flow customization** — the confirmation email is Wix-branded and has limited design control
- **Third-party ESP integration** (Mailchimp, ConvertKit, Beehiiv) requires either a Wix app (limited, may have fees) or a custom Velo webhook — there is no native Velo → Mailchimp API binding out of the box
- Free tier members are Wix Members — automatically segmenting them into a newsletter list requires Velo logic that checks `wixMembers` tags and syncs to `wixCrm.contacts()`, which is possible but involves 3–4 API calls per signup
- Wix Ascend email sender limits apply (based on your Wix plan tier)

---

### 10. Category Routing (`/herald/urbanism`, `/herald/neuroscience`)
**V0 Requirement:**
> *"Dynamic routing links to specific category filters (e.g., `/herald/urbanism`, `/herald/neuroscience`)."*

**Wix limitation:**
Wix dynamic pages follow the pattern `/collection/{fieldValue}` — but these are tied to a **CMS collection field, not a tag array**. You cannot create a Wix dynamic page for each category tag in an array field.

**What actually works:**
- `/herald?tag=Urbanism` (query parameter routing) ✅
- `/herald/urbanism` as a static page per category ✅ (but requires manually creating one page per category — not dynamic)
- A true dynamic `/herald/{tag}` route that reads from an array field ❌ — Wix dynamic pages only support reference to a single-value field, not an array item

**Workaround:**
Use query parameters (`?tag=Urbanism`) and filter the repeater on page load by reading `wixLocation.query.tag`. This is functionally equivalent but the URL pattern differs from V0's spec.

---

## Summary Table — V0 Limitations

| V0 Feature | Status | Impact |
|---|---|---|
| True masonry layout (AD-style) | 🔴 Impossible | Visual degradation — uniform grid only |
| Secure PDF URL (shared link protection) | 🔴 Impossible | Wix CDN URLs are publicly accessible once known |
| Rich Content bulk import (CSV) | 🔴 Impossible | All article bodies must be entered manually |
| NYT-style OAuth lightbox (exact UI) | 🟠 Degraded | OAuth buttons defer to Wix's native UI |
| `backdrop-filter: blur()` | 🟠 Unreliable | Stacking context breaks blur in many cases |
| Dual RichContentViewer paywall | 🟠 Degraded | Height is dynamic; overlap cannot be code-enforced |
| 300-word limit enforcement | 🟠 Editorial only | Cannot be technically enforced by code |
| RichContentViewer `.collapse()` transition | 🟠 Layout jump | No smooth animation — element pops in/out |
| Selection Tags filter (blank flash) | 🟠 UX degradation | Full repeater re-render on every filter click |
| Category URL routing (`/herald/urbanism`) | 🟠 Pattern change | Must use `?tag=Urbanism` query params instead |
| Issue archive modal with dynamic data | 🟡 Complex | Lightbox context passing works but fragile |
| Newsletter sign-up (free tier) | 🟡 Basic only | Wix Ascend limited; third-party ESPs need custom Velo |

---

## V0 vs V1 — Limitations Comparison

| Limitation | Exists in V0? | Exists in V1? | Notes |
|---|---|---|---|
| SSR dual-payload (crawler vs client) | 🟡 Minor (V0 doesn't spec it) | 🔴 Hard blocker | V1 explicitly requires it; V0 doesn't mention it |
| IP-based corporate auth | ❌ Not in V0 | 🔴 Hard blocker | V0 has no corporate tier spec |
| Academic ID verification | ❌ Not in V0 | 🔴 Hard blocker | V0 has no Education tier spec |
| Multi-user org accounts | ❌ Not in V0 | 🔴 Hard blocker | V0 is individual-only |
| True masonry layout | 🔴 Hard blocker | 🟠 (V1 uses structured grid) | V0 explicitly asks for masonry; V1 shifts to structured CSS grid |
| Secure PDF URL (CDN protection) | 🔴 Hard blocker | 🔴 Hard blocker | Same in both versions |
| Rich Content bulk import | 🔴 Hard blocker | 🔴 Hard blocker | Same in both versions |
| `backdrop-filter: blur()` | 🟠 Unreliable | 🟠 Unreliable | Same in both versions |
| Custom OAuth button UI | 🟠 Degraded | 🟠 Degraded | Same in both versions |
| True LMS | ❌ Not in V0 | 🟠 Severely limited | V0 has no Academy node |
| True off-canvas drawer | ❌ Not in V0 | 🔴 Not native | V1 introduces the drawer |
| Subdomain routing | ❌ Not in V0 | 🔴 Impossible | V0 is single-site Herald only |
| Masonry layout (CSS only) | 🔴 Impossible | 🟡 Structured grid (achievable) | V1 is actually *easier* here |
| Repeater filter blank flash | 🟠 Present | 🟠 Present (mitigated by skeleton) | V1 adds skeleton loading spec; V0 does not |
| 300-word limit code enforcement | 🟠 Editorial only | 🟡 100-word (editorial only) | Same problem, different word count |
| Newsletter sign-up | 🟡 Present | 🟡 Present | Same in both versions |
| PDF URL copy-sharing vulnerability | 🔴 Present | 🔴 Present | Same in both versions |

---

> [!TIP]
> **V0 is actually more buildable on Wix than V1** — it has only 3 hard blockers vs V1's 6. The main V0-specific risk is the **masonry layout** (a visual spec that Wix cannot deliver natively) and the **Rich Content bulk import** (which will significantly inflate the initial migration timeline regardless of version).

> [!WARNING]
> The **PDF URL security vulnerability** applies to **both V0 and V1**. If the `print_edition_pdf` payload is ever displayed to a Level 3 subscriber, that URL becomes permanently accessible to anyone they share it with. This is a fundamental Wix Media Manager constraint with no native fix.
