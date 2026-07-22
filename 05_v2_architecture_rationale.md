# Architectural Rationale: Why V2 is Superior to V1

When engineering a premium publishing platform, there is always a tension between **development speed** (relying on native website builders) and **bespoke capability** (writing custom software).

The **V1 Blueprint** attempted to build the Herald entirely using Wix's native UI elements (Repeaters, Text Boxes, Datasets, and Lightboxes) paired with a custom CMS logic. While functional, it encountered severe aesthetic and structural limitations inherent to the Wix Studio platform. 

The **V2 Hybrid Paywall Architecture** solves these issues entirely by treating Wix strictly as a secure backend database and payment processor, while shifting the visual presentation to completely un-restricted HTML components.

Here is a breakdown of why this proposed V2 architecture is exponentially better for the CPI.

---

## 1. Absolute Design Freedom (No More Native Restrictions)

### The V1 Problem
Wix's native UI elements are highly restrictive. We cannot build advanced CSS Masonry grids for the Issue Archive. We cannot render complex, semantic typography combinations dynamically. We are forced to use Wix's native Lightboxes, which suffer from a known 2-3 second loading lag, creating a clunky user experience.

### The V2 Solution
By using an HTML Component, we write pure, unrestricted HTML/CSS/Javascript. 
- **Premium Aesthetics:** We can execute exact, pixel-perfect designs, custom CSS gradients, and seamless hover animations that are impossible in Wix Studio natively.
- **Instant UI:** The custom CSS Modal we built for the Issue Archive opens instantly, completely removing the lag of Wix Lightboxes.
- **Client-Side Filtering:** For the Article List, the HTML component handles search and tag filtering natively in the browser's memory, resulting in instant, zero-lag search results without waiting for Wix to query the database.

---

## 2. Un-Hackable "Zero-Trust" Security

### The V1 Problem
A standard Wix Dataset fetches the *entire* row from the database (including the secret `premium_content_html`) and delivers it to the browser, relying on frontend Javascript to hide it. A savvy user can easily open Chrome Developer Tools, inspect the page's memory, and extract the full article or PDF without paying.

### The V2 Solution
The V2 backend implements a strict **Data Stripping Mandate**. 
The `backend/articleService.jsw` executes the Entitlement Engine *on the server*. If a user is not authorized, the server literally deletes the premium content from the dataset (`article.premium_content_html = null`) before the payload is dispatched to the client. **It is physically impossible to bypass the paywall, because the data is never sent to the browser.**

---

## 3. Seamless Unified Subscriptions (The 3-Pronged Logic)

### The V1 Problem
Wix segregates its monetization engines. "Wix Pricing Plans" handles recurring subscriptions, while "Wix Stores" handles one-off purchases (like buying a single digital issue). Furthermore, "Pipeline C" (White-glove corporate clients) required complex custom code to bypass these native limits.

### The V2 Solution
V2 introduces a unified **Entitlement Engine**. The frontend UI doesn't care *how* a user bought access; it only asks the backend: "Does this user have access?"
The backend securely checks the 3-Pronged Logic in milliseconds:
1. Do they have an active native **Wix Pricing Plan**?
2. Do they hold the custom **"Herald_Premium" Role** (automatically granted by our custom Wix Stores webhook when they buy a single issue)?
3. Do they possess a manual **"VIP" Tag** (granted manually by an admin for Pipeline C clients)?

If *any* of those are true, the secure data is unlocked. This allows the CPI to leverage Wix's reliable, pre-built checkout apps (saving weeks of custom payment development) while maintaining a highly customized access matrix.

---

## Conclusion
The V2 architecture gives the CPI the **security and reliability** of a managed platform (Wix), with the **visual fidelity and performance** of a bespoke, headless web application. It eliminates development blockers, future-proofs the codebase, and delivers the elite aesthetic required by the brand.
