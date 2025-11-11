// Initialize the map centered on Roosevelt Island, NYC
// Coordinates: approximately 40.7614° N, 73.9509° W
// Set bounds for NYC area
const nycBounds = [
    [40.4774, -74.2591], // Southwest corner
    [40.9176, -73.7004]  // Northeast corner
];

const map = L.map('map', {
    center: [40.7614, -73.9509],
    zoom: 15,
    minZoom: 10,
    maxZoom: 18,
    maxBounds: nycBounds,
    maxBoundsViscosity: 1.0
});

// Add OpenStreetMap tile layer
/*
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);
*/

var Stadia_StamenTonerBackground = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 20,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
});

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var CartoDB_DarkMatterNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 20
});

// Add default layer
CartoDB_DarkMatterNoLabels.addTo(map);

// Create layer groups for overlays
var greenThumbLayer = L.layerGroup();
var foreverWildLayer = L.layerGroup();
var parksLayer = L.layerGroup();
var openStreetsLayer = L.layerGroup();
var farmersMarketsLayer = L.layerGroup();

// Create layer control with base maps and overlays
var baseMaps = {
    "Dark": CartoDB_DarkMatterNoLabels,
    "Toner": Stadia_StamenTonerBackground,
    "Satellite": Esri_WorldImagery
};

var overlayMaps = {
    "GreenThumb Gardens": greenThumbLayer,
    "Forever Wild Areas": foreverWildLayer,
    "Parks Properties": parksLayer,
    "Open Streets": openStreetsLayer,
    "Farmers Markets": farmersMarketsLayer
};

L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);

// Add all overlay layers to map by default
greenThumbLayer.addTo(map);
foreverWildLayer.addTo(map);
parksLayer.addTo(map);
openStreetsLayer.addTo(map);
farmersMarketsLayer.addTo(map);

// Add a red circle marker for Roosevelt Island
const rooseveltMarker = L.circleMarker([40.7614, -73.9509], {
    radius: 8,
    fillColor: 'red',
    color: 'darkred',
    weight: 2,
    opacity: 1,
    fillOpacity: 1
}).addTo(map);
rooseveltMarker.bindPopup('<b>Roosevelt Island</b><br>A narrow island in NYC\'s East River');

// Load and parse the GreenThumb Garden CSV file
fetch('GreenThumb_Garden_Info_20251106.csv')
    .then(response => response.text())
    .then(csv => {
        // Parse CSV
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        // Find the indices for lat, lon, and address columns
        const latIndex = headers.indexOf('lat');
        const lonIndex = headers.indexOf('lon');
        const addressIndex = headers.indexOf('address');

        // Add markers for each coordinate
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Simple CSV parsing (handles quoted fields)
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const lat = parseFloat(values[latIndex]?.replace(/"/g, ''));
            const lon = parseFloat(values[lonIndex]?.replace(/"/g, ''));
            const address = values[addressIndex]?.replace(/"/g, '') || 'No address available';

            // Only add marker if coordinates are valid
            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                const marker = L.circleMarker([lat, lon], {
                    radius: 6,
                    fillColor: 'yellow',
                    color: 'orange',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                });
                marker.bindPopup(address);
                marker.addTo(greenThumbLayer);
            }
        }
    })
    .catch(error => console.error('Error loading GreenThumb Garden CSV:', error));

// Function to parse WKT MULTIPOLYGON to Leaflet format
function parseMultiPolygon(wkt) {
    // Extract coordinate pairs from WKT format
    const coordsMatch = wkt.match(/\(\(([^)]+)\)\)/g);
    if (!coordsMatch) return null;

    const polygons = [];
    coordsMatch.forEach(polyString => {
        const coords = polyString
            .replace(/\(\(/g, '')
            .replace(/\)\)/g, '')
            .split(',')
            .map(pair => {
                const [lon, lat] = pair.trim().split(' ');
                return [parseFloat(lat), parseFloat(lon)];
            })
            .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

        if (coords.length > 0) {
            polygons.push(coords);
        }
    });

    return polygons;
}

// Function to parse WKT MULTILINESTRING to Leaflet format
function parseMultiLineString(wkt) {
    // Extract coordinate pairs from WKT format
    const coordsMatch = wkt.match(/\(([^)]+)\)/g);
    if (!coordsMatch) return null;

    const lines = [];
    coordsMatch.forEach(lineString => {
        const coords = lineString
            .replace(/\(/g, '')
            .replace(/\)/g, '')
            .split(',')
            .map(pair => {
                const [lon, lat] = pair.trim().split(' ');
                return [parseFloat(lat), parseFloat(lon)];
            })
            .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

        if (coords.length > 0) {
            lines.push(coords);
        }
    });

    return lines;
}

// Load and parse the Forever Wild CSV file
fetch('NYC_Parks_Forever_Wild_20251106.csv')
    .then(response => response.text())
    .then(csv => {
        // Parse CSV
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        // Find the indices for shape and PropertyName columns
        const shapeIndex = headers.indexOf('shape');
        const nameIndex = headers.indexOf('PropertyName');

        // Add polygons for each shape
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Simple CSV parsing (handles quoted fields)
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const shapeWKT = values[shapeIndex]?.replace(/"/g, '');
            const name = values[nameIndex]?.replace(/"/g, '') || 'Forever Wild Area';

            if (shapeWKT && shapeWKT.startsWith('MULTIPOLYGON')) {
                const polygons = parseMultiPolygon(shapeWKT);
                if (polygons && polygons.length > 0) {
                    polygons.forEach(coords => {
                        const polygon = L.polygon(coords, {
                            color: 'blue',
                            fillColor: 'blue',
                            fillOpacity: 0.3,
                            weight: 2
                        });
                        polygon.bindPopup(name);
                        polygon.addTo(foreverWildLayer);
                    });
                }
            }
        }
    })
    .catch(error => console.error('Error loading Forever Wild CSV:', error));

// Load and parse the Parks Properties CSV file
fetch('Parks_Properties_20251111.csv')
    .then(response => response.text())
    .then(csv => {
        // Parse CSV
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        // Find the indices for multipolygon and SIGNNAME columns
        const shapeIndex = headers.indexOf('multipolygon');
        const nameIndex = headers.indexOf('SIGNNAME');

        // Add polygons for each shape
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Simple CSV parsing (handles quoted fields)
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const shapeWKT = values[shapeIndex]?.replace(/"/g, '');
            const name = values[nameIndex]?.replace(/"/g, '') || 'NYC Park';

            if (shapeWKT && shapeWKT.startsWith('MULTIPOLYGON')) {
                const polygons = parseMultiPolygon(shapeWKT);
                if (polygons && polygons.length > 0) {
                    polygons.forEach(coords => {
                        const polygon = L.polygon(coords, {
                            color: 'green',
                            fillColor: 'green',
                            fillOpacity: 0.2,
                            weight: 1
                        });
                        polygon.bindPopup(name);
                        polygon.addTo(parksLayer);
                    });
                }
            }
        }
    })
    .catch(error => console.error('Error loading Parks Properties CSV:', error));

// Load and parse the Open Streets CSV file
fetch('Open_Streets_Locations_20251111.csv')
    .then(response => response.text())
    .then(csv => {
        // Parse CSV
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        // Find the indices for The_Geom and Approved On Street columns
        const geomIndex = headers.indexOf('The_Geom');
        const streetIndex = headers.indexOf('Approved On Street');

        // Add lines for each geometry
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Simple CSV parsing (handles quoted fields)
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const geomWKT = values[geomIndex]?.replace(/"/g, '');
            const street = values[streetIndex]?.replace(/"/g, '') || 'Open Street';

            if (geomWKT && geomWKT.startsWith('MULTILINESTRING')) {
                const lineStrings = parseMultiLineString(geomWKT);
                if (lineStrings && lineStrings.length > 0) {
                    lineStrings.forEach(coords => {
                        const polyline = L.polyline(coords, {
                            color: 'purple',
                            weight: 4,
                            opacity: 0.8
                        });
                        polyline.bindPopup(street);
                        polyline.addTo(openStreetsLayer);
                    });
                }
            }
        }
    })
    .catch(error => console.error('Error loading Open Streets CSV:', error));

// Load and parse the Farmers Markets CSV file
fetch('NYC_Farmers_Markets_20251111.csv')
    .then(response => response.text())
    .then(csv => {
        // Parse CSV
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        // Find the indices for Latitude, Longitude, and Market Name columns
        const latIndex = headers.indexOf('Latitude');
        const lonIndex = headers.indexOf('Longitude');
        const nameIndex = headers.indexOf('Market Name');

        // Add markers for each coordinate
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Simple CSV parsing (handles quoted fields)
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const lat = parseFloat(values[latIndex]?.replace(/"/g, ''));
            const lon = parseFloat(values[lonIndex]?.replace(/"/g, ''));
            const name = values[nameIndex]?.replace(/"/g, '') || 'Farmers Market';

            // Only add marker if coordinates are valid
            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                const marker = L.circleMarker([lat, lon], {
                    radius: 6,
                    fillColor: 'orange',
                    color: 'darkorange',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                });
                marker.bindPopup(name);
                marker.addTo(farmersMarketsLayer);
            }
        }
    })
    .catch(error => console.error('Error loading Farmers Markets CSV:', error));
