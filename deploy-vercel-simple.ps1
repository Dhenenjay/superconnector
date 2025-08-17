# Simple Vercel deployment using PowerShell
$ErrorActionPreference = "Stop"

Write-Host "`n🚀 Deploying to Vercel..." -ForegroundColor Green

# Set token
$token = "gDALrdxH4lN4CXjXmLjoBMQx"

# Read the files
Write-Host "📖 Reading files..." -ForegroundColor Yellow
$indexHtml = Get-Content -Path "index.html" -Raw -Encoding UTF8
$vercelJson = Get-Content -Path "vercel.json" -Raw -Encoding UTF8

# Escape the content for JSON
$indexHtmlEscaped = $indexHtml -replace '\\', '\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n' -replace "`t", '\t'
$vercelJsonEscaped = $vercelJson -replace '\\', '\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n'

Write-Host "📤 Uploading to Vercel API..." -ForegroundColor Yellow

# Create the deployment JSON
$deploymentJson = @"
{
  "name": "eli-superconnector",
  "files": [
    {
      "file": "index.html",
      "data": "$indexHtmlEscaped"
    },
    {
      "file": "vercel.json", 
      "data": "$vercelJsonEscaped"
    }
  ],
  "target": "production",
  "projectSettings": {
    "framework": null
  }
}
"@

# Save to temp file for curl
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $deploymentJson -Encoding UTF8

try {
    Write-Host "🌐 Calling Vercel API..." -ForegroundColor Cyan
    
    $response = curl -X POST "https://api.vercel.com/v13/deployments" `
        -H "Authorization: Bearer $token" `
        -H "Content-Type: application/json" `
        --data-binary "@$tempFile" `
        --silent --show-error
    
    Write-Host "`n📊 Response:" -ForegroundColor Gray
    Write-Host $response
    
    # Try to parse the URL from response
    if ($response -match '"url"\s*:\s*"([^"]+)"') {
        $deployUrl = $matches[1]
        Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
        Write-Host "🔗 Your site is live at: https://$deployUrl" -ForegroundColor Yellow
        Write-Host "`nVisit: https://$deployUrl" -ForegroundColor Cyan
    } elseif ($response -match '"error"') {
        Write-Host "`n❌ Deployment failed. Check the response above for details." -ForegroundColor Red
    } else {
        Write-Host "`n✅ Deployment request sent. Check Vercel dashboard for status." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}

Write-Host "`n🏁 Done!" -ForegroundColor Green
