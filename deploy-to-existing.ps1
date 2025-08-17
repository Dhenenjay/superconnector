$TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"
$PROJECT_ID = "prj_iqTGTox5KgmNh2fKdNLIdLf8eqW2"  # eli-superconnector-landing

Write-Host "Deploying to eli-superconnector-landing project..." -ForegroundColor Cyan

# Prepare files
$indexContent = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Path "index.html" -Raw)))

# Create deployment using base64 encoding
$body = @{
    name = "eli-superconnector-landing"
    projectId = $PROJECT_ID
    files = @(
        @{
            file = "index.html"
            data = $indexContent
            encoding = "base64"
        }
    )
    target = "production"
} | ConvertTo-Json -Depth 5

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "Uploading files..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "URL: https://$($response.url)" -ForegroundColor Cyan
    Write-Host "ID: $($response.id)" -ForegroundColor Yellow
    Write-Host "Status: $($response.readyState)" -ForegroundColor Gray
    
    # Save deployment info
    @{
        url = "https://$($response.url)"
        id = $response.id
        projectId = $PROJECT_ID
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        status = $response.readyState
    } | ConvertTo-Json | Out-File "deployment-success.json"
    
    Write-Host "`nDeployment URL: https://$($response.url)" -ForegroundColor Green
    Write-Host "Production URL: https://eli-superconnector-landing.vercel.app" -ForegroundColor Cyan
    
} catch {
    Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}
