import express from "express";
import {
  createBotPackage,
  getBotPackages,
  getBotPackageById,
  updateBotPackage,
  deleteBotPackage,
  getBotPackageByBotId
} from "../controllers/botPackageController";
// import { auth } from "../middleware/auth";

const router = express.Router();

// router.use(auth);

// Get all botPackages
router.get("/", getBotPackages);

// Get all bot packages for a specific bot
router.get("/bot/:botId", getBotPackageByBotId);

// Get a single bot package by its own ID
router.get("/id/:id", getBotPackageById);

// Create new bot package 
router.post("/", createBotPackage);

// Update a bot package 
router.put("/:id", updateBotPackage);

// Delete a bot package 
router.delete("/:id", deleteBotPackage);

export default router;
