const SVG_DIR = '../img/svg/';
function toTitle(fileName) {
    return fileName
        .replace(/\.svg$/i, '')
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function createCard(fileName) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.title = toTitle(fileName).toLowerCase();

    const icon = document.createElement('div');
    icon.className = 'icon';
    const img = document.createElement('img');
    img.src = SVG_DIR + encodeURIComponent(fileName);
    img.alt = '';
    icon.appendChild(img);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = toTitle(fileName);

    card.append(icon, title);
    return card;
}

const container = document.getElementById('cards');
const searchInput = document.getElementById('search');
const emptyMessage = document.getElementById('empty');

function filterCards() {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;

    container.querySelectorAll('.card').forEach(card => {
        const match = card.dataset.title.includes(query);
        card.hidden = !match;
        if (match) visible++;
    });

    emptyMessage.hidden = visible > 0;
}

if (typeof SVG_FILES === 'undefined' || !SVG_FILES.length) {
    container.textContent = 'No SVG files listed. Add file names to assets/js/svg-list.js.';
} else {
    [...SVG_FILES]
        .sort((a, b) => a.localeCompare(b))
        .forEach(file => container.appendChild(createCard(file)));

    searchInput.addEventListener('input', filterCards);
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterCards();
        }
    });
}