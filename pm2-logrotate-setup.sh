#!/bin/bash
################################################################################
# PM2 Logrotate Configuration Script for ARM Devices
# 
# This script configures pm2-logrotate module for optimal performance
# on low-resource ARM-based devices (2GB RAM)
#
# Usage: bash pm2-logrotate-setup.sh
################################################################################

set -e

echo "================================================"
echo "PM2 Logrotate Configuration for ARM Devices"
echo "================================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Please install PM2 first:"
    echo "   npm install -g pm2"
    exit 1
fi

echo "✅ PM2 found: $(pm2 --version)"
echo ""

# Install pm2-logrotate module
echo "📦 Installing pm2-logrotate module..."
pm2 install pm2-logrotate
echo ""

# Wait for module to initialize
echo "⏳ Waiting for module initialization..."
sleep 3
echo ""

# Configure pm2-logrotate
echo "🔧 Configuring pm2-logrotate..."

# Maximum file size before rotation (10MB - suitable for ARM devices)
echo "   Setting max_size to 10M..."
pm2 set pm2-logrotate:max_size 10M

# Number of rotated logs to keep (5 files)
echo "   Setting retain to 5..."
pm2 set pm2-logrotate:retain 5

# Compress old logs with gzip (saves 70-90% disk space)
echo "   Enabling compression..."
pm2 set pm2-logrotate:compress true

# Date format for rotated files
echo "   Setting date format..."
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD-HH-mm

# Check interval (30 seconds)
echo "   Setting worker interval to 30s..."
pm2 set pm2-logrotate:workerInterval 30

# Cron schedule for forced rotation (daily at midnight Jakarta time)
echo "   Setting rotation interval (daily at midnight)..."
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Rotate PM2 module logs too
echo "   Enabling module log rotation..."
pm2 set pm2-logrotate:rotateModule true

# Set timezone
echo "   Setting timezone to Asia/Jakarta..."
pm2 set pm2-logrotate:TZ Asia/Jakarta

echo ""
echo "✅ pm2-logrotate configuration completed!"
echo ""

# Display configuration
echo "================================================"
echo "Current pm2-logrotate Configuration:"
echo "================================================"
pm2 conf pm2-logrotate
echo ""

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save
echo ""

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Start your application with PM2:"
echo "   pm2 start ecosystem.config.js --env production"
echo ""
echo "2. Verify log rotation is working:"
echo "   pm2 describe pm2-logrotate"
echo ""
echo "3. Test manual rotation (optional):"
echo "   pm2 trigger pm2-logrotate rotate"
echo ""
echo "4. Monitor logs:"
echo "   pm2 logs portfolio-api"
echo ""
