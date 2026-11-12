// GeeksforGeeks Focus Mode & Ad Cover Content Script

(function () {
    'use strict';

    let isEnabled = true; // Default enabled
    let observer = null;

    // Direct selectors for GFG ads, promotional sidebars, upcoming courses, job widgets, etc.
    const AD_SELECTORS = [
        'ins.adsbygoogle',
        'div[id^="google_ads"]',
        'iframe[id^="google_ads"]',
        'iframe[src*="doubleclick.net"]',
        'iframe[src*="googlesyndication.com"]',
        '.ad-content',
        '.ad-wrapper',
        '.ad-container',
        '[class*="ad-section"]',
        '[class*="ad_container"]',
        '[class*="adWrapper"]',
        '[class*="sponsored"]',
        '.rightBar',
        '.rightSideBar',
        'aside.right-sidebar',
        '[class*="rightBar"]',
        '[class*="rightSidebar"]',
        '[class*="right_sidebar"]',
        '[class*="right-sidebar"]',
        '[class*="UpcomingCourses"]',
        '[class*="upcoming-courses"]',
        '[class*="JobPostings"]',
        '[class*="job-widget"]',
        '[class*="job_widget"]',
        '[class*="gfg-burger-menu-promo"]',
        '[class*="courses-wrapper"]',
        '[class*="premium-courses"]',
        '[class*="course_card"]',
        '[class*="explore_course"]',
        '.gfg_promotional_banner',
        '.gfg-sidebar-promo',
        '#Placement360',
        '[class*="floating-ad"]',
        '[class*="bottom-ad"]',
        '[class*="header-ad"]',
        '[class*="topBanner"]',
        '[class*="TopBanner"]',
        '[class*="headerPromo"]',
        '[data-ad-client]',
        '[data-ad-slot]'
    ];

    // Helper to check text content for "Upcoming Courses", "Fresher Jobs", "Experienced Jobs" sidebar cards
    function hideTextBasedSidePromos() {
        if (!isEnabled) return;

        // Find right sidebars or widgets containing promo keywords
        const sidebarElements = document.querySelectorAll('aside, div[class*="right"], div[class*="side"], div[class*="widget"]');
        sidebarElements.forEach(el => {
            const text = el.innerText || '';
            // If element contains "Upcoming Courses" or "Fresher Jobs" or "Experienced Jobs" or "On Sale" promos
            if (
                (text.includes('Upcoming Courses') || text.includes('Fresher Jobs') || text.includes('Experienced Jobs') || text.includes('Cybersecurity intern')) &&
                !el.querySelector('article') // Make sure it's not the main article
            ) {
                el.classList.add('gfg-ad-hidden');
            }
        });
    }

    // Function to apply hiding class to matching ad nodes
    function removeAdElements() {
        if (!isEnabled) return;

        AD_SELECTORS.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && !el.classList.contains('gfg-ad-hidden')) {
                        el.classList.add('gfg-ad-hidden');
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });

        hideTextBasedSidePromos();
    }

    // Toggle Focus Mode State
    function setFocusMode(enable) {
        isEnabled = enable;
        if (enable) {
            document.documentElement.classList.add('gfg-focus-active');
            removeAdElements();
            startObserver();
        } else {
            document.documentElement.classList.remove('gfg-focus-active');
            stopObserver();
            // Remove hidden classes
            document.querySelectorAll('.gfg-ad-hidden').forEach(el => {
                el.classList.remove('gfg-ad-hidden');
            });
        }
    }

    // MutationObserver to catch dynamically injected ads / SPA page transitions
    function startObserver() {
        if (observer) return;
        observer = new MutationObserver((mutations) => {
            if (!isEnabled) return;
            let shouldClean = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldClean = true;
                    break;
                }
            }
            if (shouldClean) {
                removeAdElements();
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body && isEnabled) {
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            });
        }
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // Initialize state from chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['gfgFocusEnabled'], (result) => {
            const enabled = result.gfgFocusEnabled !== undefined ? result.gfgFocusEnabled : true;
            setFocusMode(enabled);
        });
    } else {
        setFocusMode(true);
    }

    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'TOGGLE_FOCUS_MODE') {
                setFocusMode(request.enabled);
                sendResponse({ status: 'success', enabled: request.enabled });
            }
        });
    }

    // Initial DOM cleaning runs when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isEnabled) {
                setFocusMode(true);
            }
        });
    } else {
        if (isEnabled) {
            setFocusMode(true);
        }
    }

})();
