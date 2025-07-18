import express from "express";
import {
  createBotPackage,
  getBotPackages,
  getBotPackageById,
  updateBotPackage,
  deleteBotPackage
} from "../controllers/botPackageController";
// import { auth } from "../middleware/auth";
import { validateObjectId } from "../middleware/validateObjectId";

const router = express.Router();

// router.use(auth);


// Get all bot packages
router.get("/", getBotPackages);

// Get a single bot package by ID
router.get("/:id",validateObjectId, getBotPackageById);

// Create new bot package 
router.post("/", createBotPackage);

// Update a bot package 
router.put("/:id", validateObjectId, updateBotPackage);

// Delete a bot package 
router.delete("/:id", validateObjectId, deleteBotPackage);

export default router;
