# Simple VAPI Webhook Test
Write-Host "Starting VAPI webhook test..." -ForegroundColor Cyan

$backendUrl = "https://superconnector-backend-klye.onrender.com"

# Wait for deployment
Write-Host "Waiting 30 seconds for deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Generate unique call ID
$testCallId = "test-$(Get-Random -Maximum 999999)"
Write-Host "Test Call ID: $testCallId" -ForegroundColor Cyan

# Create test payload
$payload = @{
    type = "end-of-call-report"
    call = @{
        id = $testCallId
        customer = @{
            number = "+14152123061"
        }
    }
    durationSeconds = 245
    analysis = @{
        summary = "Discussion about tech networking. User wants to join virtual meetups and contribute to open source projects."
    }
    artifact = @{
        messages = @(
            @{
                role = "user"
                message = "I want to connect with other developers"
            },
            @{
                role = "assistant"
                message = "Great! I recommend joining tech meetups and contributing to open source"
            }
        )
    }
} | ConvertTo-Json -Depth 10

# Send request
Write-Host "Sending test webhook..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer test-key"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/webhook/vapi" -Method Post -Body $payload -Headers $headers
    Write-Host "SUCCESS: Webhook responded" -ForegroundColor Green
    
    # Wait and check database
    Start-Sleep -Seconds 3
    
    # Check with Supabase
    $supabaseUrl = "https://sfasytmtawwygurppxyj.supabase.co"
    $supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"
    
    $dbHeaders = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
    }
    
    # Check call record
    $callUrl = "$supabaseUrl/rest/v1/calls?vapi_call_id=eq.$testCallId&select=*"
    $callResult = Invoke-RestMethod -Uri $callUrl -Headers $dbHeaders -Method Get
    
    if ($callResult -and $callResult.Count -gt 0) {
        Write-Host "SUCCESS: Call record found!" -ForegroundColor Green
        $call = $callResult[0]
        Write-Host "  Status: $($call.status)" -ForegroundColor White
        Write-Host "  Duration: $($call.duration) seconds" -ForegroundColor White
        Write-Host "  Summary: $($call.summary)" -ForegroundColor White
    } else {
        Write-Host "FAIL: Call record not found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test complete." -ForegroundColor Green
