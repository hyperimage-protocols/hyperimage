fetch('content.json')
  .then(response => response.json())
  .then(data => {
    const imageItems = document.querySelectorAll('.image-item');

    imageItems.forEach((item, index) => {
      if (data.images[index]) {
        const subHeadline = item.querySelector('.sub-headline');
        const bodyText = item.querySelector('.body-text');

        subHeadline.textContent = data.images[index].headline;
        bodyText.textContent = data.images[index].body;
      }
    });
  })
  .catch(error => console.error('Error loading content:', error));

// Mouse gradient effect
const gradientDiv = document.getElementById('mouse-gradient');

document.addEventListener('mousemove', (e) => {
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // Calculate the perpendicular distance for a 45-degree angle gradient
  // The transparent band follows a 45-degree line through the mouse position
  const gradient = `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.9) calc(50% - 60px),
      transparent calc(50% - 30px),
      transparent calc(50% + 30px),
      rgba(0, 0, 0, 0.9) calc(50% + 60px),
      rgba(0, 0, 0, 0.9) 100%
    )
  `;

  // Position the gradient to center on the mouse
  const offsetX = mouseX - window.innerWidth / 2;
  const offsetY = mouseY - window.innerHeight / 2;
  const offset = (offsetX + offsetY) / Math.sqrt(2);

  gradientDiv.style.background = gradient;
  gradientDiv.style.backgroundPosition = `${offset}px ${offset}px`;
});

// Initialize with mouse in center
gradientDiv.style.background = `
  linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.9) calc(50% - 60px),
    transparent calc(50% - 30px),
    transparent calc(50% + 30px),
    rgba(0, 0, 0, 0.9) calc(50% + 60px),
    rgba(0, 0, 0, 0.9) 100%
  )
`;
