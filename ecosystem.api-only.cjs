/**
 * PM2: REST API only (port 4000). Static SPA is served by nginx from dist/ → WEB_ROOT.
 * Clean install: scripts/clean-install-nginx-pm2.sh
 * Updates:       scripts/update-pm2-app.sh
 */
const path = require('path')
const root = __dirname

module.exports = {
  apps: [
    {
      name: 'it-department-api',
      cwd: path.join(root, 'backend'),
      script: path.join(root, 'backend', 'dist', 'index.js'),
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
  ],
}
