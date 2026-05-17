from __future__ import annotations

from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import DATASET_PATH, MODEL_METADATA_PATH, MODEL_PATH
from app.services.ml_service import train_model


if __name__ == "__main__":
    metadata = train_model(DATASET_PATH, MODEL_PATH, MODEL_METADATA_PATH)
    print("CyberShield AI model trained")
    print(f"Dataset: {metadata['dataset']}")
    print(f"Samples: {metadata['samples']}")
    print(f"Accuracy: {metadata['accuracy']}")
    print(f"Model: {MODEL_PATH}")
    print(f"Metadata: {MODEL_METADATA_PATH}")

