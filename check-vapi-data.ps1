# Check what data VAPI stored in the database
$ErrorActionPreference = "Stop"

# Supabase configuration
$SUPABASE_URL = "https://sfasytmtawwygurppxyj.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
}

Write-Host ""
Write-Host "Checking VAPI Call Data..." -ForegroundColor Yellow
Write-Host ""

# Check profiles
Write-Host "=== PROFILES ===" -ForegroundColor Cyan
$profiles = Invoke-RestMethod `
    -Uri "$SUPABASE_URL/rest/v1/profiles?select=*" `
    -Headers $headers `
    -Method GET

if ($profiles) {
    foreach ($prof in $profiles) {
        Write-Host "Profile ID: $($prof.id)" -ForegroundColor White
        Write-Host "  Name: $($prof.name)" -ForegroundColor Gray
        Write-Host "  Phone: $($prof.phone)" -ForegroundColor Gray
        Write-Host "  Email: $($prof.email)" -ForegroundColor Gray
        Write-Host "  Last Call Summary: $($prof.last_call_summary)" -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "No profiles found" -ForegroundColor Red
}

# Check calls
Write-Host "=== CALLS ===" -ForegroundColor Cyan
$calls = Invoke-RestMethod `
    -Uri "$SUPABASE_URL/rest/v1/calls?select=*" `
    -Headers $headers `
    -Method GET

if ($calls) {
    foreach ($call in $calls) {
        Write-Host "Call ID: $($call.id)" -ForegroundColor White
        Write-Host "  VAPI Call ID: $($call.vapi_call_id)" -ForegroundColor Gray
        Write-Host "  Profile ID: $($call.profile_id)" -ForegroundColor Gray
        Write-Host "  Status: $($call.status)" -ForegroundColor Gray
        Write-Host "  Summary: $($call.summary)" -ForegroundColor Yellow
        Write-Host "  Created: $($call.created_at)" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host "No calls found" -ForegroundColor Red
}

# Check recent messages
Write-Host "=== RECENT MESSAGES (last 5) ===" -ForegroundColor Cyan
$messages = Invoke-RestMethod `
    -Uri "$SUPABASE_URL/rest/v1/messages?select=*&order=created_at.desc&limit=5" `
    -Headers $headers `
    -Method GET

if ($messages) {
    foreach ($msg in $messages) {
        $direction = if ($msg.direction -eq "inbound") { "USER" } else { "BOT" }
        Write-Host "[$direction] $($msg.content)" -ForegroundColor $(if ($msg.direction -eq "inbound") { "Green" } else { "Blue" })
        Write-Host "  Type: $($msg.message_type) | Created: $($msg.created_at)" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host "No messages found" -ForegroundColor Red
}

Write-Host "============================" -ForegroundColor Yellow
Write-Host "ANALYSIS:" -ForegroundColor Magenta
Write-Host "Check if:" -ForegroundColor White
Write-Host "1. Calls table has the VAPI call record" -ForegroundColor White
Write-Host "2. The call has a summary field populated" -ForegroundColor White
Write-Host "3. The profile_id matches between calls and profiles" -ForegroundColor White
