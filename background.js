let capturedHeaders = null;

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        console.log('Request Headers:', details.requestHeaders);
        capturedHeaders = details.requestHeaders;
    },
    { urls: ['https://buycycle.com/pl-pl/shop-api/get-content'] },
    ['requestHeaders']
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchData') {
        if (!capturedHeaders) {
            sendResponse({ success: false, message: "No headers captured yet. Please visit the Buycycle page first." });
            return true;
        }

        const headers = capturedHeaders.reduce((acc, header) => {
            acc[header.name] = header.value;
            return acc;
        }, {});

        fetch('https://buycycle.com/pl-pl/shop-api/get-content', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "frame-material": ["carbon"],
                "frame-sizes": ["m"],
                "brands": ["orbea"],
                "families": ["rise"],
                "sort-by": "new",
                "filter_url": "/pl-pl/shop/brands/orbea/families/rise/frame-sizes/m/frame-material/carbon/sort-by/new",
                "perPage": 51,
                "distinct_id": "",
                "recommendationVersion": null
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log("Full API Response:", JSON.stringify(data, null, 2));
                const bikesArray = data?.bikes?.data || []; // Corrected path
                chrome.storage.local.set({ bikeData: JSON.stringify(bikesArray) }, () => {
                    console.log("Bike Data stored successfully");
                    sendResponse({ success: true, data: data });
                });
            })
            .catch(error => {
                console.error("Error in fetch or processing data:", error);
                sendResponse({ success: false, message: "Failed to capture data. Error: " + error.message });
            });

        return true; // Indicates that the response is sent asynchronously
    }
});