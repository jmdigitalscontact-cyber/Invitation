# Regenerate vercel-invitation/ static client preview (no PHP/database).
# Run from project root: powershell -File scripts/build-vercel-invitation.ps1

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dest = Join-Path $root "vercel-invitation"
$templateDir = $dest

Write-Host "Building static preview at: $dest"

# Preserve preview-only files before wipe
$preserve = @{}
foreach ($name in @("static-preview.js", "README.md")) {
    $path = Join-Path $templateDir $name
    if (Test-Path $path) {
        $preserve[$name] = Get-Content $path -Raw
    }
}

if (Test-Path $dest) {
    Remove-Item $dest -Recurse -Force
}
New-Item -ItemType Directory -Path $dest | Out-Null

$htmlFiles = @(
    "index.html", "home.html", "story.html", "venues.html", "attire.html",
    "details.html", "faq.html", "envelope.html", "rsvp.html"
)

foreach ($file in $htmlFiles) {
    $src = Join-Path $root $file
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $dest $file)
    }
}

Copy-Item (Join-Path $root "styles.css") $dest
Copy-Item (Join-Path $root "script.js") $dest

if (Test-Path (Join-Path $root "photos")) {
    Copy-Item (Join-Path $root "photos") (Join-Path $dest "photos") -Recurse
}
if (Test-Path (Join-Path $root "audio")) {
    Copy-Item (Join-Path $root "audio") (Join-Path $dest "audio") -Recurse
}
if (Test-Path (Join-Path $root "partials")) {
    Copy-Item (Join-Path $root "partials") (Join-Path $dest "partials") -Recurse
}

foreach ($name in $preserve.Keys) {
    Set-Content -Path (Join-Path $dest $name) -Value $preserve[$name] -NoNewline -Encoding utf8
}

Get-ChildItem (Join-Path $dest "*.html") | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -notmatch "static-preview\.js") {
        $content = $content -replace '<script src="\./script\.js"></script>', "<script src=`"./static-preview.js`"></script>`r`n    <script src=`"./script.js`"></script>"
    }
    $content = $content -replace '</script>\s*<script src="\./static-preview\.js">', "</script>`r`n    <script src=`"./static-preview.js`">"
    [System.IO.File]::WriteAllText($_.FullName, $content)
}

Write-Host "Done. Deploy the vercel-invitation folder to Vercel."
