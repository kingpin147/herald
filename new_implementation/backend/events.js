import { authorization } from 'wix-members-backend';

// The exact SKUs from Wix Stores for digital-access items
const DIGITAL_SKUS = ["SKU_DIGITAL_SINGLE", "SKU_PRINT_COLLECTOR"];
const PREMIUM_ROLE_ID = "YOUR_HERALD_PREMIUM_ROLE_ID"; // Must grab this from Wix Dashboard Roles

export async function wixStores_onOrderPaid(event) {
    const order = event.order;
    const buyerId = order.buyerInfo.id;
    
    // Only proceed if there's a logged-in user who made the purchase
    if (!buyerId) {
        console.log("Guest checkout. Cannot assign Premium Role automatically.");
        return;
    }

    let grantsDigitalAccess = false;

    // Check all purchased line items
    for (const item of order.lineItems) {
        if (DIGITAL_SKUS.includes(item.sku)) {
            grantsDigitalAccess = true;
            break;
        }
    }

    if (grantsDigitalAccess) {
        try {
            // Pipeline B: Automatically assign the Herald_Premium role
            await authorization.assignRole(PREMIUM_ROLE_ID, buyerId, { suppressAuth: true });
            console.log(`Successfully granted Herald_Premium role to member ${buyerId}`);
        } catch (error) {
            console.error(`Failed to grant role to member ${buyerId}:`, error);
        }
    } else {
        console.log("Order did not contain digital SKUs. No role assigned.");
    }
}
