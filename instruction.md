# Wix Velo Implementation Guide for Herald Platform

This document provides step-by-step instructions for deploying the new backend services and frontend page logic to your Wix site.

---

## 1. Database Collections Setup

Before deploying the code, ensure the following databases exist in your Wix CMS with the specified fields:

### A. `HeraldArticles` (Articles Collection)
*   **Collection ID/Key**: `HeraldArticles`
*   **Fields**:
    *   `title` (Text)
    *   `authorName` (Text)
    *   `bannerImage` (Image)
    *   `coverImage` (Image)
    *   `category_tags` (Tags / Array of Text)
    *   `premiumPlan` (Boolean) - Checkbox representing if the article requires subscription access
    *   `articleText` (Rich Text / HTML - raw HTML body text)
    *   `imagesGallery` (Media Gallery - list of premium images)

### B. `CPA_Herald_Issues` (Magazine Issues Collection)
*   **Collection ID/Key**: `CPA_Herald_Issues`
*   **Fields**:
    *   `issue_title` (Text)
    *   `issue_date` (Date)
    *   `cover_image` (Image)
    *   `print_edition_pdf` (Document - downloadable PDF link)

### C. `logs` (System Error Logs Collection)
*   **Collection ID/Key**: `logs`
*   **Fields**:
    *   `title` (Text)
    *   `message` (Text)
    *   `level` (Text) - `"info"`, `"warn"`, or `"error"`
    *   `source` (Text) - module path
    *   `details` (Long Text) - full stack traces
    *   `userId` (Text)

---

## 2. Backend Web Modules (Velo Backend)

In the Wix Editor, navigate to **Velo Dev Mode** -> **Public & Backend** -> **Backend** section. Create/update the following `.web.js` files:

### 📄 `backend/logger.web.js`
Create a new file named `logger.web.js` in the backend folder and paste the content from [logger.web.js](file:///d:/nouman%20wix%20code/herald/backend/logger.web.js):
*   **Role**: Handles structured error logging directly to your Wix `logs` database.
*   **Permissions**: `Anyone` (Web Method).

### 📄 `backend/pricing.web.js`
Create a new file named `pricing.web.js` in the backend folder and paste the content from [pricing.web.js](file:///d:/nouman%20wix%20code/herald/backend/pricing.web.js):
*   **Role**: Interfaces with `wix-pricing-plans-backend` to verify user pricing plans (e.g. Pride plan, background check plans, family plans).
*   **Permissions**: `Anyone` (Web Method).

### 📄 `backend/herald.web.js`
Create a new file named `herald.web.js` in the backend folder and paste the content from [herald.web.js](file:///d:/nouman%20wix%20code/herald/backend/herald.web.js):
*   **Role**: Zero-trust gateway. Fetches from `HeraldArticles`. Parses and truncates `articleText` into a Wix Rich Content JSON object (Ricos Document) on the backend:
    *   For free articles or active subscribers: returns full content in `premiumContent`.
    *   For guest or free members reading premium articles: strips `articleText` and returns a 300-word preview in `hookContent` to prevent client-side bypass.
*   **Permissions**: `Anyone` (Web Method).

### 📄 `backend/archive.web.js`
Create a new file named `archive.web.js` in the backend folder and paste the content from [archive.web.js](file:///d:/nouman%20wix%20code/herald/backend/archive.web.js):
*   **Role**: Secures issue downloads by only returning the PDF download URL if the user has an active Level 3 (Print/Digital) subscription.
*   **Permissions**: `Anyone` (Web Method).
*   > [!IMPORTANT]
    > In `_checkArchiveAccess()`, configure your actual Print/Digital plan IDs inside the `archivePlanIds` array (Option A) to enforce specific premium tiers, or keep Option B (default) to allow access to anyone with any active plan.

---

## 3. Frontend Page Code

Copy and paste the frontend scripts to their respective pages in the Wix Page Code sections:

### 📄 Primary Feed/Feed Page (`herald(listPage).js`)
Paste the content from [herald(listPage).js](file:///d:/nouman%20wix%20code/herald/herald(listPage).js) onto your feed page code:
*   **Wix Elements Needed**:
    *   `#dynamicDataset` — Dataset connected to `HeraldArticles` (sorted by published date descending).
    *   `#articleRepeater` — Repeater to display article cards. Inside the repeater, you need:
        *   `#cardContainer` — Container Box for the card (has onClick handler).
        *   `#coverImage` — Image element for the article.
        *   `#articleTitle` — Text element.
        *   `#authorName` — Text element.
        *   `#categoryLabel` — Text element for category tags.
        *   `#premiumBadge` — Container/Box (displays lock icon or "Subscriber Exclusive", hidden by default).
    *   `#categoryTags` — Selection Tags element for filtering categories.
    *   `#searchInput` — Text Input field.
    *   `#searchButton` — Button element.
    *   `#noResultsText` — Text element (collapsed by default).

### 📄 Dynamic Article Page (`herald(itemPage).js`)
Paste the content from [herald(itemPage).js](file:///d:/nouman%20wix%20code/herald/herald(itemPage).js) onto your Dynamic Item Page:
*   **Wix Elements Needed**:
    *   `#dynamicDataset` — Dataset connected to `HeraldArticles`.
    *   `#title` — Text element.
    *   `#authorName` — Text element.
    *   `#bannerImage` — Image element.
    *   `#hookContentViewer` — RichContentViewer (unbound in Editor, populated via Velo with the backend's generated preview).
    *   `#premiumContentViewer` — RichContentViewer (unbound in Editor, populated via Velo with the backend's full text).
    *   `#paywallOverlay` — Container Box covering the bottom of `#hookContentViewer` to create the paywall fade.
        *   Inside Wix Editor, apply the `.paywall-fade-overlay` CSS style to this box:
            ```css
            .paywall-fade-overlay {
              backdrop-filter: blur(10px);
              background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95));
            }
            ```
        *   Must contain your pricing plans checkout CTA buttons.
    *   `#imagesGallery` — Gallery element to show article images (hidden for free users).
*   **Authentication Flow**:
    *   Uses native Wix member signup/login prompt through Velo `authentication.promptLogin()` from `wix-members-frontend`. No custom lightbox required for login.

### 📄 Issue Archive Page (`herald(archivePage).js`)
Paste the content from [herald(archivePage).js](file:///d:/nouman%20wix%20code/herald/herald(archivePage).js) onto your Archive page:
*   **Wix Elements Needed**:
    *   `#issueDataset` — Dataset connected to `CPA_Herald_Issues` (sorted by issue date descending).
    *   `#issueRepeater` — Repeater in a 3-4 column grid layout. Inside:
        *   `#issueCard` — Container Box for the card (has onClick handler).
        *   `#issueCover` — Image element for the cover.
        *   `#issueTitle` — Text element.
        *   `#issueDate` — Text element.
*   **Required Lightbox ("IssueDetailModal")**:
    *   Create a Wix Lightbox named **"IssueDetailModal"**.
    *   Design the lightbox with:
        *   `#modalCover` — Image element for the large cover.
        *   `#modalTitle` — Text element for the issue title.
        *   `#modalDate` — Text element for the issue date.
        *   `#downloadButton` — Button to download the full PDF.
        *   `#accessDeniedMessage` — Container Box containing the access denied/upgrade message (initially collapsed).
        *   `#upgradeButton` — Button inside the access denied container to redirect to the pricing plan page.
    *   Paste the content from [herald(IssueDetailModal).js](file:///d:/nouman%20wix%20code/herald/herald(IssueDetailModal).js) into the lightbox page code panel in the Wix Editor.
