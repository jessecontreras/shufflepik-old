//!!!!--THIS IS OUR index.js or server.js or our "main"--!!!!//

//Node native path utility module
const path = require("path");
//Node native file system module
const fs = require("fs");
//Load environment variables from .env file
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const { Client, Intents } = require("discord.js");

const discordClient = new Client({ intents: [Intents.FLAGS.GUILDS] });
//Command file location reference
eventFilesLoc = "events";
//Return array of file names that contain events
const eventFiles = fs
  .readdirSync(eventFilesLoc)
  .filter((file) => file.endsWith(".js"));
//Expose event.once and event.on methods to register event listeners. Aforementioned methods
//take both event name as argument and callback function, callback function passes returned event
//values as arguments to the execute function.
for (const file of eventFiles) {
  const event = require(`${path.resolve(
    __dirname,
    eventFilesLoc + "/" + file
  )}`);
  if (event.once) {
    discordClient.once(event.name, (...args) => event.execute(...args));
  } else {
    discordClient.on(event.name, (...args) => event.execute(...args));
  }
}
//login client
discordClient.login(process.env.DISCORD_BOT_TOKEN);

//Node.js process, enable graceful shutdown
process.on("SIGINT", () => {
  process.exit(0);
});

/**
 * Returns the total (accumulated) number of guilds being served.
 *
 * @returns {number} total number of guilds across all shards
 */
async function totalGuilds() {
  try {
    const shards = await discordClient.shard.fetchClientValues(
      "guilds.cache.size"
    );
    const numberOfGuilds = shards.reduce((acc, guilds) => acc + guilds, 0);

    return numberOfGuilds;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Returns the total (accumulated) number of guilds being served.
 *
 * @returns {number} total number of users accross all shards.
 */
async function totalUsers() {
  try {
    const shards = await discordClient.shard.broadcastEval((c) =>
      c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    );
    const numberOfUsers = shards.reduce(
      (acc, memberCount) => acc + memberCount,
      0
    );

    return numberOfUsers;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
