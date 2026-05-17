from __future__ import annotations

import re


SUSPICIOUS_KEYWORDS: dict[str, tuple[str, int]] = {
    "verify your account": ("credential", 95),
    "password expires": ("credential", 90),
    "reset your password": ("credential", 75),
    "login immediately": ("credential", 82),
    "confirm your identity": ("credential", 80),
    "account suspended": ("account", 92),
    "unusual activity": ("account", 72),
    "security alert": ("account", 64),
    "payment failed": ("payment", 74),
    "invoice attached": ("payment", 62),
    "wire transfer": ("payment", 88),
    "gift card": ("scam", 95),
    "crypto wallet": ("scam", 85),
    "lottery winner": ("scam", 92),
    "claim your prize": ("scam", 90),
    "limited time": ("urgency", 60),
    "act now": ("urgency", 78),
    "urgent action required": ("urgency", 85),
    "final notice": ("urgency", 68),
    "confidential": ("social_engineering", 58),
    "do not share": ("social_engineering", 50),
    "kindly send": ("social_engineering", 55),
    "bank details": ("financial", 86),
    "ssn": ("personal_data", 82),
    "social security": ("personal_data", 86),
    "one-time password": ("credential", 94),
    "otp": ("credential", 84),
}


URL_PATTERN = re.compile(
    r"(?P<url>(?:https?://|www\.)[^\s<>\"]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[^\s<>\"]*)",
    re.IGNORECASE,
)


def extract_urls(text: str) -> list[str]:
    urls: list[str] = []
    for match in URL_PATTERN.finditer(text):
        url = match.group("url").strip(".,);]'\"")
        if url not in urls:
            urls.append(url)
    return urls


def extract_suspicious_keywords(text: str) -> list[dict]:
    hits: list[dict] = []
    seen: set[tuple[str, int]] = set()
    for keyword, (category, risk) in SUSPICIOUS_KEYWORDS.items():
        pattern = re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)
        for match in pattern.finditer(text):
            key = (keyword.lower(), match.start())
            if key in seen:
                continue
            seen.add(key)
            hits.append(
                {
                    "keyword": match.group(0),
                    "category": category,
                    "risk": risk,
                    "start": match.start(),
                    "end": match.end(),
                }
            )
    hits.sort(key=lambda hit: (hit["start"], -hit["risk"]))
    return hits

