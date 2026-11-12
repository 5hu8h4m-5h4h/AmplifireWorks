/**
 * Roadmap.sh Progress Tracker - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const currentNameEl = document.getElementById('current-name');
  const currentCountEl = document.getElementById('current-count');
  const currentPercentEl = document.getElementById('current-percent');
  const currentFillEl = document.getElementById('current-fill');
  const allListEl = document.getElementById('all-roadmaps-list');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');

  // Get active tab URL
  const tabs = await new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    } else {
      resolve([]);
    }
  });

  let currentSlug = '/home';
  if (tabs && tabs[0] && tabs[0].url) {
    try {
      const url = new URL(tabs[0].url);
      if (url.hostname.includes('roadmap.sh')) {
        currentSlug = url.pathname.replace(/\/+$/, '') || '/home';
      }
    } catch (e) {}
  }

  // Load storage
  function getAllData() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(null, resolve);
      } else {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('roadmap_progress_')) {
            try {
              data[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {}
          }
        }
        resolve(data);
      }
    });
  }

  const allData = await getAllData();

  // Populate current roadmap
  const currentKey = `roadmap_progress_${currentSlug}`;
  const currentProgress = allData[currentKey] || {};
  const currentCompleted = Object.keys(currentProgress).length;

  const displaySlugName = currentSlug.replace('/', '').replace(/-/g, ' ') || 'Home';
  currentNameEl.textContent = displaySlugName.toUpperCase() + ' Roadmap';
  currentCountEl.textContent = `${currentCompleted} Topics Marked Done`;

  // Render list of all roadmaps
  const roadmapKeys = Object.keys(allData).filter((k) => k.startsWith('roadmap_progress_'));
  
  if (roadmapKeys.length === 0) {
    allListEl.innerHTML = '<div class="empty-text">No roadmaps tracked yet</div>';
  } else {
    allListEl.innerHTML = '';
    roadmapKeys.forEach((key) => {
      const slug = key.replace('roadmap_progress_', '');
      const prog = allData[key] || {};
      const count = Object.keys(prog).length;

      const item = document.createElement('div');
      item.className = 'roadmap-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'roadmap-name';
      nameSpan.textContent = slug.replace('/', '').replace(/-/g, ' ');

      const countSpan = document.createElement('span');
      countSpan.className = 'roadmap-count';
      countSpan.textContent = `${count} done`;

      item.appendChild(nameSpan);
      item.appendChild(countSpan);
      allListEl.appendChild(item);
    });
  }

  // Export JSON
  exportBtn.addEventListener('click', async () => {
    const data = await getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roadmap_sh_progress_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(imported, () => {
            alert('Progress imported successfully! Please reload the roadmap page.');
            window.location.reload();
          });
        } else {
          Object.keys(imported).forEach((k) => {
            localStorage.setItem(k, JSON.stringify(imported[k]));
          });
          alert('Progress imported successfully!');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to import JSON: Invalid format');
      }
    };
    reader.readAsText(file);
  });
});
