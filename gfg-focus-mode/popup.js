document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggle-switch');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');

    function updateUI(isEnabled) {
        toggleSwitch.checked = isEnabled;
        if (isEnabled) {
            statusBadge.classList.add('active');
            statusText.textContent = 'Active';
        } else {
            statusBadge.classList.remove('active');
            statusText.textContent = 'Disabled';
        }
    }

    // Load initial state
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['gfgFocusEnabled'], (result) => {
            const isEnabled = result.gfgFocusEnabled !== undefined ? result.gfgFocusEnabled : true;
            updateUI(isEnabled);
        });
    }

    // Handle toggle change
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;
        updateUI(isEnabled);

        // Save to chrome storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ gfgFocusEnabled: isEnabled });
        }

        // Notify active tabs
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ url: '*://*.geeksforgeeks.org/*' }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'TOGGLE_FOCUS_MODE',
                        enabled: isEnabled
                    }).catch(() => {
                        // Tab might not have script injected yet
                    });
                });
            });
        }
    });
});
