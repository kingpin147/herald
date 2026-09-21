import { Permissions, webMethod } from "wix-web-module";
import wixData from "wix-data";
import { currentMember } from "wix-members-backend";
import wixPayBackend from "wix-pay-backend";
import { logError } from "backend/logger.web";

/**
 * Backend Pricing & Subscription Management Service
 *
 * Configured for Wix CMS Collections:
 * 1. Plans Collection: 'SubscriptionsPlan' (or 'CustomPricingPlans')
 *    - Fields: subscriptionTier, pricing, inclusions, subscriptionType, technicalRouting
 * 2. User Subscriptions Collection: 'SubscriptionUserData' (or 'MemberSubscriptions')
 *    - Fields: memberId, subscriptionPlan, memberName, subscriptionPrice, purchaseDateAndTime, expiryDate, status
 */

const PLANS_COLLECTION = "SubscriptionsPlan";
const USER_SUBSCRIPTIONS_COLLECTION = "SubscriptionUserData";

/**
 * Helper to parse numeric price from string or number (e.g. "$150", "150", 150 -> 150)
 * @param {any} priceVal
 * @returns {number}
 */
function _parseNumericPrice(priceVal) {
  if (typeof priceVal === "number") return priceVal;
  if (typeof priceVal === "string") {
    const cleaned = priceVal.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Category priority for plan ordering:
 * 1. Free Tier (Top)
 * 2. Single Issue (Middle)
 * 3. Yearly / Annual (End)
 *
 * @param {Object} plan
 * @returns {number}
 */
function _getPlanCategoryPriority(plan) {
  const type = (plan.subscriptionType || plan.description || "").toLowerCase();
  const name = (plan.planName || plan.subscriptionTier || plan.title || "").toLowerCase();
  const rawPrice = String(plan.rawPrice || plan.pricing || plan.price || "").toLowerCase();

  // 1. Free Tier (Top)
  if (type.includes("free") || name.includes("free") || rawPrice.includes("€0") || rawPrice.includes("$0") || plan.price === 0) {
    return 1;
  }
  // 2. Single Issue (Middle)
  if (type.includes("single") || name.includes("single") || rawPrice.includes("edition") || rawPrice.includes("issue")) {
    return 2;
  }
  // 3. Yearly / Annual (End)
  return 3;
}

/**
 * Retrieves all active pricing plans configured in the CMS.
 *
 * @returns {Promise<{success: boolean, plans: Array, error?: string}>}
 */
export const getPricingPlans = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      let results = null;

      // Try primary collection: SubscriptionsPlan
      try {
        results = await wixData.query(PLANS_COLLECTION)
          .find({ suppressAuth: true });
      } catch (e) {
        console.warn(`pricing.web: Query on ${PLANS_COLLECTION} failed, trying fallback:`, e);
      }

      // Fallback if SubscriptionsPlan is empty or doesn't exist
      if (!results || results.items.length === 0) {
        try {
          results = await wixData.query("CustomPricingPlans")
            .eq("isActive", true)
            .find({ suppressAuth: true });
        } catch (e) { /* Ignore fallback error */ }
      }

      const items = results ? results.items : [];

      const formattedPlans = items.map(plan => {
        const planName = plan.subscriptionTier || plan.title || plan.planName || "Subscription Plan";
        const rawPrice = plan.pricing !== undefined ? plan.pricing : (plan.price !== undefined ? plan.price : "");
        const numPrice = _parseNumericPrice(rawPrice);
        const planId = plan.planId || plan._id || planName;
        const inclusions = plan.inclusionsAndAccessScope || plan.inclusions || plan.features || "";
        const featuresArray = Array.isArray(inclusions) 
          ? inclusions 
          : (typeof inclusions === "string" ? inclusions.split("\n").filter(Boolean) : []);
        
        const rawPriceStr = String(rawPrice).toLowerCase();
        const subType = plan.subscriptionType || (rawPriceStr.includes("edition") ? "Single" : (numPrice === 0 ? "Free" : "Annual"));
        const periodText = rawPriceStr.includes("edition") ? "/ edition" : (numPrice === 0 ? "Free" : "/ year");
        
        // Print Collector or marked featured
        const isFeatured = !!plan.isFeatured || planName.toLowerCase().includes("print collector");

        return {
          _id: plan._id,
          planId: planId,
          planName: planName,
          price: numPrice,
          rawPrice: rawPrice,
          periodText: periodText,
          currency: plan.currency || (String(rawPrice).includes("€") ? "€" : "$"),
          durationDays: plan.durationDays || (subType === "Single" ? 30 : 365),
          subscriptionType: subType,
          description: (typeof inclusions === "string" && inclusions.length > 0 && !inclusions.includes("\n")) ? inclusions : (plan.description || subType),
          features: featuresArray,
          technicalRouting: plan.technicalRouting || "",
          fulfillmentAutomation: plan.fulfillmentAutomation || "",
          isFeatured: isFeatured,
          badgeText: plan.badgeText || (isFeatured ? "RECOMMENDED" : ""),
          ctaText: numPrice === 0 ? "Get Started Free" : (plan.ctaText || "Subscribe Now")
        };
      });

      // Sort: 1. Free Subscription (Top) -> 2. Single Issue -> 3. Yearly Subscriptions (End)
      formattedPlans.sort((a, b) => {
        const prioA = _getPlanCategoryPriority(a);
        const prioB = _getPlanCategoryPriority(b);
        if (prioA !== prioB) {
          return prioA - prioB;
        }
        return a.price - b.price;
      });

      return {
        success: true,
        plans: formattedPlans
      };
    } catch (error) {
      console.error("pricing.web: Error fetching pricing plans:", error);
      await logError("pricing.web.getPricingPlans", error);
      return {
        success: false,
        error: "Unable to retrieve pricing plans at this time.",
        plans: []
      };
    }
  }
);

/**
 * Initiates a secure payment session for a chosen pricing plan.
 * Strictly verifies that the requesting user is authenticated via currentMember.
 *
 * @param {string} planId - Unique identifier or subscriptionTier of the plan.
 * @returns {Promise<{success: boolean, paymentId?: string, error?: string}>}
 */
export const createSubscriptionPayment = webMethod(
  Permissions.Anyone,
  async (planId) => {
    try {
      if (!planId) {
        return { success: false, error: "Plan ID is required." };
      }

      // 1. Strict zero-trust authentication check: verify caller is logged in
      let member = null;
      try {
        member = await currentMember.getMember();
      } catch (authErr) {
        member = null;
      }

      if (!member || !member._id) {
        return {
          success: false,
          error: "Authentication required. Please log in or sign up before subscribing."
        };
      }

      // 2. Locate plan in CMS (search SubscriptionsPlan by _id or subscriptionTier or planId)
      let plan = null;
      try {
        const queryRes = await wixData.query(PLANS_COLLECTION)
          .eq("_id", planId)
          .or(wixData.query(PLANS_COLLECTION).eq("subscriptionTier", planId))
          .or(wixData.query(PLANS_COLLECTION).eq("planId", planId))
          .limit(1)
          .find({ suppressAuth: true });

        if (queryRes.items.length > 0) {
          plan = queryRes.items[0];
        }
      } catch (e) {
        console.warn(`pricing.web: Search in ${PLANS_COLLECTION} failed:`, e);
      }

      // Fallback search in CustomPricingPlans
      if (!plan) {
        try {
          const fallbackRes = await wixData.query("CustomPricingPlans")
            .eq("planId", planId)
            .limit(1)
            .find({ suppressAuth: true });
          if (fallbackRes.items.length > 0) {
            plan = fallbackRes.items[0];
          }
        } catch (e) { /* Ignore */ }
      }

      if (!plan) {
        return {
          success: false,
          error: `Plan '${planId}' was not found in CMS.`
        };
      }

      const planName = plan.subscriptionTier || plan.planName || "Herald Subscription";
      const rawPrice = plan.pricing !== undefined ? plan.pricing : plan.price;
      const planPrice = _parseNumericPrice(rawPrice);

      if (isNaN(planPrice) || planPrice <= 0) {
        return {
          success: false,
          error: `Invalid pricing configuration for plan '${planName}'.`
        };
      }

      const memberEmail = member.loginEmail || (member.contactDetails ? member.contactDetails.emails?.[0] : "") || "";
      const firstName = member.contactDetails?.firstName || member.profile?.nickname || "Subscriber";
      const lastName = member.contactDetails?.lastName || "";
      const phone = member.contactDetails?.phones?.[0] || "";
      const countryCode = "";

      // 3. Create the payment session using Wix Pay Backend
      const payment = await wixPayBackend.createPayment({
        items: [{
          name: planName,
          price: planPrice,
          quantity: 1
        }],
        amount: planPrice,
        currency: plan.currency || "USD",
        userInfo: {
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          email: memberEmail,
          countryCode: countryCode
        }
      });

      // 4. Save pending record to correlate paymentId with memberId and plan
      try {
        await wixData.insert(USER_SUBSCRIPTIONS_COLLECTION, {
          memberId: member._id,
          subscriptionPlan: planName,
          memberName: `${firstName} ${lastName}`.trim(),
          subscriptionPrice: `$${planPrice}`,
          status: "Pending",
          paymentId: payment.id,
          purchaseDateAndTime: new Date()
        }, { suppressAuth: true });
      } catch (insertErr) {
        console.warn("pricing.web: Failed to record pending payment:", insertErr);
      }

      return {
        success: true,
        paymentId: payment.id
      };

    } catch (error) {
      console.error("pricing.web: Error creating subscription payment:", error);
      await logError("pricing.web.createSubscriptionPayment", error, { planId });
      return {
        success: false,
        error: error.message || "Failed to initialize payment session."
      };
    }
  }
);

/**
 * Returns all active subscription records for the currently authenticated member.
 *
 * @returns {Promise<Array>} List of active subscription objects
 */
export const getCurrentMemberPlans = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const member = await currentMember.getMember();
      if (!member || !member._id) return [];

      const activeSubs = await _queryMemberActiveSubscriptions(member._id);
      return activeSubs;
    } catch (error) {
      console.error("pricing.web: Error fetching member plans:", error);
      await logError("pricing.web.getCurrentMemberPlans", error);
      throw new Error("Could not retrieve membership information.");
    }
  }
);

/**
 * Checks if the current member has an active subscription for a specific plan name or ID.
 *
 * @param {string} planIdentifier - Name or ID to match against active subscriptions
 * @returns {Promise<boolean>}
 */
export const hasActivePlan = webMethod(
  Permissions.Anyone,
  async (planIdentifier) => {
    try {
      if (!planIdentifier) return false;

      const member = await currentMember.getMember();
      if (!member || !member._id) return false;

      const activeSubs = await _queryMemberActiveSubscriptions(member._id);
      const term = planIdentifier.toLowerCase();

      return activeSubs.some(sub => 
        (sub.planId && sub.planId.toLowerCase().includes(term)) ||
        (sub.planName && sub.planName.toLowerCase().includes(term)) ||
        (sub.subscriptionPlan && sub.subscriptionPlan.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error("pricing.web: hasActivePlan failed:", error);
      await logError("pricing.web.hasActivePlan", error, { planIdentifier });
      return false;
    }
  }
);

/**
 * Checks if the member has ANY currently active subscription.
 *
 * @returns {Promise<boolean>}
 */
export const hasAnyActivePlan = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const member = await currentMember.getMember();
      if (!member || !member._id) return false;

      const activeSubs = await _queryMemberActiveSubscriptions(member._id);
      return activeSubs.length > 0;
    } catch (error) {
      console.error("pricing.web: hasAnyActivePlan failed:", error);
      await logError("pricing.web.hasAnyActivePlan", error);
      return false;
    }
  }
);

/**
 * Comprehensive subscription status endpoint for user account & profile dashboards.
 *
 * @returns {Promise<Object>} Detailed status object
 */
export const getMemberSubscriptionDetails = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      let member = null;
      try {
        member = await currentMember.getMember();
      } catch (e) {
        member = null;
      }

      if (!member || !member._id) {
        return {
          isLoggedIn: false,
          hasActiveSubscription: false,
          activeSubscription: null,
          history: []
        };
      }

      const allSubs = await _queryAllMemberSubscriptions(member._id);
      const now = new Date();

      const activeSub = allSubs.find(sub => {
        const exp = sub.expiryDate ? new Date(sub.expiryDate) : null;
        return sub.status === "Active" || (exp && exp >= now);
      });

      let remainingDays = 0;
      if (activeSub && activeSub.expiryDate) {
        const diffMs = new Date(activeSub.expiryDate).getTime() - now.getTime();
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        isLoggedIn: true,
        memberId: member._id,
        hasActiveSubscription: !!activeSub,
        activeSubscription: activeSub ? {
          _id: activeSub._id,
          planId: activeSub.planId,
          planName: activeSub.planName || activeSub.subscriptionPlan,
          startDate: activeSub.startDate || activeSub.purchaseDateAndTime || activeSub._createdDate,
          expiryDate: activeSub.expiryDate,
          remainingDays: remainingDays
        } : null,
        history: allSubs.map(sub => ({
          _id: sub._id,
          planName: sub.planName || sub.subscriptionPlan,
          status: sub.status,
          expiryDate: sub.expiryDate,
          amountPaid: sub.subscriptionPrice || sub.amountPaid
        }))
      };
    } catch (error) {
      console.error("pricing.web: getMemberSubscriptionDetails failed:", error);
      await logError("pricing.web.getMemberSubscriptionDetails", error);
      return {
        isLoggedIn: false,
        hasActiveSubscription: false,
        activeSubscription: null,
        history: []
      };
    }
  }
);

// ─── Internal Query Helpers ────────────────────────────────────────

/**
 * Queries active subscriptions from SubscriptionUserData (or MemberSubscriptions)
 * @param {string} memberId
 * @returns {Promise<Array>}
 */
async function _queryMemberActiveSubscriptions(memberId) {
  const now = new Date();
  let items = [];

  // Try SubscriptionUserData first
  try {
    const res = await wixData.query(USER_SUBSCRIPTIONS_COLLECTION)
      .eq("memberId", memberId)
      .find({ suppressAuth: true });

    if (res.items.length > 0) {
      items = res.items.filter(item => {
        // Check explicit status or expiration date
        if (item.status && item.status.toLowerCase() === "cancelled") return false;
        
        if (item.expiryDate) {
          return new Date(item.expiryDate) >= now;
        }

        // If no explicit expiryDate, calculate 365 days from purchaseDateAndTime or _createdDate
        const purchaseDate = item.purchaseDateAndTime ? new Date(item.purchaseDateAndTime) : new Date(item._createdDate);
        const autoExpiry = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000));
        return autoExpiry >= now;
      });
    }
  } catch (e) {
    console.warn(`pricing.web: Query on ${USER_SUBSCRIPTIONS_COLLECTION} failed:`, e);
  }

  // Fallback to MemberSubscriptions if empty
  if (items.length === 0) {
    try {
      const fallbackRes = await wixData.query("MemberSubscriptions")
        .eq("memberId", memberId)
        .eq("status", "Active")
        .ge("expiryDate", now)
        .find({ suppressAuth: true });
      items = fallbackRes.items;
    } catch (e) { /* Ignore */ }
  }

  return items.map(sub => ({
    _id: sub._id,
    planId: sub.planId || sub.subscriptionPlan || "ACTIVE_PLAN",
    planName: sub.subscriptionPlan || sub.planName || "Active Subscription",
    subscriptionPlan: sub.subscriptionPlan || sub.planName,
    status: sub.status || "Active",
    startDate: sub.purchaseDateAndTime || sub.startDate || sub._createdDate,
    expiryDate: sub.expiryDate,
    isExpired: false
  }));
}

/**
 * Queries all subscription history for a member
 * @param {string} memberId
 * @returns {Promise<Array>}
 */
async function _queryAllMemberSubscriptions(memberId) {
  let items = [];

  try {
    const res = await wixData.query(USER_SUBSCRIPTIONS_COLLECTION)
      .eq("memberId", memberId)
      .descending("_createdDate")
      .find({ suppressAuth: true });
    items = res.items;
  } catch (e) { /* Ignore */ }

  if (items.length === 0) {
    try {
      const resFallback = await wixData.query("MemberSubscriptions")
        .eq("memberId", memberId)
        .descending("_createdDate")
        .find({ suppressAuth: true });
      items = resFallback.items;
    } catch (e) { /* Ignore */ }
  }

  return items;
}
