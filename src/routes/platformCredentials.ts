import  express  from "express";
import { auth } from "../middleware/auth";
import { createPlatformCredential, deletePlatformCredential,getPlatformCredentials, updatePlatformCredential } from "../controllers/platformCredentialsController";
import validate from "../middleware/validate";
import { body, param } from "express-validator";

const router = express.Router()


router.use(auth)


router.post(
  "/",
  body("platformName")
    .notEmpty()
    .withMessage("Platform name is required"),
  body("apiKey")
    .notEmpty()
    .withMessage("API key is required"),
  body("apiSecret")
    .notEmpty()
    .withMessage("API secret is required"),
  validate,
  createPlatformCredential
);
router.get("/",getPlatformCredentials);
router.put(
  "/:userId/:platformName",
  param("userId")
    .isMongoId()
    .withMessage("Please provide a valid user ID"),
  param("platformName")
    .notEmpty()
    .withMessage("Platform name is required"),
  body("apiKey")
    .optional()
    .notEmpty()
    .withMessage("API key cannot be empty"),
  body("apiSecret")
    .optional()
    .notEmpty()
    .withMessage("API secret cannot be empty"),
  validate,
  updatePlatformCredential
);
router.delete(
  "/:userId/:platformName",
  param("userId")
    .isMongoId()
    .withMessage("Please provide a valid user ID"),
  param("platformName")
    .notEmpty()
    .withMessage("Platform name is required"),
  validate,
  deletePlatformCredential
);


export default router