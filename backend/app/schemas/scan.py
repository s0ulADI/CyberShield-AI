from typing import Literal

from pydantic import BaseModel, Field


PredictionLabel = Literal["phishing", "scam", "safe"]


class ScanRequest(BaseModel):
    content: str = Field(min_length=3, max_length=12000)
    content_type: Literal["auto", "email", "message", "url"] = "auto"


class UrlScanRequest(BaseModel):
    url: str = Field(min_length=5, max_length=2048)


class KeywordHit(BaseModel):
    keyword: str
    category: str
    risk: int
    start: int
    end: int


class UrlFinding(BaseModel):
    url: str
    domain: str
    risk_score: int
    is_suspicious: bool
    reasons: list[str]


class PredictionResponse(BaseModel):
    scan_id: str
    prediction: PredictionLabel
    confidence: float
    risk_score: int
    content_type: str
    suspicious_keywords: list[KeywordHit]
    detected_urls: list[UrlFinding]
    reasons: list[str]
    created_at: str


class ScanHistoryItem(PredictionResponse):
    content_preview: str


class AnalyticsPoint(BaseModel):
    label: str
    count: int


class TrendPoint(BaseModel):
    date: str
    phishing: int
    scam: int
    safe: int


class AnalyticsSummary(BaseModel):
    total_scans: int
    phishing_count: int
    scam_count: int
    safe_count: int
    average_confidence: float
    average_risk: float
    label_breakdown: list[AnalyticsPoint]
    trend: list[TrendPoint]

