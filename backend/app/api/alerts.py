from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.database import db_session
from app.core.security import get_current_user


router = APIRouter(prefix="/alerts", tags=["Threat alerts"])


@router.get("")
def list_alerts(current_user=Depends(get_current_user)):
    with db_session() as db:
        alerts = db.execute(
            """
            SELECT id, title, severity, description, created_at
            FROM threat_alerts
            ORDER BY created_at DESC
            LIMIT 12
            """
        ).fetchall()
        high_risk_scans = db.execute(
            """
            SELECT id, prediction, risk_score, created_at
            FROM scans
            WHERE user_id = ? AND risk_score >= 70
            ORDER BY created_at DESC
            LIMIT 5
            """,
            (current_user["id"],),
        ).fetchall()

    scan_alerts = [
        {
            "id": row["id"],
            "title": f"High-risk {row['prediction']} scan",
            "severity": "critical" if row["risk_score"] >= 85 else "high",
            "description": f"Recent scan returned risk score {row['risk_score']}/100.",
            "created_at": row["created_at"],
        }
        for row in high_risk_scans
    ]
    return [dict(row) for row in alerts] + scan_alerts

