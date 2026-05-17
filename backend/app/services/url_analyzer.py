from __future__ import annotations

from ipaddress import ip_address
import re
from urllib.parse import urlparse

from app.services.keyword_service import extract_urls


SHORTENER_DOMAINS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "cutt.ly",
}

HIGH_RISK_TLDS = {"zip", "mov", "top", "xyz", "click", "country", "gq", "tk", "ml"}
BRAND_TERMS = {
    "paypal",
    "microsoft",
    "google",
    "apple",
    "amazon",
    "netflix",
    "bank",
    "office365",
    "facebook",
}


def normalize_url(url: str) -> str:
    cleaned = url.strip()
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", cleaned):
        return f"https://{cleaned}"
    return cleaned


def _is_ip_hostname(hostname: str) -> bool:
    try:
        ip_address(hostname)
        return True
    except ValueError:
        return False


def analyze_url(url: str) -> dict:
    normalized = normalize_url(url)
    parsed = urlparse(normalized)
    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""
    full_url = normalized.lower()
    reasons: list[str] = []
    score = 0

    if parsed.scheme != "https":
        score += 18
        reasons.append("URL does not use HTTPS")

    if "@" in normalized:
        score += 25
        reasons.append("URL contains an @ symbol, which can hide the real destination")

    if _is_ip_hostname(hostname):
        score += 28
        reasons.append("URL uses a raw IP address instead of a normal domain")

    if len(normalized) > 90:
        score += 12
        reasons.append("URL is unusually long")

    if hostname.count(".") >= 3:
        score += 14
        reasons.append("Domain has many subdomains")

    if hostname.count("-") >= 2:
        score += 10
        reasons.append("Domain contains repeated hyphens")

    if "%" in normalized or "xn--" in hostname:
        score += 18
        reasons.append("URL contains encoded or internationalized characters")

    domain_parts = hostname.split(".")
    tld = domain_parts[-1] if domain_parts else ""
    if tld in HIGH_RISK_TLDS:
        score += 20
        reasons.append(f"Top-level domain .{tld} is frequently abused in scams")

    if hostname in SHORTENER_DOMAINS or any(hostname.endswith(f".{d}") for d in SHORTENER_DOMAINS):
        score += 16
        reasons.append("URL uses a link shortener")

    for brand in BRAND_TERMS:
        if brand in hostname and not hostname.endswith(f"{brand}.com"):
            score += 16
            reasons.append(f"Domain appears to reference {brand} outside its official host")
            break

    if re.search(r"(login|verify|secure|account|update|wallet|invoice)", path, re.IGNORECASE):
        score += 10
        reasons.append("URL path contains credential or payment themed words")

    if re.search(r"(free|prize|bonus|airdrop|giveaway)", full_url, re.IGNORECASE):
        score += 12
        reasons.append("URL contains promotional scam language")

    if not hostname:
        score += 25
        reasons.append("URL could not be parsed into a valid domain")

    score = min(score, 100)
    if not reasons:
        reasons.append("No high-risk URL structure detected")

    return {
        "url": url,
        "domain": hostname,
        "risk_score": score,
        "is_suspicious": score >= 40,
        "reasons": reasons,
    }


def analyze_urls_in_text(text: str) -> list[dict]:
    return [analyze_url(url) for url in extract_urls(text)]

