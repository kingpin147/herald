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
        console.log("herald.web: No article found for id:", articleId);
        return null;
      }
      console.log("herald.web: Article found. title:", article.title, "| premiumPlan:", article.premiumPlan, "| articleText length:", article.articleText ? article.articleText.length : 0);

      // 2. Check if user is authenticated
      let memberId = null;
      try {
        const member = await currentMember.getMember();
        memberId = member ? member._id : null;
      } catch (authErr) {
        // User is not logged in — treat as guest
        memberId = null;
      }

      // 3. If article is not premium, return full content to all logged-in users,
      //    but still show 300-word preview to guests/non-logged-in users
      if (!article.premiumPlan) {
        console.log("herald.web: Article is free (no premiumPlan). memberId:", memberId ? "present" : "null");
        if (!memberId) {
          // Guest — show 300-word preview even for free articles
          article.hookContent = convertHtmlToRichContent(article.articleText, 300);
          console.log("herald.web: Free article, guest — 300w preview nodes:", article.hookContent.nodes.length);
        } else {
          // Logged-in user — show full free article
          article.hookContent = convertHtmlToRichContent(article.articleText, null);
          console.log("herald.web: Free article, member — full content nodes:", article.hookContent.nodes.length);
        }
        article.premiumContent = null;
        article.articleText = null;
        return article;
      }

      // 4. If user is guest, generate truncated preview only
      if (!memberId) {
        console.log("herald.web: Guest user. articleText type:", typeof article.articleText, "| length/keys:", article.articleText ? (typeof article.articleText === 'string' ? article.articleText.length : JSON.stringify(article.articleText).length) : 0);
        article.hookContent = convertHtmlToRichContent(article.articleText, 300);
        console.log("herald.web: hookContent nodes generated (guest 300w):", article.hookContent.nodes.length);
        article.premiumContent = null;
        article.articleText = null;
        return article;
      }

      // 5. User is logged in — check for active paid subscription
      const hasActiveSub = await _checkActiveSubscription();

      if (hasActiveSub) {
        console.log("herald.web: Paid subscriber. Generating full + preview content.");
        article.hookContent = convertHtmlToRichContent(article.articleText, 300);
        article.premiumContent = convertHtmlToRichContent(article.articleText, null);
        console.log("herald.web: premiumContent nodes:", article.premiumContent.nodes.length);
      } else {
        console.log("herald.web: Free member. articleText length:", article.articleText ? article.articleText.length : 0);
        article.hookContent = convertHtmlToRichContent(article.articleText, 300);
        console.log("herald.web: hookContent nodes generated (free 300w):", article.hookContent.nodes.length);
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
 * Converts articleText (either a Wix Ricos JSON object or raw HTML string)
 * into a valid Ricos document for the RichContentViewer.
 * Truncates by word count if maxWords is specified.
 *
 * @param {Object|string} articleText - Ricos JSON object or raw HTML string
 * @param {number|null} maxWords - Maximum word limit for preview (null = full)
 * @returns {Object} Ricos Document JSON object
 */
function convertHtmlToRichContent(articleText, maxWords = null) {
  const emptyDoc = {
    nodes: [],
    metadata: { version: 1, createdTimestamp: new Date().toISOString(), updatedTimestamp: new Date().toISOString() }
  };

  if (!articleText) {
    console.log("herald.web: convertHtmlToRichContent — articleText is null/empty.");
    return emptyDoc;
  }

  // ── Case 1: articleText is already a Ricos JSON object ──────────
  // Wix Rich Content CMS fields return a Ricos document directly.
  if (typeof articleText === 'object' && articleText.nodes) {
    console.log("herald.web: articleText is already a Ricos document. nodes:", articleText.nodes.length);

    if (maxWords === null) {
      // Return full document as-is, ensure metadata exists
      return {
        nodes: articleText.nodes,
        metadata: articleText.metadata || { version: 1, createdTimestamp: new Date().toISOString(), updatedTimestamp: new Date().toISOString() }
      };
    }

    // Truncate by extracting text from nodes up to maxWords
    const truncatedNodes = [];
    let wordCount = 0;
    let limitReached = false;

    for (const node of articleText.nodes) {
      if (limitReached) break;
      if (node.type !== 'PARAGRAPH' && node.type !== 'HEADING') {
        truncatedNodes.push(node);
        continue;
      }

      const textNodes = [];
      for (const child of (node.nodes || [])) {
        if (limitReached) break;
        if (child.type === 'TEXT' && child.textData) {
          const words = (child.textData.text || '').split(/\s+/).filter(w => w.length > 0);
          if (wordCount + words.length > maxWords) {
            const allowed = maxWords - wordCount;
            const truncatedText = words.slice(0, allowed).join(' ') + '...';
            textNodes.push({ ...child, textData: { ...child.textData, text: truncatedText } });
            wordCount = maxWords;
            limitReached = true;
          } else {
            wordCount += words.length;
            textNodes.push(child);
          }
        } else {
          textNodes.push(child);
        }
      }
      if (textNodes.length > 0) {
        truncatedNodes.push({ ...node, nodes: textNodes });
      }
    }

    if (limitReached) {
      truncatedNodes.push({
        type: "PARAGRAPH",
        id: "upgrade_notice",
        nodes: [{ type: "TEXT", id: "", nodes: [], textData: { text: "Upgrade to Premium to read the full article.", decorations: [] } }],
        paragraphData: {}
      });
    }

    console.log("herald.web: Ricos truncation complete. nodes:", truncatedNodes.length, "| words:", wordCount);
    return {
      nodes: truncatedNodes,
      metadata: articleText.metadata || { version: 1, createdTimestamp: new Date().toISOString(), updatedTimestamp: new Date().toISOString() }
    };
  }

  // ── Case 2: articleText is a raw HTML string ─────────────────────
  if (typeof articleText !== 'string') {
    console.log("herald.web: articleText is unknown type:", typeof articleText);
    return emptyDoc;
  }

  console.log("herald.web: convertHtmlToRichContent — HTML string input length:", articleText.length, "| maxWords:", maxWords);

  const contentNodes = [];
  const paragraphs = articleText.split(/<p[^>]*>/i);
  let wordCount = 0;
  let limitReached = false;
  let nodeIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (limitReached) break;

    let pContent = paragraphs[i].split(/<\/p>/i)[0].trim();
    if (!pContent) continue;

    pContent = pContent.replace(/<br\s*\/?>/gi, '\n');
    let text = pContent.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    if (!text || text.trim() === "") continue;

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

    contentNodes.push({
      type: "PARAGRAPH",
      id: "p" + nodeIndex++,
      nodes: [{ type: "TEXT", id: "", nodes: [], textData: { text: text, decorations: [] } }],
      paragraphData: {}
    });
  }

  if (limitReached) {
    contentNodes.push({
      type: "PARAGRAPH",
      id: "upgrade_notice",
      nodes: [{ type: "TEXT", id: "", nodes: [], textData: { text: "Upgrade to Premium to read the full article.", decorations: [] } }],
      paragraphData: {}
    });
  }

  console.log("herald.web: HTML conversion complete. output nodes:", contentNodes.length, "| truncated:", limitReached);
  return {
    nodes: contentNodes,
    metadata: { version: 1, createdTimestamp: new Date().toISOString(), updatedTimestamp: new Date().toISOString() }
  };
}
