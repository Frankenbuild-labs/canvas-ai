#!/bin/bash

# Setup script for faceless-video-generator integration

echo "🎬 Setting up Faceless Video Generator..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Check for required environment variables
required_vars=("OPENAI_API_KEY" "FAL_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please add these to your .env file:"
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo "FAL_KEY=your_fal_api_key_here"
    exit 1
fi

# Create output directory
mkdir -p uploads/faceless-videos
echo "✅ Created output directory: uploads/faceless-videos"

# Build Docker image
echo "🔨 Building Docker image..."
docker compose build faceless-video-gen

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Start the service
echo "🚀 Starting faceless-video-generator service..."
docker compose up -d faceless-video-gen

if [ $? -eq 0 ]; then
    echo "✅ Service started successfully"
    echo ""
    echo "📍 Service Details:"
    echo "   - API: http://localhost:8005"
    echo "   - Health: http://localhost:8005/health"
    echo "   - Docs: http://localhost:8005/docs"
    echo ""
    echo "⏳ Waiting for service to be ready..."
    
    # Wait for health check
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:8005/health &> /dev/null; then
            echo "✅ Service is healthy and ready!"
            echo ""
            echo "🎉 Setup complete! You can now:"
            echo "   1. Navigate to http://localhost:3000/social-station/content"
            echo "   2. Start generating faceless videos"
            exit 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    
    echo ""
    echo "⚠️  Service started but health check timed out"
    echo "   Check logs: docker compose logs faceless-video-gen"
else
    echo "❌ Failed to start service"
    exit 1
fi
