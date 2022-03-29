//Controller object
let controller = {};
//Third party modules
let dayjs = require("dayjs");
//encryption module
//let bcrypt = require("bcryptjs");
let jwt = require("jsonwebtoken");
//Module for URL resolution
const url = require("url");
//Module that allows for window.fetch to Node.js
const fetch = require("node-fetch");
//Crypto to generate random bytes/bits
const crypto = require("crypto");
//Mongo Client
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
};
//Set up our local storage mechanism
const storage = require("node-persist");
//Use users controller for functions (IONO)
//const users_controller = require("./users.controller");
//Database controller, where all db based queries and functions are housed.
const db_controller = require("./db.controller");
const { updateUserByID } = require("./db.controller");

//Formalized server responses
//Normally the value of the key will be in all caps but for the sake of practicality we wont do that here
const Response = {
  ExistingGuild:
    "⚠️ This bot appears to exist in a guild already. Cannot install twice",
  Success: "Bot successfully installed!",
};

const Errors = {
  InvalidGrant: "invalid_grant",
};

//Controller to access discord user
controller.integrateUser = integrateUser;
controller.connect = connect;
controller.getDiscordUser = getDiscordUser;
controller.getUserGuilds = getUserGuilds;
controller.installBot = installBot;
controller.getUserToken = getUserToken;
controller.getUserTokenUsingRefresh = getUserTokenUsingRefresh;
controller.getBotToken = getBotToken;
controller.tempUserStore = tempStoreDiscordUserAndGuildInfo;
controller.tempUserStoreForBrokenToken = tempUserStoreForBrokenToken;
controller.getIntersectingGuilds = getIntersectingGuilds;
controller.decryptRefreshToken = decryptRefreshToken;
controller.encryptRefreshToken = encryptRefreshToken;

//Export default controller
module.exports = controller;

/**
 *
 * @param {*} user
 * @returns
 */
async function connect(guildInfo) {
  //the dafuq bitch what the f are you fing for after me there hsould be no more something something need me to roll
  //Create a client instance and assign to const client
  const client = await db_controller.instantiateMongoClient();
  //instantiateMongoClient();
  try {
    //Connect Mongo client.
    await client.connect();
    //Assign database and collection to our Mongo client connection, in this case our Guilds collection.
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);
    console.log("MADE IT TO CONNECT USER, DA DAFUQ BITCH");
    const guild = await collection.findOne({
      guild_id: guildInfo.id,
    });
    //If guild exists, return 'error' message
    //Else create user and return 'success' message
    if (guild) {
      console.log("Bot already installed in this guild");
      return;
    } else {
      await botInstall();
      return;
    }

    async function botInstall() {
      try {
        console.log("Inside of bot install:");
        console.log(guildInfo);
        const botGuild = {
          guild_id: guildInfo.id,
          owner_id: guildInfo.ownerID,
          member_count: guildInfo.memberCount - 1,
          bot_install_date: dayjs().format(),
          image_pool: [],
        };
        //Insert user into database
        await collection.insertOne(botGuild);
        //Check if user exists in DB, if so update guilds otherwise leave as is:
        return;
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

async function installBot(req, res) {
  console.log(
    "Made it to install bot, this is the dedicated route for install bot"
  );

  //Create a client instance and assign to const client
  const client = await db_controller.instantiateMongoClient();
  try {
    //Get a user's OAuth2 bearer token
    const tokenObject = await getBotToken(req.code);
    console.log("tokenObject is");
    console.log(tokenObject);
    //User object
    let discordUser = await getDiscordUser(tokenObject);
    //Connect Mongo client.
    await client.connect();
    //Assign database and collection to our Mongo client connection, in this case our Guilds collection.
    const shufflepikCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);
    //Find an existing guild in DB
    const guild = await shufflepikCollection.findOne({
      "discord.id": tokenObject.guild_info.id,
    });

    if (guild) {
      console.log("Bot already exists for this guild!");
      return Response.ExistingGuild;
    } else {
      shufflepikGuild = {
        preferred_locale: tokenObject.guild_info.preferred_locale,
        nsfw: tokenObject.guild_info.nsfw,
        installed_by_id: discordUser.id,
        installed_by_username: discordUser.username,
        image_pool: [],
        install_date: new Date(Date.now()).toISOString(),
        //discord guild icons are referenced as so: https://cdn.discordapp.com/icons/guild_id/guild_icon.png
        discord: {
          id: tokenObject.guild_info.id,
          owner_id: tokenObject.guild_info.owner_id,
          system_channel_id: tokenObject.guild_info.system_channel_id,
          name: tokenObject.guild_info.name,
        },
      };

      const result = await shufflepikCollection.insertOne(shufflepikGuild);
      console.log(result);
      return Response.Success;
    }
  } catch (err) {
    console.log(err);
    return false;
    //throw err;
  } finally {
    await client.close();
  }
}

/**
 *
 * Gets a user's OAuth2 bearer token.
 *
 * @param {object} accessObj - Access code.
 *
 * @returns - Discord user token data.
 *  - token_type : Specifies type of token. Ex: Bearer
 *  - access_token:  Token that grants access to user data.
 *  - guild_info:  Token's corresponding guild information.
 */
async function getBotToken(code) {
  try {
    //extract access code from accesscode objected
    console.log("Made it to get user token");
    //const urlObj = url.parse(req.url, true);
    if (code) {
      const data = {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.HTTP_TUNNEL}/discord/install`,
        code: code,
        scope: "identify email",
      };

      const tempUserTokenData = await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams(data),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      //const tempTokenData = await tempUserTokenData;
      const tokenData = await tempUserTokenData.json();
      console.log("Token data is:");
      console.log(tokenData);
      //  const accessToken = tokenData.access_token;
      //const tokenType = .token_type;

      const tokenObject = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        guild_info: tokenData.guild,
      };

      return tokenObject;
    } //end if urlObj.query.code
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets user token. This is the inital stage of backend onboarding.
 *
 * @param {code} code - Permission code, obtained when user explicitly grants permission for app to access Discord user data.
 * @param {boolean} refreshingToken - Boolean specified if this function is being called to refresh a corrupted token, this deterines redirectURI;
 * @returns - Token object. An object with access_token, token_type, refresh_token properties.
 */
async function getUserToken(code) {
  try {
    console.log("Made it to get user token");
    if (code) {
      const data = {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.HTTP_TUNNEL}/discord/x-user-info`,
        //redirect_uri: process.env.DISCORD_REDIRECT_URI,
        code: code,
        scope: "identify email guilds",
      };

      const tempUserTokenData = await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams(data),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      //const tempTokenData = await tempUserTokenData;
      const tokenData = await tempUserTokenData.json();
      console.log("Token data is:");
      console.log(tokenData);

      const tokenObject = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        refresh_token: tokenData.refresh_token,
      };

      return tokenObject;
    } //end if urlObj.query.code
  } catch (err) {
    console.log(
      "Made it to get user token part of this shiz, discord_controller"
    );
    console.log(err);
    throw err;
  }
}

/**
 * Gets a user token for user's that have expired or damaged (refresh) tokens.
 *
 * @param {code} code - Permission code, obtained when user explicitly grants permission for app to access Discord user data.
 * @returns - Token object. An object with access_token, token_type, refresh_token properties.
 */
/*async function renewUserToken(code) {
  try {
    //extract access code from accesscode objected
    console.log("Made it to get user token");
    //const urlObj = url.parse(req.url, true);
    if (code) {
      const data = {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.HTTP_TUNNEL}/discord/user-token`,
        code: code,
        scope: "identify",
      };

      const tempUserTokenData = await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams(data),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      //const tempTokenData = await tempUserTokenData;
      const tokenData = await tempUserTokenData.json();
      console.log("Token data is:");
      console.log(tokenData);

      const tokenObject = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        refresh_token: tokenData.refresh_token,
      };

      return tokenObject;
    } //end if urlObj.query.code
  } catch (err) {
    console.log(err);
    throw err;
  }
}*/

/**
 * Gets access token using user refresh token.
 *
 * Allows access to Discord user information without having to ask Discord user for permission again.
 *
 * @param {string} refreshToken - Refresh token provided by Discord user authentication.
 * @returns - Token object. An object with access_token, token_type, refresh_token properties.
 */
async function getUserTokenUsingRefresh(refreshToken) {
  try {
    console.log("Made it to get user token using refresh");
    const data = {
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    };

    const tempUserTokenData = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        body: new URLSearchParams(data),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    /* const tempUserTokenData = await fetch("https://discord.com/api/users/@me", {
      headers: {
        authorization: `Bearer${refreshToken}`,
      },
    });*/

    //const tokenData = await tempUserTokenData.json();
    const tokenData = await tempUserTokenData.json();
    console.log("Token data is:");
    console.log(tokenData);

    //If refresh token exists in token data then token data is ok. However if not return false;
    if (tokenData.refresh_token) {
      const tokenObject = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        refresh_token: tokenData.refresh_token,
      };
      console.log("Token object is:");
      console.log(tokenObject);

      return tokenObject;
    } else {
      return false;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Gets a Discord user object.
 *
 * @param {object} tokenObject - Token object returned by getBotToken. Token object contains token type and user access token.
 * @returns userInfo - Discord user object.
 */
async function getDiscordUser(tokenObject) {
  try {
    const discordUserInfo = await fetch("https://discord.com/api/users/@me", {
      headers: {
        authorization: `${tokenObject.token_type} ${tokenObject.access_token}`,
      },
    });
    const userInfo = await discordUserInfo.json();

    return userInfo;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getSPUser(discordId) {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/** what the fuck are you fucking for
 * Gets a list of user guild objects.
 *
 * @param {*} tokenObject - Token object returned by getBotToken. Token object contains token type and user access token.
 * @returns userGuilds - A Discord user's guilds.
 */
async function getUserGuilds(tokenObject) {
  try {
    const discordUserGuildsResponse = await fetch(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          authorization: `${tokenObject.token_type} ${tokenObject.access_token}`,
        },
      }
    );
    const guildResponse = await discordUserGuildsResponse;
    const userGuilds = await guildResponse.json();

    return userGuilds;
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
 * 
 * Encrypts refresh_token. Returns encrypted refresh_token inside of the token object.
 * 
 * @param {
   user
 }
 user A Shufflepik user object.A user 's Discord id, Discord discriminator and their token object are used in this function.
 * @returns encrytped token object. { iv: string, encrypted_data: string }
 *  
 */
async function encryptRefreshToken(user) {
  try {
    //Defining algo
    const algo = "aes-256-cbc";
    //We will define our key by using a user's Discord id and discriminator
    const userIdAndDiscrimniator = `${user.discord.id}${user.discord.discriminator}`;
    const firstSixteenBytes = userIdAndDiscrimniator.substring(0, 16);
    const secondSixteenBytes = userIdAndDiscrimniator.substring(5, 21);
    //Our key will consist of 2 mashups (firstSixteenBytes) and (secondSixteenBytes) of user's data.
    const key = `${firstSixteenBytes}${secondSixteenBytes}`;
    //Create cipher IV
    const iv = crypto.randomBytes(16);
    //Create cipheriv
    let cipher = crypto.createCipheriv(algo, Buffer.from(key), iv);
    //Encrypt refresh_token
    let encrypted = cipher.update(user.discord.token);
    //finish our encryption
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const token = {
      iv: iv.toString("hex"),
      encrypted_data: encrypted.toString("hex"),
    };
    console.log("encrypted token is:");
    console.log(token);

    return token;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Decrypts a user's refresh_token.
 *
 * @param {object} user A Shufflepik user object. A user's Discord id, Discord discriminator and their token object are used in this function.
 * @returns decrypted refresh_token
 */
async function decryptRefreshToken(user) {
  try {
    //Defining algo
    const algo = "aes-256-cbc";
    //We will define our key by using a user's Discord id and discriminator
    const userIdAndDiscrimniator = `${user.discord.id}${user.discord.discriminator}`;
    const firstSixteenBytes = userIdAndDiscrimniator.substring(0, 16);
    const secondSixteenBytes = userIdAndDiscrimniator.substring(5, 21);
    //Our key will consist of 2 mashups (firstSixteenBytes) and (secondSixteenBytes) of user's data.
    const key = `${firstSixteenBytes}${secondSixteenBytes}`;
    console.log("Key length is:");
    console.log(key.length);

    //const decipher = crypto.createDecipheriv(algo, Buffer.from(key), iv);
    //Create decipheriv
    const decipher = crypto.createDecipheriv(
      algo,
      key,
      Buffer.from(user.discord.token.iv, "hex")
    );

    //let decrypted = decipher.update(encryptedData);
    //decrypt refresh_token
    let decrypted = decipher.update(
      Buffer.from(user.discord.token.encrypted_data, "hex"),
      "hex",
      "utf-8"
    );
    //finish our decryption
    //decrypted = Buffer.concat([decrytped, decipher.final()]);
    decrypted += decipher.final("utf8");

    console.log("Decrypted message: " + decrypted);
    console.log(typeof decrypted);
    //Return string representation of decrypted refresh_token
    return decrypted.toString();
  } catch (err) {
    console.log(err);
    return false;
    //throw err;
  }
}

/**
 * Gets guilds that exist in Shufflpik and in a Discord's user's guilds.
 * Overlapping guilds are what's known as the 'intersectiion' of guilds.
 *
 * @param {array} userGuilds A discord's user's guilds (guilds that a user is part of).
 * @param {array} shufflepikGuilds Guilds that exist in Shufflepik (Guilds that Shufflepik is installed to);
 * @returns Intersecting guilds array.
 */
async function getIntersectingGuilds(userGuilds, shufflepikGuilds) {
  try {
    const intersectingGuilds = userGuilds.filter((userGuild) =>
      shufflepikGuilds.some((spGuild) => userGuild.id === spGuild.discord.id)
    );
    return intersectingGuilds;
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
 *
 *
 * @param {object} req - should be an object with permission code as only property.
 */
async function tempStoreDiscordUserAndGuildInfo(req) {
  try {
    //Initialize local storage
    await initLocalStorage();

    //Check for code before doing anything
    if (req.code) {
      console.log("req.code is:");
      console.log(req.code);
      const userToken = await getUserToken(req.code);
      console.log("User token is:");
      console.log(userToken);
      console.log("User is:");
      const user = await getDiscordUser(userToken);
      console.log(user);
      console.log("User guilds are:");
      const userGuilds = await getUserGuilds(userToken);
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
          token: userToken.refresh_token,
        },
      };

      const userIdentifier = `${userData.discord.discriminator.toString()}${crypto
        .randomBytes(16)
        .toString("hex")}`;
      console.log("user identifier is:");
      console.log(userIdentifier);

      await storage.setItem(userIdentifier, userData);
      console.log("Just set the item");
      console.log("We will now get item, it is:");
      console.log(await storage.valuesWithKeyMatch(userIdentifier));

      return userIdentifier;
    } else {
      return;
    }
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
    const userToken = await getUserToken(code);
    console.log("User token is:");
    console.log(userToken);
    console.log("User is:");
    const user = await getDiscordUser(userToken);
    console.log(user);
    console.log("User guilds are:");
    const userGuilds = await getUserGuilds(userToken);
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

/**
 * If a user does not have a token, refresh token, or their refresh token has expired, the user
 * will be redirected to Discord for access to a new refresh token.
 */
async function redirectToRetainToken() {
  console.log("Made it to redirect to retain");
  try {
    fetch(
      "https://discord.com/api/oauth2/authorize?client_id=825496326107430982&redirect_uri=https%3A%2F%2F7497f7c152d8.ngrok.io%2Fdiscord%2Fx-user-info&response_type=code&scope=identify%20email%20connections%20guilds"
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
}

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
