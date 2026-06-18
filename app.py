from flask import Flask, render_template, jsonify, request
import feedparser
from bs4 import BeautifulSoup
import time
import requests

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Cache structure
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 600  # 10 minutes in seconds

def parse_release_notes():
    """Fetches and parses the BigQuery release notes Atom feed."""
    # Using requests to fetch first to ensure we can specify a timeout
    response = requests.get(FEED_URL, timeout=15)
    response.raise_for_status()
    
    feed = feedparser.parse(response.content)
    parsed_entries = []
    
    for entry in feed.entries:
        entry_title = getattr(entry, 'title', 'Unknown Date')
        entry_link = getattr(entry, 'link', 'https://cloud.google.com/bigquery/docs/release-notes')
        entry_updated = getattr(entry, 'updated', '')
        
        html_content = entry.content[0].value if hasattr(entry, 'content') else ""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        items = []
        current_type = "General"
        current_content = []
        
        def push_item(item_type, content_nodes):
            if not content_nodes:
                return
            
            # Combine BeautifulSoup elements
            item_html = "".join(str(node) for node in content_nodes)
            
            # Extract plain text for tweeting
            item_soup = BeautifulSoup(item_html, 'html.parser')
            item_text = item_soup.get_text(separator=" ").strip()
            item_text = " ".join(item_text.split())
            
            items.append({
                "type": item_type,
                "html": item_html,
                "text": item_text
            })

        for child in soup.contents:
            if child.name == 'h3':
                push_item(current_type, current_content)
                current_type = child.get_text().strip()
                current_content = []
            else:
                if child.name or str(child).strip():
                    current_content.append(child)
                    
        push_item(current_type, current_content)
        
        parsed_entries.append({
            "title": entry_title,
            "link": entry_link,
            "updated": entry_updated,
            "items": items
        })
        
    return parsed_entries

@app.route('/')
def index():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/notes')
def get_release_notes():
    """API endpoint to get release notes. Supports ?force=true to bypass cache."""
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    now = time.time()
    
    # Check cache validity
    if cache["data"] is not None and not force_refresh and (now - cache["last_fetched"] < CACHE_DURATION):
        return jsonify({
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "notes": cache["data"]
        })
        
    try:
        # Fetch fresh data
        notes = parse_release_notes()
        cache["data"] = notes
        cache["last_fetched"] = now
        
        return jsonify({
            "source": "network",
            "last_fetched": now,
            "notes": notes
        })
    except Exception as e:
        # If fetch fails but cache exists, fall back to cache (even if expired)
        if cache["data"] is not None:
            return jsonify({
                "source": "cache_fallback",
                "warning": f"Network fetch failed ({str(e)}). Displaying cached data.",
                "last_fetched": cache["last_fetched"],
                "notes": cache["data"]
            })
        else:
            return jsonify({
                "error": "Failed to fetch release notes and no cached data is available.",
                "details": str(e)
            }), 500

if __name__ == '__main__':
    # Running locally on port 5000
    app.run(debug=False, port=5000)
