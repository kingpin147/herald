import { currentMember, authentication } from "wix-members-frontend";
import { openLightbox } from "wix-window";
import { getArticleSecure, getUserAccessTier } from "backend/herald.web";

/**
 * Herald Dynamic Item Page
 *
 * Implements the full paywall architecture described in the Phase 0 Blueprint:
 *
 *  1. REGISTRATION WALL (Section 4.1)
 *     Guest users see a NYT-style lightbox modal forcing login/registration.
 *     The article hero image is visible in the background.
 *
 *  2. DUAL RICH CONTENT VIEWERS (Section 3.1)
 *     Two stacked RichContentViewer elements:
 *       #hookContentViewer    → bound to hook_300_words (free preview)
 *       #premiumContentViewer → bound to premium_content_html (gated)
 *
 *  3. CSS BLUR PAYWALL (Section 4.2)
 *     Free registered users see hook_300_words, then a CSS blur gradient
 *     (.paywall-fade-overlay with backdrop-filter: blur(10px)) dissolving
 *     the text, with the subscription banner overlaid.
 *
 *  4. ZERO-TRUST BACKEND (Section 4.3)
 *     premium_content_html is NEVER sent to the client for non-subscribers.
 *     The backend/herald.web.js gateway strips it server-side.
 *
 *  5. PREMIUM EXPERIENCE (Section 4.4)
 *     Paid subscribers see the full article with no blur, no banner,
 *     and the image gallery expanded.
 *
 * Wix Editor Prerequisites:
 *  - A Dataset element (#dynamicDataset) bound to CPA_Herald_Articles.
 *  - Text elements: #title, #authorName
 *  - Image element: #bannerImage
 *  - RichContentViewer: #hookContentViewer (bound to hook_300_words)
 *  - RichContentViewer: #premiumContentViewer (bound to premium_content_html)
 *  - Container/Box: #paywallOverlay (contains the blur + subscription banner)
 *       Inside: #blurContainer (the CSS blur div)
 *       Inside: #subscriptionBanner (pricing plans CTA)
 *  - Gallery element: #imagesGallery
 *  - A Lightbox named "LoginModal" designed in the Editor (NYT-style)
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
        _renderFreeExperience(item);
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
 * Handles guest (unregistered/logged-out) users by opening the
 * NYT-style login lightbox. The article hero image remains visible
 * in the background while scrolling is effectively blocked by the lightbox.
 *
 * After successful login, the page is refreshed to re-evaluate access.
 */
async function _handleGuestUser() {
  console.log("Herald Item Page: Guest user detected, showing registration wall.");

  // Collapse all content sections — only the banner image remains visible
  _collapseAllContent();

  try {
    // Open the NYT-style login lightbox
    // The lightbox should be designed in the Wix Editor with:
    //   - "Read this article for free." header
    //   - "Log in to continue." sub-header
    //   - Email input + Continue button
    //   - Google/Apple OAuth buttons
    //   - "See subscription options" upsell footer link
    const lightboxResult = await openLightbox("LoginModal");

    // If we get here, the lightbox closed — check if login succeeded
    const member = await currentMember.getMember();
    if (member) {
      // Login successful — reload to re-render with proper access
      $w("#dynamicDataset").refresh();
    }
  } catch (err) {
    console.error("Herald Item Page: Login lightbox failed:", err);

    // Fallback: use the native Wix authentication prompt
    try {
      await authentication.promptLogin();
      $w("#dynamicDataset").refresh();
    } catch (loginErr) {
      console.error("Herald Item Page: Fallback login failed:", loginErr);
    }
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

  // Author name
  if ($w("#authorName").text !== undefined) {
    $w("#authorName").text = item.author_name || "";
  }

  // Banner image
  if (item.banner_image && $w("#bannerImage").src !== undefined) {
    $w("#bannerImage").src = item.banner_image;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FREE EXPERIENCE — CSS BLUR PAYWALL (Sections 4.2)
// ═══════════════════════════════════════════════════════════════════

/**
 * Renders the experience for free registered users (Level 0):
 *  - Shows the hook_300_words preview via #hookContentViewer
 *  - Expands the paywall blur overlay at the bottom of the hook
 *  - Shows the subscription banner over the blurred area
 *  - Collapses the premium content viewer and gallery
 *
 * @param {Object} item - The current dataset item.
 */
function _renderFreeExperience(item) {
  console.log("Herald Item Page: Rendering FREE experience.");

  // Show the hook content viewer (bound to hook_300_words via dataset)
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
 * @param {Object} secureArticle - The article object from the backend
 *                                 (with premium_content_html intact).
 */
function _renderPremiumExperience(item, secureArticle) {
  console.log("Herald Item Page: Rendering PREMIUM experience.");

  // Show the hook content viewer (beginning of article)
  $w("#hookContentViewer").expand();

  // Collapse the paywall overlay — no blur, no banner
  $w("#paywallOverlay").collapse();

  // Show the premium content viewer
  // If the backend returned the premium content, bind it
  if (secureArticle && secureArticle.premium_content_html) {
    $w("#premiumContentViewer").content = secureArticle.premium_content_html;
  }
  $w("#premiumContentViewer").expand();

  // Show the image gallery
  if (item.images_gallery && item.images_gallery.length > 0) {
    $w("#imagesGallery").items = item.images_gallery.map((img) => ({
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
