# CyberShield AI

CyberShield AI is a full-stack cybersecurity SaaS demo that detects phishing emails, scam messages, and suspicious URLs using NLP, scikit-learn, and URL heuristics.

## Features

- React + Tailwind CSS dark cybersecurity dashboard
- FastAPI REST backend with OpenAPI docs
- JWT-style authentication without external auth services
- SQLite scan history
- TF-IDF vectorization + Logistic Regression classifier
- Confidence scoring and risk scoring
- Suspicious keyword extraction with highlighted matches
- Malicious URL analysis for fake links, shorteners, risky TLDs, IP hosts, and brand impersonation
- Analytics charts and recent scan history
- Real-time threat alert feed
- Email scanner simulation
- PDF scan report export

## Folder Structure

```text
frontend/    React, Vite, Tailwind UI
backend/     FastAPI app, auth, routes, SQLite storage
models/      ML training script and generated model artifacts
datasets/    Sample phishing/scam/safe CSV dataset
```

## Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd ..
python models\train_model.py
cd backend
uvicorn app.main:app --reload
```

API docs will be available at:

```text
http://localhost:8000/docs
```

## Frontend Setup

PowerShell may block `npm.ps1`, so use `npm.cmd` on Windows:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

If the backend runs somewhere else, create `frontend/.env`:

```text
VITE_API_URL=http://localhost:8000
```

## API Routes

```text
GET    /health
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me
POST   /api/scan/predict
POST   /api/scan/url
GET    /api/scan/history
GET    /api/analytics/summary
GET    /api/alerts
POST   /api/scanner/simulate
GET    /api/scan/{scan_id}/report
```

## Training With Kaggle Data

The included `datasets/sample_phishing_dataset.csv` keeps the project runnable immediately. To use a public Kaggle phishing email dataset:

1. Download a CSV from Kaggle.
2. Normalize it to two columns:

```text
text,label
```

3. Valid labels are:

```text
phishing
scam
safe
```

4. Replace `datasets/sample_phishing_dataset.csv`, or set:

```powershell
$env:CYBERSHIELD_DATASET="C:\path\to\your\dataset.csv"
python models\train_model.py
```

Generated artifacts:

```text
models/cybershield_pipeline.joblib
models/cybershield_metadata.json
```

## Deployment

Backend options:

- Render, Railway, Fly.io, Azure App Service, or a VM running `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Set `CYBERSHIELD_JWT_SECRET` to a long random value
- Mount or persist `backend/cybershield.db` for scan history

Frontend options:

- Vercel, Netlify, Cloudflare Pages, or static hosting after `npm.cmd run build`
- Set `VITE_API_URL` to the deployed backend URL

Production checklist:

- Replace the sample dataset with a larger, reviewed phishing corpus
- Retrain the model and review `models/cybershield_metadata.json`
- Enable HTTPS
- Restrict CORS with `CYBERSHIELD_ALLOWED_ORIGINS`
- Store secrets in the hosting provider secret manager
- Add rate limiting and request logging before public exposure

