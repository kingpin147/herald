import { currentMember } from 'wix-members-frontend';
import { orders } from 'wix-pricing-plans-frontend';

// Helper function to convert Raw HTML from the database into a Wix Rich Content JSON object
function convertHtmlToRichContent(htmlString, maxWords = null) {
    if (!htmlString) return { nodes: [] };
    
    let richContent = { nodes: [] };
    // Split the HTML by paragraph tags
    let paragraphs = htmlString.split(/<p[^>]*>/i);
    let wordCount = 0;
    let limitReached = false;
    
    for (let i = 0; i < paragraphs.length; i++) {
        if (limitReached) break;
        
        // Get the content inside the paragraph
        let pContent = paragraphs[i].split(/<\/p>/i)[0].trim();
        if (!pContent) continue;
        
        // Clean up common HTML entities and tags
        pContent = pContent.replace(/<br\s*\/?>/gi, '\n');
        let text = pContent.replace(/<[^>]+>/g, '');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
        
        if (!text || text.trim() === "") continue;
        
        // Apply truncation if needed
        if (maxWords !== null) {
            let words = text.split(/\s+/).filter(w => w.length > 0);
            if (wordCount + words.length > maxWords) {
                let allowedWords = maxWords - wordCount;
                text = words.slice(0, allowedWords).join(" ") + "...";
                limitReached = true;
                wordCount += allowedWords;
            } else {
                wordCount += words.length;
            }
        }
        
        // Create a valid Wix Rich Content PARAGRAPH node
        richContent.nodes.push({
            type: "PARAGRAPH",
            id: "p" + i,
            nodes: [{
                type: "TEXT",
                id: "",
                textData: { text: text }
            }]
        });
    }
    
    // Add Upgrade notice if truncated
    if (limitReached) {
        richContent.nodes.push({
            type: "PARAGRAPH",
            id: "upgrade_notice",
            nodes: [{
                type: "TEXT",
                id: "",
                textData: { text: "\n\n[Upgrade to Premium to read the full article]" }
            }]
        });
    }
    
    return richContent;
}

$w.onReady(function () {
    $w("#dynamicDataset").onReady(async () => {
        try {
            console.log("1. Dataset ready callback started.");
            const item = $w("#dynamicDataset").getCurrentItem();
            
            // Handle the UI Connections
            if ($w("#title").type) $w("#title").text = item.title || "";
            if ($w("#authorName").type) $w("#authorName").text = item.authorName || "";
            if (item.bannerImage && $w("#bannerImage").type) {
                $w("#bannerImage").src = item.bannerImage;
            }
            
            if (item.imagesGallery && item.imagesGallery.length > 0 && $w("#imagesGallery").type) {
                $w("#imagesGallery").items = item.imagesGallery.map(img => ({
                    type: "image",
                    src: img.src,
                    title: img.title || "",
                    description: img.description || ""
                }));
            } else if ($w("#imagesGallery").type) {
                $w("#imagesGallery").items = [];
            }
            
            console.log("2. Handling Rich Content logic...");
            let rawHtmlContent = item.articleText; 
            let isFreePlan = true; 
            
            try {
                let member = await currentMember.getMember();
                if (member) {
                    let memberOrders = await orders.listCurrentMemberOrders();
                    let activePlans = memberOrders.filter(order => order.status === 'ACTIVE');
                    if (activePlans && activePlans.length > 0) {
                        isFreePlan = false; 
                    }
                }
            } catch (err) {
                console.error("DEBUG: listCurrentMemberOrders failed:", err);
            }
            
            console.log("3. isFreePlan:", isFreePlan);
            
            try {
                if (isFreePlan && rawHtmlContent) {
                    console.log("4. Converting & Truncating HTML for Free Plan...");
                    // Pass 200 as the max word limit
                    let richContentObj = convertHtmlToRichContent(rawHtmlContent, 200);
                    $w("#richContentViewer").content = richContentObj;
                    
                } else if (!isFreePlan && rawHtmlContent) {
                    console.log("4. User is premium, converting full HTML...");
                    // Pass null to not truncate
                    let richContentObj = convertHtmlToRichContent(rawHtmlContent, null);
                    $w("#richContentViewer").content = richContentObj;
                }
            } catch (err) {
                console.error("DEBUG: Failed to assign Content to viewer:", err);
            }
            
            console.log("5. Dataset callback completed successfully!");
            
        } catch (error) {
            console.error("DEBUG ERROR in datasetReady:", error.message, error.stack);
        }
    });
});
