#!/usr/bin/env python3
"""Fetch publications from Google Scholar and update the publications section of content.yaml."""
import sys
import time
import ruamel.yaml
from scholarly import scholarly

SCHOLAR_ID = "nkKuHI0AAAAJ"


def fetch_publications():
    print(f"Fetching author profile {SCHOLAR_ID} …")
    author = scholarly.search_author_id(SCHOLAR_ID)
    author = scholarly.fill(author, sections=["publications"])

    results = []
    total = len(author["publications"])
    for idx, pub in enumerate(author["publications"], 1):
        print(f"  [{idx}/{total}] {pub['bib'].get('title', '?')[:60]}")
        try:
            time.sleep(1.5)
            pub = scholarly.fill(pub)
        except Exception as e:
            print(f"    warning: could not fill pub details — {e}", file=sys.stderr)

        bib = pub["bib"]
        title = bib.get("title", "").strip()
        if not title:
            continue

        authors = bib.get("author", "")
        venue = bib.get("venue", "") or bib.get("journal", "") or bib.get("booktitle", "") or ""
        year = str(bib.get("pub_year", ""))

        if year and year not in venue:
            venue = f"{venue} {year}".strip()

        results.append({
            "title": title,
            "authors": authors,
            "venue": venue,
            "year": year,
        })

    # newest first
    results.sort(key=lambda p: p.get("year", "0"), reverse=True)
    return results


def update_yaml(pubs):
    yaml = ruamel.yaml.YAML()
    yaml.preserve_quotes = True
    yaml.width = 200

    with open("content.yaml") as f:
        data = yaml.load(f)

    # preserve existing tags keyed by normalised title
    existing_tags = {
        p["title"].strip().lower(): p.get("tags", [])
        for p in data.get("publications", [])
    }

    formatted = []
    for i, p in enumerate(pubs, 1):
        tags = existing_tags.get(p["title"].strip().lower(), [])
        formatted.append({
            "number": f"{i:02d}",
            "title": p["title"],
            "authors": p["authors"],
            "venue": p["venue"],
            "tags": tags,
        })

    data["publications"] = formatted

    with open("content.yaml", "w") as f:
        yaml.dump(data, f)

    return len(formatted)


if __name__ == "__main__":
    try:
        pubs = fetch_publications()
        n = update_yaml(pubs)
        print(f"\n✓ Synced {n} publications into content.yaml")
    except Exception as e:
        print(f"\n✗ Sync failed: {e}", file=sys.stderr)
        sys.exit(1)
