# V2 Hybrid Architecture: Deployment Guide for Wix Studio

> [!WARNING]
> **ARCHITECTURE ROLLED BACK**
> The V2 (HTML Iframe) architecture described in this deployment guide was **rejected** by the client due to severe SEO implications. 
> The project has been rolled back to the **V1 Architecture (Wix Native Elements)** for all frontend rendering, while retaining the custom backend subscription logic (MemberSubscriptions) and Wix Pay APIs. This document is preserved for historical context only.


This document provides a step-by-step guide for your Velo development team to deploy the new **V2 Hybrid Paywall Architecture** into the existing Wix Studio site.

## 1. Backend Services (Zero-Trust Entitlement)

The new architecture relies on backend validation to strip secure data before it ever reaches the browser. 

**What to do:**
Copy the following files into the **Public & Backend > Backend** section of your Wix Editor:
- `backend/articleService.jsw`
- `backend/archiveService.jsw`
- `backend/listService.jsw`
- `backend/events.js` (Must be named exactly `events.js` for the `wixStores_onOrderPaid` webhook to fire).

**Configuration Needed:**
- In `articleService.jsw` and `archiveService.jsw`, locate `ALL_ACCESS_PLAN_ID` and replace it with your actual Individual All-Access Pricing Plan ID from the Wix Dashboard.
- In `events.js`, locate `PREMIUM_ROLE_ID` and replace it with the Role ID for "Herald_Premium" from your Wix Site Members dashboard.

---

## 2. Page Setup & Velo Frontend Scripts

The native Wix Datasets are no longer bound directly to UI text elements for these pages.

**What to do:**
For the **Article Page** (`herald-article`), **Issue Archive Page** (`herald-issue-archive`), and **Article List Page** (`herald-article-list`):
1. **Remove old bindings:** Unbind the native Wix text, image, and repeater elements from the datasets (or simply delete the elements).
2. **Add HTML Components:** Add a Wix HTML Component (Embed > Custom Code) to each page. Expand the component so it fills the desired content area.
3. **Set the ID:** Ensure the HTML Component ID is `#htmlComponent1`.
4. **Paste Velo Code:** Copy the corresponding JS files from the `pages/` directory of this implementation and paste them into the Velo Page Code section for each page.

---

## 3. HTML UI Injections

The actual visual presentation (the CSS grid, custom fonts, blur effects) is now handled natively by the HTML components.

**What to do:**
1. Click on the `#htmlComponent1` element on your Wix page.
2. Click **Edit Code**.
3. Paste the raw HTML from the `html_component/` directory into the code box:
   - For the Article Page: Paste `html_component/article.html`
   - For the Archive Page: Paste `html_component/issue_archive.html`
   - For the Article List: Paste `html_component/article_list.html`

---

## 4. Pipeline C (Corporate & Education) Setup

Pipeline C operates purely through native Wix tools and the custom Entitlement Engine.

**What to do:**
1. Ensure your Lightboxes (`Submit_Academic_Credentials` and `Corporate_Inquiry_Form`) exist.
2. Ensure your Subscribe page buttons route to these Lightboxes (as shown in `pages/subscribe.js`).
3. **No extra code is needed:** When your admin approves a corporate user, they just manually assign them the "VIP" badge in the Wix Members Dashboard. The backend script will instantly recognize this and grant them access.

---

## 5. Important API Upgrades (Velo Standards)

Please notify your development team that this V2 implementation **strictly uses modern Wix Velo APIs**. 

We have completely removed all references to the deprecated `wix-users` and `wix-users-backend` modules. 
- All frontend auth and member queries now use `wix-members-frontend` (e.g., `currentMember.getMember()`).
- All backend entitlement and role assignments use `wix-members-backend` (e.g., `currentMember.getRoles()` and `authorization.assignRole()`).

Ensure any future modifications to this codebase avoid deprecated `wix-users` imports to guarantee long-term stability and security.
