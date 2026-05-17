from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.database import db_session, utc_now
from app.core.security import get_current_user, get_optional_user
from app.schemas.scan import AnalyticsSummary, PredictionResponse, ScanRequest, UrlScanRequest
from app.services.ml_service import cybershield_model
from app.services.pdf_report import create_scan_report_pdf


router = APIRouter(tags=["Scans"])


def _scan_from_row(row) -> dict:
    return {
        "scan_id": row["id"],
        "content": row["content"],
        "content_preview": row["content"][:180],
        "content_type": row["content_type"],
        "prediction": row["prediction"],
        "confidence": row["confidence"],
        "risk_score": row["risk_score"],
        "suspicious_keywords": json.loads(row["suspicious_keywords"]),
        "detected_urls": json.loads(row["detected_urls"]),
        "reasons": json.loads(row["reasons"]),
        "created_at": row["created_at"],
    }


def _persist_scan(content: str, prediction: dict, user_id: int | None) -> dict:
    scan_id = str(uuid.uuid4())
    created_at = utc_now()
    record = {
        "scan_id": scan_id,
        "content": content,
        "content_type": prediction["content_type"],
        "prediction": prediction["prediction"],
        "confidence": prediction["confidence"],
        "risk_score": prediction["risk_score"],
        "suspicious_keywords": prediction["suspicious_keywords"],
        "detected_urls": prediction["detected_urls"],
        "reasons": prediction["reasons"],
        "created_at": created_at,
    }
    with db_session() as db:
        db.execute(
            """
            INSERT INTO scans (
                id, user_id, content, content_type, prediction, confidence,
                risk_score, suspicious_keywords, detected_urls, reasons, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                user_id,
                content,
                prediction["content_type"],
                prediction["prediction"],
                prediction["confidence"],
                prediction["risk_score"],
                json.dumps(prediction["suspicious_keywords"]),
                json.dumps(prediction["detected_urls"]),
                json.dumps(prediction["reasons"]),
                created_at,
            ),
        )
    return record


@router.post("/scan/predict", response_model=PredictionResponse)
def predict_scan(payload: ScanRequest, current_user=Depends(get_optional_user)):
    prediction = cybershield_model.predict(payload.content, payload.content_type)
    return _persist_scan(payload.content, prediction, current_user["id"] if current_user else None)


@router.post("/scan/url", response_model=PredictionResponse)
def scan_url(payload: UrlScanRequest, current_user=Depends(get_optional_user)):
    prediction = cybershield_model.predict(payload.url, "url")
    return _persist_scan(payload.url, prediction, current_user["id"] if current_user else None)


@router.get("/scan/history")
def history(current_user=Depends(get_current_user)):
    with db_session() as db:
        rows = db.execute(
            """
            SELECT * FROM scans
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (current_user["id"],),
        ).fetchall()
    return [_scan_from_row(row) for row in rows]


@router.get("/scan/{scan_id}/report")
def export_report(scan_id: str, current_user=Depends(get_current_user)):
    with db_session() as db:
        row = db.execute(
            "SELECT * FROM scans WHERE id = ? AND user_id = ?",
            (scan_id, current_user["id"]),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scan report not found")

    scan = _scan_from_row(row)
    pdf = create_scan_report_pdf(scan, current_user)
    headers = {"Content-Disposition": f'attachment; filename="cybershield-{scan_id}.pdf"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def analytics(current_user=Depends(get_current_user)):
    with db_session() as db:
        rows = db.execute(
            """
            SELECT prediction, confidence, risk_score, created_at
            FROM scans
            WHERE user_id = ?
            """,
            (current_user["id"],),
        ).fetchall()

    total = len(rows)
    counts = {"phishing": 0, "scam": 0, "safe": 0}
    confidence_total = 0.0
    risk_total = 0
    now = datetime.now(timezone.utc)
    trend_seed = {
        (now - timedelta(days=offset)).date().isoformat(): {
            "phishing": 0,
            "scam": 0,
            "safe": 0,
        }
        for offset in range(6, -1, -1)
    }
    trend = defaultdict(lambda: {"phishing": 0, "scam": 0, "safe": 0})
    trend.update(trend_seed)

    for row in rows:
        prediction = row["prediction"]
        counts[prediction] = counts.get(prediction, 0) + 1
        confidence_total += float(row["confidence"])
        risk_total += int(row["risk_score"])
        date = row["created_at"][:10]
        if date in trend:
            trend[date][prediction] += 1

    return {
        "total_scans": total,
        "phishing_count": counts["phishing"],
        "scam_count": counts["scam"],
        "safe_count": counts["safe"],
        "average_confidence": round(confidence_total / total, 2) if total else 0,
        "average_risk": round(risk_total / total, 2) if total else 0,
        "label_breakdown": [
            {"label": "Phishing", "count": counts["phishing"]},
            {"label": "Scam", "count": counts["scam"]},
            {"label": "Safe", "count": counts["safe"]},
        ],
        "trend": [
            {
                "date": date[-5:],
                "phishing": values["phishing"],
                "scam": values["scam"],
                "safe": values["safe"],
            }
            for date, values in sorted(trend.items())
        ],
    }


@router.post("/scanner/simulate")
def simulate_email_scanner(current_user=Depends(get_current_user)):
    samples = [
        "Security alert: unusual activity detected. Verify your account at https://secure-paypal-login.xyz/update",
        "Your weekly payroll summary is attached. Please review it when convenient.",
        "Congratulations lottery winner. Claim your prize and send bank details today.",
        "Can you approve the quarterly vendor invoice before the 4 PM finance review?",
    ]
    results = []
    for sample in samples:
        prediction = cybershield_model.predict(sample, "email")
        results.append(_persist_scan(sample, prediction, current_user["id"]))
    return {"processed": len(results), "results": results}

