# Test Complete Flow - VAPI Function Calls Integration
Write-Host "`n=== Testing Complete VAPI + WhatsApp Integration ===" -ForegroundColor Cyan
Write-Host "This test will verify that VAPI can request and receive context" -ForegroundColor Yellow

# Load environment variables
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], [EnvironmentVariableTarget]::Process)
        }
    }
}

$backendUrl = "https://superconnector-backend-klye.onrender.com"

# Step 1: Test Function Call Handler
Write-Host "`nStep 1: Testing Function Call Handler" -ForegroundColor Cyan
Write-Host "Simulating a VAPI function call request..." -ForegroundColor Gray

$functionCallPayload = @{
    type = "function-call"
    functionCall = @{
        name = "getContext"
        parameters = @{}
    }
    call = @{
        customer = @{
            number = "+12015551234"  # Test phone number
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "$backendUrl/webhook/vapi" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "x-vapi-secret" = $env:VAPI_PUBLIC
        } `
        -Body $functionCallPayload
    
    Write-Host "SUCCESS: Function call handler responded!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    
    if ($response.conversationHistory) {
        Write-Host "  - Conversation History: Found" -ForegroundColor Gray
        $preview = $response.conversationHistory.Substring(0, [Math]::Min(100, $response.conversationHistory.Length))
        Write-Host "    Preview: $preview..." -ForegroundColor DarkGray
    }
    if ($response.userName) {
        Write-Host "  - User Name: $($response.userName)" -ForegroundColor Gray
    }
    if ($response.userEmail) {
        Write-Host "  - User Email: $($response.userEmail)" -ForegroundColor Gray
    }
    if ($response.userProfile) {
        Write-Host "  - User Profile: $($response.userProfile)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "ERROR: Function call handler failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Step 2: Verify Backend Health
Write-Host "`nStep 2: Checking Backend Health" -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get
    Write-Host "Backend Status: $($health.status)" -ForegroundColor Green
    Write-Host "Database: $($health.database)" -ForegroundColor Gray
    Write-Host "Ready: $($health.ready)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Backend health check failed" -ForegroundColor Red
}

# Step 3: Check VAPI Assistant Configuration
Write-Host "`nStep 3: Verifying VAPI Assistant Configuration" -ForegroundColor Cyan

$assistantId = $env:VAPI_ASSISTANT_ID
if (-not $assistantId) {
    $assistantId = "5febdaa6-9020-44b4-81b1-d631321fd81e"
}

$apiKey = $env:VAPI_PRIVATE
if (-not $apiKey) {
    $apiKey = $env:VAPI_API_KEY
}

try {
    $assistant = Invoke-RestMethod `
        -Uri "https://api.vapi.ai/assistant/$assistantId" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $apiKey"
        }
    
    Write-Host "Assistant Name: $($assistant.name)" -ForegroundColor Green
    Write-Host "Server URL: $($assistant.serverUrl)" -ForegroundColor Gray
    
    if ($assistant.model.functions) {
        Write-Host "Functions Configured: $($assistant.model.functions.Count)" -ForegroundColor Green
        foreach ($func in $assistant.model.functions) {
            Write-Host "  - $($func.name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "WARNING: No functions configured!" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: Could not fetch assistant configuration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== Integration Test Complete ===" -ForegroundColor Cyan
Write-Host @"

NEXT STEPS TO TEST:
1. Send a WhatsApp message mentioning the SpaceX startup details
2. Ask to be called via WhatsApp
3. During the call, ask about the SpaceX startup
4. The VAPI assistant should use getContext to fetch the conversation history
5. It should respond with accurate details about the SpaceX startup

The system is now configured for:
- WhatsApp messages stored in database
- VAPI calls tracked and transcribed
- Function calls to retrieve context
- Real-time sync between platforms

"@ -ForegroundColor Yellow
