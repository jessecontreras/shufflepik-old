//require("dotenv").config();
//Utility module
const _ = require("lodash");

//Third party modules
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodeMailer = require("nodemailer");
const axios = require("axios").default;

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
    "⚠️ An account with this email already exists, please try another email.",
  CreatedUser: "Ahh yeah account successfully created 🎊 😎 !",
  UserDNE:
    "It appears that this user does not exists. Please contact us if you believe this is a mistake.",
  EmailOrPasswordIncorrect: " ❌ Incorrect email or password.",
  PasswordResetError:
    "⚠️ Hmmm, something went wrong, we suggest having another password link sent to your email.",
  PasswordResertSuccess: " 🙌 Successfully changed password!",
  ValidateEmailSent:
    "Please validate your email, we've successfully sent you a validation email.",
  ValidateEmailSuccess:
    "Thank you for validating your email! You are good to go 😎",
  ValidateEmailError:
    "Something went wrong with validating your email. Request another link or contact us if you think this is an error.",
};

let controller = {};

controller.authenticate = authenticate;
controller.getAll = getAll;
controller.getById = getById;
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

module.exports = controller;

async function authenticate(email, password) {
  try {
    console.log("Made it to authenticate controller");
    //Instantiate client
    const client = await db_controller.instantiateMongoClient();
    console.log("Make it here?");
    //Connect Mongo client.
    await client.connect();
    //Assign database and collection to our Mongo client connection
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const dbUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });
    console.log("Make it here 2?");

    if (dbUser && bcrypt.compareSync(password, dbUser.hash)) {
      //Authentication successfull return user
      console.log("User authenticated");

      let user = {
        _id: dbUser._id,

        jwt: jwt.sign(
          {
            sub: dbUser._id,
          },
          process.env.SECRETO_DE_AMOR,
          //{ expiresIn: "5d" }
          { expiresIn: "5d" }
        ),
        //discord_connected: dbUser.discord_connected,
        discord: dbUser.discord,
        email_validation: dbUser.email_validation,
        email: dbUser.email,
      };
      console.log("User is (backend");
      console.log(user);

      //If user is connected get fresh (new) data on them and update on the DB. Also update refresh token. Then send the relevant info back to the client.
      // if (user.discord_connected) {
      if (user.discord.connected) {
        //In the event the user needs to explicitly gain their Discord token, user info will be saved locally so that
        console.log("Made it to user logged in and shit. Discord Connected");
        console.log("Database user information");
        console.log(dbUser);

        //Decrypt a user's refresh_token
        const refreshToken = await discord_controller.decryptRefreshToken(
          dbUser
        );
        console.log("Refresh token is:");
        console.log(typeof refreshToken);
        console.log(refreshToken);
        //Get a new access token from user
        const userToken = await discord_controller.getUserTokenUsingRefresh(
          refreshToken
        );
        console.log("New user token is:");
        console.log(userToken);
        //If user has a valid token then process accordingly, otherwise ask client to request user permission to access Discord information.
        if (userToken) {
          //Get the latest Discord user info
          const latestUser = await discord_controller.getDiscordUser(userToken);
          console.log("Discord info post login");
          console.log(latestUser);
          //Get the latest Discord guild info
          const latestUserGuilds = await discord_controller.getUserGuilds(
            userToken
          );
          console.log("Discord guild info post login");
          console.log(latestUserGuilds);
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
          const updatedUser = await db_controller.updateUserOnLogin(
            usersCollection,
            dataToUpdate
          );
          console.log("updated user is:");
          console.log(updatedUser);
          console.log("gettting all guilds");
          //Get shufflepik guilds
          const shufflepikGuilds = await db_controller.getAllGuilds();
          console.log("All of the shufflepik guilds are:");
          console.log(shufflepikGuilds);
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
          console.log("user blah");
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
    console.log("Validate Email (controller)\nToken:");
    console.log(token);
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);

    const account = await usersCollection.findOne({
      "email_validation.token": token,
    });
    console.log("Account of email is:");
    console.log(account);
    if (!account) {
      errorResponse = new URLSearchParams({
        validateEmailError: Response.ValidateEmailError,
      });

      return `http://localhost:8080/${errorResponse}`;
    }
    if (
      new Date() > new Date(account.email_validation.expiration) ||
      account.email_validation.validated == true
    ) {
      errorResponse = new URLSearchParams({
        validateEmailError: Response.ValidateEmailError,
      });

      return `http://localhost:8080/${errorResponse}`;
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

    return `http://localhost:8080/${successResponse}`;
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
    console.log("User token is:");
    console.log(userToken);
    console.log("User is:");
    const user = await discord_controller.getDiscordUser(userToken);
    console.log(user);
    console.log("User guilds are:");
    const userGuilds = await discord_controller.getUserGuilds(userToken);
    console.log(userGuilds);
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
    console.log("Just set the item");
    console.log("We will now get item, it is:");
    console.log(await storage.valuesWithKeyMatch(userData.discord.id));

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
    console.log("User is:");
    console.log(user);
    console.log("Database user is:");
    console.log(dbUser);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Using fresh Discord user data, update user on database.
 *
 * @param {string} collection The USERS collection.
 * @param {string} userID User (ID) to be updated, specifically DB user ID (_id).
 * @returns updated user in the collection.
 */
async function updateUserOnLogin(collection, userID) {
  try {
    await collection.findOneAndUpdate(
      {
        _id: ObjectId(dbUser._id),
      },
      {
        $set: {
          discord: {
            refresh_token: userToken.refresh_token,
            guilds: freshUserGuilds,
          },
        },
      }
    );

    return updatedUser;
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

async function integrateUser(req, res) {
  console.log("Made it to integrate user");
  try {
    //Get our user information saved locally
    let userToIntegrate = await storage.valuesWithKeyMatch(req.data);
    //Local storage (node-persist) returns a single object array, we're simply referencing the object here.
    userToIntegrate = userToIntegrate[0];
    console.log("USER TO INTEGRATE IS:");
    console.log(userToIntegrate);
    //The last four characters of 'data' value should be user's discriminator, if not return. We do this just to check, at a cursory level, that data has not been tampered with.
    const userDiscriminator = req.data.substring(0, 4);
    console.log(userDiscriminator);
    if (userDiscriminator == userToIntegrate.discord.discriminator) {
      //Encrypt a user's refresh_token
      const token = await encryptRefreshToken(userToIntegrate);

      console.log("Token value after encryption");
      console.log(token);
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
      console.log("the updated user is:");
      console.log(updatedUser);
      //User discord controller to pull fresh discord data of user

      //Get Shufflepik Guilds
      const shufflepikGuilds = await db_controller.getAllGuilds();
      console.log("Shufflepik guilds are:");
      console.log(shufflepikGuilds);

      //Get intersecting guilds. Must pass through a user's Discord guilds and SP guilds.
      //let intersectingGuilds = await getIntersectingGuilds(updatedUser.discord.guilds, shufflepikGuilds);
      //If there are active guilds match them otherwise return an empty array;
      //intersectingGuilds = intersectingGuilds ? intersectingGuilds : [];
      //console.log("Intersecting guilds are:");
      //console.log(intersectingGuilds);
      //Get guilds and album of a user
      console.log("guild and album data is:");
      let guildAndAlbumData = await getIntersectingGuildsAndAlbums(
        updatedUser._id,
        updatedUser.discord.guilds,
        shufflepikGuilds
      );
      console.log(guildAndAlbumData);
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
      console.log("user to send to the front end is:");
      console.log(user);
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
                date_uploaded: dayjs(
                  shufflepikGuilds[ii].image_pool[j].date_uploaded
                ).format("MM/DD/YYYY h:mma"),
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
 * @param {*} userID - User whose data will be compilated. This is their ObjectId.
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
          console.log("This album is:");
          console.log(album);
          //Push assigned object to intersecting albums array.
          userAlbums.push(album);

          //TODO: MUST ADD IMAGEPOOLS ARRAY T0 GUILDS BY DEFAULT

          for (var j = 0; j < shufflepikGuilds[ii].image_pool.length; j++) {
            //If an image is uploaded by a certain user then that image belongs in their album.
            console.log("uploaded by:");
            console.log(
              typeof shufflepikGuilds[ii].image_pool[j].uploaded_by_id
            );
            console.log(shufflepikGuilds[ii].image_pool[j].uploaded_by_id);
            console.log("User id is:");
            console.log(typeof userID);
            console.log(userID);

            if (shufflepikGuilds[ii].image_pool[j].uploaded_by_id == userID) {
              //This will be the normailzed image object sent to the front-end.
              const imageObject = {
                _id: shufflepikGuilds[ii].image_pool[j]._id,
                image_title: shufflepikGuilds[ii].image_pool[j].image_title,
                image_url: shufflepikGuilds[ii].image_pool[j].image_url,
                date_uploaded: dayjs(
                  shufflepikGuilds[ii].image_pool[j].date_uploaded
                ).format("MM/DD/YYYY h:mma"),
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

async function getUserAlbums() {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getAll() {}

async function getById(_id) {}

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
        const discordObj = {
          connected: false,
        };
        //Since user is just being created, their discord cannot be connected to Shufflepik
        //user.discord_connected = false;
        user.discord = discordObj;
        user.login = login;
        user.email_validation = emailValidation;

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
    console.log("User is:");
    console.log(user);
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
            <p><a href="${process.env.HTTP_TUNNEL}/users/ve?${valTok}">Click here to verify\n</a></p>
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
    console.log("Deleted user");
    console.log(deleteUserQueryResponse.value);
    //the dafuq
    const deletedUser = deleteUserQueryResponse.value;
    //const date_deleted = dayjs().format();
    //deletedUser.date_deleted = date_deleted;

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

    //await deletedUsersCollection.insertOne(deletedUser);
    console.log("Aqui estoy");
    /*const deleteImagesFromImagePools = await deleteUserImagesFromImagePools(
      deletedUser
    );*/
    const urlReferences = await getDeletedUserImageReferences(deletedUser._id);

    // console.log("made it back from deleteImagesFromImagePools");
    //Contains content moved from active collection to inactive (deleted) collection.
    console.log("DELETED USER");
    console.log(deletedUser);
    console.log(deletedUser._id);
    const deletedContentData = await deleteUserContent(deletedUser._id);
    //console.log("Deleted content should be");
    //console.log(deletedContentData);
    const deleteImagesFromImagePools = await deleteUserImagesFromImagePools(
      deletedUser
    );
    //  const urlReferences = await getDeletedUserImageReferences(deletedUser._id);
    //TODO use url references to move u
    console.log("back from url ref");
    await media_controller.deleteUserAccountImages(urlReferences);
    console.log("Should have made it back from media_controller");

    return;
    /*const guildsCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);*/
    /*const pulledImages = await guildsCollection.aggregate([
      {
        $match: { "image_pool.uploaded_by_id": "619dadc90565852231771659" },
      },
      {
        $pull: {
          image_pool: { uploaded_by_id: { $in: ["619dadc90565852231771659"] } },
        },
      },
    ]);*/

    console.log("Pulled images are:");
    console.log(pulledImages);

    //const deletedImagePool = await
    return "meh";
  } catch (err) {
    if (
      err.name === MongoErrors.Error &&
      err.code === MongoErrors.DuplicateKey
    ) {
      console.log(err);
      await handleMongoDuplicateKey(deletedUser);

      return;
    } else {
      console.log(err.name);
      console.log(err.code);
      console.log(err);

      throw err;
    }
  }
}

async function handleMongoDuplicateKey(deletedUser) {
  try {
    console.log("/made it to handle Mongo");

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
    console.log("Made it back from delete User images");
    const urlReferences = await getDeletedUserImageReferences(deletedUser._id);
    console.log("REferences are:");
    console.log(urlReferences);
    await media_controller.deleteUserAccountImages(urlReferences);
    console.log("Should have made it back from media_controller");
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function deleteUserImagesFromImagePools(user) {
  try {
    console.log("made it to delete user images from pools");
    const userId = user._id.toString();
    const guildsCollection = await mongoCollection(ShufflepikCollection.Guilds);
    //Use all the references to

    // const client = await db_controller.instantiateMongoClient();
    //await client.connect();
    /*const guildsCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);*/
    //THIS IS THE GOOD ONE So this pulls imaegs from iage pools
    const pullImageResults = await guildsCollection.updateMany(
      {},
      { $pull: { image_pool: { uploaded_by_id: userId } } }
    );
    /* await collection.updateMany(
      { image_pool: { $elemMatch: { uploaded_by_id: userId } } },
      { $pull: { image_pool: { $in: [{ uploaded_by_id: userId }] } } }
    );*/
    console.log("VVV Delete images urls VVV");
    console.log(pullImageResults);

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
    console.log("Inside of deletedContent");
    console.log("user id is:");
    console.log(userId);
    console.log(typeof userId.toString());
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
    console.log("Should be done");
    console.log(deletedUserContent);
    if (deletedUserContent.length > 0) {
      console.log("Yee");
      printjson(deletedUserContent);
    } else {
      console.log("this don't have shite.");
    }
    //.toArray();
    /*if (deletedUserContentData.length < 1) {
      return;
    }*/
    console.log("Should be done");
    //console.log(deletedUserContent);
    //Our dynamic query string

    //Generate dynamic query for bulkUpdate operation
    //for (let i = 0; i < deletedUserContentData.length; i++) {
    //The fields that we will $set on the deleted doc
    /*const deletedContentObj = {
      _id: deletedUserContentData[i]._id,
      discord: deletedUserContentData[i].discord,
      install_date: deletedUserContentData[i].install_date,
      preferred_locale: deletedUserContentData[i].preferred_locale,
      nsfw: deletedUserContentData[i].nsfw,
      installed_by_id: deletedUserContentData[i].installed_by_id,
      installed_by_username: deletedUserContentData[i].installed_by_username,
      bot_uninstalled_from_guild: false,
    };*/

    /* const query = `{
         updateOne: {
           "filter": ${deletedUserContentData[i]._id},
           "update": {
           $set: ${deletedContentObj},
           $push: { deleted_images: ${deletedUserContentData[i].user_images} },
           },
           {
             "upsert":${true}
           }
         },
       },`;
       queryBuilder += query;
       console.log("queryBuilder is:");
       console.log(queryBuilder);
       console.log("as an object:");
       console.log(JSON.parse(queryBuilder));
     }
     console.log("Should be done with query builder");
     console.log(queryBuilder);
     const deletedContentCollection = await mongoCollection(
       ShufflepikCollection.DeletedContent
     );*/

    //await deletedContentCollection.bulkWrite([queryBuilder]);

    /*let dataToInsertIntoDeletedColl;
      if (deletedUserContentData.length === 0) {
        return;
      } else if (deletedUserContentData.length === 1) {
        dataToInsertIntoDeletedColl = deletedUserContentData[0];
      } else {
        dataToInsertIntoDeletedColl = deletedUserContentData;
      }
  
      await deletedContentCollection.insert(dataToInsertIntoDeletedColl);
      //const dataToInsertToDeletedCollection = deletedContentCollection*/

    console.log("should be done with aggregate");
    console.log(deletedUserContent);
    //}
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
    console.log("made it to delete user images references");
    console.log("ID to pass is:");
    console.log(shufflepikUserId);
    console.log("type is:");
    console.log(typeof shufflepikUserId.toString());

    //const userId = shufflepikUserId.toString();

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
    console.log("URL REFERENCES");
    console.log(urlRefrences);
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
    console.log("made it send link controller");
    console.log(email.toLowerCase());
    //Check if user exists using function from our database controller
    const user = await db_controller.getUserByEmail(email.toLowerCase());
    console.log("user is:");
    console.log(user);
    //If user does not exists return. Provide no extra context to prevent email enumeration.
    if (!user) {
      console.log("User does not exists");
      return;
    }
    console.log("user does exists");
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
      from: "Shufflepik",
      subject: "Shufflepik password reset",
      html: `
            
            <h3>You are receiving this because you, or someone else, have requested the reset of the password associated with this account.\n
            Please click on the following link: <a href="${process.env.HTTP_TUNNEL}/users/send-password-reset?${resTok}">Reset Password</a></h3>\n\n
            
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
    console.log("Made it to send pass controller, token is: ");
    console.log(token);
    const account = await validatePasswordResetToken(token);
    console.log(account);
    if (!account) {
      console.log("reset token invalid");
      return Response.PasswordResetError;
    }
    return `http://127.0.0.1:8080/reset-password/${token}`;
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
    console.log("Validate password token");
    console.log(`token:${token}`);
    console.log(typeof token);
    const client = await db_controller.instantiateMongoClient();
    await client.connect();
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const account = await collection.findOne({
      "password_reset.token": token,
    });
    console.log("Account is:");
    console.log(account);
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
/*
      {
        $merge: {
          into: ShufflepikCollection.DeletedContent,
          on: "_id",
          whenMatched: [
            {
              $set: {
                discord: "$$new.discord",
                install_date: "$$new.install_date",
                installed_by_id: "$$new.installed_by_id",
                installed_by_username: "$$new.installed_by_username",
                preferred_locale: "$$new.preferred_locale",
                nsfw: "$$new.nsfw",
                bot_uninstalled_from_guild: "$$new.bot_uninstalled_from_guild",
                deleted_images: { "$$new.user_images"},
              },
              //$push: { deleted_images: "$$new.user_images" },
            },
          ],
          whenNotMatched: "insert",
        },
      },
*/
