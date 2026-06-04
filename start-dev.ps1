# Start local dev server (PHP + PostgreSQL) on http://localhost:3000
$ErrorActionPreference = "Stop"

$phpCandidates = @(
    "php",
    "D:\xampp\php\php.exe",
    "C:\xampp\php\php.exe"
)

$php = $null
foreach ($candidate in $phpCandidates) {
    if ($candidate -eq "php") {
        $cmd = Get-Command php -ErrorAction SilentlyContinue
        if ($cmd) {
            $php = $cmd.Source
            break
        }
        continue
    }
    if (Test-Path $candidate) {
        $php = $candidate
        break
    }
}

if (-not $php) {
    Write-Host "PHP not found. Install PHP or add it to PATH." -ForegroundColor Red
    Write-Host "  winget install PHP.PHP.8.2"
    Write-Host "  Or use: D:\xampp\php\php.exe (from XAMPP, Apache/MySQL not required)"
    exit 1
}

$root = $PSScriptRoot
Write-Host "Using: $php"
Write-Host "Serving: $root"
Write-Host "Open:    http://localhost:3000/"
Write-Host "Admin:   http://localhost:3000/rsvp/admin.php"
Write-Host "Setup:   http://localhost:3000/rsvp/setup.php"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

Set-Location $root
& $php -S localhost:3000 -t $root
