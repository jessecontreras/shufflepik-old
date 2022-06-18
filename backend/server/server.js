//Load environment variables frmo .env file
require("dotenv").config();
//Back end web framework
const express = require("express");
const app = express();
//process manager
const pm2 = require("pm2");
//Database 
const db_controller = require("../server/controllers/db.controller");

//Node native cors system module
const cors = require("cors");
app.use(cors());
//Node native path system module
const path = require("path");

//Formerly body parser implementations
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = app.listen(process.env.PORT, () =>
  console.log(`Listening on port ${process.env.PORT}!`)
);
//Node.js process, enable graceful shutdown
//If there is an error on server close, restart pm2 process.
process.on("SIGINT", () => {
  console.log("SIGINT signal recieved");
  server.close((err) => {
    if (err) {
      console.log("error, restart");
      pm2.restart(process.id);
    } else {
      console.log("No error, move along");
      process.exit(0);
    }
  });
});

//Uploads in static folder
app.use("/apis/uploads", express.static(path.join(__dirname, "/uploads")));
//Discord routes
app.use("/apis/discord", require("./routes/discord.route.js"));
//Users routes
app.use("/apis/users", require("./routes/users.route.js"));
//Images routes
app.use("/apis/media", require("./routes/media.route.js"));
//Access routes
app.use("/apis/access", require("./routes/discord.route.js"));

app.use(express.static(path.join(__dirname, `${process.env.SPA_PATH}`)));

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, `${process.env.SPA_PATH}/index.html`));
});

//Error handling
app.use(function (err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    console.log(err);
    res.status(401).send("invalid token...");
  }
});
