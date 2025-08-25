import { Router } from "express";
import { getSubscriptions } from "../controllers/subscriptionController";
import { validateSubscriptionQuery } from "../validators/subscriptionValidator";

const router = Router();

router.get("/", validateSubscriptionQuery, getSubscriptions);

export default router;