FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Clone the faceless-video-generator repository
RUN git clone https://github.com/jacky-xbb/faceless-video-generator.git /app/generator

# Copy requirements and install Python dependencies
WORKDIR /app/generator

# Modify requirements.txt to use fal_client instead of replicate
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y replicate && \
    pip install --no-cache-dir fal_client

# Install FastAPI for API wrapper
RUN pip install --no-cache-dir fastapi uvicorn python-multipart

# Copy our API wrapper
COPY api.py /app/api.py

# Create output directory
RUN mkdir -p /app/output

# Expose port
EXPOSE 8005

# Run FastAPI server
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8005"]
