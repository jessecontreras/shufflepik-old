//var config = require("config.json");
let express = require("express");
let router = express.Router();
const querystring = require("querystring");
const user_controller = require("../controllers/users.controller");
const verification_middleware = require("../middleware/verification.middleware");

//Routes
router.post("/authenticate", authenticate);
router.post("/register", register);
router.post("/integrate", integrate);
router.post("refresh-user", verification_middleware.jwtCheck, refreshUserData);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/email-validation", sendEmailValidation);
router.get("/password-reset", sendPasswordResetPage);
router.get("/ve", validateEmail);
router.get("/:_id/guilds", verification_middleware.jwtCheck, guilds);
router.get("/:_id/albums", verification_middleware.jwtCheck, albums);
router.get(
  "/:_id/albums/:albumId/images",
  verification_middleware.jwtCheck,
  images
);

//router.get("/:_id/guilds", verification_middleware, guilds);
router.delete("/:_id", verification_middleware.jwtCheck, _delete);

//Exports
module.exports = router;

async function authenticate(req, res) {
  try {
    //Will be be either a user object or an error message
    const controllerResponse = await user_controller.authenticate(
      req.body.email,
      req.body.password
    );

    res.send(controllerResponse);
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

    res.json(response);
    //return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function integrate(req, res) {
  try {
    const integratedUser = await user_controller.integrateUser(req.body);

    res.send(integratedUser);
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
    res.redirect(controllerResponse);
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
    console.log("album route");
    const _id = req.params._id;
    const albums = await user_controller.getAlbums(_id);
    res.send(albums);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function guilds(req, res) {
  try {
    console.log("guild route");
    const _id = req.params._id;
    const guilds = await user_controller.getGuilds(_id);
    res.send(guilds);
    return;
  } catch (err) {}
}

async function images(req, res) {
  try {
    const _id = req.params._id;
    const albumId = req.params.albumId;
    const images = await user_controller.getImages(_id, albumId);
    res.send(images);

    console.log("image route");
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
    await user_controller.delete(req.params._id);
    res.json("Successfully deleted user");
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function forgotPassword(req, res) {
  try {
    const response = await user_controller.emailResetPasswordLink(
      req.body.email
    );
    res.end();
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function sendPasswordResetPage(req, res) {
  try {
    const resetPassword = await user_controller.sendPasswordResetPage(
      req.query.reset_token
    );
    if (resetPassword.includes("something went wrong")) {
      res.json(resetPassword);
    } else {
      res.redirect(resetPassword);
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
