//Mongo client
const MongoClient = require("mongodb").MongoClient;

const { ObjectID } = require("bson");

const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedContent: "DELETED_CONTENT",
};

let controller = {};
controller.instantiateMongoClient = instantiateMongoClient;
controller.getGuildIntersect = getGuildIntersect;
controller.getAllGuilds = getAllGuilds;
controller.getAllUsers = getAllUsers;
controller.getUserByEmail = getUserByEmail;
controller.updateUserByID = updateUserByID;
controller.updateUserOnLogin = updateUserOnLogin;
controller.deleteImage = deleteImage;

module.exports = controller;

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
    await collection.findOneAndUpdate(
      {
        _id: ObjectID(user.id),
      },
      {
        $inc: { "login.number_of_logins": 1 },
      },
      {
        $set: {
          discord: {
            token: user.token,
            guilds: user.guilds,
            avatar: user.avatar,
            connected: user.connected,
          },
        },
      },
      {
        $push: {
          "login.dates": { $each: [new Date(Date.now()).toISOString()] },
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

async function getAllGuilds() {
  try {
    const client = await instantiateMongoClient();
    await client.connect();

    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);

    const allGuilds = await collection.find({}).toArray();



    return allGuilds;
  } catch (err) {
    console.log(err);
    throw errl;
  }
}

async function getAllUsers() {
  try {
    const client = await instantiateMongoClient();
    await client.connect();

    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);

    const allUsers = await collection.find({}).toArray();

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
async function updateUserByID(shufflepikUserID, user) {
  try {
    //Instantiate mongo client;
    const client = await instantiateMongoClient();
    //Connect MongoClient
    await client.connect();
    //Define collection as users collection
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    //Update the user in database
    const updatedUser = await collection.findOneAndUpdate(
      {
        _id: ObjectID(shufflepikUserID),
      },
      {
        $set: {
          discord: {
            connected: true,
            token: user.discord.token,
            guilds: user.discord.guilds,
            id: user.discord.id,
            discriminator: user.discord.discriminator,
          },
        },
      },
      {
        upsert: true,
        returnOriginal: false,
        returnDocument: "after",
      }
    );
    //Actual results of query are in 'value' object of results so return that.
    return updatedUser.value;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Using latest Discord user data, update user on database.
 *
 * @param {string} collection The USERS collection.
 * @param {object} user an object containing the user id (id), user guilds (guilds) user refresh token (refresh_token).
 * @returns updated user in the collection.
 */
async function updateUserOnLogin(collection, user) {
  try {
    const updatedUser = await collection.findOneAndUpdate(
      {
        _id: ObjectID(user.id),
      },
      {
        $set: {
          "discord.token": user.token,
          "discord.guilds": user.guilds,
        },
      }
    );

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
    const client = await instantiateMongoClient();
    await client.connect();
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const user = collection.findOne({
      email: email,
    });
    return user;
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
    //Instantiate mongo client;
    const client = await instantiateMongoClient();
    //Connect MongoClient
    await client.connect();
    //Define collection as users collection
    const guildsCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);

    /*await guildsCollection.updateOne(
      {
        "discord.id": imageData.discord_id,
      },
      {
        $pull: {
          image_pool: {
            _id: ObjectID(imageData.image_id),
          },
        },
      }
    );*/
    let updatedDoc = await guildsCollection.findOneAndUpdate(
      {
        "discord.id": imageData.discord_id,
      },
      {
        $pull: {
          image_pool: {
            _id: ObjectID(imageData.image_id),
          },
        },
      },
      {
        returnDocument: false,
      }
    );

    updatedDoc = updatedDoc.value;
  

    const returnObj = {
      album_id: imageData.discord_id,
      image_id: imageData.image_id,
    };

    const deletedContentCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.DeletedContent);

    //await deletedContentCollection.updateOne({});

    return returnObj;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
