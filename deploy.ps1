param(
    [string]$Server = "root@87.107.128.211",
    [string]$Dir = "/home/deploy/dokan-dashboard",
    [string]$Branch = "master",
    [string]$App = "vendor-pwa",
    [switch]$SkipPushCheck
)

$ErrorActionPreference = "Stop"

if (-not $SkipPushCheck) {
    Write-Host "Checking local state..." -ForegroundColor Cyan
    git fetch origin 2>$null | Out-Null
    $unpushed = [int](git rev-list --count "origin/$Branch..HEAD")
    if ($unpushed -gt 0) {
        Write-Host "You have $unpushed unpushed commit(s) on '$Branch'." -ForegroundColor Yellow
        Write-Host "The server pulls from GitHub, so it would deploy stale code." -ForegroundColor Yellow
        Write-Host "Run:  git push origin $Branch" -ForegroundColor Yellow
        Write-Host "Then re-run this script (or pass -SkipPushCheck to deploy anyway)." -ForegroundColor Yellow
        exit 1
    }
}

$RemoteScript = @"
set -e
cd $Dir
echo '--- pulling ---'
git pull origin $Branch
echo '--- installing ---'
npm ci
echo '--- building ---'
npm run build
echo '--- reloading ---'
pm2 reload $App --update-env
pm2 status
pm2 logs $App --lines 40 --nostream
"@

Write-Host "Deploying $Branch to $Server ..." -ForegroundColor Cyan
ssh $Server $RemoteScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeploy complete." -ForegroundColor Green
}
else {
    Write-Host "`nDeploy FAILED (exit $LASTEXITCODE). Site still runs the previous build." -ForegroundColor Red
    exit $LASTEXITCODE
}