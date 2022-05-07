//Controller object
let controller = {};
//Mongo instance
const MongoDb = require("mongodb");
//dayjs instance
const dayjs = require("dayjs");
//Shufflepik collection names
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
};
//Controller (object) functions
controller.shufflepik = shufflepik;
//Export module controller
module.exports = controller;

/**
 * Selects a random image from a Guild's image pool.
 * @param {string} discordGuildId - Discord Guild Id where image will come from.
 * @param {string} discordUserId - Discord id of user who triggered shufflepik command.
 * @returns {object} randomImage - Random image object.
 */
async function shufflepik(discordGuildId, discordUserId) {
  try {
    //Instantiate Mongo client
    const client = await instantiateMongoClient();
    //Connect Mongo client
    await client.connect();
    //Sufflepik guilds collection
    const guildsCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);

    //Select a random image from guild image_pool
    let shufflepikQuery = await guildsCollection
      .aggregate([
        {
          $match: {
            "discord.id": discordGuildId,
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
      .toArray(); /** SR1 */

    //If the query returns empty, return
    if (shufflepikQuery.length < 1) {
      return false;
    }
    //If the query returns a result then select the first (should be the only) element.
    const imageData = shufflepikQuery[0].imageData;
    //TODO: Can I do both of the queries in this function in one go (query)?
    //log command usage
    await guildsCollection.updateOne(
      { "discord.id": discordGuildId },
      {
        $push: {
          command_usage: {
            command_name: "shufflepik",
            date_triggered: dayjs().format(),
            triggered_by_discord_id: discordUserId,
          },
        },
      }
    );

    const randomImage = {
      discordGuildId: discordGuildId,
      imageId: imageData._id,
      dateUploaded: imageData.date_uploaded,
      uploadedByUsername: imageData.uploaded_by_discord_username,
      uploadedById: imageData.uploaded_by_id,
      imageUrl: imageData.image_url,
      imageTitle: imageData.image_title,
      likes: imageData.likes,
      nsfw: imageData.nsfw,
      flags: imageData.flags,
    };
    return randomImage;
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
    const MongoClient = MongoDb.MongoClient;
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
