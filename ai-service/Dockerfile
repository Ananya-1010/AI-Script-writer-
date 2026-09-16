FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# Shell form on purpose: hosts assign the port at runtime through $PORT, and the
# exec form cannot expand it. Binding to a hardcoded 8000 is the most common
# reason a container passes locally and never becomes healthy on a platform.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
