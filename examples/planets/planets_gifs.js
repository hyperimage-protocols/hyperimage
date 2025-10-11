// planets_gifs.js
// Editable variable for GIF height
const GIF_HEIGHT = 125; // Change this value to adjust GIF height

// Variable for number of GIFs to display
const NUM_GIFS = 25; // Change this value for how many GIFs to show

// Variables for background canvas layer
const BACK_GIF_SIZE_RATIO = 0.5; // Size ratio relative to front layer (0.5 = half size)
const BACK_GIF_COUNT_RATIO = 2; // Count multiplier relative to front layer (2 = twice as many)

// Variables for foreground satellite layer
const SATELLITE_GIF_SIZE = 800; // Size of satellite GIFs in pixels
const SATELLITE_GIF_COUNT = 5; // Number of satellite GIFs to display
const SATELLITE_PARALLAX_SPEED = 3; // Parallax speed (higher = faster, moves faster than text)
const SATELLITE_FRAME_COUNT = 114; // Total number of satellite frames
const SATELLITE_FRAME_SPEED = 0.125; // How fast frames advance during scroll (higher = faster)

// List of GIF filenames from the planets folder
const gifFiles = [
    "Explore Osiris-Rex GIF by NASA.gif",
    "gif.gif",
    "Good Night Loop GIF by xponentialdesign.gif",
    "Life On Mars Animation GIF.gif",
    "Loop Space GIF by xponentialdesign.gif",
    "mars GIF (1).gif",
    "mars GIF.gif",
    "planet earth GIF.gif",
    "solar eclipse sun GIF by NASA's Goddard Space Flight Center.gif",
    "space ice GIF by NASA.gif",
    "space mars GIF by NASA.gif",
    "space nasa GIF.gif",
    "space planet GIF by NASA.gif",
    "Space Water GIF by NASA.gif",
    "Venus GIF by The Telegraph.gif"
];

// Array to store satellite frame objects
const satelliteObjects = [];

// Function to place GIFs randomly inside a canvas div
function placeGifsInCanvas(canvasId, gifHeight, numGifs, gifSource = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    // Remove any existing GIFs
    canvas.querySelectorAll('.planet-gif').forEach(el => el.remove());

    // Set your desired canvas dimensions here:
    const canvasWidth = 2000;
    // Get the actual canvas height from CSS
    const canvasHeight = canvasId === 'gif-canvas-front' ? 12000 : 6000;

    // Place numGifs, each randomly chosen from gifFiles (can repeat)
    for (let i = 0; i < numGifs; i++) {
        const gifFile = gifSource || gifFiles[Math.floor(Math.random() * gifFiles.length)];

        // Create img element
        const img = document.createElement('img');
        img.className = 'planet-gif';
        img.style.height = gifHeight + 'px';
        img.style.position = 'absolute';

        // Random x position, evenly distributed y position
        img.style.left = Math.floor(Math.random() * (canvasWidth - gifHeight)) + 'px';

        if (gifSource) {
            // For satellite layer, evenly distribute Y values across full height
            const ySpacing = canvasHeight / numGifs;
            img.style.top = Math.floor(i * ySpacing) + 'px';

            // Start with frame 0
            img.src = 'satellite frames/sat-frame000.png';

            // Store satellite object for frame control
            satelliteObjects.push({
                img: img,
                currentFrame: 0
            });
        } else {
            // For other layers, keep random Y and use GIF
            img.style.top = Math.floor(Math.random() * (canvasHeight - gifHeight)) + 'px';
            img.src = `planets/${gifFile}`;
        }

        canvas.appendChild(img);
    }
}

// Variable to control scroll speed multiplier
const SCROLL_SPEED = 0.25; // Change this value to adjust scroll sensitivity

// Variable to control parallax effect (0-1, lower = slower gif movement)
const GIF_PARALLAX_SPEED = 0.25; // Change this value (0.5 = half speed, 0.25 = quarter speed, etc.)

// Variable to control GIF animation speed (higher = faster animation during scroll)
const GIF_ANIMATION_SPEED = 1; // Change this value to adjust how fast GIFs animate

// Load text from planets.txt and set it in the top-bar div
fetch('planets.txt')
    .then(response => response.text())
    .then(text => {
        const topBar = document.getElementById('top-bar');
        if (topBar) {
            // Split by single newlines to create paragraphs
            const paragraphs = text.split('\n').filter(p => p.trim());
            topBar.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        }
    });

// Custom scroll implementation with smooth interpolation
let scrollPosition = 0;
let targetScrollPosition = 0;
let lastScrollPosition = 0;
let accumulatedFrameAdvance = 0;
const SMOOTHNESS = 0.1; // Lower = smoother (0-1)

window.addEventListener('wheel', function(e) {
    e.preventDefault();
    targetScrollPosition += e.deltaY * SCROLL_SPEED;

    // Calculate max scroll based on document height
    const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
    targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
}, { passive: false });

window.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        targetScrollPosition += 50 * SCROLL_SPEED;

        const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
        targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        targetScrollPosition -= 50 * SCROLL_SPEED;

        const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
        targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
    }
});

function smoothScroll() {
    scrollPosition += (targetScrollPosition - scrollPosition) * SMOOTHNESS;
    window.scrollTo(0, scrollPosition);

    // Calculate scroll delta for satellite frame advancement
    const scrollDelta = Math.abs(scrollPosition - lastScrollPosition);

    if (scrollDelta > 0.1) {
        accumulatedFrameAdvance += scrollDelta * SATELLITE_FRAME_SPEED;

        // Only advance frames when we've accumulated enough movement
        if (accumulatedFrameAdvance >= 1) {
            const framesToAdvance = Math.floor(accumulatedFrameAdvance);
            accumulatedFrameAdvance -= framesToAdvance;

            // Update all satellite frames
            satelliteObjects.forEach(satObj => {
                satObj.currentFrame = (satObj.currentFrame + framesToAdvance) % SATELLITE_FRAME_COUNT;
                const frameNum = satObj.currentFrame.toString().padStart(3, '0');
                satObj.img.src = `satellite frames/sat-frame${frameNum}.png`;
            });
        }
    }

    lastScrollPosition = scrollPosition;

    // Move gif canvas based on parallax speed (same direction as text)
    const canvas = document.getElementById('gif-canvas');
    if (canvas) {
        const canvasOffset = scrollPosition * GIF_PARALLAX_SPEED;
        canvas.style.top = `calc(50% - ${canvasOffset}px)`;
    }

    // Move back gif canvas at the same proportion relative to front canvas
    const canvasBack = document.getElementById('gif-canvas-back');
    if (canvasBack) {
        const backCanvasOffset = scrollPosition * GIF_PARALLAX_SPEED * GIF_PARALLAX_SPEED;
        canvasBack.style.top = `calc(50% - ${backCanvasOffset}px)`;
    }

    // Move back2 gif canvas at the same proportion relative to back canvas
    const canvasBack2 = document.getElementById('gif-canvas-back2');
    if (canvasBack2) {
        const back2CanvasOffset = scrollPosition * Math.pow(GIF_PARALLAX_SPEED, 3);
        canvasBack2.style.top = `calc(50% - ${back2CanvasOffset}px)`;
    }

    // Move front gif canvas (satellites) faster than text
    const canvasFront = document.getElementById('gif-canvas-front');
    if (canvasFront) {
        const frontCanvasOffset = scrollPosition * SATELLITE_PARALLAX_SPEED;
        canvasFront.style.top = `-${frontCanvasOffset}px`;
    }

    requestAnimationFrame(smoothScroll);
}

smoothScroll();

// Initial placement
placeGifsInCanvas('gif-canvas-back2', GIF_HEIGHT * Math.pow(BACK_GIF_SIZE_RATIO, 2), NUM_GIFS * Math.pow(BACK_GIF_COUNT_RATIO, 2));
placeGifsInCanvas('gif-canvas-back', GIF_HEIGHT * BACK_GIF_SIZE_RATIO, NUM_GIFS * BACK_GIF_COUNT_RATIO);
placeGifsInCanvas('gif-canvas', GIF_HEIGHT, NUM_GIFS);
placeGifsInCanvas('gif-canvas-front', SATELLITE_GIF_SIZE, SATELLITE_GIF_COUNT, 'Dark Matter Satellite GIF by European Space Agency - ESA.gif');
