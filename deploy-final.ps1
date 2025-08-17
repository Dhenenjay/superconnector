# Simple Vercel deployment using PowerShell
$ErrorActionPreference = "Stop"

Write-Host "`n🚀 Deploying to Vercel..." -ForegroundColor Green

# Set token
$token = "gDALrdxH4lN4CXjXmLjoBMQx"

# Read the files
Write-Host "📖 Reading files..." -ForegroundColor Yellow
$indexHtml = Get-Content -Path "index.html" -Raw -Encoding UTF8
$vercelJson = Get-Content -Path "vercel.json" -Raw -Encoding UTF8

# Escape the content for JSON - using simpler approach
$indexHtmlEscaped = $indexHtml.Replace('\', '\\').Replace('"', '\"').Replace("`r`n", '\n').Replace("`n", '\n').Replace("`t", '\t')
$vercelJsonEscaped = $vercelJson.Replace('\', '\\').Replace('"', '\"').Replace("`r`n", '\n').Replace("`n", '\n')

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
    
    # Parse JSON response to find URL
    if ($response -like '*"url"*') {
        # Extract URL using simple string manipulation
        $startIndex = $response.IndexOf('"url":"') + 7
        if ($startIndex -gt 6) {
            $endIndex = $response.IndexOf('"', $startIndex)
            if ($endIndex -gt $startIndex) {
                $deployUrl = $response.Substring($startIndex, $endIndex - $startIndex)
                Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
                Write-Host "🔗 Your site is live at: https://$deployUrl" -ForegroundColor Yellow
                Write-Host "`nVisit: https://$deployUrl" -ForegroundColor Cyan
            }
        }
    }
    
    if ($response -like '*"error"*') {
        Write-Host "`n❌ Deployment failed. Check the response above for details." -ForegroundColor Red
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
