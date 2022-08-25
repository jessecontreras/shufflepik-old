//Node native path utility module
const resolve = require("path").resolve;
//const path = require("path");
//Load environment variables from .env file
require("dotenv").config({ path: resolve(__dirname, "./.env") });
//Shard Manager
const { ShardingManager } = require("discord.js");
//Create (instance) shard manager
const manager = new ShardingManager(`${__dirname}/register-events.js`, {
  token: process.env.DISCORD_BOT_TOKEN,
});
//Listen to shardCreate event and log id of launched shard
manager.on("shardCreate", (shard) => console.log(`Launched shard ${shard.id}`));
//Spawn shards
manager.spawn();
