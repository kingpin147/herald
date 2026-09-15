# Wix Velo Implementation Guide for Herald Platform

This document provides step-by-step instructions for deploying the new backend services, payment hooks, and frontend page logic to your Wix site.

---

## 1. Database Collections Setup

Before deploying the code, ensure the following databases exist in your Wix CMS with the specified fields and permissions:

### A. `HeraldArticles` (Articles Collection)
*   **Collection ID/Key**: `HeraldArticles`
*   **Fields**:
    *   `title` (Text)
    *   `authorName` (Text)
    *   `bannerImage` (Image)
    *   `coverImage` (Image)
    *   `category_tags` (Tags / Array of Text)
    *   `premiumPlan` (Boolean) - Checkbox representing if the article requires subscription access
    *   `articleText` (Rich Text / HTML - raw HTML body text or Wix Ricos JSON)
    *   `imagesGallery` (Media Gallery - list of premium images)

### B. `CPA_Herald_Issues` (Magazine Issues Collection)
*   **Collection ID/Key**: `CPA_Herald_Issues`
*   **Fields**:
    *   `issue_title` (Text)
    *   `issue_date` (Date)
    *   `cover_image` (Image)
    *   `print_edition_pdf` (Document - downloadable PDF link)

### C. `SubscriptionsPlan` (Pricing Tiers Collection)
*   **Collection ID/Key**: `SubscriptionsPlan`
*   **Permissions**: Read: `Anyone`, Write: `Admin`
*   **Fields**:
    *   `subscriptionTier` (Text - e.g., `"Digital Member"`, `"All-Access Print & Digital"`)
    *   `pricing` (Text / Number - e.g., `40`, `150` or `"$150"`)
    *   `inclusions` (Text / Tags - feature bullet points and access scope)
    *   `technicalRouting` (Text - routing metadata)
    *   `fulfillmentAutomation` (Text - automation hooks)
    *   `subscriptionType` (Text - plan description/billing interval)

### D. `SubscriptionUserData` (Active Member Subscriptions Collection)
*   **Collection ID/Key**: `SubscriptionUserData`
*   **Permissions**: Read: `Site Member Author`, Write: `Admin` (Backend queries use `suppressAuth: true`)
*   **Fields**:
    *   `memberId` (Text - Wix Member `_id`)
    *   `subscriptionPlan` (Text - title of purchased plan)
    *   `memberName` (Text - member's full name)
    *   `subscriptionPrice` (Text / Number - amount paid)
    *   `purchaseDateAndTime` (Date - timestamp of purchase)
    *   `expiryDate` (Date - subscription expiration date)
    *   `status` (Text - `"Active"`, `"Cancelled"`, `"Refunded"`)
    *   `paymentId` (Text - Wix Pay Payment ID)

### E. `logs` (System Error Logs Collection)
*   **Collection ID/Key**: `logs`
*   **Fields**:
    *   `title` (Text)
    *   `message` (Text)
    *   `level` (Text) - `"info"`, `"warn"`, or `"error"`
    *   `source` (Text) - module path
    *   `details` (Long Text) - full stack traces
    *   `userId` (Text)

---

## 2. Backend Web Modules & Webhooks (Velo Backend)

In the Wix Editor, navigate to **Velo Dev Mode** -> **Public & Backend** -> **Backend** section. Create/update the following files:

### 📄 `backend/logger.web.js`
*   **File**: `backend/logger.web.js`
*   **Role**: Handles structured error logging directly to your Wix `logs` database.
*   **Permissions**: `Anyone` (Web Method).

### 📄 `backend/pricing.web.js`
*   **File**: `backend/pricing.web.js`
*   **Role**: Zero-trust pricing plan query engine, secure checkout payment session initializer (via `wix-pay-backend`), and active member subscription validation.
*   **Permissions**: `Anyone` (Web Method - caller auth is strictly verified on backend via `currentMember.getMember()`).

### 📄 `backend/events.js`
*   **File**: `backend/events.js` (Must be named exactly `events.js`)
*   **Role**: Automated webhook listener for `wixPay_onPaymentUpdate` and `wixStores_onOrderPaid`. Automatically provisions active records in `SubscriptionUserData` with calculated expiration dates upon confirmed payment.

### 📄 `backend/herald.web.js`
*   **File**: `backend/herald.web.js`
*   **Role**: Zero-trust content gateway. Fetches from `HeraldArticles`. Parses and truncates `articleText` into a Wix Rich Content JSON object (Ricos Document) on the backend:
    *   For free articles or active subscribers: returns full content in `premiumContent`.
    *   For guest or free members reading premium articles: strips `articleText` and returns a 300-word preview in `hookContent` to prevent client-side bypass.
*   **Permissions**: `Anyone` (Web Method).

### 📄 `backend/archive.web.js`
*   **File**: `backend/archive.web.js`
*   **Role**: Secures issue downloads by only returning the PDF download URL if the user has an active subscription in `SubscriptionUserData`.
*   **Permissions**: `Anyone` (Web Method).

---

## 3. Frontend Page Code

Copy and paste the frontend scripts to their respective pages in the Wix Page Code sections:

### 📄 Pricing & Subscribe Page (`herald(subscribePage).js`)
1. **Add HTML Component**: On your Subscribe/Pricing page, add an **HTML Component (Embed > Custom Code)**, expand it across the content width, and set its ID to `#htmlComponent1`.
2. **Paste HTML Code**: Open the HTML Component's settings, click **Edit Code**, and paste the contents of [html_component/subscribe.html](file:///d:/downloads%206-11-2025/herald/html_component/subscribe.html).
3. **Paste Velo Page Code**: Paste the contents from [herald(subscribePage).js](file:///d:/downloads%206-11-2025/herald/herald(subscribePage).js) into the Velo Page Code panel.
   * **How it works**: Velo queries active tiers from `SubscriptionsPlan` and active status from `SubscriptionUserData`, then sends them via `postMessage` to `#htmlComponent1` to render dynamically. When the user clicks "Subscribe", the iframe sends a message back to Velo, which validates authentication and opens Wix Pay.

### 📄 Primary Feed/Feed Page (`herald(listPage).js`)
Paste the content from [herald(listPage).js](file:///d:/downloads%206-11-2025/herald/herald(listPage).js) onto your feed page code:
*   **Wix Elements Needed**:
    *   `#dynamicDataset` — Dataset connected to `HeraldArticles` (sorted by published date descending).
    *   `#articleRepeater` — Repeater to display article cards. Inside the repeater:
        *   `#cardContainer`, `#coverImage`, `#articleTitle`, `#authorName`, `#categoryLabel`, `#premiumBadge`
    *   `#categoryTags` — Selection Tags element for filtering categories.
    *   `#searchInput`, `#searchButton`, `#noResultsText`

### 📄 Dynamic Article Page (`herald(itemPage).js`)
Paste the content from [herald(itemPage).js](file:///d:/downloads%206-11-2025/herald/herald(itemPage).js) onto your Dynamic Item Page:
*   **Wix Elements Needed**:
    *   `#dynamicDataset` — Dataset connected to `HeraldArticles`.
    *   `#title`, `#authorName`, `#bannerImage`
    *   `#richContentViewer` — RichContentViewer (unbound in Editor, populated via Velo with hook or full content).
    *   `#planUi` — Container Box containing paywall message and subscription CTA buttons.
    *   `#imagesGallery` — Gallery element to show article images (hidden for free users).

### 📄 Issue Archive Page (`herald(archivePage).js`)
Paste the content from [herald(archivePage).js](file:///d:/downloads%206-11-2025/herald/herald(archivePage).js) onto your Archive page:
*   **Wix Elements Needed**:
    *   `#issueDataset` — Dataset connected to `CPA_Herald_Issues` (sorted by issue date descending).
    *   `#issueRepeater` — Repeater in a 3-4 column grid layout (`#issueCard`, `#issueCover`, `#issueTitle`, `#issueDate`).

### 📄 Required Lightbox ("IssueDetailModal")
*   Create a Wix Lightbox named **"IssueDetailModal"**.
*   Design the lightbox with: `#modalCover`, `#modalTitle`, `#modalDate`, `#downloadButton`, `#accessDeniedMessage`, `#upgradeButton`.
*   Paste the content from [herald(IssueDetailModal).js](file:///d:/downloads%206-11-2025/herald/herald(IssueDetailModal).js) into the lightbox code panel.
