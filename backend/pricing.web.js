import { Permissions, webMethod } from "wix-web-module";
import wixData from "wix-data";
import { currentMember } from "wix-members-backend";
import { wixPayBackend } from 'wix-pay-backend';
import { logError } from 'backend/logger.web';

/**
 * Checks if the current member has any active pricing plans.
 * @returns {Promise<Array>} List of active subscriptions
 */
export const getCurrentMemberPlans = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const member = await currentMember.getMember();
      if (!member) return [];

      const now = new Date();
      const results = await wixData.query("MemberSubscriptions")
        .eq("memberId", member._id)
        .eq("status", "Active")
        .ge("expiryDate", now)
        .find();
        
      return results.items.map(plan => ({
        planId: plan.planId,
        planName: plan.planName,
        status: plan.status,
        dateCreated: plan._createdDate,
        expiryDate: plan.expiryDate
      }));
    } catch (error) {
      console.error("Error fetching member plans:", error);
      await logError("pricing.web.getCurrentMemberPlans", error);
      throw new Error("Could not retrieve membership info.");
    }
  }
);


export const hasActivePlan = webMethod(
  Permissions.Anyone,
  async (planName) => {
    try {
      const member = await currentMember.getMember();
      if (!member) return false;

      const now = new Date();
      const activePlans = await wixData.query("MemberSubscriptions")
        .eq("memberId", member._id)
        .eq("status", "Active")
        .ge("expiryDate", now)
        .contains("planName", planName) // Ensure planName field exists in your DB or map correctly
        .find();
        
      return activePlans.items.length > 0;
    } catch (error) {
      console.error("Plan check failed:", error);
      await logError("pricing.web.hasActivePlan", error);
      return false;
    }
  }
);

/**
 * Checks if the member has ANY active plan
 */
export const hasAnyActivePlan = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const member = await currentMember.getMember();
      if (!member) return false;

      const now = new Date();
      const activePlans = await wixData.query("MemberSubscriptions")
        .eq("memberId", member._id)
        .eq("status", "Active")
        .ge("expiryDate", now)
        .find();
        
      return activePlans.items.length > 0;
    } catch (error) {
      console.error("Plan check failed:", error);
      await logError("pricing.web.hasAnyActivePlan", error);
      return false;
    }
  }
);

export const createSubscriptionPayment = webMethod(Permissions.Anyone, async (planId, memberId) => {
    try {
        // Query the custom pricing plan from Wix CMS
        const planResult = await wixData.query("CustomPricingPlans")
            .eq("planId", planId)
            .find();
        
        if (planResult.items.length === 0) {
            throw new Error(`Plan with ID ${planId} not found.`);
        }
        
        const plan = planResult.items[0];
        
        // Create the payment
        const payment = await wixPayBackend.createPayment({
            items: [{
                name: plan.planName,
                price: plan.price,
                quantity: 1
            }],
            amount: plan.price,
            userInfo: {
                id: memberId
            },
            customData: {
                planId: plan.planId,
                durationDays: plan.durationDays,
                memberId: memberId
            }
        });
        
        return {
            success: true,
            paymentId: payment.id,
            paymentToken: payment.paymentToken
        };
        
    } catch (error) {
        console.error("Error creating payment:", error);
        return {
            success: false,
            error: error.message
        };
    }
});

export const getPricingPlans = webMethod(Permissions.Anyone, async () => {
    try {
        const results = await wixData.query("CustomPricingPlans")
            .eq("isActive", true)
            .find();
        
        return {
            success: true,
            plans: results.items
        };
    } catch (error) {
        console.error("Error fetching pricing plans:", error);
        return {
            success: false,
            error: error.message,
            plans: []
        };
    }
});
