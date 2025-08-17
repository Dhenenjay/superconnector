# Check Render Backend Logs for VAPI Webhook Events
# This script uses curl to fetch logs from the Render backend

Write-Host "`nFetching recent logs from Render backend..." -ForegroundColor Cyan

# The backend URL
$backendUrl = "https://superconnector-backend-klye.onrender.com"

# First, check if the backend is responding
Write-Host "Checking backend health..." -ForegroundColor Yellow
$healthCheck = curl -s -o NUL -w "%{http_code}" "$backendUrl/health" 2>$null

if ($healthCheck -eq "200" -or $healthCheck -eq "404") {
    Write-Host "Backend is responding (HTTP: $healthCheck)" -ForegroundColor Green
} else {
    Write-Host "Backend may be down or redeploying (HTTP: $healthCheck)" -ForegroundColor Red
}

Write-Host "`nNote: To see actual logs, you need to:" -ForegroundColor Yellow
Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Navigate to your 'superconnector-backend-klye' service" -ForegroundColor White
Write-Host "3. Click on 'Logs' tab" -ForegroundColor White
Write-Host "4. Look for recent VAPI webhook calls" -ForegroundColor White

Write-Host "`nThings to look for in logs:" -ForegroundColor Cyan
Write-Host "- 'VAPI webhook received' messages" -ForegroundColor White
Write-Host "- 'Event type:' showing 'end-of-call-report'" -ForegroundColor White
Write-Host "- 'Call summary updated' confirmations" -ForegroundColor White
Write-Host "- Any error messages related to database updates" -ForegroundColor White

Write-Host "`nAlternatively, let's test the VAPI webhook directly:" -ForegroundColor Yellow

# Create a test end-of-call webhook payload
$testPayload = @{
    message = @{
        type = "end-of-call-report"
        endedReason = "assistant-ended-call"
        call = @{
            id = "test-call-$(Get-Random)"
            phoneNumber = @{
                number = "+14152123061"
            }
        }
        summary = "Test call summary: Discussed networking opportunities and scheduled follow-up."
        transcript = "Assistant: Hello! User: Hi there. Assistant: How can I help you today?"
    }
} | ConvertTo-Json -Depth 10

Write-Host "`nSending test end-of-call webhook..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer test-key"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "$backendUrl/webhook/vapi" -Method Post -Body $testPayload -Headers $headers -ErrorAction SilentlyContinue

if ($response) {
    Write-Host "Webhook response received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} else {
    Write-Host "No response or error from webhook" -ForegroundColor Red
}

Write-Host "`nDone! Check Render logs for details." -ForegroundColor Green
