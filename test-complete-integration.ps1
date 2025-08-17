# Complete Integration Test for VAPI Webhook
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "     VAPI WEBHOOK INTEGRATION TEST     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendUrl = "https://superconnector-backend-klye.onrender.com"

# Wait for deployment
Write-Host "`n⏳ Waiting 60 seconds for deployment..." -ForegroundColor Yellow
for ($i = 60; $i -gt 0; $i--) {
    Write-Host -NoNewline "`r$i seconds remaining...  "
    Start-Sleep -Seconds 1
}
Write-Host "`r✅ Deployment should be complete!     " -ForegroundColor Green

# Generate unique call ID
$testCallId = "integration-test-$(Get-Random -Maximum 999999)"

Write-Host "`n📞 Test Call ID: $testCallId" -ForegroundColor Cyan

# Create a comprehensive end-of-call-report payload
$endOfCallPayload = @{
    type = "end-of-call-report"
    call = @{
        id = $testCallId
        customer = @{
            number = "+14152123061"
        }
        status = "completed"
    }
    durationSeconds = 312  # 5 minutes 12 seconds
    analysis = @{
        summary = "Productive discussion about tech networking strategies. User expressed interest in joining virtual meetups and contributing to open source. We identified LinkedIn and GitHub as primary platforms for building connections. Scheduled follow-up for next week to review progress."
    }
    artifact = @{
        messages = @(
            @{
                role = "assistant"
                message = "Hello Dhenenjay! Great to speak with you. I understand you're looking to expand your professional network in the tech industry. What specific areas are you most interested in?"
                time = 1
                duration = 8
            },
            @{
                role = "user"
                message = "I'm a software developer focusing on backend systems and I want to connect with other developers and potentially find mentorship opportunities"
                time = 9
                duration = 7
            },
            @{
                role = "assistant"
                message = "Excellent! Backend development is a great specialty. Have you considered contributing to open source projects? It's a fantastic way to showcase your skills and connect with other developers."
                time = 16
                duration = 8
            },
            @{
                role = "user"
                message = "I haven't really done much open source work. How do I get started with that?"
                time = 24
                duration = 5
            },
            @{
                role = "assistant"
                message = "Start by finding projects you use daily. Check their GitHub issues for 'good first issue' labels. Also, join virtual meetups - there are great backend-focused groups. I'll send you a curated list. Let's schedule a follow-up next week to track your progress. Does Tuesday work?"
                time = 29
                duration = 12
            },
            @{
                role = "user"
                message = "Yes, Tuesday sounds perfect. Thank you for all the guidance!"
                time = 41
                duration = 4
            }
        )
    }
} | ConvertTo-Json -Depth 10

Write-Host "`n📤 Sending end-of-call-report to webhook..." -ForegroundColor Cyan

$apiKey = if ($env:VAPI_PRIVATE) { $env:VAPI_PRIVATE } else { 'test-key' }
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/webhook/vapi" -Method Post -Body $endOfCallPayload -Headers $headers
    Write-Host "✅ Webhook responded successfully!" -ForegroundColor Green
    
    # Wait for database updates
    Write-Host "`n⏳ Waiting 5 seconds for database updates..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check database directly
    Write-Host "`n📊 CHECKING DATABASE RECORDS..." -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    $supabaseUrl = "https://sfasytmtawwygurppxyj.supabase.co"
    $supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"
    
    $dbHeaders = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
    }
    
    # 1. Check Call Record
    Write-Host "`n1️⃣ CALL RECORD:" -ForegroundColor Yellow
    $callUrl = "$supabaseUrl/rest/v1/calls?vapi_call_id=eq.$testCallId`&select=*"
    $callResult = Invoke-RestMethod -Uri $callUrl -Headers $dbHeaders -Method Get
    
    if ($callResult -and $callResult.Count -gt 0) {
        $call = $callResult[0]
        Write-Host "   ✅ Found call record!" -ForegroundColor Green
        Write-Host "   • Status: $($call.status)" -ForegroundColor White
        Write-Host "   • Duration: $($call.duration) seconds" -ForegroundColor White
        
        if ($call.duration -eq 312) {
            Write-Host "   ✅ Duration correctly saved!" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Duration mismatch (expected 312, got $($call.duration))" -ForegroundColor Yellow
        }
        
        if ($call.summary -and $call.summary.Contains("tech networking")) {
            Write-Host "   ✅ Summary correctly saved!" -ForegroundColor Green
            Write-Host "   • Summary: $($call.summary.Substring(0, [Math]::Min(100, $call.summary.Length)))..." -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️ Summary not properly saved" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Call record NOT found!" -ForegroundColor Red
    }
    
    # 2. Check Profile Update
    Write-Host "`n2️⃣ PROFILE UPDATE:" -ForegroundColor Yellow
    $profileUrl = "$supabaseUrl/rest/v1/profiles?phone=eq.+14152123061`&select=*"
    $profileResult = Invoke-RestMethod -Uri $profileUrl -Headers $dbHeaders -Method Get
    
    if ($profileResult -and $profileResult.Count -gt 0) {
        $profile = $profileResult[0]
        if ($profile.last_call_summary -and $profile.last_call_summary.Contains("tech networking")) {
            Write-Host "   ✅ Profile updated with call summary!" -ForegroundColor Green
            Write-Host "   • Summary: $($profile.last_call_summary.Substring(0, [Math]::Min(100, $profile.last_call_summary.Length)))..." -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️ Profile not properly updated" -ForegroundColor Yellow
        }
    }
    
    # 3. Check Messages
    Write-Host "`n3️⃣ VAPI MESSAGES:" -ForegroundColor Yellow
    if ($profile) {
        $messagesUrl = "$supabaseUrl/rest/v1/messages?profile_id=eq.$($profile.id)`&message_type=eq.vapi_call`&order=created_at.desc`&limit=10`&select=*"
        $messages = Invoke-RestMethod -Uri $messagesUrl -Headers $dbHeaders -Method Get
        
        if ($messages -and $messages.Count -gt 0) {
            Write-Host "   ✅ Found $($messages.Count) VAPI call messages!" -ForegroundColor Green
            $recentMessages = $messages | Select-Object -First 3
            foreach ($msg in $recentMessages) {
                $direction = if ($msg.direction -eq "inbound") { "[USER]" } else { "[ASSISTANT]" }
                $preview = $msg.content.Substring(0, [Math]::Min(60, $msg.content.Length))
                Write-Host "   • $direction $preview..." -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️ No VAPI messages found" -ForegroundColor Yellow
        }
    }
    
    # 4. Check System Message
    Write-Host "`n4️⃣ SYSTEM MESSAGE:" -ForegroundColor Yellow
    if ($profile) {
        $sysMessageUrl = "$supabaseUrl/rest/v1/messages?profile_id=eq.$($profile.id)`&message_type=eq.system`&order=created_at.desc`&limit=1`&select=*"
        $sysMessage = Invoke-RestMethod -Uri $sysMessageUrl -Headers $dbHeaders -Method Get
        
        if ($sysMessage -and $sysMessage.Count -gt 0 -and $sysMessage[0].content.Contains("Call completed")) {
            Write-Host "   ✅ System message created!" -ForegroundColor Green
            Write-Host "   • Content: $($sysMessage[0].content.Substring(0, [Math]::Min(80, $sysMessage[0].content.Length)))..." -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️ System message not found" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Error during test:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "         TEST SUMMARY                   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host @'
Expected Results:
✅ Call record created with status 'completed'
✅ Duration saved correctly - 312 seconds
✅ Detailed summary saved with call record
✅ Profile last_call_summary updated
✅ Individual VAPI messages stored
✅ System message created about call completion

Your system should now properly:
• Create call records even for calls not initiated through WhatsApp
• Store complete call summaries and transcripts
• Parse and save individual conversation messages
• Update user profiles with latest call information
• Provide full context for WhatsApp responses about calls
'@ -ForegroundColor White

Write-Host ""
Write-Host "Integration test complete." -ForegroundColor Green
