import { orders } from 'wix-pricing-plans-backend';
import { Permissions, webMethod } from "wix-web-module";
import { logError } from 'backend/logger.web';

/**
 * Checks if the current member has any active pricing plans.
 * @returns {Promise<Array>} List of active subscriptions
 */
export const getCurrentMemberPlans = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const results = await orders.listCurrentMemberOrders();
      const activePlans = results.filter(order => order.status === 'ACTIVE');
      return activePlans.map(plan => ({
        planId: plan.planId,
        planName: plan.planName,
        status: plan.status,
        dateCreated: plan._createdDate
      }));
    } catch (error) {
      console.error("Error fetching member plans:", error);
      await logError("pricing.web.getCurrentMemberPlans", error);
      throw new Error("Could not retrieve membership info.");
    }
  }
);

/**
 * Checks if the member has a specific plan by Name
 * Useful for checking "Pride Priority" status
 */
export const hasActivePlan = webMethod(
  Permissions.Anyone,
  async (planName) => {
    try {
      const activePlans = await orders.listCurrentMemberOrders();
      return activePlans.some(order => order.planName.includes(planName) && order.status === 'ACTIVE');
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
      const activePlans = await orders.listCurrentMemberOrders();
      return activePlans.some(order => order.status === 'ACTIVE');
    } catch (error) {
      console.error("Plan check failed:", error);
      await logError("pricing.web.hasAnyActivePlan", error);
      return false;
    }
  }
);
/**
 * Checks if the caregiver has paid for a background check.
 * (Verified Priority or Verified Priority Driver)
 */
export const hasBgCheckPlan = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const activePlans = await orders.listCurrentMemberOrders();
      const bgCheckPlanIds = [
        "a2e3a0e7-9003-4146-94df-3b47e7b98f82", // Driver
        "ac23be0e-ce61-4306-9f14-b60b74a5fe27"  // Regular
      ];
      return activePlans.some(order => bgCheckPlanIds.includes(order.planId) && order.status === 'ACTIVE');
    } catch (error) {
      console.error("BG Check plan check failed:", error);
      await logError("pricing.web.hasBgCheckPlan", error);
      return false;
    }
  }
);
/**
 * Returns the family plan tier.
 */
export const getFamilyPlanTier = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const activePlans = await orders.listCurrentMemberOrders();
      const chosenId = "f01807b1-cfee-467b-a9ab-b12e8ffd5841";
      const prideId = "d4d875b3-e056-4194-b809-6fd0aac5e42a";

      if (activePlans.some(o => o.planId === chosenId && o.status === 'ACTIVE')) return 'chosen';
      if (activePlans.some(o => o.planId === prideId && o.status === 'ACTIVE')) return 'pride';
      return 'community'; // Default
    } catch (error) {
      console.error("Family tier check failed:", error);
      await logError("pricing.web.getFamilyPlanTier", error);
      return 'community';
    }
  }
);
