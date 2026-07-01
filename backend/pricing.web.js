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
