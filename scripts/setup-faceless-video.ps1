# Setup script for faceless-video-generator integration (Windows)

Write-Host "🎬 Setting up Faceless Video Generator..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found. Please create one from .env.example" -ForegroundColor Red
    exit 1
}

# Check for required environment variables
$envContent = Get-Content .env -Raw
$requiredVars = @("OPENAI_API_KEY", "FAL_KEY")
$missingVars = @()

foreach ($var in $requiredVars) {
    if ($envContent -notmatch "^$var=") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Please add these to your .env file:" -ForegroundColor Yellow
    Write-Host "OPENAI_API_KEY=your_openai_api_key_here"
    Write-Host "FAL_KEY=your_fal_api_key_here"
    exit 1
}

# Create output directory
$outputDir = "uploads\faceless-videos"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "✅ Created output directory: $outputDir" -ForegroundColor Green
} else {
    Write-Host "✅ Output directory exists: $outputDir" -ForegroundColor Green
}

# Build Docker image
Write-Host "🔨 Building Docker image..." -ForegroundColor Cyan
docker compose build faceless-video-gen

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

# Start the service
Write-Host "🚀 Starting faceless-video-generator service..." -ForegroundColor Cyan
docker compose up -d faceless-video-gen

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service started successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Service Details:" -ForegroundColor Cyan
    Write-Host "   - API: http://localhost:8005"
    Write-Host "   - Health: http://localhost:8005/health"
    Write-Host "   - Docs: http://localhost:8005/docs"
    Write-Host ""
    Write-Host "⏳ Waiting for service to be ready..." -ForegroundColor Yellow
    
    # Wait for health check
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8005/health" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host ""
                Write-Host "✅ Service is healthy and ready!" -ForegroundColor Green
                Write-Host ""
                Write-Host "🎉 Setup complete! You can now:" -ForegroundColor Cyan
                Write-Host "   1. Navigate to http://localhost:3000/social-station/content"
                Write-Host "   2. Start generating faceless videos"
                exit 0
            }
        } catch {
            # Service not ready yet
        }
        
        $attempt++
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    Write-Host "⚠️  Service started but health check timed out" -ForegroundColor Yellow
    Write-Host "   Check logs: docker compose logs faceless-video-gen"
} else {
    Write-Host "❌ Failed to start service" -ForegroundColor Red
    exit 1
}
