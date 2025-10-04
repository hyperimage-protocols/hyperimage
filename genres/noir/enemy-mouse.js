// Enemy mouse that follows the user's mouse
const enemyMouse = document.createElement('div');
enemyMouse.id = 'enemy-mouse';
enemyMouse.style.display = 'none'; // Hidden initially
document.body.appendChild(enemyMouse);

let enemyX = window.innerWidth / 2;
let enemyY = window.innerHeight / 2;
let userX = window.innerWidth / 2;
let userY = window.innerHeight / 2;
let enemyActive = false;

const SPEED = 100; // pixels per second

// Track user mouse position
document.addEventListener('mousemove', (e) => {
  userX = e.clientX;
  userY = e.clientY;
});

// Update enemy position
function updateEnemyPosition() {
  if (!enemyActive) {
    requestAnimationFrame(updateEnemyPosition);
    return;
  }

  const dx = userX - enemyX;
  const dy = userY - enemyY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    // Move towards user at SPEED pixels per second
    const moveDistance = SPEED / 60; // 60fps
    const ratio = Math.min(moveDistance / distance, 1);

    enemyX += dx * ratio;
    enemyY += dy * ratio;
  }

  // Update enemy mouse position
  enemyMouse.style.left = enemyX + 'px';
  enemyMouse.style.top = enemyY + 'px';

  // Check distance - if caught, redirect to black page
  if (distance < 10) {
    window.location.href = 'caught.html';
    return;
  }

  requestAnimationFrame(updateEnemyPosition);
}

// Give 5 second head start before enemy appears
setTimeout(() => {
  enemyActive = true;
  enemyMouse.style.display = 'block';
}, 5000);

// Start animation
requestAnimationFrame(updateEnemyPosition);
