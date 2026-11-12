# Roadmap.sh Progress Tracker (Chrome Extension)

A lightweight, powerful Google Chrome Extension that automatically adds interactive tick marks / checkboxes beside every topic on **[roadmap.sh](https://roadmap.sh)**. 

Track your learning progress directly on the website for **SQL**, **Frontend**, **Backend**, **DevOps**, **Python**, **React**, or any other roadmap available on `roadmap.sh`!

---

## ✨ Features

- 🟢 **SVG Diagram Checkboxes**: Adds interactive tick mark checkboxes inside SVG node boxes across interactive roadmap diagrams.
- 📋 **HTML List & Topic Card Support**: Adds checkboxes next to text-based lists, topics, and sub-topics.
- 🗂️ **Topic Drawer Toggle**: Injects a "Mark as Done" toggle button inside topic detail popups & side drawers.
- 📊 **Floating Progress Control Widget**: Displays a clean, collapsible progress dashboard in the bottom-right corner showing:
  - Real-time percentage & completed ratio (e.g., `12 / 30 (40%) Completed`).
  - Progress bar.
  - Filter view toggles (**All**, **Done**, **Pending**).
  - Quick **Mark All** / **Unmark All** and **Reset** actions.
- 💾 **Persistent Storage**: Saves your progress locally per roadmap using Chrome Storage Sync API.
- 📤 **Export & Import Backup**: Export your progress across all roadmaps as a JSON file and restore it anytime.

---

## 🚀 How to Install in Chrome / Edge / Brave

1. Open **Google Chrome** (or any Chromium browser like Edge / Brave / Opera).
2. Go to `chrome://extensions` in your browser address bar.
3. Turn **ON** the **Developer mode** toggle in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the extension directory:
   ```
   X:\myproject\roadmap-sh-progress-tracker
   ```
6. The extension **Roadmap.sh Progress Tracker** is now loaded and ready!

---

## 🎮 How to Use

1. Navigate to any roadmap on **roadmap.sh** (e.g., [https://roadmap.sh/sql](https://roadmap.sh/sql)).
2. You will see small tick mark checkboxes beside every topic box!
3. Click any checkbox to mark a topic as **Completed** ✓.
   - Completed topics get highlighted with a green outline & green background tint.
   - The floating widget in the bottom-right corner will update your progress percentage automatically.
4. Click the extension icon in your Chrome toolbar anytime to view an overview of all your tracked roadmaps and export/import backups!

---

## 🛠️ File Structure

```
roadmap-sh-progress-tracker/
├── manifest.json       # Manifest V3 extension configuration
├── content.js          # Injected logic for SVG/DOM node detection & checkmarks
├── content.css         # Styling for checkboxes, node completion, & floating widget
├── popup.html          # Extension toolbar popup interface
├── popup.js            # Toolbar popup logic & export/import handler
├── README.md           # Documentation & setup guide
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
