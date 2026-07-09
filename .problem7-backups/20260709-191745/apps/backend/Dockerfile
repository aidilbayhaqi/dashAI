FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN pip install --upgrade pip \
    && pip install \
        -r /app/requirements.txt

COPY . /app

COPY docker-entrypoint.sh \
    /usr/local/bin/dashai-entrypoint

RUN chmod +x \
    /usr/local/bin/dashai-entrypoint

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/dashai-entrypoint"]

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]