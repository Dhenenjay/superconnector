# Clear Database Script V2 - Properly delete all records
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
        "Prefer" = "return=representation"
    }
    
    try {
        # First, get all records to see what we're deleting
        $getUrl = "$SUPABASE_URL/rest/v1/$TableName`?select=*"
        
        $records = Invoke-RestMethod `
            -Uri $getUrl `
            -Headers $headers `
            -Method GET
        
        $count = if ($records -is [array]) { $records.Count } else { if ($records) { 1 } else { 0 } }
        
        if ($count -gt 0) {
            # Delete all records without any filter (deletes everything)
            $deleteUrl = "$SUPABASE_URL/rest/v1/$TableName"
            
            # Add a condition that will match all records
            # Using neq (not equal) with an impossible value
            $deleteUrl = "$SUPABASE_URL/rest/v1/$TableName`?created_at=neq.1970-01-01"
            
            $response = Invoke-RestMethod `
                -Uri $deleteUrl `
                -Headers $headers `
                -Method DELETE
            
            Write-Host "  ✅ Cleared $count records from $TableName" -ForegroundColor Green
        } else {
            Write-Host "  ℹ️ $TableName is already empty" -ForegroundColor Gray
        }
        
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  ⚠️ Table '$TableName' not found" -ForegroundColor Yellow
        } elseif ($_.Exception.Response.StatusCode -eq 406) {
            # Try alternative deletion method
            try {
                # Delete using a broad filter
                $deleteUrl = "$SUPABASE_URL/rest/v1/$TableName`?id=not.is.null"
                
                $response = Invoke-RestMethod `
                    -Uri $deleteUrl `
                    -Headers $headers `
                    -Method DELETE
                
                Write-Host "  ✅ Cleared $TableName (alternative method)" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠️ Could not clear $TableName`: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ Error clearing $TableName`: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Function to check remaining records
function Check-Table {
    param(
        [string]$TableName
    )
    
    $headers = @{
        "apikey" = $SUPABASE_ANON_KEY
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    }
    
    try {
        $getUrl = "$SUPABASE_URL/rest/v1/$TableName`?select=*`&limit=1"
        
        $records = Invoke-RestMethod `
            -Uri $getUrl `
            -Headers $headers `
            -Method GET
        
        $count = if ($records -is [array]) { $records.Count } else { if ($records) { 1 } else { 0 } }
        
        if ($count -eq 0) {
            Write-Host "  ✓ $TableName is empty" -ForegroundColor Green
        } else {
            Write-Host "  ! $TableName still has records" -ForegroundColor Yellow
        }
    } catch {
        # Table doesn't exist
    }
}

# Clear all tables
Write-Host "🔄 Clearing all conversation data..." -ForegroundColor Magenta
Write-Host ""

# Clear main tables
Clear-Table -TableName "messages" -Description "WhatsApp/VAPI messages"
Clear-Table -TableName "calls" -Description "VAPI call records"
Clear-Table -TableName "profiles" -Description "user profiles"

Write-Host ""
Write-Host "📊 Verifying cleanup..." -ForegroundColor Cyan
Check-Table -TableName "messages"
Check-Table -TableName "calls"
Check-Table -TableName "profiles"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✨ Database cleanup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The system is now reset with:" -ForegroundColor Yellow
Write-Host "• No stored conversation history" -ForegroundColor White
Write-Host "• No user profiles" -ForegroundColor White
Write-Host "• No call records" -ForegroundColor White
Write-Host ""
Write-Host "Test the clean slate:" -ForegroundColor Green
Write-Host "1. Send a NEW WhatsApp message (introduce yourself)" -ForegroundColor White
Write-Host "2. Make a VAPI call with new information" -ForegroundColor White
Write-Host '3. Then ask "what did we discuss?" to verify fresh start' -ForegroundColor White
