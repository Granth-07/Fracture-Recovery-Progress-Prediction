# ============================================================
# Dockerfile — FastAPI backend (fracture recovery dashboard)
# Multi-stage: builder installs deps, runtime is slim.
# ============================================================

# ---- Stage 1: dependency builder ----------------------------
FROM python:3.11-slim AS builder

WORKDIR /install

# Install build tools needed for psycopg2-binary wheel
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --prefix=/deps --no-cache-dir -r requirements.txt


# ---- Stage 2: runtime image ---------------------------------
FROM python:3.11-slim AS runtime

# Non-root user for security
RUN useradd --no-create-home --shell /bin/false appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /deps /usr/local

# Copy application source (backend/app + alembic migrations)
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini

# Ownership
RUN chown -R appuser:appuser /app
USER appuser

# Port exposed by uvicorn (Render will map this to 443 externally)
EXPOSE 8000

# Health-check: poll /health every 30s, allow 5s timeout, 3 retries
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Entry point — reads DATABASE_URL / CORS_ORIGINS / ENV from environment
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
