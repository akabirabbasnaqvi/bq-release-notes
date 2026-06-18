# BigQuery Release Pulse

A beautiful, modern web application built with a **Python Flask** backend and a **Vanilla HTML5, CSS3, and JavaScript** frontend. It fetches, parses, indexes, and visualizes the Google Cloud BigQuery release notes XML feed in real-time. Additionally, it provides an interactive composer to share specific updates to X (formerly Twitter).

---

## 🌟 Key Features

* **Sub-Entry RSS Parser**: Google Cloud groups daily release updates into a single feed item. This application uses `BeautifulSoup` to split daily logs into individual updates grouped by category (`Feature`, `Announcement`, `Change`, `Issue`, `Breaking`).
* **Double-Layer Caching**: Combines a 10-minute memory cache to prevent rate-limiting with offline fallbacks. The UI has a manual **Refresh** button (with spinner feedback) that bypasses the cache to fetch fresh updates directly.
* **Modern Dark Glassmorphism UI**: Uses glowing cosmic gradients, neon badges, responsive layout queries, custom scrollbars, and Outfit & Inter typography.
* **Live Search & Filter Pills**: Real-time client-side searching and pill-based categories showing live item counts.
* **Smart Tweet Composer**: Opens a custom editor mapping title, category, snippet, and link. Includes character length protection counting URL shortening sizes (max 280 characters).
* **Interactive Text Selection Sharing**: Highlight any sentence inside a release card to see a floating **Tweet Selection** popup. Clicking it pre-fills the composer with your quoted highlight.

---

## 📁 Project Structure

```text
bq-release-notes/
├── templates/
│   └── index.html      # Responsive semantic layout, modals, and inline SVG assets
├── static/
│   ├── css/
│   │   └── style.css   # Dark cosmic style sheets, timeline grid, overlays, animations
│   └── js/
│   │   └── app.js      # Client state manager, filtering logic, and event trackers
├── app.py              # Flask server, Atom feed processor, and caching layer
├── .gitignore          # Version control file exclusions
└── README.md           # Documentation guide
```

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Python 3.8+** and `pip` installed.

### 2. Setup & Virtual Environment
Clone this project or navigate to the workspace directory, then create a virtual environment:

```bash
# Create a virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate

# Activate it (macOS/Linux)
source .venv/bin/activate
```

### 3. Install Dependencies
Install the required packages:

```bash
pip install flask requests feedparser beautifulsoup4
```

### 4. Run the Server
Run the Flask server:

```bash
python app.py
```

The application will launch in debug mode on **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 💡 How to Use

1. **Explore Updates**: View updates sorted chronologically in a smooth vertical timeline.
2. **Filter & Search**: Type keywords into the search input or click a category pill (e.g., **Features** or **Breaking**) to drill down.
3. **Share to X/Twitter**:
   * Click the **Tweet** button on any card to draft a summary post referencing the official GCP documentation link.
   * Highlight a phrase or text portion inside a card to trigger the **Tweet Selection** popover, letting you share custom quotes instantly.
4. **Refresh Feed**: Click the **Refresh** button next to the filters to fetch live notes, which spins an SVG loader during network requests.
