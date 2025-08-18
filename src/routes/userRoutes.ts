import express from "express";
// import { auth } from "../middleware/auth";
import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUsers,
} from "../controllers/userController";

const router = express.Router();

// router.use(auth);

// Create user
router.post("/", createUser);
// Get all users
router.get("/", getUsers);
// Get single user by ID
router.get("/:id", getUserById);
// Update user by ID
router.put("/:id", updateUser);
// Delete user by ID
router.delete("/:id", deleteUser);

export default router;
