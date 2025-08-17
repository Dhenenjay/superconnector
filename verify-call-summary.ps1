# Verify call summary is being stored
$SUPABASE_URL = "https://sfasytmtawwygurppxyj.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
}

Write-Host ""
Write-Host "Checking Latest Call Data..." -ForegroundColor Yellow
Write-Host ""

# Get the most recent call
$calls = Invoke-RestMethod `
    -Uri "$SUPABASE_URL/rest/v1/calls?select=*&order=created_at.desc&limit=1" `
    -Headers $headers `
    -Method GET

if ($calls) {
    $call = $calls[0]
    Write-Host "Latest Call:" -ForegroundColor Cyan
    Write-Host "  Status: $($call.status)" -ForegroundColor $(if ($call.status -eq "completed") { "Green" } else { "Yellow" })
    Write-Host "  Created: $($call.created_at)" -ForegroundColor Gray
    Write-Host "  Summary: $($call.summary)" -ForegroundColor $(if ($call.summary) { "Green" } else { "Red" })
    
    if ($call.status -eq "completed" -and $call.summary) {
        Write-Host ""
        Write-Host "SUCCESS! Call summary is being stored properly!" -ForegroundColor Green
        Write-Host "WhatsApp should now be able to retrieve this." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "ISSUE: Call is not completed or summary is missing" -ForegroundColor Red
        Write-Host "Wait for deployment to finish and try a new call" -ForegroundColor Yellow
    }
} else {
    Write-Host "No calls found" -ForegroundColor Red
}
