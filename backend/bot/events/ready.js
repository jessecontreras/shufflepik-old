const { Connection } = require("../../server/helpers/mongoConnection.helper");

// noop function to spawn a recognizable process
process.send = process.send || function () {};
module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    try {
      console.log(`\nReady! Logged in as ${client.user.tag}`);
      await Connection.open();
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
};
