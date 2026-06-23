import wixLocation from 'wix-location';

$w.onReady(function () {
    // Assuming you have a repeater or a dataset, usually the click is handled via the Editor.
    // If you need it in code, you can use the onClick event of the box container:
    $w("#boxContainer").onClick((event) => {
        let $item = $w.at(event.context);
        let itemData = $item("#dataset1").getCurrentItem();
        
        // Navigates to the dynamic item page. 
        // Replace 'link-HeraldArticles-title' with your actual dynamic page URL field key.
        wixLocation.to(itemData["link-HeraldArticles-title"]);
    });
});
