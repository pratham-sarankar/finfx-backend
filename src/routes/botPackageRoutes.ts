import express from "express";
import {
  createBotPackage,
  getBotPackages,
  getBotPackageById,
  updateBotPackage,
  deleteBotPackage
} from "../controllers/botPackageController";
import { auth } from "../middleware/auth";

const router = express.Router();

router.use(auth);


// Get all bot packages
router.get("/", getBotPackages);

// Get a single bot package by ID
router.get("/:id", getBotPackageById);

// Create new bot package 
router.post("/", createBotPackage);

// Update a bot package 
router.put("/:id", updateBotPackage);

// Delete a bot package 
router.delete("/:id", deleteBotPackage);

export default router;
