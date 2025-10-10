const shelfContainer = document.querySelector('.shelf-container');
const sidebar = document.querySelector('.sidebar');
const sidebarBar = document.querySelector('.sidebar-bar');
const fictionCheckbox = document.getElementById('filter-fiction');
const nonfictionCheckbox = document.getElementById('filter-nonfiction');
const sortAuthorRadio = document.getElementById('sort-author');
const sortTitleRadio = document.getElementById('sort-title');
const bookCard = document.querySelector('.book-card');
const cardEdge = document.querySelector('.book-card-edge');
const cardInner = document.querySelector('.book-card-inner');
const cardTitle = document.querySelector('.card-title');
const cardAuthor = document.querySelector('.card-author');
const cardYear = document.querySelector('.card-year');
const cardPages = document.querySelector('.card-pages');
const cardGenre = document.querySelector('.card-genre');

let allBooks = [];

// Book card functionality
let currentBookLink = '';

bookCard.addEventListener('click', (e) => {
    // If clicking outside the card content, close the card
    if (e.target === bookCard) {
        bookCard.classList.remove('visible');
    }
});

// Click on card content to open link
document.querySelector('.book-card-content').addEventListener('click', () => {
    if (currentBookLink) {
        window.open(currentBookLink, '_blank');
    }
});

// Sidebar toggle functionality
sidebarBar.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarBar.classList.toggle('hidden-arrow');
});

sidebar.addEventListener('click', (e) => {
    // Only toggle if clicking directly on sidebar, not content
    if (e.target === sidebar) {
        sidebar.classList.toggle('open');
        sidebarBar.classList.toggle('hidden-arrow');
    }
});

// Filter books based on checkboxes
function filterBooks() {
    const showFiction = fictionCheckbox.checked;
    const showNonfiction = nonfictionCheckbox.checked;

    const filteredBooks = allBooks.filter(book => {
        if (book.genre === 'Fiction' && showFiction) return true;
        if (book.genre === 'Nonfiction' && showNonfiction) return true;
        return false;
    });

    renderBooks(filteredBooks);
}

// Render books to the shelf
function renderBooks(books) {
    shelfContainer.innerHTML = '';

    // Sort books based on selected option
    if (sortAuthorRadio.checked) {
        books.sort((a, b) => {
            const lastNameA = a.author.split(' ').pop();
            const lastNameB = b.author.split(' ').pop();
            return lastNameA.localeCompare(lastNameB);
        });
    } else {
        books.sort((a, b) => {
            const titleA = a.title.replace(/^The\s+/i, '');
            const titleB = b.title.replace(/^The\s+/i, '');
            return titleA.localeCompare(titleB);
        });
    }

    let currentLetter = '';
    let bookCount = 0;

    books.forEach((book, index) => {
        // Get first letter based on sort option
        const firstLetter = sortAuthorRadio.checked
            ? book.author.split(' ').pop().charAt(0).toUpperCase()
            : book.title.replace(/^The\s+/i, '').charAt(0).toUpperCase();

        // Add letter marker if we're starting a new letter
        if (firstLetter !== currentLetter) {
            currentLetter = firstLetter;
            const marker = document.createElement('div');
            marker.className = 'shelf-item letter-marker';
            marker.textContent = currentLetter;
            shelfContainer.appendChild(marker);
        }

        const bookDiv = document.createElement('div');
        bookDiv.className = 'shelf-item book';

        // Set z-index in descending order so books on left cast shadows on books on right
        bookDiv.style.zIndex = 1000 - bookCount;
        bookCount++;

        const authorSpan = document.createElement('span');
        authorSpan.className = 'book-author';
        authorSpan.textContent = book.author;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'book-title';
        titleSpan.textContent = book.title;

        const indexDiv = document.createElement('div');
        indexDiv.className = book.genre === 'Fiction' ? 'book-index fiction-index' : 'book-index nonfiction-index';

        bookDiv.appendChild(authorSpan);
        bookDiv.appendChild(titleSpan);
        bookDiv.appendChild(indexDiv);

        // Add click handler to show book card
        bookDiv.addEventListener('click', () => {
            cardTitle.textContent = book.title;
            cardAuthor.textContent = book.author;
            cardYear.textContent = book.year;
            cardPages.textContent = book.pages + 'p';
            cardGenre.textContent = book.genre;

            // Set border style based on genre
            const genreClass = book.genre === 'Fiction' ? 'fiction' : 'nonfiction';
            cardEdge.className = 'book-card-edge ' + genreClass;
            cardInner.className = 'book-card-inner ' + genreClass;

            // Store the link
            currentBookLink = book.link;

            bookCard.classList.add('visible');
        });

        // Width based on page count: 10 pages per pixel, plus 60px
        const width = Math.round(book.pages / 10) + 60;
        bookDiv.style.width = width + 'px';

        shelfContainer.appendChild(bookDiv);
    });
}

// Add event listeners to checkboxes and radio buttons
fictionCheckbox.addEventListener('change', filterBooks);
nonfictionCheckbox.addEventListener('change', filterBooks);
sortAuthorRadio.addEventListener('change', filterBooks);
sortTitleRadio.addEventListener('change', filterBooks);

fetch('shelf.json')
    .then(response => response.json())
    .then(books => {
        allBooks = books;
        renderBooks(allBooks);
    });
