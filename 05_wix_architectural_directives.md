# Architectural Directives (Client Feedback & Resolution)

**From:** Salvador Cobrero Alarcón  
**Context:** Resolution of V0 and V1 limitation audits and unblocking development.

## 1. UI, Layout & Data Constraints (V0)

* **Masonry Layout:** Proceed with a uniform, elegant CSS Grid instead of a strict masonry layout to respect Wix's native Repeater capabilities.
* **Secure PDFs:** Accept the minor URL-sharing risk for the `print_edition_pdf` payload via Wix Media Manager for Phase 1.
* **Rich Content Bulk Import:** Acknowledge that Ricos JSON cannot be imported via standard CSV. Proceed with writing the custom Velo `wixData.insert()` script to parse the JSON payloads from our Excel matrix. This is a hard requirement for our migration.

## 2. Architecture Resolution: The Hybrid Entitlement Engine

We will solve the multi-tier pricing matrix issue by implementing a Hybrid Entitlement Architecture via Velo, using Wix’s native apps and bridging the entitlement logic in the backend.

### The Velo Bridge (Backend Logic)
Instead of relying solely on Wix Pricing Plans to unlock the UI, the `pages/herald-article.js` script will determine access by checking a unified user state. A user is granted `premium_content_html` access if they meet ANY of the following conditions:
* `wixUsers.currentUser.getPricingPlans()` returns an active Individual All-Access plan.
* `wixUsers.currentUser.getRoles()` returns the custom role "Herald_Premium".

This routes the pricing matrix through three distinct pipelines:

#### Pipeline A (Native Subscriptions & The Free Gate)
* **Free Tier (€0):** Use the native Wix Custom Signup Form. To read past the 100-word hook, users MUST register. This drops them into the Wix CRM / Ascend for newsletter targeting.
* **Individual All-Access ($150/yr):** Built natively in Wix Pricing Plans. Checkout is fully automated.

#### Pipeline B (E-Commerce Webhooks for One-Time & Print)
* For **Single Issue Digital ($40)**, **Single Issue Print ($65)**, and **Print Collector ($500)**, use Wix Stores.
* **Backend Event Listener (`wix-stores-backend` -> `onOrderPaid`):** When an order is paid, the script checks the `lineItems` SKU. If the SKU equals `DIGITAL_SINGLE` or `PRINT_COLLECTOR`, the backend automatically calls `wixUsersBackend.assignRole("Herald_Premium", memberId)`. This grants immediate digital access without mixing checkout systems.

#### Pipeline C (White-Glove B2B / Corporate & Education)
* Treat **Education ($60)** and **Corporate ($2,500)** as "white-glove" concierge services for V1 to bypass Wix's native IP/ID limitations. Do not build automated checkout flows or external ID verification APIs for these.
* **Implementation:** Use UI entry points linking to a secure Wix Form (e.g., "Submit Academic Credentials" or "Corporate Inquiry"). Our team will manually review these leads and assign the Pricing Plan manually via the Wix Dashboard.

## 3. Global System Descoping (V1)

* **Paywall & SEO (SSR Limitation):** Security takes precedence over crawler visibility. Implement the backend stripping rule aggressively. Unauthorized DOMs and crawlers will only receive the `hook_100_words`. SEO tradeoff is accepted to ensure the paywall cannot be bypassed via developer tools.
* **The LMS (Student Portal):** Downgrade the LMS requirement to a "Gated Resource Library." Authenticated students accessing a secure hub with static course materials, embeds, and syllabus PDFs is sufficient for launch.
* **Header FOUC & UI Compromises:** Keep a single, unified global header across the entire site to prevent any Velo-induced FOUC. For the Off-Canvas drawer, proceed with the Velo `show()`/`hide()` simulation, but ensure the CSS animations are as smooth as Wix permits.
* **Search Engine:** Proceed with the multi-collection Velo query approach. Latency tradeoff is accepted. Ensure a clean UI loading state (e.g., a "Searching the Archive..." text indicator) so the user doesn't think the site has frozen.

## Summary

By decoupling the checkout UI from the Velo entitlement logic, we can support our entire pricing matrix seamlessly. Let's freeze the scope here and move directly into development.

*Please confirm no API limits are foreseen with the `onOrderPaid` webhook approach and flag any further UX/UI clarifications.*
