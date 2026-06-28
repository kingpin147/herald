import wixWindow from "wix-window";

/**
 * IssueDetailModal Lightbox Code
 *
 * This script runs inside the "IssueDetailModal" Lightbox. It receives the
 * issue details and download permissions passed from the Archive page,
 * populates the UI, and handles gated download clicks.
 *
 * Wix Editor Prerequisites:
 *  - Text Elements: #modalTitle, #modalDate
 *  - Image Element: #modalCover
 *  - Button Element: #downloadButton (Download PDF button)
 *  - Button/Link Element: #upgradeButton (Redirects to pricing plans page)
 *  - Box/Container: #accessDeniedMessage (Contains the upsell/gated message, initially collapsed)
 */

$w.onReady(function () {
  // Retrieve the data context passed from the opening page
  const context = wixWindow.lightbox.getContext();

  if (context) {
    _populateUI(context);
  }
});

/**
 * Populates the lightbox components with the passed context data.
 *
 * @param {Object} data - Context data passed from the archive page
 */
function _populateUI(data) {
  // 1. Set Issue Title
  if (data.issueTitle && $w("#modalTitle")) {
    $w("#modalTitle").text = data.issueTitle;
  }

  // 2. Set Issue Date
  if (data.issueDate && $w("#modalDate")) {
    const date = new Date(data.issueDate);
    $w("#modalDate").text = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  }

  // 3. Set Cover Image
  if (data.coverImage && $w("#modalCover")) {
    $w("#modalCover").src = data.coverImage;
  }

  // 4. Handle Gated Download Access
  if (data.allowed && data.pdfUrl) {
    // Member has Level 3 (Print/Digital) or active plan access
    $w("#downloadButton").link = data.pdfUrl;
    $w("#downloadButton").target = "_blank";
    $w("#downloadButton").label = "Download Full Issue (PDF)";
    $w("#downloadButton").expand();

    // Collapse any upsell/access-denied messages
    if ($w("#accessDeniedMessage")) {
      $w("#accessDeniedMessage").collapse();
    }
  } else {
    // Member does not have access or is guest
    // Collapse/disable the download button or set it to prompt upgrade
    $w("#downloadButton").collapse();

    // Show custom upsell message and upgrade button
    if ($w("#accessDeniedMessage")) {
      $w("#accessDeniedMessage").expand();
    }

    if ($w("#upgradeButton")) {
      // Set to redirect to your pricing plans page (change path as needed)
      $w("#upgradeButton").link = "/plans-pricing"; 
    }
  }
}
