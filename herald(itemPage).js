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
 *  2. SINGLE RICH CONTENT VIEWER
 *     One #richContentViewer element populated programmatically with
 *     either truncated hookContent or full premiumContent from the backend.
 *
 *  3. PAYWALL (#planUi)
 *     Free registered users see the truncated content (300 words from backend)
 *     with the #planUi subscription banner box expanded.
 *
 *  4. ZERO-TRUST BACKEND (Section 4.3)
 *     Premium content is NEVER sent to the client for non-subscribers.
 *     The backend gateway (backend/herald.web.js) strips it and returns null.
 *
 *  5. PREMIUM EXPERIENCE (Section 4.4)
 *     Paid subscribers see the full article with no banner,
 *     and the image gallery expanded.
 *
 * Wix Editor Prerequisites:
 *  - A Dataset element (#dynamicDataset) bound to HeraldArticles.
 *  - Text elements: #title, #authorName
 *  - Image element: #bannerImage
 *  - RichContentViewer: #richContentViewer (unbound in Editor)
 *  - Container/Box: #planUi (subscription banner, initially collapsed)
 *  - Gallery element: #imagesGallery
 */

$w.onReady(async function () {
  $w("#dynamicDataset").onReady(async () => {
    console.log("Herald Item Page: Dataset ready.");

    try {
      // ─── Step 1: Determine user access tier ─────────────────────
      const accessTier = await _determineAccessTier();
      console.log("Herald Item Page: Access tier:", accessTier);

      // ─── Step 2: Get article data from the dataset ──────────────
      const item = $w("#dynamicDataset").getCurrentItem();
      if (!item) {
        console.error("Herald Item Page: No current item in dataset.");
        return;
      }

      // ─── Step 3: Populate common UI elements (always, even for guests)
      _populateCommonUI(item);

      // ─── Step 4: Handle guest users — Registration Wall ─────────
      if (!accessTier.isLoggedIn) {
        await _handleGuestUser();
        return; // After login, the page will reload or we re-check
      }

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
// FREE EXPERIENCE — PAYWALL (Section 4.2)
// ═══════════════════════════════════════════════════════════════════

/**
 * Renders the experience for free registered users (Level 0):
 *  - Shows the content preview via #richContentViewer
 *  - Expands the #planUi box (subscription banner)
 *  - Collapses the image gallery
 *
 * @param {Object} item - The current dataset item.
 * @param {Object} secureArticle - The secure article object from backend.
 */
function _renderFreeExperience(item, secureArticle) {
  console.log("Herald Item Page: Rendering FREE experience.");

  // Show content in the single rich content viewer
  try {
    const content = secureArticle.premiumContent || secureArticle.hookContent;
    if (content) {
      $w("#richContentViewer").content = content;
    }
    $w("#richContentViewer").expand();
  } catch (e) {
    console.warn("Herald Item Page: #richContentViewer failed:", e);
  }

  // Expand the plan UI box (subscription banner)
  try {
    $w("#planUi").expand();
  } catch (e) {
    console.warn("Herald Item Page: #planUi does not exist:", e);
  }

  // Collapse the image gallery for free users
  try {
    $w("#imagesGallery").collapse();
  } catch (e) {
    console.warn("Herald Item Page: #imagesGallery does not exist:", e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PREMIUM EXPERIENCE (Section 4.4)
// ═══════════════════════════════════════════════════════════════════

/**
 * Renders the experience for paid subscribers:
 *  - Shows the full article via #richContentViewer
 *  - Collapses the #planUi box
 *  - Shows the image gallery
 *
 * @param {Object} item - The current dataset item.
 * @param {Object} secureArticle - The article object from the backend.
 */
function _renderPremiumExperience(item, secureArticle) {
  console.log("Herald Item Page: Rendering PREMIUM experience.");

  // Show content in the single rich content viewer
  try {
    const content = secureArticle.premiumContent || secureArticle.hookContent;
    if (content) {
      $w("#richContentViewer").content = content;
    }
    $w("#richContentViewer").expand();
  } catch (e) {
    console.warn("Herald Item Page: #richContentViewer failed:", e);
  }

  // Collapse the plan UI box — no banner for subscribers
  try {
    $w("#planUi").collapse();
  } catch (e) {
    console.warn("Herald Item Page: #planUi does not exist:", e);
  }

  // Show the image gallery (database uses imagesGallery)
  try {
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
  } catch (e) {
    console.warn("Herald Item Page: #imagesGallery failed:", e);
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
  try { $w("#richContentViewer").collapse(); } catch (e) { /* element may not exist */ }
  try { $w("#planUi").collapse(); } catch (e) { /* element may not exist */ }
  try { $w("#imagesGallery").collapse(); } catch (e) { /* element may not exist */ }
}
