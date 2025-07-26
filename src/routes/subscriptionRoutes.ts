import express from "express";
import { auth } from "../middleware/auth";
import {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  checkSubscription,
  deleteSubscription,
} from "../controllers/subscriptionController";

const router = express.Router();

router.use(auth);

router.post("/", createSubscription);
router.get("/", getSubscriptions);
router.get("/:id", getSubscriptionById);
router.put("/:id/cancel", cancelSubscription);
router.get("/check/:botId", checkSubscription);
router.delete("/:id", deleteSubscription);

export default router;
