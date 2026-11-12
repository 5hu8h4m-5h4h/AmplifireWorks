/**
 * Roadmap.sh Progress Tracker - Content Script
 * 
 * Automatically detects roadmap topics in SVG diagrams, HTML lists,
 * and popup drawers, injecting interactive checkmarks and a progress widget.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__roadmapTrackerInjected) return;
  window.__roadmapTrackerInjected = true;

  // State cache
  let currentRoadmapSlug = '';
  let progressState = {}; // { [topicKey]: true/false }
  let activeFilter = 'all'; // 'all', 'completed', 'pending'
  let isBarMinimized = false;

  // --- Storage Helper Functions ---

  function getRoadmapSlug() {
    let path = window.location.pathname.replace(/\/+$/, '');
    return path || '/home';
  }

  function getStorageKey(slug) {
    return `roadmap_progress_${slug}`;
  }

  async function loadProgressState() {
    currentRoadmapSlug = getRoadmapSlug();
    const storageKey = getStorageKey(currentRoadmapSlug);

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([storageKey], (result) => {
          progressState = result[storageKey] || {};
          resolve(progressState);
        });
      } else {
        try {
          const raw = localStorage.getItem(storageKey);
          progressState = raw ? JSON.parse(raw) : {};
        } catch (e) {
          progressState = {};
        }
        resolve(progressState);
      }
    });
  }

  async function saveProgressState() {
    const storageKey = getStorageKey(currentRoadmapSlug);
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [storageKey]: progressState }, () => {
          resolve();
        });
      } else {
        try {
          localStorage.setItem(storageKey, JSON.stringify(progressState));
        } catch (e) {}
        resolve();
      }
    });
  }

  function normalizeTopicKey(text) {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function isTopicCompleted(topicKey) {
    return !!progressState[topicKey];
  }

  async function toggleTopicCompletion(topicKey) {
    if (!topicKey) return;
    if (progressState[topicKey]) {
      delete progressState[topicKey];
    } else {
      progressState[topicKey] = true;
    }
    await saveProgressState();
    refreshAllUI();
  }

  async function setAllTopicsState(completed) {
    const allKeys = getAllDiscoveredTopicKeys();
    allKeys.forEach((key) => {
      if (completed) {
        progressState[key] = true;
      } else {
        delete progressState[key];
      }
    });
    await saveProgressState();
    refreshAllUI();
  }

  async function resetProgress() {
    if (confirm('Are you sure you want to reset all progress for this roadmap?')) {
      progressState = {};
      await saveProgressState();
      refreshAllUI();
    }
  }

  // --- SVG Node Detection & Checkbox Injection ---

  function findSVGNodes() {
    const svgs = document.querySelectorAll('svg');
    const nodes = [];

    svgs.forEach((svg) => {
      // Find all g elements
      const gElements = svg.querySelectorAll('g');
      gElements.forEach((g) => {
        // Skip injected elements or parent containers that wrap already processed groups
        if (g.classList.contains('roadmap-tick-svg-group')) return;
        
        // Find direct or descendant text node
        const textEls = Array.from(g.querySelectorAll('text'));
        if (textEls.length === 0) return;

        // Extract full text content
        let textContent = textEls.map((t) => t.textContent.trim()).join(' ').trim();

        // Filter out non-topic labels (like arrows, legend notes, tiny numbers)
        if (!textContent || textContent.length < 2 || /^\d+$/.test(textContent)) return;

        // Check if this g has a bounding rect/shape (box container)
        const rect = g.querySelector('rect, path, polygon');
        if (!rect) return;

        // Avoid adding duplicate checkboxes to parent groups if child already has one
        const key = normalizeTopicKey(textContent);
        if (!key) return;

        nodes.push({ group: g, rect, textEl: textEls[0], text: textContent, key });
      });
    });

    // Deduplicate nodes by key to avoid nesting duplicates
    const uniqueMap = new Map();
    nodes.forEach((n) => {
      if (!uniqueMap.has(n.key)) {
        uniqueMap.set(n.key, n);
      }
    });

    return Array.from(uniqueMap.values());
  }

  function injectSVGCheckboxes() {
    const nodes = findSVGNodes();

    nodes.forEach(({ group, rect, textEl, text, key }) => {
      const isCompleted = isTopicCompleted(key);

      // Check if checkbox is already injected into this group
      let tickGroup = group.querySelector('.roadmap-tick-svg-group');

      if (!tickGroup) {
        // Calculate box position
        let x = 0, y = 0, h = 24, w = 100;

        if (rect && rect.getBBox) {
          try {
            const bbox = rect.getBBox();
            x = bbox.x;
            y = bbox.y;
            h = bbox.height;
            w = bbox.width;
          } catch (e) {}
        } else if (textEl && textEl.getBBox) {
          try {
            const bbox = textEl.getBBox();
            x = bbox.x - 20;
            y = bbox.y - 12;
            h = bbox.height + 10;
          } catch (e) {}
        }

        // Checkbox dimensions
        const cbSize = 16;
        const cbX = x + 8;
        const cbY = y + Math.max(4, (h - cbSize) / 2);

        // Create SVG group
        tickGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tickGroup.setAttribute('class', 'roadmap-tick-svg-group');
        tickGroup.setAttribute('data-topic-key', key);

        // Checkbox Box Rect
        const cbRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        cbRect.setAttribute('x', cbX);
        cbRect.setAttribute('y', cbY);
        cbRect.setAttribute('width', cbSize);
        cbRect.setAttribute('height', cbSize);
        cbRect.setAttribute('rx', '4');
        cbRect.setAttribute('class', 'roadmap-svg-cb-rect');

        // Checkmark Icon Path
        const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        checkPath.setAttribute(
          'd',
          `M${cbX + 4} ${cbY + 8.2} L${cbX + 6.8} ${cbY + 11.2} L${cbX + 12} ${cbY + 5}`
        );
        checkPath.setAttribute('fill', 'none');
        checkPath.setAttribute('stroke', '#ffffff');
        checkPath.setAttribute('stroke-width', '2.2');
        checkPath.setAttribute('stroke-linecap', 'round');
        checkPath.setAttribute('stroke-linejoin', 'round');
        checkPath.setAttribute('class', 'roadmap-svg-check-path');

        tickGroup.appendChild(cbRect);
        tickGroup.appendChild(checkPath);

        // Intercept click event
        tickGroup.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleTopicCompletion(key);
        });

        group.appendChild(tickGroup);
      }

      // Update state styling
      updateSVGNodeState(group, tickGroup, isCompleted);
    });
  }

  function updateSVGNodeState(group, tickGroup, isCompleted) {
    if (isCompleted) {
      group.classList.add('roadmap-node-completed');
    } else {
      group.classList.remove('roadmap-node-completed');
    }

    if (tickGroup) {
      const cbRect = tickGroup.querySelector('.roadmap-svg-cb-rect');
      const checkPath = tickGroup.querySelector('.roadmap-svg-check-path');

      if (cbRect && checkPath) {
        if (isCompleted) {
          cbRect.setAttribute('fill', '#22c55e');
          cbRect.setAttribute('stroke', '#16a34a');
          cbRect.setAttribute('stroke-width', '1.5');
          checkPath.style.opacity = '1';
        } else {
          cbRect.setAttribute('fill', '#ffffff');
          cbRect.setAttribute('stroke', '#94a3b8');
          cbRect.setAttribute('stroke-width', '1.5');
          checkPath.style.opacity = '0';
        }
      }
    }
  }

  // --- HTML List & Modal Popup Injection ---

  function injectHTMLCheckboxes() {
    // Inject checkboxes for list items or topic cards outside SVG
    const selectors = [
      '[data-topic]',
      '.topic-card',
      'main li',
      '.roadmap-group li'
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.querySelector('.roadmap-tick-html-wrap')) return;

        const text = el.textContent.trim();
        if (!text || text.length < 2) return;
        const key = normalizeTopicKey(text);
        if (!key) return;

        const isCompleted = isTopicCompleted(key);

        const wrap = document.createElement('span');
        wrap.className = 'roadmap-tick-html-wrap';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'roadmap-tick-html-cb';
        cb.checked = isCompleted;

        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          toggleTopicCompletion(key);
        });

        wrap.appendChild(cb);
        el.insertBefore(wrap, el.firstChild);

        if (isCompleted) {
          el.classList.add('roadmap-html-completed');
        } else {
          el.classList.remove('roadmap-html-completed');
        }
      });
    });
  }

  function observeModalPopups() {
    // Target side drawer or dialog popups when clicking a node
    const modals = document.querySelectorAll(
      '[role="dialog"], [data-slot="dialog-content"], .topic-details, aside'
    );

    modals.forEach((modal) => {
      const heading = modal.querySelector('h1, h2, h3, [class*="title"]');
      if (!heading) return;

      const text = heading.textContent.trim();
      const key = normalizeTopicKey(text);
      if (!key) return;

      let btn = modal.querySelector('.roadmap-modal-completed-btn');
      const isCompleted = isTopicCompleted(key);

      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'roadmap-modal-completed-btn';

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleTopicCompletion(key);
        });

        heading.parentElement.appendChild(btn);
      }

      if (isCompleted) {
        btn.className = 'roadmap-modal-completed-btn is-completed';
        btn.innerHTML = '✓ Completed';
      } else {
        btn.className = 'roadmap-modal-completed-btn';
        btn.innerHTML = '○ Mark as Done';
      }
    });
  }

  // --- Discovered Topics Collection ---

  function getAllDiscoveredTopicKeys() {
    const keys = new Set();

    // From SVG
    const svgNodes = findSVGNodes();
    svgNodes.forEach((n) => keys.add(n.key));

    // From HTML lists
    document.querySelectorAll('.roadmap-tick-html-wrap').forEach((el) => {
      const parent = el.parentElement;
      if (parent) {
        const text = parent.textContent.trim();
        const key = normalizeTopicKey(text);
        if (key) keys.add(key);
      }
    });

    // Add any existing keys in storage for this roadmap
    Object.keys(progressState).forEach((k) => keys.add(k));

    return Array.from(keys);
  }

  // --- Floating Progress Widget ---

  function createProgressWidget() {
    if (document.getElementById('roadmap-tracker-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'roadmap-tracker-bar';

    bar.innerHTML = `
      <div class="rtb-header" id="rtb-header-toggle">
        <div class="rtb-title-group">
          <div class="rtb-badge-icon">✓</div>
          <span>Roadmap Progress</span>
        </div>
        <div class="rtb-controls">
          <button class="rtb-btn-icon" id="rtb-min-btn" title="Minimize / Expand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      <div class="rtb-body">
        <div class="rtb-stats-row">
          <span id="rtb-count-text">0 / 0 Completed</span>
          <span id="rtb-percent-text" class="rtb-percent">0%</span>
        </div>
        <div class="rtb-progress-track">
          <div id="rtb-progress-fill" class="rtb-progress-fill"></div>
        </div>
        <div class="rtb-filters">
          <button class="rtb-filter-btn active" data-filter="all">All</button>
          <button class="rtb-filter-btn" data-filter="completed">Done</button>
          <button class="rtb-filter-btn" data-filter="pending">Pending</button>
        </div>
        <div class="rtb-actions-row">
          <button class="rtb-action-btn" id="rtb-mark-all">Mark All</button>
          <button class="rtb-action-btn danger" id="rtb-reset">Reset</button>
        </div>
      </div>
    `;

    document.body.appendChild(bar);

    // Event listeners
    const header = document.getElementById('rtb-header-toggle');
    header.addEventListener('click', (e) => {
      if (e.target.closest('#rtb-min-btn') || e.target === header || header.contains(e.target)) {
        isBarMinimized = !isBarMinimized;
        bar.classList.toggle('minimized', isBarMinimized);
      }
    });

    // Filters
    const filterBtns = bar.querySelectorAll('.rtb-filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');
        applyFilter();
      });
    });

    // Mark All / Reset
    document.getElementById('rtb-mark-all').addEventListener('click', () => {
      const allKeys = getAllDiscoveredTopicKeys();
      const completedCount = allKeys.filter((k) => progressState[k]).length;
      setAllTopicsState(completedCount < allKeys.length);
    });

    document.getElementById('rtb-reset').addEventListener('click', () => {
      resetProgress();
    });

    updateWidgetStats();
  }

  function updateWidgetStats() {
    const bar = document.getElementById('roadmap-tracker-bar');
    if (!bar) return;

    const allKeys = getAllDiscoveredTopicKeys();
    const total = allKeys.length;
    const completed = allKeys.filter((k) => progressState[k]).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const countText = bar.querySelector('#rtb-count-text');
    const percentText = bar.querySelector('#rtb-percent-text');
    const fill = bar.querySelector('#rtb-progress-fill');
    const markAllBtn = bar.querySelector('#rtb-mark-all');

    if (countText) countText.textContent = `${completed} / ${total} Completed`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (fill) fill.style.width = `${percent}%`;
    if (markAllBtn) {
      markAllBtn.textContent = completed === total && total > 0 ? 'Unmark All' : 'Mark All';
    }
  }

  function applyFilter() {
    document.body.classList.remove('rtb-filter-pending', 'rtb-filter-completed');
    if (activeFilter === 'pending') {
      document.body.classList.add('rtb-filter-pending');
    } else if (activeFilter === 'completed') {
      document.body.classList.add('rtb-filter-completed');
    }
  }

  // --- Main Refresh Loop ---

  function refreshAllUI() {
    injectSVGCheckboxes();
    injectHTMLCheckboxes();
    observeModalPopups();
    updateWidgetStats();
    applyFilter();
  }

  async function init() {
    await loadProgressState();
    createProgressWidget();
    refreshAllUI();

    // Re-run scan on DOM changes (for SPA navigation and dynamic roadmap loading)
    const observer = new MutationObserver(() => {
      refreshAllUI();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Periodic safety scan (every 1.5s)
    setInterval(() => {
      const slug = getRoadmapSlug();
      if (slug !== currentRoadmapSlug) {
        currentRoadmapSlug = slug;
        loadProgressState().then(() => refreshAllUI());
      } else {
        refreshAllUI();
      }
    }, 1500);
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
