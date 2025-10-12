// Configuration variables
const fovAngle = 45; // Field of view in degrees
const roomDepth = 5.0; // Room depth as multiple of container width
const depthLineInterval = 0.2; // Distance between horizontal depth lines
const floorLineCount = 10; // Number of lines connecting bottom edges
const moveSpeed = 1.0; // Units per second of movement

// Calculate camera distance from view window (in room units)
// This is how far back the camera is from the front viewing plane
function getCameraDistance(containerWidth) {
    const halfFovRad = (fovAngle / 2) * (Math.PI / 180);
    const cameraDistancePixels = (containerWidth / 2) / Math.tan(halfFovRad);
    return cameraDistancePixels / containerWidth; // Convert to room units
}

// Create container div
const container = document.createElement('div');
container.className = 'container';
document.body.appendChild(container);

// Set container size to fill entire window
function updateContainerSize() {
    container.style.width = window.innerWidth + 'px';
    container.style.height = window.innerHeight + 'px';
}
updateContainerSize();
window.addEventListener('resize', () => {
    updateContainerSize();
    updateBackWall();
    drawCornerLines();
    drawFloorLines();
    updateDepthDivs();
});

// Create SVG for lines
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('class', 'perspective-lines');
svg.setAttribute('viewBox', '0 0 100 100');
svg.setAttribute('preserveAspectRatio', 'none');
container.appendChild(svg);

// Create the four corner lines
const cornerLines = [];
for (let i = 0; i < 4; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'corner-line');
    svg.appendChild(line);
    cornerLines.push(line);
}

// Create floor lines
const floorLines = [];
for (let i = 0; i < floorLineCount; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'floor-line');
    svg.appendChild(line);
    floorLines.push(line);
}

// Create ceiling lines (connecting top edges)
const ceilingLines = [];
for (let i = 0; i < floorLineCount; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'ceiling-line');
    svg.appendChild(line);
    ceilingLines.push(line);
}

// Create depth divs (rectangular divs at regular distances on the floor)
const depthDivs = [];
let tileIndex = 0;
for (let distance = depthLineInterval; distance <= roomDepth; distance += depthLineInterval) {
    const div = document.createElement('div');
    div.className = 'floor-tile';
    div.id = `floor-${distance.toFixed(2)}`;
    // Assign z-index: furthest tiles get lower z-index, closest get higher
    // Use negative values so objects can be positive
    div.style.zIndex = -(100 + tileIndex);
    container.appendChild(div);
    depthDivs.push({ div, distance });
    tileIndex++;
}

// Add an object to the middle floor tile
const middleIndex = Math.floor(depthDivs.length / 2);
console.log(`Total tiles: ${depthDivs.length}, Middle index: ${middleIndex}`);
if (middleIndex >= 0 && middleIndex < depthDivs.length) {
    const obj = document.createElement('object');
    obj.data = 'svg/3d-wireframe/viennese-lion-3d-wireframe.svg';
    obj.type = 'image/svg+xml';
    obj.style.maxWidth = '40%';
    obj.style.maxHeight = '100%';
    obj.style.pointerEvents = 'none';

    // When SVG loads, style polygons with cyan fill and black stroke
    obj.onload = function() {
        try {
            const svgDoc = obj.contentDocument;
            if (svgDoc) {
                const polygons = svgDoc.querySelectorAll('polygon');
                polygons.forEach(polygon => {
                    polygon.setAttribute('fill', '#00ffff');
                    polygon.setAttribute('stroke', '#000000');
                    polygon.setAttribute('stroke-width', '1');
                    polygon.setAttribute('vector-effect', 'non-scaling-stroke');
                });
                console.log(`Styled ${polygons.length} polygons`);
            }
        } catch (e) {
            console.error('Could not access SVG content:', e);
        }
    };

    depthDivs[middleIndex].div.appendChild(obj);
    console.log(`Added SVG object to tile at distance: ${depthDivs[middleIndex].distance}`);
}

// Create back wall div
const backWall = document.createElement('div');
backWall.className = 'center-box';
backWall.style.zIndex = -200; // Behind all floor tiles
container.appendChild(backWall);

// Create position overlay
const positionOverlay = document.createElement('div');
positionOverlay.className = 'position-overlay';
document.body.appendChild(positionOverlay);

// Position in room: starts at 0.0, goes to roomDepth
let currentPosition = 0.0;

// Calculate perspective scale factor at a given location
function getScaleFactor(location) {
    const containerWidth = parseFloat(container.style.width);
    const halfFovRad = (fovAngle / 2) * (Math.PI / 180);
    const cameraDistance = (containerWidth / 2) / Math.tan(halfFovRad);
    const roomDepthPixels = roomDepth * containerWidth;

    const distanceToFront = cameraDistance;
    const distanceToLocation = cameraDistance + (location * roomDepthPixels);

    return distanceToFront / distanceToLocation;
}

// Update back wall size based on perspective
function updateBackWall() {
    const containerWidth = parseFloat(container.style.width);
    const containerHeight = parseFloat(container.style.height);

    // Back wall is at distance roomDepth
    // We are at distance currentPosition
    // So back wall is at relative distance (roomDepth - currentPosition)
    const distanceToBackWall = roomDepth - currentPosition;
    const backWallLocation = distanceToBackWall / roomDepth;
    const scale = getScaleFactor(backWallLocation);

    backWall.style.width = (containerWidth * scale) + 'px';
    backWall.style.height = (containerHeight * scale) + 'px';

    // Update position overlay
    positionOverlay.textContent = `Position: ${currentPosition.toFixed(2)} / ${roomDepth.toFixed(2)}`;
}

// Draw lines connecting container corners to back wall corners
function drawCornerLines() {
    const containerWidth = parseFloat(container.style.width);
    const containerHeight = parseFloat(container.style.height);
    const backWallWidth = parseFloat(backWall.style.width);
    const backWallHeight = parseFloat(backWall.style.height);

    // Container corners (percentage)
    const containerCorners = [
        { x: 0, y: 0 },       // top-left
        { x: 100, y: 0 },     // top-right
        { x: 100, y: 100 },   // bottom-right
        { x: 0, y: 100 }      // bottom-left
    ];

    // Back wall corners (percentage, centered)
    const backWallWidthPercent = (backWallWidth / containerWidth) * 100;
    const backWallHeightPercent = (backWallHeight / containerHeight) * 100;
    const halfWidth = backWallWidthPercent / 2;
    const halfHeight = backWallHeightPercent / 2;

    const backWallCorners = [
        { x: 50 - halfWidth, y: 50 - halfHeight },  // top-left
        { x: 50 + halfWidth, y: 50 - halfHeight },  // top-right
        { x: 50 + halfWidth, y: 50 + halfHeight },  // bottom-right
        { x: 50 - halfWidth, y: 50 + halfHeight }   // bottom-left
    ];

    // Draw corner lines
    for (let i = 0; i < 4; i++) {
        cornerLines[i].setAttribute('x1', containerCorners[i].x + '%');
        cornerLines[i].setAttribute('y1', containerCorners[i].y + '%');
        cornerLines[i].setAttribute('x2', backWallCorners[i].x + '%');
        cornerLines[i].setAttribute('y2', backWallCorners[i].y + '%');
    }
}

// Draw floor lines connecting bottom edges
function drawFloorLines() {
    const containerWidth = parseFloat(container.style.width);
    const containerHeight = parseFloat(container.style.height);
    const backWallWidth = parseFloat(backWall.style.width);
    const backWallHeight = parseFloat(backWall.style.height);

    // Back wall dimensions in percentage
    const backWallWidthPercent = (backWallWidth / containerWidth) * 100;
    const backWallHeightPercent = (backWallHeight / containerHeight) * 100;
    const halfWidth = backWallWidthPercent / 2;
    const halfHeight = backWallHeightPercent / 2;

    // Bottom edges: container is at y=100, back wall is at y=50+halfHeight
    const containerBottomY = 100;
    const backWallBottomY = 50 + halfHeight;

    // Top edges: container is at y=0, back wall is at y=50-halfHeight
    const containerTopY = 0;
    const backWallTopY = 50 - halfHeight;

    // X coordinates: container is 0 to 100, back wall is (50-halfWidth) to (50+halfWidth)
    const containerLeftX = 0;
    const containerRightX = 100;
    const backWallLeftX = 50 - halfWidth;
    const backWallRightX = 50 + halfWidth;

    // Draw evenly spaced lines on floor
    for (let i = 0; i < floorLineCount; i++) {
        const t = i / (floorLineCount - 1); // 0 to 1

        // Point on container bottom edge
        const containerX = containerLeftX + t * (containerRightX - containerLeftX);

        // Corresponding point on back wall bottom edge
        const backWallX = backWallLeftX + t * (backWallRightX - backWallLeftX);

        floorLines[i].setAttribute('x1', containerX + '%');
        floorLines[i].setAttribute('y1', containerBottomY + '%');
        floorLines[i].setAttribute('x2', backWallX + '%');
        floorLines[i].setAttribute('y2', backWallBottomY + '%');
    }

    // Draw evenly spaced lines on ceiling
    for (let i = 0; i < floorLineCount; i++) {
        const t = i / (floorLineCount - 1); // 0 to 1

        // Point on container top edge
        const containerX = containerLeftX + t * (containerRightX - containerLeftX);

        // Corresponding point on back wall top edge
        const backWallX = backWallLeftX + t * (backWallRightX - backWallLeftX);

        ceilingLines[i].setAttribute('x1', containerX + '%');
        ceilingLines[i].setAttribute('y1', containerTopY + '%');
        ceilingLines[i].setAttribute('x2', backWallX + '%');
        ceilingLines[i].setAttribute('y2', backWallTopY + '%');
    }
}

// Position and size the floor tile divs
function updateDepthDivs() {
    const containerWidth = parseFloat(container.style.width);
    const containerHeight = parseFloat(container.style.height);
    const cameraDistance = getCameraDistance(containerWidth);

    for (let i = 0; i < depthDivs.length; i++) {
        const { div, distance } = depthDivs[i];

        // Calculate distance from current position to this tile
        const distanceToTile = distance - currentPosition;

        // Tile is only hidden if it's behind the CAMERA position (not just behind the view window)
        // The camera is 'cameraDistance' units behind the view window
        if (distanceToTile <= -cameraDistance) {
            div.style.display = 'none';
            continue;
        }

        // Show the tile
        div.style.display = 'flex'; // Use flex to enable centering

        // Convert distance to location (0.0 to 1.0 scale relative to roomDepth)
        const location = distanceToTile / roomDepth;

        // Get scale factor at this location
        const scale = getScaleFactor(location);

        // Calculate dimensions in pixels
        const divWidth = containerWidth * scale;
        const divHeight = containerHeight * scale;

        // Position centered
        const left = (containerWidth - divWidth) / 2;
        const top = (containerHeight - divHeight) / 2;

        div.style.width = divWidth + 'px';
        div.style.height = divHeight + 'px';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.opacity = 1.0;
    }
}

// Initialize
updateBackWall();
drawCornerLines();
drawFloorLines();
updateDepthDivs();

// Keyboard controls
const keysPressed = { ArrowUp: false, ArrowDown: false };

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        keysPressed[event.key] = true;
        event.preventDefault();
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        keysPressed[event.key] = false;
        event.preventDefault();
    }
});

// Animation loop
let lastTime = performance.now();

function animate(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    let changed = false;

    // Move forward (up arrow)
    if (keysPressed.ArrowUp && currentPosition < roomDepth) {
        currentPosition += moveSpeed * deltaTime;
        if (currentPosition > roomDepth) currentPosition = roomDepth;
        changed = true;
    }

    // Move backward (down arrow)
    if (keysPressed.ArrowDown && currentPosition > 0.0) {
        currentPosition -= moveSpeed * deltaTime;
        if (currentPosition < 0.0) currentPosition = 0.0;
        changed = true;
    }

    if (changed) {
        updateBackWall();
        drawCornerLines();
        drawFloorLines();
        updateDepthDivs();
    }

    requestAnimationFrame(animate);
}

animate();
