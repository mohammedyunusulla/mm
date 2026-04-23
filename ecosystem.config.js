// PM2 ecosystem file — for manual PM2 management on the VM
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "mandi-api",
      script: "dist/index.js",
      cwd: "/opt/mandi/backend/src/backend",
      env_file: "/opt/mandi/backend/.env",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
    {
      name: "mandi-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/opt/mandi/frontend/src/frontend/web",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
