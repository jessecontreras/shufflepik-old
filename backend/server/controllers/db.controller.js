//Local dependencies
const { Connection } = require("../helpers/mongoConnection.helper");
const { ObjectId } = require("bson");
//Third party dependencies
let dayjs = require("dayjs");
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedUsers: "DELETED_USERS",
  DeletedContent: "DELETED_CONTENT",
};

//*****                                                         *****//
//*****                                                         *****//
//*****                                                         *****//
//*****    The following are query based database functions.    *****//
//*****                                                         *****//
//*****                                                         *****//
//*****                                                         *****//

/**
 * Using fresh Discord user data, update user on database.
 *
 * @param {string} collection The USERS collection.
 * @param {object} user An object with a user's encrypted discord refresh token, their SP id, and their guilds.  {id: string, token: {}, guilds: []}
 * @returns updated user in the collection.
 */
async function updateUserOnLogin(collection, user) {
  try {
    const updatedUser = await Connection.db
      .collection(ShufflepikCollection.Users)
      .findOneAndUpdate(
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
    const intersectingGuilds = await Connection.db
      .collection(ShufflepikCollection.Users)
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
 * Gets a shufflepike user.
 *
 * Uses Discord user ID to get corresponding shufflepik user.
 *
 * @param {string} discordId Discord user ID
 * @returns
 */
async function getSPUser(discordId) {
  try {
    return shufflepikUser;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getAllUsers() {
  try {
    const allUsers = await Connection.db
      .collection(ShufflepikCollection.Users)
      .find({})
      .toArray();

    return allUsers;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Updates a Shufflepik user's information.
 *
 * Matches a Shufflepik user by ID and updates discord information in Database.
 *
 * Returns updated user.
 *
 * @param {string} shufflepikUserID A user's Shufflepik ID.
 * @param {object} user User object containing metadata of user to update.
 * @returns updated user as an object.
 */
async function updateUserById(shufflepikUserID, user) {
  try {
    console.log("Update user by id");
    console.log(await Connection.db);
    const updatedUser = await Connection.db
      .collection(ShufflepikCollection.Users)
      .findOneAndUpdate(
        {
          _id: ObjectId(shufflepikUserID),
        },
        {
          $set: {
            refresh_token: user.refreshToken,
            discord: {
              connected: true,
              avatar: user.discord.avatar,
              token: user.discord.token,
              guilds: user.discord.guilds,
              username: user.discord.username,
              id: user.discord.id,
              discriminator: user.discord.discriminator,
            },
          },
        },
        {
          upsert: true,
          //returnOriginal: false,
          returnDocument: "after",
        }
      );
    console.log("Results of update by id :");
    console.log(updatedUser);
    //Actual results of query are in 'value' object of results so return that.
    return updatedUser.value;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Finds user by email.
 *
 * @param {*} req
 * @param {*} res
 * @returns user, by their email.
 */
async function getUserByEmail(email) {
  try {
    const user = await Connection.db
      .collection(ShufflepikCollection.Users)
      .findOne({
        email: email,
      });
    if (user === null) return false;

    return user;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getAllGuilds() {
  try {
    const allGuilds = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .find({})
      .toArray();

    return allGuilds;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Deletes an image from the database.
 *
 * @param {object} imageData Image data object containing at least the corresponding discord id and image id of the image to be deleted.
 * @returns returnObj - an object containing an album id and an image id. This will be used to remove the image using rxjs ion the front-end.
 */
async function deleteImage(imageData) {
  try {
    const discordId = imageData.image_url.split("/")[2];
    let deletedImageGuildData = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .findOneAndUpdate(
        {
          "discord.id": discordId,
        },
        {
          $pull: {
            image_pool: {
              _id: ObjectId(imageData.image_id),
            },
          },
        },
        { returnDocument: "before" }
      );

    //ensure the value is represented in variable
    const guildData = deletedImageGuildData.value;
    const deletedContentObj = {
      _id: guildData._id,
      discord: guildData.discord,
      install_date: guildData.install_date,
      preferred_locale: guildData.preferred_locale,
      nsfw: guildData.nsfw,
      installed_by_id: guildData.installed_by_id,
      installed_by_username: guildData.installed_by_username,
      bot_uninstalled_from_guild: false,
    };

    //Get information about image to be deleted from database
    async function findImage() {
      try {
        let obj = {};
        for (let i = 0; i < guildData.image_pool.length; i++) {
          if (String(guildData.image_pool[i]._id) === imageData.image_id) {
            obj = guildData.image_pool[i];
            obj.date_deleted = dayjs().format();
            return obj;
          }
        }
      } catch (err) {
        console.log(err);
        throw err;
      }
    }
    const imageToDelete = await findImage();

    const deletedContentResult = await Connection.db
      .collection(ShufflepikCollection.DeletedContent)
      .updateOne(
        {
          "discord.id": discordId,
        },
        {
          $set: deletedContentObj,
          $push: { image_pool: imageToDelete },
        },
        {
          upsert: true,
        }
      );

    const returnObj = {
      album_id: discordId,
      image_id: imageData.image_id,
    };

    return returnObj;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

let controller = {};
controller.getGuildIntersect = getGuildIntersect;
controller.getAllUsers = getAllUsers;
controller.getAllGuilds = getAllGuilds;
controller.getUserByEmail = getUserByEmail;
controller.updateUserById = updateUserById;
controller.updateUserOnLogin = updateUserOnLogin;
controller.deleteImage = deleteImage;

module.exports = controller;
