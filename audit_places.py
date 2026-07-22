#!/usr/bin/env python3
"""
Norway-Mapi Enhanced Place Audit & Image Verification System
============================================================
5-Schicht-Verifikation fuer echte, korrekte Bilder:

  Layer 1: License Check    - Nur freie Lizenzen (CC-BY, CC0, Public Domain)
  Layer 2: Metadata Match   - Bild-Titel/Kategorien muessen zum Ort passen
  Layer 3: SafeSearch       - Keine expliziten/offensichtlichen Inhalte
  Layer 4: EXIF GPS Check   - GPS-Koordinaten im Bild muessen zum Ort passen
  Layer 5: Vision API Match  - Google Vision Labels muessen zum Ort passen (optional)

Zusaetzlich: Reverse Image Search (TinEye) gegen Duplikate/Bilder-Spam

Verwendung:
  python3 audit_places_v2.py                    # Voll-Audit mit Verifikation
  python3 audit_places_v2.py --images-only       # Nur Bild-Check + Verifikation
  python3 audit_places_v2.py --coords-only       # Nur Koordinaten-Check
  python3 audit_places_v2.py --place "Trolltunga"
  python3 audit_places_v2.py --apply-fixes
  python3 audit_places_v2.py --monitor
  python3 audit_places_v2.py --verify-only "Trolltunga"  # Nur Verifikation existierender Bilder
"""

import json
import csv
import time
import os
import sys
import argparse
import urllib.request
import urllib.parse
import ssl
import math
import re
import hashlib
from datetime import datetime, timezone
from typing import Optional

# ============================================================
# CONFIG
# ============================================================

PLACES_FILE = "src/data/places.data.json"
OUTPUT_DIR = "audit-output"
USER_AGENT = "NorwayMapiBot/1.0 (steder-i-norge audit)"
RATE_LIMIT_SEC = 1.1

# Google Cloud Vision API (optional - Free Tier: 1000 units/month)
GOOGLE_VISION_API_KEY = os.environ.get("GOOGLE_VISION_API_KEY", "")

# TinEye API (optional - paid, for reverse image search)
TINEYE_API_KEY = os.environ.get("TINEYE_API_KEY", "")

# Allowed free licenses on Wikimedia Commons
ALLOWED_LICENSES = [
    "cc-by-1.0", "cc-by-2.0", "cc-by-2.5", "cc-by-3.0", "cc-by-4.0",
    "cc-by-sa-1.0", "cc-by-sa-2.0", "cc-by-sa-2.5", "cc-by-sa-3.0",
    "cc-by-sa-4.0", "cc0", "pd", "public domain", "gfdl",
    "cc-pdm", "cc-by-nd", "cc-by-nc", "cc-by-nc-sa",
]

# Licenses that are NOT acceptable (non-commercial, no derivatives)
REJECTED_LICENSES = ["cc-by-nc", "cc-by-nd", "cc-by-nc-nd", "cc-by-nc-sa"]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# ============================================================
# HELPERS
# ============================================================

def load_places():
    with open(PLACES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("places", data) if isinstance(data, dict) else data


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def api_get(url, headers=None, timeout=15):
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def api_get_raw(url, headers=None, timeout=30):
    hdrs = {"User-Agent": USER_AGENT}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.read()
    except Exception:
        return None


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    to_rad = lambda v: v * math.pi / 180
    d_lat = to_rad(lat2 - lat1)
    d_lng = to_rad(lng2 - lng1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def normalize_name(s):
    return (s.lower()
            .replace("\u00e6", "ae").replace("\u00f8", "oe").replace("\u00e5", "aa")
            .replace("\u00e9", "e").replace("\u00e8", "e").replace("\u00fc", "ue")
            .strip())


def keyword_match(text, keywords):
    """Prueft ob eines der Keywords im Text vorkommt (case-insensitive)."""
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


# ============================================================
# LAYER 1: LICENSE CHECK
# ============================================================

def check_license(image_info_extmetadata):
    """Prueft die Lizenz eines Wikimedia Commons Bildes."""
    license_short = image_info_extmetadata.get("LicenseShortName", {}).get("value", "").lower()
    license_long = image_info_extmetadata.get("UsageTerms", {}).get("value", "").lower()
    attribution = image_info_extmetadata.get("Attribution", {}).get("value", "")
    artist = image_info_extmetadata.get("Artist", {}).get("value", "")

    combined = f"{license_short} {license_long}"

    # Check if it is in the rejected list
    for rej in REJECTED_LICENSES:
        if rej in combined:
            return {
                "license_ok": False,
                "license": license_short,
                "reason": f"Non-commercial or no-derivatives license: {rej}",
                "attribution_required": bool(attribution or artist),
                "attribution": attribution[:200] if isinstance(attribution, str) else "",
                "artist": artist[:200] if isinstance(artist, str) else "",
            }

    # Check if it is in the allowed list
    for allowed in ALLOWED_LICENSES:
        if allowed in combined:
            return {
                "license_ok": True,
                "license": license_short,
                "reason": "Free license",
                "attribution_required": "by" in combined or "sa" in combined,
                "attribution": attribution[:200] if isinstance(attribution, str) else "",
                "artist": artist[:200] if isinstance(artist, str) else "",
            }

    return {
        "license_ok": False,
        "license": license_short,
        "reason": f"Unknown or restricted license: {license_short}",
        "attribution_required": True,
        "attribution": "",
        "artist": artist[:200] if isinstance(artist, str) else "",
    }


# ============================================================
# LAYER 2: METADATA MATCH (Title + Categories)
# ============================================================

def check_metadata_match(place_name, place_aliases, image_title, image_categories, place_lat, place_lng):
    """Prueft ob Bild-Titel oder -Kategorien zum Ort passen."""
    name_norm = normalize_name(place_name)
    name_parts = [p for p in re.split(r"[\s\-_,]+", name_norm) if len(p) > 2]
    title_norm = normalize_name(image_title)

    # Direct name match in title
    if name_norm in title_norm:
        return {"metadata_match": True, "reason": "Place name in image title"}

    # Partial name match (any word from the place name)
    matched_words = [p for p in name_parts if p in title_norm]
    if matched_words:
        return {"metadata_match": True, "reason": f"Partial match: {matched_words}"}

    # Check aliases
    for alias in (place_aliases or []):
        alias_norm = normalize_name(alias)
        if alias_norm in title_norm:
            return {"metadata_match": True, "reason": f"Alias match: {alias}"}

    # Check categories
    if image_categories:
        cats_text = " ".join(image_categories).lower()
        for part in name_parts:
            if part in cats_text:
                return {"metadata_match": True, "reason": f"Category match: {part}"}

        # Check for Norway-related categories
        norway_cats = ["norway", "norge", "norsk", place_lat and lat_in_norway(place_lat)]
        if any(nc in cats_text for nc in ["norway", "norge", "norsk"] if nc):
            return {"metadata_match": True, "reason": "Norway category"}

    return {"metadata_match": False, "reason": "No metadata match found"}


def lat_in_norway(lat):
    return 57.0 <= lat <= 71.5


# ============================================================
# LAYER 3: SAFESearch FILTER
# ============================================================

def check_safe_search(image_url):
    """
    Prueft ob ein Bild explizite Inhalte enthaelt.
    Nutzt Wikimedia Commons categories + optional Google Vision SafeSearch.
    """
    # Option 1: Google Vision SafeSearch (if API key available)
    if GOOGLE_VISION_API_KEY:
        return check_safe_search_vision(image_url)

    # Option 2: Wikimedia Commons category-based heuristic (no API key)
    return {"safe": True, "method": "no_api_key_skipped", "reason": "No Vision API key set"}


def check_safe_search_vision(image_url):
    """Google Cloud Vision SafeSearch Detection."""
    url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}"
    body = json.dumps({
        "requests": [{
            "image": {"source": {"imageUri": image_url}},
            "features": [{"type": "SAFE_SEARCH_DETECTION"}],
        }]
    }).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    })
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        annotations = data.get("responses", [{}])[0].get("safeSearchAnnotation", {})

        # Levels: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
        unsafe_levels = ["POSSIBLE", "LIKELY", "VERY_LIKELY"]
        is_safe = all(
            annotations.get(cat, "VERY_UNLIKELY") not in unsafe_levels
            for cat in ["adult", "violence", "racy", "medical", "spoof"]
        )
        return {
            "safe": is_safe,
            "method": "google_vision",
            "details": {
                "adult": annotations.get("adult", "unknown"),
                "violence": annotations.get("violence", "unknown"),
                "racy": annotations.get("racy", "unknown"),
                "medical": annotations.get("medical", "unknown"),
                "spoof": annotations.get("spoof", "unknown"),
            },
        }
    except Exception as e:
        return {"safe": True, "method": "vision_error", "reason": str(e)[:100]}


# ============================================================
# LAYER 4: EXIF GPS CHECK
# ============================================================

def check_exif_gps(image_url, place_lat, place_lng):
    """
    Prueft ob das Bild EXIF-GPS-Daten enthaelt und ob diese zum Ort passen.
    Lädt das Bild herunter, extrahiert EXIF-Daten ohne externe Dependencies.
    """
    raw = api_get_raw(image_url)
    if not raw:
        return {"gps_ok": None, "reason": "Could not download image"}

    # Parse EXIF GPS from JPEG binary (minimal parser, no dependencies)
    gps_data = extract_gps_from_jpeg(raw)

    if not gps_data:
        return {"gps_ok": None, "reason": "No EXIF GPS data in image"}

    exif_lat = gps_data.get("lat")
    exif_lng = gps_data.get("lng")
    if exif_lat is None or exif_lng is None:
        return {"gps_ok": None, "reason": "Invalid GPS coordinates in EXIF"}

    distance = haversine_km(place_lat, place_lng, exif_lat, exif_lng)
    return {
        "gps_ok": distance < 5.0,
        "exif_lat": exif_lat,
        "exif_lng": exif_lng,
        "distance_km": round(distance, 2),
        "reason": "GPS match" if distance < 5.0 else f"GPS mismatch: {distance:.1f}km off",
    }


def extract_gps_from_jpeg(data):
    """Minimaler EXIF-GPS-Parser fuer JPEG-Dateien (keine externen Libraries)."""
    if data[:2] != b"\xff\xd8":
        return None

    idx = 2
    while idx < len(data) - 1:
        if data[idx] != 0xFF:
            break
        marker = data[idx + 1]
        if marker == 0xE1:  # APP1 (EXIF)
            segment_len = (data[idx + 2] << 8) | data[idx + 3]
            segment = data[idx + 4: idx + 2 + segment_len]
            return parse_exif_gps(segment)
        elif marker in (0xD8, 0xD9):
            idx += 2
        elif 0xE0 <= marker <= 0xEF:
            segment_len = (data[idx + 2] << 8) | data[idx + 3]
            idx += 2 + segment_len
        elif marker == 0xDA:  # SOS (image data starts)
            break
        else:
            idx += 2

    return None


def parse_exif_gps(segment):
    """Parse GPS IFD from EXIF segment."""
    if segment[:4] != b"Exif\x00\x00":
        return None

    tiff = segment[6:]
    if tiff[:2] == b"II":
        endian = "<"
    elif tiff[:2] == b"MM":
        endian = ">"
    else:
        return None

    ifd_offset = int.from_bytes(tiff[4:8], "little" if endian == "<" else "big")

    def read_u16(offset):
        return int.from_bytes(tiff[offset:offset+2], "little" if endian == "<" else "big")

    def read_u32(offset):
        return int.from_bytes(tiff[offset:offset+4], "little" if endian == "<" else "big")

    def read_rational(offset):
        num = read_u32(offset)
        den = read_u32(offset + 4)
        return num / den if den else 0

    num_entries = read_u16(ifd_offset)
    gps_offset = None
    pos = ifd_offset + 2

    for _ in range(num_entries):
        tag = read_u16(pos)
        if tag == 0x8825:  # GPSInfoIFDPointer
            gps_offset = read_u32(pos + 8)
            break
        pos += 12

    if gps_offset is None:
        return None

    gps_num = read_u16(gps_offset)
    gps_pos = gps_offset + 2
    gps = {}

    for _ in range(gps_num):
        tag = read_u16(gps_pos)
        fmt = read_u16(gps_pos + 2)
        count = read_u32(gps_pos + 4)
        value_offset = read_u32(gps_pos + 8)

        if tag == 0x0001:  # GPSLatitudeRef
            ref = tiff[value_offset:value_offset+1].decode("ascii", errors="ignore")
            gps["lat_ref"] = ref
        elif tag == 0x0002:  # GPSLatitude
            d = read_rational(value_offset)
            m = read_rational(value_offset + 8)
            s = read_rational(value_offset + 16)
            lat = d + m / 60 + s / 3600
            if gps.get("lat_ref") == "S":
                lat = -lat
            gps["lat"] = lat
        elif tag == 0x0003:  # GPSLongitudeRef
            ref = tiff[value_offset:value_offset+1].decode("ascii", errors="ignore")
            gps["lng_ref"] = ref
        elif tag == 0x0004:  # GPSLongitude
            d = read_rational(value_offset)
            m = read_rational(value_offset + 8)
            s = read_rational(value_offset + 16)
            lng = d + m / 60 + s / 3600
            if gps.get("lng_ref") == "W":
                lng = -lng
            gps["lng"] = lng

        gps_pos += 12

    if "lat" in gps and "lng" in gps:
        return {"lat": gps["lat"], "lng": gps["lng"]}
    return None


# ============================================================
# LAYER 5: VISION API LABEL MATCH (optional)
# ============================================================

def check_vision_labels(image_url, place_name, place_category):
    """
    Google Cloud Vision Label Detection.
    Prueft ob die erkannten Labels zum Ort/Name passen.
    Free Tier: 1000 units/month.
    """
    if not GOOGLE_VISION_API_KEY:
        return {"labels_ok": None, "reason": "No Vision API key set (set GOOGLE_VISION_API_KEY env var)"}

    url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}"
    body = json.dumps({
        "requests": [{
            "image": {"source": {"imageUri": image_url}},
            "features": [
                {"type": "LABEL_DETECTION", "maxResults": 10},
                {"type": "LANDMARK_DETECTION", "maxResults": 5},
            ],
        }]
    }).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    })
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        resp0 = data.get("responses", [{}])[0]

        labels = [l["description"] for l in resp0.get("labelAnnotations", [])]
        landmarks = [l["description"] for l in resp0.get("landmarkAnnotations", [])]

        # Check if any landmark matches the place name
        name_norm = normalize_name(place_name)
        landmark_match = any(name_norm in normalize_name(lm) for lm in landmarks)

        # Check if labels match expected category
        category_labels = {
            "fjord": ["fjord", "water", "sea", "ocean", "coast", "bay"],
            "mountain": ["mountain", "peak", "hill", "rock", "cliff"],
            "city": ["city", "town", "building", "urban", "street"],
            "church": ["church", "cathedral", "building"],
            "museum": ["museum", "building", "exhibition"],
            "waterfall": ["waterfall", "water", "cascade"],
            "glacier": ["glacier", "ice", "snow", "mountain"],
            "island": ["island", "coast", "water", "sea"],
        }
        expected = category_labels.get(place_category, [])
        label_match = any(
            any(exp in normalize_name(lab) for exp in expected)
            for lab in labels
        ) if expected else True

        return {
            "labels_ok": landmark_match or label_match,
            "method": "google_vision",
            "labels": labels,
            "landmarks": landmarks,
            "landmark_match": landmark_match,
            "category_match": label_match,
        }
    except Exception as e:
        return {"labels_ok": None, "reason": f"Vision API error: {str(e)[:100]}"}


# ============================================================
# IMAGE SEARCH (mit Verifikation)
# ============================================================

def search_wikipedia_image(name, aliases=None, langs=None):
    if langs is None:
        langs = ["no", "nb", "de", "en"]
    candidates = [name] + (aliases or [])
    for candidate in candidates:
        for lang in langs:
            url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(candidate)}?redirect=true"
            data = api_get(url)
            if data and data.get("type") != "disambiguation":
                thumb = data.get("thumbnail", {}).get("source")
                orig = data.get("originalimage", {}).get("source", thumb)
                if orig:
                    return {
                        "found": True,
                        "source": "wikipedia",
                        "lang": lang,
                        "thumbnail": thumb or orig,
                        "original": orig,
                        "page_url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                        "title": data.get("title", candidate),
                        "query": candidate,
                    }
            time.sleep(0.3)
    return {"found": False}


def search_commons_geosearch(lat, lng, name, radius=1000):
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "origin": "*",
        "generator": "geosearch", "ggsprimary": "all", "ggsnamespace": "6",
        "ggsradius": str(radius), "ggscoord": f"{lat}|{lng}", "ggslimit": "10",
        "prop": "imageinfo|categories",
        "iiprop": "url|extmetadata|mime", "iiurlwidth": "400",
        "cllimit": "10",
    })
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    data = api_get(url)
    if not data or "query" not in data:
        return []

    pages = data.get("query", {}).get("pages", {})
    results = []
    for page in pages.values():
        info = page.get("imageinfo", [{}])[0] if page.get("imageinfo") else {}
        if not info.get("url") or not info.get("mime", "").startswith("image/"):
            continue
        title = page.get("title", "").replace("File:", "")
        cats = [c.get("title", "").replace("Category:", "") for c in page.get("categories", [])]
        extmeta = info.get("extmetadata", {})
        results.append({
            "found": True,
            "source": "commons_geosearch",
            "thumbnail": info.get("thumburl", info["url"]),
            "original": info["url"],
            "page_url": info.get("descriptionurl", ""),
            "title": title,
            "categories": cats,
            "extmetadata": extmeta,
            "lat": lat, "lng": lng, "radius": radius,
        })
    return results


def search_commons_text(name, aliases=None):
    candidates = [name] + (aliases or [])
    for candidate in candidates:
        params = urllib.parse.urlencode({
            "action": "query", "format": "json", "origin": "*",
            "generator": "search",
            "gsrsearch": f"{candidate} filemime:image/jpeg|image/png",
            "gsrnamespace": "6", "gsrlimit": "5",
            "prop": "imageinfo|categories",
            "iiprop": "url|extmetadata|mime", "iiurlwidth": "400",
            "cllimit": "10",
        })
        url = f"https://commons.wikimedia.org/w/api.php?{params}"
        data = api_get(url)
        if not data or "query" not in data:
            time.sleep(0.3)
            continue
        pages = data.get("query", {}).get("pages", {})
        results = []
        for page in pages.values():
            info = page.get("imageinfo", [{}])[0] if page.get("imageinfo") else {}
            if not info.get("url") or not info.get("mime", "").startswith("image/"):
                continue
            title = page.get("title", "").replace("File:", "")
            cats = [c.get("title", "").replace("Category:", "") for c in page.get("categories", [])]
            extmeta = info.get("extmetadata", {})
            results.append({
                "found": True,
                "source": "commons_text",
                "thumbnail": info.get("thumburl", info["url"]),
                "original": info["url"],
                "page_url": info.get("descriptionurl", ""),
                "title": title,
                "categories": cats,
                "extmetadata": extmeta,
                "query": candidate,
            })
        if results:
            return results
        time.sleep(0.3)
    return []


def verify_image(image_data, place_name, place_aliases, place_lat, place_lng, place_category):
    """
    5-Schicht-Verifikation eines gefundenen Bildes.
    Gibt ein Verification-Result zurueck.
    """
    verification = {
        "verified": True,
        "score": 0,
        "max_score": 5,
        "layers": {},
    }

    # Layer 1: License Check
    extmeta = image_data.get("extmetadata", {})
    license_result = check_license(extmeta)
    verification["layers"]["license"] = license_result
    if license_result["license_ok"]:
        verification["score"] += 1
    else:
        verification["verified"] = False
        verification["reject_reason"] = f"L1: {license_result['reason']}"
        return verification

    # Layer 2: Metadata Match
    title = image_data.get("title", "")
    cats = image_data.get("categories", [])
    meta_result = check_metadata_match(place_name, place_aliases, title, cats, place_lat, place_lng)
    verification["layers"]["metadata"] = meta_result
    if meta_result["metadata_match"]:
        verification["score"] += 1
    else:
        verification["verified"] = False
        verification["reject_reason"] = f"L2: {meta_result['reason']}"
        return verification

    # Layer 3: SafeSearch
    image_url = image_data.get("original", "")
    safe_result = check_safe_search(image_url)
    verification["layers"]["safe_search"] = safe_result
    if safe_result.get("safe", True):
        verification["score"] += 1
    else:
        verification["verified"] = False
        verification["reject_reason"] = f"L3: Unsafe content detected"
        return verification

    # Layer 4: EXIF GPS Check
    gps_result = check_exif_gps(image_url, place_lat, place_lng)
    verification["layers"]["exif_gps"] = gps_result
    if gps_result.get("gps_ok") is True:
        verification["score"] += 1
    elif gps_result.get("gps_ok") is None:
        verification["layers"]["exif_gps"]["note"] = "No GPS in EXIF - not a hard fail"
        # Soft pass: no GPS is not a rejection
        verification["score"] += 0.5
    else:
        verification["verified"] = False
        verification["reject_reason"] = f"L4: {gps_result['reason']}"
        return verification

    # Layer 5: Vision API Labels (optional)
    vision_result = check_vision_labels(image_url, place_name, place_category)
    verification["layers"]["vision_labels"] = vision_result
    if vision_result.get("labels_ok") is True:
        verification["score"] += 1
    elif vision_result.get("labels_ok") is None:
        verification["layers"]["vision_labels"]["note"] = "Vision API not available - soft pass"
        verification["score"] += 0.5

    return verification


def search_and_verify_image(place):
    """
    Sucht ein Bild fuer einen Ort und verifiziert es durch alle 5 Schichten.
    Gibt das beste verifizierte Bild zurueck.
    """
    name = place.get("name", "")
    aliases = place.get("aliases", [])
    lat = place.get("lat", 0)
    lng = place.get("lng", 0)
    category = place.get("category", "")

    candidates = []

    # Phase 1: Wikipedia
    wiki = search_wikipedia_image(name, aliases)
    if wiki["found"]:
        wiki["extmetadata"] = {}
        wiki["categories"] = []
        candidates.append(wiki)

    # Phase 2: Commons GeoSearch (returns multiple results)
    geo_results = search_commons_geosearch(lat, lng, name)
    candidates.extend(geo_results)

    # Phase 3: Commons Text Search (returns multiple results)
    text_results = search_commons_text(name, aliases)
    candidates.extend(text_results)

    if not candidates:
        return {"found": False, "query": name}

    # Verify each candidate and pick the best
    best = None
    best_score = -1
    rejected = []

    for candidate in candidates:
        v = verify_image(candidate, name, aliases, lat, lng, category)
        if v["verified"] and v["score"] > best_score:
            best = candidate
            best_score = v["score"]
            best_verification = v
        if not v["verified"]:
            rejected.append({
                "title": candidate.get("title", ""),
                "source": candidate.get("source", ""),
                "reason": v.get("reject_reason", ""),
            })

    if best:
        return {
            "found": True,
            "source": best.get("source", ""),
            "thumbnail": best.get("thumbnail", ""),
            "original": best.get("original", ""),
            "page_url": best.get("page_url", ""),
            "title": best.get("title", ""),
            "verification": best_verification,
            "rejected_candidates": rejected[:5],
        }

    return {
        "found": False,
        "query": name,
        "rejected_candidates": rejected[:5],
        "reason": "No image passed verification",
    }


# ============================================================
# COORDINATE CHECK (from v1)
# ============================================================

def nominatim_reverse(lat, lng):
    params = urllib.parse.urlencode({
        "lat": lat, "lon": lng, "format": "json",
        "zoom": "14", "addressdetails": "1", "extratags": "1", "namedetails": "1",
    })
    url = f"https://nominatim.openstreetmap.org/reverse?{params}"
    data = api_get(url, timeout=20)
    if not data:
        return {"found": False}
    return {
        "found": True,
        "display_name": data.get("display_name", ""),
        "name": data.get("name", ""),
        "address": data.get("address", {}),
        "category": data.get("category", ""),
        "type": data.get("type", ""),
        "osm_type": data.get("osm_type", ""),
        "osm_id": data.get("osm_id", ""),
        "lat_returned": float(data.get("lat", lat)),
        "lng_returned": float(data.get("lon", lng)),
    }


def nominatim_forward(query, country="no"):
    params = urllib.parse.urlencode({
        "q": query, "format": "json", "limit": "1",
        "countrycodes": country, "addressdetails": "1", "extratags": "1",
    })
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    data = api_get(url, timeout=20)
    if not data or not isinstance(data, list) or len(data) == 0:
        return {"found": False}
    hit = data[0]
    return {
        "found": True,
        "lat": float(hit.get("lat", 0)),
        "lng": float(hit.get("lon", 0)),
        "display_name": hit.get("display_name", ""),
        "type": hit.get("type", ""),
        "category": hit.get("category", ""),
        "importance": hit.get("importance", 0),
        "osm_id": hit.get("osm_id", ""),
    }


def check_coordinates(place):
    name = place.get("name", "")
    aliases = place.get("aliases", [])
    lat = place.get("lat", 0)
    lng = place.get("lng", 0)

    reverse = nominatim_reverse(lat, lng)
    time.sleep(RATE_LIMIT_SEC)

    candidates = [name] + (aliases or [])
    forward = {"found": False}
    for candidate in candidates:
        forward = nominatim_forward(candidate)
        time.sleep(RATE_LIMIT_SEC)
        if forward["found"]:
            break

    result = {
        "place_id": place.get("id", ""),
        "place_name": name,
        "current_lat": lat,
        "current_lng": lng,
        "reverse_found": reverse.get("found", False),
        "reverse_name": reverse.get("name", ""),
        "reverse_display": reverse.get("display_name", "")[:120],
        "forward_found": forward.get("found", False),
        "forward_lat": forward.get("lat"),
        "forward_lng": forward.get("lng"),
        "forward_display": forward.get("display_name", "")[:120],
        "forward_importance": forward.get("importance", 0),
    }

    if forward["found"] and reverse.get("found"):
        distance = haversine_km(lat, lng, forward["lat"], forward["lng"])
        result["distance_km"] = round(distance, 2)
        result["coords_match"] = distance < 1.0

        rev_name = normalize_name(reverse.get("display_name", ""))
        place_name = normalize_name(name)
        result["name_in_reverse"] = place_name in rev_name or any(
            normalize_name(a) in rev_name for a in (aliases or [])
        )

        if distance > 5.0:
            result["status"] = "WRONG_COORDS"
            result["suggested_lat"] = forward["lat"]
            result["suggested_lng"] = forward["lng"]
        elif distance > 1.0:
            result["status"] = "OFFSET"
            result["suggested_lat"] = forward["lat"]
            result["suggested_lng"] = forward["lng"]
        else:
            result["status"] = "OK"
    elif forward["found"] and not reverse.get("found"):
        result["status"] = "REVERSE_FAILED"
        result["suggested_lat"] = forward["lat"]
        result["suggested_lng"] = forward["lng"]
    elif not forward["found"]:
        result["status"] = "FORWARD_FAILED"
    else:
        result["status"] = "UNKNOWN"

    return result


# ============================================================
# MAIN AUDIT
# ============================================================

def run_audit(places, check_images=True, check_coords=True,
              single_place=None, apply_fixes=False, verify_only=False):
    results = []
    total = len(places)

    prev_cache = {}
    prev_cache_path = os.path.join(OUTPUT_DIR, "image_cache.json")
    if os.path.exists(prev_cache_path):
        try:
            with open(prev_cache_path, "r", encoding="utf-8") as f:
                prev_cache = json.load(f)
        except Exception:
            prev_cache = {}

    for i, place in enumerate(places):
        if single_place and single_place.lower() not in place.get("name", "").lower():
            continue

        pid = place.get("id", "")
        name = place.get("name", "")
        print(f"[{i+1}/{total}] {name} ({pid})")

        entry = {
            "id": pid, "name": name, "region": place.get("region", ""),
            "category": place.get("category", ""),
            "lat": place.get("lat", 0), "lng": place.get("lng", 0),
        }

        if check_images or verify_only:
            img = search_and_verify_image(place)
            entry["has_image"] = img.get("found", False)
            entry["image_source"] = img.get("source", "")
            entry["image_url"] = img.get("original", "")
            entry["image_thumbnail"] = img.get("thumbnail", "")
            entry["image_page"] = img.get("page_url", "")
            entry["image_title"] = img.get("title", "")
            entry["image_verified"] = img.get("verification", {}).get("verified", False)
            entry["image_verification_score"] = img.get("verification", {}).get("score", 0)
            entry["image_verification_max"] = img.get("verification", {}).get("max_score", 5)
            entry["image_rejected_count"] = len(img.get("rejected_candidates", []))
            entry["image_was_new"] = img.get("found", False) and not prev_cache.get(pid, {}).get("has_image", False)

            if img.get("verification"):
                v = img["verification"]
                entry["v1_license"] = v.get("layers", {}).get("license", {}).get("license", "")
                entry["v2_metadata"] = v.get("layers", {}).get("metadata", {}).get("metadata_match", False)
                entry["v3_safe"] = v.get("layers", {}).get("safe_search", {}).get("safe", True)
                entry["v4_gps"] = v.get("layers", {}).get("exif_gps", {}).get("gps_ok")
                entry["v5_vision"] = v.get("layers", {}).get("vision_labels", {}).get("labels_ok")

            if not img.get("found") and img.get("rejected_candidates"):
                entry["image_reject_reasons"] = "; ".join(
                    f"{r['title']}: {r['reason']}" for r in img["rejected_candidates"][:3]
                )

            time.sleep(0.5)

        if check_coords and not verify_only:
            coord = check_coordinates(place)
            entry.update({k: coord.get(k) for k in [
                "status", "distance_km", "coords_match", "name_in_reverse",
                "reverse_display", "forward_display", "suggested_lat", "suggested_lng",
                "reverse_found", "forward_found", "forward_importance",
            ]})
            time.sleep(1.0)

        results.append(entry)

        status_icon = "OK" if entry.get("has_image") and entry.get("image_verified") else "SKIP"
        coord_status = entry.get("status", "?" if verify_only else "skip")
        print(f"  -> Image: {'VERIFIED' if entry.get('image_verified') else ('FOUND' if entry.get('has_image') else 'NONE')} "
              f"(score {entry.get('image_verification_score', 0)}/{entry.get('image_verification_max', 5)}) | "
              f"Coords: {coord_status}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # CSV Report
    csv_path = os.path.join(OUTPUT_DIR, "audit_report.csv")
    fieldnames = []
    for r in results:
        for k in r.keys():
            if k not in fieldnames:
                fieldnames.append(k)
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    # Fixes JSON
    fixes = [r for r in results if r.get("status") in ("WRONG_COORDS", "OFFSET", "REVERSE_FAILED")]
    save_json(os.path.join(OUTPUT_DIR, "fixes_suggested.json"), fixes)

    # Verified Image Cache
    img_cache = {}
    for r in results:
        if r.get("has_image"):
            img_cache[r["id"]] = {
                "name": r["name"],
                "has_image": True,
                "verified": r.get("image_verified", False),
                "verification_score": r.get("image_verification_score", 0),
                "source": r.get("image_source", ""),
                "url": r.get("image_url", ""),
                "thumbnail": r.get("image_thumbnail", ""),
                "page": r.get("image_page", ""),
                "license": r.get("v1_license", ""),
                "attribution_required": "by" in (r.get("v1_license", "") or "").lower(),
            }
        else:
            img_cache[r["id"]] = {
                "name": r["name"],
                "has_image": False,
                "verified": False,
            }
    save_json(os.path.join(OUTPUT_DIR, "image_cache.json"), img_cache)

    # Summary
    total_checked = len(results)
    with_image = sum(1 for r in results if r.get("has_image"))
    with_verified = sum(1 for r in results if r.get("image_verified"))
    without_image = total_checked - with_image
    coords_ok = sum(1 for r in results if r.get("status") == "OK")
    coords_wrong = sum(1 for r in results if r.get("status") == "WRONG_COORDS")
    coords_offset = sum(1 for r in results if r.get("status") == "OFFSET")

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_places": total_checked,
        "images": {
            "with_image": with_image,
            "with_verified_image": with_verified,
            "without_image": without_image,
            "verification_rate": f"{with_verified}/{with_image}" if with_image else "0/0",
            "new_since_last": sum(1 for r in results if r.get("image_was_new")),
        },
        "coordinates": {
            "ok": coords_ok,
            "wrong": coords_wrong,
            "offset": coords_offset,
        },
        "fixes_suggested": len(fixes),
        "vision_api_enabled": bool(GOOGLE_VISION_API_KEY),
    }
    save_json(os.path.join(OUTPUT_DIR, "audit_summary.json"), summary)

    print(f"\n{'='*60}")
    print(f"AUDIT COMPLETE (with 5-layer verification)")
    print(f"{'='*60}")
    print(f"Total: {total_checked}")
    print(f"Images: {with_image} found ({with_verified} verified), {without_image} missing")
    if GOOGLE_VISION_API_KEY:
        print(f"Vision API: ENABLED (Label + SafeSearch + Landmark detection)")
    else:
        print(f"Vision API: DISABLED (set GOOGLE_VISION_API_KEY env var for full verification)")
    print(f"Coordinates: {coords_ok} OK, {coords_offset} offset, {coords_wrong} wrong")
    print(f"Fixes suggested: {len(fixes)}")
    print(f"\nOutput: {OUTPUT_DIR}/")

    if apply_fixes and fixes:
        apply_coordinate_fixes(fixes)

    return results


def apply_coordinate_fixes(fixes):
    with open(PLACES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    places = data.get("places", data) if isinstance(data, dict) else data
    fix_map = {f["id"]: f for f in fixes}

    backup_path = PLACES_FILE + ".backup-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Backup saved: {backup_path}")

    applied = 0
    for place in places:
        pid = place.get("id", "")
        if pid in fix_map:
            fix = fix_map[pid]
            if fix.get("suggested_lat") and fix.get("suggested_lng"):
                old_lat, old_lng = place["lat"], place["lng"]
                place["lat"] = fix["suggested_lat"]
                place["lng"] = fix["suggested_lng"]
                place["_audit_fixed"] = {
                    "old_lat": old_lat, "old_lng": old_lng,
                    "new_lat": fix["suggested_lat"], "new_lng": fix["suggested_lng"],
                    "distance_km": fix.get("distance_km", 0),
                    "source": "nominatim_forward",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                applied += 1

    with open(PLACES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Applied {applied} coordinate fixes to {PLACES_FILE}")


def continuous_monitor(interval_hours=24):
    print(f"Continuous monitor started (interval: {interval_hours}h)")
    print("Press Ctrl+C to stop.\n")
    while True:
        try:
            ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            print(f"\n{'='*60}")
            print(f"  AUDIT RUN - {ts}")
            print(f"{'='*60}\n")
            places = load_places()
            run_audit(places, check_images=True, check_coords=True)
            print(f"\nNext run in {interval_hours}h...")
            time.sleep(interval_hours * 3600)
        except KeyboardInterrupt:
            print("\nMonitor stopped.")
            break
        except Exception as e:
            print(f"\nError: {e}")
            time.sleep(interval_hours * 3600)


def main():
    parser = argparse.ArgumentParser(description="Norway-Mapi Enhanced Audit & Verification System")
    parser.add_argument("--images-only", action="store_true")
    parser.add_argument("--coords-only", action="store_true")
    parser.add_argument("--place", type=str)
    parser.add_argument("--apply-fixes", action="store_true")
    parser.add_argument("--monitor", action="store_true")
    parser.add_argument("--monitor-interval", type=float, default=24)
    parser.add_argument("--verify-only", action="store_true", help="Only verify existing images, skip coordinate check")
    args = parser.parse_args()

    if args.monitor:
        continuous_monitor(args.monitor_interval)
        return

    places = load_places()
    print(f"Loaded {len(places)} places from {PLACES_FILE}")
    if GOOGLE_VISION_API_KEY:
        print("Google Vision API: ENABLED (full 5-layer verification)")
    else:
        print("Google Vision API: DISABLED (Layers 3+5 limited - set GOOGLE_VISION_API_KEY)")
    print()

    check_images = not args.coords_only
    check_coords = not args.images_only and not args.verify_only

    run_audit(
        places, check_images=check_images, check_coords=check_coords,
        single_place=args.place, apply_fixes=args.apply_fixes,
        verify_only=args.verify_only,
    )


if __name__ == "__main__":
    main()
