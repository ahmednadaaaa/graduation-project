# ── UniTrack Dockerfile ──────────────────────────────────────────────────────
# Python 3.11 — required for face_recognition library compatibility
FROM python:3.11-slim

# System dependencies for face_recognition (dlib, cmake, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-6 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files (frontend/dist must be built before this step in CI)
# Runs with production settings via DJANGO_SETTINGS_MODULE env var in compose
RUN DJANGO_SETTINGS_MODULE=unitrack.settings.production \
    python manage.py collectstatic --noinput || true

EXPOSE 8000

# Default: run Daphne ASGI server (supports HTTP + WebSocket)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "unitrack.asgi:application"]
