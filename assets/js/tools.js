const container = document.getElementById('cards');
const searchInput = document.getElementById('search');
const emptyMessage = document.getElementById('empty');

function imageSource(path) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
    return path.split('/').map(encodeURIComponent).join('/');
}

function createCard(tool) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.title = tool.name.toLowerCase();

    const icon = document.createElement('div');
    icon.className = 'icon';

    const img = document.createElement('img');
    img.src = imageSource(tool.image);
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    icon.appendChild(img);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = tool.name;

    card.append(icon, title);
    return card;
}

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

function showEmpty(message) {
    emptyMessage.textContent = message;
    emptyMessage.hidden = false;
}

searchInput.addEventListener('input', filterCards);
searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        searchInput.value = '';
        filterCards();
    }
});

fetch('../json/tools.json')
    .then(response => {
        if (!response.ok) throw new Error('Tool data error');
        return response.json();
    })
    .then(tools => {
        const validTools = Array.isArray(tools) ? tools.filter(tool => {
            return tool &&
                typeof tool.name === 'string' &&
                tool.name.trim() &&
                typeof tool.image === 'string' &&
                tool.image.trim();
        }) : [];

        if (!validTools.length) {
            showEmpty('No tools available.');
            return;
        }

        validTools
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(tool => container.appendChild(createCard(tool)));

        filterCards();
    })
    .catch(() => {
        showEmpty('Could not load tools.');
    });
