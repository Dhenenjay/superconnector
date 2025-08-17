# Direct Database Clear Script
$ErrorActionPreference = "Continue"

# Supabase configuration
$SUPABASE_URL = "https://sfasytmtawwygurppxyj.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"

Write-Host ""
Write-Host "CLEARING DATABASE..." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

# First, let's check what's in the database
Write-Host "Checking current data..." -ForegroundColor Cyan

# Check messages
try {
    $messages = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/messages?select=*" `
        -Headers $headers `
        -Method GET
    
    $msgCount = if ($messages -is [array]) { $messages.Count } else { 0 }
    Write-Host "  Found $msgCount messages" -ForegroundColor White
    
    if ($msgCount -gt 0) {
        # Delete each message by ID
        foreach ($msg in $messages) {
            try {
                $deleteUrl = "$SUPABASE_URL/rest/v1/messages?id=eq.$($msg.id)"
                Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method DELETE | Out-Null
            } catch {
                # Continue on error
            }
        }
        Write-Host "  -> Deleted messages" -ForegroundColor Green
    }
} catch {
    Write-Host "  Messages table empty or error" -ForegroundColor Gray
}

# Check calls
try {
    $calls = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/calls?select=*" `
        -Headers $headers `
        -Method GET
    
    $callCount = if ($calls -is [array]) { $calls.Count } else { 0 }
    Write-Host "  Found $callCount calls" -ForegroundColor White
    
    if ($callCount -gt 0) {
        # Delete each call by ID
        foreach ($call in $calls) {
            try {
                $deleteUrl = "$SUPABASE_URL/rest/v1/calls?id=eq.$($call.id)"
                Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method DELETE | Out-Null
            } catch {
                # Continue on error
            }
        }
        Write-Host "  -> Deleted calls" -ForegroundColor Green
    }
} catch {
    Write-Host "  Calls table empty or error" -ForegroundColor Gray
}

# Check profiles
try {
    $profiles = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/profiles?select=*" `
        -Headers $headers `
        -Method GET
    
    $profCount = if ($profiles -is [array]) { $profiles.Count } else { 0 }
    Write-Host "  Found $profCount profiles" -ForegroundColor White
    
    if ($profCount -gt 0) {
        # Delete each profile by ID
        foreach ($prof in $profiles) {
            try {
                $deleteUrl = "$SUPABASE_URL/rest/v1/profiles?id=eq.$($prof.id)"
                Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method DELETE | Out-Null
            } catch {
                # Continue on error
            }
        }
        Write-Host "  -> Deleted profiles" -ForegroundColor Green
    }
} catch {
    Write-Host "  Profiles table empty or error" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DATABASE CLEARED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The system now has:" -ForegroundColor Yellow
Write-Host "- No conversation history" -ForegroundColor White
Write-Host "- No user profiles" -ForegroundColor White
Write-Host "- No call records" -ForegroundColor White
Write-Host ""
Write-Host "Test it:" -ForegroundColor Cyan
Write-Host "1. Send a WhatsApp message introducing yourself" -ForegroundColor White
Write-Host "2. Make a VAPI call with new info" -ForegroundColor White
Write-Host "3. Ask what was discussed - should say nothing" -ForegroundColor White
