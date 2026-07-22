import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

// IDs matching the specific Wix apps items
const PRICING_PLAN_ALL_ACCESS_ID = "YOUR_ALL_ACCESS_PLAN_ID"; 
const STORE_URL_DIGITAL_SINGLE = "/product-page/single-issue-digital";
const STORE_URL_PRINT_SINGLE = "/product-page/single-issue-print";
const STORE_URL_PRINT_COLLECTOR = "/product-page/print-collector";

$w.onReady(function () {
    
    // --- PIPELINE A: Native Subscriptions & The Free Gate ---
    
    $w('#btnFreeTier').onClick(() => {
        // Triggers the custom Wix Lightbox (Signup Form)
        wixWindow.openLightbox("Signup_Gate");
    });

    $w('#btnIndividualAccess').onClick(() => {
        // Navigates directly to the native Wix Pricing Plans checkout for this specific plan
        wixLocation.to(`/plans-pricing/payment/${PRICING_PLAN_ALL_ACCESS_ID}`);
    });


    // --- PIPELINE B: E-Commerce Webhooks (One-Time & Print) ---
    
    $w('#btnDigitalSingle').onClick(() => {
        // Navigates to Wix Stores product page
        wixLocation.to(STORE_URL_DIGITAL_SINGLE);
    });

    $w('#btnPrintSingle').onClick(() => {
        // Navigates to Wix Stores product page
        wixLocation.to(STORE_URL_PRINT_SINGLE);
    });

    $w('#btnPrintCollector').onClick(() => {
        // Navigates to Wix Stores product page
        wixLocation.to(STORE_URL_PRINT_COLLECTOR);
    });


    // --- PIPELINE C: White-Glove B2B (Corporate & Education) ---
    
    $w('#btnEducationRate').onClick(() => {
        // Opens the specific form lightbox for academic credential submission
        wixWindow.openLightbox("Submit_Academic_Credentials");
    });

    $w('#btnCorporateGroup').onClick(() => {
        // Opens the specific form lightbox for corporate inquiry
        wixWindow.openLightbox("Corporate_Inquiry_Form");
    });

});
