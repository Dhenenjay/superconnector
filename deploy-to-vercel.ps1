# Deploy to Vercel Script
$VERCEL_TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"
$PROJECT_NAME = "eli-superconnector"

Write-Host "🚀 Deploying Eli Superconnector to Vercel..." -ForegroundColor Cyan

# Create deployment using Vercel API
$headers = @{
    "Authorization" = "Bearer $VERCEL_TOKEN"
    "Content-Type" = "application/json"
}

# Read the index.html file
$indexContent = Get-Content -Path "index.html" -Raw

# Create a deployment with the file
$deploymentData = @{
    name = $PROJECT_NAME
    files = @(
        @{
            file = "index.html"
            data = $indexContent
        }
    )
    projectSettings = @{
        framework = $null
        buildCommand = $null
        outputDirectory = $null
    }
    target = "production"
} | ConvertTo-Json -Depth 10

try {
    Write-Host "📦 Creating deployment..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Method POST `
        -Headers $headers `
        -Body $deploymentData
    
    Write-Host "✅ Deployment created successfully!" -ForegroundColor Green
    Write-Host "🌐 Deployment URL: https://$($response.url)" -ForegroundColor Cyan
    Write-Host "🔗 Production URL: https://$PROJECT_NAME.vercel.app" -ForegroundColor Cyan
    
    # Save deployment info
    $deploymentInfo = @{
        url = $response.url
        id = $response.id
        createdAt = $response.createdAt
        readyState = $response.readyState
    }
    
    $deploymentInfo | ConvertTo-Json | Out-File -FilePath "deployment-info.json"
    Write-Host "💾 Deployment info saved to deployment-info.json" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    Write-Host $reader.ReadToEnd() -ForegroundColor Red
}

Write-Host "" 
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Visit your deployed site" -ForegroundColor White
Write-Host "2. Configure custom domain if needed" -ForegroundColor White
Write-Host "3. Update WhatsApp number in index.html" -ForegroundColor White
