/**
 * User Controller
 * Handles CRUD operations for user management
 * Provides admin-level user management functionality with pagination and validation
 */
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

/**
 * Create a new user
 * @route POST /api/users
 * @access Private (Admin)
 * @param {Request} req - Express request object containing user data
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created user data
 * @throws {AppError} 400 - Missing required fields
 * @throws {AppError} 409 - Email already exists
 * @description Creates a new user with provided details, excluding password from response
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;

    // Note: Basic field validation is now handled by express-validator in routes

    // Check for existing user with same email
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("Email already in use", 409, "email-exists");
    }

    // Check for existing user with same phone number (if provided)
    if (phoneNumber) {
      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone) {
        throw new AppError(
          "User already exists with this phone number",
          409,
          "phone-already-exists"
        );
      }
    }

    const user = await User.create({ fullName, email, phoneNumber, password });

    // Transform response to exclude password and replace _id with id
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

/**
 * Get all users with pagination and optional search
 * @route GET /api/users?n=10&p=1&q=search
 * @access Private (Admin)
 * @param {Request} req - Express request object with optional query params (n=perPage, p=page, q=search)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with paginated user data
 * @description Retrieves users with pagination and search support. Search filters by name, email, or phone. Default: 10 users per page, page 1
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Parse and validate pagination parameters
    let n = parseInt(req.query.n as string, 10); // Number of users per page
    let p = parseInt(req.query.p as string, 10); // Page number
    const q = req.query.q as string; // Search query

    // Set defaults if not provided or invalid
    n = isNaN(n) || n <= 0 ? 10 : n;
    p = isNaN(p) || p <= 0 ? 1 : p;

    // Build search query
    const searchQuery: any = {};
    if (q && q.trim()) {
      // Escape special regex characters to prevent regex injection
      const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchQuery.$or = [
        { fullName: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } },
        { phoneNumber: { $regex: escapedQuery, $options: 'i' } }
      ];
    }

    // Calculate total users and pages with search filter
    const totalUsers = await User.countDocuments(searchQuery);
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

    // Fetch users with pagination and search filter, excluding sensitive fields
    const users = await User.find(searchQuery)
      .select("-__v -password")
      .skip((p - 1) * n)
      .limit(n);

    // Transform users to replace _id with id
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

/**
 * Get single user by ID
 * @route GET /api/users/:id
 * @access Private (Admin)
 * @param {Request} req - Express request object containing user ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with user data
 * @throws {AppError} 400 - Invalid user ID format
 * @throws {AppError} 404 - User not found
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Validate ID presence
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user id format", 400, "invalid-id-format");
    }

    const user = await User.findById(id).select("-__v -password");
    if (!user) throw new AppError("User not found", 404, "user-not-found");

    // Transform user to replace _id with id
    const userObj = user.toObject();
    const { _id, __v, password: pwd, ...rest } = userObj;
    const transformedUser = { ...rest, id: _id };

    return res.status(200).json({ success: true, data: transformedUser });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update user by ID
 * @route PUT /api/users/:id
 * @access Private (Admin)
 * @param {Request} req - Express request object containing user ID and update data
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated user data
 * @throws {AppError} 400 - Invalid user ID or missing required fields
 * @throws {AppError} 404 - User not found
 * @description Updates user information. Password is optional and will be hashed if provided
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Validate ID presence
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user id ", 400, "invalid-id");
    }

    const { fullName, email, phoneNumber, password } = req.body;

    // Validate required fields (password is optional)
    if (!fullName || !email || !phoneNumber) {
      throw new AppError(
        "All fields except password are required",
        400,
        "missing-fields"
      );
    }

    // Build update object
    const updateData: any = { fullName, email, phoneNumber };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    }).select("-__v -password");

    if (!user) throw new AppError("User not found", 404, "user-not-found");

    // Transform user to replace _id with id
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

/**
 * Delete user by ID
 * @route DELETE /api/users/:id
 * @access Private (Admin)
 * @param {Request} req - Express request object containing user ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming deletion
 * @throws {AppError} 400 - Invalid user ID format
 * @throws {AppError} 404 - User not found
 * @description Permanently deletes a user from the database
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Validate ID presence
    if (!id) {
      throw new AppError("Id not found", 404, "id-not-found");
    }

    // Validate MongoDB ObjectId format
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

/**
 * Delete multiple users by IDs
 * @route DELETE /api/users
 * @access Private (Admin)
 * @param {Request} req - Express request object containing array of user IDs in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming deletions with count
 * @throws {AppError} 400 - Invalid request body or user ID format
 * @throws {AppError} 404 - Some or all users not found
 * @description Permanently deletes multiple users from the database
 */
export const deleteMultipleUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userIds } = req.body;

    // Note: Basic validation for userIds array and ObjectId format is now handled
    // by express-validator in routes, but we keep some business logic checks

    // Validate userIds presence and format
    if (!userIds || !Array.isArray(userIds)) {
      throw new AppError(
        "Please provide userIds as an array",
        400,
        "invalid-request-body"
      );
    }

    // Handle empty array case
    if (userIds.length === 0) {
      throw new AppError(
        "At least one user ID is required",
        400,
        "empty-user-ids-array"
      );
    }

    // This validation is still kept as a safety check
    const invalidIds = userIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      throw new AppError(
        `Invalid user IDs: ${invalidIds.join(", ")}`,
        400,
        "invalid-user-ids"
      );
    }

    // Delete users and get the result
    const deleteResult = await User.deleteMany({ _id: { $in: userIds } });

    // Check if any users were actually deleted
    if (deleteResult.deletedCount === 0) {
      throw new AppError(
        "No users found with the provided IDs",
        404,
        "users-not-found"
      );
    }

    // Check if some users were not found (partial success)
    const notFoundCount = userIds.length - deleteResult.deletedCount;
    let message = `${deleteResult.deletedCount} user(s) deleted successfully`;

    if (notFoundCount > 0) {
      message += `. ${notFoundCount} user(s) were not found`;
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        deletedCount: deleteResult.deletedCount,
        requestedCount: userIds.length,
        notFoundCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
