const container = document.getElementById('cards');
const searchInput = document.getElementById('search');
const emptyMessage = document.getElementById('empty');
const toolModal = document.getElementById('tool-modal');
const toolModalClose = document.getElementById('tool-modal-close');
const toolModalImage = document.getElementById('tool-modal-image');
const toolModalTitle = document.getElementById('tool-modal-title');
const toolModalDescription = document.getElementById('tool-modal-description');

const DEFAULT_DESCRIPTION = 'A tool I have used in my development workflow.';

function imageSource(path) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
    return path.split('/').map(encodeURIComponent).join('/');
}

function normalizeTool(tool) {
    if (!tool || typeof tool.name !== 'string' || !tool.name.trim()) return null;
    if (typeof tool.image !== 'string' || !tool.image.trim()) return null;

    return {
        name: tool.name.trim(),
        image: tool.image.trim(),
        description: typeof tool.description === 'string' && tool.description.trim()
            ? tool.description.trim()
            : DEFAULT_DESCRIPTION
    };
}

function openTool(tool) {
    toolModalTitle.textContent = tool.name;
    toolModalDescription.textContent = tool.description;
    toolModalImage.src = imageSource(tool.image);
    toolModalImage.alt = tool.name + ' logo';

    if (typeof toolModal.showModal === 'function' && !toolModal.open) {
        toolModal.showModal();
    } else {
        toolModal.setAttribute('open', '');
    }

    document.body.classList.add('modal-open');
}

function closeTool() {
    if (typeof toolModal.close === 'function' && toolModal.open) {
        toolModal.close();
    } else {
        toolModal.removeAttribute('open');
    }

    document.body.classList.remove('modal-open');
}

function createCard(tool) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.title = tool.name.toLowerCase();
    card.setAttribute('aria-haspopup', 'dialog');

    const icon = document.createElement('span');
    icon.className = 'icon';

    const img = document.createElement('img');
    img.src = imageSource(tool.image);
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    icon.appendChild(img);

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = tool.name;

    card.append(icon, title);
    card.addEventListener('click', () => openTool(tool));
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

toolModalClose.addEventListener('click', closeTool);

toolModal.addEventListener('click', event => {
    if (event.target === toolModal) closeTool();
});

toolModal.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toolModal.hasAttribute('open')) {
        closeTool();
    }
});

searchInput.addEventListener('input', filterCards);
searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        searchInput.value = '';
        filterCards();
    }
});

fetch('../json/tools.json', { cache: 'no-store' })
    .then(response => {
        if (!response.ok) throw new Error('Tool data error');
        return response.json();
    })
    .then(tools => {
        const validTools = Array.isArray(tools)
            ? tools.map(normalizeTool).filter(Boolean)
            : [];

        if (!validTools.length) {
            showEmpty('No tools available.');
            return;
        }

        validTools
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(tool => container.appendChild(createCard(tool)));

        filterCards();
    })
    .catch(error => {
        console.error('Could not load tools:', error);

        if (window.location.protocol === 'file:') {
            showEmpty('Tool data cannot be loaded from a file:// page. Run "python3 -m http.server 8000" from the repository root, then open http://localhost:8000/assets/pages/tools.html.');
        } else {
            showEmpty('Could not load tools. Make sure assets/json/tools.json exists and is accessible.');
        }
    });
