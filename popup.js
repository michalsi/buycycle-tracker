document.getElementById('fetch-data').addEventListener('click', () => {
    const statusElement = document.getElementById('status');
    statusElement.textContent = "Capturing data...";

    chrome.runtime.sendMessage({ action: 'fetchData' }, (response) => {
        if (response && response.success) {
            statusElement.textContent = response.message;
            // Optionally, you can retrieve and display the data here
            chrome.storage.local.get('bikeData', (result) => {
                console.log('Stored bike data:', result.bikeData);
                // You can add code here to display the data in your popup
            });
        } else {
            statusElement.textContent = response.message || "Failed to capture data.";
        }
    });
});

document.getElementById('view-data').addEventListener('click', () => {
    chrome.tabs.create({ url: "data.html" });
});