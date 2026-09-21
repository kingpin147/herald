import wixData from "wix-data";
import { authorization } from "wix-members-backend";
import { logError } from "backend/logger.web";

/**
 * Backend Event Handlers (backend/events.js)
 *
 * Automatically saves completed subscriptions to 'SubscriptionUserData'.
 */

const USER_SUBSCRIPTIONS_COLLECTION = "SubscriptionUserData";
const PREMIUM_ROLE_ID = ""; // Optional: custom "Herald_Premium" Role ID in Wix Members

function _isValidRoleId(roleId) {
  return typeof roleId === "string" && roleId.length > 0;
}

/**
 * Event triggered when a Wix Pay payment status updates.
 * Handles automated provisioning and fulfillment into SubscriptionUserData.
 *
 * @param {Object} event - Payment event payload from Wix Pay
 */
export async function wixPay_onPaymentUpdate(event) {
  try {
    const payment = event.payment;
    if (!payment) {
      console.warn("events.js: Received wixPay_onPaymentUpdate without payment payload.");
      return;
    }

    const paymentId = payment.id;
    const status = payment.status;

    console.log(`events.js: Payment update received for paymentId: ${paymentId}, status: ${status}`);

    // Check if subscription record already exists for this payment (e.g. pending record)
    let existing = await wixData.query(USER_SUBSCRIPTIONS_COLLECTION)
      .eq("paymentId", paymentId)
      .limit(1)
      .find({ suppressAuth: true });

    const existingRecord = existing.items.length > 0 ? existing.items[0] : null;
    let memberId = existingRecord ? existingRecord.memberId : (payment.userInfo?.id || null);

    if (!memberId) {
      console.warn(`events.js: Payment ${paymentId} has no associated memberId.`);
      return;
    }

    // ── 1. Handle Successful / Paid Status ─────────────────────────────
    if (status === "Successful" || status === "Paid") {
      const planName = existingRecord?.subscriptionPlan || payment.items?.[0]?.name || "Herald Premium Subscription";
      const memberName = existingRecord?.memberName || 
        (payment.userInfo?.firstName ? `${payment.userInfo.firstName} ${payment.userInfo.lastName || ""}`.trim() : "Member");
      const durationDays = 365;

      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      const priceStr = `$${payment.amount}`;

      if (existingRecord) {
        existingRecord.status = "Active";
        existingRecord.subscriptionPlan = planName;
        existingRecord.subscriptionPrice = priceStr;
        existingRecord.expiryDate = expiryDate;
        existingRecord.updatedDate = new Date();
        await wixData.update(USER_SUBSCRIPTIONS_COLLECTION, existingRecord, { suppressAuth: true });
        console.log(`events.js: Updated subscription in ${USER_SUBSCRIPTIONS_COLLECTION} for member ${memberId}.`);
      } else {
        const newSubscription = {
          memberId: memberId,
          subscriptionPlan: planName,
          memberName: memberName,
          subscriptionPrice: priceStr,
          purchaseDateAndTime: startDate,
          expiryDate: expiryDate,
          status: "Active",
          paymentId: paymentId
        };

        const inserted = await wixData.insert(USER_SUBSCRIPTIONS_COLLECTION, newSubscription, { suppressAuth: true });
        console.log(`events.js: Provisioned new subscription ${inserted._id} in ${USER_SUBSCRIPTIONS_COLLECTION} for member ${memberId}. Plan: ${planName}`);
      }

      // ── Optional: Assign Member Role ──
      if (_isValidRoleId(PREMIUM_ROLE_ID)) {
        try {
          await authorization.assignRole(PREMIUM_ROLE_ID, memberId, { suppressAuth: true });
          console.log(`events.js: Assigned premium role to member ${memberId}`);
        } catch (roleErr) {
          console.warn(`events.js: Role assignment failed for member ${memberId}:`, roleErr);
        }
      }
    }

    // ── 2. Handle Refunded / Cancelled Status ──────────────────────────
    else if (status === "Refunded" || status === "PartiallyRefunded" || status === "Cancelled" || status === "ChargedBack") {
      const existing = await wixData.query(USER_SUBSCRIPTIONS_COLLECTION)
        .eq("paymentId", paymentId)
        .find({ suppressAuth: true });

      for (const item of existing.items) {
        item.status = status;
        item.cancelledDate = new Date();
        await wixData.update(USER_SUBSCRIPTIONS_COLLECTION, item, { suppressAuth: true });
        console.log(`events.js: Subscription in ${USER_SUBSCRIPTIONS_COLLECTION} updated to ${status}`);
      }

      if (_isValidRoleId(PREMIUM_ROLE_ID)) {
        try {
          await authorization.removeRole(PREMIUM_ROLE_ID, memberId, { suppressAuth: true });
        } catch (roleErr) {
          console.warn(`events.js: Role removal failed for member ${memberId}:`, roleErr);
        }
      }
    }

  } catch (error) {
    console.error("events.js: Error in wixPay_onPaymentUpdate:", error);
    await logError("events.wixPay_onPaymentUpdate", error, { eventSummary: event ? JSON.stringify(event).slice(0, 500) : null });
  }
}

/**
 * Event triggered when an order is paid in Wix Stores (for single issues or merchandise).
 * Grants instant digital access if SKU matches digital/collector items.
 *
 * @param {Object} event - Order paid payload from Wix Stores
 */
export async function wixStores_onOrderPaid(event) {
  try {
    const order = event;
    if (!order) return;

    const buyerInfo = order.buyerInfo;
    const memberId = buyerInfo?.id;
    if (!memberId) return;

    const lineItems = order.lineItems || [];
    const hasDigitalOrPremium = lineItems.some(item => 
      item.sku === "DIGITAL_SINGLE" || 
      item.sku === "PRINT_COLLECTOR" ||
      (item.name && (item.name.toLowerCase().includes("digital") || item.name.toLowerCase().includes("all-access")))
    );

    if (hasDigitalOrPremium) {
      console.log(`events.js: Wix Stores order ${order._id} includes premium SKU for member ${memberId}`);

      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000));
      const memberName = buyerInfo.firstName ? `${buyerInfo.firstName} ${buyerInfo.lastName || ""}`.trim() : "Store Customer";

      const newSubscription = {
        memberId: memberId,
        subscriptionPlan: lineItems[0]?.name || "Herald Store Premium Access",
        memberName: memberName,
        subscriptionPrice: `$${order.totals?.total || 0}`,
        purchaseDateAndTime: startDate,
        expiryDate: expiryDate,
        status: "Active",
        paymentId: order._id
      };

      await wixData.insert(USER_SUBSCRIPTIONS_COLLECTION, newSubscription, { suppressAuth: true });
      console.log(`events.js: Created subscription for member ${memberId} via Wix Stores order.`);

      if (_isValidRoleId(PREMIUM_ROLE_ID)) {
        try {
          await authorization.assignRole(PREMIUM_ROLE_ID, memberId, { suppressAuth: true });
        } catch (roleErr) {
          console.warn("events.js: Could not assign role on store order:", roleErr);
        }
      }
    }
  } catch (error) {
    console.error("events.js: Error in wixStores_onOrderPaid:", error);
    await logError("events.wixStores_onOrderPaid", error);
  }
}
