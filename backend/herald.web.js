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
 * full articleText payload is explicitly stripped and replaced with a truncated
 * rich content preview, guaranteeing that gated text cannot be stolen.
 */

/**
 * Retrieves an article by its _id, stripping premium content for non-subscribers
 * and dynamically converting the raw HTML body to a Wix Rich Content JSON object.
 *
 * @param {string} articleId - The _id of the article in HeraldArticles.
 * @returns {Promise<Object>} The article object with hookContent and premiumContent properties.
 */
export const getArticleSecure = webMethod(
  Permissions.Anyone,
  async (articleId) => {
    try {
      // 1. Fetch the article from the CMS (HeraldArticles collection)
      const article = await wixData.get("HeraldArticles", articleId, {
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

      // 3. If article is not premium, convert full text to hookContent and return
      if (!article.premiumPlan) {
        article.hookContent = convertHtmlToRichContent(article.articleText, null);
        article.premiumContent = null;
        article.articleText = null; // Strip raw HTML before sending to client
        return article;
      }

      // 4. If user is guest, generate truncated preview only
      if (!memberId) {
        article.hookContent = convertHtmlToRichContent(article.articleText, 300);
        article.premiumContent = null;
        article.articleText = null; // Strip full raw HTML
        return article;
      }

      // 5. User is logged in — check for active paid subscription
      const hasActiveSub = await _checkActiveSubscription();

      if (hasActiveSub) {
        // Subscribed member: return full content under premiumContent, preview under hookContent
        article.hookContent = convertHtmlToRichContent(article.articleText, 300);
        article.premiumContent = convertHtmlToRichContent(article.articleText, null);
      } else {
        // Free member: return truncated preview only
        article.hookContent = convertHtmlToRichContent(article.articleText, 300);
        article.premiumContent = null;
      }

      article.articleText = null; // Strip full raw HTML
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

/**
 * Helper function to convert Raw HTML from the database into a Wix Rich Content JSON object.
 * Truncates text by word count if maxWords is specified.
 *
 * @param {string} htmlString - Raw HTML content
 * @param {number|null} maxWords - Maximum word limit for preview
 * @returns {Object} Ricos Document JSON object
 */
function convertHtmlToRichContent(htmlString, maxWords = null) {
  if (!htmlString) return { nodes: [] };

  const richContent = { nodes: [] };
  // Split the HTML by paragraph tags
  const paragraphs = htmlString.split(/<p[^>]*>/i);
  let wordCount = 0;
  let limitReached = false;

  for (let i = 0; i < paragraphs.length; i++) {
    if (limitReached) break;

    // Get the content inside the paragraph
    let pContent = paragraphs[i].split(/<\/p>/i)[0].trim();
    if (!pContent) continue;

    // Clean up common HTML entities and tags
    pContent = pContent.replace(/<br\s*\/?>/gi, '\n');
    let text = pContent.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

    if (!text || text.trim() === "") continue;

    // Apply truncation if needed
    if (maxWords !== null) {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (wordCount + words.length > maxWords) {
        const allowedWords = maxWords - wordCount;
        text = words.slice(0, allowedWords).join(" ") + "...";
        limitReached = true;
        wordCount += allowedWords;
      } else {
        wordCount += words.length;
      }
    }

    // Create a valid Wix Rich Content PARAGRAPH node
    richContent.nodes.push({
      type: "PARAGRAPH",
      id: "p" + i,
      nodes: [{
        type: "TEXT",
        id: "",
        textData: { text: text }
      }]
    });
  }

  // Add Upgrade notice if truncated
  if (limitReached) {
    richContent.nodes.push({
      type: "PARAGRAPH",
      id: "upgrade_notice",
      nodes: [{
        type: "TEXT",
        id: "",
        textData: { text: "\n\n[Upgrade to Premium to read the full article]" }
      }]
    });
  }

  return richContent;
}
