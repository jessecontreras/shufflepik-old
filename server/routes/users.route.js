//var config = require("config.json");
let express = require("express");
let router = express.Router();
const querystring = require("querystring");
const user_controller = require("../controllers/users.controller");

//Routes
router.post("/authenticate", authenticate);
router.post("/register", register);
router.post("/integrate", integrate);
router.post("refresh-user", refreshUserData);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/send-email-validation", sendEmailValidation);
router.get("/send-password-reset", sendPasswordResetPage);
router.get("/ve", validateEmail);
router.get("/", getAll);
router.get("/current", getCurrent);
router.put("/:_id", update);
router.delete("/:_id", _delete);

//Exports
module.exports = router;

async function authenticate(req, res) {
  try {
    console.log("Made it to authenticate route backend");
    //Will be be either a user object or an error message
    const controllerResponse = await user_controller.authenticate(
      req.body.email,
      req.body.password
    );
    console.log("I'm in authenticate and response is:");
    console.log(controllerResponse);

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
    console.log("Made it to register");
    console.log(req.body);
    const response = await user_controller.create(req.body);
    console.log("Made it back from controller");
    console.log(response);
    res.json(response);
    //return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function integrate(req, res) {
  try {
    console.log("Got to integrate user");
    console.log(req.body);

    //const integratedUser = await discord_controller.integrateUser(req.body);
    const integratedUser = await user_controller.integrateUser(req.body);
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
    console.log("Made it back to route exchangeuserInfo");
    const query = URLSearchParams({ refreshUserData: userData });

    /* querystring.stringify({
      refreshUserData: userData,
    });*/
    console.log("We will send back query AGAIN");
    console.log(query);
    //await
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
    console.log(controllerResponse);
    res.redirect(controllerResponse);
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

async function sendEmailValidation(req, res) {
  try {
    console.log("Send account validation link: router");
    console.log(req.body);
    const response = await user_controller.sendEmailValidationLink(
      req.body._id
    );
    console.log("response is:");
    console.log(response);
    res.json(response);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getAll(req, res) {
  try {
    console.log("Get all users backend");
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getCurrent(req, res) {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function update(req, res) {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function _delete(req, res) {
  try {
    console.log("Made it to delete");
    console.log(req.params._id);
    //res.send("My response");
    await user_controller.delete(req.params._id);
    console.log("Made it back from delete controller");
    res.json("Successfully deleted user");
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function forgotPassword(req, res) {
  try {
    console.log("Made it to forgot password");
    console.log(req.body);
    const response = await user_controller.emailResetPasswordLink(
      req.body.email
    );
    res.json("OK");
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function sendPasswordResetPage(req, res) {
  try {
    console.log("Made it to send password reset");
    console.log(req.query.reset_token);
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
    console.log("Made it to backend reset password route:");
    console.log(req.body);
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
