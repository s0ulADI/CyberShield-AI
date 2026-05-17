from pathlib import Path
import os


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"
DATASETS_DIR = ROOT_DIR / "datasets"
MODEL_DIR = ROOT_DIR / "models"
REPORTS_DIR = BACKEND_DIR / "reports"

DATABASE_PATH = Path(os.getenv("CYBERSHIELD_DB", BACKEND_DIR / "cybershield.db"))
MODEL_PATH = Path(os.getenv("CYBERSHIELD_MODEL", MODEL_DIR / "cybershield_pipeline.joblib"))
MODEL_METADATA_PATH = Path(
    os.getenv("CYBERSHIELD_MODEL_METADATA", MODEL_DIR / "cybershield_metadata.json")
)
DATASET_PATH = Path(
    os.getenv("CYBERSHIELD_DATASET", DATASETS_DIR / "sample_phishing_dataset.csv")
)

APP_NAME = "CyberShield AI"
API_PREFIX = "/api"
JWT_SECRET = os.getenv("CYBERSHIELD_JWT_SECRET", "change-this-development-secret")
JWT_EXPIRATION_MINUTES = int(os.getenv("CYBERSHIELD_JWT_EXPIRATION_MINUTES", "1440"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CYBERSHIELD_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

MODEL_DIR.mkdir(parents=True, exist_ok=True)
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

