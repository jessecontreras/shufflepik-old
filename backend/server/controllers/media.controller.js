//Local dependencies
const { Connection } = require("../helpers/mongoConnection.helper");
const { ObjectId } = require("bson");
// Controller dependencies
const util = require("util");
const multer = require("multer");
const path = require("path");
const fse = require("fs-extra");
let dayjs = require("dayjs");

const sharp = require("sharp");

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
//Helper modules
const token_helper = require("../helpers/token.helper");
//Create controller object
let controller = {};

//Controller (object) functions
controller.uploadImage = uploadImage;
controller.deleteImage = deleteImage;
controller.shufflepik = shufflepik;
controller.deleteUserAccountImages = deleteUserAccountImages;

/**
 * Uploads image to database and filesystem.
 *
 * @param {*} req payload object with image data.
 * @param {*} res standard express response object
 * @returns image URL
 */
async function uploadImage(req, res) {
  try {
    const multerUpload = util.promisify(upload.single("image"));
    const payloadBodyAndImageBuffer = await multerUpload(req, res);
    //If the image is above the maximum file size respond.

    //The image URL reference
    const uploadReferences = await moveImageToGuildDir(req);
    if (uploadReferences) {
      //This will return our updated image_pools for guild(s) that uploaded an image

      const updatedImagePools = await storeUploadInfoToDB(
        JSON.parse(JSON.stringify(req.body)),
        uploadReferences
      );
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

        updatedImageObjects.push(matchingImage);
      }
      let dataToSendToClient;
      const areTokensNeeded = res.locals.refreshToken ? true : false;
      //TODO: IF there is an issue or error this is where you should look!!!
      dataToSendToClient = updatedImageObjects;
      if (areTokensNeeded) {
        await token_helper.setTokenCookie(res, res.locals.refreshToken);
        //jwtToken = res.locals.jwt;
        dataToSendToClient = {
          jwt: res.locals.jwt,
          updatedImages: updatedImageObjects,
        };
      }
      res.json(dataToSendToClient);
      //THIS IS HOW I HAD IT BEFORE TO
      /*res.json({
        jwt: jwtToken,
        updatedImages: updatedImageObjects,
      });*/
      //return updatedImageObjects;
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

function computeQuality(size) {
  if (size < maxFileSize && size > maxFileSize / 2) {
    return 45;
  }
  if (size <= maxFileSize / 2 && size > maxFileSize / 4) {
    return 50;
  }
  if (size <= maxFileSize / 4 && size > maxFileSize / 10) {
    return 60;
  }
  return 65;
}

/**
 *
 * @param { object } imageData - image data object. Contains
 * @returns
 */
async function deleteImage(imageData) {
  try {
    //The discord id is in the image_URL, it's the digits between slashes (the number before the final slash and name of image);
    //Since our image_URL is structured 'uploads/discordID/imageName, we will simply extact the discord id from this string.
    imageData.discord_id = imageData.image_url.split("/")[2];
    //Current (relative) location of file to be moved
    const currentLoc = `.${imageData.image_url}`;
    //The subdirectory of 'delete-media' directory to store deleted image.
    const subDir = imageData.image_url.split("/")[2];
    //Filename of file to move from live directory to 'delete-media' directory.
    const fileName = imageData.image_url.split("/")[3];
    //File to be moved, final directory destination included.
    const deletedFileLoc = `./deleted-media/${subDir}/${fileName}`;
    //Ensure directory exists
    await fse.ensureDir(`./deleted-media/${subDir}`);
    //move file from live directory to non-live directory
    await fse.move(currentLoc, deletedFileLoc, { overwrite: true });
    //Remove image from database
    let deletedImage = await db_controller.deleteImage(imageData);

    //Append an updateImage property to notify front-end that this image must be dleted from album
    imageData.update_album_delete = true;

    return imageData;
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
    let guilds = [];
    for (let [key, value] of Object.entries(payload)) {
      if (key.includes("guild")) {
        guilds.push(value);
      }
    }

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
    const payloadObj = JSON.parse(JSON.stringify(payload.body));
    const guilds = await extractGuildsAndReturnArray(payloadObj);

    const qualityOfImage = computeQuality(payload.file.size);
    let fileName = payload.file.filename
      ? payload.file.filename
      : payload.file.originalname;
    fileName = fileName.replace(/\s/g, "");

    const uploadDestinations = [];
    for (const guild of guilds) {
      const dir = path.join("./uploads", guild);
      const file = path.join(dir, `${Date.now()}${fileName}`);
      uploadDestinations.push(file);
      await fse.ensureFile(file);
      await sharp(payload.file.buffer)
        .jpeg({
          quality: qualityOfImage,
          force: false,
        })
        .toFile(file);
    }

    return uploadDestinations;
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
    if (imageLocationReferences.length <= 0) return;

    //TODO: FIX IMAGE REFERENCES THERE ARE TOO MANY OF THEM...
    for (i = 0; i < imageLocationReferences.length; i++) {
   
      let currentUrl = imageLocationReferences[i].image_url;


      //Current (relative) location of file to be moved
      const currentLoc = `.${currentUrl}`;
      //The subdirectory of 'delete-media' directory to store deleted image.
      const subDir = currentUrl.split("/")[2];
      //Filename of file to move from live directory to 'delete-media' directory.
      const fileName = currentUrl.split("/")[3];
      //File to be moved, final directory destination included.
      //MOD:Changing from `./deleted-media/${subDir}/${fileName}`; --> `../deleted-media/${subDir}/${fileName}`;
      //const deletedDirLoc = `../deleted-media/${subDir}`;
      //const deletedDirLoc = `./deleted-media/${subDir}`;
      //const deletedFileLoc = `${deletedDirLoc}/${fileName}`;
      //File to be moved, final directory destination included.
      const deletedFileLoc = `./deleted-media/${subDir}/${fileName}`;
      //Ensure directory exists
      await fse.ensureDir(`./deleted-media/${subDir}`);
      //move file from live directory to non-live directory
      await fse.move(currentLoc, deletedFileLoc);
      //await fse.move(currentLoc, deletedFileLoc, { overwrite: true });
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
  try {
    //Look into making this a for loop for the same of async///----~~!!!!!!
    const imagePoolsToReturn = [];
    // await uploadDestinations.forEach(async (filePath) => {
    //Breaks string into array, with elements delimited by backslashes. Our Guild ID is the second element in the array.
    for (let i = 0; i < uploadDestinations.length; i++) {
      const relativeFilePath = uploadDestinations[i];

      //Remove the first chracter of string (the leading dot) and return rest of string.
      const filePath = relativeFilePath.substring(1).replace(/\s/g, "");

      const guildId = filePath.split("/")[2];

      const updatedDoc = await Connection.db
        .collection(ShufflepikCollection.Guilds)
        .findOneAndUpdate(
          {
            "discord.id": guildId,
          },
          {
            $push: {
              image_pool: {
                _id: new ObjectId(),
                date_uploaded: dayjs().format(),
                uploaded_by_discord_username: data.uploaded_by_discord_username,
                uploaded_by_discord_id: data.uploaded_by_discord_id,
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

      const updatedImagePool = updatedDoc.value.image_pool;
      imagePoolsToReturn.push(updatedImagePool);
    }

    return imagePoolsToReturn;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Selects a random image from a Guild's image pool.
 * @param {string} discordGuildId - The Discord Guild Id where image will come from.
 * @returns {object} randomImage - Random image object.
 */

async function shufflepik(discordGuildId) {
  try {
    let shufflepikQuery = await Connection.db
      .collection(ShufflepikCollection.Guilds)
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
            //_id: 0,
            imageData: "$image_pool",
          },
        },
      ]);
    for await (const doc of shufflepikQuery) {
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
    for (let i = 0; i < imagePool.length; i++) {
      if (imagePool[i].image_url === filePath) {
        const imageToReturn = {
          _id: imagePool[i]._id,
          image_title: imagePool[i].image_title,
          image_url: imagePool[i].image_url,
          date_uploaded:
            imagePool[i]
              .date_uploaded /*dayjs(imagePool[i].date_uploaded).format(
            "MM/DD/YYYY h:mma"
          )*/,
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

//----- Set up Multer -----/

//Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //cb(null, "uploads");
    cb(null, `${path.join(__dirname, "../tmp")}`);
  },
  filename: (req, file, cb) => {
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
