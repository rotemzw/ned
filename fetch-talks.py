#!/usr/bin/env python3
"""Pull the TED talk catalog (metadata only) into data/talks.json.

Videos themselves are not downloaded (Listen mode streams TED's own media files): the app plays them through TED's
official embed player, so this only stores titles, speakers, length,
views, topics and thumbnail URLs. Re-run any time to refresh.
"""
import json, os, time, urllib.request

URL = "https://www.ted.com/graphql"
QUERY = """query($after: String) {
  videos(first: 100, after: $after) {
    totalCount
    pageInfo { endCursor hasNextPage }
    nodes {
      slug title duration viewedCount publishedAt description
      presenterDisplayName
      type { name }
      speakers { nodes { slug firstname lastname } }
      topics { nodes { name } }
      primaryImageSet { url aspectRatioName }
      audioDownload
      nativeDownloads { low }
    }
  }
}"""


def page(after):
    body = json.dumps({"query": QUERY, "variables": {"after": after}}).encode()
    req = urllib.request.Request(URL, body, {
        "content-type": "application/json", "user-agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.load(r)
    if "errors" in d:
        raise RuntimeError(d["errors"])
    return d["data"]["videos"]


def thumb(images):
    by = {i["aspectRatioName"]: i["url"] for i in images or []}
    url = by.get("16x9") or by.get("2x1") or by.get("4x3") or ""
    # pi.tedcdn.com resizes on the fly; small thumbs keep the app fast
    return url + ("?w=640" if url else "")


def main():
    talks, after = [], None
    while True:
        v = page(after)
        for n in v["nodes"]:
            if not n.get("duration"):
                continue
            desc = (n.get("description") or "").strip()
            talks.append({
                "id": n["slug"],
                "t": n["title"],
                "s": n.get("presenterDisplayName") or "",
                "sp": [[s["slug"], f'{s.get("firstname") or ""} {s.get("lastname") or ""}'.strip()]
                       for s in n["speakers"]["nodes"]],
                "d": n["duration"],
                "v": n.get("viewedCount") or 0,
                "p": (n.get("publishedAt") or "")[:10],
                "k": [t["name"] for t in n["topics"]["nodes"]],
                "ty": (n.get("type") or {}).get("name", ""),
                "img": thumb(n.get("primaryImageSet")),
                "desc": desc[:280],
                # audio for Listen mode: TED's own MP4 (no ads) first, else podcast MP3
                "a": ((n.get("nativeDownloads") or {}).get("low") or n.get("audioDownload") or ""),
            })
        print(f"{len(talks)}/{v['totalCount']}", flush=True)
        if not v["pageInfo"]["hasNextPage"]:
            break
        after = v["pageInfo"]["endCursor"]
        time.sleep(0.4)
    os.makedirs("data", exist_ok=True)
    with open("data/talks.json", "w") as f:
        json.dump(talks, f, ensure_ascii=False, separators=(",", ":"))
    print("saved data/talks.json")


if __name__ == "__main__":
    main()
