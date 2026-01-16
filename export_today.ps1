$today = (Get-Date).Date
$files = Get-ChildItem -Recurse -File | Where-Object { 
    $_.LastWriteTime.Date -eq $today -and 
    $_.FullName -notmatch "node_modules|\.git|\\export\\" 
}

foreach ($file in $files) {
    $fullPath = $file.FullName
    $basePath = (Get-Item .).FullName
    $relativePath = $fullPath.Replace($basePath, "").TrimStart("\")
    
    $destPath = Join-Path (Get-Item "export").FullName $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $fullPath -Destination $destPath -Force
    Write-Host "Copied: $relativePath"
}

Write-Host "Export complete!"
