import express from "express";
import { auth } from "../middleware/auth";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController";
import { authorizeRoles } from "../middleware/authorizedRoles";

const router = express.Router();

router.use(auth);

// Create user 
router.post("/",authorizeRoles("admin"), createUser);
// Get all users
router.get("/",authorizeRoles("admin"), getAllUsers);
// Get single user by ID
router.get("/:id",authorizeRoles("admin"), getUserById);
// Update user by ID
router.put("/:id",authorizeRoles("admin"), updateUser);
// Delete user by ID
router.delete("/:id",authorizeRoles("admin"), deleteUser);

export default router;