"""
Swasthya Setu Food Database Scraper

Extracts food cards (name, category, dosha effects, taste/rasa, energy/virya,
nutrition, best season, image URL) from the rendered HTML of the
/food-database page into a clean JSON array.

Usage:
    python scrape_food_database.py input.html -o foods.json

Notes:
    - The page is a client-side rendered React app (Vite bundle). `requests`
      alone will only fetch the empty shell (<div id="root"></div>), so you
      must supply HTML that was captured AFTER JavaScript has rendered the
      cards (e.g. saved via "View Page Source" after load, or produced by a
      headless browser like Playwright/Selenium).
    - See `fetch_rendered_html()` below for an optional Playwright-based
      fetcher that renders the page and returns the final HTML directly.
"""

import argparse
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

DOSHA_ARROW_MAP = {
    "↗️": "increase",
    "↘️": "decrease",
    "→": "neutral",
}


def parse_food_cards(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")

    # Each food card is a top-level Card component inside the results grid.
    grid = soup.select_one("div.grid.grid-cols-1")
    if grid is None:
        return []

    cards = grid.find_all("div", class_="rounded-lg", recursive=False)

    results = []
    for card in cards:
        results.append(_parse_single_card(card))
    return results


def _parse_single_card(card) -> dict:
    name_el = card.select_one("h3")
    name = name_el.get_text(strip=True) if name_el else None

    category_el = card.select_one("h3 + div")
    category = category_el.get_text(strip=True) if category_el else None

    energy_el = card.select_one("span.text-gray-500.capitalize")
    energy = energy_el.get_text(strip=True) if energy_el else None

    img_el = card.select_one("img")
    image_url = img_el["src"] if img_el and img_el.has_attr("src") else None

    desc_el = card.select_one("p.text-gray-600")
    description = desc_el.get_text(strip=True) if desc_el else None

    # Rasa (taste) — badges directly under the "Rasa (Taste)" heading
    taste = []
    for h4 in card.select("h4"):
        if "Rasa" in h4.get_text():
            taste_container = h4.find_next_sibling("div")
            if taste_container:
                taste = [b.get_text(strip=True) for b in taste_container.select("div")]
            break

    # Dosha effects — vata/pitta/kapha increase/decrease/neutral
    dosha = {}
    for h4 in card.select("h4"):
        if "Dosha Effects" in h4.get_text():
            dosha_container = h4.find_next_sibling("div")
            if dosha_container:
                for block in dosha_container.select("div.text-center"):
                    inner = block.select_one("div.p-2")
                    if not inner:
                        continue
                    texts = [t.get_text(strip=True) for t in inner.find_all("div", recursive=False)]
                    if len(texts) >= 3:
                        dosha_name, _arrow, effect = texts[0], texts[1], texts[2]
                        dosha[dosha_name] = effect
            break

    # Nutrition (per 100g)
    nutrition = {}
    for h4 in card.select("h4"):
        if "Nutrition" in h4.get_text():
            nut_container = h4.find_next_sibling("div")
            if nut_container:
                for item in nut_container.select("div"):
                    text = item.get_text(strip=True)
                    if ":" in text:
                        key, val = text.split(":", 1)
                        nutrition[key.strip().lower()] = val.strip()
            break

    # Best season
    best_season = []
    for h4 in card.select("h4"):
        if "Best Season" in h4.get_text():
            season_container = h4.find_next_sibling("div")
            if season_container:
                best_season = [b.get_text(strip=True) for b in season_container.select("div")]
            break

    return {
        "name": name,
        "category": category,
        "dosha": dosha,
        "taste": taste,
        "energy": energy,
        "description": description,
        "nutrition": nutrition,
        "bestSeason": best_season,
        "imageUrl": image_url,
    }


def fetch_rendered_html(url: str) -> str:
    """Optional helper: render the page with Playwright and return final HTML.

    Requires: pip install playwright && playwright install chromium
    """
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("div.grid.grid-cols-1")
        html = page.content()
        browser.close()
        return html


def main():
    parser = argparse.ArgumentParser(description="Scrape Swasthya Setu food database cards.")
    parser.add_argument("input", nargs="?", help="Path to saved HTML file. Omit if using --url.")
    parser.add_argument("--url", help="URL to fetch and render with Playwright before parsing.")
    parser.add_argument("-o", "--output", default="foods.json", help="Output JSON file path.")
    args = parser.parse_args()

    if args.url:
        html = fetch_rendered_html(args.url)
    elif args.input:
        html = Path(args.input).read_text(encoding="utf-8")
    else:
        parser.error("Provide either an input HTML file or --url")
        return

    foods = parse_food_cards(html)

    out_path = Path(args.output)
    out_path.write_text(json.dumps(foods, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Extracted {len(foods)} food items -> {out_path}")


if __name__ == "__main__":
    main()
