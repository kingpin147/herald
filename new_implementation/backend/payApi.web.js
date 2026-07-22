import { wixPayBackend } from 'wix-pay-backend';
import wixData from 'wix-data';
import { Permissions, webMethod } from 'wix-web-module';

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
                // Member ID will be passed if the user is logged in
                id: memberId
            },
            // Pass the plan details in customData to process it after payment is successful
            customData: {
                planId: plan.planId,
                durationDays: plan.durationDays,
                memberId: memberId
            }
        });
        
        return {
            success: true,
            paymentId: payment.id,
            paymentToken: payment.paymentToken // Needed by the frontend wixPay.startPayment()
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
