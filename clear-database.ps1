# Clear Database Script - Remove all existing data to start fresh
# This will clear all tables in your Supabase database

$ErrorActionPreference = "Stop"

# Supabase configuration
$SUPABASE_URL = "https://sfasytmtawwygurppxyj.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM"

Write-Host "🗑️ Starting database cleanup..." -ForegroundColor Yellow
Write-Host ""

# Function to delete all records from a table
function Clear-Table {
    param(
        [string]$TableName,
        [string]$Description
    )
    
    Write-Host "Clearing $Description..." -ForegroundColor Cyan
    
    $headers = @{
        "apikey" = $SUPABASE_ANON_KEY
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }
    
    try {
        # First, get count of records
        $countResponse = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/$TableName`?select=count" `
            -Headers @{
                "apikey" = $SUPABASE_ANON_KEY
                "Authorization" = "Bearer $SUPABASE_ANON_KEY"
                "Prefer" = "count=exact"
            } `
            -Method Head `
            -ErrorAction SilentlyContinue
        
        # Delete all records (using a condition that matches all)
        $deleteUrl = "$SUPABASE_URL/rest/v1/$TableName`?id=gte.0"
        
        $response = Invoke-RestMethod `
            -Uri $deleteUrl `
            -Headers $headers `
            -Method DELETE
        
        Write-Host "  ✅ Cleared $TableName table" -ForegroundColor Green
        
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  ⚠️ Table '$TableName' not found (might not exist yet)" -ForegroundColor Yellow
        } else {
            Write-Host "  ❌ Error clearing $TableName`: $_" -ForegroundColor Red
        }
    }
}

# Clear all tables
Write-Host "🔄 Clearing all conversation data..." -ForegroundColor Magenta
Write-Host ""

# Clear main tables
Clear-Table -TableName "messages" -Description "WhatsApp/VAPI messages"
Clear-Table -TableName "calls" -Description "VAPI call records"
Clear-Table -TableName "profiles" -Description "user profiles"
Clear-Table -TableName "conversation_context" -Description "conversation context"
Clear-Table -TableName "webhook_logs" -Description "webhook logs"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✨ Database cleared successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Send a fresh WhatsApp message to test" -ForegroundColor White
Write-Host "2. Make a new VAPI call" -ForegroundColor White
Write-Host "3. Ask about previous conversations to verify clean slate" -ForegroundColor White
Write-Host ""
Write-Host "The system will now start building context from scratch." -ForegroundColor Green
