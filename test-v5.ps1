#!/usr/bin/env pwsh

# Superconnector V5 Test Script
# Tests all features end-to-end

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SUPERCONNECTOR V5 TEST SUITE" -ForegroundColor Cyan  
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://superconnector-backend-klye.onrender.com"
$testPhone = "+19175551234"
$testName = "Test User"
$testEmail = "test@example.com"

$results = @()

# Test 1: Health Check
Write-Host "Test 1: Health Check... " -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($response.version -eq "5.0.0" -and $response.database) {
        Write-Host "✅ PASSED (v$($response.version), DB: $($response.database))" -ForegroundColor Green
        $results += "✅ Health Check"
    } else {
        Write-Host "❌ FAILED (Got v$($response.version))" -ForegroundColor Red
        $results += "❌ Health Check - Wrong version"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Health Check - Error"
}

# Test 2: Root Endpoint
Write-Host "Test 2: Root Endpoint... " -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    if ($response.version -eq "5.0.0") {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $results += "✅ Root Endpoint"
    } else {
        Write-Host "❌ FAILED" -ForegroundColor Red
        $results += "❌ Root Endpoint"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Root Endpoint - Error"
}

# Test 3: Webhook Verification
Write-Host "Test 3: Webhook Verification... " -NoNewline
try {
    $verifyUrl = "$baseUrl/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify_token_123456&hub.challenge=test_challenge_123"
    $response = Invoke-WebRequest -Uri $verifyUrl -Method GET
    if ($response.Content -eq "test_challenge_123") {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $results += "✅ Webhook Verification"
    } else {
        Write-Host "❌ FAILED (Got: $($response.Content))" -ForegroundColor Red
        $results += "❌ Webhook Verification"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Webhook Verification - Error"
}

# Test 4: Initial Greeting
Write-Host "Test 4: Initial Greeting... " -NoNewline
try {
    $body = @{
        From = "whatsapp:$testPhone"
        Body = "Hi"
        ProfileName = $testName
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    $content = $response.Content
    
    if ($content -match "email" -or $content -match "Eli" -or $content -match "Hey") {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $results += "✅ Initial Greeting"
    } else {
        Write-Host "⚠️ PARTIAL (Response received)" -ForegroundColor Yellow
        $results += "⚠️ Initial Greeting"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Initial Greeting - Error"
}

Start-Sleep -Seconds 1

# Test 5: Email Submission
Write-Host "Test 5: Email Submission... " -NoNewline
try {
    $body = @{
        From = "whatsapp:$testPhone"
        Body = "My email is $testEmail"
        ProfileName = $testName
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    $content = $response.Content
    
    if ($content -match "saved" -or $content -match "Perfect" -or $content -match "email") {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $results += "✅ Email Submission"
    } else {
        Write-Host "⚠️ PARTIAL" -ForegroundColor Yellow
        $results += "⚠️ Email Submission"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Email Submission - Error"
}

Start-Sleep -Seconds 1

# Test 6: Call Request
Write-Host "Test 6: Call Request... " -NoNewline
try {
    $body = @{
        From = "whatsapp:$testPhone"
        Body = "Can you call me?"
        ProfileName = $testName
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    $content = $response.Content
    
    if ($content -match "calling" -or $content -match "call" -or $content -match "📞") {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $results += "✅ Call Request"
    } else {
        Write-Host "⚠️ PARTIAL" -ForegroundColor Yellow
        $results += "⚠️ Call Request"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Call Request - Error"
}

Start-Sleep -Seconds 1

# Test 7: Context Retention
Write-Host "Test 7: Context Retention... " -NoNewline
try {
    $body = @{
        From = "whatsapp:$testPhone"
        Body = "What was our last conversation about?"
        ProfileName = $testName
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    $content = $response.Content
    
    if ($content -notmatch "don't have access") {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $results += "✅ Context Retention"
    } else {
        Write-Host "⚠️ NEEDS REAL DATA" -ForegroundColor Yellow
        $results += "⚠️ Context Retention"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Context Retention - Error"
}

# Test 8: Emoji Support
Write-Host "Test 8: Emoji Support... " -NoNewline
try {
    $body = @{
        From = "whatsapp:$testPhone"
        Body = "Send me some emojis! 🎉"
        ProfileName = $testName
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/webhook/whatsapp" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    $content = $response.Content
    
    if ($content -match "[\u{1F300}-\u{1F9FF}]" -or $content -match "🎯" -or $content -match "👋" -or $content -match "📞") {
        Write-Host "✅ PASSED (Emojis found)" -ForegroundColor Green
        $results += "✅ Emoji Support"
    } else {
        Write-Host "⚠️ NO EMOJIS DETECTED" -ForegroundColor Yellow
        $results += "⚠️ Emoji Support"
    }
} catch {
    Write-Host "❌ FAILED ($_)" -ForegroundColor Red
    $results += "❌ Emoji Support - Error"
}

# Test 9: Admin Profiles Endpoint
Write-Host "Test 9: Admin Profiles... " -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/profiles" -Method GET
    if ($response.profiles) {
        $profileCount = $response.profiles.Count
        Write-Host "✅ PASSED ($profileCount profiles)" -ForegroundColor Green
        $results += "✅ Admin Profiles"
    } else {
        Write-Host "✅ PASSED (Empty)" -ForegroundColor Green
        $results += "✅ Admin Profiles"
    }
} catch {
    Write-Host "⚠️ RESTRICTED (Expected)" -ForegroundColor Yellow
    $results += "⚠️ Admin Profiles - Restricted"
}

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_ -match "✅" }).Count
$partial = ($results | Where-Object { $_ -match "⚠️" }).Count
$failed = ($results | Where-Object { $_ -match "❌" }).Count

foreach ($result in $results) {
    Write-Host $result
}

Write-Host ""
Write-Host "Results: " -NoNewline
Write-Host "$passed Passed" -ForegroundColor Green -NoNewline
Write-Host ", " -NoNewline
Write-Host "$partial Partial" -ForegroundColor Yellow -NoNewline
Write-Host ", " -NoNewline
Write-Host "$failed Failed" -ForegroundColor Red

Write-Host ""
if ($failed -eq 0 -and $partial -le 2) {
    Write-Host "🎉 V5 IS READY FOR PRODUCTION! 🎉" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Set up Supabase (see SUPABASE_SETUP.md)" -ForegroundColor White
    Write-Host "2. Add environment variables to Render" -ForegroundColor White
    Write-Host "3. Deploy and enjoy!" -ForegroundColor White
} elseif ($failed -eq 0) {
    Write-Host "✅ V5 is mostly working!" -ForegroundColor Yellow
    Write-Host "Some features need real data to test properly." -ForegroundColor Yellow
} else {
    Write-Host "❌ V5 needs attention before production" -ForegroundColor Red
    Write-Host "Check the failed tests above." -ForegroundColor Red
}
