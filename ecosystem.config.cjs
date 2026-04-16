/**
 * PM2: REST API (port 4000) + Vite preview of dist/ (port 4173).
 * Run from repo root after: ./scripts/setup-pm2.sh
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
    {
      name: 'it-department-spa',
      cwd: root,
      script: path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
      args: 'preview --host 0.0.0.0 --port 4173',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
  ],
}
