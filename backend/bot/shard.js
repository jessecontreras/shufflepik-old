//Node native path utility module
import { resolve } from "path";
//Load environment variables from .env file
require("dotenv").config({ path: resolve(__dirname, "./.env") });
//Shard Manager
import { ShardingManager } from "discord.js";
//Create (instance) shard manager
const manager = new ShardingManager(`${__dirname}/register-events.js`, {
  token: process.env.DISCORD_BOT_TOKEN,
});
//Listen to shardCreate event and log id of launched shard
manager.on("shardCreate", (shard) => console.log(`Launched shard ${shard.id}`));
//Spawn shards
manager.spawn();
