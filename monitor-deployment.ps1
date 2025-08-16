#!/usr/bin/env pwsh

# Deployment Monitoring Script
# Continuously checks if the new deployment is live

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT MONITORING SCRIPT" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$healthUrl = "https://superconnector-backend-klye.onrender.com/health"
$targetVersion = "4.0.0"
$checkInterval = 10  # seconds
$maxChecks = 60  # 10 minutes total

Write-Host "Monitoring deployment at: $healthUrl" -ForegroundColor Yellow
Write-Host "Waiting for version: $targetVersion" -ForegroundColor Yellow
Write-Host "Checking every $checkInterval seconds (max $maxChecks checks)" -ForegroundColor Yellow
Write-Host ""

$checkCount = 0
$deployed = $false

while ($checkCount -lt $maxChecks -and -not $deployed) {
    $checkCount++
    Write-Host "[Check $checkCount/$maxChecks] " -NoNewline -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 5
        $currentVersion = $response.version
        
        if ($currentVersion -eq $targetVersion) {
            Write-Host "✅ DEPLOYED! Version $currentVersion is live!" -ForegroundColor Green
            $deployed = $true
            
            # Show full health response
            Write-Host ""
            Write-Host "Health Check Response:" -ForegroundColor Cyan
            $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray
            
            # Run quick verification
            Write-Host ""
            Write-Host "Running quick verification tests..." -ForegroundColor Yellow
            
            # Test webhook verification
            Write-Host "Testing webhook verification... " -NoNewline
            try {
                $verifyResponse = Invoke-WebRequest -Uri "https://superconnector-backend-klye.onrender.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify_token_123456&hub.challenge=test123" -Method GET
                if ($verifyResponse.Content -eq "test123") {
                    Write-Host "✅ Webhook verification working!" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Unexpected response: $($verifyResponse.Content)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "❌ Webhook verification failed: $_" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "Deployment monitoring complete! 🎉" -ForegroundColor Green
            Write-Host "You can now run ./test-complete.ps1 for full testing" -ForegroundColor Cyan
            
        } else {
            Write-Host "Version $currentVersion (waiting for $targetVersion)" -ForegroundColor Yellow
            
            if ($checkCount -lt $maxChecks) {
                Start-Sleep -Seconds $checkInterval
            }
        }
    } catch {
        Write-Host "❌ Health check failed: $_" -ForegroundColor Red
        
        if ($checkCount -lt $maxChecks) {
            Start-Sleep -Seconds $checkInterval
        }
    }
}

if (-not $deployed) {
    Write-Host ""
    Write-Host "⚠️ Deployment monitoring timed out after $($maxChecks * $checkInterval) seconds" -ForegroundColor Yellow
    Write-Host "The deployment may still be in progress. You can:" -ForegroundColor Yellow
    Write-Host "1. Run this script again: ./monitor-deployment.ps1" -ForegroundColor White
    Write-Host "2. Check Render dashboard for deployment status" -ForegroundColor White
    Write-Host "3. Check Render logs for any errors" -ForegroundColor White
}
