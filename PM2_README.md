# PM2 Configuration for Portfolio API on ARM Devices

## 📁 Files Created

1. **[ecosystem.config.js](file:///Users/rizal.achmad/Protection/personal/portofolio/backend/portfolio-api/ecosystem.config.js)** - PM2 process configuration
2. **[PM2_SETUP.md](file:///Users/rizal.achmad/Protection/personal/portofolio/backend/portfolio-api/PM2_SETUP.md)** - Complete setup guide
3. **[pm2-logrotate-setup.sh](file:///Users/rizal.achmad/Protection/personal/portofolio/backend/portfolio-api/pm2-logrotate-setup.sh)** - Automated logrotate setup script

---

## 🚀 Quick Start Commands

### On Your ARM Device (STB):

```bash
# 1. Install PM2
npm install -g pm2

# 2. Setup log rotation
bash pm2-logrotate-setup.sh

# 3. Create logs directory
mkdir -p logs

# 4. Start application
pm2 start ecosystem.config.js --env production

# 5. Enable auto-start on boot
pm2 startup
# Run the sudo command shown
pm2 save

# 6. Verify
pm2 status
pm2 logs portfolio-api
```

---

## ⚙️ Key Configuration Highlights

### Memory Management
- **Max Memory:** 400 MB (auto-restart)
- **Node.js Heap:** 384 MB
- **Mode:** Fork (single instance)
- **Instances:** 1

### Resource Optimization for ARM
- **UV_THREADPOOL_SIZE:** 2 (reduced from default 4)
- **GC Interval:** 100 (aggressive for ARM)
- **Optimize for Size:** Enabled
- **Max Semi-Space:** 16 MB

### Log Rotation
- **Max Size:** 10 MB
- **Retention:** 5 files
- **Compression:** Enabled (gzip)
- **Rotation:** Daily at midnight (Asia/Jakarta)

### Auto-Restart
- **On Crash:** Yes
- **Max Restarts:** 10
- **Min Uptime:** 10 seconds
- **Restart Delay:** 4 seconds
- **Daily Restart:** 3:00 AM (Asia/Jakarta)

---

## 📊 Expected Resource Usage

| Component | RAM Usage | Notes |
|-----------|-----------|-------|
| Node.js App | 200-350 MB | Normal operation |
| PM2 Daemon | 20-40 MB | Process manager |
| **Total** | **220-390 MB** | Well within 400MB limit |

**Total System RAM:** 2 GB  
**Available for App:** ~1-1.4 GB  
**Buffer for Spikes:** ~600-1000 MB  

---

## 🔍 Monitoring Commands

```bash
# Real-time monitoring
pm2 monit

# Check memory usage
pm2 describe portfolio-api | grep memory

# View logs
pm2 logs portfolio-api --lines 100

# List all processes
pm2 list
```

---

## 🛠️ Troubleshooting

### High Memory Usage
```bash
pm2 restart portfolio-api
# Or reduce limit in ecosystem.config.js
```

### Application Won't Start
```bash
pm2 logs portfolio-api --err --lines 50
node dist/main.js  # Test direct execution
```

### Auto-Start Not Working
```bash
pm2 unstartup
pm2 startup
# Run sudo command shown
pm2 save
```

---

## 📝 File Structure

```
portfolio-api/
├── ecosystem.config.js          # PM2 configuration
├── PM2_SETUP.md                 # Complete setup guide
├── pm2-logrotate-setup.sh       # Logrotate setup script
├── dist/
│   └── main.js                  # Application entry point
└── logs/
    ├── pm2-error.log            # Error logs
    ├── pm2-out.log              # Output logs
    └── portfolio-api.pid        # Process ID
```

---

## ✅ Deployment Checklist

- [ ] PM2 installed globally
- [ ] pm2-logrotate configured (run `pm2-logrotate-setup.sh`)
- [ ] `logs/` directory created
- [ ] Application built (`pnpm run build`)
- [ ] Environment variables configured (`.env`)
- [ ] PM2 started with `ecosystem.config.js`
- [ ] Auto-start enabled (`pm2 startup` + `pm2 save`)
- [ ] Tested reboot auto-start
- [ ] Verified memory usage < 400MB
- [ ] Application accessible on port 3000

---

## 📚 Additional Resources

- **Full Documentation:** [PM2_SETUP.md](file:///Users/rizal.achmad/Protection/personal/portofolio/backend/portfolio-api/PM2_SETUP.md)
- **PM2 Official Docs:** https://pm2.keymetrics.io/docs
- **PM2 Logrotate:** https://github.com/keymetrics/pm2-logrotate

---

**Platform:** Armbian (ARM64/ARMv7) with 2GB RAM  
**Timezone:** Asia/Jakarta  
**Last Updated:** 2026-01-18
