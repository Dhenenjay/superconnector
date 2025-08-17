# Load environment variables
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], [EnvironmentVariableTarget]::Process)
        }
    }
}

$assistantId = $env:VAPI_ASSISTANT_ID
if (-not $assistantId) {
    $assistantId = "5febdaa6-9020-44b4-81b1-d631321fd81e"
}

$apiKey = $env:VAPI_PRIVATE
if (-not $apiKey) {
    $apiKey = $env:VAPI_API_KEY
}

Write-Host "Updating VAPI Assistant: $assistantId" -ForegroundColor Cyan

$body = @{
    name = "Eli - Networking Assistant"
    firstMessage = "Hi! I am Eli, your AI networking assistant. How can I help you expand your professional network today?"
    model = @{
        provider = "openai"
        model = "gpt-3.5-turbo"
        temperature = 0.7
        systemPrompt = "You are Eli, an AI networking assistant helping users build professional connections. You have access to the user conversation history through the getContext function. Always use this to maintain continuity with past conversations. When the user mentions specific topics or startups from previous conversations, use the getContext function to recall those details."
        functions = @(
            @{
                name = "getContext"
                description = "Get the user conversation history and profile information to maintain context across calls"
                parameters = @{
                    type = "object"
                    properties = @{}
                    required = @()
                }
            }
        )
    }
    voice = @{
        provider = "azure"
        voiceId = "andrew"
    }
    serverUrl = "https://superconnector-backend-klye.onrender.com/webhook/vapi"
    serverUrlSecret = $env:VAPI_PUBLIC
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.vapi.ai/assistant/$assistantId" `
        -Method Patch `
        -Headers $headers `
        -Body $body
    
    Write-Host 'Assistant updated successfully!' -ForegroundColor Green
    $funcCount = $response.model.functions.Count
    Write-Host "Functions configured: $funcCount" -ForegroundColor Yellow
    
    if ($response.model.functions) {
        Write-Host 'Function details:' -ForegroundColor Cyan
        foreach ($func in $response.model.functions) {
            $funcName = $func.name
            $funcDesc = $func.description
            Write-Host "  - $funcName : $funcDesc" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host 'Error updating assistant:' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $details = $_.ErrorDetails.Message
        Write-Host ('Details: ' + $details) -ForegroundColor Yellow
    }
}
