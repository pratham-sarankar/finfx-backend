/**
 * Bot Controller
 * Handles bot management operations
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import Bot from "../models/Bot";

/**
 * Create a new bot
 * @route POST /api/bots
 */
export const createBot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
    } = req.body;

    // Validate required fields
    if (!name || !description || recommendedCapital === undefined) {
      throw new AppError(
        "Please provide name, description, and recommendedCapital",
        400,
        "missing-required-fields"
      );
    }

    // Check if bot with same name already exists
    const existingBot = await Bot.findOne({ name });
    if (existingBot) {
      throw new AppError(
        "Bot with this name already exists",
        409,
        "duplicate-bot-name"
      );
    }

    // Create new bot
    const bot = await Bot.create({
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
    });

    // Transform response to remove __v and convert _id to id
    const transformedBot: any = {
      ...bot.toObject(),
      id: bot._id,
    };
    delete transformedBot._id;
    delete transformedBot.__v;

    res.status(201).json({
      status: "success",
      message: "Bot created successfully",
      data: transformedBot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bots
 * @route GET /api/bots
 */
export const getAllBots = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bots = await Bot.find({}).select("-__v");

    // Transform response to convert _id to id
    const transformedBots = bots.map((bot) => {
      const botObj = bot.toObject();
      const transformedBot: any = {
        ...botObj,
        id: botObj._id,
      };
      delete transformedBot._id;
      return transformedBot;
    });

    res.status(200).json({
      status: "success",
      data: transformedBots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific bot by ID
 * @route GET /api/bots/:id
 */
export const getBotById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const bot = await Bot.findById(id).select("-__v");

    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Transform response to convert _id to id
    const botObj = bot.toObject();
    const transformedBot: any = {
      ...botObj,
      id: botObj._id,
    };
    delete transformedBot._id;

    res.status(200).json({
      status: "success",
      data: transformedBot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users subscribed to a specific bot
 * @route GET /api/bots/:id/subscribers
 */
export const getBotSubscribers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if bot exists
    const bot = await Bot.findById(id);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    const BotSubscription = require("../models/BotSubscription").default;

    const subscriptions = await BotSubscription.find({
      botId: id,
      status: "active",
    })
      .populate("userId", "fullName email")
      .select("-__v")
      .sort({ subscribedAt: -1 });

    const subscribers = subscriptions.map((sub: any) => {
      const user = sub.userId;
      const transformedSubscriber: any = {
        ...user.toObject(),
        id: user._id,
        subscriptionId: sub._id,
        subscribedAt: sub.subscribedAt,
      };
      delete transformedSubscriber._id;
      delete transformedSubscriber.__v;
      return transformedSubscriber;
    });

    res.status(200).json({
      status: "success",
      data: {
        bot: {
          id: bot._id,
          name: bot.name,
        },
        subscribers,
        totalSubscribers: subscribers.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a bot by ID
 * @route PUT /api/bots/:id
 */
export const updateBot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
    } = req.body;

    // Validate at least one field is provided
    if (
      !name &&
      !description &&
      recommendedCapital === undefined &&
      !performanceDuration &&
      !currency &&
      !script
    ) {
      throw new AppError(
        "Please provide at least one field to update",
        400,
        "no-update-fields"
      );
    }

    // Check if bot exists
    const existingBot = await Bot.findById(id);
    if (!existingBot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if name is being updated and if it conflicts with another bot
    if (name && name !== existingBot.name) {
      const nameConflict = await Bot.findOne({ name, _id: { $ne: id } });
      if (nameConflict) {
        throw new AppError(
          "Bot with this name already exists",
          409,
          "duplicate-bot-name"
        );
      }
    }

    // Prepare update object
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (recommendedCapital !== undefined)
      updateData.recommendedCapital = recommendedCapital;
    if (performanceDuration)
      updateData.performanceDuration = performanceDuration;
    if (currency !== undefined) updateData.currency = currency;
    if (script !== undefined) updateData.script = script;
    
    // Update bot
    const bot = await Bot.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!bot) {
      throw new AppError("Failed to update bot", 500, "bot-update-failed");
    }

    // Transform response to convert _id to id
    const transformedBot = {
      ...bot.toObject(),
      id: bot._id,
    };
    delete transformedBot._id;

    res.status(200).json({
      status: "success",
      message: "Bot updated successfully",
      data: transformedBot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a bot by ID
 * @route DELETE /api/bots/:id
 */
export const deleteBot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const bot = await Bot.findByIdAndDelete(id);

    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    res.status(200).json({
      status: "success",
      message: "Bot deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bots that the authenticated user is subscribed to
 * @route GET /api/bots/subscribed
 */
export const getSubscribedBots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const BotSubscription = require("../models/BotSubscription").default;

    const subscriptions = await BotSubscription.find({
      userId: req.user._id,
      status: "active",
    }).populate("botId");

    const subscribedBots = subscriptions.map((sub: any) => {
      const bot = sub.botId;
      const transformedBot: any = {
        ...bot.toObject(),
        id: bot._id,
        subscriptionId: sub._id,
        subscribedAt: sub.subscribedAt,
      };
      delete transformedBot._id;
      delete transformedBot.__v;
      return transformedBot;
    });

    res.status(200).json({
      status: "success",
      data: subscribedBots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance overview for a specific bot
 * @route GET /api/bots/:id/performance-overview
 */
export const getBotPerformanceOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if bot exists
    const bot = await Bot.findById(id);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Get all signals for this bot
    const Signal = require("../models/Signal").default;
    const signals = await Signal.find({ botId: id });

    // Filter completed signals (those with exitTime and profitLoss)
    const completedSignals = signals.filter(
      (signal: any) => signal.exitTime && signal.profitLoss !== undefined
    );

    const totalReturn = completedSignals.reduce(
      (sum: number, signal: any) => sum + (signal.profitLoss || 0),
      0
    );

    // Calculate win rate
    const winningSignals = completedSignals.filter(
      (signal: any) => (signal.profitLoss || 0) > 0
    );
    const winRate =
      completedSignals.length > 0
        ? (winningSignals.length / completedSignals.length) * 100
        : 0;

    // Calculate profit factor
    const totalWins = winningSignals.reduce(
      (sum: number, signal: any) => sum + (signal.profitLoss || 0),
      0
    );
    const losingSignals = completedSignals.filter(
      (signal: any) => (signal.profitLoss || 0) < 0
    );
    const totalLosses = Math.abs(
      losingSignals.reduce(
        (sum: number, signal: any) => sum + (signal.profitLoss || 0),
        0
      )
    );
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    res.status(200).json({
      status: "success",
      data: {
        totalTrades: completedSignals.length,
        totalReturn: Math.round(totalReturn * 100) / 100, // Round to 2 decimal places
        winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
        profitFactor: Math.round(profitFactor * 100) / 100, // Round to 2 decimal places
      },
    });
  } catch (error) {
    next(error);
  }
};