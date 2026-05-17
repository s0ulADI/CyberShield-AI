from __future__ import annotations

from collections import Counter
from pathlib import Path
import json
import math

import joblib

from app.core.config import DATASET_PATH, MODEL_METADATA_PATH, MODEL_PATH
from app.services.keyword_service import extract_suspicious_keywords
from app.services.url_analyzer import analyze_url, analyze_urls_in_text


LABELS = ("phishing", "scam", "safe")


def train_model(
    dataset_path: Path = DATASET_PATH,
    model_path: Path = MODEL_PATH,
    metadata_path: Path = MODEL_METADATA_PATH,
) -> dict:
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, classification_report
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline

    data = pd.read_csv(dataset_path)
    required_columns = {"text", "label"}
    if not required_columns.issubset(data.columns):
        missing = ", ".join(sorted(required_columns - set(data.columns)))
        raise ValueError(f"Dataset is missing required columns: {missing}")

    data = data.dropna(subset=["text", "label"])
    data["label"] = data["label"].str.lower().str.strip()
    data = data[data["label"].isin(LABELS)]

    x_train, x_test, y_train, y_test = train_test_split(
        data["text"],
        data["label"],
        test_size=0.25,
        random_state=42,
        stratify=data["label"],
    )

    pipeline = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    stop_words="english",
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=6000,
                    sublinear_tf=True,
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1200,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    metadata = {
        "model_type": "TF-IDF + LogisticRegression",
        "dataset": str(dataset_path),
        "labels": list(LABELS),
        "samples": int(len(data)),
        "class_distribution": Counter(data["label"]).copy(),
        "accuracy": round(float(accuracy), 4),
        "classification_report": classification_report(
            y_test,
            predictions,
            labels=list(LABELS),
            output_dict=True,
            zero_division=0,
        ),
    }
    metadata["class_distribution"] = dict(metadata["class_distribution"])
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


class CyberShieldModel:
    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self.pipeline = None

    def load(self) -> None:
        if not self.model_path.exists():
            train_model()
        self.pipeline = joblib.load(self.model_path)

    def predict(self, content: str, content_type: str = "auto") -> dict:
        if self.pipeline is None:
            self.load()

        normalized_type = self._detect_content_type(content, content_type)
        probabilities = self._model_probabilities(content)
        keyword_hits = extract_suspicious_keywords(content)
        url_findings = (
            [analyze_url(content)]
            if normalized_type == "url"
            else analyze_urls_in_text(content)
        )
        blended = self._blend_with_security_heuristics(
            probabilities, keyword_hits, url_findings, normalized_type
        )
        prediction = max(blended, key=blended.get)
        confidence = round(
            self._confidence_with_security_floor(
                prediction, float(blended[prediction] * 100), keyword_hits, url_findings
            ),
            2,
        )
        risk_score = self._risk_score(prediction, confidence, keyword_hits, url_findings)

        reasons = self._build_reasons(
            prediction, confidence, probabilities, keyword_hits, url_findings
        )
        return {
            "prediction": prediction,
            "confidence": confidence,
            "risk_score": risk_score,
            "content_type": normalized_type,
            "suspicious_keywords": keyword_hits,
            "detected_urls": url_findings,
            "reasons": reasons,
        }

    def _model_probabilities(self, content: str) -> dict[str, float]:
        assert self.pipeline is not None
        classes = list(self.pipeline.classes_)
        proba = self.pipeline.predict_proba([content])[0]
        probabilities = {label: 0.0 for label in LABELS}
        for label, probability in zip(classes, proba, strict=False):
            probabilities[label] = float(probability)
        return probabilities

    def _blend_with_security_heuristics(
        self,
        probabilities: dict[str, float],
        keyword_hits: list[dict],
        url_findings: list[dict],
        content_type: str,
    ) -> dict[str, float]:
        heuristic = {"phishing": 0.0, "scam": 0.0, "safe": 0.15}
        for hit in keyword_hits:
            category = hit["category"]
            weight = hit["risk"] / 100
            if category in {"credential", "account", "personal_data"}:
                heuristic["phishing"] += 0.22 * weight
            elif category in {"payment", "financial"}:
                heuristic["phishing"] += 0.13 * weight
                heuristic["scam"] += 0.12 * weight
            elif category in {"scam", "social_engineering", "urgency"}:
                heuristic["scam"] += 0.2 * weight

        for finding in url_findings:
            url_weight = finding["risk_score"] / 100
            if finding["risk_score"] >= 65:
                heuristic["phishing"] += 0.42 * url_weight
            elif finding["risk_score"] >= 40:
                heuristic["scam"] += 0.32 * url_weight
            else:
                heuristic["safe"] += 0.08

        if content_type == "url" and url_findings:
            heuristic["phishing"] += 0.1

        if not keyword_hits and not any(item["is_suspicious"] for item in url_findings):
            heuristic["safe"] += 0.25

        total_heuristic = sum(heuristic.values()) or 1
        heuristic = {key: value / total_heuristic for key, value in heuristic.items()}
        blended = {
            label: (probabilities.get(label, 0.0) * 0.72) + (heuristic[label] * 0.28)
            for label in LABELS
        }
        total_blended = sum(blended.values()) or 1
        return {label: value / total_blended for label, value in blended.items()}

    def _risk_score(
        self,
        prediction: str,
        confidence: float,
        keyword_hits: list[dict],
        url_findings: list[dict],
    ) -> int:
        keyword_score = max([hit["risk"] for hit in keyword_hits], default=0)
        url_score = max([finding["risk_score"] for finding in url_findings], default=0)
        base = confidence if prediction != "safe" else 100 - confidence
        score = max(base, keyword_score * 0.72, url_score)
        return int(min(100, max(0, math.ceil(score))))

    def _confidence_with_security_floor(
        self,
        prediction: str,
        model_confidence: float,
        keyword_hits: list[dict],
        url_findings: list[dict],
    ) -> float:
        if prediction == "safe":
            return model_confidence

        keyword_score = max([hit["risk"] for hit in keyword_hits], default=0)
        url_score = max([finding["risk_score"] for finding in url_findings], default=0)
        if keyword_score == 0 and url_score == 0:
            return model_confidence

        evidence_floor = 54 + (keyword_score * 0.22) + (url_score * 0.24)
        if keyword_hits and url_findings:
            evidence_floor += 6
        return min(98.0, max(model_confidence, evidence_floor))

    def _build_reasons(
        self,
        prediction: str,
        confidence: float,
        probabilities: dict[str, float],
        keyword_hits: list[dict],
        url_findings: list[dict],
    ) -> list[str]:
        reasons = [
            f"ML classifier favored {prediction} with {confidence:.2f}% confidence",
        ]
        top_terms = [hit["keyword"] for hit in keyword_hits[:5]]
        if top_terms:
            reasons.append("Suspicious language detected: " + ", ".join(top_terms))
        suspicious_urls = [finding for finding in url_findings if finding["is_suspicious"]]
        if suspicious_urls:
            reasons.append(
                f"{len(suspicious_urls)} suspicious URL pattern(s) found in the scan"
            )
            reasons.extend(suspicious_urls[0]["reasons"][:3])
        if not top_terms and not suspicious_urls and prediction == "safe":
            reasons.append("No urgent credential, payment, or fake-link indicators found")
        if max(probabilities.values()) < 0.45:
            reasons.append("Classifier confidence is mixed; review highlighted indicators")
        return reasons[:7]

    def _detect_content_type(self, content: str, requested_type: str) -> str:
        if requested_type != "auto":
            return requested_type
        stripped = content.strip()
        if "\n" in stripped or len(stripped.split()) > 12:
            return "email"
        if stripped.startswith(("http://", "https://", "www.")) or "." in stripped.split()[0]:
            return "url"
        return "message"


cybershield_model = CyberShieldModel()
