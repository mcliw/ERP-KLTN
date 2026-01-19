# face-recognition-attendance-system

Simple face-recognition attendance web app using MediaPipe (face detection) and FaceNet (embeddings via `facenet-pytorch`).

This repo contains a FastAPI backend that exposes endpoints to enroll users and recognize faces, plus a minimal static frontend that captures webcam frames and calls the API.

Quick start (Windows PowerShell):

1. Create and activate a virtual environment (recommended):

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the server:

```powershell
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. Open `http://localhost:8000` in your browser. Use the UI to enroll a user (provide name + capture) and then recognize.

Notes:
- `torch` installation on Windows may require a specific wheel depending on CUDA or CPU. If `pip install -r requirements.txt` fails for `torch`, follow instructions at https://pytorch.org/get-started/locally/ to install the correct `torch` + `torchvision` build for your environment, then re-run `pip install -r requirements.txt` to install the remaining packages.
- The default embedding distance threshold is conservative; tune `app/recognition.py` -> `self.threshold` for your environment.

PostgreSQL schema (optional)
-- If you prefer to use PostgreSQL for relational data, a migration script is provided at `migrations/init_postgres.sql`.
-- Note: embeddings/vectors are stored in ChromaDB (in `data/chroma`) because `pgvector` can be difficult to install on Windows.

To run the migration helper (requires a running Postgres server and `DATABASE_URL` env var):

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/yourdb"
python -m app.pg_migrate
```

This will create the following tables in PostgreSQL: `departments`, `employees`, `face_embeddings` (metadata/chroma id), `attendance`, and `users`.

You can continue using the local SQLite DB that the app creates by default (`data/embeddings.db`) for quick demos, while ChromaDB persists vectors in `data/chroma`.

Files added:
- `app/` : FastAPI app and recognition code
- `static/` : frontend HTML/JS
- `requirements.txt`

If you want, I can run quick sanity checks or help you tweak thresholds and storage strategy.