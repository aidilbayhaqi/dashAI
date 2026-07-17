# syntax=docker/dockerfile:1.8

FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

RUN python -m venv /opt/venv

ENV PATH="/opt/venv/bin:${PATH}"

COPY requirements*.txt ./

RUN --mount=type=cache,target=/root/.cache/pip \
    if [ -f requirements.txt ]; then \
        pip install --upgrade pip setuptools wheel \
        && pip install -r requirements.txt; \
    else \
        echo "requirements.txt tidak ditemukan" >&2; \
        exit 1; \
    fi


FROM python:3.12-slim AS runtime

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    RUN_MIGRATIONS=false

WORKDIR /app

RUN groupadd --gid 10001 app \
    && useradd \
        --uid 10001 \
        --gid app \
        --create-home \
        --shell /usr/sbin/nologin \
        app \
    && mkdir -p /app/uploads /app/logs \
    && chown -R app:app /app

COPY --from=builder /opt/venv /opt/venv

COPY --chown=app:app . /app
# Simpan entrypoint di luar /app agar tidak tertimpa bind mount Docker Compose.
COPY docker-entrypoint.sh /usr/local/bin/dashai-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/dashai-entrypoint \
    && chmod 0755 /usr/local/bin/dashai-entrypoint
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; port=os.getenv('PORT','8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/ready', timeout=3)" || exit 1

ENTRYPOINT ["/usr/local/bin/dashai-entrypoint"]

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
