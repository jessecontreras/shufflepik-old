//Controller dependencies
const util = require("util");
const multer = require("multer");
const path = require("path");
const fse = require("fs-extra");
let dayjs = require("dayjs");

const sharp = require("sharp");

//Mongo instance
const MongoDb = require("MongoDb");
//Mongo client
const MongoClient = MongoDb.MongoClient;
//Mongo object Id
//const ObjectID = MongoDb.ObjectID;
//Guilds Collection reference
const ShufflepikCollection = {
  Users: "USERS",
  Guilds: "GUILDS",
  DeletedUsers: "DELETED_USERS",
  DeletedContent: "DELETED_CONTENT",
};
//Responses enum
const ErrorResponses = {
  FileSizeMax: "File uploads must be less than 10MB in size",
};
//Maximum size for an image file
const maxFileSize = 10000000; //10 MBs

//Import db controller for all db functions
const db_controller = require("./db.controller");
const { result } = require("lodash");

//Create controller object
let controller = {};

//Controller (object) functions
controller.uploadImage = uploadImage;
controller.getUserAlbums = getUserAlbums;
controller.deleteImage = deleteImage;
controller.shufflepik = shufflepik;
controller.deleteUserAccountImages = deleteUserAccountImages;
controller.checkUserCredentials = checkUserCredentials;

/**
 * Uploads image to database and filesystem.
 *
 * @param {*} req payload object with image data.
 * @param {*} res standard express response object
 * @returns image URL
 */
async function uploadImage(req, res) {
  try {
    console.log("Made it to upload image on the backend in the controller");
    const multerUpload = util.promisify(upload.single("image"));
    const payloadBodyAndImageBuffer = await multerUpload(req, res);
    console.log("All done uploading the image, req is:");
    console.log(req);
    console.log("All done uploading the image, req body is:");
    console.log(req.body);
    console.log("What's the multer buffer say?");
    // console.log(req.file.buffer);
    console.log(payloadBodyAndImageBuffer);
    console.log("Req.file is:");
    console.log(req.file);
    //If the image is above the maximum file size respond.

    //The image URL reference
    const uploadReferences = await moveImageToGuildDir(req);
    if (uploadReferences) {
      console.log("Upload placed is :");
      console.log(uploadReferences);
      //Remove upload from temporary file
      //Insert upload information into guilds collection
      //This will return our updated image_pools for the
      //relevant guilds
      const updatedImagePools = await storeUploadInfoToDB(
        JSON.parse(JSON.stringify(req.body)),
        uploadReferences
      );
      console.log("Updated image pools are:");
      console.log(updatedImagePools);
      //An array of image objects to be sent to front end, does not have every propertty of an image, just the necessary (meta)data for display.
      const updatedImageObjects = [];
      //For every upload reference, return an image object by
      //checking the upload reference against its corresponding image pool entry
      //And have our matchImageByUrl function return an object (per upload ref)
      //With relevant information to send to front-end
      for (let i = 0; i < uploadReferences.length; i++) {
        const matchingImage = await matchImageByImageUrl(
          //remove leading period from upload reference so that it matches the path signature of updatedImagePools
          uploadReferences[i].substring(1).replace(/\s/g, ""),
          updatedImagePools[i]
        );
        console.log("Matching object is:");
        console.log(matchingImage);
        updatedImageObjects.push(matchingImage);
      }
      console.log("updatedImageObjects are:");
      console.log(updatedImageObjects);
      //Send image data to front-end.

      //THIS IS HOW I HAD IT BEFORE
      res.json({
        updatedImages: updatedImageObjects,
      });
      return updatedImageObjects;
    } else {
      return res.json({
        errorResponse:
          "There was an error uploading your image, make sure it is an approved format and under 10mb in size",
      });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function checkUserCredentials(req, res, next) {
  try {
    console.log("Made it to checkUserCreds");
    console.log(req.user.sub);
    //Instantiate mongo client;
    const client = await db_controller.instantiateMongoClient();
    //Connect MongoClient
    await client.connect();
    //Define collection as users collection
    const usersCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Users);
    const userData = await usersCollection.findOne({
      _id: MongoDb.ObjectId(req.user.sub),
    });
    console.log("DB returned:");
    console.log(userData);
    console.log("Is discord connected?");
    console.log(userData.discord.connected);
    if (userData.email_validation.validated && userData.discord.connected) {
      next();
    } else {
      console.log("Did not actually upload this ish");
      return res.json({
        errorResponse:
          "🚫 Your Discord must be connected and your email must be validated before uploading images 🚫",
      });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * File size checker, ensures files are lower than max file size, returns false if not.
 *
 * @param {file} file - More than likely an image file.
 * @returns a boolean answering the question: 'is file too large?'.
 */
async function isFileTooLarge(file) {
  try {
    const fileTooBig = file.size > maxFileSize ? true : false;
    return fileTooBig;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 *
 * @param { object } imageData - image data object. Contains
 * @returns
 */
async function deleteImage(imageData) {
  try {
    console.log("Made it to delete image controller, image data is:");
    console.log(imageData);
    //The discord id is in the image_URL, it's the digits between slashes (the number before the final slash and name of image);
    //Since our image_URL is structured 'uploads/discordID/imageName, we will simply extact the discord id from this string.
    imageData.discord_id = imageData.image_url.split("/")[2];
    //Current (relative) location of file to be moved
    const currentLoc = `.${imageData.image_url}`;
    console.log(`Current Loc is\n ${currentLoc}`);
    //The subdirectory of 'delete-media' directory to store deleted image.
    const subDir = imageData.image_url.split("/")[2];
    //console.log(subDir);
    //Filename of file to move from live directory to 'delete-media' directory.
    const fileName = imageData.image_url.split("/")[3];
    console.log(fileName);
    //File to be moved, final directory destination included.
    const deletedFileLoc = `./deleted-media/${subDir}/${fileName}`;
    console.log(`Deleted Loc is\n ${deletedFileLoc}`);
    //Ensure directory exists
    await fse.ensureDir(`./deleted-media/${subDir}`);
    //move file from live directory to non-live directory
    await fse.move(currentLoc, deletedFileLoc, { overwrite: true });
    //The discord id is in the image_URL, it's the digits between slashes (the number before the final slash and name of image);
    //Since our image_URL is structured 'uploads/discordID/imageName, we will simply extact the discord id from this string.
    //imageData.discord_id = subDir; //imageData.image_url.split("/")[2];
    //Remove image from database
    let deletedImage = await db_controller.deleteImage(imageData);
    console.log("Deleted image is:");
    console.log(deletedImage);
    //Remove image from file system
    //await fse.remove(relativeUrl);

    //Append an updateImage property to notify front-end that this image must be dleted from album
    imageData.update_album_delete = true;

    return imageData;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function normalizeUploadData(data, uploadDestinations) {
  try {
    uploadDestinations.forEach((filePath) => {});
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Extract user guild data from http payload and places their id value into an array.
 * @param {object} payload - Client http payload.
 * @returns  An array of Guild IDs.
 */
async function extractGuildsAndReturnArray(payload) {
  try {
    console.log("Inside of extract guild info");
    console.log(payload);
    let guilds = [];
    for (let [key, value] of Object.entries(payload)) {
      if (key.includes("guild")) {
        guilds.push(value);
      }
    }
    console.log("Guilds should be");
    console.log(guilds);
    return guilds;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
/**
 *
 * Moves images from temporary directory to respective guild directory (directories).
 *
 * @param {object} payload - User HTTP payload
 * @returns an arrray containing the image destination(s) (image url).
 */
async function moveImageToGuildDir(payload) {
  try {
    //Un-[Object: null prototype]-ify payload paramater.
    const payloadObj = JSON.parse(JSON.stringify(payload.body));
    //Guilds array
    const guilds = await extractGuildsAndReturnArray(payloadObj);
    //Location of temporary upload.
    const src = payload.file.path;

    //Store permanent source location(s) for image references.
    let uploadDestinations = [];
    //If more than one guild selected iterate through guilds and place uploads accordingly, otherwise place upload in the single guild selected.
    if (guilds.length > 1) {
      //For every guild selected by user, place upload in respective directory.
      for (let i = 0; i < guilds.length; i++) {
        console.log("Inside of guilds for each");
        console.log(guilds);
        //If payload's file.filename property is present that will be th filename otherwise it will be file.originalname
        const fileName = payload.file.filename
          ? payload.file.filename
          : payload.file.originalname;
        //Destination folder for this specific guild
        const dir = `./uploads/${guilds[i]}`;
        //Destination folder with file included.
        const file = `${dir}/${Date.now()}${fileName}`;
        //Store destination location in uploadDestinations array
        uploadDestinations.push(file);
        //Ensure directory exists, if not create it.

        const ensureFile = await fse.ensureFile(file);
        let qualityOfImage;
        if (
          payload.file.size < maxFileSize &&
          payload.file.size > maxFileSize / 2
        ) {
          qualityOfImage = 45;
        } else if (
          payload.file.size <= maxFileSize / 2 &&
          payload.file.size > maxFileSize / 4
        ) {
          qualityOfImage = 50;
        } else if (
          payload.file.size <= maxFileSize / 4 &&
          payload.file.size > maxFileSize / 10
        ) {
          qualityOfImage = 60;
        } else {
          qualityOfImage = 65;
        }
        //Copy image from source location to destination location
        // const copyFinished = fse.copySync(src, dest);
        //Copy image to respective directory/location
        //With 'force' set to false, sharp should respect input extension instead of converting to jpeg.
        console.log("Image rn is:");
        console.log(payload.file);
        const image = await sharp(payload.file.buffer)
          .jpeg({
            quality: qualityOfImage,
            force: false,
          })
          .toFile(file);
        console.log("Image later is:");
        console.log(image);
      }
    } else {
      console.log("Inside of guild");
      //If payload's file.filename property is present that will be th filename otherwise it will be file.originalname
      const fileName = payload.file.filename
        ? payload.file.filename
        : payload.file.originalname;
      //Destination folder for this specific guild
      const dir = `./uploads/${guilds[0]}`;
      //Destination folder with file included.
      let file = `${dir}/${Date.now()}${fileName}`;
      //Remove whitespace from file name
      file = file.replace(/\s/g, "");
      //Store destination location in uploadDestinations array
      uploadDestinations.push(file);
      //Ensure directory exists, if not create it.
      console.log("The");
      const ensureFile = await fse.ensureFile(file);
      console.log("The after");

      //With 'force' set to false, sharp should respect input extension instead of converting to jpeg.
      const image = await sharp(payload.file.buffer)
        .jpeg({
          quality: 65,
          force: false,
        })
        .toFile(file);
      console.log("Image is:");
      console.log(image);
    }
    //strip
    console.log("Is this synchronous?");
    return uploadDestinations;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Moves a user's account images from live directory (directories) to "deleted" directory.
 * @param {Array} imageLocationReferences Array of image urls
 * @returns {Promise}
 */
async function deleteUserAccountImages(imageLocationReferences) {
  try {
    console.log("Made it to delete user account images");
    for (i = 0; i < imageLocationReferences.length; i++) {
      let currentUrl = imageLocationReferences[i].image_url;
      //Current (relative) location of file to be moved
      const currentLoc = `.${currentUrl}`;
      console.log(currentLoc);
      //The subdirectory of 'delete-media' directory to store deleted image.
      const subDir = currentUrl.split("/")[2];
      console.log(subDir);
      //Filename of file to move from live directory to 'delete-media' directory.
      const fileName = currentUrl.split("/")[3];
      console.log(fileName);
      //File to be moved, final directory destination included.
      const deletedFileLoc = `./deleted-media/${subDir}/${fileName}`;
      //Ensure directory exists
      await fse.ensureDir(`./deleted-media/${subDir}`);
      //move file from live directory to non-live directory
      await fse.move(currentLoc, deletedFileLoc, { overwrite: true });
      console.log("Should be done with fse move");
    }
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 *
 * @param {*} data
 * @param {*} uploadDestinations
 * @returns
 */
async function storeUploadInfoToDB(data, uploadDestinations) {
  console.log("Made it to store upload info");
  console.log("Data is:");
  console.log(data);
  //Instantiate Mongo client
  const client = await db_controller.instantiateMongoClient();
  try {
    //Connect Mongo client
    await client.connect();
    //Sufflepik guilds collection
    const collection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);
    //Look into making this a for loop for the same of async///----~~!!!!!!
    const imagePoolsToReturn = [];
    // await uploadDestinations.forEach(async (filePath) => {
    //Breaks string into array, with elements delimited by backslashes. Our Guild ID is the second element in the array.
    for (let i = 0; i < uploadDestinations.length; i++) {
      const relativeFilePath = uploadDestinations[i];
      console.log("Relative path");
      console.log(relativeFilePath);
      //Remove the first chracter of string (the leading dot) and return rest of string.
      const filePath = relativeFilePath.substring(1).replace(/\s/g, "");
      console.log("Filepath");
      console.log(filePath);
      const guildId = filePath.split("/")[2];
      console.log("Guild id:");
      console.log(guildId);
      const updatedDoc = await collection.findOneAndUpdate(
        {
          "discord.id": guildId,
        },
        {
          $push: {
            image_pool: {
              // _id: new ObjectID(),
              _id: new MongoDb.ObjectId(),
              date_uploaded: dayjs().format(),
              uploaded_by_discord_username: data.uploaded_by_discord_username,
              uploaded_by_id: data.uploaded_by_id,
              image_title: data.image_title,
              image_url: filePath,
              likes: null,
              flags: 0,
              nsfw: null,
            },
          },
        },
        {
          upsert: true,
          //returnOriginal: false,
          returnDocument: "after",
        }
      );
      console.log("done with database functions, updated doc is:");
      console.log(updatedDoc.value);
      const updatedImagePool = updatedDoc.value.image_pool;
      imagePoolsToReturn.push(updatedImagePool);
    }

    console.log("out of foreach loop");

    return imagePoolsToReturn;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Selects a random image from a Guild's image pool.
 * @param {string} discordGuildId Discord Guild Id
 * @returns randomImage
 */

async function shufflepik(discordGuildId) {
  try {
    //Instantiate Mongo client
    const client = await db_controller.instantiateMongoClient();
    //Connect Mongo client
    await client.connect();
    //Sufflepik guilds collection
    const guildsCollection = client
      .db(process.env.SHUFFLEPIK_DB)
      .collection(ShufflepikCollection.Guilds);
    let shufflepikQuery = await guildsCollection.aggregate([
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
          //_id: 0,
          imageData: "$image_pool",
        },
      },
    ]);
    //shufflepikQuery = shufflepikQuery[0];
    for await (const doc of shufflepikQuery) {
      console.log(doc);
      shufflepikQuery = doc.imageData;
    }

    const randomImage = {
      discordGuildId: discordGuildId,
      imageId: shufflepikQuery._id,
      dateUploaded: shufflepikQuery.date_uploaded,
      uploadedByUsername: shufflepikQuery.uploaded_by_discord_username,
      uploadedById: shufflepikQuery.uploaded_by_id,
      imageUrl: shufflepikQuery.image_url,
      imageTitle: shufflepikQuery.image_title,
      likes: shufflepikQuery.likes,
      nsfw: shufflepikQuery.nsfw,
      flags: shufflepikQuery.flags,
    };
    return randomImage;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Searches a guilds imagePool for a specific filePath (aka image url). Matches
 * the passed filepath with it's corresponding entry in imagePool and returns
 * imageToReturn object.
 *
 * @param {string} filePath Image url.
 * @param {array} imagePool An array of images belonging to a guild.
 * @returns imageToReturn
 */
async function matchImageByImageUrl(filePath, imagePool) {
  try {
    console.log("Made it to matchImage by whatever");
    for (let i = 0; i < imagePool.length; i++) {
      if (imagePool[i].image_url === filePath) {
        const imageToReturn = {
          _id: imagePool[i]._id,
          image_title: imagePool[i].image_title,
          image_url: imagePool[i].image_url,
          date_uploaded: dayjs(imagePool[i].date_uploaded).format(
            "MM/DD/YYYY h:mma"
          ),
          nsfw: imagePool[i].nsfw,
        };
        return imageToReturn;
      }
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Get's a users Shufflepik active albums.
 *
 * @param {string} _id user's ID for user whose albums are to be returned.
 * @returns A user's server albums.
 */
async function getUserAlbums(_id) {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
}

//----- Set up Multer -----/

//Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //cb(null, "uploads");
    cb(null, `${path.join(__dirname, "../tmp")}`);
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

//Multer file filter
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == "image/jpeg" ||
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//Multer upload
const upload = multer({
  //storage: storage,
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
});
//----- End set up Multer -----/

//export default controller;
module.exports = controller;

/*app.post("/", upload.single("picture"), async (req, res) => {
  fs.access("./uploads", (error) => {
    if (error) {
      fs.mkdirSync("./uploads");
    }
  });
  const {
    buffer,
    originalname
  } = req.file;
  const timestamp = new Date().toISOString();
  const ref = `${timestamp}-${originalname}.webp`;
  await sharp(buffer)
    .webp({
      quality: 20
    })
    .toFile("./uploads/" + ref);
  const link = `http://localhost:3000/${ref}`;
  return res.json({
    link
  });
});*/
