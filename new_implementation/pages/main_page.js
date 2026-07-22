import wixLocation from 'wix-location';
import { currentMember, authentication } from 'wix-members-frontend';
import wixData from 'wix-data';
import wixPay from 'wix-pay';
import { createSubscriptionPayment, getPricingPlans } from 'backend/payApi.web';

$w.onReady(async function () {
    const htmlComponent = $w("#htmlComponent1");

    // 1. Send initial state and route parameters to the HTML Component when it's ready
    htmlComponent.onMessage(async (event) => {
        if (event.data.type === "COMPONENT_READY") {
            const path = wixLocation.path;
            const query = wixLocation.query;
            
            // Get user entitlement state
            let hasPremiumAccess = false;
            let activePlans = [];
            const member = await currentMember.getMember();
            const loggedIn = !!member;
            
            if (loggedIn) {
                const userId = member._id;
                // Query custom MemberSubscriptions to bypass native limits
                const now = new Date();
                const subscriptions = await wixData.query("MemberSubscriptions")
                    .eq("memberId", userId)
                    .eq("status", "Active")
                    .ge("expiryDate", now)
                    .find();
                
                if (subscriptions.items.length > 0) {
                    hasPremiumAccess = true;
                    activePlans = subscriptions.items;
                }
            }

            // Fetch pricing plans from backend API
            const plansResponse = await getPricingPlans();
            const pricingPlans = plansResponse.success ? plansResponse.plans : [];

            // Sync the Wix Router state to the HTML SPA
            htmlComponent.postMessage({
                type: "INIT_STATE",
                payload: {
                    path: path,
                    query: query,
                    pricingPlans: pricingPlans,
                    user: {
                        loggedIn: loggedIn,
                        id: loggedIn ? member._id : null,
                        hasPremiumAccess: hasPremiumAccess,
                        activePlans: activePlans
                    }
                }
            });
        }
        
        // 2. Handle Checkout Requests from the HTML Component
        if (event.data.type === "CHECKOUT_REQUEST") {
            const member = await currentMember.getMember();
            if (!member) {
                // Prompt login if they try to checkout while logged out
                authentication.promptLogin();
                return;
            }

            const planId = event.data.payload.planId;
            try {
                // Call our custom backend method
                const response = await createSubscriptionPayment(planId, member._id);
                if (response.success && response.paymentId) {
                    // Start the Wix Payment UI
                    const result = await wixPay.startPayment(response.paymentId);
                    
                    if (result.status === "Successful") {
                        // Send success message back to HTML component to update UI state
                        htmlComponent.postMessage({
                            type: "PAYMENT_SUCCESS",
                            payload: { planId: planId }
                        });
                        // You could also auto-refresh the page to trigger the new entitlement state
                        // wixLocation.to(wixLocation.url); 
                    } else {
                        htmlComponent.postMessage({
                            type: "PAYMENT_FAILED",
                            payload: { status: result.status }
                        });
                    }
                } else {
                    console.error("Payment initialization failed:", response.error);
                }
            } catch (err) {
                console.error("Error during checkout process", err);
            }
        }
    });

    // 3. Keep the HTML Component synced if the Wix URL changes
    wixLocation.onChange((location) => {
        htmlComponent.postMessage({
            type: "ROUTE_CHANGE",
            payload: {
                path: location.path,
                query: location.query
            }
        });
    });
});
