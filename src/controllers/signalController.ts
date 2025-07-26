import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import Signal from "../models/Signal";
import Bot from "../models/Bot";
import mongoose from "mongoose";
import BotSubscription from "../models/BotSubscription";


export const createSignal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      botId,
      tradeId,
      direction,
      signalTime,
      entryTime,
      entryPrice,
      stoploss,
      target1r,
      target2r,
      exitTime,
      exitPrice,
      exitReason,
      profitLoss,
      profitLossR,
      trailCount,
    } = req.body;

    if (!entryTime || !entryPrice || !direction) {
      throw new AppError("Please provide entryTime, entryPrice, and direction", 400, "missing-required-fields");
    }

    if (!["LONG", "SHORT"].includes(direction)) {
      throw new AppError("Direction must be either LONG or SHORT", 400, "invalid-direction");
    }

    if (botId) {
      const bot = await Bot.findById(botId);
      if (!bot) {
        throw new AppError("Bot not found", 404, "bot-not-found");
      }
    }

    let finalTradeId = tradeId;
    if (!finalTradeId) {
      finalTradeId = `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (botId && finalTradeId) {
      const existingSignal = await Signal.findOne({ botId, tradeId: finalTradeId });
      if (existingSignal) {
        throw new AppError("A signal with the same tradeId already exists for this bot", 400, "duplicate-trade-id");
      }
    }

    const newSignal = new Signal({
      botId,
      tradeId: finalTradeId,
      direction,
      signalTime,
      entryTime,
      entryPrice,
      stoploss,
      target1r,
      target2r,
      exitTime,
      exitPrice,
      exitReason,
      profitLoss,
      profitLossR,
      trailCount,
      userId: req.user._id,
    });

    await newSignal.save();
    res.status(201).json({ message: "Signal created successfully", signal: newSignal });
  } catch (err) {
    next(err);
  }
};

export const createSignalsInBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { botId, signals } = req.body;

    // Validate required fields
    if (!botId || !signals || !Array.isArray(signals)) {
      throw new AppError(
        "Please provide botId and signals array",
        400,
        "missing-required-fields"
      );
    }

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Prepare signals data
    const signalsData = signals.map((signal: any) => ({
      botId,
      tradeId: signal.tradeId,
      direction: signal.direction,
      signalTime: new Date(signal.signalTime),
      entryTime: new Date(signal.entryTime),
      entryPrice: signal.entryPrice,
      stoploss: signal.stoploss,
      target1r: signal.target1r,
      target2r: signal.target2r,
      exitTime: new Date(signal.exitTime),
      exitPrice: signal.exitPrice,
      exitReason: signal.exitReason,
      profitLoss: signal.profitLoss,
      profitLossR: signal.profitLossR,
      trailCount: signal.trailCount,
    }));

    // Create signals in bulk
    const createdSignals = await Signal.insertMany(signalsData);

    // Transform response
    const transformedSignals = createdSignals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;
      delete transformedSignal.__v;
      return transformedSignal;
    });

    res.status(201).json({
      status: "success",
      message: `Successfully created ${createdSignals.length} signals`,
      data: {
        bot: {
          id: bot._id,
          name: bot.name,
        },
        signals: transformedSignals,
        totalCreated: createdSignals.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};


export const getSignalById = async (req: Request, res: Response, next: NextFunction) => {
    try {
    const { id } = req.params;

    const signal = await Signal.findById(id)
      .populate("botId", "name")
      .select("-__v");

    if (!signal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    // Transform response
    const transformedSignal: any = {
      ...signal.toObject(),
      id: signal._id,
    };
    delete transformedSignal._id;

    // Transform botId to bot format
    if (transformedSignal.botId) {
      transformedSignal.bot = {
        id: transformedSignal.botId._id,
        name: transformedSignal.botId.name,
      };
      delete transformedSignal.botId;
    }

    res.status(200).json({
      status: "success",
      data: transformedSignal,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateSignalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    if (updateFields.direction && !["LONG", "SHORT"].includes(updateFields.direction)) {
      throw new AppError("Direction must be either LONG or SHORT", 400, "invalid-direction");
    }

    const signal = await Signal.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true })
      .populate("botId", "name")
      .select("-__v");

    if (!signal) {
      throw new AppError("Failed to update signal", 500, "signal-update-failed");
    }

    const transformedSignal: any = { ...signal.toObject(), id: signal._id };
    delete transformedSignal._id;

    if (transformedSignal.botId) {
      transformedSignal.bot = {
        id: transformedSignal.botId._id,
        name: transformedSignal.botId.name,
      };
      delete transformedSignal.botId;
    }

    res.status(200).json({ status: "success", message: "Signal updated successfully", data: transformedSignal });
  } catch (err) {
    next(err);
  }
};

export const deleteSignalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const signal = await Signal.findByIdAndDelete(id);

    if (!signal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    res.status(200).json({ status: "success", message: "Signal deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getSignalsByBot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { botId } = req.params;
    const { page = 1, limit = 10, from, to, direction } = req.query;

    const botExists = await Bot.findById(botId);
    if (!botExists) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    const query: any = { botId };
    if (from || to) {
      query.entryTime = {};
      if (from) query.entryTime.$gte = new Date(from as string);
      if (to) query.entryTime.$lte = new Date(to as string);
    }
    if (direction) query.direction = direction;

    const skip = (Number(page) - 1) * Number(limit);

    const signals = await Signal.find(query)
      .sort({ entryTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Signal.countDocuments(query);

    const totalProfitLossR = await Signal.aggregate([
      { $match: query },
      { $group: { _id: null, totalR: { $sum: "$profitLossR" } } },
    ]);

    const performanceOverview = {
      totalSignals: total,
      totalProfitLossR: totalProfitLossR[0]?.totalR || 0,
    };

    res.status(200).json({
      status: "success",
      total,
      page: Number(page),
      limit: Number(limit),
      signals,
      performanceOverview,
    });
  } catch (err) {
    next(err);
  }
};


export const getAllSignals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      botId,
      direction,
      limit = 50,
      page = 1,
      startDate,
      endDate,
      date,
      today,
      yesterday,
      thisWeek,
      thisMonth,
    } = req.query;

    const query: any = {};
    if (botId) query.botId = botId;
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    if (query.botId && typeof query.botId === "string") {
      query.botId = new mongoose.Types.ObjectId(query.botId);
    }

    if (
      startDate ||
      endDate ||
      date ||
      (today && ["true", "1", "yes"].includes(today as string)) ||
      (yesterday && ["true", "1", "yes"].includes(yesterday as string)) ||
      (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) ||
      (thisMonth && ["true", "1", "yes"].includes(thisMonth as string))
    ) {
      query.signalTime = {};

      const validateDate = (dateStr: string, paramName: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new AppError(
            `Invalid ${paramName} format. Please use ISO date format (YYYY-MM-DD)`,
            400,
            "invalid-date-format"
          );
        }
        return date;
      };

      if (date) {
        const targetDate = validateDate(date as string, "date");
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query.signalTime.$gte = targetDate;
        query.signalTime.$lt = nextDay;
      }

      if (startDate) {
        query.signalTime.$gte = validateDate(startDate as string, "startDate");
      }
      if (endDate) {
        const endDateTime = validateDate(endDate as string, "endDate");
        endDateTime.setDate(endDateTime.getDate() + 1);
        query.signalTime.$lt = endDateTime;
      }

      if (today && ["true", "1", "yes"].includes(today as string)) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = todayStart;
        query.signalTime.$lte = todayEnd;
      }

      if (yesterday && ["true", "1", "yes"].includes(yesterday as string)) {
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date();
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = yesterdayStart;
        query.signalTime.$lte = yesterdayEnd;
      }

      if (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        query.signalTime.$gte = startOfWeek;
      }

      if (thisMonth && ["true", "1", "yes"].includes(thisMonth as string)) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        query.signalTime.$gte = startOfMonth;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const signals = await Signal.find(query)
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalSignals = await Signal.countDocuments(query);

    const overviewAgg = await Signal.aggregate([
      { $match: query },
      { $sort: { signalTime: 1 } },
      {
        $group: {
          _id: null,
          totalSignals: { $sum: 1 },
          totalLongSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "LONG"] }, 1, 0] },
          },
          totalShortSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "SHORT"] }, 1, 0] },
          },
          highestProfit: { $max: "$profitLoss" },
          highestLoss: { $min: "$profitLoss" },
          totalPnL: { $sum: "$profitLoss" },
          signals: { $push: { profitLoss: "$profitLoss" } },
        },
      },
      {
        $addFields: {
          consecutiveWins: {
            $let: {
              vars: {
                winStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $gt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $gt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$winStreaks.maxStreak",
            },
          },
          consecutiveLosses: {
            $let: {
              vars: {
                lossStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $lt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $lt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$lossStreaks.maxStreak",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSignals: 1,
          totalLongSignals: 1,
          totalShortSignals: 1,
          highestProfit: 1,
          highestLoss: 1,
          totalPnL: 1,
          consecutiveWins: 1,
          consecutiveLosses: 1,
        },
      },
    ]);

    const overview = overviewAgg[0] || {
      totalSignals: 0,
      totalLongSignals: 0,
      totalShortSignals: 0,
      highestProfit: 0,
      highestLoss: 0,
      totalPnL: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };

    const transformedSignals = signals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;

      if (transformedSignal.botId) {
        transformedSignal.bot = {
          id: transformedSignal.botId._id,
          name: transformedSignal.botId.name,
        };
        delete transformedSignal.botId;
      }

      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: transformedSignals,
      performanceOverview: overview,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalSignals / Number(limit)),
        totalSignals,
        hasNextPage: skip + signals.length < totalSignals,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};


export const getUserSignals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError("Unauthorized access", 401, "unauthorized"));
    }

    const subscriptions = await BotSubscription.find({ userId }).select("botId");
    const subscribedBotIds = subscriptions.map((sub) => sub.botId);

    const userSignals = await Signal.find({ botId: { $in: subscribedBotIds } })
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 });

    const transformedSignals = userSignals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;

      if (transformedSignal.botId) {
        transformedSignal.bot = {
          id: transformedSignal.botId._id,
          name: transformedSignal.botId.name,
        };
        delete transformedSignal.botId;
      }

      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: transformedSignals,
    });
  } catch (error) {
    return next(error);
  }
};



createSignal
createSignalsInBulk
getSignalById
updateSignalById
deleteSignalById
getSignalsByBot
getAllSignals
getUserSignals