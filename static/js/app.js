// APP STATE
let state = {
    notes: [],
    filteredNotesCount: 0,
    activeCategory: 'all',
    searchQuery: '',
    lastFetched: 0,
    source: 'cache'
};

// DOM ELEMENTS
const cacheBadge = document.getElementById('cache-badge');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const categoryFilters = document.getElementById('category-filters');
const refreshBtn = document.getElementById('refresh-btn');
const refreshSpinner = document.getElementById('refresh-spinner');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const noResultsState = document.getElementById('no-results-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const timelineContainer = document.getElementById('timeline-container');

// Floating Tooltip
const floatingTooltip = document.getElementById('floating-tweet-tooltip');
const floatingTweetBtn = document.getElementById('floating-tweet-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const tweetSourceLink = document.getElementById('tweet-source-link');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalTweetBtn = document.getElementById('modal-tweet-btn');

// Toast Elements
const toast = document.getElementById('toast-notification');
const toastMsg = document.getElementById('toast-message');

// Twiter Character Limit constants
const TWITTER_CHAR_LIMIT = 280;
const T.CO_LINK_LENGTH = 23; // Twitter shortens all URLs to 23 chars

// Temp storage for active tweet item
let activeTweetLink = '';

// EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
    
    // Refresh handlers
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Filter & Search handlers
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    categoryFilters.addEventListener('click', handleCategoryFilter);
    resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Modal handlers
    closeModalBtn.addEventListener('click', hideModal);
    modalCancelBtn.addEventListener('click', hideModal);
    tweetTextarea.addEventListener('input', updateCharCount);
    modalTweetBtn.addEventListener('click', executeTweet);
    
    // Global hide modal on click outside
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideModal();
    });
    
    // Text Selection detection
    document.addEventListener('mouseup', handleTextSelection);
    floatingTweetBtn.addEventListener('click', handleFloatingTweetClick);
});

// FETCH DATA
async function fetchReleaseNotes(force = false) {
    showLoading(true);
    showError(false);
    showNoResults(false);
    timelineContainer.style.display = 'none';
    
    try {
        const url = `/api/notes${force ? '?force=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Server error occurred');
        }
        
        state.notes = data.notes;
        state.lastFetched = data.last_fetched;
        state.source = data.source;
        
        // Update UI info
        updateHeaderStatus();
        
        // Update Category Counts based on all items
        updateCategoryCounts();
        
        // Render
        renderTimeline();
        
    } catch (error) {
        console.error('Fetch error:', error);
        errorMessage.textContent = error.message || 'Could not fetch release notes feed.';
        showError(true);
        showLoading(false);
    }
}

// UI STATE TOGGLES
function showLoading(isLoading) {
    if (isLoading) {
        loadingState.style.display = 'flex';
        refreshSpinner.classList.add('spinning');
        refreshBtn.classList.add('spinning');
        refreshBtn.disabled = true;
    } else {
        loadingState.style.display = 'none';
        refreshSpinner.classList.remove('spinning');
        refreshBtn.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

function showError(isError) {
    errorState.style.display = isError ? 'flex' : 'none';
}

function showNoResults(isNoResults) {
    noResultsState.style.display = isNoResults ? 'flex' : 'none';
}

function updateHeaderStatus() {
    // Format timestamp
    const d = new Date(state.lastFetched * 1000);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedText.textContent = `Last checked: Today at ${timeStr}`;
    
    // Update badge styling
    cacheBadge.className = 'badge';
    if (state.source === 'network') {
        cacheBadge.textContent = 'Live Feed';
        cacheBadge.classList.add('live');
    } else if (state.source === 'cache') {
        cacheBadge.textContent = 'Cached';
        cacheBadge.classList.add('cache');
    } else {
        cacheBadge.textContent = 'Fallback';
        cacheBadge.classList.add('error');
    }
}

// CATEGORY COUNTER CALCULATIONS
function updateCategoryCounts() {
    const counts = {
        all: 0,
        Feature: 0,
        Announcement: 0,
        Change: 0,
        Issue: 0,
        Breaking: 0
    };
    
    state.notes.forEach(entry => {
        entry.items.forEach(item => {
            counts.all++;
            const type = item.type;
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            }
        });
    });
    
    // Update counts in DOM
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-announcement').textContent = counts.Announcement;
    document.getElementById('count-change').textContent = counts.Change;
    document.getElementById('count-issue').textContent = counts.Issue;
    document.getElementById('count-breaking').textContent = counts.Breaking;
}

// FILTER & SEARCH HANDLERS
function handleSearch(e) {
    state.searchQuery = e.target.value.trim().toLowerCase();
    
    if (state.searchQuery) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    renderTimeline();
}

function clearSearch() {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderTimeline();
}

function handleCategoryFilter(e) {
    const clickedPill = e.target.closest('.pill');
    if (!clickedPill) return;
    
    // Toggle active styles
    document.querySelectorAll('.filter-pills .pill').forEach(pill => {
        pill.classList.remove('active');
    });
    clickedPill.classList.add('active');
    
    // Update state and render
    state.activeCategory = clickedPill.getAttribute('data-category');
    renderTimeline();
}

function resetAllFilters() {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-pills .pill').forEach(pill => {
        pill.classList.remove('active');
    });
    document.querySelector('.pill[data-category="all"]').classList.add('active');
    
    state.activeCategory = 'all';
    renderTimeline();
}

// TIMELINE RENDER LOGIC
function renderTimeline() {
    timelineContainer.innerHTML = '';
    let visibleEntriesCount = 0;
    let visibleItemsCount = 0;
    
    state.notes.forEach((entry, entryIndex) => {
        // Filter items within this entry
        const matchingItems = entry.items.filter(item => {
            // Category check
            if (state.activeCategory !== 'all' && item.type !== state.activeCategory) {
                return false;
            }
            // Search text check
            if (state.searchQuery) {
                const textMatches = item.text.toLowerCase().includes(state.searchQuery);
                const titleMatches = entry.title.toLowerCase().includes(state.searchQuery);
                const typeMatches = item.type.toLowerCase().includes(state.searchQuery);
                return textMatches || titleMatches || typeMatches;
            }
            return true;
        });
        
        if (matchingItems.length > 0) {
            visibleEntriesCount++;
            visibleItemsCount += matchingItems.length;
            
            // Create day container
            const dayDiv = document.createElement('div');
            dayDiv.className = 'timeline-day';
            
            // Add custom animation delays for sequential entrance
            dayDiv.style.animationDelay = `${visibleEntriesCount * 0.05}s`;
            
            // Node bullet
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'timeline-node';
            dayDiv.appendChild(nodeDiv);
            
            // Date Header
            const dateHeader = document.createElement('h3');
            dateHeader.className = 'timeline-date';
            dateHeader.textContent = entry.title;
            dayDiv.appendChild(dateHeader);
            
            // List of items
            const itemsListDiv = document.createElement('div');
            itemsListDiv.className = 'day-items-list';
            
            matchingItems.forEach((item, itemIndex) => {
                const cardDiv = document.createElement('article');
                cardDiv.className = 'release-card';
                
                // Card header
                const cardHeader = document.createElement('header');
                cardHeader.className = 'card-header';
                
                const badge = document.createElement('span');
                badge.className = `category-badge ${item.type.toLowerCase()}`;
                
                // Category SVG Icon
                badge.innerHTML = `
                    <span class="dot dot-${item.type.toLowerCase()}"></span>
                    <span>${item.type}</span>
                `;
                cardHeader.appendChild(badge);
                
                // Quick actions
                const quickActions = document.createElement('div');
                quickActions.className = 'card-actions-quick';
                
                // Copy short button
                const quickCopy = document.createElement('button');
                quickCopy.className = 'action-icon-btn';
                quickCopy.title = 'Copy plaintext';
                quickCopy.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
                quickCopy.addEventListener('click', () => copyToClipboard(item.text, "Copied update details!"));
                quickActions.appendChild(quickCopy);
                
                cardHeader.appendChild(quickActions);
                cardDiv.appendChild(cardHeader);
                
                // Card body
                const cardBody = document.createElement('section');
                cardBody.className = 'card-body';
                cardBody.innerHTML = item.html;
                cardDiv.appendChild(cardBody);
                
                // Card footer
                const cardFooter = document.createElement('footer');
                cardFooter.className = 'card-footer';
                
                // Link to official source
                const sourceLink = document.createElement('a');
                sourceLink.className = 'footer-source-link';
                sourceLink.href = entry.link;
                sourceLink.target = '_blank';
                sourceLink.innerHTML = `
                    <span>Source Doc</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="7" y1="17" x2="17" y2="7"></line>
                        <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                `;
                cardFooter.appendChild(sourceLink);
                
                // Action buttons
                const footerBtns = document.createElement('div');
                footerBtns.className = 'footer-buttons';
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn btn-card btn-copy-card';
                copyBtn.textContent = 'Copy Text';
                copyBtn.addEventListener('click', () => copyToClipboard(item.text, "Copied update details!"));
                
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'btn btn-card btn-tweet-card';
                tweetBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" class="btn-icon">
                        <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                    <span>Tweet</span>
                `;
                tweetBtn.addEventListener('click', () => openTweetModal(entry.title, item.type, item.text, entry.link));
                
                footerBtns.appendChild(copyBtn);
                footerBtns.appendChild(tweetBtn);
                cardFooter.appendChild(footerBtns);
                cardDiv.appendChild(cardFooter);
                
                itemsListDiv.appendChild(cardDiv);
            });
            
            dayDiv.appendChild(itemsListDiv);
            timelineContainer.appendChild(dayDiv);
        }
    });
    
    showLoading(false);
    
    if (visibleItemsCount === 0) {
        showNoResults(true);
        timelineContainer.style.display = 'none';
    } else {
        showNoResults(false);
        timelineContainer.style.display = 'block';
    }
}

// CLIPBOARD COPY
function copyToClipboard(text, message = "Copied!") {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message);
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        showToast("Failed to copy text");
    });
}

// TOAST NOTIFICATIONS
function showToast(message) {
    toastMsg.textContent = message;
    toast.style.display = 'block';
    
    // Clear dynamic animation timeout if exists
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// TWEET MODAL LOGIC
function openTweetModal(date, type, plainText, sourceLink) {
    activeTweetLink = sourceLink;
    
    // Construct default draft text: "BigQuery [Type] ([Date]): [Snippet]"
    let defaultTweet = `BigQuery ${type} (${date}): `;
    
    // Calculate remaining char space for text, leaving space for the link
    // Account for spaces and "..." if we truncate
    const linkLength = T.CO_LINK_LENGTH;
    const prefixLength = defaultTweet.length;
    const availableLength = TWITTER_CHAR_LIMIT - prefixLength - linkLength - 4; // -4 for " ... "
    
    if (plainText.length > availableLength) {
        defaultTweet += plainText.substring(0, availableLength).trim() + '...';
    } else {
        defaultTweet += plainText;
    }
    
    tweetTextarea.value = defaultTweet;
    tweetSourceLink.href = sourceLink;
    tweetSourceLink.textContent = sourceLink;
    
    // Show Modal
    tweetModal.classList.add('active');
    tweetTextarea.focus();
    updateCharCount();
}

function hideModal() {
    tweetModal.classList.remove('active');
}

function updateCharCount() {
    const textLength = tweetTextarea.value.length;
    const totalLength = textLength + T.CO_LINK_LENGTH + 1; // +1 for space between text and link
    const remaining = TWITTER_CHAR_LIMIT - totalLength;
    
    charCounter.textContent = remaining;
    
    // Visual indicators
    charCounter.className = 'char-counter';
    if (remaining < 20 && remaining >= 0) {
        charCounter.classList.add('warning');
    } else if (remaining < 0) {
        charCounter.classList.add('exceeded');
    }
    
    // Disable Tweet button if exceeded or empty
    if (remaining < 0 || textLength === 0) {
        modalTweetBtn.disabled = true;
    } else {
        modalTweetBtn.disabled = false;
    }
}

function executeTweet() {
    const text = tweetTextarea.value.trim();
    const url = activeTweetLink;
    
    // Build X/Twitter Web Intent URL
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    // Open in popup window
    window.open(intentUrl, '_blank', 'width=550,height=420,resizable=yes,scrollbars=yes');
    
    // Close modal
    hideModal();
    showToast("Opening X/Twitter shares...");
}

// FLOATING SELECTION TOOLTIP
function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 5) {
        // Confirm selection is within the release note text content
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === 1 ? container : container.parentElement;
        
        if (parentElement.closest('.card-body')) {
            const rect = range.getBoundingClientRect();
            
            // Positioning coordinates (above the selection middle)
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const tooltipX = rect.left + (rect.width / 2) - (floatingTooltip.offsetWidth / 2);
            const tooltipY = rect.top + scrollTop - floatingTooltip.offsetHeight - 10;
            
            floatingTooltip.style.left = `${Math.max(10, tooltipX)}px`;
            floatingTooltip.style.top = `${tooltipY}px`;
            floatingTooltip.style.display = 'block';
            return;
        }
    }
    
    // Hide tooltip if selection is empty or not in body
    floatingTooltip.style.display = 'none';
}

function handleFloatingTweetClick() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
        // Find the closest card source link to attach
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === 1 ? container : container.parentElement;
        const card = parentElement.closest('.release-card');
        
        let link = 'https://cloud.google.com/bigquery/docs/release-notes';
        let date = 'Recent';
        let type = 'Update';
        
        if (card) {
            const linkElem = card.querySelector('.footer-source-link');
            if (linkElem) link = linkElem.href;
            
            const badgeText = card.querySelector('.category-badge');
            if (badgeText) type = badgeText.textContent.trim();
            
            const dayParent = card.closest('.timeline-day');
            if (dayParent) {
                const dateHeader = dayParent.querySelector('.timeline-date');
                if (dateHeader) date = dateHeader.textContent.trim();
            }
        }
        
        // Hide popup and open composer
        floatingTooltip.style.display = 'none';
        
        // Open composer with selected text quote style
        openTweetModal(date, type, `"${selectedText}"`, link);
        
        // Clear text selection
        selection.removeAllRanges();
    }
}
