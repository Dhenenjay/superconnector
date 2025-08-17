# Final test of VAPI webhook with call record creation
Write-Host "`n=== VAPI WEBHOOK FINAL TEST ===" -ForegroundColor Cyan

$backendUrl = "https://superconnector-backend-klye.onrender.com"

# Wait for deployment
Write-Host "`nWaiting 45 seconds for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# Generate unique call ID
$testCallId = "real-call-$(Get-Random -Maximum 99999)"

Write-Host "`nTest Call ID: $testCallId" -ForegroundColor Cyan

# Create a realistic end-of-call-report payload
$endOfCallPayload = @{
    type = "end-of-call-report"
    call = @{
        id = $testCallId
        customer = @{
            number = "+14152123061"
        }
        status = "completed"
    }
    durationSeconds = 245
    analysis = @{
        summary = "Discussed networking strategies for tech professionals. User wants to connect with other software developers and is interested in attending virtual meetups. Scheduled follow-up for next Tuesday."
    }
    artifact = @{
        messages = @(
            @{
                role = "assistant"
                message = "Hello Dhenenjay! I understand you're looking to expand your professional network. What industry are you focusing on?"
                time = 1
                duration = 5
            },
            @{
                role = "user"
                message = "I'm a software developer looking to connect with other tech professionals"
                time = 6
                duration = 4
            },
            @{
                role = "assistant"
                message = "Excellent! Tech networking is vibrant. Have you considered joining local tech meetups or online communities like Dev.to?"
                time = 10
                duration = 6
            },
            @{
                role = "user"
                message = "I haven't really explored those options yet. Can you tell me more?"
                time = 16
                duration = 4
            },
            @{
                role = "assistant"
                message = "Absolutely! Virtual meetups are great for introverts. I'll send you a curated list of tech communities. Let's schedule a follow-up next Tuesday to review your progress. Sound good?"
                time = 20
                duration = 8
            },
            @{
                role = "user"
                message = "Yes, that sounds perfect. Thank you!"
                time = 28
                duration = 3
            }
        )
    }
} | ConvertTo-Json -Depth 10

Write-Host "`nSending end-of-call-report to webhook..." -ForegroundColor Cyan

$apiKey = if ($env:VAPI_PRIVATE) { $env:VAPI_PRIVATE } else { 'test-key' }
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/webhook/vapi" -Method Post -Body $endOfCallPayload -Headers $headers
    Write-Host "✅ Webhook response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    
    # Wait for database update
    Write-Host "`nWaiting 3 seconds for database update..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Check if the call was saved
    Write-Host "`n=== CHECKING DATABASE ===" -ForegroundColor Cyan
    
    # Check using Supabase directly
    $supabaseUrl = "https://sfasytmtawwygurppxyj.supabase.co"
    $supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"
    
    # Check for our specific call
    $callCheckUrl = "$supabaseUrl/rest/v1/calls?vapi_call_id=eq.$testCallId&select=*"
    $callHeaders = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
    }
    
    Write-Host "`nChecking for call ID: $testCallId" -ForegroundColor Cyan
    $callResult = Invoke-RestMethod -Uri $callCheckUrl -Headers $callHeaders -Method Get
    
    if ($callResult -and $callResult.Count -gt 0) {
        Write-Host "✅ CALL RECORD FOUND!" -ForegroundColor Green
        $call = $callResult[0]
        Write-Host "  Status: $($call.status)" -ForegroundColor White
        Write-Host "  Duration: $($call.duration) seconds" -ForegroundColor White
        Write-Host "  Summary: $($call.summary)" -ForegroundColor White
    } else {
        Write-Host "❌ Call record NOT found in database" -ForegroundColor Red
    }
    
    # Also check the profile's last call summary
    Write-Host "`nChecking profile update..." -ForegroundColor Cyan
    $profileUrl = "$supabaseUrl/rest/v1/profiles?phone=eq.+14152123061&select=*"
    $profileResult = Invoke-RestMethod -Uri $profileUrl -Headers $callHeaders -Method Get
    
    if ($profileResult -and $profileResult.Count -gt 0) {
        $profile = $profileResult[0]
        Write-Host "✅ Profile last_call_summary:" -ForegroundColor Green
        Write-Host "  $($profile.last_call_summary)" -ForegroundColor White
    }
    
    # Check recent messages
    Write-Host "`nChecking recent messages..." -ForegroundColor Cyan
    if ($profile) {
        $messagesUrl = "$supabaseUrl/rest/v1/messages?profile_id=eq.$($profile.id)&order=created_at.desc&limit=3&select=*"
        $messages = Invoke-RestMethod -Uri $messagesUrl -Headers $callHeaders -Method Get
        
        if ($messages -and $messages.Count -gt 0) {
            Write-Host "✅ Recent messages:" -ForegroundColor Green
            foreach ($msg in $messages) {
                $direction = if ($msg.direction -eq "inbound") { "[USER]" } else { "[BOT]" }
                Write-Host "  $direction $($msg.content.Substring(0, [Math]::Min(80, $msg.content.Length)))..." -ForegroundColor White
            }
        }
    }
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "1. Check if call record was created with status 'completed'" -ForegroundColor White
Write-Host "2. Check if profile's last_call_summary was updated" -ForegroundColor White
Write-Host "3. Check if VAPI messages were stored" -ForegroundColor White
Write-Host "4. Check if system message was created" -ForegroundColor White
