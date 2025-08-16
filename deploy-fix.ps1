# Superconnector V2 - Complete Fix Deployment Script

Write-Host "🚀 Starting Superconnector V2 Complete Fix..." -ForegroundColor Cyan

# Step 1: Check if git is available via different methods
Write-Host "`n📋 Step 1: Checking Git availability..." -ForegroundColor Yellow

$gitPaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:ProgramFiles\Git\bin\git.exe"
)

$gitFound = $false
$gitPath = ""

foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitPath = $path
        $gitFound = $true
        Write-Host "✅ Git found at: $gitPath" -ForegroundColor Green
        break
    }
}

if (-not $gitFound) {
    # Try using git from WSL if available
    try {
        $wslGit = wsl which git 2>$null
        if ($wslGit) {
            Write-Host "✅ Git found in WSL" -ForegroundColor Green
            $gitFound = $true
        }
    } catch {
        Write-Host "❌ Git not found, trying alternative deployment method..." -ForegroundColor Red
    }
}

# Step 2: Try to commit and push changes
if ($gitFound) {
    Write-Host "`n📋 Step 2: Committing and pushing changes..." -ForegroundColor Yellow
    
    if ($gitPath) {
        & $gitPath add -A
        & $gitPath commit -m "Critical fix: Add convex package and fix profile persistence"
        & $gitPath push origin main
        Write-Host "✅ Changes pushed to GitHub" -ForegroundColor Green
    } else {
        # Use WSL git
        wsl git add -A
        wsl git commit -m "Critical fix: Add convex package and fix profile persistence"
        wsl git push origin main
        Write-Host "✅ Changes pushed via WSL" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Manual push required - Git not available" -ForegroundColor Yellow
}

# Step 3: Use GitHub API to trigger deployment if git is not available
if (-not $gitFound) {
    Write-Host "`n📋 Alternative: Creating commit via GitHub API..." -ForegroundColor Yellow
    
    # This would require a GitHub token, which we don't have
    Write-Host "⚠️ GitHub API requires authentication token" -ForegroundColor Yellow
}

# Step 4: Deploy to Render via API
Write-Host "`n📋 Step 3: Triggering Render deployment..." -ForegroundColor Yellow

$renderApiKey = "rnd_P2JqNXVCWZjSXRVvN5OMnRsKwMhF"
$serviceId = "srv-d2fm9cje5dus73aun9qg"

# Get deployment status
try {
    $headers = @{
        "Authorization" = "Bearer $renderApiKey"
        "Accept" = "application/json"
    }
    
    $deployUrl = "https://api.render.com/v1/services/$serviceId/deploys"
    
    # Trigger new deployment
    $body = @{
        clearCache = "clear"
    } | ConvertTo-Json
    
    Write-Host "Triggering deployment..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $deployUrl -Method POST -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "Deployment ID: $($response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Failed to trigger deployment: $_" -ForegroundColor Red
}

Write-Host "`n✅ Fix deployment script completed!" -ForegroundColor Green
Write-Host "Please check https://dashboard.render.com for deployment status" -ForegroundColor Cyan
