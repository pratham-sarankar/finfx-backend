/**
 * Bot Package Controller
 * Handles CRUD operations for bot-package associations
 * Bot packages represent pricing plans for specific trading bots
 */
import Bot from "../models/Bot";
import BotPackage from "../models/BotPackage";
import { NextFunction, Request, Response } from "express";
import Package from "../models/Package";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";

/**
 * Create a new bot package association
 * @route POST /api/botPackages
 * @access Private
 * @param {Request} req - Express request object containing botId, packageId, and price
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created bot package data
 * @throws {AppError} 400 - Missing required fields or invalid data format
 * @throws {AppError} 404 - Bot or package not found
 * @throws {AppError} 409 - Bot package combination already exists
 */
export const createBotPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { botId, packageId, price } = req.body;
    
    // Validate required fields and data types
    if (
      !botId ||
      !packageId ||
      price === undefined ||
      price === null ||
      typeof price !== "number" ||
      price <= 0
    ) {
      throw new AppError(
        "Please provide all required fields.",
        400,
        "missing-required-fields"
      );
    }
    
    // Validate ObjectId format for bot and package IDs
    if (
      !mongoose.Types.ObjectId.isValid(botId) ||
      !mongoose.Types.ObjectId.isValid(packageId)
    ) {
      throw new AppError(
        "Invalid request. Please try again.",
        400,
        "invalid-request"
      );
    }
    
    // Verify bot exists
    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError(
        "The requested bot could not be found.",
        404,
        "bot-not-found"
      );
    }
    
    // Verify package exists
    const packageExists = await Package.findById(packageId);
    if (!packageExists) {
      throw new AppError(
        "The requested package could not be found.",
        404,
        "package-not-found"
      );
    }
    
    // Check if bot-package combination already exists
    const existing = await BotPackage.findOne({ botId, packageId });
    if (existing) {
      throw new AppError(
        "This combination already exists.",
        409,
        "botpackage-already-exists"
      );
    }
    
    const botPackage = new BotPackage({ botId, packageId, price });
    await botPackage.save();
    
    return res.status(201).json({
      success: true,
      message: "BotPackage created successfully",
      data: botPackage,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get all bot packages with populated bot and package details
 * @route GET /api/botPackages
 * @access Private
 * @param {Request} _ - Express request object (unused)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with array of all bot packages
 * @description Retrieves all bot packages with populated bot and package information,
 *              transforming the response to use 'id' instead of '_id' and removing __v fields
 */
export const getBotPackages = async (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const botPackages = await BotPackage.find()
      .populate("botId")
      .populate("packageId")
      .select("-__v");

    // Transform bot packages to improve response structure
    const transformedBotPackages = botPackages.map((botPackage) => {
      const botPackageObj = botPackage.toObject();
      const transformedBotPackage: any = {
        id: botPackageObj._id,
        bot: {
          ...botPackageObj.botId,
          id: botPackageObj.botId._id,
        },
        package: {
          ...botPackageObj.packageId,
          id: botPackageObj.packageId._id
        },
        ...botPackageObj,
      };
      
      // Clean up unwanted fields for cleaner response
      delete transformedBotPackage.package._id;
      delete transformedBotPackage.bot._id;
      delete transformedBotPackage._id;
      delete transformedBotPackage.bot.__v;
      delete transformedBotPackage.package.__v;
      delete transformedBotPackage.packageId;
      delete transformedBotPackage.botId;
      
      return transformedBotPackage;
    });

    return res.status(200).json({
      success: true,
      data: transformedBotPackages,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get a single bot package by ID
 * @route GET /api/botPackages/:id
 * @access Private
 * @param {Request} req - Express request object containing bot package ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with bot package data
 * @throws {AppError} 400 - Invalid bot package ID format
 * @throws {AppError} 404 - Bot package not found
 */
export const getBotPackageById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const botPackage = await BotPackage.findById(req.params.id)
      .populate("botId")
      .populate("packageId").select("-__v")
    if (!botPackage)
      throw new AppError(
        "The requested bot package could not be found.",
        404,
        "botpackage-not-found"
      );

      const botPackageObj = botPackage.toObject();

const transformedBotPackage: any = {
  id: botPackageObj._id,
  bot: {
    ...botPackageObj.botId,
    id: botPackageObj.botId._id,
  },
  package: {
    ...botPackageObj.packageId,
    id: botPackageObj.packageId._id,
  },
  price: botPackageObj.price,
};

delete transformedBotPackage.bot._id;
delete transformedBotPackage.bot.__v;
delete transformedBotPackage.package._id;
delete transformedBotPackage.package.__v;
delete transformedBotPackage.botId;
delete transformedBotPackage.packageId;
delete transformedBotPackage._id;

    return res.status(200).json({
      success: true,
      data: transformedBotPackage,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update a bot package price
 * @route PUT /api/botPackages/:id
 * @access Private
 * @param {Request} req - Express request object containing bot package ID and new price
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated bot package data
 * @throws {AppError} 400 - Missing or invalid price
 * @throws {AppError} 404 - Bot package not found
 */
export const updateBotPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { price } = req.body;
    
    // Validate price field presence
    if (price === undefined || price === null) {
      throw new AppError(
        "Please provide a valid price.",
        400,
        "missing-required-fields"
      );
    }
    
    // Validate price data type and value
    if (typeof price !== "number" || price < 0) {
      throw new AppError("Please provide a valid price.", 400, "invalid-price");
    }
    
    const botPackage = await BotPackage.findByIdAndUpdate(
      req.params.id,
      { $set: { price } },
      { new: true, runValidators: true }
    );
    
    if (!botPackage) {
      throw new AppError(
        "The requested bot package could not be found.",
        404,
        "botpackage-not-found"
      );
    }
    
    return res.status(200).json({
      success: true,
      message: "BotPackage updated successfully",
      data: botPackage,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete a bot package by ID
 * @route DELETE /api/botPackages/:id
 * @access Private
 * @param {Request} req - Express request object containing bot package ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming deletion
 * @throws {AppError} 404 - Bot package not found
 */
export const deleteBotPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const botPackage = await BotPackage.findByIdAndDelete(req.params.id);
    if (!botPackage) {
      throw new AppError(
        "The requested bot package could not be found.",
        404,
        "botpackage-not-found"
      );
    }
    
    return res.status(200).json({
      success: true,
      message: "BotPackage deleted",
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get all bot packages for a specific bot
 * @route GET /api/botPackages/bot/:botId
 * @access Private
 * @param {Request} req - Express request object containing bot ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with bot packages for the specified bot
 * @throws {AppError} 400 - Missing bot ID or invalid format
 * @throws {AppError} 404 - Bot not found
 */
export const getBotPackageByBotId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const botId = req.params.botId;

    // Validate bot ID presence
    if (!botId) {
      throw new AppError(
        "Please provide all required fields.",
        400,
        "missing-required-fields"
      );
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(botId)) {
      throw new AppError(
        "Invalid request. Please try again.",
        400,
        "invalid-request"
      );
    }
    
    // Verify bot exists
    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError(
        "The requested bot could not be found.",
        404,
        "bot-not-found"
      );
    }
    
    // Find all bot packages for this specific bot
    const botPackages = await BotPackage.find({ botId })
      .populate("botId")
      .populate("packageId")
      .select("-__v");

    // Transform bot packages for cleaner response structure
    const transformedBotPackages = botPackages.map((botPackage) => {
      const botPackageObj = botPackage.toObject();

      const transformedBotPackage: any = {
        id: botPackageObj._id,
        bot: {
          ...botPackageObj.botId,
          id: botPackageObj.botId._id,
        },
        package: {
          ...botPackageObj.packageId,
          id: botPackageObj.packageId._id,
        },
        price: botPackageObj.price,
      };

      // Clean up unwanted fields for cleaner response
      delete transformedBotPackage.bot._id;
      delete transformedBotPackage.bot.__v;
      delete transformedBotPackage.package._id;
      delete transformedBotPackage.package.__v;
      delete transformedBotPackage.botId;
      delete transformedBotPackage.packageId;
      delete transformedBotPackage._id;

      return transformedBotPackage;
    });

    return res.status(200).json({
      success: true,
      message: "BotPackages for the given bot fetched successfully.",
      data: transformedBotPackages,
    });
  } catch (error) {
    return next(error);
  }
};
