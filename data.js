document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('bikeData', (result) => {
        let bikeData;
        try {
            bikeData = JSON.parse(result.bikeData);
        } catch (error) {
            console.error("Error parsing bikeData:", error);
            const table = document.getElementById('bike-data');
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.textContent = "Error loading data. Check console for details.";
            return;
        }

        const table = document.getElementById('bike-data');

        // Create table header
        const headerRow = table.insertRow();
        ['id', 'name', 'year', 'msrp', 'status', 'preowned', 'price', 'common_price', 'frame_material_code', 'mileage_code', 'sold_date', 'price_changed_at', 'created_at', 'updated_at', 'component_name'].forEach(headerText => {
            const headerCell = document.createElement('th');
            headerCell.textContent = headerText;
            headerRow.appendChild(headerCell);
        });

        // Create table rows
        bikeData.forEach(bike => {
            const row = table.insertRow();
            ['id', 'name', 'year', 'msrp', 'status', 'preowned', 'price', 'common_price', 'frame_material_code', 'mileage_code', 'sold_date', 'price_changed_at', 'created_at', 'updated_at', 'component_name'].forEach(dataKey => {
                const cell = row.insertCell();
                // Access nested component name if available
                let value = bike[dataKey];
                if (dataKey === 'component_name' && bike.components && bike.components.length > 0) {
                    value = bike.components[0].name; // Accessing the first component's name
                }

                cell.textContent = value !== null && value !== undefined ? value : "";
            });
        });
    });
});
