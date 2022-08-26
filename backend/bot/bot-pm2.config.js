module.exports = {
  apps: [
    {
      name: "bot",
      script: "shard.js",
      exec_mode: "fork",
      listen_timeout: 5000,
      restart_delay: 5000,
      cwd: ".",
      env: {},
    },
  ],
};
