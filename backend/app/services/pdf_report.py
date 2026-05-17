from __future__ import annotations

import textwrap


def _escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _pdf_line(text: str, y: int, size: int = 10) -> str:
    return f"BT /F1 {size} Tf 54 {y} Td ({_escape_pdf_text(text)}) Tj ET\n"


def create_scan_report_pdf(scan: dict, user: dict | None = None) -> bytes:
    title = "CyberShield AI Scan Report"
    analyst = user["email"] if user else "anonymous scan"
    keyword_text = ", ".join(item["keyword"] for item in scan["suspicious_keywords"]) or "None"
    url_text = ", ".join(item["domain"] or item["url"] for item in scan["detected_urls"]) or "None"
    reasons = scan["reasons"] or []
    body_lines = [
        f"Report ID: {scan['scan_id']}",
        f"Analyst: {analyst}",
        f"Created: {scan['created_at']}",
        f"Prediction: {scan['prediction'].upper()}",
        f"Confidence: {scan['confidence']:.2f}%",
        f"Risk Score: {scan['risk_score']}/100",
        f"Content Type: {scan['content_type']}",
        f"Suspicious Keywords: {keyword_text}",
        f"Detected URLs: {url_text}",
        "",
        "Reasons:",
    ]
    body_lines.extend([f"- {reason}" for reason in reasons])
    body_lines.extend(["", "Content Preview:"])
    body_lines.extend(textwrap.wrap(scan["content"][:900], width=96) or ["No content"])

    stream = _pdf_line(title, 780, 18)
    y = 744
    for line in body_lines:
        if y < 54:
            break
        for wrapped in textwrap.wrap(line, width=100) if line else [""]:
            stream += _pdf_line(wrapped, y, 10)
            y -= 16

    stream_bytes = stream.encode("latin-1", errors="replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream_bytes)).encode("ascii") + b" >>\nstream\n" + stream_bytes + b"endstream",
    ]

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{index} 0 obj\n".encode("ascii") + obj + b"\nendobj\n"

    xref_start = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")
    pdf += (
        b"trailer\n"
        + f"<< /Root 1 0 R /Size {len(objects) + 1} >>\n".encode("ascii")
        + b"startxref\n"
        + str(xref_start).encode("ascii")
        + b"\n%%EOF\n"
    )
    return pdf

