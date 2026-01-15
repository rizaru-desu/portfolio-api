# GitHub Secrets Configuration - Quick Reference

## Required Secrets Setup

Configure these secrets at: `https://github.com/YOUR_USERNAME/portfolio-api/settings/secrets/actions`

---

## 1. SSH Authentication

### SSH_PRIVATE_KEY

**Generate SSH key:**

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Display private key (copy entire output)
cat ~/.ssh/github_actions_deploy
```

**Value format:**

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBl+...
...
-----END OPENSSH PRIVATE KEY-----
```

**Add public key to server:**

```bash
# Get public key
cat ~/.ssh/github_actions_deploy.pub

# SSH to server and add it
ssh -o ProxyCommand="cloudflared access ssh --hostname ssh.rizaru-desu.my.id" -p 7022 root@ssh.rizaru-desu.my.id

# On server
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys <<'EOF'
<paste public key here>
EOF
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## 2. Database Configuration

### DATABASE_URL

**PostgreSQL connection string:**

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

**Example:**

```
postgresql://postgres:mySecurePassword123@localhost:5432/portfolio?schema=public
```

**For external database:**

```
postgresql://user:pass@db.example.com:5432/portfolio?schema=public
```

---

## 3. Redis Configuration

### REDIS_URL

**Redis connection string:**

```
redis://[:PASSWORD@]HOST:PORT[/DATABASE]
```

**Examples:**

```
# Without password
redis://localhost:6379

# With password
redis://:myRedisPassword@localhost:6379

# With database selection
redis://:myRedisPassword@localhost:6379/0
```

---

## 4. JWT Secret

### JWT_SECRET

**Generate secure random secret:**

```bash
openssl rand -base64 32
```

**Example output:**

```
8f4c2d1e9b7a6f5d3c2b1a0987654321fedcba9876543210
```

**Use this value** as your `JWT_SECRET` in GitHub Secrets.

---

## 5-9. SMTP Configuration

### SMTP_HOST

**SMTP server hostname**

Examples:

- Gmail: `smtp.gmail.com`
- Outlook: `smtp-mail.outlook.com`
- SendGrid: `smtp.sendgrid.net`
- Mailgun: `smtp.mailgun.org`

---

### SMTP_PORT

**SMTP port number**

Common ports:

- `587` - TLS (recommended)
- `465` - SSL
- `25` - Unencrypted (not recommended)

**Use:** `587`

---

### SMTP_USER

**SMTP username (usually your email)**

Examples:

- `your-email@gmail.com`
- `apikey` (for SendGrid)
- `postmaster@your-domain.com` (for Mailgun)

---

### SMTP_PASSWORD

**SMTP password or app password**

> [!IMPORTANT]
> For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

**Generate Gmail App Password:**

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)" → "GitHub Actions"
4. Click "Generate"
5. Copy 16-character password
6. Use this as `SMTP_PASSWORD`

---

### SMTP_FROM

**Sender email address**

**Format:**

```
Name <email@domain.com>
```

**Examples:**

```
Portfolio API <noreply@yourdomain.com>
no-reply@yourdomain.com
```

---

## Quick Setup Commands

### Generate all at once:

```bash
#!/bin/bash

echo "=== GitHub Secrets Quick Setup ==="
echo ""

# SSH Key
echo "1. SSH_PRIVATE_KEY"
echo "Generating SSH key..."
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
echo ""
echo "Private key (copy to GitHub Secret SSH_PRIVATE_KEY):"
cat ~/.ssh/github_actions_deploy
echo ""
echo "Public key (add to server ~/.ssh/authorized_keys):"
cat ~/.ssh/github_actions_deploy.pub
echo ""

# JWT Secret
echo "2. JWT_SECRET"
echo "Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "$JWT_SECRET"
echo ""

echo "=== Next Steps ==="
echo "1. Add private key to GitHub Secret: SSH_PRIVATE_KEY"
echo "2. Add public key to server: ~/.ssh/authorized_keys"
echo "3. Add JWT secret to GitHub Secret: JWT_SECRET"
echo "4. Configure remaining secrets manually:"
echo "   - DATABASE_URL"
echo "   - REDIS_URL"
echo "   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM"
```

**Save as:** `setup-secrets.sh`

**Run:**

```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

---

## Secrets Verification Checklist

Before deploying, verify all secrets are configured:

```bash
# Check GitHub Secrets (via web UI)
# Go to: https://github.com/YOUR_USERNAME/portfolio-api/settings/secrets/actions
```

**Required secrets:**

- [ ] `SSH_PRIVATE_KEY` - ✅ Set
- [ ] `DATABASE_URL` - ✅ Set
- [ ] `REDIS_URL` - ✅ Set
- [ ] `JWT_SECRET` - ✅ Set
- [ ] `SMTP_HOST` - ✅ Set
- [ ] `SMTP_PORT` - ✅ Set
- [ ] `SMTP_USER` - ✅ Set
- [ ] `SMTP_PASSWORD` - ✅ Set
- [ ] `SMTP_FROM` - ✅ Set

**Total: 9 secrets required**

---

## Testing Secrets Locally

**Test SSH connection:**

```bash
ssh -o ProxyCommand="cloudflared access ssh --hostname ssh.rizaru-desu.my.id" -p 7022 root@ssh.rizaru-desu.my.id "echo 'SSH works!'"
```

**Test database connection:**

```bash
# On server or locally
psql "$DATABASE_URL" -c "SELECT version();"
```

**Test Redis connection:**

```bash
# On server or locally
redis-cli -u "$REDIS_URL" ping
# Expected: PONG
```

**Test SMTP:**

```bash
# Use a tool like swaks
swaks --to test@example.com \
  --from "$SMTP_FROM" \
  --server "$SMTP_HOST:$SMTP_PORT" \
  --auth LOGIN \
  --auth-user "$SMTP_USER" \
  --auth-password "$SMTP_PASSWORD" \
  --tls
```

---

## Security Best Practices

### ✅ DO:

- Use strong, random passwords (generated, not memorable)
- Rotate secrets periodically (every 90 days)
- Use different passwords for each service
- Enable 2FA on all accounts
- Use app passwords for Gmail (not main password)
- Restrict SSH key to specific IP if possible

### ❌ DON'T:

- Hardcode secrets in code
- Commit secrets to Git (even in private repos)
- Share secrets via insecure channels (Slack, email)
- Reuse passwords across services
- Use weak passwords (dictionary words, birthdays)

---

## Updating Secrets

**To update a secret:**

1. Go to: `Settings → Secrets and variables → Actions`
2. Click on the secret name
3. Click "Update secret"
4. Enter new value
5. Click "Update secret"

**After updating:**

- Re-run failed workflow (if any)
- Or push a new commit to trigger deployment

---

## Troubleshooting

### Secret not working?

**Check format:**

- No extra spaces or newlines
- No quotes around values (GitHub adds them automatically)
- Copy entire key/value (including headers/footers for SSH keys)

**Test manually:**

```bash
# Test on server
ssh ssh.rizaru-desu.my.id "env | grep DATABASE_URL"
```

**Common mistakes:**

- ❌ `DATABASE_URL="postgresql://..."` (quotes included)
- ✅ `DATABASE_URL=postgresql://...` (no quotes)

- ❌ SSH key missing header/footer
- ✅ Includes `-----BEGIN OPENSSH PRIVATE KEY-----`

---

## Summary

**9 required secrets** for full deployment automation:

| Secret            | Purpose        | Example                          |
| ----------------- | -------------- | -------------------------------- |
| `SSH_PRIVATE_KEY` | Server access  | ED25519 private key              |
| `DATABASE_URL`    | PostgreSQL     | `postgresql://user:pass@host/db` |
| `REDIS_URL`       | Redis cache    | `redis://:pass@host:6379`        |
| `JWT_SECRET`      | Auth tokens    | 32-byte random string            |
| `SMTP_HOST`       | Email server   | `smtp.gmail.com`                 |
| `SMTP_PORT`       | Email port     | `587`                            |
| `SMTP_USER`       | Email username | `user@gmail.com`                 |
| `SMTP_PASSWORD`   | Email password | App password                     |
| `SMTP_FROM`       | Sender email   | `noreply@domain.com`             |

**All secrets are encrypted and never exposed in logs.**

Once configured, your deployments will be fully automated and secure! 🔒
