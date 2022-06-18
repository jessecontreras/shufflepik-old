//noop function to spawn a recognizable process
process.send = process.send || function () { };
module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  },
};
