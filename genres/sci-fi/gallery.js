let imageData = [];
let currentIndex = 0;
const imgElement = document.getElementById('current-image');
const headingElement = document.querySelector('.heading');
const descriptionElement = document.querySelector('.description');
let headingTimeout;
let descriptionTimeout;
let previousImageSrc = '';

// Load image data from JSON
fetch('imageData.json')
    .then(response => response.json())
    .then(data => {
        imageData = data;
        showImage(currentIndex);
    });

function typeWriter(element, text, timeoutVar, speed, index = 0) {
    if (index < text.length) {
        element.textContent = text.substring(0, index + 1);
        return setTimeout(() => typeWriter(element, text, timeoutVar, speed, index + 1), speed);
    }
}

function showImage(index) {
    if (!imageData.length) return;

    const current = imageData[index];
    const newImageSrc = current.image;

    // Flicker between previous and new image
    if (previousImageSrc && previousImageSrc !== newImageSrc) {
        let flickerCount = 0;
        const maxFlickers = 8;
        const flickerInterval = setInterval(() => {
            if (flickerCount >= maxFlickers) {
                clearInterval(flickerInterval);
                imgElement.src = newImageSrc;
                previousImageSrc = newImageSrc;
                return;
            }

            // Alternate between previous and new image
            imgElement.src = (flickerCount % 2 === 0) ? newImageSrc : previousImageSrc;
            flickerCount++;
        }, 60);
    } else {
        imgElement.src = newImageSrc;
        previousImageSrc = newImageSrc;
    }

    if (headingTimeout) clearTimeout(headingTimeout);
    if (descriptionTimeout) clearTimeout(descriptionTimeout);

    headingElement.textContent = '';
    descriptionElement.textContent = '';

    headingTimeout = typeWriter(headingElement, current.heading, headingTimeout, 100);
    descriptionTimeout = typeWriter(descriptionElement, current.description, descriptionTimeout, 10);
}

function nextImage() {
    currentIndex = (currentIndex + 1) % imageData.length;
    showImage(currentIndex);
}

function previousImage() {
    currentIndex = (currentIndex - 1 + imageData.length) % imageData.length;
    showImage(currentIndex);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextImage();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previousImage();
    }
});

// Disable all mouse events
document.addEventListener('click', (e) => e.preventDefault(), true);
document.addEventListener('mousedown', (e) => e.preventDefault(), true);
document.addEventListener('mouseup', (e) => e.preventDefault(), true);
document.addEventListener('dblclick', (e) => e.preventDefault(), true);
document.addEventListener('contextmenu', (e) => e.preventDefault(), true);