import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getArticleSecurely } from 'backend/articleService';

$w.onReady(async function () {
    const htmlComponent = $w("#htmlComponent1");

    htmlComponent.onMessage(async (event) => {
        if (event.data.type === "COMPONENT_READY") {
            // Grab the slug from the dynamic page URL or router
            const path = wixLocation.path;
            const articleSlug = path[path.length - 1]; // e.g. /herald-article/slug

            if (!articleSlug) {
                console.error("No article slug provided");
                return;
            }

            // Call the zero-trust backend router
            const response = await getArticleSecurely(articleSlug);

            if (response.success && response.article) {
                // Send the securely stripped payload to the HTML Component UI
                htmlComponent.postMessage({
                    type: "RENDER_ARTICLE",
                    payload: {
                        article: response.article,
                        hasAccess: response.hasAccess
                    }
                });
            } else {
                // Handle article not found or error
                wixLocation.to('/404');
            }
        }
        
        if (event.data.type === "OPEN_LOGIN_GATE") {
            // Trigger the Free Gate (Pipeline A) - Wix Lightbox Signup Form
            wixWindow.openLightbox("Signup_Gate");
        }
    });
});
