//Route dependencies
let express = require("express");
let router = express.Router();
let media_controller = require("../controllers/media.controller");
const verification_middleware = require("../middleware/verification.middleware");
//Helper modules
const token_helper = require("../helpers/token.helper");
//Routes
//Defualt route is to upload an image. In this case we direct straight to the controller to handle logic for media.
router.post(
  "/image",
  verification_middleware.jwtCheck,
  verification_middleware.checkUserCredentials,
  media_controller.uploadImage
);
router.delete("/image", verification_middleware.jwtCheck, deleteImage);

//Exports
module.exports = router;

async function deleteImage(req, res) {
  try {
    console.log("delete image, backend route");
    console.log(req.body);
    const deletedImage = await media_controller.deleteImage(req.body);
    console.log("made it back, deleted image is");
    console.log(deletedImage);
    const areTokensNeeded = res.locals.refreshToken ? true : false;
    let dataToSendToClient;
    if (areTokensNeeded) {
      await token_helper.setTokenCookie(res, res.locals.refreshToken);
      //deletedImage.jwt = res.locals.jwt;
      dataToSendToClient = {
        jwt: res.locals.jwt,
        deletedImage: deletedImage,
      };
    } else {
      dataToSendToClient = deletedImage;
    }
    //res.json(deletedImage);
    //res.json(dataToSendToClient);
    res.json(dataToSendToClient);
  } catch (err) {
    console.log(err);
    throw err;
  }
}
