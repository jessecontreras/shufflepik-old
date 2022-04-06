//Load environment variables frmo .env file
require("dotenv").config();
//Back end web framework
var express = require("express");
var app = express();
//Node native cors system module
var cors = require("cors");
app.use(cors());
//Node native path system module
const path = require("path");
//Node native file system module
const fs = require("fs");
//NPM module provies Express middleware for validating JWTs
var expressJwt = require("express-jwt");
//Library used to interact with DiscordAPI
//urconst { Client, Intents, Collection } = require("discord.js");

//Formerly body parser implementations
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(process.env.PORT, () =>
  console.log(`Hello world app listening on port ${process.env.PORT}!`)
);

//Check for JWT in protected routes
app.use(
  expressJwt({
    secret: process.env.SECRETO_DE_AMOR,
    algorithms: ["HS256"],

    getToken: (req) => {
      console.log("I am in the inside of get etc...req is:");
      console.log(req.headers);
      if (
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
      ) {
        console.log("made it to this part, the jwt should be:");
        console.log(req.headers.authorization.split(" ")[1]);
        return req.headers.authorization.split(" ")[1];
      } else if (req.query && req.query.jwt) {
        console.log("There is a query");
        console.log(req.query);
        return req.query.jwt;
      }
      return null;
    },
  }).unless({
    path: [
      "/users/authenticate",
      "/users/register",
      "/users/forgot-password",
      "/users/send-password-reset",
      "/users/reset-password",
      "/users/ve",
      //    "/users/send-email-validation",
      "/discord/x-user-info",
      "/discord/install",
    ],
  })
);

//Uploads in static folder
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));
//Discord routes
app.use("/discord", require("./routes/discord.route"));
//Users routes
app.use("/users", require("./routes/users.route"));
//Images routes
app.use("/media", require("./routes/media.route"));
//Access routes
app.use("/access", require("./routes/discord.route"));

// POST method route
app.post("/", function (req, res) {
  res.send("POST request to the homepage");
});

//Error handling
app.use(function (err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    console.log(err);
    res.status(401).send("invalid token...");
  }
});

/*                                                                                  *
 *                                                                                  *
 *                                                                                  *
 * ~~~~~~~~~~~~~~~~~~~~Discord.js functions and implementations~~~~~~~~~~~~~~~~~~~~ *
 *                                                                                  *
 *                                                                                  *
 *                                                                                  */
//Instantiate new discordjs client with respective websocket Intents
/*const discordClient = new Client({
  intents: [Intents.FLAGS.GUILDS],
});*/
/*discordClient.once("ready", () => {
  console.log("Ready!");
});*/
/*
discordClient.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: "Whoops there was an error, executing the command!",
      ephemeral: true,
    });
  }
});*/
/*discordClient.login(process.env.DISCORD_BOT_TOKEN);



//Attach commands property to client instance to access commands in other files
discordClient.commands = new Collection();
//Command file location reference
commandFilesLoc = "./discordjs/commands";
//Return array of file names that contain commands
const commandFiles = fs.readdirSync(commandFilesLoc).filter((file) => {
  file.endsWith(".js");
});
//Set a new item in the collection with the key as the command name and
//the value as the exported module
for (const file of commandFiles) {
  const command = require(`${commandFilesLoc}/${file}`);
  client.commands.set(command.data.name, command);
}*/
