import { Permissions, webMethod } from "wix-web-module";
import wixData from "wix-data";
import { currentMember } from "wix-members-backend";
import { orders } from "wix-pricing-plans-backend";
import { logError } from "backend/logger.web";

/**
 * Zero-Trust Backend Gateway for Herald Articles.
 *
 * This module acts as a secure intermediary between the CMS and the client.
 * It verifies the requesting user's live subscription status before
 * transmitting any premium content. If the user is unauthorized, the
 * premium_content_html payload is explicitly stripped to null, guaranteeing
 * that gated text cannot be stolen via source-code inspection or dev tools.
 */

/**
 * Retrieves an article by its _id, stripping premium content for non-subscribers.
 * The frontend must call this instead of reading the dataset directly for
 * premium_content_html to ensure zero-trust security.
 *
 * @param {string} articleId - The _id of the article in CPA_Herald_Articles.
 * @returns {Promise<Object>} The article object with premium content stripped if unauthorized.
 */
export const getArticleSecure = webMethod(
  Permissions.Anyone,
  async (articleId) => {
    try {
      // 1. Fetch the article from the CMS
      const article = await wixData.get("CPA_Herald_Articles", articleId, {
        suppressAuth: true,
      });

      if (!article) {
        return null;
      }

      // 2. Check if user is authenticated
      let memberId = null;
      try {
        const member = await currentMember.getMember();
        memberId = member ? member._id : null;
      } catch (authErr) {
        // User is not logged in — treat as guest
        memberId = null;
      }

      // 3. If article is not premium, return it as-is
      if (!article.is_premium) {
        return article;
      }

      // 4. If user is not logged in, strip ALL content except hook
      if (!memberId) {
        article.premium_content_html = null;
        return article;
      }

      // 5. User is logged in — check for an active paid subscription
      const hasActiveSub = await _checkActiveSubscription();

      if (!hasActiveSub) {
        // Free-tier member: strip premium content server-side
        article.premium_content_html = null;
      }

      return article;
    } catch (error) {
      console.error("getArticleSecure failed:", error);
      await logError("herald.web.getArticleSecure", error);
      throw new Error("Could not retrieve article.");
    }
  }
);

/**
 * Lightweight endpoint for the frontend to check a user's content access tier.
 * Returns an object describing the user's access level so the frontend can
 * render the correct UI (registration wall, blur paywall, or full access).
 *
 * @returns {Promise<Object>} { isLoggedIn: boolean, hasPremium: boolean }
 */
export const getUserAccessTier = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      let isLoggedIn = false;
      let hasPremium = false;

      try {
        const member = await currentMember.getMember();
        isLoggedIn = !!member;
      } catch (e) {
        isLoggedIn = false;
      }

      if (isLoggedIn) {
        hasPremium = await _checkActiveSubscription();
      }

      return { isLoggedIn, hasPremium };
    } catch (error) {
      console.error("getUserAccessTier failed:", error);
      await logError("herald.web.getUserAccessTier", error);
      return { isLoggedIn: false, hasPremium: false };
    }
  }
);

// ─── Private Helpers ───────────────────────────────────────────────

/**
 * Checks whether the currently authenticated member has any active
 * paid pricing plan subscription.
 *
 * @returns {Promise<boolean>}
 */
async function _checkActiveSubscription() {
  try {
    const memberOrders = await orders.listCurrentMemberOrders();
    return memberOrders.some((order) => order.status === "ACTIVE");
  } catch (error) {
    console.error("Subscription check failed:", error);
    return false;
  }
}
