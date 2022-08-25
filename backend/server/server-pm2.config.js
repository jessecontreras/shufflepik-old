module.exports = {
  apps: [
    {
      name: "server",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      listen_timeout: 5000,
      restart_delay: 5000,
      cwd: ".",
      env: {},
    },
  ],
};
