import { currentMember, authentication } from "wix-members-frontend";
import { getArticleSecure, getUserAccessTier } from "backend/herald.web";

/**
 * Herald Dynamic Item Page
 *
 * Implements the full paywall architecture described in the Phase 0 Blueprint:
 *
 *  1. REGISTRATION WALL (Section 4.1)
 *     Guest users see a Wix native login prompt forcing registration/login.
 *
 *  2. DUAL RICH CONTENT VIEWERS (Section 3.1)
 *     Two stacked RichContentViewer elements:
 *       #hookContentViewer    → populated programmatically with hookContent (free preview)
 *       #premiumContentViewer → populated programmatically with premiumContent (gated)
 *
 *  3. CSS BLUR PAYWALL (Section 4.2)
 *     Free registered users see hookContent, then a CSS blur gradient
 *     (.paywall-fade-overlay with backdrop-filter: blur(10px)) dissolving
 *     the text, with the subscription banner overlaid.
 *
 *  4. ZERO-TRUST BACKEND (Section 4.3)
 *     Premium content is NEVER sent to the client for non-subscribers.
 *     The backend gateway (backend/herald.web.js) strips it and returns null.
 *
 *  5. PREMIUM EXPERIENCE (Section 4.4)
 *     Paid subscribers see the full article with no blur, no banner,
 *     and the image gallery expanded.
 *
 * Wix Editor Prerequisites:
 *  - A Dataset element (#dynamicDataset) bound to HeraldArticles.
 *  - Text elements: #title, #authorName
 *  - Image element: #bannerImage
 *  - RichContentViewer: #hookContentViewer (unbound in Editor)
 *  - RichContentViewer: #premiumContentViewer (unbound in Editor)
 *  - Container/Box: #paywallOverlay (contains the blur + subscription banner)
 *  - Gallery element: #imagesGallery
 */

$w.onReady(function () {
  $w("#dynamicDataset").onReady(async () => {
    console.log("Herald Item Page: Dataset ready.");

    try {
      // ─── Step 1: Determine user access tier ─────────────────────
      const accessTier = await _determineAccessTier();
      console.log("Herald Item Page: Access tier:", accessTier);

      // ─── Step 2: Handle guest users — Registration Wall ─────────
      if (!accessTier.isLoggedIn) {
        await _handleGuestUser();
        return; // After login, the page will reload or we re-check
      }

      // ─── Step 3: Get article data from the dataset ──────────────
      const item = $w("#dynamicDataset").getCurrentItem();
      if (!item) {
        console.error("Herald Item Page: No current item in dataset.");
        return;
      }

      // ─── Step 4: Populate common UI elements ────────────────────
      _populateCommonUI(item);

      // ─── Step 5: Fetch secure article (backend strips premium if needed)
      const secureArticle = await getArticleSecure(item._id);

      // ─── Step 6: Render based on access level ───────────────────
      if (accessTier.hasPremium) {
        _renderPremiumExperience(item, secureArticle);
      } else {
        _renderFreeExperience(item, secureArticle);
      }

      console.log("Herald Item Page: Render complete.");
    } catch (error) {
      console.error("Herald Item Page: Fatal error:", error.message, error.stack);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ACCESS TIER DETERMINATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Determines the user's access tier by calling the backend gateway.
 * Falls back to a local check if the backend call fails.
 *
 * @returns {Promise<{isLoggedIn: boolean, hasPremium: boolean}>}
 */
async function _determineAccessTier() {
  try {
    return await getUserAccessTier();
  } catch (err) {
    console.error("Herald Item Page: getUserAccessTier failed, falling back:", err);

    // Fallback: local check
    try {
      const member = await currentMember.getMember();
      return { isLoggedIn: !!member, hasPremium: false };
    } catch (e) {
      return { isLoggedIn: false, hasPremium: false };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// GUEST USER — REGISTRATION WALL (Section 4.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * Handles guest (unregistered/logged-out) users by prompting them
 * to log in/register using the native Wix authentication modal.
 *
 * After successful login, the page is refreshed to re-evaluate access.
 */
async function _handleGuestUser() {
  console.log("Herald Item Page: Guest user detected, showing registration wall.");

  // Collapse all content sections — only the banner image remains visible
  _collapseAllContent();

  try {
    // Prompt the user to log in using the native Wix login/signup UI
    await authentication.promptLogin();

    // Check if login succeeded and refresh the dataset
    const member = await currentMember.getMember();
    if (member) {
      $w("#dynamicDataset").refresh();
    }
  } catch (err) {
    console.error("Herald Item Page: Login prompt failed or cancelled:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMMON UI POPULATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Populates UI elements shared between free and premium experiences:
 * title, author name, and banner image.
 *
 * @param {Object} item - The current dataset item.
 */
function _populateCommonUI(item) {
  // Title
  if ($w("#title").text !== undefined) {
    $w("#title").text = item.title || "";
  }

  // Author name (database uses authorName)
  if ($w("#authorName").text !== undefined) {
    $w("#authorName").text = item.authorName || "";
  }

  // Banner image (database uses bannerImage)
  if (item.bannerImage && $w("#bannerImage").src !== undefined) {
    $w("#bannerImage").src = item.bannerImage;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FREE EXPERIENCE — CSS BLUR PAYWALL (Sections 4.2)
// ═══════════════════════════════════════════════════════════════════

/**
 * Renders the experience for free registered users (Level 0):
 *  - Shows the hookContent preview via #hookContentViewer
 *  - Expands the paywall blur overlay at the bottom of the hook
 *  - Shows the subscription banner over the blurred area
 *  - Collapses the premium content viewer and gallery
 *
 * @param {Object} item - The current dataset item.
 * @param {Object} secureArticle - The secure article object from backend.
 */
function _renderFreeExperience(item, secureArticle) {
  console.log("Herald Item Page: Rendering FREE experience.");

  // Show the hook content viewer (populated dynamically from backend)
  if (secureArticle && secureArticle.hookContent) {
    $w("#hookContentViewer").content = secureArticle.hookContent;
  }
  $w("#hookContentViewer").expand();

  // Expand the paywall overlay (blur + subscription banner)
  // The #paywallOverlay container must have the CSS class .paywall-fade-overlay
  // applied in the Editor with:
  //   backdrop-filter: blur(10px);
  //   background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95));
  $w("#paywallOverlay").expand();

  // Collapse premium content — it's null from the backend anyway,
  // but we hide the viewer element for a clean layout
  $w("#premiumContentViewer").collapse();

  // Collapse the image gallery for free users
  $w("#imagesGallery").collapse();
}

// ═══════════════════════════════════════════════════════════════════
// PREMIUM EXPERIENCE (Section 4.4)
// ═══════════════════════════════════════════════════════════════════

/**
 * Renders the experience for paid subscribers:
 *  - Shows the hook content (beginning of article)
 *  - Collapses the paywall blur overlay
 *  - Populates and expands the premium content viewer
 *  - Shows the image gallery
 *
 * @param {Object} item - The current dataset item.
 * @param {Object} secureArticle - The article object from the backend.
 */
function _renderPremiumExperience(item, secureArticle) {
  console.log("Herald Item Page: Rendering PREMIUM experience.");

  // Show the hook content viewer
  if (secureArticle && secureArticle.hookContent) {
    $w("#hookContentViewer").content = secureArticle.hookContent;
  }
  $w("#hookContentViewer").expand();

  // Collapse the paywall overlay — no blur, no banner
  $w("#paywallOverlay").collapse();

  // Show the premium content viewer
  if (secureArticle && secureArticle.premiumContent) {
    $w("#premiumContentViewer").content = secureArticle.premiumContent;
  }
  $w("#premiumContentViewer").expand();

  // Show the image gallery (database uses imagesGallery)
  if (item.imagesGallery && item.imagesGallery.length > 0) {
    $w("#imagesGallery").items = item.imagesGallery.map((img) => ({
      type: "image",
      src: img.src,
      title: img.title || "",
      description: img.description || "",
    }));
    $w("#imagesGallery").expand();
  } else {
    $w("#imagesGallery").collapse();
  }
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Collapses all content sections. Used when displaying the registration
 * wall to guests — only the banner image remains visible.
 */
function _collapseAllContent() {
  try { $w("#hookContentViewer").collapse(); } catch (e) { /* element may not exist */ }
  try { $w("#premiumContentViewer").collapse(); } catch (e) { /* element may not exist */ }
  try { $w("#paywallOverlay").collapse(); } catch (e) { /* element may not exist */ }
  try { $w("#imagesGallery").collapse(); } catch (e) { /* element may not exist */ }
}
