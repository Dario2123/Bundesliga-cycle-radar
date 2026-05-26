"""
Bundesliga Squad Cycle Radar - Transfermarkt Data Fetcher
Zieht Kaderdaten (Spieler, Alter, Vertragsende) für alle 18 Bundesligisten.
Ausgabe: src/data/clubs_raw.json

Verwendung:
    pip install requests beautifulsoup4
    python fetch_data.py
"""

import requests
from bs4 import BeautifulSoup
import json
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.transfermarkt.de/",
}

# Alle 18 Bundesligisten 2025/26 mit Transfermarkt-IDs
CLUBS = [
    {"name": "FC Bayern München",        "tm_id": 27,    "tm_slug": "fc-bayern-munchen"},
    {"name": "Borussia Dortmund",        "tm_id": 16,    "tm_slug": "borussia-dortmund"},
    {"name": "RB Leipzig",               "tm_id": 23826, "tm_slug": "rasenballsport-leipzig"},
    {"name": "VfB Stuttgart",            "tm_id": 79,    "tm_slug": "vfb-stuttgart"},
    {"name": "TSG Hoffenheim",           "tm_id": 533,   "tm_slug": "tsg-1899-hoffenheim"},
    {"name": "Bayer 04 Leverkusen",      "tm_id": 15,    "tm_slug": "bayer-04-leverkusen"},
    {"name": "Eintracht Frankfurt",      "tm_id": 24,    "tm_slug": "eintracht-frankfurt"},
    {"name": "SC Freiburg",              "tm_id": 60,    "tm_slug": "sc-freiburg"},
    {"name": "1. FC Union Berlin",       "tm_id": 89,    "tm_slug": "1-fc-union-berlin"},
    {"name": "1. FC Köln",               "tm_id": 3,     "tm_slug": "1-fc-koeln"},
    {"name": "Borussia Mönchengladbach", "tm_id": 18,    "tm_slug": "borussia-monchengladbach"},
    {"name": "VfL Wolfsburg",            "tm_id": 82,    "tm_slug": "vfl-wolfsburg"},
    {"name": "Werder Bremen",            "tm_id": 86,    "tm_slug": "werder-bremen"},
    {"name": "Hamburger SV",             "tm_id": 41,    "tm_slug": "hamburger-sv"},
    {"name": "FC Augsburg",              "tm_id": 167,   "tm_slug": "fc-augsburg"},
    {"name": "1. FC Heidenheim",         "tm_id": 2036,  "tm_slug": "1-fc-heidenheim-1846"},
    {"name": "1. FSV Mainz 05",          "tm_id": 39,    "tm_slug": "1-fsv-mainz-05"},
    {"name": "FC St. Pauli",             "tm_id": 35,    "tm_slug": "fc-st-pauli"},
]

def fetch_squad(club):
    url = f"https://www.transfermarkt.de/{club['tm_slug']}/kader/verein/{club['tm_id']}/saison_id/2025/plus/1"
    print(f"  Fetching {club['name']}...")
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            print(f"  !! Status {r.status_code} für {club['name']}")
            return []
        return parse_squad(r.text)
    except Exception as e:
        print(f"  !! Fehler bei {club['name']}: {e}")
        return []

def parse_squad(html):
    soup = BeautifulSoup(html, "html.parser")
    players = []

    rows = soup.select("table.items tbody tr:not(.spacer):not(.bg_Ueberschrift)")
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 5:
            continue

        # Name
        name_tag = row.select_one("td.hauptlink a")
        if not name_tag:
            continue
        name = name_tag.text.strip()

        # Position
        pos_tag = row.select_one("td.posrela table tr:last-child td")
        position = pos_tag.text.strip() if pos_tag else ""

        # Alter / Geburtsdatum
        dob = ""
        age = None
        for td in cols:
            text = td.text.strip()
            if "(" in text and ")" in text and len(text) < 20:
                # Format: "25.01.2000 (25)"
                parts = text.split("(")
                if len(parts) == 2:
                    dob = parts[0].strip()
                    try:
                        age = int(parts[1].replace(")", "").strip())
                    except:
                        pass
                break

        # Vertragsende – steht in td.zentriert mit Format "Jun 2027" oder "2027"
        contract_end = ""
        for td in cols:
            classes = td.get("class", [])
            text = td.text.strip()
            # Transfermarkt zeigt Vertragsende als "Jun 2027" oder nur "2027"
            # Es ist immer in einem td.zentriert und enthält eine 4-stellige Jahreszahl
            if "zentriert" in classes and len(text) <= 12:
                import re
                year_match = re.search(r'\b(202[3-9]|203\d)\b', text)
                if year_match:
                    contract_end = text
                    break

        # Marktwert
        market_value = ""
        mv_tag = row.select_one("td.rechts.hauptlink")
        if mv_tag:
            market_value = mv_tag.text.strip()

        if name:
            players.append({
                "name": name,
                "position": position,
                "age": age,
                "dob": dob,
                "contract_end": contract_end,
                "market_value": market_value,
            })

    return players

def calc_avg_age(players):
    ages = [p["age"] for p in players if p["age"]]
    if not ages:
        return None
    return round(sum(ages) / len(ages), 1)

def count_expiring(players, year):
    return sum(1 for p in players if str(year) in str(p.get("contract_end", "")))

def main():
    print("=== Transfermarkt Data Fetcher ===\n")
    result = []

    for club in CLUBS:
        players = fetch_squad(club)
        avg_age = calc_avg_age(players)
        exp26 = count_expiring(players, 2026)
        exp27 = count_expiring(players, 2027)
        exp28 = count_expiring(players, 2028)

        entry = {
            "name": club["name"],
            "tm_id": club["tm_id"],
            "avg_age": avg_age,
            "expiring_2026": exp26,
            "expiring_2027": exp27,
            "expiring_2028_plus": exp28,
            "players": players,
        }
        result.append(entry)

        print(f"  -> {len(players)} Spieler, Ø {avg_age} Jahre, Verträge: {exp26}×2026 / {exp27}×2027 / {exp28}×2028+")
        time.sleep(2)  # Transfermarkt nicht überlasten

    output_path = "src/data/clubs_raw.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Fertig! Daten gespeichert in: {output_path}")
    print(f"   {len(result)} Vereine, insgesamt {sum(len(c['players']) for c in result)} Spieler")

if __name__ == "__main__":
    main()
