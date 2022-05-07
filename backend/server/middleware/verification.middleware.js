//JWT validation package
const jwt = require("jsonwebtoken");
//DB controoler
const db_controller = require("../controllers/db.controller");
//Import ObjectId to be able to use
const { ObjectID } = require("bson");

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
  try {
    if (
      (req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer") ||
      (req.query && req.query.jwt)
    ) {
      let token;
      if (req.headers.authorization.split(" ")[1])
        token = req.headers.authorization.split(" ")[1];
      else if (req.query.jwt) token = req.query.jwt;

      const userAndTokenValidity = await userDataAndTokenValidity(token);
      if (userAndTokenValidity.user) {
        res.locals.user = userAndTokenValidity.user;
      }
      if (!userAndTokenValidity.jwtValid)
        return res.status(401).send("invalid token...");
      next();
    } else {
      return res.status(401).send("invalid token...");
    }
  } catch (err) {
    console.log(err);
    throw err;
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
    const decodedToken = jwt.verify(encodedToken, process.env.SECRETO_DE_AMOR);
    let userId = decodedToken.sub;
    const mongoClient = await db_controller.instantiateMongoClient();
    await mongoClient.connect();
    const usersCollection = mongoClient
      .db(process.env.SHUFFLEPIK_DB)
      .collection("USERS");
    const user = await usersCollection.findOne({ _id: ObjectID(userId) });
    const isTokenValid = userId === user._id.toString() ? true : false;
    const userData = {
      jwtValid: isTokenValid,
      user: user,
    };
    return userData;
  } catch {
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
  try {
    const user = res.locals.user ? res.locals.user : false;
    if (!user) {
      return res.json({
        errorResponse:
          "😵 An error occurred, please clear your browser cache and re-login. If this message persists, contact us via support@shufflepik.com",
      });
    }

    if (user.email_validation.validated && user.discord.connected) {
      next();
    } else {
      return res.json({
        errorResponse:
          "🚫 Your Discord must be connected and your email must be validated before uploading images",
      });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}
