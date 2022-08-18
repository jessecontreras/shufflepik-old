//Local dependencies
const { Connection } = require("../../server/helpers/mongoConnection.helper");

//Controller object
let controller = {};
//const db_controller = require("../../server/controllers/db.controller");
const fs = require("fs-extra");
//dayjs instance
const dayjs = require("dayjs");
const { Client, Intents } = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
});
client.once("ready", () => {
  console.log("ready!");
});
client.login(process.env.DISCORD_BOT_TOKEN);
//Shufflepik collection names
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedContent: "DELETED_CONTENT",
};

//Controller (object) functions
controller.shufflepik = shufflepik;
//Export module controller
module.exports = controller;

/**
 * Selects a random image from a Guild's image pool.
 * @param {string} guildId  Discord Guild Id.
 * @param {string} userId  Discord user Id.
 * @param {Map} gMembers Optional guild members in the event the function has recursed. This spares discord client from having to make another call for guild members.
 * @returns {object} Image object.
 */
async function shufflepik(guildId, userId, gMembers = null) {
  try {
    //Get guild users
    let guildMembers = gMembers ? gMembers : await getGuildMembers(guildId);
    //Get random image
    const shufflepikQuery = await getRandomImage(guildId);
    //If the query returns empty, return
    if (shufflepikQuery.length < 1) {
      return false;
    }
    //Check if random image selected belongs to a user that is still a member of guild.
    const member = guildMembers.get(
      shufflepikQuery[0].imageData.uploaded_by_discord_id
    ); /*!guildMembers.has(
      shufflepikQuery[0].imageData.uploaded_by_discord_id
    );*/

    //(Up-to-date) check if user is a current member of guild. Check necessary to root out any recently banned or kicked users.
    //If user is no longer part of server, delete images relative to user and server (pool).
    if (!member) {
      //User's id, their data will be deleted from corresponding guild
      const userToBeDeleted =
        shufflepikQuery[0].imageData.uploaded_by_discord_id;

      //Get url image references.
      const urlReferences = await getImageReferences(userToBeDeleted, guildId);
      //Move content from active collection to inactive collection
      await deleteUserContent(userToBeDeleted, guildId);
      //Delete user images from respectice image pool
      await removeUserImagesFromImagePool(userToBeDeleted, guildId);
      //(Re)move images from active guild
      await deleteUserAccountImages(urlReferences);
      //recurse shufflepik function, include guild members to avoid making another API call to collect members.
      return await shufflepik(guildId, userId, guildMembers);
    } else {
      //If the query returns a result then select the first (should be the only) element.
      const imageData = shufflepikQuery[0].imageData;
      //Log command usage

      await Connection.db.collection(ShufflepikCollection.Guilds).updateOne(
        { "discord.id": guildId },
        {
          $push: {
            command_usage: {
              command_name: "shufflepik",
              date_triggered: dayjs().format(),
              triggered_by_discord_id: userId,
            },
          },
        }
      );

      const randomImage = {
        discordGuildId: guildId,
        imageId: imageData._id,
        dateUploaded: imageData.date_uploaded,
        uploadedByUsername: imageData.uploaded_by_discord_username,
        uploadedById: imageData.uploaded_by_id,
        imageUrl: imageData.image_url,
        imageTitle: imageData.image_title,
        likes: imageData.likes,
        nsfw: imageData.nsfw,
        flags: imageData.flags,
        avatar: member.user.avatar,
      };

      return randomImage;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Returns a map of guild members.
 * @param {string} guildId Discord guild id
 * @returns {Promise<Map>} Discord guild members
 */
async function getGuildMembers(guildId) {
  try {
    const guild = client.guilds.cache.find((gld) => {
      if (gld.id === guildId) return gld;
    });
    const guildMembers = await guild.members.fetch();

    return guildMembers;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Removes a User's images from an image pool.
 * @param {string} userId Discord user id
 * @param {string} guildId Discord guild id
 * @returns {Promise<void>}
 */
async function removeUserImagesFromImagePool(userId, guildId) {
  try {
    await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .updateMany(
        { "discord.id": guildId },
        { $pull: { image_pool: { uploaded_by_discord_id: userId } } }
      );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Returns a single length array containing an image from specified server pool.
 *
 * @param {string} guildId - Discord Guild id
 * @returns {Promise<object[]>} Array containing a single image object
 */
async function getRandomImage(guildId) {
  try {
    console.log("this is connection");
    console.log(Connection);
    let shufflepikQuery = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .aggregate([
        {
          $match: {
            "discord.id": guildId,
          },
        },
        {
          $unwind: "$image_pool",
        },
        {
          $sample: { size: 1 },
        },
        {
          $project: {
            _id: 0,
            imageData: "$image_pool",
          },
        },
      ])
      .toArray();

    return shufflepikQuery;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Moves a user's account images from live directory (directories) to "deleted" directory.
 * @param {Array} imageLocationReferences Array of image urls
 * @returns {Promise<void>}
 */
async function deleteUserAccountImages(imageLocationReferences) {
  try {
    for (i = 0; i < imageLocationReferences.length; i++) {
      //This refers to path saved in db which references /server directory refrence looks like --> /uploads/guildId/filename
      let currentUrl = imageLocationReferences[i].image_url;
      //Since all media (paths) are based in the server directory we need to go up a directories
      const serverDir = `../server`;
      //Current (relative) location of file to be moved
      const currentLoc = `${serverDir}${currentUrl}`;
      //The subdirectory of 'delete-media' directory to store deleted image.
      const subDir = currentUrl.split("/")[2];
      //Filename of file to move from live directory to 'delete-media' directory.
      const fileName = currentUrl.split("/")[3];
      //File to be moved, final directory destination included.
      //MOD:Changing from `./deleted-media/${subDir}/${fileName}`; --> `../deleted-media/${subDir}/${fileName}`;
      const deletedDirLoc = `../server/deleted-media/${subDir}`;
      const deletedFileLoc = `${deletedDirLoc}/${fileName}`;
      //Ensure directory exists
      await fs.ensureDir(deletedDirLoc);
      //move file from live directory to non-live directory
      await fs.move(currentLoc, deletedFileLoc);
      //await fs.move(currentLoc, deletedFileLoc, { overwrite: true });
    }
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Returns a user's image url references for a specific guild.
 * @param {Object} userId Discord user id
 * @param {string} guildId Discord guild id
 * @returns {Promise<string[]>} Array of url location references
 */
async function getImageReferences(userId, guildId) {
  try {
    const urlReferences = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .aggregate([
        {
          $match: { "discord.id": guildId },
        },
        { $unwind: { path: "$image_pool" } },
        { $replaceRoot: { newRoot: "$image_pool" } },
        { $match: { uploaded_by_discord_id: userId } }, //.toString() } },
        {
          $project: { _id: 0, image_url: 1 },
        },
      ])
      .toArray();

    return urlReferences;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Moves user's content from active server pool(s) to DELETED_CONTENT collection.
 * @param {string} userId Discord user id.
 * @param {string} guildId Discord guild id.
 * @returns {Promise<void>}
 */
async function deleteUserContent(userId, guildId) {
  try {
    const moveToDeletedContent = await Connection.db
      .collection(ShufflepikCollection.Guilds)
      .aggregate([
        {
          $match: { "discord.id": guildId },
        },
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
                  $eq: ["$$image.uploaded_by_discord_id", userId],
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
                  uploaded_by_discord_id: "$$image.uploaded_by_discord_id",
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
          $merge: "DELETED_CONTENT",
        },
      ])
      .toArray();

    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/*****  SRs  *****/

/** SR1 */
/**
 * returns an object in an array -
 * [
 *   {
 *      imageData:{
 *        _id:     ,
 *        date_uploaded:    ,
 *        uploaded_by_discord_username:    ,
 *        ....
 *      }
 *   }
 * ]
 */
