document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
    try {
        const bikeData = await getBikeDataFromStorage();
        const parsedData = parseBikeData(bikeData);
        if (!parsedData) {
            throw new Error("Failed to parse bike data");
        }
        const table = document.getElementById('bike-data');
        createTableHeader(table);
        populateTableRows(table, parsedData);
    } catch (error) {
        document.getElementById('bike-data').innerHTML = `Error loading data: ${error.message}. Check console for details.`;
    }
}

function getBikeDataFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('bikeData', (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                if (!result.bikeData) {
                    reject(new Error("No bike data found in storage"));
                } else {
                    resolve(result.bikeData);
                }
            }
        });
    });
}

function parseBikeData(data) {
    if (!data) {
        console.error("No data to parse");
        return null;
    }
    try {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Object.values(parsed);
        } else if (Array.isArray(parsed)) {
            return parsed;
        } else {
            console.error("Parsed data is neither an object nor an array:", parsed);
            return null;
        }
    } catch (error) {
        console.error("Error parsing bikeData:", error);
        return null;
    }
}


function createTableHeader(table) {
    const headerRow = table.insertRow();
    const headers = ['Name', 'Year', 'Current Price', 'MSRP', 'Status', 'Preowned', 'Receipt', 'Last Service', 'City', 'Mileage', 'Sold Date', 'Price Changed', 'Created', 'Updated', 'Component', 'Image', 'Price History', 'Info'];

    headers.forEach(header => {
        const headerCell = document.createElement('th');
        headerCell.textContent = header;
        headerRow.appendChild(headerCell);
    });
}

function populateTableRows(table, bikeData) {
    bikeData.forEach(bike => {
        const row = table.insertRow();
        addCellWithLink(row, bike.name, bike.url);
        addCell(row, bike.year);
        addCell(row, bike.price_converted_formatted);
        addCellWithStrikethrough(row, bike.msrp_converted_formatted);
        addCell(row, bike.status || 'available');
        addCell(row, bike.preowned ? 'Yes' : 'No');
        addCell(row, bike.receipt_present ? 'Yes' : 'No');
        addCell(row, bike.last_service_code);
        addCell(row, bike.city);
        addCell(row, bike.mileage_code);
        addCell(row, formatDate(bike.sold_date));
        addCell(row, formatDate(bike.price_changed_at));
        addCell(row, formatDate(bike.created_at));
        addCell(row, formatDate(bike.updated_at));
        addComponentCell(row, bike.component);
        addImageCell(row, bike.image_url);
        addPriceHistoryCell(row, bike.price_history);
        addExpandableInfoCell(row, bike.info);
    });
}

function addCell(row, text) {
    const cell = row.insertCell();
    cell.textContent = text || '';
}

function addCellWithLink(row, text, url) {
    const cell = row.insertCell();
    const link = document.createElement('a');
    link.href = url;
    link.textContent = text;
    link.target = '_blank';
    cell.appendChild(link);
}

function addCellWithStrikethrough(row, text) {
    const cell = row.insertCell();
    const strikethrough = document.createElement('s');
    strikethrough.textContent = text || '';
    cell.appendChild(strikethrough);
}

function addComponentCell(row, component) {
    const cell = row.insertCell();
    if (component && component.name) {
        cell.textContent = `${component.name} (ID: ${component.id})`;
    } else {
        cell.textContent = 'N/A';
    }
}

function addImageCell(row, imageUrl) {
    const cell = row.insertCell();
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.width = '100px';
        cell.appendChild(img);
    }
}

function addPriceHistoryCell(row, priceHistory) {
    const cell = row.insertCell();
    if (priceHistory && priceHistory.length > 0) {
        const list = document.createElement('ul');
        priceHistory.forEach(entry => {
            const item = document.createElement('li');
            item.textContent = `${entry.price} on ${new Date(entry.date).toLocaleString()}`;
            list.appendChild(item);
        });
        cell.appendChild(list);
    } else {
        cell.textContent = 'No history available';
    }
}

function addExpandableInfoCell(row, info) {
    const cell = row.insertCell();
    cell.innerHTML = `
        <button onclick="toggleInfo(this)">Show Info</button>
        <div style="display:none;">${info}</div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '');
}