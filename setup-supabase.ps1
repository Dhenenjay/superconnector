#!/usr/bin/env pwsh

Write-Host @"
====================================
SUPABASE QUICK SETUP GUIDE
====================================

Your Supabase credentials are:
- URL: https://sfasytmtawwygurppxyj.supabase.co
- Key: [Already configured]

IMPORTANT: You MUST run the SQL schema first!

Steps:
1. Go to: https://supabase.com/dashboard/project/sfasytmtawwygurppxyj/sql/new
   (This should open SQL editor for your project)

2. Copy ALL content from 'supabase-schema.sql' file

3. Paste it in the SQL editor

4. Click the green 'Run' button

5. You should see "Success. No rows returned"

Have you completed these steps? (y/n): 
"@ -ForegroundColor Cyan

$answer = Read-Host

if ($answer -eq 'y') {
    Write-Host "`n✅ Great! Let's test the database connection..." -ForegroundColor Green
    
    # Test the connection
    $testUrl = "http://localhost:3001/health"
    
    Write-Host "Starting local server for testing..." -ForegroundColor Yellow
    $job = Start-Job -ScriptBlock { 
        Set-Location "C:\Users\Dhenenjay\superconnector-v2"
        node server-v5.js 
    }
    
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-RestMethod -Uri $testUrl -Method GET
        if ($response.database -eq "connected") {
            Write-Host "✅ Database connected successfully!" -ForegroundColor Green
            Write-Host "✅ Version: $($response.version)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Database not connected: $($response.database)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Could not test connection: $_" -ForegroundColor Red
    }
    
    Stop-Job $job
    Remove-Job $job
    
    Write-Host @"

NEXT STEPS:
===========
1. Commit and push the changes:
   git add -A
   git commit -m "Add server.js wrapper and Supabase config"
   git push

2. Trigger deployment on Render

3. Test with: ./test-v5.ps1

"@ -ForegroundColor Cyan
    
} else {
    Write-Host @"

Please complete the SQL setup first!

Direct link to your SQL editor:
https://supabase.com/dashboard/project/sfasytmtawwygurppxyj/sql/new

Copy the content from 'supabase-schema.sql' and run it there.

"@ -ForegroundColor Yellow
}
