module.exports = {
  apps: [
    {
      name: "bot",
      script: "register-events.js",
      instances: "max",
      exec_mode: "cluster",
      listen_timeout: 15000,
      restart_delay: 15000,
      cwd: ".",
      env: {},
    },
  ],
};
