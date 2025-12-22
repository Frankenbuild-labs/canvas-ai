# Test the /api/lead-gen/start endpoint directly
Write-Host "Testing /api/lead-gen/start endpoint..." -ForegroundColor Cyan

$body = @{
    keywords = "marketing automation"
    targetRole = "Marketing Manager"
    industry = "Technology"
    location = "New York, NY"
    platform = "LinkedIn"
    depth = "Standard"
    includeEmail = $true
    includePhone = $true
} | ConvertTo-Json

Write-Host "`nRequest body:" -ForegroundColor Yellow
Write-Host $body

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/api/lead-gen/start" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "`nStatus: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "`nSession ID: $($result.sessionId)" -ForegroundColor Cyan
    
} catch {
    Write-Host "`nError!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}
