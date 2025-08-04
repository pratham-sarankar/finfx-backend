import  express  from "express";
import { auth } from "../middleware/auth";
import { createPlatformCredential, deletePlatformCredential,getPlatformCredentials, updatePlatformCredential } from "../controllers/platformCredentialsController";

const router = express.Router()


router.use(auth)


router.post("/",createPlatformCredential);
router.get("/",getPlatformCredentials);
router.put("/:userId/:platformName",updatePlatformCredential);
router.delete("/:userId/:platformName",deletePlatformCredential);


export default router