$TOKEN = "gDALrdxH4lN4CXjXmLjoBMQx"

Write-Host "Checking existing projects..." -ForegroundColor Cyan

# First, check existing projects
$headers = @{
    "Authorization" = "Bearer $TOKEN"
}

try {
    $projects = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects" `
        -Method GET `
        -Headers $headers
    
    Write-Host "Found $($projects.projects.Count) projects:" -ForegroundColor Yellow
    foreach ($proj in $projects.projects) {
        Write-Host "  - $($proj.name) (ID: $($proj.id))" -ForegroundColor Gray
    }
    
    # Check if eli-superconnector exists
    $eliProject = $projects.projects | Where-Object { $_.name -eq "eli-superconnector" }
    
    if ($eliProject) {
        Write-Host "Found existing eli-superconnector project!" -ForegroundColor Green
        Write-Host "Latest deployment: $($eliProject.latestDeployments[0].url)" -ForegroundColor Cyan
        
        # Get project details
        $projectDetails = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$($eliProject.id)" `
            -Method GET `
            -Headers $headers
            
        Write-Host "Project framework: $($projectDetails.framework)" -ForegroundColor Gray
        Write-Host "Production URL: https://$($projectDetails.alias[0])" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "Error checking projects: $($_.Exception.Message)" -ForegroundColor Red
}
