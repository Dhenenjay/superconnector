# Check phone number formats in database
Write-Host "`n=== Checking Phone Number Formats in Database ===" -ForegroundColor Cyan

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

# Get all profiles to see phone number formats
Write-Host "`nFetching all profiles from database..." -ForegroundColor Yellow

try {
    $profiles = Invoke-RestMethod -Uri "$backendUrl/admin/profiles" -Method Get
    
    Write-Host "`nProfiles found: $($profiles.profiles.Count)" -ForegroundColor Green
    
    foreach ($profile in $profiles.profiles) {
        Write-Host "`n--- Profile ---" -ForegroundColor Cyan
        Write-Host "ID: $($profile.id)" -ForegroundColor Gray
        Write-Host "Name: $($profile.name)" -ForegroundColor Gray
        Write-Host "Phone: '$($profile.phone)'" -ForegroundColor Yellow
        Write-Host "Email: $($profile.email)" -ForegroundColor Gray
        if ($profile.last_call_summary) {
            $summary = $profile.last_call_summary
            if ($summary.Length -gt 100) {
                $summary = $summary.Substring(0, 100) + "..."
            }
            Write-Host "Last Call Summary: $summary" -ForegroundColor DarkGray
        }
        Write-Host "Created: $($profile.created_at)" -ForegroundColor Gray
    }
    
    # Now test the function call with the actual phone format
    if ($profiles.profiles.Count -gt 0) {
        $testPhone = $profiles.profiles[0].phone
        Write-Host "`n`nTesting function call with actual phone: '$testPhone'" -ForegroundColor Cyan
        
        $functionCallPayload = @{
            type = "function-call"
            functionCall = @{
                name = "getContext"
                parameters = @{}
            }
            call = @{
                customer = @{
                    number = $testPhone
                }
            }
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod `
            -Uri "$backendUrl/webhook/vapi" `
            -Method Post `
            -Headers @{
                "Content-Type" = "application/json"
                "x-vapi-secret" = $env:VAPI_PUBLIC
            } `
            -Body $functionCallPayload
        
        Write-Host "Function call response:" -ForegroundColor Green
        if ($response.conversationHistory) {
            Write-Host "  - Has conversation history" -ForegroundColor Gray
        }
        if ($response.userName) {
            Write-Host "  - User: $($response.userName)" -ForegroundColor Gray
        }
        if ($response.userEmail) {
            Write-Host "  - Email: $($response.userEmail)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "ERROR: " -ForegroundColor Red -NoNewline
    Write-Host $_.Exception.Message
}
