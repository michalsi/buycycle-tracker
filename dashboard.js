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
    const headers = ['Name', 'Year', 'Current Price', 'MSRP', 'Status', 'Preowned', 'Receipt', 'Last Service', 'Mileage', 'Component' , 'City' , 'Price Data', 'Price History', 'Info'];
    headers.forEach((header, index) => {
        const headerCell = document.createElement('th');
        headerCell.textContent = header;
        headerCell.style.cursor = 'pointer';
        headerCell.addEventListener('click', () => sortTable(table, index));
        headerRow.appendChild(headerCell);
    });
}

let sortDirection = {};
function sortTable(table, columnIndex) {
    const rows = Array.from(table.rows).slice(1); // Exclude header row
    const headerCell = table.rows[0].cells[columnIndex];
    // Determine the sort direction
    const isAscending = sortDirection[columnIndex] !== 'asc';
    sortDirection[columnIndex] = isAscending ? 'asc' : 'desc';
    // Sort rows
    rows.sort((a, b) => {
        const cellA = a.cells[columnIndex].textContent.trim();
        const cellB = b.cells[columnIndex].textContent.trim();
        if (isFinite(cellA) && isFinite(cellB)) {
            return isAscending ? cellA - cellB : cellB - cellA;
        } else {
            return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        }
    });

    rows.forEach(row => table.appendChild(row));
    document.querySelectorAll('th').forEach(th => th.textContent = th.textContent.replace(/ ▲| ▼/, ''));
    headerCell.textContent += isAscending ? ' ▲' : ' ▼';
}

function populateTableRows(table, bikeData) {
    const years = bikeData.map(bike => bike.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    bikeData.forEach(bike => {
        const row = table.insertRow();
        addCellWithLink(row, bike.name, bike.url, bike.image_url);
        addYearCell(row, bike.year);
        addCellWithEuro(row, bike.price_converted_formatted, bike.price);
        addCellWithStrikethrough(row, bike.msrp_converted_formatted);
        addCell(row, bike.status || 'available');
        addCell(row, bike.preowned ? 'Yes' : 'No');
        addCell(row, bike.receipt_present ? 'Yes' : 'No');
        addCell(row, bike.last_service_code);
        addMileageCell(row, bike.mileage_code);
        addComponentCell(row, bike.component);
        addCell(row, bike.city);
        addPriceDataCell(row, bike);
        addPriceHistoryCell(row, bike.price_history);
        addExpandableInfoCell(row, bike.info);
    });
}

function addYearCell(row, year) {
    const cell = row.insertCell();
    let colorClass = '';
    switch (year) {
        case 2025:
            colorClass = 'link-text-green';
            break;
        case 2024:
            colorClass = 'link-text-blue';
            break;
        case 2023:
            colorClass = 'link-text-orange';
            break;
        default:
            colorClass = 'link-text-red';
            break;
    }
    const span = document.createElement('span');
    span.textContent = year;
    if (colorClass) {
        span.classList.add(colorClass);
    }
    cell.appendChild(span);
}

function addPriceDataCell(row, bike) {
    const cell = row.insertCell();
    const created = formatDate(bike.created_at);
    const changed = formatDate(bike.price_changed_at);
    const updated = formatDate(bike.updated_at);
    const sold = formatDate(bike.sold_date)
    cell.innerHTML = `
        <div>Created: ${created}</div>
        <div>Changed: ${changed}</div>
        <div>Updated: ${updated}</div>
        <div>Sold: ${sold}</div>
    `;
}

function addCellWithGradient(row, value, min, max) {
    const cell = row.insertCell();
    cell.textContent = value;
    const ratio = (value - min) / (max - min);
    const red = Math.floor(255 - (255 * ratio));
    const green = Math.floor(255 * ratio);
    cell.style.backgroundColor = `rgb(${red}, ${green}, 150)`;
}

function addMileageCell(row, mileageCode) {
    const cell = row.insertCell();
    cell.textContent = mileageCode;
    let tagClass = '';
    switch (mileageCode) {
        case '0km':
            tagClass = 'tag-green';
            break;
        case 'less_than_500':
            tagClass = 'tag-blue';
            break;
        case '500_3000':
            tagClass = 'tag-orange';
            break;
        case '3000_10000':
            tagClass = 'tag-red';
            break;
        default:
            tagClass = ''; // No specific class for other values
    }
    if (tagClass) {
        cell.innerHTML = `<span class="tag ${tagClass}">${mileageCode}</span>`;
    }
}

function addCellWithEuro(row, formattedPrice, price) {
    const cell = row.insertCell();
    cell.innerHTML = `${formattedPrice} <i>(${price} €)</i>`;
}

function addCell(row, text) {
    const cell = row.insertCell();
    let formattedText = text || '';
    if (formattedText === 'Yes') {
        cell.innerHTML = `<span class="tag tag-green">${formattedText}</span>`;
    } else if (formattedText === 'No') {
        cell.innerHTML = `<span class="tag tag-red">${formattedText}</span>`;
    } else {
        cell.textContent = formattedText;
    }
}

function addCellWithLink(row, text, url, imageUrl) {
    const cell = row.insertCell();
    const link = document.createElement('a');
    link.href = url;
    link.textContent = text;
    link.target = '_blank';
    // Determine the color class based on the link text
    let colorClass = '';
    if (text.includes('M-TEAM')) {
        colorClass = 'link-text-green';
    } else if (text.includes('M-LTD')) {
        colorClass = 'link-text-blue';
    } else if (text.includes('M10')) {
        colorClass = 'link-text-orange';
    } else if (text.includes('M20')) {
        colorClass = 'link-text-red';
    }
    if (colorClass) {
        link.classList.add(colorClass);
    }
    cell.appendChild(link);
    // Add the image below the link, if the image URL is provided
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.width = '100px';
        img.style.display = 'block'; // Ensures the image starts on a new line
        img.style.marginTop = '5px'; // Adds some space between the link and the image
        cell.appendChild(img);
    }
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