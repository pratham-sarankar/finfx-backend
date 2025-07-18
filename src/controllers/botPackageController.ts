import Bot from "../models/Bot";
import BotPackage from "../models/BotPackage";
import { NextFunction, Request, Response } from "express";
import Package from "../models/Package";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";

// Create a new BotPackage
export const createBotPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { botId, packageId, price } = req.body;
    if (!botId || !packageId || price === undefined || price === null || typeof price !== 'number' || price <= 0) {
      throw new AppError("botId, packageId, and valid price are required.", 400, "BOTPACKAGE_REQUIRED_FIELDS");
    }
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(botId)) {
      throw new AppError("Invalid botId format.", 400, "INVALID_BOT_ID_FORMAT");
    }
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new AppError("Invalid packageId format.", 400, "INVALID_PACKAGE_ID_FORMAT");
    }
    // Check if botId exists
    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError("Bot not found.", 404, "BOT_NOT_FOUND");
    }
    // Check if packageId exists
    const packageExists = await Package.findById(packageId);
    if (!packageExists) {
      throw new AppError("Package not found.", 404, "PACKAGE_NOT_FOUND");
    }
    const existing = await BotPackage.findOne({ botId, packageId });
    if (existing) {
      throw new AppError("BotPackage for this bot and package already exists.", 409, "BOTPACKAGE_EXISTS");
    }
    const botPackage = new BotPackage({ botId, packageId, price });
    await botPackage.save();
    return res.status(201).json({
      success: true,
      message: "BotPackage created successfully",
      data: botPackage
    });
  } catch (err) {
    return next(err);
  }
};

// Get all BotPackages
export const getBotPackages = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const botPackages = await BotPackage.find().populate('botId').populate('packageId');
    return res.status(200).json({
      success: true,
      data: botPackages
    });
  } catch (err) {
    return next(err);
  }
};

// Get a single BotPackage by ID
export const getBotPackageById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const botPackage = await BotPackage.findById(req.params.id).populate('botId').populate('packageId');
    if (!botPackage) throw new AppError("BotPackage not found", 404, "BOTPACKAGE_NOT_FOUND");
    return res.status(200).json({
      success: true,
      data: botPackage
    });
  } catch (err) {
    return next(err);
  }
};

// Update a BotPackage
export const updateBotPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { price } = req.body;
    if (price === undefined || price === null) {
      throw new AppError("Please provide valid price", 400, "BOTPACKAGE_PRICE_REQUIRED");
    }
    if (typeof price !== 'number' || price < 0) {
      throw new AppError("Price must be a valid non-negative number.", 400, "BOTPACKAGE_INVALID_PRICE");
    }
    const botPackage = await BotPackage.findByIdAndUpdate(
      req.params.id,
      { $set: { price } },
      { new: true, runValidators: true }
    );
    if (!botPackage) {
      throw new AppError("BotPackage not found", 404, "BOTPACKAGE_NOT_FOUND");
    }
    return res.status(200).json({
      success: true,
      message: "BotPackage updated successfully",
      data: botPackage
    });
  } catch (err) {
    return next(err);
  }
};

// Delete a BotPackage
export const deleteBotPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const botPackage = await BotPackage.findByIdAndDelete(req.params.id);
    if (!botPackage) throw new AppError("BotPackage not found", 404, "BOTPACKAGE_NOT_FOUND");
    return res.status(200).json({
      success: true,
      message: "BotPackage deleted"
    });
  } catch (err) {
    return next(err);
  }
};

export const getBotPackageByBotId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const botId = req.params.botId;
   
   if (!botId){
      throw new AppError("Please provide Bot Id",400,"BOT_ID_NOT_FOUND")
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(botId)) {
      throw new AppError("Invalid botId format.", 400, "INVALID_BOT_ID_FORMAT");
    }
    // Check if bot exists
    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError("Bot not found.", 404, "BOT_NOT_FOUND");
    }
    // Find all BotPackages for this bot
    const botPackages = await BotPackage.find({ botId }).populate('botId').populate('packageId');
    return res.status(200).json({
      success: true,
      message: "BotPackages for the given botId fetched successfully.",
      data: botPackages
    });
  } catch (error) {
    return next(error);
  }
}

