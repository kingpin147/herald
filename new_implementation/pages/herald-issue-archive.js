import { getIssuesSecurely } from 'backend/archiveService';

$w.onReady(async function () {
    const htmlComponent = $w("#htmlComponent1");

    // Tell the HTML Component to show a loading state (or it can do it by default)
    
    // Wait for the HTML component to announce it is ready
    htmlComponent.onMessage(async (event) => {
        if (event.data.type === "COMPONENT_READY") {
            // Fetch the issues from our zero-trust backend
            const response = await getIssuesSecurely();

            if (response.success) {
                // Send the securely stripped payload to the HTML Component UI
                htmlComponent.postMessage({
                    type: "RENDER_ARCHIVE",
                    payload: {
                        issues: response.issues,
                        hasAccess: response.hasAccess
                    }
                });
            } else {
                console.error("Failed to fetch issues", response.error);
                htmlComponent.postMessage({
                    type: "RENDER_ERROR",
                    payload: { message: "Failed to load archive." }
                });
            }
        }
    });
});
