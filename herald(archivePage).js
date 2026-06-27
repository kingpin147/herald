import wixData from "wix-data";
import wixWindow from "wix-window";
import { currentMember } from "wix-members-frontend";
import { getIssuePdfSecure } from "backend/archive.web";

/**
 * Herald Issue Archive Page
 *
 * Renders a clean, minimalist 3-4 column grid of full magazine covers,
 * emulating the AD Archive page (Image 9 in the Blueprint).
 *
 * Architecture & Visual Strategy:
 *  - A secondary page acting as a historical library
 *  - Clean, minimalist grid layout (3 or 4 columns) displaying
 *    high-resolution, full magazine covers
 *  - Emulates a premium "coffee table book" index
 *  - Clicking a cover opens a lightbox with issue details +
 *    "Download Full Issue" CTA
 *  - PDF download is gated — only Level 3 (Print/Digital) subscribers
 *
 * Wix Editor Prerequisites:
 *  - A Dataset element (#issueDataset) bound to CPA_Herald_Issues,
 *    sorted by issue_date descending.
 *  - A Repeater element (#issueRepeater) in a 3- or 4-column grid layout,
 *    with the following child elements inside each repeated item:
 *      #issueCover    — Image element for the magazine cover
 *      #issueTitle    — Text element for the issue title
 *      #issueDate     — Text element for the issue date
 *      #issueCard     — The outermost Box/Container for click handling
 *  - A Lightbox named "IssueDetailModal" designed in the Editor with:
 *      - Large cover image display
 *      - Issue title and date
 *      - "Download Full Issue" button
 *      - Access-denied message for non-subscribers
 */

$w.onReady(function () {
  $w("#issueDataset").onReady(() => {
    console.log("Herald Archive Page: Dataset ready.");

    _setupIssueRepeater();
  });
});

// ═══════════════════════════════════════════════════════════════════
// REPEATER SETUP
// ═══════════════════════════════════════════════════════════════════

/**
 * Configures the repeater to render each magazine cover card.
 */
function _setupIssueRepeater() {
  $w("#issueRepeater").onItemReady(($item, itemData, index) => {
    // Cover image
    if (itemData.cover_image) {
      $item("#issueCover").src = itemData.cover_image;
    }

    // Issue title
    $item("#issueTitle").text = itemData.issue_title || "";

    // Issue date — format as readable string
    if (itemData.issue_date) {
      const date = new Date(itemData.issue_date);
      const options = { year: "numeric", month: "long" };
      $item("#issueDate").text = date.toLocaleDateString("en-US", options);
    } else {
      $item("#issueDate").text = "";
    }

    // Click handler — open issue detail lightbox
    $item("#issueCard").onClick(async () => {
      await _openIssueDetail(itemData);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// ISSUE DETAIL LIGHTBOX
// ═══════════════════════════════════════════════════════════════════

/**
 * Opens the IssueDetailModal lightbox, passing the issue data.
 * The lightbox handles displaying the cover, title, and the
 * "Download Full Issue" CTA with backend-gated security.
 *
 * @param {Object} issueData - The current issue item from the dataset.
 */
async function _openIssueDetail(issueData) {
  try {
    // Check access via the secure backend before opening the lightbox
    const accessResult = await getIssuePdfSecure(issueData._id);

    // Pass data to the lightbox
    const lightboxData = {
      issueId: issueData._id,
      issueTitle: issueData.issue_title || "",
      coverImage: issueData.cover_image || "",
      issueDate: issueData.issue_date || "",
      allowed: accessResult.allowed,
      pdfUrl: accessResult.pdfUrl,
    };

    await wixWindow.openLightbox("IssueDetailModal", lightboxData);
  } catch (err) {
    console.error("Herald Archive Page: Failed to open issue detail:", err);
  }
}
