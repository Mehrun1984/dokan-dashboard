param(
    [string]$Server = "root@87.107.128.211",
    [string]$Dir = "/home/deploy/dokan-dashboard",
    [string]$Branch = "master",
    [string]$App = "vendor-pwa"
)

$RemoteScript = @"
set -e
cd $Dir
git pull origin $Branch
npm ci
npm run build
pm2 reload $App --update-env
pm2 logs $App --lines 40 --nostream
"@

Write-Host "Deploying $Branch to $Server ..." -ForegroundColor Cyan
ssh $Server $RemoteScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeploy complete." -ForegroundColor Green
}
else {
    Write-Host "`nDeploy FAILED (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}