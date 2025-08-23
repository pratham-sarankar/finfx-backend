import express from "express";
import { auth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  deleteMultipleUsers,
  getUsers,
} from "../controllers/userController";
import validate from "../middleware/validate";
import { body, param, query } from "express-validator";

const router = express.Router();

// All user CRUD routes require authentication and admin role
router.use(auth);
router.use(requireAdmin);

// Create user
router.post(
  "/",
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  validate,
  createUser
);

// Get all users
router.get(
  "/",
  query("n")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Items per page must be between 1 and 100"),
  query("p")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page number must be at least 1"),
  query("q")
    .optional()
    .isString()
    .withMessage("Search query must be a string"),
  validate,
  getUsers
);

// Get single user by ID
router.get(
  "/:id",
  param("id").isMongoId().withMessage("Please provide a valid user ID"),
  validate,
  getUserById
);

// Update user by ID
router.put(
  "/:id",
  param("id").isMongoId().withMessage("Please provide a valid user ID"),
  body("fullName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("phoneNumber")
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number"),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either active or inactive"),
  validate,
  updateUser
);

// Delete user by ID
router.delete(
  "/:id",
  param("id").isMongoId().withMessage("Please provide a valid user ID"),
  validate,
  deleteUser
);

// Delete multiple users
router.delete(
  "/",
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("Please provide userIds as a non-empty array"),
  body("userIds.*")
    .isMongoId()
    .withMessage("All user IDs must be valid MongoDB ObjectIDs"),
  validate,
  deleteMultipleUsers
);

export default router;
