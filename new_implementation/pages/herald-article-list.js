import wixLocation from 'wix-location';
import { getArticleList } from 'backend/listService';

$w.onReady(async function () {
    const htmlComponent = $w("#htmlComponent1");

    htmlComponent.onMessage(async (event) => {
        if (event.data.type === "COMPONENT_READY") {
            // Fetch the optimized list of articles
            const response = await getArticleList();

            if (response.success) {
                // Send the articles to the HTML Component UI for client-side rendering & filtering
                htmlComponent.postMessage({
                    type: "RENDER_ARTICLE_LIST",
                    payload: {
                        articles: response.articles
                    }
                });
            } else {
                console.error("Failed to fetch article list", response.error);
                htmlComponent.postMessage({
                    type: "RENDER_ERROR",
                    payload: { message: "Failed to load the article feed." }
                });
            }
        }
        
        // Handle navigation clicks from the HTML component
        if (event.data.type === "NAVIGATE") {
            const slug = event.data.payload.slug;
            if (slug) {
                // Navigate to the dynamic item page
                wixLocation.to(`/herald-article/${slug}`);
            }
        }
    });
});
