//require("dotenv").config();
//Utility module
const _ = require("lodash");

//Third party modules
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodeMailer = require("nodemailer");

let dayjs = require("dayjs");
//Set up our local storage mechanism
const storage = require("node-persist");

const MongoClient = require("mongodb").MongoClient;

//User discord controller to pull fresh discord data of user
const discord_controller = require("./discord.controller");
//Database controller, where all db based queries and functions are housed.
const db_controller = require("./db.controller");
//Media controller
const media_controller = require("./media.controller");

const { ObjectId } = require("bson");
const { encryptRefreshToken } = require("./discord.controller");
const { SlashCommandSubcommandGroupBuilder } = require("@discordjs/builders");

const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedUsers: "DELETED_USERS",
  DeletedContent: "DELETED_CONTENT",
};

const MongoErrors = {
  Error: "MongoError",
  DuplicateKey: 11000,
};

//Formalized server responses
//Normally the value of the key will be in all caps but for the sake of practicality we wont do that here
const Response = {
  ExistingUser:
    "An account with this email already exists, please try another email.",
  CreatedUser: "Ahh yeah account successfully created !",
  UserDNE:
    "It appears that this user does not exists. Please contact us if you believe this is a mistake.",
  EmailOrPasswordIncorrect: " Incorrect email or password.",
  PasswordResetError:
    "Hmmm, something went wrong, we suggest having another password link sent to your email.",
  PasswordResertSuccess: "  Successfully changed password!",
  ValidateEmailSent:
    "Please validate your email, we've successfully sent you a validation email.",
  ValidateEmailSuccess:
    "Thank you for validating your email! You are good to go",
  ValidateEmailError:
    "Something went wrong with validating your email. Request another link or contact us if you think this is an error.",
};

let controller = {};

controller.authenticate = authenticate;
controller.create = create;
controller.update = update;
controller.delete = _delete;
controller.integrateUser = integrateUser;
controller.tempUserStoreForBrokenToken = tempUserStoreForBrokenToken;
controller.resetPassword = resetPassword;
controller.validateEmail = validateEmail;
controller.emailValidationLink = emailValidationLink;
controller.sendEmailValidationLink = sendEmailValidationLink;
controller.processUserWithTokenIssue = processUserWithTokenIssue;
controller.getGuildIntersect = getGuildIntersect;
controller.emailResetPasswordLink = emailResetPasswordLink;
controller.sendPasswordResetPage = sendPasswordResetPage;
controller.getAlbums = getAlbums;
controller.getGuilds = getGuilds;
controller.getImages = getImages;

module.exports = controller;

async function authenticate(email, password) {
  try {
    //Instantiate client
    const client = await db_controller.instantiateMongoClient();
    //Connect Mongo client.
    await client.connect();
    //Assign database and collection to our Mongo client connection
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const dbUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });

    if (dbUser && bcrypt.compareSync(password, dbUser.hash)) {
      //Authentication successfull return user
      let user = {
        _id: dbUser._id,
        jwt: jwt.sign(
          {
            sub: dbUser._id,
          },
          process.env.SECRETO_DE_AMOR,
          { expiresIn: "24h" }
        ),
        discord: dbUser.discord,
        email_validation: dbUser.email_validation,
        email: dbUser.email,
      };

      //If user is connected get fresh (new) data on them and update on the DB. Also update refresh token. Then send the relevant info back to the client.
      // if (user.discord_connected) {
      if (user.discord.connected) {
        //In the event the user needs to explicitly gain their Discord token, user info will be saved locally so that

        //Decrypt a user's refresh_token
        const refreshToken = await discord_controller.decryptRefreshToken(
          dbUser
        );
        console.log(`refresh_token:${refreshToken}`);

        //Get a new access token from user
        const userToken = await discord_controller.getUserTokenUsingRefresh(
          refreshToken
        );
        console.log(`new access token:${userToken}`);

        //If user has a valid token then process accordingly, otherwise ask client to request user permission to access Discord information.
        if (userToken) {
          //Get the latest Discord user info
          const latestUser = await discord_controller.getDiscordUser(userToken);

          //Get the latest Discord guild info
          const latestUserGuilds = await discord_controller.getUserGuilds(
            userToken
          );

          //discord guild icons are referenced as so: https://cdn.discordapp.com/icons/guild_id/guild_icon.png
          const userAvatar = `https://cdn.discordapp.com/avatars/${latestUser.id}/${latestUser.avatar}.png`;
          //Assign updated user avatar on user.
          user.discord.avatar = userAvatar;
          //Assign updated username to user.
          user.discord.username = latestUser.username;
          //update a user's token value
          dbUser.discord.token = userToken.refresh_token;
          //Discord is disconnected
          //encrypt a user's refresh_token
          const token = await discord_controller.encryptRefreshToken(dbUser);
          //A user object, this will only update certain discord properties in our DB User object
          dataToUpdate = {
            id: dbUser._id,
            token: token,
            guilds: latestUserGuilds,
            avatar: userAvatar,
            connected: true,
          };
          //Update information on database, we need to do this to query against guilds that exist on Shufflepik and also to store the necessary refresh_token.
          const updatedUser = await updateUserDiscordData(
            dataToUpdate
          ); /*await db_controller.updateUserOnLogin(
            dataToUpdate
          );*/

          //Get shufflepik guilds
          const shufflepikGuilds = await db_controller.getAllGuilds();

          const userGuildsAndAlbums = await getIntersectingGuildsAndUserAlbums(
            dbUser._id,
            latestUserGuilds,
            shufflepikGuilds
          );

          //Assign interesecting guilds to user;
          user.discord.guilds = userGuildsAndAlbums.guilds;
          //Assign user albums to user;
          user.albums = userGuildsAndAlbums.albums;
        } else {
          //update the fact that user is no longer connected to Discord
          user.discord.connected = false;
          //user.discord_connected = false;
          user.discord.need_token_refresh = true;
          //user.need_token_refresh = true;
          return user;
        }
      }
      //If user is not connected nor if they need to refresh token then return user.
      return user;
    } else {
      return { serverErrorMessage: Response.EmailOrPasswordIncorrect };
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function validateEmail(token) {
  try {
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);

    const account = await usersCollection.findOne({
      "email_validation.token": token,
    });

    if (!account) {
      errorResponse = new URLSearchParams({
        validateEmailError: Response.ValidateEmailError,
      });

      return `${process.env.CLIENT_PATH}/${errorResponse}`;
    }
    if (
      new Date() > new Date(account.email_validation.expiration) ||
      account.email_validation.validated == true
    ) {
      errorResponse = new URLSearchParams({
        validateEmailError: Response.ValidateEmailError,
      });

      return `${process.env.CLIENT_PATH}/${errorResponse}`;
    }

    const updateConfirmation = await usersCollection.findOneAndUpdate(
      {
        _id: ObjectId(account._id),
      },
      {
        $set: {
          email_validation: {
            validated: true,
            date_validated: new Date(Date.now()).toISOString(),
          },
        },
      }
    );

    successResponse = new URLSearchParams({
      validateEmailSuccess: Response.ValidateEmailSuccess,
    });

    return `${process.env.CLIENT_PATH}/${successResponse}`;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
/**
 * Stores information about a Discord user locally. This is done for when a User's Discord Refresh token is expired or somehow corrupted.
 *
 * @param {*} code - Access code given by Discord user.
 * @returns user identifier for local storage in this case, a user's Discord ID.
 */
async function tempUserStoreForBrokenToken(code) {
  try {
    //Initialize local storage
    await initLocalStorage();

    //Get user token
    const userToken = await discord_controller.getUserToken(code);

    const user = await discord_controller.getDiscordUser(userToken);

    const userGuilds = await discord_controller.getUserGuilds(userToken);
    const discordAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    userData = {
      integrate_user: true,
      discord: {
        id: user.id,
        discriminator: user.discriminator,
        email: user.email,
        username: user.username,
        verified: user.verified,
        avatar: discordAvatar,
        guilds: userGuilds,
        refresh_token: userToken.refresh_token,
      },
    };
    //Set the user's Discord ID as their identifier for lcal
    await storage.setItem(userData.discord.id, userData);

    return userData.discord.id;
  } catch (err) {
    console.log(err);

    throw err;
  }
}

async function processUserWithTokenIssue(userData) {
  try {
    //Initialize localStorage
    await initLocalStorage();
    //Connect Mongo client.
    await client.connect();

    //Assign database and collection to our Mongo client connection
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const dbUser = await usersCollection.findOne({ _id: userData._id });
    //Get user from local storage
    const user = await storage.valuesWithKeyMatch(userID.data);
  } catch (err) {
    console.log(err);
    throw err;
  }
}



/**
 * Using fresh Discord user data, update user on database.
 *
 * @param {object} user An object with a user's encrypted discord refresh token, their SP id, and their guilds.  {id: string, token: {}, guilds: []}
 * @returns updated user in the collection.
 */
async function updateUserDiscordData(user) {
  try {
    //Instantiate client
    const client = await db_controller.instantiateMongoClient();
    //Connect Mongo client.
    await client.connect();
    //Assign database and collection to our Mongo client connection
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);

    if (user.avatar) {
      console.log("Hurr--1");
      const updatedUser = await usersCollection.findOneAndUpdate(
        {
          _id: ObjectId(user.id),
        },
        {
          $set: {
            "discord.token": user.token,
            "discord.guilds": user.guilds,
            "discord.avatar": user.avatar,
            "discord.connected": user.connected,
          },
          $inc: {
            "login.number_of_logins": 1,
          },

          $push: {
            "login.dates": new Date(Date.now()).toISOString(),
          },
        },
        {
          returnNewDocument: true,
          returnOriginal: false,
        }
      );
      return updatedUser.value;
    } else {
      console.log("Hurr--2");
      await usersCollection.findOneAndUpdate(
        {
          _id: ObjectId(user.id),
        },
        {
          $set: {
            "discord.token": user.token,
            "discord.guilds": user.guilds,
          },
        }
      );
      return;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets Guilds that a specific user is part of AND that exist in Shufflepik DB.
 *
 * @param {*} collection The USERS collection.
 * @param {*} userID User (ID) whose Guilds will be queried against, specifically Discord ID. EX: John Doe's guilds will be checked and matched against those that exist in Shufflepik DB.
 * @returns Intersecting guilds. Matching guilds.
 */
async function getGuildIntersect(collection, userID) {
  try {
    const intersectingGuilds = await collection
      .aggregate([
        {
          $lookup: {
            from: ShufflepikCollection.Guilds,
            localField: "discord.guilds.id",
            foreignField: "discord.id",
            as: "matching_guilds",
          },
        },
        {
          $match: {
            "discord.id": userID,
          },
        },
        {
          $project: {
            _id: 0,
            matching_guilds: 1,
          },
        },
      ])
      .next();

    return intersectingGuilds;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets a user's guilds.
 * A user's guilds are defined as Discord guilds that are active in Shufflepik and that a Shufflpik user is part of
 * @param {} _id String representation of a user's object id.
 * @returns {array} Array of common guilds.
 */
async function getGuilds(_id) {
  try {
    console.log("Get guilds controller");
    //Instantiate client
    const client = await db_controller.instantiateMongoClient();
    //Connect Mongo client.
    await client.connect();
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const user = await usersCollection.findOne({
      _id: ObjectId(_id),
    });
    if (user.discord.connected) {

      console.log("User token is:");
      console.log(user.discord.token);
      //Decrypt a user's refresh_token
      const refreshToken = await discord_controller.decryptRefreshToken(user);
      console.log("refreshToken is");
      console.log(refreshToken);
      //Get a new access token from user
      const userToken = await discord_controller.getUserTokenUsingRefresh(
        refreshToken
      );
      console.log(userToken);
      //if(userToken)
      //Get a specific user's guilds
      const userGuilds = await discord_controller.getUserGuilds(userToken);
      //Get shufflepik guilds
      const shufflepikGuilds = await db_controller.getAllGuilds();
      //User guilds that are also shufflepik guilds
      const commonGuilds = [];
      for (let i = 0; i < userGuilds.length; i++) {
        for (let ii = 0; ii < shufflepikGuilds.length; ii++) {
          //If the userGuild id in user's guild matches the discord id in SP guilds then we have an intersecting guild
          if (userGuilds[i].id === shufflepikGuilds[ii].discord.id) {
            //Assign guild object to intersecting guild
            guild = {
              id: userGuilds[i].id,
              name: userGuilds[i].name,
              icon: userGuilds[i].icon,
            };
            //Push assigned Object to intersecting guilds array
            commonGuilds.push(guild);
          }
        }
      }
      //update user token value to reflect the latest token
      user.discord.token = userToken.refresh_token;
      //encrypt token
      const token = await discord_controller.encryptRefreshToken(user);
      dataToUpdate = {
        id: user._id,
        token: token,
        guilds: userGuilds,
      };
      await updateUserDiscordData(dataToUpdate);
      console.log(commonGuilds);
      return commonGuilds;
    }

    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets a user's photo albums.
 * @param {string} _id String representation of a user's object id.
 * @returns {Album[]} An array of user albums.
 */
async function getAlbums(_id) {
  try {
    console.log("Made it to get albums");
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);

    const albums = await usersCollection
      .aggregate([
        {
          $lookup: {
            from: "GUILDS",
            localField: "discord.guilds.id",
            foreignField: "discord.id",
            as: "matching_guild",
          },
        },
        {
          $match: { _id: ObjectId(_id) },
        },
        {
          $unwind: "$matching_guild",
        },
        {
          $project: { _id: 0, matching_guild: 1 },
        },
        {
          $addFields: {
            id: "$matching_guild.discord.id",
            name: "$matching_guild.discord.name",
            images: {
              $filter: {
                input: "$matching_guild.image_pool",
                as: "ip",
                cond: {
                  $eq: ["$$ip.uploaded_by_id", _id],
                },
              },
            },
          },
        },
        {
          $project: { _id: 0, id: 1, name: 1, images: 1 },
        },
      ])
      .toArray();
    console.log("should be back from get albums mongodb query");
    console.log(albums);
    //the result is wrapped in an array, select the first (only) element of array. Select the images object to return only an array
    return albums;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets a user's images for the specified album
 * @param {string} _id String representation of a user's object id.
 * @param {string} albumId Album id.
 * @returns {image[]} Array of image objects
 */
async function getImages(_id, albumId) {
  try {
    console.log("Made it to get images controller");
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const albums = await usersCollection
      .aggregate([
        {
          $lookup: {
            from: "GUILDS",
            localField: "discord.guilds.id",
            foreignField: "discord.id",
            as: "matching_guild",
          },
        },
        {
          $match: { _id: ObjectId(_id) },
        },
        {
          $unwind: "$matching_guild",
        },
        {
          $project: { _id: 0, matching_guild: 1 },
        },
        {
          $addFields: {
            id: "$matching_guild.discord.id",
            name: "$matching_guild.discord.name",
            images: {
              $filter: {
                input: "$matching_guild.image_pool",
                as: "ip",
                cond: {
                  $eq: ["$$ip.uploaded_by_id", _id],
                },
              },
            },
          },
        },
        {
          $match: { id: albumId },
        },
        {
          $project: { images: 1 },
        },
      ])
      .toArray();
    console.log("should be back from get images db query");
    console.log(albums[0].images);
    return albums[0].images;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function integrateUser(req, res) {
  try {
    //Get our user information saved locally
    let userToIntegrate = await storage.valuesWithKeyMatch(req.data);
    //Local storage (node-persist) returns a single object array, we're simply referencing the object here.
    userToIntegrate = userToIntegrate[0];
    //The last four characters of 'data' value should be user's discriminator, if not return. We do this just to check, at a cursory level, that data has not been tampered with.
    const userDiscriminator = req.data.substring(0, 4);
    if (userDiscriminator == userToIntegrate.discord.discriminator) {
      //Encrypt a user's refresh_token
      const token = await encryptRefreshToken(userToIntegrate);
      //Update user's token value
      userToIntegrate.discord.token = token;

      userToIntegrate.discord.date_integrated = new Date(
        Date.now()
      ).toISOString();
      //Update the user in Database
      const updatedUser = await db_controller.updateUserByID(
        req.id,
        userToIntegrate
      );

      //User discord controller to pull fresh discord data of user

      //Get Shufflepik Guilds
      const shufflepikGuilds = await db_controller.getAllGuilds();

      //TODO:Instead of doing this, get all guilds for fresh user data and use getAlbums() as a refrence for intersecting guilds, then compare all
      //guilds with intersecting guilds and merge the repective data to itself.
      //Get guilds and album of a user
      let guildAndAlbumData = await getIntersectingGuildsAndAlbums(
        updatedUser._id,
        updatedUser.discord.guilds,
        shufflepikGuilds
      );
      const user = {
        _id: updatedUser._id,
        jwt: jwt.sign(
          {
            sub: updatedUser._id,
          },
          process.env.SECRETO_DE_AMOR
        ),
        discord: {
          connected: true,
          guilds: guildAndAlbumData.guilds,
          avatar: userToIntegrate.discord.avatar,
          username: userToIntegrate.discord.username,
        },
        email_validation: updatedUser.email_validation,
        albums: guildAndAlbumData.albums,
      };

      //Remove user from local storage
      //await storage.removeItem(req.data)
      return user;
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets passed user's intersecting guilds and image albums.
 *
 * @param {*} userID - User whose data will be compilated. This is their objectID, layman - shufflepik id.
 * @param {*} userGuilds User's guilds.
 * @param {*} shufflepikGuilds Shufflepik guilds.
 * @returns userData an object that returns intersecting guilds (userData.guilds) and a user's albums (userData.album).
 */
async function getIntersectingGuildsAndAlbums(
  userID,
  userGuilds,
  shufflepikGuilds
) {
  try {
    //User guilds that are also shufflepik guilds.
    const intersectingGuilds = [];
    //User albums.
    const userAlbums = [];
    for (let i = 0; i < userGuilds.length; i++) {
      for (let ii = 0; ii < shufflepikGuilds.length; ii++) {
        //If the userGuild id in user's guild matches the discord id in SP guilds then we have an intersecting guild.
        if (userGuilds[i].id === shufflepikGuilds[ii].discord.id) {
          //Assign guild object to intersecting guild.
          guild = {
            id: userGuilds[i].id,
            name: userGuilds[i].name,
            icon: userGuilds[i].icon,
          };
          //Push assigned Object to intersecting guilds array.
          intersectingGuilds.push(guild);
          //Assign album object to interesecting guild.
          album = {
            id: userGuilds[i].id,
            name: userGuilds[i].name,
            images: [],
          };

          //Push assigned object to intersecting albums array.
          userAlbums.push(album);
          for (var j = 0; j < shufflepikGuilds[ii].image_pool.length; j++) {
            //If an image is uploaded by a certain user then that image belongs in their album.

            if (shufflepikGuilds[ii].image_pool[j].uploaded_by_id == userID) {
              //This will be the normailzed image object sent to the front-end.
              const imageObject = {
                _id: shufflepikGuilds[ii].image_pool[j]._id,
                image_title: shufflepikGuilds[ii].image_pool[j].image_title,
                image_url: shufflepikGuilds[ii].image_pool[j].image_url,
                //dayjs(
                date_uploaded: shufflepikGuilds[ii].image_pool[j].date_uploaded,
                //) .format("MM/DD/YYYY h:mma")*/,
                nsfw: shufflepikGuilds[ii].image_pool[j].nsfw,
              };

              album.images.push(imageObject);
            }
          }
          break;
        }
      }
    }

    const userData = {
      guilds: intersectingGuilds,
      albums: userAlbums,
    };

    return userData;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets passed user's intersecting guilds and image albums.
 *
 * @param {string} userID - User whose data will be compilated. This is their ObjectId.
 * @param {*} userGuilds User's guilds.
 * @param {*} shufflepikGuilds Shufflepik guilds.
 * @returns userData an object that returns intersecting guilds (userData.guilds) and a user's albums (userData.album).
 */
async function getIntersectingGuildsAndUserAlbums(
  userID,
  userGuilds,
  shufflepikGuilds
) {
  try {
    //User guilds that are also shufflepik guilds
    const intersectingGuilds = [];
    //User albums
    const userAlbums = [];
    for (let i = 0; i < userGuilds.length; i++) {
      for (let ii = 0; ii < shufflepikGuilds.length; ii++) {
        //If the userGuild id in user's guild matches the discord id in SP guilds then we have an intersecting guild
        if (userGuilds[i].id === shufflepikGuilds[ii].discord.id) {
          //Assign guild object to intersecting guild
          guild = {
            id: userGuilds[i].id,
            name: userGuilds[i].name,
            icon: userGuilds[i].icon,
          };
          //Push assigned Object to intersecting guilds array
          intersectingGuilds.push(guild);
          //Assign album object to interesecting guild
          album = {
            id: userGuilds[i].id,
            name: userGuilds[i].name,
            images: [],
          };

          //Push assigned object to intersecting albums array
          userAlbums.push(album);

          for (var j = 0; j < shufflepikGuilds[ii].image_pool.length; j++) {
            //If an image is uploaded by a certain user then that image belongs in their album
            if (shufflepikGuilds[ii].image_pool[j].uploaded_by_id == userID) {
              //This will be the normailzed image object sent to the front-end
              const imageObject = {
                _id: shufflepikGuilds[ii].image_pool[j]._id,
                image_title: shufflepikGuilds[ii].image_pool[j].image_title,
                image_url: shufflepikGuilds[ii].image_pool[j].image_url,
                //dayjs(
                date_uploaded: shufflepikGuilds[ii].image_pool[j].date_uploaded,
                //  ).format("MM/DD/YYYY h:mma"),
                nsfw: shufflepikGuilds[ii].image_pool[j].nsfw,
              };

              album.images.push(imageObject);
            }
          }
          break;
        }
      }
    }

    const userData = {
      guilds: intersectingGuilds,
      albums: userAlbums,
    };

    return userData;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Creates user
 * @param { User } userParam User object.
 * @returns Message, either a 'user created' message or a 'user already exists' message.
 */
async function create(userParam) {
  //Create a client instance and assign to const client
  //const client = await instantiateMongoClient();
  const client = await db_controller.instantiateMongoClient();
  try {
    //Connect Mongo client.
    await client.connect();
    //Assign database and collection to our Mongo client connection
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    //Search for user in collection
    const user = await collection.findOne({
      email: userParam.email.toLowerCase(),
    });

    //create a login object that keeps track of a user's login activity
    login = {
      number_of_logins: 0,
      dates: [],
    };
    //If user exists, return 'error' message
    //Else create user and return 'success' message
    if (user) {
      return Response.ExistingUser;
    } else {
      await createUser();
      return Response.CreatedUser;
    }
    /**
     * Creates user in database
     */
    async function createUser() {
      try {
        //Email user a email validation link and return email validation object.
        const emailValidation = await emailValidationLink(userParam.email);
        //Set email as lowercase self
        userParam.email = userParam.email.toLowerCase();
        //Set User object to userParam without the plaintext password
        let user = _.omit(userParam, "password");
        //Add hashed password to user object
        user.hash = bcrypt.hashSync(userParam.password, 10);
        //Add a time of installation property,c urrent date in ISO8601, without fraction seconds.
        user.install_date = dayjs().format();
        //
        const discordObj = {
          connected: false,
        };

        //Since user is just being created, their discord cannot be connected to Shufflepik
        //user.discord_connected = false;
        user.discord = discordObj;
        user.login = login;
        user.email_validation = emailValidation;

        //user.email_validation = emailValidation;

        //Insert user to database
        await collection.insertOne(user);
      } catch (err) {
        console.log(err);
        throw err;
      }
    }
  } catch (err) {
    console.log(err);
    throw err;
  } finally {
    //Clost Mongo client connection
    await client.close();
  }
}

/**
 * Prepares and sends a validation link to the user's email corresponding to user _id passed.
 * @param {string} _id Shufflepik user id.
 * @returns {Promise} Promise object contains a string message.
 */
async function sendEmailValidationLink(_id) {
  try {
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const user = await usersCollection.findOne({
      _id: ObjectId(_id),
    });
    if (!user) {
      return Response.UserDNE;
    }
    const email = user.email;
    //This does the acutal sending of the email validation link
    const emailValidation = await emailValidationLink(email);

    await usersCollection.updateOne(
      {
        email: user.email,
      },
      {
        $set: { email_validation: emailValidation },
      }
    );

    return Response.ValidateEmailSent;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Sends user a email validation link. Also creates an email validation object.
 *
 * @param {string} email  User's email
 * @returns {Promise} Promise object represents email validation object. This has email validation details necessary to properly know if a user's email has been validated.
 */
async function emailValidationLink(email) {
  try {
    //Email validation token
    const validatonToken = `${Date.now().toString()}${crypto
      .randomBytes(16)
      .toString("hex")}`;
    //Set validation expiration to 7 days
    const validationExpiration = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 100
    ).toISOString();
    //Create email validation object with validation details
    const emailValidation = {
      validated: false,
      token: validatonToken,
      expiration: validationExpiration,
    };

    let emailService = await getEmailServiceDetails();

    const valTok = new URLSearchParams({
      validation_token: validatonToken,
    });

    const emailOptions = {
      to: email,
      from: '"Shufflepik" <no-reply@shufflepik.com>',
      subject: "Please validate email for Shufflepik",
      html: `
            <h2>Welcome to Shufflepik!</h2>
            <h3>We're really excited to welcome you to Shufflepik. Click the link below to verify your email address.\n</h3>
            <p><a href="${process.env.API_PATH}/users/ve?${valTok}">Click here to verify\n</a></p>
            <p>By validating your email you will be able to uploads pictures and memes.</p> 
            <p>If you did not initiate this request please contact us directly, however you can ignore this request as this link will expire after some time.<p>
            <p>Thanks again for signing up with us, we are so stoked to have you on Shufflepik!</p>
            <br>
            <small>Please do not reply to this message. We've sent it from a notification-only address, no one will see a reply. If you need help contact us directly <a href="mailto:support@shufflepik.com" target="_blank">support@shufflepik.com</a></small>
          `,
    };

    await emailService.sendMail(emailOptions);

    return emailValidation;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Sets up and returns Nodemailer service and authorization details.
 *
 * @returns Nodemailer createTransport object
 */
async function getEmailServiceDetails() {
  try {
    const emailService = nodeMailer.createTransport({
      host: "mail.privateemail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    return emailService;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function update(_id) {}
async function _delete(_id) {
  //let deletedUser;
  try {
    const usersCollection = await mongoCollection(ShufflepikCollection.Users);
    const deleteUserQueryResponse = await usersCollection.findOneAndDelete({
      _id: ObjectId(_id),
    });

    const deletedUser = deleteUserQueryResponse.value;

    if (deletedUser) {
      const deletedUsersCollection = await mongoCollection(
        ShufflepikCollection.DeletedUsers
      );

      await deletedUsersCollection.updateOne(
        { _id: ObjectId(_id) },
        {
          $set: deletedUser,
          $push: { dates_deleted: dayjs().format() },
        },
        {
          upsert: true,
        }
      );

      const urlReferences = await getDeletedUserImageReferences(
        deletedUser._id
      );

      //Contains content moved from active collection to inactive (deleted) collection.
      await deleteUserContent(deletedUser._id);
      await deleteUserImagesFromImagePools(deletedUser);
      //TODO use url references to move

      await media_controller.deleteUserAccountImages(urlReferences);
    }

    return;
  } catch (err) {
    if (
      err.name === MongoErrors.Error &&
      err.code === MongoErrors.DuplicateKey
    ) {
      console.log(err);
      await handleMongoDuplicateKey(deletedUser);

      return;
    } else {
      console.log(err);
      throw err;
    }
  }
}

async function handleMongoDuplicateKey(deletedUser) {
  try {
    const userToDelete = _.omit(deletedUser, "date_deleted");
    const collection = await mongoCollection(ShufflepikCollection.DeletedUsers);
    await collection.updateOne(
      {
        _id: ObjectId(userToDelete._id),
      },
      {
        $push: { dates_deleted: dayjs().format() },
      }
    );

    const deletedImages = await deleteUserImagesFromImagePools(deletedUser);
    const urlReferences = await getDeletedUserImageReferences(deletedUser._id);

    await media_controller.deleteUserAccountImages(urlReferences);
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function deleteUserImagesFromImagePools(user) {
  try {
    //console.log("made it to delete user images from pools");
    const userId = user._id.toString();
    const guildsCollection = await mongoCollection(ShufflepikCollection.Guilds);
    //Pull images from image pools
    const pullImageResults = await guildsCollection.updateMany(
      {},
      { $pull: { image_pool: { uploaded_by_id: userId } } }
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

//Removed a user's content data from live image_pools, moves content to deleted
async function deleteUserContent(userId) {
  try {
    const guildsCollection = await mongoCollection(ShufflepikCollection.Guilds);
    const deletedUserContent = await guildsCollection
      .aggregate([
        {
          $project: {
            _id: 1,
            discord: 1,
            install_date: 1,
            installed_by_id: 1,
            installed_by_username: 1,
            preferred_locale: 1,
            nsfw: 1,
            bot_uninstalled_from_guild: 1,
            user_images_to_delete: {
              $filter: {
                input: "$image_pool",
                as: "image",
                cond: {
                  $eq: ["$$image.uploaded_by_id", userId.toString()],
                },
              },
            },
          },
        },
        {
          $addFields: {
            bot_uninstalled_from_guild: false,
            user_images_to_delete: {
              $map: {
                input: "$user_images_to_delete",
                as: "image",
                in: {
                  _id: "$$image._id",
                  date_deleted: dayjs().format(),
                  date_uploaded: "$$image.date_uploaded",
                  uploaded_by_discord_username:
                    "$$image.uploaded_by_discord_username",
                  uploaded_by_id: "$$image.uploaded_by_id",
                  image_title: "$$image.image_title",
                  image_url: "$$image.image_url",
                  likes: "$$image.likes",
                  flags: "$$image.flags",
                  nsfw: "$$image.nsfw",
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "DELETED_CONTENT",
            localField: "discord.id",
            foreignField: "discord.id",
            as: "deleted_images",
          },
        },
        {
          $unwind: {
            path: "$deleted_images",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            image_pool: {
              $concatArrays: [
                {
                  $ifNull: ["$deleted_images.image_pool", []],
                },
                {
                  $ifNull: ["$user_images_to_delete", []],
                },
              ],
            },
          },
        },
        {
          $project: {
            discord: 1,
            install_date: 1,
            installed_by_id: 1,
            installed_by_username: 1,
            preferred_locale: 1,
            nsfw: 1,
            guild_deleted: 1,
            image_pool: 1,
            bot_uninstalled_from_guild: 1,
          },
        },
        {
          $merge: {
            into: "DELETED_CONTENT",
            on: "_id",
            whenMatched: "replace",
            whenNotMatched: "insert",
          },
        },
      ])
      .toArray(); //~SP1~//

    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Returns all of a user's uploaded images as url references.
 * @param {Object} userId A Shufflpik user id
 * @returns {Promise} Array of url location references
 */
async function getDeletedUserImageReferences(shufflepikUserId) {
  try {
    const guildsCollection = await mongoCollection(ShufflepikCollection.Guilds);
    const urlRefrences = await guildsCollection
      .aggregate([
        {
          $match: { "image_pool.uploaded_by_id": shufflepikUserId.toString() },
        },
        { $unwind: { path: "$image_pool" } },
        { $replaceRoot: { newRoot: "$image_pool" } },
        {
          $project: { _id: 0, image_url: 1 },
        },
      ])
      .toArray();

    return urlRefrences;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Creates a collection instance.
 *
 * @param {*} client
 * @returns Instance of collection to be queried.
 */
async function mongoCollection(collectionName) {
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();
    const collectionInstance = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(collectionName);

    return collectionInstance;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Creates an instance of Mongo (client)
 * @returns An instance of the Mongo client
 */
async function instantiateMongoClient() {
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    return client;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Creates and email a reset password link to user (if user exists).
 * 
 * @param {object} email - User email.

 * @returns 
 */
async function emailResetPasswordLink(email) {
  try {
    //Check if user exists using function from our database controller
    const user = await db_controller.getUserByEmail(email.toLowerCase());
    //If user does not exists return. Provide no extra context to prevent email enumeration.
    if (!user) {
      return;
    }
    const userEmail = email;
    //Create an instance of Mongo Client
    const client = await db_controller.instantiateMongoClient();
    //Connect client
    await client.connect();
    //Assign database and collection to our Mongo client connection
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    //Create a random reset token value
    const resetToken = `${Date.now().toString()}${crypto
      .randomBytes(16)
      .toString("hex")}`;
    //Create a expiration time on token, in our case, 24 hours
    const resetExpiration = new Date(
      Date.now() + 24 * 60 * 60 * 100
    ).toISOString();
    //create a password reset object to store in db
    const passwordReset = {
      token: resetToken,
      expiration: resetExpiration,
      used: false,
    };
    //Update our current collection with password reset object
    await collection.updateOne(
      { email: userEmail },
      {
        $set: { password_reset: passwordReset },
      }
    );

    let emailService = await getEmailServiceDetails();

    const resTok = new URLSearchParams({
      reset_token: resetToken,
    });

    const emailOptions = {
      to: userEmail,
      from: '"Shufflepik" <no-reply@shufflepik.com>',
      subject: "Shufflepik password reset",
      html: `
            
            <h3>You are receiving this because you, or someone else, have requested the reset of the password associated with this account.\n
            Please click on the following link: <a href="${process.env.API_PATH}/users/send-password-reset?${resTok}">Reset Password</a></h3>\n\n
            
            <p>The link will expire after 24 hours.</p>

            <p>If you did not request this password reset please disregard email and ensure your devices have not 
            been compromised.</p>
            <br>
            <small>Please do not reply to this message. We've sent it from a notification-only address, no one will see a reply. If you need help contact us directly <a href="mailto:support@shufflepik.com" target="_blank">support@shufflepik.com</a></small>
            `,
    };

    await emailService.sendMail(emailOptions);

    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function resetPassword(token, password) {
  try {
    console.log("reset password controller");
    const isTokenValid = await validatePasswordResetToken(token);
    if (isTokenValid) {
      const user = isTokenValid;
      const client = await db_controller.instantiateMongoClient();
      await client.connect();
      const usersCollection = client
        .db(process.env.SHUFFLEPIK_DB)
        .collection(ShufflepikCollection.Users);
      const userHash = bcrypt.hashSync(password, 10);
      const updatePassword = await usersCollection.findOneAndUpdate(
        {
          _id: ObjectId(user._id),
        },
        {
          $set: {
            hash: userHash,
            password_reset: {
              token: user.password_reset.token,
              expiration: user.password_reset.expiration,
              used: true,
            },
          },
        }
      );
      return Response.PasswordResertSuccess;
    } else {
      return Response.PasswordResetError;
    }
  } catch (err) {
    console.log(err);
    throw errl;
  }
}

async function sendPasswordResetPage(token) {
  try {
    const account = await validatePasswordResetToken(token);
    if (!account) {
      return Response.PasswordResetError;
    }
    return `${process.env.CLIENT_PATH}/reset-password/${token}`;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
/**
 * Validates a password reset string.
 * @param {object} token - Password reset token.
 * @returns {object|boolean} account object if token is validated, false otherwise.
 */
async function validatePasswordResetToken(token) {
  try {
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const account = await collection.findOne({
      "password_reset.token": token,
    });

    //If account doesn't exist, return.
    if (!account) {
      return false;
    }
    //If token is expired, return.
    if (
      new Date() > new Date(account.password_reset.expiration) ||
      account.password_reset.used === true
    ) {
      return false;
    }

    return account;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

//what the f are you fing for
async function initLocalStorage() {
  try {
    //Must first call init to use temporary storage
    await storage.init({
      dir: "./scratch",
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: "utf8",
      logging: false, // can also be custom logging function
      ttl: false, // ttl* [NEW], can be true for 24h default or a number in MILLISECONDS or a valid Javascript Date object
      expiredInterval: 60 * 1000, // every minute the process will clean-up the expired cache
      // in some cases, you (or some other service) might add non-valid storage files to your
      // storage dir, i.e. Google Drive, make this true if you'd like to ignore these files and not throw an error
      forgiveParseErrors: false,
    });
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

//~TODO TAGS BEGIN HERE~//

//~SP1~//
/*
Issue: Attempted to use $merge in pipeline operator and was inconsistently working, cause -> unkown? 
Conjecture: Perhaps it has something to do with the nonexisting document not having a unqiue ID? I know an nonexisting doc cannot have a unique Id so...not sure.*/
