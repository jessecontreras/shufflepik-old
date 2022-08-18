module.exports = {
  apps: [
    {
      name: "bot",
      script: "shard.js",
      exec_mode: "fork",
      listen_timeout: 15000,
      restart_delay: 15000,
      cwd: ".",
      env: {},
    },
  ],
};
