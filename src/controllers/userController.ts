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
    const { fullName, email, phoneNumber, password } = req.body;
    if (!fullName || !email || !phoneNumber || !password) {
      throw new AppError("All fields are required", 400, "missing-fields");
    }
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("Email already in use", 409, "email-exists");
    }
    const user = await User.create({ fullName, email, phoneNumber, password });
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
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Parse pagination params
    let n = parseInt(req.query.n as string, 10);
    let p = parseInt(req.query.p as string, 10);

    // Set defaults if not provided or invalid
    n = isNaN(n) || n <= 0 ? 10 : n;
    p = isNaN(p) || p <= 0 ? 1 : p;

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / n);

    // If requested page is out of range, return empty array
    if (p > totalPages && totalPages !== 0) {
      return res.status(200).json({
        success: true,
        data: [],
        page: p,
        perPage: n,
        totalPages,
        totalUsers,
      });
    }

    const users = await User.find()
      .select("-__v -password")
      .skip((p - 1) * n)
      .limit(n);

    const transformedUsers = users.map((user) => {
      const userObj = user.toObject();
      const { _id, __v, password: pwd, ...rest } = userObj;
      return { ...rest, id: _id };
    });

    return res.status(200).json({
      success: true,
      data: transformedUsers,
      page: p,
      perPage: n,
      totalPages,
      totalUsers,
    });
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
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user id ", 400, "invalid-id");
    }
    const { fullName, email, phoneNumber, password } = req.body;
    if (!fullName || !email || !phoneNumber) {
      throw new AppError(
        "All fields except password are required",
        400,
        "missing-fields"
      );
    }
    const updateData: any = { fullName, email, phoneNumber };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    }).select("-__v -password");
    if (!user) throw new AppError("User not found", 404, "user-not-found");
    const userObj = user.toObject();
    const { _id, __v, password: pwd, ...rest } = userObj;
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
