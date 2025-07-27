import { Request, Response, NextFunction } from "express";
import PlatformCredential from "../models/PlatformCredential";
import { AppError } from "../middleware/errorHandler";

// Create
export const createPlatformCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName, credentials } = req.body;
    if (!userId) {
      throw new AppError("userId is required.", 400, "missing-userId");
    }
    if (!platformName) {
      throw new AppError("platformName is required.", 400, "missing-platformName");
    }
    if (!credentials || typeof credentials !== "object") {
      throw new AppError("credentials are required.", 400, "missing-credentials");
    }
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

export const getPlatformCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName } = req.query;

    // Filter object
    let filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    if (platformName) {
      filter.platformName = platformName;
    }

    // Fetch data
    const credentials = await PlatformCredential.find(filter);

    if (!credentials.length) {
      throw new AppError(
        "No platform credentials found.",
        404,
        "platform-credentials-not-found"
      );
    }

    // Transform response
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

export const updatePlatformCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName } = req.params;
    const { credentials } = req.body;

    if (!userId) {
      throw new AppError("userId is required.", 400, "missing-userId");
    }
    if (!platformName) {
      throw new AppError("platformName is required.", 400, "missing-platformName");
    }
    if (!credentials || typeof credentials !== "object") {
      throw new AppError("credentials must be an object.", 400, "invalid-credentials");
    }

    // Fetch existing record
    const existing = await PlatformCredential.findOne({ userId, platformName });
    if (!existing) {
      throw new AppError(
        "The requested platform credential could not be found.",
        404,
        "platform-credential-not-found"
      );
    }

    // Merge old credentials with new
    const mergedCredentials = { ...(existing.credentials || {}), ...credentials };

    // Update document
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

export const deletePlatformCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, platformName } = req.params;
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
