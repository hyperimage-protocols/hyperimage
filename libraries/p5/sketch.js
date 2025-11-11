let video;
let previousFrame;
let currentFrame;
let previousBitmap; // Store the previous output for fade mode
let fadePercentage = 90; // Fade percentage (0-100)
let blurAmount = 3; // Blur amount (0-8 pixels)
let movementOpacity = 95; // Movement overlay opacity (0-100%)
let fadeSlider;
let blurSlider;
let opacitySlider;
let currentVideoSource = 'video_3.mp4';
let feed1Button;
let feed2Button;

function setup() {
    // Create video selector
    createVideoSelector();

    // Create video element first to get dimensions
    video = createVideo([currentVideoSource]);
    video.hide(); // Hide the default HTML5 video element
    video.loop(); // Loop the video
    video.volume(0); // Mute the video (optional)

    // Wait for video to load to get proper dimensions
    video.elt.onloadedmetadata = () => {
        // Create canvas sized to 2x video resolution
        let canvas = createCanvas(video.width * 2, video.height * 2);
        canvas.parent('video-container');
        pixelDensity(1); // Use 1:1 pixel density for performance

        // Set controls container width to match canvas width
        let controlsContainer = select('#controls-container');
        controlsContainer.style('width', `${video.width * 2}px`);

        // Set video selector width to match canvas width
        let videoSelector = select('#video-selector');
        videoSelector.style('width', `${video.width * 2}px`);

        // Now that canvas is sized, play video
        video.play();
    };

    // Create UI controls
    createControls();
}

function createVideoSelector() {
    let selectorContainer = select('#video-selector');

    feed1Button = createButton('FEED 1');
    feed1Button.class('video-button active');
    feed1Button.parent(selectorContainer);
    feed1Button.mousePressed(() => switchVideo('video_3.mp4', feed1Button, feed2Button));

    feed2Button = createButton('FEED 2');
    feed2Button.class('video-button');
    feed2Button.parent(selectorContainer);
    feed2Button.mousePressed(() => switchVideo('video_2.mp4', feed2Button, feed1Button));
}

function switchVideo(newSource, activeButton, inactiveButton) {
    if (currentVideoSource === newSource) return;

    currentVideoSource = newSource;

    // Update button states
    activeButton.addClass('active');
    inactiveButton.removeClass('active');

    // Reset frame history
    previousFrame = null;
    previousBitmap = null;

    // Remove old video and canvas
    video.remove();
    let oldCanvas = select('canvas');
    if (oldCanvas) oldCanvas.remove();

    // Create new video element
    video = createVideo([newSource]);
    video.hide();
    video.loop();
    video.volume(0);

    // Wait for new video to load and be ready
    video.elt.onloadedmetadata = () => {
        // Create new canvas sized to 2x video resolution
        let canvas = createCanvas(video.width * 2, video.height * 2);
        canvas.parent('video-container');
        pixelDensity(1);

        // Update container widths
        let controlsContainer = select('#controls-container');
        controlsContainer.style('width', `${video.width * 2}px`);

        let videoSelector = select('#video-selector');
        videoSelector.style('width', `${video.width * 2}px`);
    };

    // Play once video can start playing
    video.elt.oncanplay = () => {
        video.play();
    };
}

function createControls() {
    let controlsContainer = select('#controls-container');

    // Overlay control
    let overlayRow = createDiv('');
    overlayRow.class('control-row');
    overlayRow.parent(controlsContainer);

    let overlayLabel = createSpan('OVERLAY');
    overlayLabel.class('control-label');
    overlayLabel.parent(overlayRow);

    opacitySlider = createSlider(0, 100, movementOpacity, 1);
    opacitySlider.parent(overlayRow);

    let overlayValue = createSpan(`${movementOpacity}%`);
    overlayValue.class('control-value');
    overlayValue.parent(overlayRow);

    opacitySlider.input(() => {
        movementOpacity = opacitySlider.value();
        overlayValue.html(`${movementOpacity}%`);
    });

    // Persistence control
    let persistenceRow = createDiv('');
    persistenceRow.class('control-row');
    persistenceRow.parent(controlsContainer);

    let persistenceLabel = createSpan('PERSISTENCE');
    persistenceLabel.class('control-label');
    persistenceLabel.parent(persistenceRow);

    fadeSlider = createSlider(0, 100, fadePercentage, 1);
    fadeSlider.parent(persistenceRow);

    let persistenceValue = createSpan(`${fadePercentage}%`);
    persistenceValue.class('control-value');
    persistenceValue.parent(persistenceRow);

    fadeSlider.input(() => {
        fadePercentage = fadeSlider.value();
        persistenceValue.html(`${fadePercentage}%`);
        if (fadePercentage === 0) {
            previousBitmap = null;
        }
    });

    // Blur control
    let blurRow = createDiv('');
    blurRow.class('control-row');
    blurRow.parent(controlsContainer);

    let blurLabel = createSpan('BLUR');
    blurLabel.class('control-label');
    blurLabel.parent(blurRow);

    blurSlider = createSlider(0, 8, blurAmount, 1);
    blurSlider.parent(blurRow);

    let blurValue = createSpan(`${blurAmount}PX`);
    blurValue.class('control-value');
    blurValue.parent(blurRow);

    blurSlider.input(() => {
        blurAmount = blurSlider.value();
        blurValue.html(`${blurAmount}PX`);
    });
}

function draw() {
    // Start with black background
    background(0);

    if (video.loadedmetadata && video.time() > 0) {
        // Get video pixels
        video.loadPixels();

        // Create current frame array
        currentFrame = [...video.pixels];

        // Initialize previous frame on first frame
        if (!previousFrame) {
            previousFrame = [...video.pixels];
            return;
        }

        // Create offscreen graphics buffers at video's native resolution
        let originalPg = createGraphics(video.width, video.height);
        let movementPg = createGraphics(video.width, video.height);

        originalPg.loadPixels();
        movementPg.loadPixels();

        // Process both original and movement in parallel
        for (let i = 0; i < video.pixels.length; i += 4) {
            // Convert to grayscale
            let currentGray = (currentFrame[i] * 0.299 +
                              currentFrame[i + 1] * 0.587 +
                              currentFrame[i + 2] * 0.114);

            let previousGray = (previousFrame[i] * 0.299 +
                               previousFrame[i + 1] * 0.587 +
                               previousFrame[i + 2] * 0.114);

            // Original grayscale video
            originalPg.pixels[i] = currentGray;
            originalPg.pixels[i + 1] = currentGray;
            originalPg.pixels[i + 2] = currentGray;
            originalPg.pixels[i + 3] = 255;

            // Movement filter: difference between current and previous frame
            let difference = Math.abs(currentGray - previousGray);

            // Add percentage of previous bitmap for fade effect
            let outputValue = difference;
            if (fadePercentage > 0 && previousBitmap) {
                let fadeFactor = fadePercentage / 100;
                outputValue = difference + (previousBitmap[i] * fadeFactor);
            }

            // Clamp to 0-255 range
            outputValue = Math.min(255, outputValue);

            movementPg.pixels[i] = outputValue;
            movementPg.pixels[i + 1] = outputValue;
            movementPg.pixels[i + 2] = outputValue;
            movementPg.pixels[i + 3] = 255;
        }

        originalPg.updatePixels();
        movementPg.updatePixels();

        // Store current output as previous bitmap for next frame (only if fade is active)
        if (fadePercentage > 0) {
            previousBitmap = [...movementPg.pixels];
        }

        // Apply blur filter to movement layer only
        if (blurAmount > 0) {
            movementPg.filter(BLUR, blurAmount);
        }

        // Draw original grayscale video (fills entire canvas at 2x)
        image(originalPg, 0, 0, width, height);

        // Overlay movement with adjustable opacity
        if (movementOpacity > 0) {
            push();
            tint(255, movementOpacity * 2.55); // Convert 0-100 to 0-255
            image(movementPg, 0, 0, width, height);
            pop();
        }

        // Store current frame as previous for next iteration
        previousFrame = currentFrame;
    }
}

function windowResized() {
    // Keep canvas at 2x video size, don't resize with window
}
