(function () {
    'use strict';

    var DATA_URL = '../json/projects.json';

    var grid = document.querySelector('.repo-grid');
    var search = document.getElementById('repo-search');
    var visGroup = document.getElementById('visibility-filter');
    var langGroup = document.getElementById('lang-filter');
    var empty = document.getElementById('repo-empty');
    var toggle = document.getElementById('filter-toggle');
    var panel = document.getElementById('filter-panel');
    var badge = document.getElementById('filter-badge');
    var clearBtn = document.getElementById('filter-clear');

    var modal = document.getElementById('project-modal');
    var modalClose = document.getElementById('modal-close');
    var modalAvatar = document.getElementById('modal-avatar');
    var modalOwner = document.getElementById('modal-owner');
    var modalTitle = document.getElementById('modal-title');
    var modalContributor = document.getElementById('modal-contributor');
    var modalBadge = document.getElementById('modal-badge');
    var modalDescription = document.getElementById('modal-description');
    var modalMeta = document.getElementById('modal-meta');
    var modalDetailsSection = document.getElementById('modal-details-section');
    var modalDetails = document.getElementById('modal-details');
    var modalHighlights = document.getElementById('modal-highlights');
    var modalTopicsSection = document.getElementById('modal-topics-section');
    var modalTopics = document.getElementById('modal-topics');
    var modalGallerySection = document.getElementById('modal-gallery-section');
    var modalGallery = document.getElementById('modal-gallery');
    var modalLinksSection = document.getElementById('modal-links-section');
    var modalLinks = document.getElementById('modal-links');
    var modalPrivate = document.getElementById('modal-private');

    var state = { q: '', vis: 'all', lang: 'all' };
    var compact = window.matchMedia('(max-width: 900px)');
    var currentCard = null;
    var cards = [];
    var profileAvatar = '';

    var imageCache = Object.create(null);
    var imageQueue = [];
    var activeImageLoads = 0;
    var MAX_IMAGE_LOADS = 2;

    function getRepoPath(url) {
        var match = url.match(/github\.com\/([^\/?#]+\/[^\/?#]+)/i);
        return match ? match[1].replace(/\.git$/i, '').replace(/\/$/, '') : '';
    }

    function toCount(value) {
        var number = Number(value);
        return isFinite(number) && number > 0 ? Math.floor(number) : 0;
    }

    function imageSource(path) {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
        return path.split('/').map(encodeURIComponent).join('/');
    }

    function createIcon(iconId, className) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', className || '');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('aria-hidden', 'true');

        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#' + iconId);
        svg.appendChild(use);

        return svg;
    }

    function createCard(project) {
        project = project || {};

        var title = typeof project.name === 'string' ? project.name.trim() : '';
        var description = typeof project.description === 'string' ? project.description.trim() : '';
        var visibility = typeof project.visibility === 'string' ? project.visibility.toLowerCase() : 'private';
        var language = typeof project.language === 'string' ? project.language.trim() : '';
        var color = typeof project.languageColor === 'string' ? project.languageColor.trim() : '';
        var url = typeof project.url === 'string' ? project.url.trim() : '';
        var details = typeof project.details === 'string' ? project.details.trim() : '';
        var contributed = Boolean(project.contributed);
        var repoPath = getRepoPath(url);
        var images = Array.isArray(project.images) ? project.images.filter(function (src) {
            return typeof src === 'string' && src;
        }) : [];
        var highlights = Array.isArray(project.highlights) ? project.highlights.filter(Boolean) : [];
        var links = Array.isArray(project.links) ? project.links.filter(function (link) {
            return link && typeof link.url === 'string' && /^https?:\/\//i.test(link.url);
        }).map(function (link) {
            return {
                label: typeof link.label === 'string' && link.label ? link.label : 'Project link',
                url: link.url
            };
        }) : [];

        var article = document.createElement('article');
        article.className = 'repo-card';

        var header = document.createElement('div');
        header.className = 'repo-header';

        var h3 = document.createElement('h3');
        h3.className = 'repo-name';

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'repo-name-btn';
        button.setAttribute('aria-haspopup', 'dialog');
        button.textContent = title;
        if (url) button.setAttribute('data-url', url);

        h3.appendChild(button);
        header.appendChild(createIcon('i-repo', 'repo-icon'));
        header.appendChild(h3);

        if (contributed) {
            var contributorBadge = document.createElement('span');
            contributorBadge.className = 'repo-badge contributor';
            contributorBadge.textContent = 'Contributed';
            header.appendChild(contributorBadge);
        }

        var visibilityBadge = document.createElement('span');
        visibilityBadge.className = 'repo-badge' + (visibility === 'private' ? ' private' : '');
        visibilityBadge.textContent = visibility === 'private' ? 'Private' : 'Public';
        header.appendChild(visibilityBadge);

        var descriptionElement = document.createElement('p');
        descriptionElement.className = 'repo-description';
        descriptionElement.textContent = description;

        var meta = document.createElement('ul');
        meta.className = 'repo-meta';

        if (language) {
            var languageItem = document.createElement('li');
            var dot = document.createElement('span');
            dot.className = 'lang-dot';
            if (color) dot.style.setProperty('--lang', color);
            languageItem.appendChild(dot);
            languageItem.appendChild(document.createTextNode(language));
            meta.appendChild(languageItem);
        }

        article.append(header, descriptionElement, meta);

        var textParts = [title, description, visibility, language, details];
        if (contributed) textParts.push('contributed open source');
        links.forEach(function (link) {
            textParts.push(link.label);
        });
        textParts.push(highlights.join(' '));
        textParts.push(images.join(' '));

        return {
            el: article,
            btn: button,
            metaEl: meta,
            title: title,
            description: description,
            vis: visibility,
            lang: language,
            color: color,
            url: url,
            repoPath: repoPath,
            images: images,
            details: details,
            highlights: highlights,
            links: links,
            contributed: contributed,
            text: textParts.join(' ').toLowerCase(),
            stars: toCount(project.stars),
            forks: toCount(project.forks),
            repo: null
        };
    }

    function preloadImage(url) {
        if (!url) return Promise.resolve(null);
        if (imageCache[url]) return imageCache[url].promise;

        var record = {
            url: url,
            image: new Image(),
            loaded: false
        };

        record.image.decoding = 'async';
        record.promise = new Promise(function (resolve) {
            record.resolve = resolve;
        });

        imageCache[url] = record;
        imageQueue.push(record);
        pumpImageQueue();
        return record.promise;
    }

    function pumpImageQueue() {
        while (activeImageLoads < MAX_IMAGE_LOADS && imageQueue.length) {
            loadCachedImage(imageQueue.shift());
        }
    }

    function loadCachedImage(record) {
        activeImageLoads++;

        function done(ok) {
            activeImageLoads--;
            record.loaded = ok;
            record.resolve(ok ? record.image : null);
            pumpImageQueue();
        }

        record.image.onload = function () {
            if (typeof record.image.decode === 'function') {
                record.image.decode().then(function () {
                    done(true);
                }).catch(function () {
                    done(true);
                });
            } else {
                done(true);
            }
        };

        record.image.onerror = function () {
            done(false);
        };

        record.image.src = imageSource(record.url);
    }

    function preloadCardImages() {
        cards.forEach(function (card) {
            card.images.forEach(function (url) {
                preloadImage(url).then(function (image) {
                    if (image && currentCard === card && modal.open) populateModal(card);
                });
            });
        });
    }

    function formatNum(num) {
        if (typeof num !== 'number') return '';
        return num >= 1000 ? (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(num);
    }

    function formatRelative(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';

        var seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
        var units = [
            [31536000, 'year'],
            [2592000, 'month'],
            [604800, 'week'],
            [86400, 'day'],
            [3600, 'hour'],
            [60, 'minute']
        ];

        for (var i = 0; i < units.length; i++) {
            var amount = Math.floor(seconds / units[i][0]);
            if (amount >= 1) {
                return amount + ' ' + units[i][1] + (amount === 1 ? '' : 's') + ' ago';
            }
        }

        return 'just now';
    }

    function formatDate(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';

        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function setCardStat(card, key, iconId) {
        var item = card.metaEl.querySelector('li[data-stat="' + key + '"]');
        if (!item) {
            item = document.createElement('li');
            item.dataset.stat = key;
            item.appendChild(createIcon(iconId));
            item.appendChild(document.createElement('span'));
            card.metaEl.appendChild(item);
        }

        item.querySelector('span').textContent = formatNum(card[key]);
    }

    function renderCardStats(card) {
        if (!card.repoPath) return;
        setCardStat(card, 'stars', 'i-star');
        setCardStat(card, 'forks', 'i-fork');
    }

    function addCardMeta(card, text) {
        if (!text) return;

        var item = document.createElement('li');
        item.textContent = text;
        card.metaEl.appendChild(item);
    }

    function fetchGitHubStats(card) {
        if (!card.repoPath) return Promise.resolve();

        return fetch('https://api.github.com/repos/' + card.repoPath)
            .then(function (response) {
                if (!response.ok) throw new Error('GitHub API error');
                return response.json();
            })
            .then(function (data) {
                card.repo = data;
                card.stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : 0;
                card.forks = typeof data.forks_count === 'number' ? data.forks_count : 0;
                renderCardStats(card);

                if (data.license) {
                    var license = data.license.spdx_id || data.license.name || '';
                    if (license && license !== 'NOASSERTION') addCardMeta(card, license + ' license');
                }

                var updated = formatRelative(data.updated_at);
                if (updated) addCardMeta(card, 'Updated ' + updated);

                if (currentCard === card && modal.open) populateModal(card);
            })
            .catch(function () {
            });
    }

    function makeChip(value, label, color, active) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip' + (active ? ' active' : '');
        chip.dataset.value = value;

        if (color) {
            var dot = document.createElement('span');
            dot.className = 'lang-dot';
            dot.style.setProperty('--lang', color);
            chip.appendChild(dot);
        }

        chip.appendChild(document.createTextNode(label));
        return chip;
    }

    function findChip(group, value) {
        var chips = group.querySelectorAll('.chip');
        for (var i = 0; i < chips.length; i++) {
            if (chips[i].dataset.value === value) return chips[i];
        }
        return null;
    }

    function setActive(group, button) {
        Array.prototype.forEach.call(group.querySelectorAll('.chip'), function (chip) {
            chip.classList.toggle('active', chip === button);
        });
    }

    function buildLanguageFilter() {
        var languages = {};

        cards.forEach(function (card) {
            if (card.lang && !languages[card.lang]) languages[card.lang] = card.color;
        });

        clearElement(langGroup);
        langGroup.appendChild(makeChip('all', 'All languages', '', state.lang === 'all'));

        Object.keys(languages).sort().forEach(function (language) {
            langGroup.appendChild(makeChip(language, language, languages[language], state.lang === language));
        });
    }

    function apply() {
        var shown = 0;

        cards.forEach(function (card) {
            var matches = (!state.q || card.text.indexOf(state.q) !== -1) &&
                (state.vis === 'all' || card.vis === state.vis) &&
                (state.lang === 'all' || card.lang === state.lang);

            card.el.hidden = !matches;
            if (matches) shown++;
        });

        empty.hidden = shown !== 0;

        var active = (state.q ? 1 : 0) +
            (state.vis !== 'all' ? 1 : 0) +
            (state.lang !== 'all' ? 1 : 0);

        badge.textContent = active;
        badge.hidden = active === 0;
    }

    function addModalMeta(iconId, text, dotColor) {
        if (!text) return;

        var item = document.createElement('li');

        if (dotColor) {
            var dot = document.createElement('span');
            dot.className = 'lang-dot';
            dot.style.setProperty('--lang', dotColor);
            item.appendChild(dot);
        } else if (iconId) {
            item.appendChild(createIcon(iconId));
        }

        var span = document.createElement('span');
        span.textContent = text;
        item.appendChild(span);
        modalMeta.appendChild(item);
    }

    function clearElement(element) {
        while (element.firstChild) element.removeChild(element.firstChild);
    }

    function populateModal(card) {
        var repo = card.repo;
        var isPrivate = card.vis === 'private';
        var owner = card.repoPath ? card.repoPath.split('/')[0] : '';

        modalOwner.textContent = '';
        if (owner) {
            var ownerLink = document.createElement('a');
            ownerLink.href = 'https://github.com/' + owner;
            ownerLink.target = '_blank';
            ownerLink.rel = 'noopener noreferrer';
            ownerLink.textContent = owner;
            modalOwner.appendChild(ownerLink);
        } else {
            modalOwner.textContent = 'El Ajbari Youssef';
        }

        modalTitle.textContent = card.title;
        modalContributor.hidden = !card.contributed;
        modalBadge.textContent = isPrivate ? 'Private' : 'Public';
        modalBadge.classList.toggle('private', isPrivate);
        modalDescription.textContent = card.description;

        clearElement(modalMeta);

        if (card.lang) addModalMeta('', card.lang, card.color);

        if (!isPrivate) {
            addModalMeta('i-star', formatNum(card.stars) + (card.stars === 1 ? ' star' : ' stars'));
            addModalMeta('i-fork', formatNum(card.forks) + (card.forks === 1 ? ' fork' : ' forks'));
        }

        if (repo) {
            if (repo.license) {
                var license = repo.license.spdx_id || repo.license.name || '';
                if (license && license !== 'NOASSERTION') addModalMeta('', license + ' license');
            }

            var updated = formatDate(repo.updated_at);
            if (updated) addModalMeta('', 'Updated ' + updated);
        }

        var detailsText = card.details;
        var highlights = card.highlights.filter(Boolean);

        modalDetails.textContent = detailsText;
        modalDetails.hidden = !detailsText;

        clearElement(modalHighlights);
        highlights.forEach(function (highlight) {
            var item = document.createElement('li');
            item.textContent = highlight;
            modalHighlights.appendChild(item);
        });
        modalHighlights.hidden = highlights.length === 0;
        modalDetailsSection.hidden = !detailsText && highlights.length === 0;

        var topics = (repo && repo.topics) || [];
        modalTopicsSection.hidden = topics.length === 0;
        clearElement(modalTopics);
        topics.forEach(function (topic) {
            var chip = document.createElement('span');
            chip.className = 'topic-chip';
            chip.textContent = topic;
            modalTopics.appendChild(chip);
        });

        var images = card.images.map(function (src) {
            var cached = imageCache[src];
            return cached && cached.loaded ? cached.image : null;
        }).filter(Boolean);

        modalGallerySection.hidden = images.length === 0;
        clearElement(modalGallery);
        images.forEach(function (image) {
            image.className = '';
            image.alt = card.title + ' screenshot';
            image.loading = 'eager';
            modalGallery.appendChild(image);
        });

        var homepage = repo && typeof repo.homepage === 'string' ? repo.homepage.trim() : '';
        if (homepage && !/^https?:\/\//i.test(homepage)) homepage = 'https://' + homepage;

        var links = [];
        var seenLinks = {};

        function addProjectLink(label, url, primary) {
            if (!url || !/^https?:\/\//i.test(url)) return;

            var key = url.replace(/\/+$/, '').toLowerCase();
            if (seenLinks[key]) return;
            seenLinks[key] = true;
            links.push({ label: label, url: url, primary: primary });
        }

        if (card.url) addProjectLink('Open on GitHub', card.url, true);

        card.links.forEach(function (link) {
            addProjectLink(link.label || 'Project link', link.url, false);
        });

        if (homepage) addProjectLink('Visit website', homepage, false);

        clearElement(modalLinks);
        links.forEach(function (link) {
            var anchor = document.createElement('a');
            anchor.className = 'modal-link' + (link.primary ? '' : ' secondary');
            anchor.href = link.url;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.appendChild(document.createTextNode(link.label + ' '));

            var arrow = document.createElement('span');
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '\u2197';
            anchor.appendChild(arrow);

            modalLinks.appendChild(anchor);
        });

        modalLinksSection.hidden = links.length === 0;
        modalPrivate.hidden = Boolean(card.url);
    }

    function openProject(card) {
        currentCard = card;
        populateModal(card);

        if (typeof modal.showModal === 'function') {
            if (!modal.open) modal.showModal();
        } else {
            modal.setAttribute('open', '');
        }

        document.body.classList.add('modal-open');
    }

    function closeModal() {
        if (typeof modal.close === 'function' && modal.open) {
            modal.close();
        } else {
            modal.removeAttribute('open');
            document.body.classList.remove('modal-open');
        }
    }

    function sortCards() {
        cards.sort(function (a, b) {
            if (a.vis !== b.vis) return a.vis === 'public' ? -1 : 1;
            if (a.lang < b.lang) return -1;
            if (a.lang > b.lang) return 1;
            return (b.stars || 0) - (a.stars || 0);
        });

        cards.forEach(function (card) {
            grid.appendChild(card.el);
        });
    }

    function setFiltersOpen(open) {
        panel.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function syncFilters() {
        setFiltersOpen(!compact.matches);
    }

    function initialize(data) {
        var projects = Array.isArray(data) ? data : (data && Array.isArray(data.projects) ? data.projects : []);
        profileAvatar = data && typeof data.profileAvatar === 'string' ? data.profileAvatar : '';

        clearElement(grid);
        cards = projects.map(createCard);

        cards.forEach(function (card) {
            grid.appendChild(card.el);
            renderCardStats(card);
        });

        buildLanguageFilter();
        sortCards();

        empty.textContent = projects.length ? 'No projects match your filters.' : 'No projects available.';
        apply();

        if (profileAvatar) {
            preloadImage(profileAvatar).then(function (image) {
                if (!image) return;
                modalAvatar.src = image.src;
                modalAvatar.classList.add('is-ready');
            });
        }

        preloadCardImages();

        Promise.all(cards.map(fetchGitHubStats)).then(function () {
            sortCards();
            apply();
        });
    }

    search.addEventListener('input', function () {
        state.q = search.value.trim().toLowerCase();
        apply();
    });

    visGroup.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        var chip = target.closest('.chip');
        if (!chip) return;

        state.vis = chip.dataset.value;
        setActive(visGroup, chip);
        apply();
    });

    langGroup.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        var chip = target.closest('.chip');
        if (!chip) return;

        state.lang = chip.dataset.value;
        setActive(langGroup, chip);
        apply();
    });

    clearBtn.addEventListener('click', function () {
        state.q = '';
        state.vis = 'all';
        state.lang = 'all';
        search.value = '';

        setActive(visGroup, findChip(visGroup, 'all'));
        setActive(langGroup, findChip(langGroup, 'all'));
        apply();
    });

    syncFilters();

    if (typeof compact.addEventListener === 'function') {
        compact.addEventListener('change', syncFilters);
    } else if (typeof compact.addListener === 'function') {
        compact.addListener(syncFilters);
    }

    toggle.addEventListener('click', function () {
        setFiltersOpen(!panel.classList.contains('open'));
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' || modal.open) return;
        if (compact.matches && panel.classList.contains('open')) {
            setFiltersOpen(false);
            toggle.focus();
        }
    });

    modalClose.addEventListener('click', closeModal);

    modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal();
    });

    modal.addEventListener('close', function () {
        currentCard = null;
        document.body.classList.remove('modal-open');
    });

    grid.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        var cardElement = target.closest('.repo-card');
        if (!cardElement) return;

        var selection = window.getSelection ? window.getSelection().toString() : '';
        if (selection) return;

        for (var i = 0; i < cards.length; i++) {
            if (cards[i].el === cardElement) {
                openProject(cards[i]);
                return;
            }
        }
    });

    empty.textContent = 'Loading projects...';
    empty.hidden = false;

    fetch(DATA_URL)
        .then(function (response) {
            if (!response.ok) throw new Error('Project data error');
            return response.json();
        })
        .then(initialize)
        .catch(function () {
            empty.textContent = 'Could not load project data.';
            empty.hidden = false;
        });
})();
