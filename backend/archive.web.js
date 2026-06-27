import { Permissions, webMethod } from "wix-web-module";
import wixData from "wix-data";
import { currentMember } from "wix-members-backend";
import { orders } from "wix-pricing-plans-backend";
import { logError } from "backend/logger.web";

/**
 * Backend Security Gate for Issue Archive PDF Downloads.
 *
 * The print_edition_pdf payload is strictly gated and accessible only to
 * Level 3 (Print/Digital) subscribers and above. This module verifies the
 * requesting user's subscription tier before returning the download URL.
 */

/**
 * Returns the PDF download URL for a given issue, ONLY if the user has
 * an active subscription that includes print/digital access.
 *
 * @param {string} issueId - The _id of the issue in CPA_Herald_Issues.
 * @returns {Promise<Object>} { allowed: boolean, pdfUrl: string|null, issueTitle: string }
 */
export const getIssuePdfSecure = webMethod(
  Permissions.Anyone,
  async (issueId) => {
    try {
      // 1. Fetch the issue record
      const issue = await wixData.get("CPA_Herald_Issues", issueId, {
        suppressAuth: true,
      });

      if (!issue) {
        return { allowed: false, pdfUrl: null, issueTitle: "" };
      }

      // 2. Check if user is authenticated
      let memberId = null;
      try {
        const member = await currentMember.getMember();
        memberId = member ? member._id : null;
      } catch (authErr) {
        memberId = null;
      }

      if (!memberId) {
        return {
          allowed: false,
          pdfUrl: null,
          issueTitle: issue.issue_title || "",
        };
      }

      // 3. Verify the user has an active subscription with archive access
      const hasArchiveAccess = await _checkArchiveAccess();

      if (!hasArchiveAccess) {
        return {
          allowed: false,
          pdfUrl: null,
          issueTitle: issue.issue_title || "",
        };
      }

      // 4. Access granted — return the PDF URL
      return {
        allowed: true,
        pdfUrl: issue.print_edition_pdf || null,
        issueTitle: issue.issue_title || "",
      };
    } catch (error) {
      console.error("getIssuePdfSecure failed:", error);
      await logError("archive.web.getIssuePdfSecure", error);
      throw new Error("Could not retrieve issue data.");
    }
  }
);

// ─── Private Helpers ───────────────────────────────────────────────

/**
 * Checks whether the current member has an active subscription that
 * grants access to the issue archive (Level 3: Print/Digital and above).
 *
 * NOTE: Update the plan IDs below to match the actual Wix Pricing Plan IDs
 * for your Print/Digital tiers.
 *
 * @returns {Promise<boolean>}
 */
async function _checkArchiveAccess() {
  try {
    const memberOrders = await orders.listCurrentMemberOrders();

    // Option A: Check for specific plan IDs that include archive access
    // Uncomment and replace with actual plan IDs when known:
    //
    // const archivePlanIds = [
    //   "YOUR_PRINT_DIGITAL_PLAN_ID_HERE",
    //   "YOUR_ALL_ACCESS_PLAN_ID_HERE",
    // ];
    // return memberOrders.some(
    //   (order) => archivePlanIds.includes(order.planId) && order.status === "ACTIVE"
    // );

    // Option B (current default): Any active plan grants archive access.
    // Replace with Option A once specific plan IDs are confirmed.
    return memberOrders.some((order) => order.status === "ACTIVE");
  } catch (error) {
    console.error("Archive access check failed:", error);
    return false;
  }
}
