/**
 * Package Routes
 * Defines API endpoints for subscription package management
 * All routes require authentication and provide CRUD operations for packages
 */
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

// Apply authentication middleware to all package routes
router.use(auth);

/**
 * @route GET /api/packages
 * @desc Get all subscription packages
 * @access Private
 */
router.get("/", getPackages);

/**
 * @route GET /api/packages/:id
 * @desc Get a single package by ID
 * @access Private
 */
router.get("/:id", getPackageById);

/**
 * @route POST /api/packages
 * @desc Create a new subscription package
 * @access Private
 */
router.post("/", createPackage);

/**
 * @route PUT /api/packages/:id
 * @desc Update an existing package by ID
 * @access Private
 */
router.put("/:id", updatePackage);

/**
 * @route DELETE /api/packages/:id
 * @desc Delete a package by ID
 * @access Private
 */
router.delete("/:id", deletePackage);

export default router;
