//import module
//const LocalStorage = require("node-localstorage");
let LocalStorage = require("node-localstorage").LocalStorage;
// constructor function to create a storage directory inside our project for all our localStorage setItem.
let localStorage = new LocalStorage("../scratch");
//Local dependencies
const { Connection } = require("../helpers/mongoConnection.helper");
//Controller object
let controller = {};
//Third party modules
let dayjs = require("dayjs");
let jwt = require("jsonwebtoken");
//Module that allows for window.fetch to Node.js
const fetch = require("node-fetch");
//Crypto to generate random bytes/bits
const crypto = require("crypto");
//Shufflepik enum for collections
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  Scratch: "SCRATCH",
};

//Set up our local storage mechanism
//Database controller, where all db based queries and functions are housed.
const db_controller = require("./db.controller");
//Formalized server responses
//Normally the value of the key will be in all caps but for the sake of practicality we wont do that here
const Response = {
  ExistingGuild:
    "⚠️ This bot appears to exist in a guild already. Cannot install twice",
  Success: "Bot successfully installed!",
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
controller.tempUserStore = tempUserStore;
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
  //Create a client instance and assign to const client
  //const client = await db_controller.instantiateMongoClient();
  //instantiateMongoClient();
  try {
    const guild = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .findOne({
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
        const botGuild = {
          guild_id: guildInfo.id,
          owner_id: guildInfo.ownerID,
          member_count: guildInfo.memberCount - 1,
          bot_install_date: dayjs().format(),
          image_pool: [],
        };
        //Insert user into database

        await Connection.db
          .collection(ShufflepikCollection.Guilds)
          .insertOne(botGuild);
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
    // await client.close();
  }
}

async function installBot(req, res) {
  //Create a client instance and assign to const client
  //const client = await db_controller.instantiateMongoClient();
  try {
    //Get a user's OAuth2 bearer token
    const tokenObject = await getBotToken(req.code);
    //User object
    let discordUser = await getDiscordUser(tokenObject);

    const guild = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .findOne({
        "discord.id": tokenObject.guild_info.id,
      });

    if (guild) {
      return Response.ExistingGuild;
    } else {
      shufflepikGuild = {
        preferred_locale: tokenObject.guild_info.preferred_locale,
        nsfw: tokenObject.guild_info.nsfw,
        installed_by_id: discordUser.id,
        installed_by_username: discordUser.username,
        image_pool: [],
        command_usage: [],
        install_date: new Date(Date.now()).toISOString(),
        //discord guild icons are referenced as so: https://cdn.discordapp.com/icons/guild_id/guild_icon.png
        discord: {
          id: tokenObject.guild_info.id,
          owner_id: tokenObject.guild_info.owner_id,
          system_channel_id: tokenObject.guild_info.system_channel_id,
          name: tokenObject.guild_info.name,
        },
      };
      /*const result = await shufflepikCollection.insertOne(shufflepikGuild);*/
      const result = await Connection.db
        .collection(ShufflepikCollection.Guilds)
        .insertOne(shufflepikGuild);
      return Response.Success;
    }
  } catch (err) {
    console.log(err);
    return false;
    //throw err;
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
    if (code) {
      const data = {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.API_PATH}/discord/install`,
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
      const tokenData = await tempUserTokenData.json();
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
    if (code) {
      const data = {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.API_PATH}/discord/xchange-info`,
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

      const tokenData = await tempUserTokenData.json();

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
}

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

    const tokenData = await tempUserTokenData.json();

    //If refresh token exists in token data then token data is ok. However if not return false;
    if (tokenData.refresh_token) {
      const tokenObject = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        refresh_token: tokenData.refresh_token,
      };

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
  try {
    //Get our user information saved locally
    // let userToIntegrate = await storage.valuesWithKeyMatch(req.data);
    const userIdentifer = req.data;
    let userToIntegrate = localStorage.getItem(userIdentifer);

    //Local storage (node-persist) returns a single object array, we're simply referencing the object here.
    userToIntegrate = JSON.parse(userToIntegrate); //userToIntegrate[0];
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
      //localStorage.removeItem(req.data);
      //return user;
      return {
        uIdentifer: userIdentifer,
        user: user,
      };
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

    //Create decipheriv
    const decipher = crypto.createDecipheriv(
      algo,
      key,
      Buffer.from(user.discord.token.iv, "hex")
    );

    //decrypt refresh_token
    let decrypted = decipher.update(
      Buffer.from(user.discord.token.encrypted_data, "hex"),
      "hex",
      "utf-8"
    );
    //finish our decryption
    decrypted += decipher.final("utf8");

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
                //dayjs(
                date_uploaded: shufflepikGuilds[ii].image_pool[j].date_uploaded,
                //).format("MM/DD/YYYY h:mma"),
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
async function tempUserStore(req) {
  try {
    //Initialize local storage
    //await initLocalStorage();
    //Check for code before doing anything
    if (req.code) {
      const userToken = await getUserToken(req.code);
      const user = await getDiscordUser(userToken);
      const userGuilds = await getUserGuilds(userToken);
      const discordAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      const userData = {
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
      await Connection.db.collection(ShufflepikCollection.Scratch).insertOne({
        uId: userIdentifier,
        uData: userData,
      });
      /* const stringifiedUserData = JSON.stringify(userData);
      console.log(`UIder- ${userIdentifier}`);
      console.log(typeof userIdentifier);
      console.log(stringifiedUserData);*/
      //localStorage.setItem(userIdentifier, stringifiedUserData);
      //await saveInLocalStorage(userIdentifier, stringifiedUserData);
      //console.log(localStorage.getItem(userIdentifier));

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
    //await initLocalStorage();
    //Get user token
    const userToken = await getUserToken(code);
    const user = await getDiscordUser(userToken);
    const userGuilds = await getUserGuilds(userToken);
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
    const userIdentifier = `${userData.discord.discriminator.toString()}${crypto
      .randomBytes(16)
      .toString("hex")}`;
    const stringifiedUserData = JSON.stringify(userData);
    await saveInLocalStorage(userIdentifier, stringifiedUserData);
    const guild = await Connection.db
      .collection(ShufflepikCollection.Scratch)
      .findOne({
        guild_id: guildInfo.id,
      });
    //Set the user's Discord ID as their identifier for lcal
    // await storage.setItem(userData.discord.id, userData);
    // localStorage.setItem(userIdentifier, JSON.stringify(userData));
    return userIdentifer;
  } catch (err) {
    console.log(err);

    throw err;
  }
}

/**
 *
 * @param {string} uId - Unique id entry for data.
 * @param {object} data - Discord user data.
 * @returns
 */
async function saveInLocalStorage(uId, data) {
  try {
    localStorage.setItem(uId, data);
    return;
  } catch {
    console.log(err);
    throw err;
  }
}

/**
 * If a user does not have a token, refresh token, or their refresh token has expired, the user
 * will be redirected to Discord for access to a new refresh token.
 */
async function redirectToRetainToken() {
  try {
    fetch(
      "https://discord.com/api/oauth2/authorize?client_id=825496326107430982&redirect_uri=https%3A%2F%2F7497f7c152d8.ngrok.io%2Fdiscord%2Fx-user-info&response_type=code&scope=identify%20email%20connections%20guilds"
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
}
