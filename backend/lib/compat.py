"""Compatibility estimate between two applications (mutual, 0-100). An estimate, not a guarantee."""


def _range_score(value: int, lo: int, hi: int, full: int, per_unit: float) -> int:
    if lo <= value <= hi:
        return full
    dist = min(abs(value - lo), abs(value - hi))
    return max(0, round(full - dist * per_unit))


def _overlap(wanted: list[str], have: list[str], full: int) -> int:
    if not wanted:
        return full
    hits = len(set(wanted) & set(have))
    return round(full * min(1.0, hits / min(3, len(wanted))))


def _side(a: dict, b: dict) -> dict[str, int]:
    """How well `b` fits `a`'s stated preferences."""
    p = a.get("preferences") or {}
    if p.get("surprise_me"):
        return {k: m for k, m in MAX.items()}
    return {
        "Gender": 25 if (not p.get("genders") or b["gender"] in p["genders"]) else 0,
        "Age": _range_score(b["age"], p.get("age_min", 18), p.get("age_max", 99), 15, 5),
        "Height": _range_score(b.get("height_cm", 165), p.get("height_min", 120), p.get("height_max", 230), 5, 0.5),
        "Personality": 10 if (not p.get("personalities") or b["personality"] in p["personalities"]) else 3,
        "Qualities": _overlap(p.get("qualities") or [], b.get("qualities") or [], 15),
        "Dating vibe": 15 if (not p.get("vibes") or b["dating_vibe"] in p["vibes"]) else (5 if a["dating_vibe"] == b["dating_vibe"] else 0),
        "Intention": 10 if (not p.get("intentions") or b["intention"] in p["intentions"]) else 0,
        "Lifestyle": _overlap(p.get("lifestyles") or [], b.get("lifestyle") or [], 5),
    }


MAX = {"Gender": 25, "Age": 15, "Height": 5, "Personality": 10, "Qualities": 15, "Dating vibe": 15, "Intention": 10, "Lifestyle": 5}


def compatibility(a: dict, b: dict) -> tuple[int, list[dict], list[str]]:
    ab, ba = _side(a, b), _side(b, a)
    parts, warnings = [], []
    for label, mx in MAX.items():
        x, y = ab[label], ba[label]
        if x == mx and y == mx:
            note = "Mutual fit"
        elif x == 0 and y == 0:
            note = "No overlap either way"
        elif x >= mx * 0.6 and y >= mx * 0.6:
            note = "Good fit"
        else:
            note = f"Partial ({a['full_name'].split()[0]}: {x}/{mx}, {b['full_name'].split()[0]}: {y}/{mx})"
        parts.append({"label": label, "score": round((x + y) / 2), "max": mx, "note": note})
    if ab["Gender"] == 0 or ba["Gender"] == 0:
        warnings.append("Gender preference not mutual")
    if ab["Age"] < 15 or ba["Age"] < 15:
        warnings.append("Outside preferred age range")
    total = sum(p["score"] for p in parts)
    return total, parts, warnings
