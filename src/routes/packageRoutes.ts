import express from "express";
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage
} from "../controllers/packageController";
import { auth } from "../middleware/auth";


const router = express.Router();

router.use(auth);

// Get all packages
router.get("/", getPackages);

// single package by ID
router.get("/:id", getPackageById);

// Create a new package 
router.post("/", createPackage);

// Update a package 
router.put("/:id", updatePackage);

// Delete a package 
router.delete("/:id", deletePackage);

export default router;
