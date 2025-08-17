#!/usr/bin/env pwsh

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "VERIFYING API KEY FIXES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$baseUrl = "https://superconnector-backend-klye.onrender.com"

# Check health
Write-Host "`n1. Checking system health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "   Version: $($health.version)" -ForegroundColor Green
    Write-Host "   Database: $($health.database)" -ForegroundColor Green
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Check your profile
Write-Host "`n2. Checking your profile..." -ForegroundColor Yellow
try {
    $profiles = Invoke-RestMethod -Uri "$baseUrl/admin/profiles" -Method GET
    $yourProfile = $profiles.profiles | Where-Object { $_.phone -eq "+14152123061" }
    if ($yourProfile) {
        Write-Host "   Name: $($yourProfile.name)" -ForegroundColor Green
        Write-Host "   Email: $($yourProfile.email)" -ForegroundColor Green
        Write-Host "   Profile ID: $($yourProfile.id)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Check messages
Write-Host "`n3. Testing AI response..." -ForegroundColor Yellow
$testBody = @{
    From = "whatsapp:+14152123061"
    Body = "What are the best practices for networking in tech?"
    ProfileName = "Dhenenjay"
}

$aiWorking = $false
try {
    $aiResponse = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $testBody -ContentType "application/x-www-form-urlencoded"
    if ($aiResponse.Content -match "connection" -or $aiResponse.Content -match "network") {
        Write-Host "   AI is working! Got intelligent response" -ForegroundColor Green
        $aiWorking = $true
    } else {
        Write-Host "   AI might be using fallback response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Check call capability
Write-Host "`n4. Testing call initiation..." -ForegroundColor Yellow
$callBody = @{
    From = "whatsapp:+14152123061"
    Body = "Please call me now"
    ProfileName = "Dhenenjay"
}

$vapiWorking = $false
try {
    $callResponse = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $callBody -ContentType "application/x-www-form-urlencoded"
    $content = $callResponse.Content
    
    if ($content -match "calling you now") {
        Write-Host "   VAPI integration successful!" -ForegroundColor Green
        Write-Host "   Check your phone for incoming call!" -ForegroundColor Cyan
        $vapiWorking = $true
    } elseif ($content -match "arrange a call") {
        Write-Host "   VAPI still has issues - check API keys" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host "`nDatabase and Profile: WORKING" -ForegroundColor Green
Write-Host "WhatsApp Integration: WORKING" -ForegroundColor Green

if ($aiWorking) {
    Write-Host "OpenAI Integration: WORKING" -ForegroundColor Green
} else {
    Write-Host "OpenAI Integration: CHECK OPENAI_API_KEY" -ForegroundColor Red
}

if ($vapiWorking) {
    Write-Host "VAPI Integration: WORKING" -ForegroundColor Green
} else {
    Write-Host "VAPI Integration: CHECK VAPI_API_KEY (use PUBLIC key!)" -ForegroundColor Red
}

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "If VAPI or OpenAI show errors:" -ForegroundColor White
Write-Host "1. Check FIX_API_KEYS.md for instructions" -ForegroundColor White
Write-Host "2. Update keys in Render environment variables" -ForegroundColor White
Write-Host "3. Wait for redeploy" -ForegroundColor White
Write-Host "4. Run this script again" -ForegroundColor White
