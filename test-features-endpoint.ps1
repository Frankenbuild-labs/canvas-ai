# Test if the API can see environment variables
Write-Host "Testing environment variables in API..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/api/lead-gen/features" `
        -Method GET `
        -UseBasicParsing
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content
    
} catch {
    Write-Host "Error!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
