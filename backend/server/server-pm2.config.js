module.exports = {
  apps: [
    {
      name: "server",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      listen_timeout: 10000,
      restart_delay: 10000,
      cwd: ".",
      env: {},
    },
  ],
};
