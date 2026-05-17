from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import sqlite3
import uuid

from app.core.config import DATABASE_PATH


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def db_session():
    connection = connect_db()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_session() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                risk_score INTEGER NOT NULL,
                suspicious_keywords TEXT NOT NULL,
                detected_urls TEXT NOT NULL,
                reasons TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS threat_alerts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        alert_count = db.execute("SELECT COUNT(*) AS count FROM threat_alerts").fetchone()[
            "count"
        ]
        if alert_count == 0:
            seed_alerts(db)


def seed_alerts(db: sqlite3.Connection) -> None:
    alerts = [
        (
            "Credential harvesting campaign detected",
            "critical",
            "Multiple messages impersonating cloud storage providers are asking users to re-verify passwords.",
        ),
        (
            "Gift card scam keywords trending",
            "high",
            "Scans containing urgent purchase language and gift card requests increased in the last 24 hours.",
        ),
        (
            "Lookalike banking domains observed",
            "medium",
            "Several URLs include hyphenated banking brand names and non-standard top-level domains.",
        ),
    ]
    now = utc_now()
    for title, severity, description in alerts:
        db.execute(
            """
            INSERT INTO threat_alerts (id, title, severity, description, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), title, severity, description, now),
        )

