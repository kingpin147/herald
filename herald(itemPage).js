import wixUsers from 'wix-users';

$w.onReady(function () {
    $w("#dynamicDataset").onReady(async () => {
        try {
            console.log("1. Dataset ready callback started.");
            const item = $w("#dynamicDataset").getCurrentItem();
            console.log("2. Item loaded:", item ? item._id : "No item");
            
            console.log("3. Setting title...");
            $w("#title").text = item.title || "";
            
            console.log("4. Setting author name...");
            $w("#authorName").text = item.authorName || "";
            
            console.log("5. Setting banner image...");
            if (item.bannerImage) {
                $w("#bannerImage").src = item.bannerImage;
            }
            
            console.log("6. Setting gallery items...");
            if (item.imagesGallery && item.imagesGallery.length > 0) {
                let galleryItems = item.imagesGallery.map(img => {
                    return {
                        type: "image",
                        src: img.src,
                        title: img.title || "",
                        description: img.description || ""
                    };
                });
                $w("#imagesGallery").items = galleryItems;
            } else {
                $w("#imagesGallery").items = [];
            }
            
            console.log("7. Handling Article Text logic...");
            let articleText = item.articleText || "";
            let isFreePlan = true; 
            
            if (wixUsers.currentUser.loggedIn) {
                let pricingPlans = await wixUsers.currentUser.getPricingPlans();
                if (pricingPlans && pricingPlans.length > 0) {
                    isFreePlan = false; 
                }
            }
            
            console.log("8. isFreePlan:", isFreePlan);
            
            if (isFreePlan) {
                let plainText = articleText.replace(/(<([^>]+)>)/gi, " ");
                let words = plainText.split(/\s+/).filter(word => word.length > 0);
                
                console.log("9. Word count:", words.length);
                
                if (words.length > 200) {
                    let limitedText = words.slice(0, 200).join(" ") + "... \n\n[Upgrade to Premium to read the full article]";
                    console.log("10. Setting truncated article text to #articleText...");
                    $w("#articleText").text = limitedText;
                } else {
                    console.log("10. Setting full plain text to #articleText...");
                    $w("#articleText").text = plainText;
                }
            }
            
            console.log("11. Dataset callback completed successfully!");
            
        } catch (error) {
            console.error("DEBUG ERROR in datasetReady:", error.message, error.stack);
        }
    });
});
