const { Connection } = require("../helpers/mongoConnection.helper");

//JWT validation package
const jwt = require("jsonwebtoken");
//Local dependencies
const token_helper = require("../helpers/token.helper");
//Import ObjectId to be able to use
const { ObjectId } = require("bson");

//Enum for MongoDb collections
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedUsers: "DELETED_USERS",
  DeletedContent: "DELETED_CONTENT",
};

//Middleware for this module.
let middleware = {};
//Assign middleware
middleware.jwtCheck = jwtCheck;
middleware.checkUserCredentials = checkUserCredentials;
//Export module
module.exports = middleware;

/**
 * Checks for a valid JWT
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
async function jwtCheck(req, res, next) {
  console.log("Made it to jwt check: req headers are");
  if (req.headers) console.log(req.headers);
  console.log("query is:");
  if (req.query) console.log(req.query);
  try {
    if (
      (req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer") ||
      (req.query && req.query.jwt)
    ) {
      console.log("1");
      let token;
      if (req.headers.authorization.split(" ")[1])
        token = req.headers.authorization.split(" ")[1];
      else if (req.query.jwt) token = req.query.jwt;

      const userAndTokenValidity = await userDataAndTokenValidity(token);
      //If both jwt and refresh token are invalid, send 401.
      if (!userAndTokenValidity.jwtValid) {
        console.log("2");
        return res.status(401).send("invalid token...");
      }
      //If userAndTokenValidity contains a user, assign it to locals variable.
      if (userAndTokenValidity.user) {
        res.locals.user = userAndTokenValidity.user;
      }
      //If userAndTokenValidity contains a refreshToken, set refreshtoken cookie and give user jwt value.
      if (userAndTokenValidity.refreshToken) {
        //Set jwt in res.locals.
        res.locals.jwt = userAndTokenValidity.jwtToken;
        //Set refresh token in res.locals
        res.locals.refreshToken = userAndTokenValidity.refreshToken;
        console.log("Should refresh only refresh token");
      }
      //Next middleware func
      next();
    } else {
      //
      console.log("3");
      return res.status(401).send("invalid token...");
    }
  } catch (err) {
    console.log("4");
    console.log(err);
    if (err.toString()) {
      if (err.toString().includes("jwt expired")) console.log("JWT Expired");
      //if jwt is expired check to see if there is  valid refresh token
      return res.status(401).send("invalid token...");
    } else {
      console.log(err);
      throw err;
    }
  }
}

/**
 * Determines whether JWT is valid or not.
 * Checks for user id match, if so true, otherwise false.
 *
 * @param {string} encodedToken encoded JWT.
 * @returns {object} With user data and token validity.
 */
async function userDataAndTokenValidity(encodedToken) {
  try {
    console.log("Made it heya");
    const payload = jwt.decode(encodedToken);
    console.log(payload);
    //Verified token variable
    let verifiedToken = null;
    console.log(payload.exp * 1000);
    console.log(Date.now());

    //If the token has not expired
    if (Date.now() < payload.exp * 1000) {
      //verify existing token
      verifiedToken = jwt.verify(encodedToken, process.env.SECRETO_DE_AMOR);
      console.log(`Token is verified : ${verifiedToken}`);
      //If token is valid and verified return object with jwtValid set to true
      if (verifiedToken) return { user: verifiedToken.sub, jwtValid: true };
    } else {
      console.log(
        "We will now check if there is a refresh token that can help us with this. sub value VVV"
      );

      const userId = payload.sub._id ? payload.sub._id : payload.sub;
      console.log(`user id value is:${userId}`);

      //Attempt to refresh token, this is possbile if user has a refresh token and it is not expired.
      const controllerResponse = await token_helper.refreshToken(userId); //await users_controller.refreshToken(payload.sub._id);

      //if controller response is false then return jwtValid false so that calling function can return a 401 message to user
      if (!controllerResponse) return { jwtValid: false }; //res.status(401).send("invalid token...");
      const resp = {
        refreshToken: controllerResponse.refreshToken,
        jwtToken: controllerResponse.jwtToken,
        user: payload.sub,
        jwtValid: true,
      };
      //At this juncture if the controller did not respond with a false boolean it will return an object with jwt token and refresk token embedded in object.
      return resp;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Checks that a user's email is validated and that their discord account is connected to Shufflepik.
 * If either of aforementioned items is not fulfilled, will return an error message.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns {}
 */
async function checkUserCredentials(req, res, next) {
  //TODO FIGURE OUT AN EFFICIENT WAY TO ENSURE USER'S ACCOUNT IS CONNECTED TO DISCORD AND EMAIL IS VALIDATED
  try {
    console.log("Inside of check user credentials");

    //const user = res.locals.user ? res.locals.user : false;
    //User Id in res.locals.user
    let userId = null;
    let user = null;
    //If a user object is in res.locals.user, assign it to user var, otherwise assign res.locals.user userId var.
    if (res.locals.user.discord) {
      user = res.locals.user;
    } else {
      userId = res.locals.user;
    }
    console.log("Does user exists?");
    console.log(user);
    //Look for user in db if they are not stored in res.locals.user var
    if (!user) {
      user = await Connection.db
        .collection(ShufflepikCollection.Users)
        .findOne({
          _id: new ObjectId(userId),
        });

      console.log(user);

      if (!user) {
        console.log("User is not DEFINED");
        return res.json({
          errorResponse:
            "An error occurred, please clear your browser cache and re-login. If this message persists, contact us via support@shufflepik.com",
        });
      }
    }

    if (user.email_validation.validated && user.discord.connected) {
      next();
    } else {
      console.log("THERE IS AN ERROR HERE");

      return res.json({
        errorResponse:
          "Discord must be actually connected. Email must be actually validated. Further spoofs may result in a ban.",
      });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}
