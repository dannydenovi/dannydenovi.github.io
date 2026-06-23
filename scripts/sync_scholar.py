#!/usr/bin/env python3
"""Fetch publications from Google Scholar and update the publications section of content.yaml."""
import re
import sys
import time
import ruamel.yaml
from scholarly import scholarly

SCHOLAR_ID = "nkKuHI0AAAAJ"


def make_bibtex_key(bib):
    authors = bib.get("author", "")
    last_name = re.sub(r"[^a-z]", "", authors.split(",")[0].strip().split()[-1].lower()) if authors else "unknown"
    year = bib.get("pub_year", bib.get("year", "0000"))
    first_word = re.sub(r"[^a-z]", "", bib.get("title", "x").split()[0].lower())
    return f"{last_name}{year}{first_word}"


def make_bibtex(pub):
    bib = pub.get("bib", {})
    entry_type = bib.get("ENTRYTYPE", "inproceedings")
    key = make_bibtex_key(bib)

    keep = ["title", "author", "pub_year", "journal", "booktitle",
            "volume", "number", "pages", "publisher", "doi", "url"]
    rename = {"pub_year": "year"}

    lines = [f"@{entry_type}{{{key},"]
    for field in keep:
        val = bib.get(field, "")
        if val:
            lines.append(f"  {rename.get(field, field)} = {{{val}}},")
    lines.append("}")
    return "\n".join(lines)


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

        doi = bib.get("doi", "")
        url = (f"https://doi.org/{doi}" if doi
               else pub.get("eprint_url", "") or pub.get("pub_url", ""))

        results.append({
            "title": title,
            "authors": authors,
            "venue": venue,
            "year": year,
            "url": url,
            "bibtex": make_bibtex(pub),
        })

    results.sort(key=lambda p: p.get("year", "0"), reverse=True)
    return results


def update_yaml(pubs):
    yaml = ruamel.yaml.YAML()
    yaml.preserve_quotes = True
    yaml.width = 200

    with open("content.yaml") as f:
        data = yaml.load(f)

    # preserve hand-curated fields keyed by normalised title
    existing = {
        p["title"].strip().lower(): p
        for p in data.get("publications", [])
    }

    formatted = []
    for i, p in enumerate(pubs, 1):
        prev = existing.get(p["title"].strip().lower(), {})
        formatted.append({
            "number": f"{i:02d}",
            "title": p["title"],
            "authors": p["authors"],
            "venue": p["venue"],
            "tags": prev.get("tags", []),
            "url": p["url"] or prev.get("url", ""),
            "bibtex": p["bibtex"] or prev.get("bibtex", ""),
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
