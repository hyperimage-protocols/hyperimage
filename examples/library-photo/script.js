function resize() {
    const container = document.querySelector('.container');
    const background = document.querySelector('.background');
    const scaleX = window.innerWidth / 1100;
    const scaleY = window.innerHeight / 1318;
    const scale = Math.max(scaleX, scaleY);
    const transform = `translate(-50%, -50%) scale(${scale})`;
    container.style.transform = transform;
    background.style.transform = transform;
}

resize();
window.addEventListener('resize', resize);

const popup = document.querySelector('.popup');
const popupContent = document.querySelector('.popup-content');
const popupLink = document.body.querySelector('a[target="_blank"]');
const popupImg = popupLink.querySelector('img');
const popupInfo = document.body.querySelector('.popup-info');
const popupTitle = popupInfo.querySelector('h2');
const popupAuthor = popupInfo.querySelector('p');
const clickableAreas = document.querySelectorAll('.book-clickable');

let currentHoveredArea = null;

fetch('books.json')
    .then(response => response.json())
    .then(books => {
        clickableAreas.forEach(area => {
            area.addEventListener('mouseenter', () => {
                currentHoveredArea = area;
                if (!popupContent.contains(popupLink)) {
                    const filename = area.dataset.shelf;
                    const book = books.find(b => b.shelf === filename);
                    if (book) {
                        popupTitle.textContent = book.title;
                        popupAuthor.textContent = book.author;
                        popupInfo.style.display = 'block';
                        popupContent.appendChild(popupInfo);
                        setTimeout(() => popupInfo.classList.add('visible'), 10);
                    }
                }
            });

            area.addEventListener('mouseleave', () => {
                currentHoveredArea = null;
                if (popupContent.contains(popupInfo) && !popupContent.contains(popupLink)) {
                    popupInfo.classList.remove('visible');
                    setTimeout(() => {
                        if (popupContent.contains(popupInfo) && !popupInfo.classList.contains('visible')) {
                            popupContent.removeChild(popupInfo);
                            popupInfo.style.display = 'none';
                        }
                    }, 300);
                }
            });

            area.addEventListener('click', () => {
                const filename = area.dataset.shelf;
                const book = books.find(b => b.shelf === filename);
                if (book) {
                    if (popupContent.contains(popupLink)) {
                        popupImg.classList.remove('visible');
                        setTimeout(() => {
                            popupContent.removeChild(popupLink);
                            popupLink.style.display = 'none';
                        }, 300);
                        // Keep label if still hovering
                        if (!currentHoveredArea) {
                            popupInfo.classList.remove('visible');
                            setTimeout(() => {
                                if (popupContent.contains(popupInfo)) {
                                    popupContent.removeChild(popupInfo);
                                    popupInfo.style.display = 'none';
                                }
                            }, 300);
                        }
                    } else {
                        popupLink.href = book.link;
                        popupImg.src = book.cover;
                        popupLink.style.display = 'block';
                        popupImg.style.cursor = 'pointer';
                        popupContent.appendChild(popupLink);
                        popupInfo.style.display = 'block';
                        popupContent.appendChild(popupInfo);
                        popup.style.pointerEvents = 'auto';
                        document.querySelector('.container').style.pointerEvents = 'none';
                        document.querySelector('.background').style.pointerEvents = 'none';
                        setTimeout(() => {
                            popupImg.classList.add('visible');
                            popupInfo.classList.add('visible');
                        }, 10);
                    }
                }
            });
        });

        // Click anywhere else on popup to close
        popup.addEventListener('click', () => {
            if (popupContent.contains(popupLink)) {
                popupImg.classList.remove('visible');
                popup.style.pointerEvents = 'none';
                document.querySelector('.container').style.pointerEvents = 'auto';
                document.querySelector('.background').style.pointerEvents = 'auto';
                setTimeout(() => {
                    popupContent.removeChild(popupLink);
                    popupLink.style.display = 'none';
                    popupImg.style.cursor = '';
                }, 300);
                // Keep label if still hovering
                if (!currentHoveredArea) {
                    popupInfo.classList.remove('visible');
                    setTimeout(() => {
                        if (popupContent.contains(popupInfo)) {
                            popupContent.removeChild(popupInfo);
                            popupInfo.style.display = 'none';
                        }
                    }, 300);
                }
            }
        });
    });
