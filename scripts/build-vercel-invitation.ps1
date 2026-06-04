# Regenerate vercel-invitation/ static client preview (no PHP/database).
# Run from project root: powershell -File scripts/build-vercel-invitation.ps1

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dest = Join-Path $root "vercel-invitation"
$templateDir = $dest
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

Write-Host "Building static preview at: $dest"

# Preserve preview-only files before wipe (UTF-8 — avoid Windows-1252 mojibake)
$preserve = @{}
foreach ($name in @("static-preview.js", "README.md", "vercel.json")) {
    $path = Join-Path $templateDir $name
    if (Test-Path $path) {
        $preserve[$name] = [System.IO.File]::ReadAllText($path, $utf8NoBom)
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
Copy-Item (Join-Path $root "invite-alive.css") $dest
Copy-Item (Join-Path $root "intro.css") $dest
Copy-Item (Join-Path $root "invite-alive.js") $dest
Copy-Item (Join-Path $root "intro.js") $dest
Copy-Item (Join-Path $root "script.js") $dest
Copy-Item (Join-Path $root "invitation-reload.js") $dest

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
    [System.IO.File]::WriteAllText((Join-Path $dest $name), $preserve[$name], $utf8NoBom)
}

Get-ChildItem (Join-Path $dest "*.html") | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
    if ($content -notmatch "invitation-reload\.js") {
        if ($content -match "static-preview\.js") {
            $content = $content -replace '<script src="\./static-preview\.js"></script>', "<script src=`"./invitation-reload.js`"></script>`r`n    <script src=`"./static-preview.js`"></script>"
        } else {
            $content = $content -replace '<script src="\./script\.js"></script>', "<script src=`"./invitation-reload.js`"></script>`r`n    <script src=`"./script.js`"></script>"
        }
    }
    if ($content -notmatch "static-preview\.js") {
        $content = $content -replace '(<script src="\./invitation-reload\.js"></script>\s*)<script src="\./script\.js"></script>', "`$1<script src=`"./static-preview.js`"></script>`r`n    <script src=`"./script.js`"></script>"
    }
    [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
}

Write-Host "Done. Deploy the vercel-invitation folder to Vercel."
