#!/usr/bin/env python3
"""
HSF Voter Guide - build data.json from the Google Sheet exports.

USAGE
    python build_data.py

WHAT IT EXPECTS
    A folder called  sheet-export  sitting next to this script, containing
    three files downloaded from the Google Sheet:

        sheet-export/Races.csv
        sheet-export/Candidates.csv
        sheet-export/Organizations.csv

    (Lists.csv is not needed. It only feeds the dropdowns inside the sheet.)

    It also expects  data.base.json  in the repository root - the config and
    legal copy that volunteers never touch.

WHAT IT WRITES
    data.content.json   races + candidates + organizations, from the sheet
    data.json           data.base.json and data.content.json merged.
                        This is the file the website reads.

    Nothing is written if any error is found. The old data.json is left alone.

COUNTIES
    data.base.json holds all 15 Arizona counties. That is the master list.
    A county typed in the sheet may be written any reasonable way -
    "Santa Cruz", "santa cruz", "Santa Cruz County" - and is normalized to the
    canonical id. Anything that is not an Arizona county is a hard error.

    data.json only carries the counties that have published content behind
    them, so the guide never shows a filter that leads to an empty page.

RULES IT ENFORCES
    - every race_id on a candidate must exist in Races
    - status must be exactly  draft  or  published
    - incumbent_race_seat must be exactly  TRUE  or  FALSE
    - no duplicate ids
    - every county must be one of the 15 in data.base.json
    - category is DERIVED, not entered:
          incumbent_race_seat TRUE  -> hold_the_line
          incumbent_race_seat FALSE -> seize_new_ground

ORGANIZATION LOGOS
    Not entered in the sheet. The logo file is named after the organization id
    and lives in the images folder:

        images/org-007.png

    .png .jpg .jpeg .svg .webp and .gif are all accepted. If no matching file
    is present the organization simply has no logo, and a warning is printed
    if it is published.

WARNINGS (printed, but do not stop the build)
    - a candidate photo with no photo_credit
    - a published organization with no logo file
    - an organization link pointing at example.org
"""

import csv
import json
import os
import sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORT_DIR = os.path.join(HERE, "sheet-export")
BASE_FILE = os.path.join(HERE, "data.base.json")
CONTENT_FILE = os.path.join(HERE, "data.content.json")
OUT_FILE = os.path.join(HERE, "data.json")
IMAGES_DIR = os.path.join(HERE, "images")

# a logo may arrive in any of these formats
LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"]

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def read_csv(name):
    path = os.path.join(EXPORT_DIR, name)
    if not os.path.exists(path):
        err("Missing file: sheet-export/%s" % name)
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    # drop completely blank rows
    return [r for r in rows if any((v or "").strip() for v in r.values())]


def check_headers(rows, required, name):
    """Report a missing or renamed column once, not once per row."""
    if not rows:
        return False
    found = set(rows[0].keys())
    missing = [c for c in required if c not in found]
    if missing:
        err("%s is missing these column(s): %s" % (name, ", ".join(missing)))
        err("%s has these columns: %s" % (name, ", ".join(k for k in rows[0].keys() if k)))
        return False
    return True


def get(row, col, where):
    return (row.get(col) or "").strip()


def split_pipe(value):
    if not value:
        return []
    return [p.strip() for p in value.split("|") if p.strip()]


def to_bool(value, where, col):
    v = value.strip().upper()
    if v == "TRUE":
        return True
    if v == "FALSE":
        return False
    err("%s: column '%s' must be TRUE or FALSE, found '%s'" % (where, col, value))
    return False


def check_status(value, where):
    if value not in ("draft", "published"):
        err("%s: status must be 'draft' or 'published', found '%s'" % (where, value))
    return value


def to_int(value, where, col, default=1):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        err("%s: column '%s' must be a whole number, found '%s'" % (where, col, value))
        return default


def check_dupes(ids, label):
    seen = set()
    for i in ids:
        if i in seen:
            err("Duplicate %s id: %s" % (label, i))
        seen.add(i)


# ----------------------------------------------------------------- races
# Filled in from data.base.json at run time: {normalized form -> canonical id}
COUNTY_LOOKUP = {}
COUNTY_ORDER = []


def load_counties(base):
    """Build the lookup that lets a volunteer type any reasonable form.

    'Santa Cruz', 'santa cruz', 'Santa Cruz County', 'santa-cruz' and
    'santa_cruz' all resolve to the canonical id 'santa_cruz'.
    """
    COUNTY_LOOKUP.clear()
    del COUNTY_ORDER[:]
    for c in base.get("counties", []):
        cid = c["id"]
        COUNTY_ORDER.append(cid)
        for form in (cid, c.get("name", ""), c.get("name", "").replace(" County", "")):
            key = normalize_county(form)
            if key:
                COUNTY_LOOKUP[key] = cid


def normalize_county(value):
    v = (value or "").strip().lower()
    if v.endswith(" county"):
        v = v[: -len(" county")]
    for ch in (" ", "-", "."):
        v = v.replace(ch, "_")
    while "__" in v:
        v = v.replace("__", "_")
    return v.strip("_")


def resolve_counties(value, where, col="counties"):
    """Split on the pipe, resolve each to a canonical id, error on anything else."""
    out = []
    for raw in split_pipe(value):
        cid = COUNTY_LOOKUP.get(normalize_county(raw))
        if cid is None:
            err("%s: column '%s' has '%s', which is not an Arizona county. "
                "Valid: %s" % (where, col, raw, ", ".join(COUNTY_ORDER)))
            continue
        if cid not in out:
            out.append(cid)
    return out


RACE_COLS = ["id", "level", "office", "district", "counties",
             "seats_open", "notes", "rank"]
CAND_COLS = ["id", "race_id", "name", "incumbent_race_seat", "ballot_designation",
             "headline", "summary", "why_bullets", "link_website", "link_volunteer",
             "link_donate", "photo_filename", "photo_credit", "source", "source_url",
             "status", "created_by", "updated"]
ORG_COLS = ["id", "name", "counties", "statewide", "focus_tags", "description",
            "ways_to_help", "link_website", "link_volunteer", "link_donate",
            "link_events", "link_social", "urgent", "verified_on", "status"]


def find_logo(org_id):
    """Logos are named after the org id: images/org-007.png and so on.

    Returns the path to write into the JSON, or "" if no file is present.
    Any of the extensions in LOGO_EXTENSIONS will be found.
    """
    if not os.path.isdir(IMAGES_DIR):
        return ""
    for ext in LOGO_EXTENSIONS:
        if os.path.exists(os.path.join(IMAGES_DIR, org_id + ext)):
            return "images/" + org_id + ext
    # also tolerate an upper-case extension from a volunteer's phone
    for ext in LOGO_EXTENSIONS:
        if os.path.exists(os.path.join(IMAGES_DIR, org_id + ext.upper())):
            return "images/" + org_id + ext.upper()
    return ""


def build_races(rows):
    if not check_headers(rows, RACE_COLS, "Races.csv"):
        return []
    out = []
    for n, row in enumerate(rows, start=2):
        where = "Races row %d" % n
        rid = get(row, "id", where)
        if not rid:
            err("%s: id is empty" % where)
            continue
        r = OrderedDict()
        r["id"] = rid
        r["level"] = get(row, "level", where)
        r["office"] = get(row, "office", where)
        district = get(row, "district", where)
        r["district"] = district if district else None
        r["counties"] = resolve_counties(get(row, "counties", where), where)
        r["seats_open"] = to_int(get(row, "seats_open", where), where, "seats_open")
        r["notes"] = get(row, "notes", where)
        r["rank"] = to_int(get(row, "rank", where), where, "rank", default=999)
        if not r["counties"]:
            err("%s: counties is empty" % where)
        out.append(r)
    check_dupes([r["id"] for r in out], "race")
    return out


# ------------------------------------------------------------ candidates
def build_entries(rows, race_ids):
    if not check_headers(rows, CAND_COLS, "Candidates.csv"):
        return []
    out = []
    for n, row in enumerate(rows, start=2):
        where = "Candidates row %d" % n
        eid = get(row, "id", where)
        name = get(row, "name", where)
        if not eid:
            err("%s: id is empty (name '%s')" % (where, name))
            continue
        if not name:
            err("%s: name is empty" % where)

        incumbent = to_bool(get(row, "incumbent_race_seat", where), where,
                            "incumbent_race_seat")
        race_id = get(row, "race_id", where)
        if race_id not in race_ids:
            err("%s: race_id '%s' does not exist in the Races tab (%s)"
                % (where, race_id, name))

        photo = get(row, "photo_filename", where)
        credit = get(row, "photo_credit", where)
        if photo and not credit:
            warn("%s: %s has a photo but no photo_credit" % (where, name))

        e = OrderedDict()
        e["id"] = eid
        e["category"] = "hold_the_line" if incumbent else "seize_new_ground"
        e["race_id"] = race_id
        e["name"] = name
        e["incumbent"] = incumbent
        e["ballot_designation"] = get(row, "ballot_designation", where)
        e["headline"] = get(row, "headline", where)
        e["summary"] = get(row, "summary", where)
        e["why_bullets"] = split_pipe(get(row, "why_bullets", where))
        e["links"] = OrderedDict([
            ("website", get(row, "link_website", where)),
            ("volunteer", get(row, "link_volunteer", where)),
            ("donate", get(row, "link_donate", where)),
        ])
        e["photo"] = ("images/" + photo) if photo else ""
        e["photo_credit"] = credit
        source = get(row, "source", where)
        source_url = get(row, "source_url", where)
        if source:
            e["source"] = source
        if source_url:
            e["source_url"] = source_url
        e["status"] = check_status(get(row, "status", where), where)
        e["created_by"] = get(row, "created_by", where)
        e["updated"] = get(row, "updated", where)
        out.append(e)
    check_dupes([e["id"] for e in out], "candidate")
    return out


# --------------------------------------------------------- organizations
def build_orgs(rows):
    if not check_headers(rows, ORG_COLS, "Organizations.csv"):
        return []
    out = []
    for n, row in enumerate(rows, start=2):
        where = "Organizations row %d" % n
        oid = get(row, "id", where)
        name = get(row, "name", where)
        if not oid:
            err("%s: id is empty (name '%s')" % (where, name))
            continue

        o = OrderedDict()
        o["id"] = oid
        o["name"] = name
        o["counties"] = resolve_counties(get(row, "counties", where), where)
        o["statewide"] = to_bool(get(row, "statewide", where), where, "statewide")
        o["focus_tags"] = split_pipe(get(row, "focus_tags", where))
        o["description"] = get(row, "description", where)
        o["ways_to_help"] = split_pipe(get(row, "ways_to_help", where))
        o["links"] = OrderedDict([
            ("website", get(row, "link_website", where)),
            ("volunteer", get(row, "link_volunteer", where)),
            ("donate", get(row, "link_donate", where)),
            ("events", get(row, "link_events", where)),
            ("social", get(row, "link_social", where)),
        ])
        o["photo"] = find_logo(oid)
        o["urgent"] = to_bool(get(row, "urgent", where), where, "urgent")
        o["verified_on"] = get(row, "verified_on", where)
        o["status"] = check_status(get(row, "status", where), where)

        if o["status"] == "published" and not o["photo"]:
            warn("%s: %s is published but has no logo. Expected a file named "
                 "%s.png (or .jpg/.svg) in the images folder."
                 % (where, name, oid))

        if o["status"] == "published":
            for link in o["links"].values():
                if "example.org" in link:
                    warn("%s: %s is published but still links to example.org"
                         % (where, name))
                    break
        out.append(o)
    check_dupes([o["id"] for o in out], "organization")
    return out


# ------------------------------------------------------------------ main
def main():
    print("HSF Voter Guide - building data.json")
    print("-" * 52)

    if not os.path.isdir(EXPORT_DIR):
        print("ERROR: no folder called 'sheet-export' next to this script.")
        print("Create it and put Races.csv, Candidates.csv and")
        print("Organizations.csv in it, downloaded from the Google Sheet.")
        return 1

    if not os.path.exists(BASE_FILE):
        print("ERROR: data.base.json not found next to this script.")
        return 1

    with open(BASE_FILE, encoding="utf-8") as f:
        base = json.load(f, object_pairs_hook=OrderedDict)

    load_counties(base)
    if not COUNTY_ORDER:
        print("ERROR: data.base.json has no counties list.")
        return 1

    races = build_races(read_csv("Races.csv"))
    race_ids = {r["id"] for r in races}
    entries = build_entries(read_csv("Candidates.csv"), race_ids)
    orgs = build_orgs(read_csv("Organizations.csv"))

    if errors:
        print("\nFOUND %d PROBLEM(S). Nothing was written.\n" % len(errors))
        for e in errors:
            print("  ERROR  " + e)
        print("\nFix these in the Google Sheet, download the CSVs again, and re-run.")
        return 1

    content = OrderedDict()
    content["_README"] = [
        "HSF VOTER GUIDE - CONTENT FILE (races, candidates, organizations)",
        "",
        "GENERATED BY build_data.py FROM THE GOOGLE SHEET. Do not hand-edit.",
        "Edit the sheet, download the CSVs, re-run build_data.py.",
        "",
        "Merges with data.base.json to produce data.json, which the site reads.",
        "category is derived from incumbent_race_seat and is not entered by hand.",
    ]
    content["races"] = races
    content["entries"] = entries
    content["organizations"] = orgs

    merged = OrderedDict()
    merged["_README"] = [
        "HSF VOTER GUIDE - DATA FILE",
        "",
        "GENERATED FILE. DO NOT EDIT BY HAND. Your changes will be overwritten.",
        "",
        "Config and legal copy   -> edit data.base.json",
        "Races, candidates, orgs -> edit the Google Sheet, then run build_data.py",
    ]
    for k, v in base.items():
        if k != "_README":
            merged[k] = v
    # Only ship county filters that actually have published content behind them,
    # so a voter never clicks their county and finds an empty page.
    race_by_id = {r["id"]: r for r in races}
    live = set()
    for e in entries:
        if e["status"] == "published":
            live.update(race_by_id.get(e["race_id"], {}).get("counties", []))
    for o in orgs:
        if o["status"] == "published":
            live.update(o["counties"])

    if live:
        merged["counties"] = [c for c in base["counties"] if c["id"] in live]
    else:
        warn("Nothing is published yet, so all %d counties are being listed."
             % len(base["counties"]))

    merged["races"] = races
    merged["entries"] = entries
    merged["organizations"] = orgs

    for path, obj in ((CONTENT_FILE, content), (OUT_FILE, merged)):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, indent=2, ensure_ascii=False)
            f.write("\n")

    pub_e = sum(1 for e in entries if e["status"] == "published")
    pub_o = sum(1 for o in orgs if o["status"] == "published")
    hold = sum(1 for e in entries if e["category"] == "hold_the_line")
    seize = len(entries) - hold

    print("Races          %3d" % len(races))
    print("Candidates     %3d   (%d published, %d draft)"
          % (len(entries), pub_e, len(entries) - pub_e))
    print("               %3d hold, %d seize" % (hold, seize))
    print("Organizations  %3d   (%d published, %d draft)"
          % (len(orgs), pub_o, len(orgs) - pub_o))
    print("Counties       %3d of %d shown (those with published content):"
          % (len(merged["counties"]), len(base["counties"])))
    print("               " + ", ".join(c["id"] for c in merged["counties"]))

    if warnings:
        print("\n%d warning(s) - the files were still written:\n" % len(warnings))
        for w in warnings:
            print("  WARN   " + w)

    print("\nWrote data.content.json and data.json")
    print("Open index.html in your browser to check it, then commit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
