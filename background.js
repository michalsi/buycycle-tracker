const BUY_CYCLE_API_URL = 'https://buycycle.com/pl-pl/shop-api/get-content';
const FILTER_URL = "/pl-pl/shop/brands/orbea/families/rise/frame-sizes/m/frame-material/carbon/sort-by/new";

const STORAGE_KEY = 'bikeData';

let capturedHeaders = null;

// Listener to capture request headers
chrome.webRequest.onBeforeSendHeaders.addListener(
    captureRequestHeaders,
    { urls: [BUY_CYCLE_API_URL] },
    ['requestHeaders']
);

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener(handleMessages);

/**
 * Captures request headers for future use.
 * @param {Object} details - Details of the request.
 */
function captureRequestHeaders(details) {
    console.log('Request Headers:', details.requestHeaders);
    capturedHeaders = details.requestHeaders;
}

/**
 * Handles incoming messages.
 * @param {Object} request - The request message.
 * @param {Object} sender - The sender of the message.
 * @param {Function} sendResponse - Function to send response.
 * @returns {Boolean} Indicates asynchronous response.
 */
function handleMessages(request, sender, sendResponse) {
    if (request.action === 'fetchData') {
        fetchData(sendResponse);
        return true;
    }
    return false;
}

/**
 * Fetches data from the Buycycle API and processes it.
 * @param {Function} sendResponse - Function to send response.
 */
function fetchData(sendResponse) {
    if (!capturedHeaders) {
        sendResponse({ success: false, message: "No headers captured yet. Please visit the Buycycle page first." });
        return;
    }

    const headers = convertHeadersToObject(capturedHeaders);
    const requestBody = getRequestBody(FILTER_URL);

    fetch(BUY_CYCLE_API_URL, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })
        .then(response => response.json())
        .then(data => processApiResponse(data, sendResponse))
        .catch(error => handleError(error, sendResponse));
}

/**
 * Converts an array of headers to an object.
 * @param {Array} headersArray - Array of headers.
 * @returns {Object} Headers object.
 */
function convertHeadersToObject(headersArray) {
    return headersArray.reduce((acc, header) => {
        acc[header.name] = header.value;
        return acc;
    }, {});
}

/**
 * Returns the request body for the API call.
 * @returns {Object} Request body.
 */
function getRequestBody(filterUrl) {
    return {
        "frame-material": ["carbon"],
        "frame-sizes": ["m"],
        "brands": ["orbea"],
        "families": ["rise"],
        "sort-by": "new",
        "filter_url": filterUrl,
        "perPage": 51,
        "distinct_id": "",
        "recommendationVersion": null
    };
}

/**
 * Processes the API response and updates local storage.
 * @param {Object} data - API response data.
 * @param {Function} sendResponse - Function to send response.
 */
function processApiResponse(data, sendResponse) {
    console.log("Full API Response:", JSON.stringify(data, null, 2));
    const bikesArray = data?.bikes?.data || [];

    chrome.storage.local.get(STORAGE_KEY, (result) => {
        const existingBikes = parseExistingBikeData(result[STORAGE_KEY]);
        const processedBikes = processBikesData(bikesArray, existingBikes);

        chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(processedBikes) }, () => {
            console.log("Bike Data stored successfully");
            sendResponse({ success: true, data: processedBikes });
        });
    });
}

/**
 * Parses existing bike data from storage.
 * @param {String} bikeData - Existing bike data in JSON format.
 * @returns {Object} Parsed bike data.
 */
function parseExistingBikeData(bikeData) {
    try {
        return JSON.parse(bikeData).reduce((acc, bike) => {
            acc[bike.id] = bike;
            return acc;
        }, {});
    } catch (error) {
        console.error("Error parsing existing bike data:", error);
        return {};
    }
}

/**
 * Processes the bikes data by comparing with existing data.
 * @param {Array} bikesArray - Array of new bike data.
 * @param {Object} existingBikes - Existing bike data.
 * @returns {Array} Processed bikes data.
 */
function processBikesData(bikesArray, existingBikes) {
    return bikesArray.map(bike => {
        const existingBike = existingBikes[bike.id];
        const priceHistory = existingBike?.price_history || [];

        // Check if the price has changed
        if (!existingBike || existingBike.price !== bike.price) {
            priceHistory.push({
                price: bike.price,
                date: new Date().toISOString()
            });
        }

        return {
            ...bike,
            url: `https://buycycle.com/pl-pl/bike/${bike.slug}`,
            image_url: bike.image_side?.file_url,
            price_history: priceHistory
        };
    });
}

/**
 * Handles errors in fetch or processing data.
 * @param {Error} error - Error object.
 * @param {Function} sendResponse - Function to send response.
 */
function handleError(error, sendResponse) {
    console.error("Error in fetch or processing data:", error);
    sendResponse({ success: false, message: "Failed to capture data. Error: " + error.message });
}