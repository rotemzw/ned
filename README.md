# Ned

A personal player for TED talks: endless home feed, search with thumbnails,
a Saved/Watched library with filters, a queue (Add to queue / Play next),
"More like this", speaker pages, and Listen mode for audio in the background.

- Talk list comes from TED's public catalog (`fetch-talks.py` → `data/talks.json`).
- Videos play through TED's official embed player; Listen mode streams TED's own media files.
- Saved talks, history and queue stay in your browser (localStorage).

Not affiliated with TED. Refresh the catalog with `python3 fetch-talks.py`.
