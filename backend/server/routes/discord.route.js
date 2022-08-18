//Route dependencies
let express = require("express");
var router = express.Router();
//Module that allows for window.fetch to Node.js
const fetch = require("node-fetch");

//Middleware
const verification_middleware = require("../middleware/verification.middleware");
//Controllers
const discord_controller = require("../controllers/discord.controller");
const users_controller = require("../controllers/users.controller");
//Helper modules
const token_helper = require("../helpers/token.helper");
//Routes
//router.get("/access", verification_middleware.jwtCheck, accessDiscordAccount);
router.get("/install", installBot);
router.post("/integrate", verification_middleware.jwtCheck, integrate);
router.get("/xchange-info", exchangeInformation);
router.get("/xchange-info-again", exchangeUserInformationAgain);
router.get("/token", getUserToken);
router.post("refresh-user", verification_middleware.jwtCheck, refreshUserData);
//Exports
module.exports = router;

/*async function accessDiscordAccount(req, res) {
  try {
    let userData = await discord_controller.accessUser(req);

    const query = querystring.stringify({
      data: userData,
    });
    res.redirect(302, `${process.env.CLIENT_PATH}/?${query}`);
  } catch (err) {
    console.log(err);
    throw err;
  }
}*/

async function installBot(req, res) {
  try {
    const serverResponse = await discord_controller.installBot(req.query);
    if (serverResponse) {
      res.redirect(302, `${process.env.CLIENT_PATH}/thanks-bot-download`);
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
async function exchangeInformation(req, res) {
  try {
    const userData = await discord_controller.tempUserStore(req.query);
    const query = new URLSearchParams({
      integrateUser: userData,
    });

    res.redirect(302, `${process.env.CLIENT_PATH}/home/?${query}`);
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
    const query = querystring.stringify({
      refreshUserData: userData,
    });
    res.redirect(302, `${process.env.CLIENT_PATH}/home/?${query}`);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function integrate(req, res) {
  try {
    const integratedUser = await discord_controller.integrateUser(req.body);
    const areTokensNeeded = res.locals.refreshToken ? true : false;
    if (areTokensNeeded) {
      await token_helper.setTokenCookie(res, res.locals.refreshToken);
      integratedUser.jwt = res.locals.jwt;
    }
    res.send(integratedUser);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 *
 * @param {*} req
 * @param {*} res
 */
async function getUserToken(req, res) {
  try {
    const userToken = discord_controller.getUserToken(req.query.code);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function refreshUserData(userData) {
  try {
    const nowWhat = await users_controller.processUserWithTokenIssue(userData);
  } catch (err) {
    console.log(err);
    throw err;
  }
}
