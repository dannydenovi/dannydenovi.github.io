#!/usr/bin/env python3
"""
Sync publications from the Semantic Scholar REST API and update content.yaml.

Setup (one-time):
  1. Go to https://www.semanticscholar.org and search your name.
  2. Open your profile and copy the numeric ID from the URL:
       https://www.semanticscholar.org/author/<NAME>/<ID>
  3. Paste that ID into content.yaml under meta.semantic_scholar_id.

No API key is required.  Rate limit: ~1 req/sec for anonymous access.
"""
import sys
import time
import requests
import ruamel.yaml

BASE = "https://api.semanticscholar.org/graph/v1"
PAPER_FIELDS = "title,authors,year,venue,externalIds,citationStyles,openAccessPdf,publicationVenue"


def find_author_id(name: str) -> str:
    """Search Semantic Scholar for the author and return the best-match ID."""
    r = requests.get(f"{BASE}/author/search", params={
        "query": name, "fields": "authorId,name,affiliations,paperCount", "limit": 5
    }, timeout=15)
    r.raise_for_status()
    candidates = r.json().get("data", [])
    if not candidates:
        raise RuntimeError(f"No Semantic Scholar author found for '{name}'")
    # prefer the candidate with the most papers
    best = max(candidates, key=lambda a: a.get("paperCount", 0))
    print(f"  Using author: {best['name']} (ID {best['authorId']}, {best.get('paperCount',0)} papers)")
    print(f"  ⚠  If this is wrong, set meta.semantic_scholar_id in content.yaml manually.")
    return best["authorId"]


def fetch_papers(author_id: str) -> list:
    papers, offset = [], 0
    while True:
        r = requests.get(f"{BASE}/author/{author_id}/papers", params={
            "fields": PAPER_FIELDS, "limit": 100, "offset": offset
        }, timeout=15)
        r.raise_for_status()
        data = r.json()
        batch = data.get("data", [])
        papers.extend(batch)
        if len(batch) < 100:
            break
        offset += 100
        time.sleep(1)
    return papers


def paper_url(paper: dict) -> str:
    ext = paper.get("externalIds") or {}
    doi = ext.get("DOI", "")
    if doi:
        return f"https://doi.org/{doi}"
    pdf = paper.get("openAccessPdf") or {}
    return pdf.get("url", "")


def paper_bibtex(paper: dict) -> str:
    cs = paper.get("citationStyles") or {}
    return (cs.get("bibtex") or "").strip()


def paper_venue(paper: dict) -> str:
    pv = paper.get("publicationVenue") or {}
    venue = pv.get("name", "") or paper.get("venue", "") or ""
    year = str(paper.get("year", ""))
    if year and year not in venue:
        venue = f"{venue} {year}".strip()
    return venue


def fetch_publications(meta: dict) -> list:
    author_id = (meta.get("semantic_scholar_id") or "").strip()
    if not author_id:
        print("meta.semantic_scholar_id not set — searching by author name …")
        author_id = find_author_id(meta.get("name", ""))

    print(f"Fetching papers for author {author_id} …")
    raw = fetch_papers(author_id)
    print(f"  Found {len(raw)} papers on Semantic Scholar")

    results = []
    for p in raw:
        title = (p.get("title") or "").strip()
        if not title:
            continue
        authors = ", ".join(a["name"] for a in (p.get("authors") or []))
        results.append({
            "title":   title,
            "authors": authors,
            "venue":   paper_venue(p),
            "year":    str(p.get("year") or ""),
            "url":     paper_url(p),
            "bibtex":  paper_bibtex(p),
        })

    results.sort(key=lambda x: x["year"], reverse=True)
    return results


def update_yaml(pubs: list) -> int:
    yaml = ruamel.yaml.YAML()
    yaml.preserve_quotes = True
    yaml.width = 200

    with open("content.yaml") as f:
        data = yaml.load(f)

    # preserve hand-curated tags keyed by normalised title
    existing = {p["title"].strip().lower(): p for p in data.get("publications", [])}

    formatted = []
    for i, p in enumerate(pubs, 1):
        prev = existing.get(p["title"].strip().lower(), {})
        formatted.append({
            "number":  f"{i:02d}",
            "title":   p["title"],
            "authors": p["authors"],
            "venue":   p["venue"],
            "tags":    prev.get("tags", []),
            "url":     p["url"] or prev.get("url", ""),
            "bibtex":  p["bibtex"] or prev.get("bibtex", ""),
        })

    data["publications"] = formatted
    with open("content.yaml", "w") as f:
        yaml.dump(data, f)
    return len(formatted)


if __name__ == "__main__":
    try:
        yaml = ruamel.yaml.YAML()
        with open("content.yaml") as f:
            cfg = yaml.load(f)
        meta = cfg.get("meta", {})

        pubs = fetch_publications(meta)
        n = update_yaml(pubs)
        print(f"\n✓ Synced {n} publications into content.yaml")
    except Exception as e:
        print(f"\n✗ Sync failed: {e}", file=sys.stderr)
        sys.exit(1)
