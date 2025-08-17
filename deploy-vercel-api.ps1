# Vercel API Deployment Script
$TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"
$PROJECT_NAME = "eli-superconnector"

Write-Host "🚀 Starting Vercel deployment via API..." -ForegroundColor Cyan

# Create deployment payload
$files = @()

# Add index.html
if (Test-Path "index.html") {
    $content = Get-Content -Path "index.html" -Raw
    $files += @{
        file = "index.html"
        data = $content
    }
    Write-Host "✅ Added index.html" -ForegroundColor Green
}

# Add vercel.json
if (Test-Path "vercel.json") {
    $content = Get-Content -Path "vercel.json" -Raw
    $files += @{
        file = "vercel.json"
        data = $content
    }
    Write-Host "✅ Added vercel.json" -ForegroundColor Green
}

# Create deployment
$deploymentPayload = @{
    name = $PROJECT_NAME
    files = $files
    projectSettings = @{
        framework = $null
    }
    target = "production"
} | ConvertTo-Json -Depth 10

try {
    Write-Host "📤 Uploading to Vercel..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Method POST `
        -Headers $headers `
        -Body $deploymentPayload `
        -ErrorAction Stop
    
    Write-Host "✅ Deployment created successfully!" -ForegroundColor Green
    Write-Host "🔗 URL: https://$($response.url)" -ForegroundColor Cyan
    Write-Host "📊 Status: $($response.readyState)" -ForegroundColor Yellow
    
    # Save deployment info
    $deploymentInfo = @{
        url = $response.url
        id = $response.id
        created = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    
    $deploymentInfo | ConvertTo-Json | Out-File -FilePath "deployment-result.json"
    Write-Host "Deployment info saved to deployment-result.json" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody -ForegroundColor Red
}
