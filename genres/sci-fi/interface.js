let imageData = [];
let currentIndex = 0;
const GRID_COLS = 7;
const GRID_ROWS = 3;
let isIsolated = false;
let isolatedOriginIndex = 0; // The cell that was isolated
let typewriterTimeout;
const descriptionOverlay = document.querySelector('.description-overlay');
const connectionsSvg = document.getElementById('connections-svg');

// Load image data and populate grid cells
fetch('imageData.json')
    .then(response => response.json())
    .then(data => {
        imageData = data;
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell, index) => {
            if (index < data.length) {
                const content = cell.querySelector('.cell-content');
                content.textContent = data[index].heading;
                cell.dataset.index = index;
            }
        });

        // Select first cell
        updateSelection();
    });

function updateSelection() {
    const cells = document.querySelectorAll('.grid-cell');
    const body = document.body;

    cells.forEach((cell, index) => {
        const content = cell.querySelector('.cell-content');
        if (index === currentIndex) {
            cell.classList.add('selected');
            if (imageData[index]) {
                const imageUrl = imageData[index].image;
                // Show background in cell if not isolated
                if (!isIsolated) {
                    content.style.backgroundImage = `url('${imageUrl}')`;
                    content.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    body.style.backgroundImage = `url('${imageUrl}')`;
                    body.classList.add('has-background');
                } else if (index === isolatedOriginIndex) {
                    // Origin cell when isolated: no bg in cell, show in body
                    content.style.backgroundImage = '';
                    content.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    body.style.backgroundImage = `url('${imageUrl}')`;
                    body.classList.add('has-background');
                } else {
                    // Connected cell when isolated: show bg in cell only
                    content.style.backgroundImage = `url('${imageUrl}')`;
                    content.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    // Don't change body background
                }
            }
        } else {
            cell.classList.remove('selected');
            content.style.backgroundImage = '';
            content.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        }
    });
}

function navigate(direction) {
    if (isIsolated) {
        // Navigate among visible cells when isolated
        navigateIsolated(direction);
    } else {
        // Normal grid navigation
        const row = Math.floor(currentIndex / GRID_COLS);
        const col = currentIndex % GRID_COLS;

        let newRow = row;
        let newCol = col;

        switch(direction) {
            case 'up':
                newRow = Math.max(0, row - 1);
                break;
            case 'down':
                newRow = Math.min(GRID_ROWS - 1, row + 1);
                break;
            case 'left':
                newCol = Math.max(0, col - 1);
                break;
            case 'right':
                newCol = Math.min(GRID_COLS - 1, col + 1);
                break;
        }

        const newIndex = newRow * GRID_COLS + newCol;
        if (newIndex < imageData.length) {
            currentIndex = newIndex;
            updateSelection();
        }
    }
}

function navigateIsolated(direction) {
    // Get list of visible cell indices (current + connected)
    const visibleIndices = [isolatedOriginIndex];
    if (imageData[isolatedOriginIndex] && imageData[isolatedOriginIndex].connections) {
        const connections = imageData[isolatedOriginIndex].connections;
        const connectedIndices = connections.map(heading =>
            imageData.findIndex(item => item.heading === heading)
        ).filter(idx => idx !== -1);
        visibleIndices.push(...connectedIndices);
    }

    // Sort by position for logical navigation
    visibleIndices.sort((a, b) => {
        const rowA = Math.floor(a / GRID_COLS);
        const rowB = Math.floor(b / GRID_COLS);
        const colA = a % GRID_COLS;
        const colB = b % GRID_COLS;

        if (rowA !== rowB) return rowA - rowB;
        return colA - colB;
    });

    const currentPosInVisible = visibleIndices.indexOf(currentIndex);
    let newPosInVisible = currentPosInVisible;

    const currentRow = Math.floor(currentIndex / GRID_COLS);
    const currentCol = currentIndex % GRID_COLS;

    switch(direction) {
        case 'up':
        case 'down':
            // Find cells in different rows
            const targetRow = direction === 'up' ? currentRow - 1 : currentRow + 1;
            const cellsInTargetRow = visibleIndices.filter(idx => Math.floor(idx / GRID_COLS) === targetRow);
            if (cellsInTargetRow.length > 0) {
                // Find closest cell in target row
                const closest = cellsInTargetRow.reduce((prev, curr) => {
                    const prevDist = Math.abs((prev % GRID_COLS) - currentCol);
                    const currDist = Math.abs((curr % GRID_COLS) - currentCol);
                    return currDist < prevDist ? curr : prev;
                });
                currentIndex = closest;
            }
            break;
        case 'left':
            // Move to previous visible cell
            newPosInVisible = currentPosInVisible > 0 ? currentPosInVisible - 1 : visibleIndices.length - 1;
            currentIndex = visibleIndices[newPosInVisible];
            break;
        case 'right':
            // Move to next visible cell
            newPosInVisible = (currentPosInVisible + 1) % visibleIndices.length;
            currentIndex = visibleIndices[newPosInVisible];
            break;
    }

    updateSelection();
}

function typeWriter(element, text, speed, index = 0) {
    if (index < text.length) {
        element.textContent = text.substring(0, index + 1);
        typewriterTimeout = setTimeout(() => typeWriter(element, text, speed, index + 1), speed);
    }
}

function drawConnections(connectedIndices) {
    // Clear existing lines
    connectionsSvg.innerHTML = '';

    if (!isIsolated || connectedIndices.length === 0) return;

    const cells = document.querySelectorAll('.grid-cell');

    // Set SVG viewBox to match window size
    connectionsSvg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

    // Create mask
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.setAttribute('id', 'cell-mask');

    // White background (shows lines)
    const maskBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    maskBg.setAttribute('x', '0');
    maskBg.setAttribute('y', '0');
    maskBg.setAttribute('width', window.innerWidth);
    maskBg.setAttribute('height', window.innerHeight);
    maskBg.setAttribute('fill', 'white');
    mask.appendChild(maskBg);

    // Black rectangles for cells (hides lines)
    cells.forEach((cell, index) => {
        if (index === currentIndex || connectedIndices.includes(index)) {
            const rect = cell.getBoundingClientRect();
            const maskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            maskRect.setAttribute('x', rect.left);
            maskRect.setAttribute('y', rect.top);
            maskRect.setAttribute('width', rect.width);
            maskRect.setAttribute('height', rect.height);
            maskRect.setAttribute('fill', 'black');
            mask.appendChild(maskRect);
        }
    });

    defs.appendChild(mask);
    connectionsSvg.appendChild(defs);

    const currentCell = cells[currentIndex];
    const currentRect = currentCell.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;

    connectedIndices.forEach(connectedIndex => {
        const connectedCell = cells[connectedIndex];
        const connectedRect = connectedCell.getBoundingClientRect();
        const connectedCenterX = connectedRect.left + connectedRect.width / 2;
        const connectedCenterY = connectedRect.top + connectedRect.height / 2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', currentCenterX);
        line.setAttribute('y1', currentCenterY);
        line.setAttribute('x2', connectedCenterX);
        line.setAttribute('y2', connectedCenterY);
        line.setAttribute('stroke', 'chartreuse');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('mask', 'url(#cell-mask)');

        connectionsSvg.appendChild(line);
    });
}

function toggleIsolation() {
    const cells = document.querySelectorAll('.grid-cell');

    if (!isIsolated) {
        // Entering isolation mode
        isIsolated = true;
        isolatedOriginIndex = currentIndex;
    } else if (currentIndex === isolatedOriginIndex) {
        // Exiting isolation mode (only if on origin cell)
        isIsolated = false;
        isolatedOriginIndex = 0;
    } else {
        // Re-isolating from a connected cell
        isolatedOriginIndex = currentIndex;
    }

    // Get connected cell indices based on the isolated origin
    let connectedIndices = [];
    if (isIsolated && imageData[isolatedOriginIndex] && imageData[isolatedOriginIndex].connections) {
        const connections = imageData[isolatedOriginIndex].connections;
        connectedIndices = connections.map(heading =>
            imageData.findIndex(item => item.heading === heading)
        ).filter(idx => idx !== -1);
    }

    cells.forEach((cell, index) => {
        const content = cell.querySelector('.cell-content');
        if (index === isolatedOriginIndex || connectedIndices.includes(index)) {
            // Keep isolated origin and connected cells visible
            content.style.display = 'flex';
        } else {
            // Toggle other cell contents
            content.style.display = isIsolated ? 'none' : 'flex';
        }
    });

    // Draw connection lines
    drawConnections(connectedIndices);

    // Handle description overlay
    if (typewriterTimeout) clearTimeout(typewriterTimeout);

    if (isIsolated && imageData[isolatedOriginIndex]) {
        descriptionOverlay.classList.add('visible');
        descriptionOverlay.textContent = '';
        typeWriter(descriptionOverlay, imageData[isolatedOriginIndex].description, 50);
    } else {
        descriptionOverlay.classList.remove('visible');
        descriptionOverlay.textContent = '';
    }

    // Update the selected cell's background based on isolation state
    updateSelection();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        toggleIsolation();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigate('up');
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigate('down');
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate('left');
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate('right');
    }
});

// Disable all mouse events
document.addEventListener('click', (e) => e.preventDefault(), true);
document.addEventListener('mousedown', (e) => e.preventDefault(), true);
document.addEventListener('mouseup', (e) => e.preventDefault(), true);
document.addEventListener('dblclick', (e) => e.preventDefault(), true);
document.addEventListener('contextmenu', (e) => e.preventDefault(), true);
