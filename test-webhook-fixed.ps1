# Test VAPI Webhook with End-of-Call Report
Write-Host "`nTesting VAPI webhook with end-of-call-report..." -ForegroundColor Cyan

$backendUrl = "https://superconnector-backend-klye.onrender.com"

# Wait for deployment
Write-Host "Waiting 30 seconds for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Create a realistic end-of-call-report payload
$endOfCallPayload = @{
    type = "end-of-call-report"
    call = @{
        id = "test-call-" + (Get-Random -Maximum 9999)
        customer = @{
            number = "+14152123061"
        }
        status = "completed"
    }
    durationSeconds = 180
    analysis = @{
        summary = "Discussed networking strategies and scheduled follow-up for next week. User interested in tech industry connections."
    }
    artifact = @{
        messages = @(
            @{
                role = "assistant"
                message = "Hello! I understand you're looking to expand your professional network. What industry are you in?"
                time = 1
                duration = 5
            },
            @{
                role = "user"
                message = "I'm in tech, specifically software development"
                time = 6
                duration = 3
            },
            @{
                role = "assistant"
                message = "Great! Tech networking is all about showcasing your projects and engaging with the community. Are you active on GitHub or LinkedIn?"
                time = 9
                duration = 6
            },
            @{
                role = "user"
                message = "Yes, I have both but I'm not very active"
                time = 15
                duration = 3
            },
            @{
                role = "assistant"
                message = "Let's change that! I recommend posting about your current projects weekly and engaging with other developers' content. Would you like me to help you create a networking action plan?"
                time = 18
                duration = 8
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
    
    # Wait a moment for database update
    Start-Sleep -Seconds 2
    
    # Check if the call was saved
    Write-Host "`nChecking database for call record..." -ForegroundColor Cyan
    & .\check-vapi-data.ps1
    
} catch {
    Write-Host "❌ Error calling webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "Response:" $_.Exception.Response
}

Write-Host "`nTest complete!" -ForegroundColor Green
