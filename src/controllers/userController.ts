import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

// Create a new user
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !role) {
      throw new AppError("All fields are required", 400, "missing-fields");
    }
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("Email already in use", 409, "email-exists");
    }
    const user = await User.create({ fullName, email, phoneNumber, password,role });
    const userObj = user.toObject();
    const { _id, __v, password: pwd, ...rest } = userObj;
    const transformedUser = { ...rest, id: _id };
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: transformedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
export const getAllUsers = async (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await User.find().select("-__v -password");
    const transformedUsers = users.map((user) => {
      const userObj = user.toObject();
      const { _id, __v, password: pwd, ...rest } = userObj;
      return { ...rest, id: _id };
    });
    return res.status(200).json({ success: true, data: transformedUsers });
  } catch (error) {
    return next(error);
  }
};

// Get single user by ID
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user id format", 400, "invalid-id-format");
    }
    const user = await User.findById(id).select("-__v -password");
    if (!user) throw new AppError("User not found", 404, "user-not-found");
    const userObj = user.toObject();
    const { _id, __v, password: pwd, ...rest } = userObj;
    const transformedUser = { ...rest, id: _id };
    return res.status(200).json({ success: true, data: transformedUser });
  } catch (error) {
    return next(error);
  }
};

// Update user by ID
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    //  Validate ID
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user id", 400, "invalid-id");
    }

    //  Destructure request body
    const { fullName, email, phoneNumber, password, role } = req.body;

    //  Validate required fields
    if (!fullName || !email || !phoneNumber || !role) {
      throw new AppError("All fields are required", 400, "missing-fields");
    }

    // Step 4: Role update restrictions
    const isRoleBeingChanged = role && role !== req.user.role;

    if (isRoleBeingChanged) {
      if (req.user.role !== "admin") {
        throw new AppError(
          "You are not allowed to change user roles",
          403,
          "role-change-not-allowed"
        );
      }

      if (req.user.id === id) {
        throw new AppError(
          "You cannot change your own role",
          403,
          "self-role-change-denied"
        );
      }
    }

    //  Prepare update data
    const updateData: any = {
      fullName,
      email,
      phoneNumber,
      role,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    //  Update user
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    }).select("-__v -password");

    if (!user) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    //  Format response
    const userObj = user.toObject();
    const { _id, ...rest } = userObj;
    const transformedUser = { ...rest, id: _id };

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: transformedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user by ID
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user id ", 400, "invalid-id");
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError("User not found", 404, "user-not-found");
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
