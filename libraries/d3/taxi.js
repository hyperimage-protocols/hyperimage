// Set up dimensions and margins
const width = window.innerWidth;
const height = window.innerHeight;

// Create SVG element
const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

// Create a group for zoom functionality
const g = svg.append('g');

// Add zoom behavior with constrained extent
const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
    });

svg.call(zoom);

// Create tooltip
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

// Initialize simulation variable
let simulation;
let allNodes, allLinks;
let link, node, label, voronoi;
let showVoronoi = true;

// Borough color scale
const boroughColors = {
    'Manhattan': '#e41a1c',
    'Brooklyn': '#377eb8',
    'Queens': '#4daf4a',
    'Bronx': '#984ea3'
};

// Track which borough is selected
let selectedBorough = 'Manhattan';

// Filter settings
let maxConnectionsPerNode = 6;
let selectedMetric = 'price'; // 'price' or 'time'

// Load both CSV files
Promise.all([
    d3.csv('2023_Yellow_Taxi_Trip_Data_20251105.csv'),
    d3.csv('NYC_Taxi_Zones_20251105.csv')
]).then(([tripData, zoneData]) => {

    // Create a map of zone ID to zone info
    const zoneMap = {};
    zoneData.forEach(d => {
        zoneMap[d['Location ID']] = {
            name: d['Zone'],
            borough: d['Borough']
        };
    });

    // Filter out airport zones by name
    const airportZoneNames = ['Newark Airport', 'JFK Airport', 'LaGuardia Airport'];
    const airportZoneIds = new Set(
        zoneData.filter(d => airportZoneNames.includes(d['Zone']))
            .map(d => d['Location ID'])
    );

    console.log('Excluding airport zones:', Array.from(airportZoneIds));

    // Process data to create nodes and links with multiple metrics
    const trips = {};
    const zones = new Set();

    // Count trips between each pair of zones, excluding airport trips
    tripData.forEach(d => {
        const pickup = d.PULocationID;
        const dropoff = d.DOLocationID;

        // Skip if either location is an airport
        if (airportZoneIds.has(pickup) || airportZoneIds.has(dropoff)) return;

        // Skip self-loops (same pickup and dropoff)
        if (pickup === dropoff) return;

        zones.add(pickup);
        zones.add(dropoff);

        // Create a unique key for each connection (sorted to treat as undirected)
        const key = [pickup, dropoff].sort().join('-');

        if (!trips[key]) {
            trips[key] = {
                source: pickup,
                target: dropoff,
                count: 0,
                totalFare: 0,
                totalTime: 0
            };
        }

        trips[key].count++;

        // Add fare amount
        const fare = parseFloat(d.fare_amount);
        if (!isNaN(fare) && fare > 0) {
            trips[key].totalFare += fare;
        }

        // Calculate trip duration in minutes
        const pickupTime = new Date(d.tpep_pickup_datetime);
        const dropoffTime = new Date(d.tpep_dropoff_datetime);
        const duration = (dropoffTime - pickupTime) / (1000 * 60); // minutes
        if (!isNaN(duration) && duration > 0 && duration < 300) { // exclude unrealistic durations
            trips[key].totalTime += duration;
        }
    });

    // Calculate averages for each link
    Object.values(trips).forEach(trip => {
        trip.avgFare = trip.totalFare / trip.count;
        trip.avgTime = trip.totalTime / trip.count;
    });

    // Create nodes array with zone info
    const nodes = Array.from(zones).map(id => ({
        id: id,
        name: zoneMap[id]?.name || `Zone ${id}`,
        borough: zoneMap[id]?.borough || 'Unknown',
        trips: 0
    }));

    // Count total trips per zone
    tripData.forEach(d => {
        const pickup = d.PULocationID;
        const dropoff = d.DOLocationID;

        // Skip airport trips
        if (airportZoneIds.has(pickup) || airportZoneIds.has(dropoff)) return;

        const pickupNode = nodes.find(n => n.id === pickup);
        const dropoffNode = nodes.find(n => n.id === dropoff);
        if (pickupNode) pickupNode.trips++;
        if (dropoffNode) dropoffNode.trips++;
    });

    // Create links array from trips object
    const links = Object.values(trips);

    // Store all data for filtering
    allNodes = nodes;
    allLinks = links;

    console.log(`Total zones (excluding airports): ${zones.size}`);
    console.log(`Total connections: ${links.length}`);

    // Initial render (will calculate bounds internally)
    renderGraph();

    // Set up borough checkboxes
    setupBoroughFilters();

    // Set up control event listeners
    setupControls();

}).catch(error => {
    console.error('Error loading CSV:', error);
    d3.select('#chart').append('p')
        .style('color', 'red')
        .text('Error loading data. Make sure the CSV files are in the same directory.');
});


function setupControls() {
    // Slider control for charge strength
    const slider = d3.select('#repulsion-slider');
    const sliderValue = d3.select('#repulsion-value');

    slider.on('input', function() {
        const value = +this.value;
        sliderValue.text(value);

        // Update the force and restart simulation (negate value for repulsion)
        if (simulation) {
            simulation.force('charge', d3.forceManyBody().strength(-value));
            simulation.alpha(0.3).restart();
        }
    });

    // Metric radio buttons
    d3.selectAll('input[name="metric"]').on('change', function() {
        selectedMetric = this.value;
        renderGraph();
    });
}

function getMetricValue(link) {
    switch(selectedMetric) {
        case 'trips':
            return link.count;
        case 'price':
            // Invert: lower fare = stronger connection
            // Use reciprocal so cheap connections have high values
            return link.avgFare > 0 ? 1 / link.avgFare : 0;
        case 'time':
            // Invert: shorter time = stronger connection
            // Use reciprocal so quick connections have high values
            return link.avgTime > 0 ? 1 / link.avgTime : 0;
        default:
            return link.count;
    }
}

function getMetricLabel(link) {
    switch(selectedMetric) {
        case 'trips':
            return `${link.count} trips`;
        case 'price':
            return `$${link.avgFare.toFixed(2)} avg fare`;
        case 'time':
            return `${link.avgTime.toFixed(1)} min avg`;
        default:
            return `${link.count} trips`;
    }
}

function renderGraph() {
    // First, filter all data by selected borough to get accurate bounds
    const boroughNodes = allNodes.filter(n => n.borough === selectedBorough);
    const boroughNodeIds = new Set(boroughNodes.map(n => n.id));

    // Get only links within this borough
    const boroughLinks = allLinks.filter(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return boroughNodeIds.has(sourceId) && boroughNodeIds.has(targetId);
    });

    // Use all borough links (no minimum trips filter)
    let filteredLinks = boroughLinks;

    // For each node, keep only the top N strongest connections based on selected metric
    const linksByNode = {};
    filteredLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        if (!linksByNode[sourceId]) linksByNode[sourceId] = [];
        if (!linksByNode[targetId]) linksByNode[targetId] = [];

        linksByNode[sourceId].push(link);
        linksByNode[targetId].push(link);
    });

    // Sort and limit connections per node based on selected metric
    const keptLinks = new Set();
    Object.keys(linksByNode).forEach(nodeId => {
        const links = linksByNode[nodeId];
        // Sort by metric value descending and keep top N
        links.sort((a, b) => getMetricValue(b) - getMetricValue(a));
        links.slice(0, maxConnectionsPerNode).forEach(link => keptLinks.add(link));
    });

    filteredLinks = Array.from(keptLinks);

    // Get all zones that are part of filtered links
    const activeZones = new Set();
    filteredLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        activeZones.add(sourceId);
        activeZones.add(targetId);
    });

    // Filter nodes to only include active zones and selected borough
    const filteredNodes = allNodes.filter(n =>
        activeZones.has(n.id) && n.borough === selectedBorough
    );
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter links again to only include nodes that are in enabled boroughs
    filteredLinks = filteredLinks.filter(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    console.log(`Filtered to ${filteredNodes.length} nodes and ${filteredLinks.length} links`);

    // Clear previous graph
    g.selectAll('*').remove();

    if (filteredNodes.length === 0) {
        return;
    }

    // Create scale for text size based on trip count
    const tripCounts = filteredNodes.map(n => n.trips);
    const maxTrips = d3.max(tripCounts);
    const minTrips = d3.min(tripCounts);

    const textSizeScale = d3.scaleLinear()
        .domain([minTrips, maxTrips])
        .range([6, 14]);

    // Create scale for link width based on metric value
    const metricValues = filteredLinks.map(d => getMetricValue(d));
    const maxMetricValue = d3.max(metricValues);
    const minMetricValue = d3.min(metricValues);

    const linkWidthScale = d3.scaleLinear()
        .domain([minMetricValue, maxMetricValue])
        .range([1, 10]);

    // Initial charge strength (negate for repulsion)
    const chargeStrength = -d3.select('#repulsion-slider').property('value');

    // Create force simulation
    simulation = d3.forceSimulation(filteredNodes)
        .force('link', d3.forceLink(filteredLinks)
            .id(d => d.id)
            .distance(d => {
                const metricValue = getMetricValue(d);
                return 200 - (metricValue / maxMetricValue) * 150;
            })
            .strength(d => {
                const metricValue = getMetricValue(d);
                return metricValue / maxMetricValue;
            }))
        .force('charge', d3.forceManyBody()
            .strength(chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));

    // Create voronoi group (will be populated on tick)
    voronoi = g.append('g')
        .attr('class', 'voronoi-group')
        .style('opacity', showVoronoi ? 0.4 : 0);

    // Create links
    link = g.append('g')
        .selectAll('line')
        .data(filteredLinks)
        .enter()
        .append('line')
        .attr('class', 'link')
        .style('stroke', '#fff')
        .style('stroke-width', d => linkWidthScale(getMetricValue(d)))
        .style('stroke-opacity', 1);

    // Create invisible nodes for positioning only (no interaction)
    node = g.append('g')
        .selectAll('circle')
        .data(filteredNodes)
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', 0)
        .style('fill', 'none')
        .style('stroke', 'none')
        .style('pointer-events', 'none');

    // Add labels for all nodes
    label = g.append('g')
        .selectAll('g')
        .data(filteredNodes)
        .enter()
        .append('g')
        .attr('class', 'node-label-group')
        .style('pointer-events', 'all')
        .style('cursor', 'pointer')
        .each(function(d) {
            const group = d3.select(this);
            const fontSize = textSizeScale(d.trips);
            const baseColor = boroughColors[d.borough] || '#999';

            // Get the opacity for this node's cell (will be calculated in updateVoronoi)
            // Store reference to node data for later opacity lookup
            group.datum(d);

            let lines;
            if (d.name.includes('/')) {
                // If there's a forward slash, add line break after it but keep the slash
                lines = d.name.split('/').map((part, i, arr) =>
                    i < arr.length - 1 ? part + '/' : part
                );
            } else {
                // Count spaces in the name
                const spaces = (d.name.match(/ /g) || []).length;

                if (spaces === 3) {
                    // If 3 spaces, replace only the second space with a line break
                    const parts = d.name.split(' ');
                    lines = [parts.slice(0, 2).join(' '), parts.slice(2).join(' ')];
                } else {
                    // Otherwise, replace all spaces with line breaks
                    lines = d.name.split(' ');
                }
            }

            // Calculate vertical offset to center multi-line text
            const lineHeight = fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;
            const startY = -(totalHeight / 2) + (lineHeight / 2);

            lines.forEach((line, i) => {
                group.append('text')
                    .attr('class', 'node-label')
                    .attr('text-anchor', 'middle')
                    .attr('dy', startY + (i * lineHeight))
                    .style('font-size', `${fontSize}px`)
                    .style('fill', baseColor)
                    .style('user-select', 'none')
                    .text(line.trim());
            });
        })
        .on('mouseover', function(event, d) {
            // Highlight connected links
            link.style('stroke-opacity', l => {
                if (l.source.id === d.id || l.target.id === d.id) {
                    return 1;
                }
                return 0.1;
            });
        })
        .on('mouseout', function(event, d) {
            // Reset link opacity to full
            link.style('stroke-opacity', 1);
        });

    // Update positions on each tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        label
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Update voronoi diagram
        updateVoronoi();
    });
}

function setupBoroughFilters() {
    const filterContainer = d3.select('#borough-filters');

    Object.keys(boroughColors).forEach((borough, index) => {
        const item = filterContainer.append('div')
            .attr('class', 'radio-item');

        const input = item.append('input')
            .attr('type', 'radio')
            .attr('name', 'borough')
            .attr('id', `borough-${borough}`)
            .attr('value', borough)
            .property('checked', index === 0) // Check first one (Manhattan)
            .on('change', function() {
                selectedBorough = this.value;
                updateBoroughStyles();
                renderGraph();
            });

        item.append('label')
            .attr('for', `borough-${borough}`)
            .text(borough);
    });

    // Set initial styles
    updateBoroughStyles();
}

function updateBoroughStyles() {
    // Update all borough labels
    d3.selectAll('#borough-filters .radio-item label').each(function() {
        const input = d3.select(this.previousElementSibling);
        const borough = input.attr('value');
        const isChecked = input.property('checked');

        if (isChecked) {
            d3.select(this)
                .style('background-color', boroughColors[borough])
                .style('border-color', boroughColors[borough])
                .style('color', 'white');
        } else {
            d3.select(this)
                .style('background-color', 'transparent')
                .style('border-color', 'transparent')
                .style('color', boroughColors[borough]);
        }
    });
}

function updateVoronoi() {
    if (!voronoi || !node || !node.data || node.data().length === 0) return;

    const nodes = node.data();

    // Filter out nodes without valid coordinates
    const validNodes = nodes.filter(d => d.x != null && d.y != null);

    if (validNodes.length === 0) return;

    // Rank nodes by trip count
    const sortedNodes = [...validNodes].sort((a, b) => a.trips - b.trips);
    const rankMap = new Map();
    sortedNodes.forEach((node, index) => {
        rankMap.set(node.id, index);
    });

    // Create opacity scale based on rank (evenly divided)
    const opacityScale = d3.scaleLinear()
        .domain([0, validNodes.length - 1])
        .range([0.1, 0.5]); // Lighter for fewer trips, darker for more trips

    // Create Delaunay triangulation from node positions
    const delaunay = d3.Delaunay.from(validNodes, d => d.x, d => d.y);
    // Expand voronoi bounds to 3x viewport size, centered
    const voronoiDiagram = delaunay.voronoi([-width, -height, width * 2, height * 2]);

    // Update voronoi cells
    const cells = voronoi.selectAll('path')
        .data(validNodes, d => d.id);

    cells.exit().remove();

    cells.enter()
        .append('path')
        .merge(cells)
        .attr('d', (d, i) => voronoiDiagram.renderCell(i))
        .style('fill', d => boroughColors[d.borough] || '#999')
        .style('fill-opacity', d => opacityScale(rankMap.get(d.id)))
        .style('stroke', 'none')
        .style('pointer-events', 'none');

    // Update visibility (but don't override fill-opacity)
    voronoi.style('display', showVoronoi ? 'block' : 'none');
}
