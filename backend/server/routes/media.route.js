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
    const deletedImage = await media_controller.deleteImage(req.body);
    await token_helper.respondWithAuth(res, deletedImage);
  } catch (err) {
    console.log(err);
    throw err;
  }
}
