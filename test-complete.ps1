# Comprehensive Test Suite for Superconnector
Write-Host "`n🧪 SUPERCONNECTOR COMPLETE TEST SUITE" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

$baseUrl = "https://superconnector-backend-klye.onrender.com"

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Health Check Passed" -ForegroundColor Green
    Write-Host "   Version: $($health.version)" -ForegroundColor Gray
    Write-Host "   Server: $($health.server)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}

# Test 2: Send initial greeting (should ask for email)
Write-Host "`nTest 2: Initial Greeting" -ForegroundColor Yellow
try {
    $body = @{
        From = "whatsapp:+917428170779"
        Body = "Hey"
        ProfileName = "Dhenenjay"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/json"
    $content = $response.Content -replace '<[^>]+>', ''
    Write-Host "✅ Greeting Sent" -ForegroundColor Green
    Write-Host "   Response: $content" -ForegroundColor Gray
} catch {
    Write-Host "❌ Greeting Failed: $_" -ForegroundColor Red
}

# Test 3: Send email
Write-Host "`nTest 3: Sending Email" -ForegroundColor Yellow
try {
    $body = @{
        From = "whatsapp:+917428170779"
        Body = "dhenenjay.2001@gmail.com"
        ProfileName = "Dhenenjay"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/json"
    $content = $response.Content -replace '<[^>]+>', ''
    Write-Host "✅ Email Sent" -ForegroundColor Green
    Write-Host "   Response: $content" -ForegroundColor Gray
} catch {
    Write-Host "❌ Email Failed: $_" -ForegroundColor Red
}

# Test 4: Send another message (should NOT ask for email again)
Write-Host "`nTest 4: Follow-up Message" -ForegroundColor Yellow
try {
    $body = @{
        From = "whatsapp:+917428170779"
        Body = "I need connections in tech"
        ProfileName = "Dhenenjay"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/json"
    $content = $response.Content -replace '<[^>]+>', ''
    Write-Host "✅ Follow-up Sent" -ForegroundColor Green
    Write-Host "   Response: $content" -ForegroundColor Gray
    
    # Check if still asking for email
    if ($content -like "*email*") {
        Write-Host "⚠️  WARNING: Still asking for email - profile not persisting!" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Profile persistence working!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Follow-up Failed: $_" -ForegroundColor Red
}

# Test 5: Test call request
Write-Host "`nTest 5: Call Request" -ForegroundColor Yellow
try {
    $body = @{
        From = "whatsapp:+917428170779"
        Body = "Can you call me?"
        ProfileName = "Dhenenjay"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/json"
    $content = $response.Content -replace '<[^>]+>', ''
    Write-Host "✅ Call Request Sent" -ForegroundColor Green
    Write-Host "   Response: $content" -ForegroundColor Gray
    
    if ($content -like "*calling*") {
        Write-Host "✅ Call feature working!" -ForegroundColor Green
    } elseif ($content -like "*email*") {
        Write-Host "❌ FAILURE: Still asking for email instead of initiating call!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Call Request Failed: $_" -ForegroundColor Red
}

Write-Host "`n=====================================`n" -ForegroundColor Cyan
Write-Host "🏁 TEST SUITE COMPLETE" -ForegroundColor Cyan
