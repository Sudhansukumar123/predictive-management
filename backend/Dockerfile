FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling data packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Start server using $PORT from environment, defaulting to 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
