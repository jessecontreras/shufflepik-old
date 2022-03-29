//Route dependencies
let express = require("express");
var router = express.Router();
//Module that allows for window.fetch to Node.js
const fetch = require("node-fetch");
//Module for URL resolution
const url = require("url");


//import { LocalStorage } from "node-localstorage";

//global.localStorage = new LocalStorage('./scratch');

//Controllers
const discord_controller = require("../controllers/discord.controller");
const users_controller = require("../controllers/users.controller");
//Routes
router.get("/access", accessDiscordAccount);
router.get("/connect", connectUserAccount);
router.post("/access", integrateAccount);
router.get("/install", installBot);
router.post("/integrate", integrate);
router.post("/user", discordUser);
router.get("/x-user-info", exchangeUserInformation);
router.get("/x-user-info-again", exchangeUserInformationAgain);
router.get("/user-token", getUserToken);
router.post("refresh-user", refreshUserData);
//Exports
module.exports = router;

async function discordUser(req, res) {
  try {
    const userData = await discord_controller.user(req);
    console.log(userData);
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function accessDiscordAccount(req, res) {
  try {
    const userData = await discord_controller.accessUser(req);
    console.log("Made it to access discord");
    console.log(req);
    const query = querystring.stringify({
      data: userData,
    });

    //await
    res.redirect(302, "http://localhost:4200/?" + query);
    //res.end();
  } catch (err) {
    console.log(err);
    throw err;
  }
}
async function integrateAccount(req, res) {
  try {
    console.log("In here");
    console.log("Unique user info is:");
    console.log(req.body);
    const integratedUser = await discord_controller.integrateUser(req.body);
    //Set up our current user
    console.log("Came back from integrating user");
    //res.json(integratedUser);
    //res.send(inte)
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * This is it.
 * @param {*} req
 * @param {*} res
 */
async function connectUserAccount(req, res) {
  try {
    console.log("Connect router");
    const deez = await discord_controller.connectUser(req);
    res.json(deez);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function installBot(req, res) {
  try {
    console.log("Made it to install bot route");
    const serverResponse = await discord_controller.installBot(req.query);
    console.log("Made it back from controller");
    console.log(serverResponse);
    if (serverResponse) {
      res.redirect(302, `http://localhost:4200/thanks-bot-download`);
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Uses discord permission code to access and store Discord user information,
 * then sends query to client, client then sends back Shufflepik user information.
 * This exchange of data is necessary to merge a Shufflepik user with their corresponding Discord user account.
 *
 * @param {*} req
 * @param {*} res
 */
async function exchangeUserInformation(req, res) {
  try {
    const userData = await discord_controller.tempUserStore(req.query);
    console.log("Made it back to route exchangeuserInfo");
    const query = new URLSearchParams({
      integrateUser: userData,
    });
    /*const query = new URLSearchParams({
      id: userData,
    });*/

    console.log("We will send back query");
    console.log(query);
    //await
    res.redirect(302, `http://localhost:4200/home/?${query}`);
    //res.redirect(302, `http://localhost:4200//key-event/?${query}`);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * We use this when  user's Discord refresh token is unusable or expired. Uses discord permission code to access and store
 * Discord user information,then sends query to client, client then sends back Shufflepik user information.
 *
 * @param {*} req
 * @param {*} res
 */
async function exchangeUserInformationAgain(req, res) {
  try {
    const userData = await discord_controller.tempUserStoreForBrokenToken(
      req.query.code
    );
    console.log("Made it back to route exchangeuserInfo");
    const query = querystring.stringify({
      refreshUserData: userData,
    });
    console.log("We will send back query AGAIN");
    console.log(query);
    //await
    res.redirect(302, `http://localhost:4200/home/?${query}`);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function integrate(req, res) {
  try {
    console.log("Got to integrate user");
    console.log(req.body);

    const integratedUser = await discord_controller.integrateUser(req.body);
    console.log(
      "-----Back from controller, in backend route. Integrated user is:"
    );
    console.log(integratedUser);
    // return integratedUser;
    //res.json(integratedUser);
  
    res.send(integratedUser);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getUserToken(req, res) {
  try {
    const userToken = discord_controller.getUserToken(req.query.code);
    console.log("Returned token is:");
    console.log(userToken);

    //return userToken;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function refreshUserData(userData) {
  try {
    console.log("Made it to user data, and it is:");
    console.log(userData);
    const nowWhat = await users_controller.processUserWithTokenIssue(userData);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

//Export default router
//module.exports = router;
