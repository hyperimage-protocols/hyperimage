// Configuration
let startAngle = -45;
let endAngle = -startAngle;
let hoverRotateAngle = 15; // Angle to rotate adjacent keys on hover
let hoverBehavior = 'uniform'; // 'uniform' or 'compress'

// Get all image containers except the first one (ring.png)
const containers = Array.from(document.querySelectorAll('.image-container')).slice(1);
const count = containers.length;

// Store base angles, current angles, and z-indexes for each container
const baseAngles = [];
const currentAngles = [];
const zIndexes = [];

// Interpolate and set base rotation for each container
containers.forEach((container, index) => {
    const t = count > 1 ? index / (count - 1) : 0;
    const angle = startAngle + (endAngle - startAngle) * t;
    baseAngles[index] = angle;
    currentAngles[index] = angle;
    zIndexes[index] = index; // z-index matches load order
    container.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    container.style.zIndex = index;
});

// Function to recalculate and update all container positions
function updateContainerPositions() {
    endAngle = -startAngle;
    containers.forEach((container, index) => {
        const t = count > 1 ? index / (count - 1) : 0;
        const angle = startAngle + (endAngle - startAngle) * t;
        baseAngles[index] = angle;
        currentAngles[index] = angle;
        container.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    });
}

// Add hover listeners to each inner box
containers.forEach((container, index) => {
    const innerBox = container.querySelector('.inner-box');
    if (!innerBox) return;

    innerBox.addEventListener('mouseenter', () => {
        if (hoverBehavior === 'uniform') {
            // Original behavior: all keys rotate uniformly
            for (let i = 0; i < count; i++) {
                if (i === index) {
                    // Don't move the hovered key
                    continue;
                }

                if (zIndexes[i] < zIndexes[index]) {
                    // Lower z-index: rotate counterclockwise
                    currentAngles[i] = baseAngles[i] - hoverRotateAngle;
                } else {
                    // Higher z-index: rotate clockwise
                    currentAngles[i] = baseAngles[i] + hoverRotateAngle;
                }
                containers[i].style.transform = `translate(-50%, -50%) rotate(${currentAngles[i]}deg)`;
            }
        } else if (hoverBehavior === 'compress') {
            // Compress behavior: fan out with decreasing rotation
            for (let i = 0; i < count; i++) {
                if (i === index) {
                    // Don't move the hovered key
                    continue;
                }

                if (zIndexes[i] < zIndexes[index]) {
                    // Lower z-index side: compress
                    const distance = index - i;
                    const maxDistance = index;
                    const t = maxDistance > 0 ? (distance - 1) / (maxDistance - 1) : 0;
                    const rotationAmount = maxDistance > 1 ? hoverRotateAngle * (1 - t) : hoverRotateAngle;
                    currentAngles[i] = baseAngles[i] - rotationAmount;
                } else {
                    // Higher z-index side: compress
                    const distance = i - index;
                    const maxDistance = count - 1 - index;
                    const t = maxDistance > 0 ? (distance - 1) / (maxDistance - 1) : 0;
                    const rotationAmount = maxDistance > 1 ? hoverRotateAngle * (1 - t) : hoverRotateAngle;
                    currentAngles[i] = baseAngles[i] + rotationAmount;
                }
                containers[i].style.transform = `translate(-50%, -50%) rotate(${currentAngles[i]}deg)`;
            }
        }
    });

    innerBox.addEventListener('mouseleave', () => {
        // Reset all keys to their base angles
        for (let i = 0; i < count; i++) {
            currentAngles[i] = baseAngles[i];
            containers[i].style.transform = `translate(-50%, -50%) rotate(${currentAngles[i]}deg)`;
        }
    });
});

// Control panel event listeners
const toggleInnerBoxes = document.getElementById('toggleInnerBoxes');
const startAngleSlider = document.getElementById('startAngleSlider');
const startAngleValue = document.getElementById('startAngleValue');
const hoverRotateSlider = document.getElementById('hoverRotateSlider');
const hoverRotateValue = document.getElementById('hoverRotateValue');
const hoverBehaviorRadios = document.querySelectorAll('input[name="hoverBehavior"]');

// Toggle inner boxes visibility
toggleInnerBoxes.addEventListener('change', (e) => {
    const innerBoxes = document.querySelectorAll('.inner-box');
    innerBoxes.forEach(box => {
        box.style.opacity = e.target.checked ? '1' : '0';
    });
});

// Set initial state to hidden
document.querySelectorAll('.inner-box').forEach(box => {
    box.style.opacity = '0';
});

// Update start angle
startAngleSlider.addEventListener('input', (e) => {
    startAngle = parseFloat(e.target.value);
    startAngleValue.textContent = startAngle;
    updateContainerPositions();
});

// Update hover rotate angle
hoverRotateSlider.addEventListener('input', (e) => {
    hoverRotateAngle = parseFloat(e.target.value);
    hoverRotateValue.textContent = hoverRotateAngle;
});

// Update hover behavior
hoverBehaviorRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        hoverBehavior = e.target.value;
    });
});
