# Test VAPI Integration with Updated Keys
Write-Host "Testing VAPI Integration with Updated API Key" -ForegroundColor Cyan
Write-Host "=" * 60

# Your VAPI API Key
$vapiKey = "bddcbece-fe85-423b-910c-7f55e82f7ad4"

# Test webhook endpoint
$webhookUrl = "https://superconnector-backend-v5.onrender.com/webhook/vapi"

# Create a test payload similar to what VAPI would send
$testPayload = @{
    message = @{
        type = "function-call"
        functionCall = @{
            name = "getLeads"
            parameters = @{}
        }
    }
    call = @{
        id = "test-call-" + (Get-Random)
        assistantId = "test-assistant"
    }
} | ConvertTo-Json -Depth 10

Write-Host "`nTest 1: Basic Webhook Connectivity" -ForegroundColor Yellow
Write-Host "Endpoint: $webhookUrl"
Write-Host "Payload:" -ForegroundColor Gray
Write-Host $testPayload

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $vapiKey"
    }
    
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $testPayload -Headers $headers -ErrorAction Stop
    
    Write-Host "`nResponse received successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "`nError occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError details:" -ForegroundColor Red
        Write-Host $errorBody
    }
}

Write-Host ("`n" + ("=" * 60))
Write-Host "`nTest 2: Testing VAPI API directly" -ForegroundColor Yellow
Write-Host "Checking VAPI account status..."

$vapiApiUrl = "https://api.vapi.ai/account"
$vapiHeaders = @{
    "Authorization" = "Bearer $vapiKey"
    "Content-Type" = "application/json"
}

try {
    $accountInfo = Invoke-RestMethod -Uri $vapiApiUrl -Method GET -Headers $vapiHeaders -ErrorAction Stop
    Write-Host "VAPI Account Status: Connected ✓" -ForegroundColor Green
    Write-Host "Account Details:" -ForegroundColor Gray
    $accountInfo | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "VAPI Account Status: Failed ✗" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ("`n" + ("=" * 60))
Write-Host "`nTest 3: Simulating VAPI Assistant Call" -ForegroundColor Yellow

# Simulate different VAPI message types
$testScenarios = @(
    @{
        name = "Get Leads Function"
        payload = @{
            message = @{
                type = "function-call"
                functionCall = @{
                    name = "getLeads"
                    parameters = @{}
                }
            }
        }
    },
    @{
        name = "Create Lead Function"
        payload = @{
            message = @{
                type = "function-call"
                functionCall = @{
                    name = "createLead"
                    parameters = @{
                        name = "Test User"
                        email = "test@example.com"
                        phone = "+1234567890"
                    }
                }
            }
        }
    }
)

foreach ($scenario in $testScenarios) {
    Write-Host "`nTesting: $($scenario.name)" -ForegroundColor Cyan
    
    $payload = $scenario.payload | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $payload -Headers $headers -ErrorAction Stop
        Write-Host "✓ $($scenario.name) - Success" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ $($scenario.name) - Failed" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ("`n" + ("=" * 60))
Write-Host "`nTest Summary:" -ForegroundColor Cyan
Write-Host "1. Webhook URL: $webhookUrl"
Write-Host "2. VAPI Key: $($vapiKey.Substring(0, 8))..." -ForegroundColor Gray
Write-Host "3. If all tests pass, your VAPI integration is working correctly!" -ForegroundColor Green
Write-Host "`nNote: Make sure your backend server is running and configured with the correct VAPI key." -ForegroundColor Yellow
