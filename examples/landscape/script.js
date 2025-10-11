const containers = document.querySelectorAll('.image-container');
const offsets = [0, 0, 0, 0, 0]; // Track horizontal offset for each layer
const timelineDisplay = document.getElementById('timeline-position');
const timelineSlider = document.getElementById('timeline-slider');
const navigationArrows = document.getElementById('navigation-arrows');

// Initial timeline position (edit this to change where the page loads)
const initialTimelinePosition = 1900;

// Interval in milliseconds for each layer (how often each layer moves 1px)
const layerIntervals = {
    1: 20,   // lake-1 (front) - moves every 10ms (fastest)
    2: 40,   // lake-2 - moves every 15ms
    3: 60,   // lake-3 - moves every 23ms
    4: 100,   // lake-4 - moves every 34ms
    5: null  // lake-5 (back) - fixed (null = no movement)
};

let currentDirection = 0;
let layerIntervalIds = {};
let timelinePosition = initialTimelinePosition; // Timeline position based on front image movement

// Initialize page at the initial timeline position
function initializePosition() {
    const baseInterval = layerIntervals[1]; // Layer 1 is the base

    containers.forEach((container, index) => {
        const layer = parseInt(container.dataset.layer);

        // Layer 5 doesn't move
        if (layer === 5) return;

        // Calculate speed ratio for this layer relative to layer 1
        const layerInterval = layerIntervals[layer];
        const speedRatio = baseInterval / layerInterval; // How much slower this layer moves

        // Calculate offset for this layer based on timeline position and speed ratio
        // Timeline position is negative of layer 1's offset
        offsets[index] = -initialTimelinePosition * speedRatio;

        container.style.transform = `translateX(${offsets[index]}px)`;
    });

    timelineDisplay.textContent = timelinePosition;
    timelineSlider.value = timelinePosition;
}

// Call initialization when page loads
initializePosition();

// Text display settings (edit these manually)
const textDuration = 120; // How long text is fully visible (in timeline units)
const fadeDuration = 50; // How long fade in/out lasts (in timeline units)

// Animation settings (edit these manually)
const animationInterval = 400; // How often to trigger pole animation (in timeline units)
const animationSpeed = 6; // Pixels per millisecond

// Custom timestamps for tree and bridge animations (edit these arrays)
const treeTimestamps = [500, 1000, -500, -1000]; // Timeline positions where trees appear
const bridgeTimestamps = [0, 800, -800]; // Timeline positions where bridges appear

// Load and display text from walden.json
let textEntries = [];

async function loadText() {
    try {
        const response = await fetch('walden.json');
        const textData = await response.json();

        const textOverlay = document.getElementById('text-overlay');

        // Calculate evenly distributed timeline positions from 1600 to -1600
        const totalEntries = textData.length;
        const startTimeline = 1600;
        const endTimeline = -1600;
        const step = (endTimeline - startTimeline) / (totalEntries - 1);

        textData.forEach((entry, index) => {
            // Only create paragraph if text is not empty
            if (entry.text.trim() !== '') {
                const p = document.createElement('p');
                p.textContent = entry.text;
                // Calculate timeline position for this entry
                p.dataset.timeline = Math.round(startTimeline + (step * index));
                p.style.display = 'none'; // Use display none so it doesn't take up space

                textOverlay.appendChild(p);
                textEntries.push(p);
            }
        });

        updateTextVisibility();
    } catch (error) {
        console.error('Error loading text:', error);
    }
}

function updateTextVisibility() {
    textEntries.forEach(p => {
        const entryTimeline = parseInt(p.dataset.timeline);

        // Calculate the range when text should be visible
        const halfDuration = textDuration / 2;
        const fadeInStart = entryTimeline + halfDuration + fadeDuration;
        const fadeInEnd = entryTimeline + halfDuration;
        const fadeOutStart = entryTimeline - halfDuration;
        const fadeOutEnd = entryTimeline - halfDuration - fadeDuration;

        let opacity = 0;

        if (timelinePosition >= fadeInStart) {
            // Before fade in starts - invisible
            opacity = 0;
        } else if (timelinePosition > fadeInEnd) {
            // Fading in
            const progress = (fadeInStart - timelinePosition) / fadeDuration;
            opacity = progress;
        } else if (timelinePosition > fadeOutStart) {
            // Fully visible
            opacity = 1;
        } else if (timelinePosition > fadeOutEnd) {
            // Fading out
            const progress = (timelinePosition - fadeOutEnd) / fadeDuration;
            opacity = progress;
        } else {
            // After fade out ends - invisible
            opacity = 0;
        }

        p.style.opacity = opacity;
        p.style.display = opacity > 0 ? 'inline-block' : 'none';
    });

    // Update navigation arrows visibility - visible until 1850, fade out by 1750
    if (timelinePosition >= 1850) {
        navigationArrows.style.opacity = 1;
    } else if (timelinePosition >= 1750) {
        const progress = (timelinePosition - 1750) / 100;
        navigationArrows.style.opacity = progress;
    } else {
        navigationArrows.style.opacity = 0;
    }
}

loadText();

// Animation system
const animationLayer = document.getElementById('animation-layer');
let lastAnimationTrigger = null;
let lastDirection = 0;
let triggeredTreeTimestamps = new Set();
let triggeredBridgeTimestamps = new Set();

function checkAndTriggerAnimation() {
    if (lastAnimationTrigger === null) {
        lastAnimationTrigger = Math.floor(timelinePosition / animationInterval) * animationInterval;
    }

    const currentTriggerPoint = Math.floor(timelinePosition / animationInterval) * animationInterval;

    if (currentTriggerPoint !== lastAnimationTrigger) {
        lastAnimationTrigger = currentTriggerPoint;
        // Use current direction for animation
        animatePole(currentDirection);
    }

    // Check for tree animations
    treeTimestamps.forEach(timestamp => {
        const key = `${timestamp}_${currentDirection}`;
        if (!triggeredTreeTimestamps.has(key)) {
            // Check if we've crossed this timestamp
            if ((currentDirection === -1 && timelinePosition <= timestamp && (timelinePosition + 10) > timestamp) ||
                (currentDirection === 1 && timelinePosition >= timestamp && (timelinePosition - 10) < timestamp)) {
                triggeredTreeTimestamps.add(key);
                animateObject('img/tree.png', currentDirection);
            }
        }
    });

    // Check for bridge animations
    bridgeTimestamps.forEach(timestamp => {
        const key = `${timestamp}_${currentDirection}`;
        if (!triggeredBridgeTimestamps.has(key)) {
            // Check if we've crossed this timestamp
            if ((currentDirection === -1 && timelinePosition <= timestamp && (timelinePosition + 10) > timestamp) ||
                (currentDirection === 1 && timelinePosition >= timestamp && (timelinePosition - 10) < timestamp)) {
                triggeredBridgeTimestamps.add(key);
                animateObject('img/bridge.png', currentDirection);
            }
        }
    });

    lastDirection = currentDirection;
}

function animatePole(direction) {
    animateObject('img/pole.png', direction);
}

function animateObject(imageSrc, direction) {
    const obj = document.createElement('img');
    obj.src = imageSrc;

    const centerY = (window.innerHeight - 750) / 2;

    let startX, endX;

    // Direction is -1 for right arrow (moving right), 1 for left arrow (moving left)
    // Use larger offsets to accommodate wide images like bridge
    if (direction === -1) {
        // Moving right: object comes from right, goes to left
        startX = window.innerWidth;
        endX = -3000; // Larger offset for wide images
    } else {
        // Moving left: object comes from left, goes to right
        startX = -3000; // Larger offset for wide images
        endX = window.innerWidth;
    }

    obj.style.left = startX + 'px';
    obj.style.top = centerY + 'px';

    animationLayer.appendChild(obj);

    // Calculate distance to travel (across window plus object width)
    const distance = Math.abs(endX - startX);
    const duration = distance / animationSpeed; // milliseconds

    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
            // Animation complete, remove object
            animationLayer.removeChild(obj);
            return;
        }

        const currentX = startX + ((endX - startX) * progress);
        obj.style.left = currentX + 'px';

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

// Temporary timeline scrubber for development
timelineSlider.addEventListener('input', (e) => {
    const targetPosition = parseInt(e.target.value);
    const baseInterval = layerIntervals[1];

    containers.forEach((container, index) => {
        const layer = parseInt(container.dataset.layer);

        if (layer === 5) return;

        const layerInterval = layerIntervals[layer];
        const speedRatio = baseInterval / layerInterval;

        offsets[index] = -targetPosition * speedRatio;
        container.style.transform = `translateX(${offsets[index]}px)`;
    });

    timelinePosition = targetPosition;
    timelineDisplay.textContent = timelinePosition;
    updateTextVisibility();
    checkAndTriggerAnimation();
});

function startMovement(direction) {
    currentDirection = direction;

    containers.forEach((container) => {
        const layer = parseInt(container.dataset.layer);
        const interval = layerIntervals[layer];

        // If interval is null, don't move this layer
        if (interval === null) return;

        // Create a separate interval for each layer
        layerIntervalIds[layer] = setInterval(() => {
            const containerIndex = Array.from(containers).indexOf(container);

            // Update offset
            offsets[containerIndex] += currentDirection;

            container.style.transform = `translateX(${offsets[containerIndex]}px)`;

            // Update timeline position based on layer 1 (front image)
            if (layer === 1) {
                timelinePosition = -offsets[containerIndex]; // Negative offset = positive timeline

                // Stop if we hit the limits
                if (timelinePosition < -1900 || timelinePosition > 1900) {
                    stopMovement();
                    // Clamp to exact limit
                    timelinePosition = Math.max(-1900, Math.min(1900, timelinePosition));
                }

                timelineDisplay.textContent = timelinePosition;
                timelineSlider.value = timelinePosition;
                updateTextVisibility();
                checkAndTriggerAnimation();
            }
        }, interval);
    });
}

function stopMovement() {
    // Clear all layer intervals
    Object.keys(layerIntervalIds).forEach((layer) => {
        clearInterval(layerIntervalIds[layer]);
    });
    layerIntervalIds = {};
    currentDirection = 0;
}

window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (Object.keys(layerIntervalIds).length > 0) return; // Already moving

    e.preventDefault();

    const direction = e.key === 'ArrowRight' ? -1 : 1; // right arrow = move right (landscape left), left arrow = move left (landscape right)

    // Don't move if we're at the limits
    if (direction === -1 && timelinePosition >= 1900) return; // Right arrow at max
    if (direction === 1 && timelinePosition <= -1900) return; // Left arrow at min

    startMovement(direction);
});

window.addEventListener('keyup', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    stopMovement();
});
