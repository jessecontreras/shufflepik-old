//Node native path utility module
const path = require("path");
//Node native file system module
const fs = require("fs");
//
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
//Load environment variables from .env file
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const commands = [];
//Command file location reference
commandFilesLoc = "commands";
//Return array of file names that contain commands
const commandFiles = fs
  .readdirSync(commandFilesLoc)
  .filter((file) => file.endsWith(".js"));
//Set a new item in the collection with the key as the command name and
//the value as the exported module.
for (const file of commandFiles) {
  const command = require(`${path.resolve(
    __dirname,
    commandFilesLoc + "/" + file
  )}`);
  commands.push(command.data.toJSON());
}
//Use REST to access discord's guild registration service
const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_BOT_TOKEN);

rest
  .put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body: commands,
  })
  .then(() => console.log("Successfully registered application commands"))
  .catch(console.error);
