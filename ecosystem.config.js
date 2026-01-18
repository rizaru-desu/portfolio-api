/**
 * PM2 Ecosystem Configuration for ARM-based Low-Resource Devices
 *
 * Optimized for: Armbian (ARM64/ARMv7) on STB with 2GB RAM
 * Target Memory: 300-400 MB per instance
 * Mode: Fork (single instance)
 * Timezone: Asia/Jakarta
 */

module.exports = {
  apps: [
    {
      // =================================================================
      // Application Identity
      // =================================================================
      name: 'portfolio-api',
      script: './dist/main.js',
      cwd: './',

      // =================================================================
      // Execution Mode
      // =================================================================
      exec_mode: 'fork', // Single instance (no cluster for low RAM)
      instances: 1,

      // =================================================================
      // Environment Variables
      // =================================================================
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        TZ: 'Asia/Jakarta',

        // Node.js Memory Optimization for ARM (ONLY allowed flags in NODE_OPTIONS)
        // ⚠️ CRITICAL: --optimize-for-size is NOT allowed in NODE_OPTIONS
        // Only use flags that are permitted: https://nodejs.org/api/cli.html#node_optionsoptions
        NODE_OPTIONS: '--max-old-space-size=384',

        // UV_THREADPOOL_SIZE: Reduce from default 4 to 2 for low-resource devices
        UV_THREADPOOL_SIZE: 2,
      },

      // =================================================================
      // Memory Management (Critical for 2GB RAM devices)
      // =================================================================
      max_memory_restart: '400M', // Auto-restart if memory exceeds 400MB
      kill_timeout: 5000, // 5 seconds for graceful shutdown
      listen_timeout: 10000, // 10 seconds wait for app to be ready
      shutdown_with_message: true, // Enable graceful shutdown messages

      // =================================================================
      // Auto-Restart Configuration
      // =================================================================
      autorestart: true, // Auto-restart on crash
      max_restarts: 10, // Max restart attempts
      min_uptime: '10s', // Minimum uptime before considering healthy
      restart_delay: 4000, // 4 seconds delay between restarts

      // Exponential backoff for restarts (prevents restart loops)
      exp_backoff_restart_delay: 100,

      // =================================================================
      // Watch & Ignore (Disabled for production)
      // =================================================================
      watch: false, // No watch mode (saves CPU/RAM)
      ignore_watch: ['node_modules', 'logs', 'dist'],

      // =================================================================
      // Logging Configuration
      // =================================================================
      // Logs Directory
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      combine_logs: false, // Keep error and output separate
      merge_logs: false,

      // Log size management (will be handled by pm2-logrotate)
      log_type: 'json', // JSON for easier parsing

      // =================================================================
      // Process Management
      // =================================================================
      // PID file location
      pid_file: './logs/portfolio-api.pid',

      // Source maps for stack traces (disable to save memory)
      source_map_support: false,

      // =================================================================
      // Health Monitoring
      // =================================================================
      // Wait for ready signal from app
      wait_ready: false, // Set to true if using process.send('ready')

      // Cron-based restart (optional - restart daily at 3 AM Jakarta time)
      cron_restart: '0 3 * * *',

      // =================================================================
      // Advanced Options for ARM Optimization
      // =================================================================
      // Disable auto-dump on high memory (can freeze low-RAM devices)
      automation: false,

      // Reduce instance variable size
      instance_var: 'INSTANCE_ID',

      // =================================================================
      // Error Handling
      // =================================================================
      // Exit codes that should not trigger auto-restart
      stop_exit_codes: [0],

      // Time to wait before force killing
      kill_timeout: 5000,

      // Enable graceful shutdown
      shutdown_with_message: true,

      // =================================================================
      // Additional Metadata
      // =================================================================
      // Useful for monitoring
      vizion: false, // Disable version control features (saves memory)
      post_update: [], // No post-update commands

      // Tracking
      treekill: true, // Kill the entire process tree

      // =================================================================
      // Custom Environment Variables (optional)
      // =================================================================
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
  ],

  // =================================================================
  // Deployment Configuration (optional)
  // =================================================================
  deploy: {
    production: {
      user: 'root',
      host: 'your-stb-ip',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/opt/portfolio-api',
      'post-deploy':
        'pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      'post-setup': '',
    },
  },
};
