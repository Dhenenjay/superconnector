# Simple Database Clear Script
$ErrorActionPreference = "Stop"

# Supabase configuration
$SUPABASE_URL = "https://sfasytmtawwygurppxyj.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"

Write-Host ""
Write-Host "CLEARING DATABASE - Starting fresh..." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Clear messages table
Write-Host "Clearing messages table..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/messages?created_at=gte.0" `
        -Headers $headers `
        -Method DELETE
    Write-Host "  -> Messages cleared" -ForegroundColor Green
} catch {
    Write-Host "  -> Error or empty: $_" -ForegroundColor Yellow
}

# Clear calls table
Write-Host "Clearing calls table..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/calls?created_at=gte.0" `
        -Headers $headers `
        -Method DELETE
    Write-Host "  -> Calls cleared" -ForegroundColor Green
} catch {
    Write-Host "  -> Error or empty: $_" -ForegroundColor Yellow
}

# Clear profiles table
Write-Host "Clearing profiles table..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/profiles?created_at=gte.0" `
        -Headers $headers `
        -Method DELETE
    Write-Host "  -> Profiles cleared" -ForegroundColor Green
} catch {
    Write-Host "  -> Error or empty: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DATABASE CLEARED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now test with:" -ForegroundColor Yellow
Write-Host "1. Send a NEW WhatsApp message" -ForegroundColor White
Write-Host "2. Make a VAPI call" -ForegroundColor White
Write-Host "3. Ask about previous conversations" -ForegroundColor White
Write-Host ""
Write-Host "The bot should have NO memory of past conversations." -ForegroundColor Cyan
