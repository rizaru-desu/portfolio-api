# PM2 Setup Guide for ARM-based Low-Resource Devices

Complete guide for running portfolio-api on Armbian (ARM64/ARMv7) STB with 2GB RAM.

---

## 📋 Prerequisites

- Armbian OS (ARM64 or ARMv7)
- Node.js LTS (v18.x or v20.x)
- 2GB RAM minimum
- At least 1GB free disk space

---

## 🚀 Quick Start

### 1. Install PM2 Globally

```bash
npm install -g pm2

# Verify installation
pm2 --version
```

### 2. Install PM2 Log Rotation Module

```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation for ARM devices
pm2 set pm2-logrotate:max_size 10M          # Rotate when log reaches 10MB
pm2 set pm2-logrotate:retain 5              # Keep only 5 rotated files
pm2 set pm2-logrotate:compress true         # Compress rotated logs (saves space)
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD # Date format for rotated files
pm2 set pm2-logrotate:workerInterval 30     # Check every 30 seconds
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Rotate daily at midnight
pm2 set pm2-logrotate:rotateModule true     # Rotate PM2 module logs too
pm2 set pm2-logrotate:TZ Asia/Jakarta       # Timezone

# Verify configuration
pm2 conf pm2-logrotate
```

### 3. Create Logs Directory

```bash
mkdir -p logs
chmod 755 logs
```

### 4. Start Application with PM2

```bash
# Start with ecosystem config
pm2 start ecosystem.config.js --env production

# OR start directly
pm2 start dist/main.js --name portfolio-api --max-memory-restart 400M

# Check status
pm2 status
pm2 logs portfolio-api
```

### 5. Enable Auto-Start on System Boot

```bash
# Generate startup script
pm2 startup

# Copy and run the command shown (something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-username --hp /home/your-username

# Save current PM2 process list
pm2 save

# Verify startup configuration
pm2 startup show
```

### 6. Verify Everything is Working

```bash
# Check PM2 status
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs portfolio-api --lines 100

# Check memory usage
pm2 describe portfolio-api
```

---

## 🔧 PM2 Logrotate Configuration

### Complete Configuration Commands

```bash
pm2 install pm2-logrotate

# Maximum file size before rotation (10MB for low storage)
pm2 set pm2-logrotate:max_size 10M

# Number of rotated logs to keep (5 = ~50MB total if compressed)
pm2 set pm2-logrotate:retain 5

# Compress old logs with gzip (saves 70-90% space)
pm2 set pm2-logrotate:compress true

# Date format for rotated files
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD-HH-mm

# How often to check for rotation (30 seconds)
pm2 set pm2-logrotate:workerInterval 30

# Cron schedule for forced rotation (daily at midnight Jakarta time)
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Also rotate PM2's own logs
pm2 set pm2-logrotate:rotateModule true

# Timezone for log rotation
pm2 set pm2-logrotate:TZ Asia/Jakarta

# Save configuration
pm2 save
```

### Verify Logrotate Status

```bash
# Check pm2-logrotate module status
pm2 describe pm2-logrotate

# View logrotate configuration
pm2 conf pm2-logrotate

# Test log rotation manually
pm2 trigger pm2-logrotate rotate
```

---

## 📊 Resource Tuning Explanation

### Memory Optimization

| Parameter             | Value | Reason                                                              |
| --------------------- | ----- | ------------------------------------------------------------------- |
| `max_memory_restart`  | 400M  | Prevents memory leaks; auto-restart before reaching critical levels |
| `max-old-space-size`  | 384   | Node.js heap limit (96% of max_memory_restart)                      |
| `max-semi-space-size` | 16    | Limits young generation heap (reduces GC pauses on ARM)             |
| `UV_THREADPOOL_SIZE`  | 2     | Default is 4; reduce to save ~50-100MB RAM                          |
| `instances`           | 1     | Fork mode uses 1 core; cluster mode would require 800MB+            |

### CPU Optimization for ARM

| Parameter             | Value      | Reason                                             |
| --------------------- | ---------- | -------------------------------------------------- |
| `exec_mode`           | fork       | Single process; cluster mode too heavy for 2GB RAM |
| `--optimize-for-size` | enabled    | Trades some speed for lower memory footprint       |
| `--gc-interval`       | 100        | Frequent GC prevents memory buildup on ARM         |
| `cron_restart`        | 3 AM daily | Fresh start daily during low-traffic hours         |

### Logging Optimization

| Parameter      | Value | Reason                                     |
| -------------- | ----- | ------------------------------------------ |
| `max_size`     | 10M   | Small log files suitable for ARM storage   |
| `retain`       | 5     | Keep 5 rotations = ~50MB max (compressed)  |
| `compress`     | true  | Gzip saves 70-90% disk space               |
| `combine_logs` | false | Separate error/output for easier debugging |

### Why These Settings?

**2GB RAM Breakdown:**

- OS: ~400-600MB
- System services: ~200-400MB
- **Available for apps: ~1000-1400MB**
- Portfolio-API (PM2): ~400MB
- Buffer for spikes: ~600-1000MB

**ARM-Specific Considerations:**

- ARM CPUs are slower at garbage collection → aggressive GC needed
- Limited RAM requires strict memory limits
- Slower I/O → log rotation critical to prevent disk fills
- Lower power → avoid cluster mode (context switching overhead)

---

## 🛠️ Common PM2 Commands

### Process Management

```bash
# Start
pm2 start ecosystem.config.js --env production

# Stop
pm2 stop portfolio-api

# Restart (graceful with 5s timeout)
pm2 restart portfolio-api

# Reload (zero-downtime, but needs cluster mode - not for this setup)
pm2 reload portfolio-api

# Delete from PM2
pm2 delete portfolio-api

# Stop all and delete
pm2 kill
```

### Monitoring & Logs

```bash
# Real-time monitoring (CPU, Memory)
pm2 monit

# View logs (live tail)
pm2 logs portfolio-api

# View last 100 lines
pm2 logs portfolio-api --lines 100

# Flush logs
pm2 flush

# Detailed process info
pm2 describe portfolio-api

# List all processes
pm2 list
pm2 status
```

### Updates & Maintenance

```bash
# Update PM2
npm install -g pm2@latest

# Update PM2 daemon
pm2 update

# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect

# Clear saved process list
pm2 cleardump
```

---

## 🔍 Troubleshooting

### High Memory Usage

```bash
# Check current memory
pm2 describe portfolio-api | grep memory

# Force garbage collection restart
pm2 restart portfolio-api

# Lower memory limit if still high
pm2 delete portfolio-api
# Edit ecosystem.config.js: max_memory_restart: '350M'
pm2 start ecosystem.config.js
```

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs portfolio-api --err --lines 50

# Check Node.js version
node --version  # Should be v18+ or v20+

# Verify dist/main.js exists
ls -lh dist/main.js

# Check permissions
chmod +x dist/main.js

# Test direct Node.js execution
node dist/main.js
```

### Auto-Start Not Working After Reboot

```bash
# Check startup configuration
pm2 startup show

# Regenerate startup script
pm2 unstartup
pm2 startup
# Run the sudo command shown

# Save again
pm2 save

# Test by rebooting
sudo reboot
```

### Logs Growing Too Large

```bash
# Verify pm2-logrotate is installed
pm2 describe pm2-logrotate

# Check current log sizes
du -sh logs/*

# Force rotation
pm2 trigger pm2-logrotate rotate

# Reduce max_size if needed
pm2 set pm2-logrotate:max_size 5M
```

---

## 📈 Performance Monitoring

### Check Resource Usage

```bash
# PM2 monitoring dashboard
pm2 monit

# Detailed metrics
pm2 describe portfolio-api

# System resources
htop
free -h
df -h
```

### Memory Profiling

```bash
# Enable memory profiling
NODE_OPTIONS="--inspect" pm2 start ecosystem.config.js

# Or use PM2's built-in profiling
pm2 profile:mem portfolio-api

# Stop profiling after 30 seconds
# Check generated heap snapshot
```

---

## 🔐 Security Best Practices

```bash
# Run as non-root user (recommended)
sudo adduser --system --group pmuser
sudo chown -R pmuser:pmuser /path/to/portfolio-api

# Switch to pmuser
sudo su - pmuser

# Then setup PM2
pm2 start ecosystem.config.js
pm2 startup  # Creates systemd service as pmuser
pm2 save

# Limit log file permissions
chmod 640 logs/*.log
```

---

## 📝 Deployment Checklist

- [ ] Node.js LTS installed
- [ ] PM2 installed globally
- [ ] pm2-logrotate configured
- [ ] `logs/` directory created
- [ ] Application built (`pnpm run build`)
- [ ] Environment variables configured
- [ ] PM2 started with ecosystem.config.js
- [ ] Auto-start enabled (`pm2 startup` + `pm2 save`)
- [ ] Logs rotating properly
- [ ] Memory usage < 400MB
- [ ] Application accessible on port 3000
- [ ] Tested reboot auto-start

---

## 🆘 Support

If you encounter issues:

1. Check logs: `pm2 logs portfolio-api --lines 100`
2. Check PM2 status: `pm2 status`
3. Check system resources: `free -h && df -h`
4. Review PM2 logrotate: `pm2 conf pm2-logrotate`
5. Verify Node.js version: `node --version`

---

**Last Updated:** 2026-01-18  
**Target Platform:** Armbian (ARM64/ARMv7) with 2GB RAM  
**Tested On:** STB devices running Armbian
