FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY services/scheduler/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependencies for PostgreSQL
RUN pip install --no-cache-dir psycopg2-binary

# Copy application code
COPY services/scheduler/ .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Run application
CMD ["python", "main.py"]