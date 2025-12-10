FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tzdata \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app-automatic-screening

# Copy requirements and install dependencies
COPY docker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spacy model
RUN python -m spacy download en_core_web_md

# Copy application
COPY . .

# Expose port
EXPOSE 5010

# Run application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5010"]