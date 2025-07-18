import express from "express";
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage
} from "../controllers/packageController";
import { validateObjectId } from "../middleware/validateObjectId";


const router = express.Router();



// Get all packages
router.get("/", getPackages);

// single package by ID
router.get("/:id",validateObjectId, getPackageById);

// Create a new package 
router.post("/", createPackage);

// Update a package 
router.put("/:id",validateObjectId, updatePackage);

// Delete a package 
router.delete("/:id",validateObjectId, deletePackage);

export default router;
