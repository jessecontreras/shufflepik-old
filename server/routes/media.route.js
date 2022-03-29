//Route dependencies
const { ReactionUserManager } = require("discord.js");
let express = require("express");
let router = express.Router();
let media_controller = require("../controllers/media.controller");

//Routes
//Defualt route is to upload an image. In this case we direct straight to the controller to handle logic for media.
//router.post("/image", media_controller.uploadImage);
router.post("/image", media_controller.checkUserCredentials, media_controller.uploadImage);

router.post("/albums", getUserAlbums);
router.delete("/image", deleteImage);

//Exports
module.exports = router;

async function upload(req, res) {
  try {
    //console.log("Made it to upload route");
    console.log("before image");
    await media_controller.uploadImage().then((value) => {
      console.log("Made it back to route, data is:");
      console.log(value);
    });
    console.log("should be back from controller, image is:");
    console.log(image);
    res.json(image);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getUserAlbums(req, res) {
  console.log("Made it to get user albums");
  console.log(req.body);
  try {
    const albums = await media_controller.getUserAlbums(req.body.id);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function deleteImage(req, res) {
  try {
    console.log("made it to delete image on the route backend");
    console.log(req.body);
    const deletedImage = await media_controller.deleteImage(req.body);
    console.log("Delete on db and all that");
    console.log(deletedImage);
    res.json(deletedImage);
  } catch (err) {
    console.log(err);
    throw err;
  }
}

/*async function checkUser(req, res, next) {
  /*try {
      //const 
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~END CHECK USER~~~~~~~~~~~~~~~~~~~~~~~~~~~"
    );
    next();
  } catch (err) {
    console.log(err);
    throw err;
  }
}*/
