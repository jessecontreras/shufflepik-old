//Local dependencies
const { Connection } = require("./mongoConnection.helper");

//Token helper object
let tokenHelper = {};
//Assign properties to object
tokenHelper.setTokenCookie = setTokenCookie;
tokenHelper.refreshToken = refreshToken;
tokenHelper.generateJwtToken = generateJwtToken;
tokenHelper.generateRefreshToken = generateRefreshToken;
tokenHelper.getRefreshToken = getRefreshToken;
//Local dependencies¸¸¸¸¸¸¸¸
//Third party dependencies
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
let dayjs = require("dayjs");
//Object Id
const { ObjectId } = require("bson");
//Collections enum
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedUsers: "DELETED_USERS",
  DeletedContent: "DELETED_CONTENT",
};

//Export module (object)
module.exports = tokenHelper;

/**
 * Creates a refresh token object.
 *
 * @returns {Promise<object>} Refresh token object.
 */
async function generateRefreshToken() {
  try {
    //Expires in a week
    const expiryTime = 7 * 24 * 60 * 60 * 1000;

    const refreshToken = {
      token: await randomTokenString(),
      expires: new Date(Date.now() + expiryTime),
    };
    return refreshToken;
  } catch (err) {
    console.log(err);
    throw err;
  }

  /**
   * Creates a random token string.
   *
   * @returns {Promise<string>} token string.
   */
  async function randomTokenString() {
    try {
      return crypto.randomBytes(40).toString("hex");
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}

/**
 * Creates a jwt token that expires in 15 minutes.
 * @param {string} userId Shufflepik user id.
 * @returns {Promise<jwt>} A signed jwt token.
 */
async function generateJwtToken(userId) {
  try {
    return jwt.sign({ sub: userId }, process.env.SECRETO_DE_AMOR, {
      //expiresIn: '15m',
      expiresIn: 30,
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Finds a user, returns refresh token object if exists, false if it does not exist.
 *
 * @param {string} userId Suhfflepik user id.
 * @returns {Promise<object>} Refresh token object.
 */
async function getRefreshToken(userId) {
  try {


    const dbUser = await Connection.db
      .collection(ShufflepikCollection.Users)
      .findOne({
        _id: ObjectId(userId),
      });


    if (!dbUser.refresh_token) return false;
    const isRefreshTokenValid = await verifyRefreshToken(
      dbUser.refresh_token.expires
    );

    if (!isRefreshTokenValid) return false; //token is expired return a 402
    return dbUser.refresh_token;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
/**
 * Returns true or false depending on whether the refresh token is expired or not. False if expired, true if not.
 *
 * @param {String} refreshTokenExpiration ISO string representation of token expiration date.
 * @returns {Promise<boolean>} A boolean indicating whether the token is expired or not.
 */
async function verifyRefreshToken(refreshTokenExpiration) {
  try {
    const currentDate = new Date(Date.now()).toISOString();

    const validDate =
      currentDate <= refreshTokenExpiration.toString() ? true : false;

    return validDate;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
/**
 *
 * @param {object} user Shufflepik user object.
 * @returns {Promise<object> | Promise<boolean>} Object containing two objects, a refresh object and a jwt token. Or a false boolean denoting an invalid refresh token
 */
async function refreshToken(userId) {
  try {


    const refreshToken = await getRefreshToken(userId);
    if (!refreshToken) return false;


    //Replace old refresh token with a new one and save
    const newRefreshToken = await generateRefreshToken();

    //Specify now as the time the refresh token is revoked
    refreshToken.revoked = dayjs().format(); //Date.now();
    //Specify which token will replace this refresh token
    refreshToken.replacedByToken = newRefreshToken.token;

    const updatedDoc = await Connection.db
      .collection(ShufflepikCollection.Users)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        [
          {
            $set: {
              revoked_tokens: {
                $concatArrays: [
                  {
                    $ifNull: ["$revoked_tokens", []],
                  },

                  {
                    $ifNull: [[refreshToken], []],
                  },
                ],
              },
            },
          },
          { $set: { refresh_token: newRefreshToken } },
        ],
        { upsert: true, returnNewDocument: true, returnOriginal: false }
      );

    //generate a new jwt
    const jwtToken = await generateJwtToken(userId);
    //return tokens and user's basic details
    return {
      jwtToken: jwtToken,
      refreshToken: newRefreshToken,
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

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
