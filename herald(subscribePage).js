import { currentMember, authentication } from "wix-members-frontend";
import wixPayFrontend from "wix-pay-frontend";
import wixLocation from "wix-location";
import wixWindow from "wix-window-frontend";
import { getPricingPlans, createSubscriptionPayment, getMemberSubscriptionDetails } from "backend/pricing.web";

/**
 * Herald Subscription & Pricing Plans Page (HTML Component Architecture)
 *
 * Coordinates between the frontend HTML Component (#htmlComponent1) and Wix Velo backend:
 * 1. Pushes dynamic pricing plan data from CMS ('SubscriptionsPlan') to the iframe.
 * 2. Pushes live member subscription status from 'SubscriptionUserData' to the iframe.
 * 3. Listens for user interactions via onMessage ('SUBSCRIBE_CLICK', 'OPEN_LIGHTBOX').
 * 4. Strictly verifies member authentication before launching Wix Pay modal.
 * 5. Handles post-checkout fulfillment & navigation.
 *
 * Wix Editor Setup:
 * - Add an HTML Component element to your page.
 * - Set its ID to: #htmlComponent1
 * - Paste the content of html_component/subscribe.html into the component code box.
 */

$w.onReady(function () {
  console.log("Herald Subscribe Page: Initializing HTML Component bridge...");

  // 1. Setup bidirectional message listener with HTML component
  try {
    $w("#htmlComponent1").onMessage(async (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      console.log("Herald Subscribe Page: Received event from iframe:", data.type);

      switch (data.type) {
        case "IFRAME_READY":
          await _sendInitialDataToIframe();
          break;

        case "SUBSCRIBE_CLICK":
          await _handleSubscribeClick(data.planId);
          break;

        case "OPEN_LIGHTBOX":
          if (data.lightboxName) {
            try {
              await wixWindow.openLightbox(data.lightboxName);
            } catch (err) {
              console.warn(`Herald Subscribe Page: Lightbox '${data.lightboxName}' could not be opened:`, err);
            }
          }
          break;

        default:
          break;
      }
    });
  } catch (e) {
    console.error("Herald Subscribe Page: #htmlComponent1 not found on page:", e);
  }

  // 2. Initial state push in case iframe loaded before onReady
  _sendInitialDataToIframe();
});

// ═══════════════════════════════════════════════════════════════════
// 1. DATA PUSH TO IFRAME
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetches active plans and member status from backend and sends to iframe.
 */
async function _sendInitialDataToIframe() {
  try {
    const [plansRes, statusRes] = await Promise.all([
      getPricingPlans(),
      getMemberSubscriptionDetails()
    ]);

    const payload = {
      type: "INIT_DATA",
      plans: plansRes.success ? plansRes.plans : [],
      memberStatus: statusRes
    };

    try {
      $w("#htmlComponent1").postMessage(payload);
    } catch (e) { /* Element may not be rendered yet */ }

  } catch (err) {
    console.error("Herald Subscribe Page: Failed to fetch initial data for iframe:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. CHECKOUT FLOW (Zero-Trust)
// ═══════════════════════════════════════════════════════════════════

/**
 * Handles plan checkout initiated from the HTML component.
 *
 * @param {string} planId - Target plan ID / tier name
 */
async function _handleSubscribeClick(planId) {
  try {
    // 1. Strict authentication check: verify member is logged in
    let member = null;
    try {
      member = await currentMember.getMember();
    } catch (e) {
      member = null;
    }

    if (!member) {
      console.log("Herald Subscribe Page: Guest user clicked subscribe. Launching native login prompt...");
      try {
        await authentication.promptLogin({ mode: "signup" });
        member = await currentMember.getMember();
      } catch (loginErr) {
        console.log("Herald Subscribe Page: Login prompt closed or cancelled.");
        _setIframeLoading(planId, false);
        return;
      }

      if (!member) {
        console.warn("Herald Subscribe Page: User still not authenticated.");
        _setIframeLoading(planId, false);
        return;
      }
    }

    // 2. Request backend to create a secure payment session
    console.log(`Herald Subscribe Page: Requesting payment session for plan '${planId}'...`);
    const paymentRes = await createSubscriptionPayment(planId);

    if (!paymentRes.success || !paymentRes.paymentId) {
      console.error("Herald Subscribe Page: Payment creation failed:", paymentRes.error);
      _setIframeLoading(planId, false);
      return;
    }

    // 3. Launch native Wix Pay Modal
    console.log("Herald Subscribe Page: Opening Wix Pay checkout modal...");
    const paymentResult = await wixPayFrontend.startPayment(paymentRes.paymentId, {
      termsAndConditionsCheckboxRequired: false
    });

    console.log("Herald Subscribe Page: Wix Pay completed with status:", paymentResult.status);

    // 4. Handle result
    if (paymentResult.status === "Successful" || paymentResult.status === "Paid") {
      try {
        $w("#htmlComponent1").postMessage({ type: "PAYMENT_SUCCESS" });
      } catch (e) { /* Ignore */ }

      // Check returnUrl query parameter
      const query = wixLocation.query;
      const returnUrl = query.returnUrl || "/herald";

      // Allow brief delay for webhook update, then redirect
      setTimeout(() => {
        wixLocation.to(returnUrl);
      }, 1200);

    } else {
      _setIframeLoading(planId, false);
    }

  } catch (error) {
    console.error("Herald Subscribe Page: Error during checkout:", error);
    _setIframeLoading(planId, false);
  }
}

/**
 * Helper to update loading spinner state inside the iframe
 * @param {string} planId
 * @param {boolean} loading
 */
function _setIframeLoading(planId, loading) {
  try {
    $w("#htmlComponent1").postMessage({
      type: "SET_LOADING",
      planId: planId,
      loading: loading
    });
  } catch (e) { /* Element may not exist */ }
}
