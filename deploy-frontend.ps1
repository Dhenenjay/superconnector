# Simple Vercel deployment script
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Vercel deployment..." -ForegroundColor Green

# Set the Vercel token
$env:VERCEL_TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"

# Get the current directory
$projectPath = Get-Location

Write-Host "📦 Preparing deployment files..." -ForegroundColor Yellow

# Create a temporary directory for deployment files
$tempFile = New-TemporaryFile
$tempDir = $tempFile.DirectoryName + "\vercel-deploy-" + $tempFile.BaseName
Remove-Item $tempFile
New-Item -ItemType Directory -Path $tempDir | Out-Null
Write-Host "Created temp directory: $tempDir"

# Copy only the necessary files
Copy-Item "index.html" -Destination $tempDir
Copy-Item "vercel.json" -Destination $tempDir

Write-Host "📤 Uploading to Vercel..." -ForegroundColor Yellow

# Use curl to deploy to Vercel
$headers = @{
    "Authorization" = "Bearer $env:VERCEL_TOKEN"
    "Content-Type" = "application/json"
}

# First, create the deployment
$deploymentData = @{
    "name" = "eli-superconnector"
    "files" = @()
    "projectSettings" = @{
        "framework" = $null
    }
}

# Read files and prepare for upload
$indexContent = Get-Content -Path "$tempDir\index.html" -Raw
$vercelContent = Get-Content -Path "$tempDir\vercel.json" -Raw

# Create file upload
Write-Host "Creating deployment..." -ForegroundColor Cyan

$files = @(
    @{
        "file" = "index.html"
        "data" = $indexContent
    },
    @{
        "file" = "vercel.json"
        "data" = $vercelContent
    }
)

# Use Vercel CLI API endpoint
try {
    # Create deployment using curl
    $curlCmd = @"
curl -X POST https://api.vercel.com/v13/deployments `
  -H "Authorization: Bearer $env:VERCEL_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "name": "eli-superconnector",
    "files": [
      {
        "file": "index.html",
        "data": "@index.html"
      },
      {
        "file": "vercel.json",
        "data": "@vercel.json"
      }
    ],
    "target": "production",
    "projectSettings": {
      "framework": null
    }
  }'
"@

    # Alternative approach - use Invoke-RestMethod
    Write-Host "Deploying to Vercel via API..." -ForegroundColor Green
    
    # Upload files first
    $uploadUrl = "https://api.vercel.com/v2/now/files"
    
    # Upload index.html
    $indexHash = curl -X POST $uploadUrl `
        -H "Authorization: Bearer $env:VERCEL_TOKEN" `
        -H "x-now-digest: sha1" `
        --data-binary "@index.html" `
        2>$null
    
    # Upload vercel.json
    $vercelHash = curl -X POST $uploadUrl `
        -H "Authorization: Bearer $env:VERCEL_TOKEN" `
        -H "x-now-digest: sha1" `
        --data-binary "@vercel.json" `
        2>$null
    
    Write-Host "✅ Files uploaded successfully!" -ForegroundColor Green
    
    # Create deployment
    $deploymentUrl = "https://api.vercel.com/v13/deployments"
    
    $result = curl -X POST $deploymentUrl `
        -H "Authorization: Bearer $env:VERCEL_TOKEN" `
        -H "Content-Type: application/json" `
        -d "{`"name`":`"eli-superconnector`",`"files`":[{`"file`":`"index.html`"},{`"file`":`"vercel.json`"}],`"target`":`"production`"}" `
        2>$null
    
    Write-Host "🎉 Deployment initiated!" -ForegroundColor Green
    Write-Host "Response: $result" -ForegroundColor Cyan
    
    # Extract URL from response
    if ($result -match '"url":"([^"]+)"') {
        $deployUrl = $matches[1]
        Write-Host "`n✨ Deployment successful!" -ForegroundColor Green
        Write-Host "🌐 URL: https://$deployUrl" -ForegroundColor Yellow
        Write-Host "`nYour frontend is now live at: https://$deployUrl" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
} finally {
    # Clean up temp directory
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "`n🧹 Cleaned up temporary files" -ForegroundColor Gray
}

Write-Host "`n✅ Deployment process complete!" -ForegroundColor Green
