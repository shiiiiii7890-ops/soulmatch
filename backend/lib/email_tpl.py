"""SoulMatch match-result email (HTML + plain text), for manual copy-paste sending."""

from html import escape


def fmt_height(cm) -> str:
    """e.g. 168 -> 5'6" (168 cm)"""
    if not cm:
        return ""
    total_in = round(int(cm) / 2.54)
    return f"{total_in // 12}'{total_in % 12}\" ({cm} cm)"


def ig_url(handle: str) -> str:
    return f"https://instagram.com/{handle.lstrip('@')}"


def _rows(m: dict) -> list[tuple[str, str]]:
    rows = [
        ("Age", str(m["age"])),
        ("Height", fmt_height(m.get("height_cm"))),
        ("Gender", m["gender"]),
        ("University", m["college"]),
        ("Branch / Course", m["course"]),
    ]
    if m.get("share_religion") and m.get("religion"):
        rows.append(("Religion", m["religion"]))
    rows += [
        ("Hometown", m["hometown"]),
        ("Qualities", ", ".join(m.get("qualities") or [])),
        ("Dating Vibe", m["dating_vibe"]),
        ("Instagram", "@" + m["instagram"].lstrip("@")),
    ]
    return rows


def build_email(app: dict, matches: list[dict]) -> tuple[str, str, str]:
    first = app["full_name"].split()[0]
    n = len(matches)
    noun = "Match" if n == 1 else "Matches"
    subject = f"Congratulations {first}! ✨ You've Got {n} {noun}!"
    conn = "connection" if n == 1 else "connections"

    cards = []
    for i, m in enumerate(matches, 1):
        rows = "".join(
            f'<tr><td style="padding:6px 0;color:#6E384A;font-size:13px;width:38%;vertical-align:top;">{escape(k)}</td>'
            f'<td style="padding:6px 0;color:#22181C;font-size:14px;font-weight:600;">{escape(v)}</td></tr>'
            for k, v in _rows(m)
        )
        cards.append(f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8DDD5;border-radius:16px;margin:0 0 20px 0;">
<tr><td style="padding:24px 24px 8px 24px;">
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A3485E;font-weight:700;">Match {i} of {n}</div>
<div style="font-family:Georgia,'Playfair Display',serif;font-size:24px;color:#2B0A15;margin-top:6px;">{escape(m['full_name'])}</div>
</td></tr>
<tr><td style="padding:8px 24px 8px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table></td></tr>
<tr><td style="padding:12px 24px 24px 24px;">
<a href="{escape(ig_url(m['instagram']))}" style="display:inline-block;background:#4A1224;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Connect on Instagram</a>
</td></tr></table>""")

    html = f"""<!doctype html><html><body style="margin:0;padding:0;background:#FAF6F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F0;padding:32px 12px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background:#2B0A15;border-radius:20px 20px 0 0;padding:28px 32px;">
<div style="font-family:Georgia,'Playfair Display',serif;font-size:26px;color:#FAF6F0;">Soul<span style="color:#C87389;font-style:italic;">Match</span></div>
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D6C1CA;margin-top:4px;">Find Your Person.</div>
</td></tr>
<tr><td style="background:#FCEEF2;padding:32px;">
<p style="font-family:Georgia,'Playfair Display',serif;font-size:22px;color:#2B0A15;margin:0 0 16px 0;">Dear {escape(first)},</p>
<p style="font-size:15px;line-height:1.6;color:#22181C;margin:0 0 12px 0;">We're thrilled to share your SoulMatch results!</p>
<p style="font-size:15px;line-height:1.6;color:#22181C;margin:0 0 24px 0;">After reviewing your preferences and personality, our team has found <strong>{n} compatible {conn}</strong> for you.</p>
{''.join(cards)}
<p style="font-size:15px;line-height:1.6;color:#22181C;margin:8px 0 12px 0;">Be yourself, start with a simple hello, and let things happen naturally.</p>
<p style="font-size:15px;line-height:1.6;color:#22181C;margin:0 0 20px 0;">Thank you for choosing SoulMatch. May this connection bring you joy, laughter and beautiful memories!</p>
<p style="font-size:15px;line-height:1.6;color:#22181C;margin:0;">With love,<br><strong style="color:#4A1224;">Team SoulMatch ❤️</strong></p>
</td></tr>
<tr><td style="background:#FFFFFF;border-radius:0 0 20px 20px;padding:18px 32px;font-size:11px;color:#6E5B63;line-height:1.5;">
Match details are shared only with you, based on the consent given at registration. Please don't forward this email. Compatibility is an estimate, not a guarantee.
</td></tr>
</table></td></tr></table></body></html>"""

    lines = [
        f"Dear {first},", "",
        "We're thrilled to share your SoulMatch results!", "",
        f"After reviewing your preferences and personality, our team has found {n} compatible {conn} for you.", "",
    ]
    for i, m in enumerate(matches, 1):
        lines.append(f"— Match {i} of {n}: {m['full_name']}")
        for k, v in _rows(m):
            lines.append(f"   {k}: {v}")
        lines.append(f"   Connect on Instagram: {ig_url(m['instagram'])}")
        lines.append("")
    lines += [
        "Be yourself, start with a simple hello, and let things happen naturally.", "",
        "Thank you for choosing SoulMatch. May this connection bring you joy, laughter and beautiful memories!", "",
        "With love,", "Team SoulMatch ❤️",
    ]
    return subject, html, "\n".join(lines)
