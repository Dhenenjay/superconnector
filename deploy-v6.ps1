$TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"

Write-Host "Creating new Vercel deployment..." -ForegroundColor Cyan

# Read index.html content
$indexContent = Get-Content -Path "index.html" -Raw

# Prepare deployment data using the simpler format
$deploymentData = @{
    files = @(
        @{
            file = "index.html"
            data = $indexContent
        }
    )
    name = "eli-superconnector"
    projectSettings = @{
        buildCommand = $null
        outputDirectory = $null
        installCommand = $null
        framework = $null
    }
}

$jsonBody = $deploymentData | ConvertTo-Json -Depth 10 -Compress

# Debug output
Write-Host "Payload size: $($jsonBody.Length) bytes" -ForegroundColor Gray

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "Sending deployment request..." -ForegroundColor Yellow

try {
    # Try using v6 API endpoint
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments" `
        -Method POST `
        -Headers $headers `
        -Body $jsonBody `
        -ErrorAction Stop
    
    Write-Host "`nDeployment successful!" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "Deployment URL: https://$($response.url)" -ForegroundColor Green
    Write-Host "Deployment ID: $($response.id)" -ForegroundColor Yellow
    Write-Host "Status: $($response.readyState)" -ForegroundColor Gray
    Write-Host "===============================================" -ForegroundColor Cyan
    
    # Save deployment info
    @{
        url = "https://$($response.url)"
        id = $response.id
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        status = $response.readyState
    } | ConvertTo-Json | Out-File "vercel-deployment-success.json"
    
} catch {
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get detailed error
    if ($_.ErrorDetails.Message) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error Code: $($errorDetail.error.code)" -ForegroundColor Red
        Write-Host "Error Message: $($errorDetail.error.message)" -ForegroundColor Red
    }
}
