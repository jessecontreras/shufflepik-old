//var config = require("config.json");
let express = require("express");
let router = express.Router();
const _ = require("lodash");
const user_controller = require("../controllers/users.controller");
const verification_middleware = require("../middleware/verification.middleware");
//Helper modules
const token_helper = require("../helpers/token.helper");


//Routes
router.post("/authenticate", authenticate);
router.post("/register", register);
router.post("/integrate", integrate);
router.post("/refresh-user", verification_middleware.jwtCheck, refreshUserData);
router.post("/forgot-password", forgotPassword);
router.post("/refresh-token", refreshToken);
router.post("/revoke-token", revokeToken);
router.post("/reset-password", resetPassword);
router.post("/email-validation", sendEmailValidation);
//router.get("/", getUser);
router.get("/password-reset", sendPasswordResetPage);
router.get("/ve", validateEmail);
router.get("/:_id/guilds", verification_middleware.jwtCheck, guilds);
router.get("/:_id/albums", verification_middleware.jwtCheck, albums);
router.get(
  "/:_id/albums/:albumId/images",
  verification_middleware.jwtCheck,
  images
);
router.get("/:_id/user", verification_middleware.jwtCheck, getUser);

//router.get("/:_id/guilds", verification_middleware, guilds);
router.delete("/:_id", verification_middleware.jwtCheck, _delete);

//Exports
module.exports = router;

async function authenticate(req, res) {
  try {
    //Will be be either a user object or an error message
    const controllerResponse = await user_controller.authenticate(
      req.body.email,
      req.body.password,
      res
    );
    console.log("Controller response is:");
    console.log(controllerResponse);
    //If the controllers response does not have an error message
    if (controllerResponse.serverErrorMessage) {
      res.send(controllerResponse);
      return;
    }
    //Do something like the below.
    await setTokenCookie(res, res.locals.refreshToken);
    const user = _.omit(controllerResponse, ["discord.discriminator"]);
    res.send(user);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Route to register user
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function register(req, res) {
  try {
    const response = await user_controller.create(req.body);
    /*if (response.ExsitingUser) {
      res.json(response);
      return;
    }*/
    //await token_helper.setTokenCookie(res, res.locals.refreshToken);
    res.json(response);
    //return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Returns user data to return.
 * If Discord account is already associated with a Shufflepik account, do no integrate user, send user message notifying them one Discord user per account.
 *
 * @param {*} req
 * @param {*} res
 */
async function integrate(req, res) {
  try {
    const integratedUser = await user_controller.integrateUser(req.body);
    /*if (integratedUser.UserToIntegrateAlreadyConnected) {
      const errorResponse = integratedUser.UserToIntegrateAlreadyConnected;
      res.send(errorResponse);
      return;
    }*/
    // await token_helper.setTokenCookie(res, res.locals.refreshToken);
    res.send(integratedUser);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getUser(req, res) {
  try {
    const _id = req.params._id;
    const user = await user_controller.getUser(_id);

    res.json(user);
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
    const userData = await user_controller.tempUserStoreForBrokenToken(
      req.query.code
    );
    const areTokensNeeded = res.locals.refreshToken ? true : false;
    if (areTokensNeeded) {
      await token_helper.setTokenCookie(res, res.locals.refreshToken);
      userData.jwt = res.locals.jwt;
    }
    const query = URLSearchParams({ refreshUserData: userData });

    res.redirect(302, `http://localhost:8080/home/?${query}`);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function validateEmail(req, res) {
  try {
    const controllerResponse = await user_controller.validateEmail(
      req.query.validation_token
    );

    res.redirect(302, controllerResponse);
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

async function sendEmailValidation(req, res) {
  try {
    const response = await user_controller.sendEmailValidationLink(
      req.body._id
    );

    res.json(response);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function albums(req, res) {
  try {
    const _id = req.params._id;
    const albums = await user_controller.getAlbums(_id);
    const areTokensNeeded = res.locals.refreshToken ? true : false;
    console.log("ARE TOKENS NEEDED FOR THIS CALL?");
    console.log(areTokensNeeded);
    let dataToSendToClient;
    if (areTokensNeeded) {
      console.log("token is needed");
      console.log(res.locals);
      console.log(res.locals.refreshToken);
      console.log(res.locals.jwt);
      dataToSendToClient = {
        jwt: res.locals.jwt,
        albums: albums,
      };
      //dataToSendToClient.jwt = res.locals.jwt;
      await token_helper.setTokenCookie(res, res.locals.refreshToken);
      //If the jwt token needs to be reinstated attach to object to user.

      //dataToSendToClient.albums = albums;
      //jwtToken = res.locals.jwt;
    } else {
      dataToSendToClient = albums;
    }
    //res.send(albums);
    //res.send({ jwt: jwtToken, albums: albums });
    res.send(dataToSendToClient);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function guilds(req, res) {
  try {
    const _id = req.params._id;
    const guilds = await user_controller.getGuilds(_id);
    const areTokensNeeded = res.locals.refreshToken ? true : false;
    let dataToSendtoClient;
    if (areTokensNeeded) {
      await token_helper.setTokenCookie(res, res.locals.refreshToken);
      dataToSendtoClient = {
        jwt: res.locals.jwt,
        guilds: guilds,
      };
    } else {
      dataToSendtoClient = guilds;
    }

    //res.send(guilds);
    //res.send({ jwt: jwtToken, guilds: guilds });
    res.send(dataToSendtoClient);
    return;
  } catch (err) {}
}

async function images(req, res) {
  try {
    const _id = req.params._id;
    const albumId = req.params.albumId;
    const images = await user_controller.getImages(_id, albumId);
    console.log("I'm in get images (for image albums)");
    const areTokensNeeded = res.locals.refreshToken ? true : false;
    console.log(`Is token needed? : ${areTokensNeeded}`);
    console.log("images are:");
    console.log(images);

    let dataToSendToClient;
    if (areTokensNeeded) {
      await token_helper.setTokenCookie(res, res.locals.refreshToken);
      dataToSendToClient = {
        jwt: res.locals.jwt,
        images: images,
      };
    } else {
      dataToSendToClient = images;
    }

    //res.send(images);
    res.send(dataToSendToClient);
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
async function _delete(req, res) {
  try {
    //await user_controller.deleteAccount(req.params._id);
    await user_controller.deleteAccount;
    res.json("Successfully deleted user");
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function refreshToken(req, res, next) {
  try {
    console.log("Made it to refresh token route (backend)");
    //const token = //req.cookies.refreshToken;
    const userId = req.body.userId;
    const controllerResponse = await user_controller.refreshToken(userId);
    //response will return as false if there is no refresh token or if it expired.
    if (!controllerResponse) res.status(401).send("invalid token...");
    console.log("refresh token should be:");
    console.log(controllerResponse.refreshToken);
    console.log("jwt should be ");
    console.log(controllerResponse.jwtToken);
    await token_helper.setTokenCookie(res, controllerResponse.refreshToken);
    res.json(controllerResponse.jwtToken);
  } catch (next) {
    //console.log(err);
    console.log(next);
    // throw err;
  }
}
async function revokeToken(req, res, next) {
  try {
    //accept token from request body o r cookie
    //const token = req.body.token || req.cookies.refreshToken;
    //console.log("token is:");
    //console.log(token);
    console.log("Revoke token() backend - route");
    const userId = req.body.userId;
    const tokenSuccessfullyRevoked = await user_controller.revokeToken(userId);
    //if (!token) return res.status(400).json({ message: "Token is required" });

    res.json({ message: "Token revoked" });
  } catch (next) {
    //console.log(err);
    console.log(next);
    // throw err;
  }
}

async function forgotPassword(req, res) {
  try {
    const response = await user_controller.emailResetPasswordLink(
      req.body.email
    );
    console.log(`Response for password would be: ${response}`);
    //res.send({ message: response });
    res.json(response);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function sendPasswordResetPage(req, res) {
  try {
    console.log("Made it here");
    const resetPassword = await user_controller.sendPasswordResetPage(
      req.query.reset_token
    );
    if (resetPassword.includes("something went wrong")) {
      res.json(resetPassword);
    } else {
      /*const tokenParams = new URLSearchParams({
        id: resetPassword,
      });*/
      console.log("this should have worked");
      console.log(resetPassword);
      res.redirect(
        302,
        `${process.env.CLIENT_PATH}/reset-password/${resetPassword}`
      );
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function resetPassword(req, res) {
  try {
    const response = await user_controller.resetPassword(
      req.body.token,
      req.body.password
    );
    res.json(response);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Sets httpOnly cookie on the client. This is the refresh token.
 *
 * @param {object} res Reference to expressjs response object.
 * @param {string} token Randomly generated token.
 * @returns {Promise<void>}
 */
async function setTokenCookie(res, token) {
  try {
    //Cookie expiration, 7 days
    const sevenDayExpiry = 7 * 24 * 60 * 60 * 1000;
    //create http only cookie with refresh token
    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + sevenDayExpiry),
    };
    res.cookie("refreshToken", token, cookieOptions);
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
