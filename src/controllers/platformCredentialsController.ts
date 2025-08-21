/**
 * Platform Credentials Controller
 * Handles CRUD operations for user platform credentials
 * Manages API keys and authentication credentials for various trading platforms
 */
import { Request, Response, NextFunction } from "express";
import PlatformCredential from "../models/PlatformCredential";
import { AppError } from "../middleware/errorHandler";

/**
 * Create new platform credentials for a user
 * @route POST /api/platformCredentials
 * @access Private
 * @param {Request} req - Express request object containing userId, platformName, and credentials
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created platform credential
 * @throws {AppError} 400 - Missing required fields or invalid credentials format
 * @throws {AppError} 409 - Platform credentials already exist for this user
 */
export const createPlatformCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName, credentials } = req.body;
    
    // Validate required fields
    if (!userId) {
      throw new AppError("userId is required.", 400, "missing-userId");
    }
    if (!platformName) {
      throw new AppError("platformName is required.", 400, "missing-platformName");
    }
    if (!credentials || typeof credentials !== "object") {
      throw new AppError("credentials are required.", 400, "missing-credentials");
    }
    
    // Check if platform credentials already exist for this user
    const existing = await PlatformCredential.findOne({ userId, platformName });
    if (existing) {
      throw new AppError(
        "platform already exist for this user.",
        409,
        "platform-already-exists"
      );
    }
    
    const newCredential = await PlatformCredential.create({
      userId,
      platformName,
      credentials,
    });
    
    const obj = newCredential.toObject();
    return res.status(201).json({
      success: true,
      message: "PlatformCredential created successfully",
      data: {
        id: obj._id,
        userId: obj.userId,
        platformName: obj.platformName,
        credentials: obj.credentials,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get platform credentials with optional filtering
 * @route GET /api/platformCredentials?userId=&platformName=
 * @access Private
 * @param {Request} req - Express request object with optional query parameters
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with platform credentials
 * @throws {AppError} 404 - No platform credentials found
 */
export const getPlatformCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName } = req.query;

    // Build filter object based on query parameters
    let filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    if (platformName) {
      filter.platformName = platformName;
    }

    // Fetch credentials based on filter
    const credentials = await PlatformCredential.find(filter);

    if (!credentials.length) {
      throw new AppError(
        "No platform credentials found.",
        404,
        "platform-credentials-not-found"
      );
    }

    // Transform response to use 'id' instead of '_id'
    const transformed = credentials.map((credential: any) => {
      const obj = credential.toObject();
      return {
        id: obj._id,
        userId: obj.userId,
        platformName: obj.platformName,
        credentials: obj.credentials,
      };
    });

    return res.status(200).json({
      success: true,
      data: transformed,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update platform credentials for a user
 * @route PUT /api/platformCredentials/:userId/:platformName
 * @access Private
 * @param {Request} req - Express request object containing userId, platformName in params and credentials in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated platform credential
 * @throws {AppError} 400 - Missing required fields or invalid credentials format
 * @throws {AppError} 404 - Platform credential not found
 * @description Merges new credentials with existing ones
 */
export const updatePlatformCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName } = req.params;
    const { credentials } = req.body;

    // Validate required fields
    if (!userId) {
      throw new AppError("userId is required.", 400, "missing-userId");
    }
    if (!platformName) {
      throw new AppError("platformName is required.", 400, "missing-platformName");
    }
    if (!credentials || typeof credentials !== "object") {
      throw new AppError("credentials must be an object.", 400, "invalid-credentials");
    }

    // Find existing platform credential
    const existing = await PlatformCredential.findOne({ userId, platformName });
    if (!existing) {
      throw new AppError(
        "The requested platform credential could not be found.",
        404,
        "platform-credential-not-found"
      );
    }

    // Merge existing credentials with new credentials
    const mergedCredentials = { ...(existing.credentials || {}), ...credentials };

    // Update document with merged credentials
    existing.credentials = mergedCredentials;
    const updated = await existing.save();

    return res.status(200).json({
      success: true,
      message: "PlatformCredential updated successfully",
      data: {
        id: updated._id,
        userId: updated.userId,
        platformName: updated.platformName,
        credentials: updated.credentials,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete platform credentials for a user
 * @route DELETE /api/platformCredentials/:userId/:platformName
 * @access Private
 * @param {Request} req - Express request object containing userId and platformName in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming deletion
 * @throws {AppError} 400 - Missing required fields
 * @throws {AppError} 404 - Platform credential not found
 */
export const deletePlatformCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName } = req.params;
    
    // Validate required fields
    if (!userId) {
      throw new AppError("userId is required.", 400, "missing-userId");
    }
    if (!platformName) {
      throw new AppError("platformName is required.", 400, "missing-platformName");
    }
    
    const deleted = await PlatformCredential.findOneAndDelete({
      userId,
      platformName,
    });
    
    if (!deleted) {
      throw new AppError(
        "The requested platform credential could not be found.",
        404,
        "platform-credential-not-found"
      );
    }
    
    return res.status(200).json({
      success: true,
      message: "PlatformCredential deleted",
    });
  } catch (err) {
    return next(err);
  }
};
