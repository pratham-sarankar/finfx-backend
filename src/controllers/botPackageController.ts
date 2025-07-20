import Bot from "../models/Bot";
import BotPackage from "../models/BotPackage";
import { NextFunction, Request, Response } from "express";
import Package from "../models/Package";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";

// Create a new BotPackage
export const createBotPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { botId, packageId, price } = req.body;
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
    // Validate ObjectId format
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
    // Check if botId exists
    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError(
        "The requested bot could not be found.",
        404,
        "bot-not-found"
      );
    }
    // Check if packageId exists
    const packageExists = await Package.findById(packageId);
    if (!packageExists) {
      throw new AppError(
        "The requested package could not be found.",
        404,
        "package-not-found"
      );
    }
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

// Get all BotPackages
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

    const transformedBotPackages = botPackages.map((botPackage) => {
      const botPackageObj = botPackage.toObject();
      const transformedBotPackage: any = {
        id: botPackageObj._id,
        bot:{
         
           ...botPackageObj.botId,
            id: botPackageObj.botId._id,
        },
        package:{
         ...botPackageObj.packageId,
         id:botPackageObj.packageId._id

        },

        ...botPackageObj,
      };
      delete transformedBotPackage.package._id
      delete transformedBotPackage.bot._id
      delete transformedBotPackage._id
      delete transformedBotPackage.bot.__v
      delete transformedBotPackage.package.__v
      delete transformedBotPackage.bot._id
      delete transformedBotPackage.packageId
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

// Get a single BotPackage by ID
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
    return res.status(200).json({
      success: true,
      data: botPackage,
    });
  } catch (err) {
    return next(err);
  }
};

// Update a BotPackage
export const updateBotPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { price } = req.body;
    if (price === undefined || price === null) {
      throw new AppError(
        "Please provide a valid price.",
        400,
        "missing-required-fields"
      );
    }
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

// Delete a BotPackage
export const deleteBotPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const botPackage = await BotPackage.findByIdAndDelete(req.params.id);
    if (!botPackage)
      throw new AppError(
        "The requested bot package could not be found.",
        404,
        "botpackage-not-found"
      );
    return res.status(200).json({
      success: true,
      message: "BotPackage deleted",
    });
  } catch (err) {
    return next(err);
  }
};

export const getBotPackageByBotId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const botId = req.params.botId;

    if (!botId) {
      throw new AppError(
        "Please provide all required fields.",
        400,
        "missing-required-fields"
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(botId)) {
      throw new AppError(
        "Invalid request. Please try again.",
        400,
        "invalid-request"
      );
    }
    // Check if bot exists
    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError(
        "The requested bot could not be found.",
        404,
        "bot-not-found"
      );
    }
    // Find all BotPackages for this bot
    const botPackages = await BotPackage.find({ botId })
      .populate("botId")
      .populate("packageId").select("-__v")

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
