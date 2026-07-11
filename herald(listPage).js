import wixData from "wix-data";
import wixLocation from "wix-location";
import { currentMember } from "wix-members-frontend";

/**
 * Herald Primary Feed (List Page)
 *
 * Renders a dynamic, article-led feed of individual article cards using a
 * Wix Repeater bound to the HeraldArticles collection. Supports:
 *
 *  - Card composition: coverImage, title, authorName, category tags
 *  - Premium badge overlay for gated articles (premiumPlan === true)
 *  - Interactive hashtag filtering via Selection Tags (no page reload)
 *  - Free-text search against title and authorName
 *  - Click-through navigation to the dynamic item page
 *  - Sort dropdown (#sort) with the following options:
 *
 *      Wix Dropdown Options to configure in the Editor:
 *      ┌──────────────────────────────────┬───────────────────────┐
 *      │ Label (shown to user)            │ Value (used in code)  │
 *      ├──────────────────────────────────┼───────────────────────┤
 *      │ Newest First                     │ date_desc             │
 *      │ Oldest First (Chronological)     │ date_asc              │
 *      │ Title: A → Z                     │ title_asc             │
 *      │ Title: Z → A                     │ title_desc            │
 *      │ Author: A → Z                    │ author_asc            │
 *      │ Author: Z → A                    │ author_desc           │
 *      │ Issue: Latest First              │ issue_desc            │
 *      │ Issue: Oldest First              │ issue_asc             │
 *      │ Subscriber Exclusives First      │ premium_first         │
 *      └──────────────────────────────────┴───────────────────────┘
 *
 * Wix Editor Prerequisites:
 *  - A Dataset element (#dynamicDataset) bound to HeraldArticles,
 *    sorted by published_date descending.
 *  - A Repeater element (#articleRepeater) with the following child elements
 *    inside each repeated item:
 *      #coverImage   — Image element for the article thumbnail
 *      #articleTitle  — Text element for the article title
 *      #authorName    — Text element for the author name
 *      #categoryLabel — Text element for displaying category tags
 *      #premiumBadge  — Container/Box element (lock icon or "Subscriber
 *                       Exclusive" label), initially collapsed in the Editor
 *      #cardContainer — The outermost Box/Container for click handling
 *  - A Selection Tags element (#categoryTags) above the repeater.
 *  - A Text Input element (#searchInput) and Button (#searchButton).
 *  - A Dropdown element (#sort) with options configured as the table above.
 *  - A Text element (#noResultsText), initially collapsed.
 */

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════

/** Currently active category tag selection */
let _activeTags = [];

/** Currently active sort value — matches dropdown option values */
let _activeSort = "date_desc"; // Default: Newest First

// ═══════════════════════════════════════════════════════════════════
// SORT CONFIGURATION MAP
// ═══════════════════════════════════════════════════════════════════

/**
 * Maps each dropdown value to a wixData sort configuration.
 * field:     The CMS field name to sort on.
 * direction: "asc" or "desc"
 * secondary: Optional secondary sort for tiebreaking.
 */
const SORT_CONFIG = {
  date_desc:     { field: "publishedDate",  direction: "desc", secondary: { field: "title", direction: "asc" } },
  date_asc:      { field: "publishedDate",  direction: "asc",  secondary: { field: "title", direction: "asc" } },
  title_asc:     { field: "title",          direction: "asc",  secondary: { field: "publishedDate", direction: "desc" } },
  title_desc:    { field: "title",          direction: "desc", secondary: { field: "publishedDate", direction: "desc" } },
  author_asc:    { field: "authorName",     direction: "asc",  secondary: { field: "title", direction: "asc" } },
  author_desc:   { field: "authorName",     direction: "desc", secondary: { field: "title", direction: "asc" } },
  issue_desc:    { field: "issueNumber",    direction: "desc", secondary: { field: "publishedDate", direction: "desc" } },
  issue_asc:     { field: "issueNumber",    direction: "asc",  secondary: { field: "publishedDate", direction: "asc" } },
  premium_first: { field: "premiumPlan",    direction: "desc", secondary: { field: "publishedDate", direction: "desc" } },
};

// ═══════════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════════

$w.onReady(function () {
  console.log("Herald List Page: $w.onReady triggered.");

  _setupRepeater();
  _setupCategoryFiltering();
  _setupSortDropdown();

  $w("#dynamicDataset").onReady(() => {
    console.log("Herald List Page: Dataset onReady fired.");
    // Apply default sort on initial load
    _applySort(_activeSort).then(() => _refreshRepeater());
  });
});

// ═══════════════════════════════════════════════════════════════════
// SORT DROPDOWN
// ═══════════════════════════════════════════════════════════════════

/**
 * Listens for changes on the #sort dropdown.
 * Programmatically injects all option labels so they appear without
 * manual configuration in the Wix Studio editor.
 */
function _setupSortDropdown() {
  // ── Inject all sort option labels into the dropdown ──────────────
  $w("#sort").options = [
    { label: "Newest First",                 value: "date_desc"     },
    { label: "Oldest First (Chronological)", value: "date_asc"      },
    { label: "Title: A → Z",                 value: "title_asc"     },
    { label: "Title: Z → A",                 value: "title_desc"    },
    { label: "Author: A → Z",                value: "author_asc"    },
    { label: "Author: Z → A",                value: "author_desc"   },
    { label: "Issue: Latest First",          value: "issue_desc"    },
    { label: "Issue: Oldest First",          value: "issue_asc"     },
    { label: "Subscriber Exclusives First",  value: "premium_first" },
  ];

  // Set default visual selection to match _activeSort
  $w("#sort").value = _activeSort;

  $w("#sort").onChange((event) => {
    _activeSort = event.target.value;
    console.log("Herald List Page: Sort changed to:", _activeSort);

    _applySort(_activeSort)
      .then(() => _refreshRepeater())
      .catch((err) => console.error("Herald List Page: Sort failed:", err));
  });
}

/**
 * Builds and applies a wixData sort to the dataset based on the sort key.
 *
 * @param {string} sortKey - One of the keys in SORT_CONFIG.
 * @returns {Promise}
 */
function _applySort(sortKey) {
  const config = SORT_CONFIG[sortKey];
  if (!config) {
    console.warn("Herald List Page: Unknown sort key:", sortKey);
    return Promise.resolve();
  }

  // Build sort object
  let sort = wixData.sort();

  if (config.direction === "asc") {
    sort = sort.ascending(config.field);
  } else {
    sort = sort.descending(config.field);
  }

  // Apply secondary sort for tiebreaking
  if (config.secondary) {
    if (config.secondary.direction === "asc") {
      sort = sort.ascending(config.secondary.field);
    } else {
      sort = sort.descending(config.secondary.field);
    }
  }

  console.log(`Herald List Page: Applying sort — primary: ${config.field} ${config.direction}`);
  return $w("#dynamicDataset").setSort(sort);
}

// ═══════════════════════════════════════════════════════════════════
// REPEATER SETUP
// ═══════════════════════════════════════════════════════════════════

/**
 * Configures the repeater's onItemReady callback to populate each card.
 */
function _setupRepeater() {
  console.log("Herald List Page: Registering onItemReady on #articleRepeater");
  $w("#articleRepeater").onItemReady(($item, itemData, index) => {
    console.log(`Herald List Page: onItemReady index ${index}`, itemData);

    // Cover image
    if (itemData.coverImage) {
      $item("#coverImage").src = itemData.coverImage;
    }

    // Title
    $item("#articleTitle").text = itemData.title || "";

    // Author name
    $item("#authorName").text = itemData.authorName || "";

    // Category tags
    if (itemData.category_tags && itemData.category_tags.length > 0) {
      $item("#categoryLabel").options = itemData.category_tags.map(tag => ({ label: tag, value: tag }));
      $item("#categoryLabel").value = itemData.category_tags;
    } else {
      $item("#categoryLabel").options = [];
      $item("#categoryLabel").value = [];
    }

    // Premium badge overlay
    if (itemData.premiumPlan) {
      $item("#premiumBadge").expand();
    } else {
      $item("#premiumBadge").collapse();
    }

    // Click → navigate to dynamic item page
    $item("#cardContainer").onClick(() => {
      const dynamicUrl = itemData["link-herald-articles-title"];
      console.log(`Herald List Page: Clicked index ${index}. URL:`, dynamicUrl);
      if (dynamicUrl) {
        wixLocation.to(dynamicUrl);
      }
    });
  });
}

/**
 * Manually fetches items from the dataset and populates the repeater.
 */
function _refreshRepeater() {
  console.log("Herald List Page: Refreshing repeater data from dataset...");
  $w("#dynamicDataset").getItems(0, 100)
    .then((result) => {
      console.log("Herald List Page: Retrieved items count =", result.items.length);
      $w("#articleRepeater").data = result.items;

      // Show/hide no-results message
      if (result.items.length === 0) {
        $w("#noResultsText").expand();
      } else {
        $w("#noResultsText").collapse();
      }
    })
    .catch((err) => {
      console.error("Herald List Page: Failed to refresh repeater:", err);
    });
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY TAG FILTERING
// ═══════════════════════════════════════════════════════════════════

/**
 * Listens for changes on the Selection Tags element and dynamically
 * filters the dataset without triggering a page reload.
 * Preserves the active sort after filter is re-applied.
 */
function _setupCategoryFiltering() {
  $w("#categoryTags").onChange((event) => {
    _activeTags = event.target.value; // Array of selected tag labels
    console.log("Herald List Page: tag selection changed:", _activeTags);
    _applyFilters(_activeTags);
  });
}

// ═══════════════════════════════════════════════════════════════════
// COMBINED FILTER + SORT APPLICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Applies tag filters to the dataset, then re-applies the active sort.
 * Wix resets sort when setFilter() is called, so we must chain both.
 *
 * @param {Array<string>} selectedTags - Currently selected category tags.
 */
function _applyFilters(selectedTags) {
  console.log("Herald List Page: applying filters:", selectedTags);
  let filter = wixData.filter();

  if (selectedTags && selectedTags.length > 0) {
    filter = filter.hasSome("category_tags", selectedTags);
  }

  $w("#dynamicDataset")
    .setFilter(filter)
    .then(() => {
      // Re-apply the current sort after filter reset
      return _applySort(_activeSort);
    })
    .then(() => {
      const count = $w("#dynamicDataset").getTotalCount();
      console.log(`Herald List Page: Filter + sort applied. ${count} results.`);
      _refreshRepeater();
    })
    .catch((err) => {
      console.error("Herald List Page: Filter/sort failed:", err);
    });
}
