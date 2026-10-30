# Deployment Guide

How to deploy this Next.js PWA to a fresh Ubuntu VPS, and how to ship updates afterwards.

**Stack:** Next.js 16 (webpack build) · Node 22 · pm2 · Nginx · Let's Encrypt

---

## Architecture

```
Browser
   │  HTTPS
   ▼
Nginx (443)  ──/blog──▶  WordPress API host (e.g. beautyme24.com)
   │
   │  proxy_pass 127.0.0.1:3000
   ▼
pm2 ──▶ next start
```

The app is **stateless**: auth is a JWT cookie, all data comes from an external
WordPress REST API. There is no database to migrate.

---

## Placeholders used below

Replace these before running anything:

| Placeholder | Meaning | Example |
|---|---|---|
| `SERVER_IP` | VPS public IPv4 | `87.107.128.211` |
| `DOMAIN` | Public hostname | `example.com` |
| `WP_API_URL` | WordPress REST root | `https://api.example.com/wp-json` |
| `APP_DIR` | Deploy path on server | `/home/deploy/dokan-dashboard` |
| `REPO_URL` | Git SSH clone URL | `git@github.com:user/repo.git` |
| `EMAIL` | Certbot contact | `you@example.com` |

---

# Part 1 — Server setup (one time)

## 1.1 Base system

Install **Ubuntu 22.04 x86_64**. Minimum 2 GB RAM (4 GB recommended — `next build`
peaks around 2–3 GB).

```bash
ssh root@SERVER_IP
```

```bash
# swap (protects the build from OOM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw enable

# packages
apt update
apt install -y curl ca-certificates git build-essential nginx

# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# pm2
npm install -g pm2

node -v   # expect v22.x
```

> **Do not** use `ufw allow 'Nginx Full'` before installing nginx — the profile
> does not exist yet and the rule is silently ignored. Use the port rules above.

## 1.2 Get the code onto the server

Create a **read-only deploy key**. On the server:

```bash
ssh-keygen -t ed25519 -C "deploy-key-$(hostname)" -f /root/.ssh/id_ed25519
cat /root/.ssh/id_ed25519.pub
```

Paste that output into GitHub:

**Repo → Settings → Deploy keys → Add deploy key** → leave *Allow write access*
**unchecked**.

Then:

```bash
ssh-keyscan github.com >> /root/.ssh/known_hosts
git clone REPO_URL APP_DIR
cd APP_DIR
```

## 1.3 Production environment

Secrets never live in git. Create the file directly on the server:

```bash
cd APP_DIR
cat > .env.production <<'EOF'
NEXT_PUBLIC_WP_API_URL=WP_API_URL
NESHAN_API_KEY=your_real_key_here
EOF
```

`.env*` is gitignored, so `git reset --hard` during deploys will not delete this
file. Verify:

```bash
git check-ignore -v .env.production
```

## 1.4 Build and run

```bash
cd APP_DIR
npm ci
npm run build

pm2 start npm --name vendor-pwa -- start
pm2 save
pm2 startup   # then run the command it prints
```

Verify locally on the server:

```bash
curl -i http://localhost:3000    # expect 307 -> /login
```

If the build dies with `JavaScript heap out of memory`:

```bash
export NODE_OPTIONS=--max-old-space-size=3072
npm run build
```

## 1.5 Nginx

`/etc/nginx/sites-available/vendor-pwa`:

```nginx
server {
    listen 80;
    server_name DOMAIN www.DOMAIN;

    location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name DOMAIN www.DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Service worker MUST NOT be cached, or users stay on old builds forever
    location = /sw.js {
        proxy_pass http://127.0.0.1:3000;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **nginx version note.** Ubuntu 22.04 ships nginx 1.18, which does **not**
> support the standalone `http2 on;` directive. Use `listen 443 ssl http2;` as
> above. On nginx 1.25.1+ prefer `listen 443 ssl;` + `http2 on;`.

Enable it:

```bash
ln -s /etc/nginx/sites-available/vendor-pwa /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

`nginx -t` must print `test is successful` before reloading.

## 1.6 TLS certificate

Point DNS first, then issue the certificate.

```
A     @     SERVER_IP
A     www   SERVER_IP
```

> Use an `A` record for `www`, not a `CNAME`. CNAME chains can resolve to stale
> parking hosts, producing `SSL routines::unexpected eof` on `https://www`.

**Try HTTP validation first:**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d DOMAIN -d www.DOMAIN
```

**If certbot fails with `Timeout during connect`** but the site is reachable from
a normal browser, the server sits behind a network that Let's Encrypt's validators
cannot reach (common for Iranian datacenters). Use DNS validation instead:

```bash
certbot certonly --manual --preferred-challenges dns \
  --agree-tos --no-eff-email -m EMAIL \
  -d DOMAIN -d www.DOMAIN
```

Certbot prints a TXT value. Add it at your registrar, verify, press Enter:

| Type | Name | Value |
|---|---|---|
| TXT | `_acme-challenge` | *(token certbot printed)* |

Verify from another machine before pressing Enter:

```bash
nslookup -type=TXT _acme-challenge.DOMAIN 8.8.8.8
```

> Certbot asks for `_acme-challenge.www.DOMAIN` first, then
> `_acme-challenge.DOMAIN`. Your DNS panel's Name field must be
> `_acme-challenge.www`, then `_acme-challenge` — **not** the full domain, since
> the panel appends the zone automatically.

## 1.7 Verify

```bash
curl -I https://DOMAIN          # 307 -> /login
curl -I https://www.DOMAIN      # 307 -> /login
curl -I http://DOMAIN           # 301 -> https
curl -I https://DOMAIN/sw.js    # 200 + no-cache
```

---

# Part 2 — Local machine setup (one time, per developer)

## 2.1 Clone the repo

```powershell
git clone REPO_URL
cd dokan-dashboard
```

## 2.2 Authorize your SSH key on the server

`deploy.ps1` runs `ssh` in the background, so key auth is required (a password
prompt would hang it).

Print your public key:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

If you have no key yet:

```powershell
ssh-keygen -t ed25519 -C "$env:USERNAME@local"
```

Then add it on the server (paste in your SSH session):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAA...your-key... you@local' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Test passwordless login:

```powershell
ssh -o BatchMode=yes root@SERVER_IP "echo SSH_OK"
```

`SSH_OK` means you're ready.

## 2.3 Configure the script

`deploy.ps1` defaults are correct for the primary server. For a different one,
either edit the `param()` block or pass flags at run time.

---

# Part 3 — Shipping updates

## 3.1 From VS Code

Open the project folder, open the terminal (**Ctrl + `**), confirm the prompt is
`PS D:\...\dokan-dashboard>`.

Use the **Source Control** panel (Ctrl+Shift+G) to commit and push, then:

```powershell
.\deploy.ps1
```

## 3.2 From the command line

```powershell
git add -A
git commit -m "what changed"
git push
.\deploy.ps1
```

## 3.3 What the script does

1. Refuses to run if you have unpushed commits (prevents deploying stale code)
2. SSHes to the server
3. `git fetch` + `git reset --hard origin/master` — sync exactly to GitHub
4. `npm ci` — clean dependency install
5. `npm run build`
6. `pm2 reload vendor-pwa`
7. Prints `pm2 status` and the last 40 log lines

A **failed build never reaches production** — `pm2 reload` only runs after the
build succeeds, so the previous build keeps serving.

## 3.4 Flags

```powershell
.\deploy.ps1 -Server "root@1.2.3.4"       # different host
.\deploy.ps1 -Dir "/srv/app"              # different path
.\deploy.ps1 -Branch "develop"            # different branch
.\deploy.ps1 -SkipPushCheck               # deploy despite unpushed commits
```

---

# Part 4 — Troubleshooting

**`running scripts is disabled on this system`**

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

or permanently:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**`You have N unpushed commit(s)`** — run `git push` first.

**Terminal closed / SSH dropped mid-build** — the build continues on the server:

```powershell
ssh root@SERVER_IP "tail -20 /tmp/deploy.log; pm2 list"
```

Look for `DEPLOY_OK`. If absent, just re-run `.\deploy.ps1` (safe to repeat).

**`Deploy FAILED`** — the live site is untouched. Check why:

```powershell
ssh root@SERVER_IP "pm2 logs vendor-pwa --lines 50 --nostream"
```

Usually a TypeScript error. Run `npm run build` locally first to catch it before
pushing.

**Changes not visible** — hard-refresh (`Ctrl+Shift+R`). Favicons and the service
worker have their own caches; close all tabs for the domain and reopen.

**`fatal: detected dubious ownership`** on the server — the repo owner differs
from the user running git:

```bash
chown -R root:root APP_DIR
```

**502 Bad Gateway** — Nginx is fine but the app is down:

```bash
pm2 list
pm2 restart vendor-pwa
pm2 logs vendor-pwa --lines 50 --nostream
```

**Stale service worker** — confirm the header is correct:

```bash
curl -I https://DOMAIN/sw.js | grep -i cache-control
```

Must be exactly `no-cache, no-store, must-revalidate`.

---

# Appendix — Important conventions

- **Never edit code on the server.** `deploy.ps1` runs `git reset --hard`, which
  discards server-side edits.
- **Secrets live only in `.env.production` on the server** — never in git.
- **`public/sw.js` is a build artifact** and is gitignored. Serwist regenerates
  it during `npm run build`.
- **The server only gets what is on GitHub.** Commit and push before deploying.
- **Certificate renewal:** a `--manual` certificate does not auto-renew. Check
  with `certbot certificates` and renew before expiry, or switch to a DNS plugin
  (`certbot-dns-cloudflare` etc.) for automatic renewal.
