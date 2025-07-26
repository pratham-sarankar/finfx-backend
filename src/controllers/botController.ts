import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import Bot from "../models/Bot";
import BotSubscription from "../models/BotSubscription";
import Signal from "../models/Signal";

/**
 * Create a new bot
 */
export const createBot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
    } = req.body;

    if (!name || !description || recommendedCapital === undefined) {
      throw new AppError("Please provide name, description, and recommendedCapital", 400, "missing-required-fields");
    }

    const existingBot = await Bot.findOne({ name });
    if (existingBot) {
      throw new AppError("Bot with this name already exists", 409, "duplicate-bot-name");
    }

    const bot = await Bot.create({
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
    });

    const transformedBot: any = { ...bot.toObject(), id: bot._id };
    delete transformedBot._id;
    delete transformedBot.__v;

    res.status(201).json({ status: "success", message: "Bot created successfully", data: transformedBot });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bots
 */
export const getAllBots = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bots = await Bot.find({}).select("-__v");
    const transformedBots = bots.map((bot) => {
      const botObj = bot.toObject();
      const transformedBot: any = { ...botObj, id: botObj._id };
      delete transformedBot._id;
      return transformedBot;
    });

    res.status(200).json({ status: "success", data: transformedBots });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bot by ID
 */
export const getBotById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bot = await Bot.findById(id).select("-__v");

    if (!bot) throw new AppError("Bot not found", 404, "bot-not-found");

    const transformedBot = { ...bot.toObject(), id: bot._id };
    delete transformedBot._id;

    res.status(200).json({ status: "success", data: transformedBot });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscribers of a bot
 */
export const getBotSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bot = await Bot.findById(id);
    if (!bot) throw new AppError("Bot not found", 404, "bot-not-found");

    const subscriptions = await BotSubscription.find({ botId: id, status: "active" })
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
      data: { bot: { id: bot._id, name: bot.name }, subscribers, totalSubscribers: subscribers.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a bot
 */
export const updateBot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, recommendedCapital, performanceDuration, currency, script } = req.body;

    if (!name && !description && recommendedCapital === undefined && !performanceDuration && !currency && !script) {
      throw new AppError("Please provide at least one field to update", 400, "no-update-fields");
    }

    const existingBot = await Bot.findById(id);
    if (!existingBot) throw new AppError("Bot not found", 404, "bot-not-found");

    if (name && name !== existingBot.name) {
      const nameConflict = await Bot.findOne({ name, _id: { $ne: id } });
      if (nameConflict) throw new AppError("Bot with this name already exists", 409, "duplicate-bot-name");
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (recommendedCapital !== undefined) updateData.recommendedCapital = recommendedCapital;
    if (performanceDuration) updateData.performanceDuration = performanceDuration;
    if (currency !== undefined) updateData.currency = currency;
    if (script !== undefined) updateData.script = script;

    const bot = await Bot.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).select("-__v");

    if (!bot) throw new AppError("Failed to update bot", 500, "bot-update-failed");

    const transformedBot = { ...bot.toObject(), id: bot._id };
    delete transformedBot._id;

    res.status(200).json({ status: "success", message: "Bot updated successfully", data: transformedBot });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a bot
 */
export const deleteBot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bot = await Bot.findByIdAndDelete(id);

    if (!bot) throw new AppError("Bot not found", 404, "bot-not-found");

    res.status(200).json({ status: "success", message: "Bot deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bots subscribed by current user
 */
export const getSubscribedBots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscriptions = await BotSubscription.find({ userId: req.user._id, status: "active" }).populate("botId");

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

    res.status(200).json({ status: "success", data: subscribedBots });
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance overview
 */
export const getPerformanceOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bot = await Bot.findById(id);
    if (!bot) throw new AppError("Bot not found", 404, "bot-not-found");

    const signals = await Signal.find({ botId: id });
    const completedSignals = signals.filter((s: any) => s.exitTime && s.profitLoss !== undefined);

    const totalReturn = completedSignals.reduce((sum: number, s: any) => sum + (s.profitLoss || 0), 0);
    const winningSignals = completedSignals.filter((s: any) => (s.profitLoss || 0) > 0);
    const winRate = completedSignals.length > 0 ? (winningSignals.length / completedSignals.length) * 100 : 0;

    const totalWins = winningSignals.reduce((sum: number, s: any) => sum + (s.profitLoss || 0), 0);
    const losingSignals = completedSignals.filter((s: any) => (s.profitLoss || 0) < 0);
    const totalLosses = Math.abs(losingSignals.reduce((sum: number, s: any) => sum + (s.profitLoss || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    res.status(200).json({
      status: "success",
      data: {
        totalTrades: completedSignals.length,
        totalReturn: Math.round(totalReturn * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};
