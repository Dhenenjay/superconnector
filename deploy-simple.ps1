# Simple Vercel Deployment
$TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"

Write-Host "Starting Vercel deployment..." -ForegroundColor Cyan

# Read files
$indexContent = Get-Content -Path "index.html" -Raw -Encoding UTF8
$vercelConfig = Get-Content -Path "vercel.json" -Raw -Encoding UTF8

# Create minimal payload
$body = @{
    name = "eli-superconnector"
    files = @(
        @{
            file = "index.html"
            data = $indexContent
        },
        @{
            file = "vercel.json"
            data = $vercelConfig
        }
    )
} | ConvertTo-Json -Depth 5

Write-Host "Uploading to Vercel..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json; charset=utf-8"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "URL: https://$($response.url)" -ForegroundColor Cyan
    Write-Host "ID: $($response.id)" -ForegroundColor Yellow
    
    # Save to file
    @{
        url = "https://$($response.url)"
        id = $response.id
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    } | ConvertTo-Json | Out-File "vercel-deployment.json"
    
    Write-Host "Deployment info saved to vercel-deployment.json" -ForegroundColor Green
    
} catch {
    Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}
