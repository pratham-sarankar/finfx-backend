/**
 * Signal Controller
 * Handles signal management operations
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import Signal from "../models/Signal";
import Bot from "../models/Bot";
import BotSubscription from "../models/BotSubscription";
import mongoose from "mongoose";
import User from "../models/User";

/**
 * Create a new signal
 * @route POST /api/signals
 */
export const createSignal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      userId,
      lotSize,
      stopLossPrice,
      targetPrice,
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
      pairName
    } = req.body;

    // Validate required fields - only entryTime, entryPrice, and direction are required
    if (!entryTime || !entryPrice || !direction) {
      throw new AppError(
        "Please provide entryTime, entryPrice, and direction",
        400,
        "missing-required-fields"
      );
    }

    if(!pairName){
      throw new AppError(
        "Please provide Pair Name",
        400,
        "missing-pair-name"
      );
    }

    // Validate direction
    if (!["LONG", "SHORT"].includes(direction)) {
      throw new AppError(
        "Direction must be either LONG or SHORT",
        400,
        "invalid-direction"
      );
    }

    // -------- NEW FIELD VALIDATION --------
    // Check if User exists (userId required)
    if (!userId) {
      throw new AppError("userId is required", 400, "user-id-required");
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    // Validate lotSize
    if (lotSize === undefined || lotSize === null) {
      throw new AppError("lotSize is required", 400, "lot-size-required");
    }
    if (typeof lotSize !== "number") {
      throw new AppError("lotSize must be a number", 400, "lot-size-invalid-type");
    }
    if (lotSize < 0.1) {
      throw new AppError("lotSize must be at least 0.1", 400, "lot-size-too-small");
    }
    // ---------------------------------------

    // Check if bot exists (if botId is provided)
    if (botId) {
      const bot = await Bot.findById(botId);
      if (!bot) {
        throw new AppError("Bot not found", 404, "bot-not-found");
      }
    }

    // Auto-generate tradeId if not provided
    let finalTradeId = tradeId;
    if (!finalTradeId) {
      finalTradeId = `TRADE_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    // Check if signal with same tradeId already exists for this bot (if botId is provided)
    if (botId && finalTradeId) {
      const existingSignal = await Signal.findOne({
        botId,
        tradeId: finalTradeId,
      });
      if (existingSignal) {
        throw new AppError(
          "Signal with this trade ID already exists for this bot",
          409,
          "duplicate-trade-id"
        );
      }
    }

    // Prepare signal data with defaults for optional fields
    const signalData: any = {
      direction,
      entryTime: new Date(entryTime),
      entryPrice,
      pairName,
    };

    // Add optional fields if provided
    if (botId) signalData.botId = botId;
    if (finalTradeId) signalData.tradeId = finalTradeId;
    if (signalTime) signalData.signalTime = new Date(signalTime);
    if (stopLossPrice !== undefined) signalData.stopLossPrice = stopLossPrice;
    if (targetPrice !== undefined) signalData.targetPrice = targetPrice;
    if (stoploss !== undefined) signalData.stoploss = stoploss;
    if (target1r !== undefined) signalData.target1r = target1r;
    if (target2r !== undefined) signalData.target2r = target2r;
    if (exitTime) signalData.exitTime = new Date(exitTime);
    if (exitPrice !== undefined) signalData.exitPrice = exitPrice;
    if (exitReason !== undefined) signalData.exitReason = exitReason;
    if (profitLoss !== undefined) signalData.profitLoss = profitLoss;
    if (profitLossR !== undefined) signalData.profitLossR = profitLossR;
    if (trailCount !== undefined) signalData.trailCount = trailCount;

    // Create new signal
    const signal = await Signal.create(signalData);

    // Transform response
    const transformedSignal: any = {
      ...signal.toObject(),
      id: signal._id,
    };
    delete transformedSignal._id;
    delete transformedSignal.__v;

    // Transform botId to bot format
    if (transformedSignal.botId) {
      transformedSignal.bot = {
        id: transformedSignal.botId._id,
        name: transformedSignal.botId.name,
      };
      delete transformedSignal.botId;
    }

    res.status(201).json({
      status: "success",
      message: "Signal created successfully",
      data: transformedSignal,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create multiple signals in bulk for a bot
 * @route POST /api/signals/bulk
 */
export const createBulkSignals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    const signalsData = signals.map((signal) => ({
      botId,
      tradeId: signal.tradeId,
      pairName: signal.pairName,
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

    for (const signal of signals) {
      if (!signal.pairName) {
        throw new AppError("Each signal must include pairName", 400, "missing-pair-name");
      }
    }

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

/**
 * Helper function to validate dates and build date query
 */
const buildDateQuery = (queryParams: any) => {
  const {
    startDate,
    endDate,
    date,
    today,
    yesterday,
    thisWeek,
    thisMonth,
  } = queryParams;

  const dateQuery: any = {};

  if (
    startDate ||
    endDate ||
    date ||
    (today && ["true", "1", "yes"].includes(today as string)) ||
    (yesterday && ["true", "1", "yes"].includes(yesterday as string)) ||
    (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) ||
    (thisMonth && ["true", "1", "yes"].includes(thisMonth as string))
  ) {
    dateQuery.signalTime = {};

    // Validate date parameters
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

    // Exact date filter
    if (date) {
      const targetDate = validateDate(date as string, "date");
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      dateQuery.signalTime.$gte = targetDate;
      dateQuery.signalTime.$lt = nextDay;
    }

    // Date range filter
    if (startDate) {
      dateQuery.signalTime.$gte = validateDate(startDate as string, "startDate");
    }
    if (endDate) {
      const endDateTime = validateDate(endDate as string, "endDate");
      endDateTime.setDate(endDateTime.getDate() + 1); // Include the entire end date
      dateQuery.signalTime.$lt = endDateTime;
    }

    // Common date range filters
    if (today && ["true", "1", "yes"].includes(today as string)) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      dateQuery.signalTime.$gte = todayStart;
      dateQuery.signalTime.$lte = todayEnd;
    }

    if (yesterday && ["true", "1", "yes"].includes(yesterday as string)) {
      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date();
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);

      dateQuery.signalTime.$gte = yesterdayStart;
      dateQuery.signalTime.$lte = yesterdayEnd;
    }

    if (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      dateQuery.signalTime.$gte = startOfWeek;
    }

    if (thisMonth && ["true", "1", "yes"].includes(thisMonth as string)) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      dateQuery.signalTime.$gte = startOfMonth;
    }
  }

  return dateQuery;
};

/**
 * Helper function to get performance overview using aggregation
 */
const getPerformanceOverview = async (query: any) => {
  const overviewAgg = await Signal.aggregate([
    { $match: query },
    { $sort: { signalTime: 1 } }, // Sort by signal time to track consecutive streaks
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

  return overviewAgg[0] || {
    totalSignals: 0,
    totalLongSignals: 0,
    totalShortSignals: 0,
    highestProfit: 0,
    highestLoss: 0,
    totalPnL: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
  };
};

// /**
//  * Get all signals with optional filtering
//  * @route GET /api/signals
//  */
// export const getAllSignals = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const {
//       botId,
//       direction,
//       limit = 50,
//       page = 1,
//     } = req.query;

//     // Build query
//     const query: any = {};
//     if (botId) query.botId = botId;
//     if (direction && ["LONG", "SHORT"].includes(direction as string)) {
//       query.direction = direction;
//     }

//     // Convert botId to ObjectId if it's a string (for aggregation compatibility)
//     if (query.botId && typeof query.botId === "string") {
//       query.botId = new mongoose.Types.ObjectId(query.botId);
//     }

//     // Add date filtering
//     const dateQuery = buildDateQuery(req.query);
//     Object.assign(query, dateQuery);

//     // Pagination
//     const skip = (Number(page) - 1) * Number(limit);

//     // Get signals with pagination
//     const signals = await Signal.find(query)
//       .populate("botId", "name")
//       .select("-__v")
//       .sort({ signalTime: -1 })
//       .skip(skip)
//       .limit(Number(limit));

//     // Get total count for pagination
//     const totalSignals = await Signal.countDocuments(query);

//     // Get performance overview
//     const overview = await getPerformanceOverview(query);

//     // Transform response
//     const transformedSignals = signals.map((signal) => {
//       const transformedSignal: any = {
//         ...signal.toObject(),
//         id: signal._id,
//       };
//       delete transformedSignal._id;

//       // Transform botId to bot format
//       if (transformedSignal.botId) {
//         transformedSignal.bot = {
//           id: transformedSignal.botId._id,
//           name: transformedSignal.botId.name,
//         };
//         delete transformedSignal.botId;
//       }

//       return transformedSignal;
//     });

//     res.status(200).json({
//       status: "success",
//       data: transformedSignals,
//       performanceOverview: overview,
//       pagination: {
//         currentPage: Number(page),
//         totalPages: Math.ceil(totalSignals / Number(limit)),
//         totalSignals,
//         hasNextPage: skip + signals.length < totalSignals,
//         hasPrevPage: Number(page) > 1,
//       },
//     });
//   } catch (error) {
//     return next(error);
//   }
// };

/**
 * Get all signals with pagination and optional search
 * @route GET /api/signals?limit=10&page=1&search=btc
 * @access Private (Admin/User)
 * @param {Request} req - Express request object with optional query params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with paginated signal data
 * @description Retrieves signals with pagination and search support.
 * Search filters by pairName or botName.
 */
export const getAllSignals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse query params
    let limit = parseInt(req.query.limit as string, 10);
    let page = parseInt(req.query.page as string, 10);
    const search = req.query.search as string;

    // Defaults
    limit = isNaN(limit) || limit <= 0 ? 10 : limit;
    page = isNaN(page) || page <= 0 ? 1 : page;

    // Build search query
    const query: any = {};
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { pairName: { $regex: escaped, $options: "i" } },
        { botName: { $regex: escaped, $options: "i" } },
      ];
    }

    // Count total signals
    const totalSignals = await Signal.countDocuments(query);
    const totalPages = Math.ceil(totalSignals / limit);

    // If page out of range, return empty
    if (page > totalPages && totalPages !== 0) {
      res.status(200).json({
        success: true,
        data: [],
        page,
        perPage: limit,
        totalPages,
        totalSignals,
      });
    }

    // Fetch signals with pagination
    const signals = await Signal.find(query)
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Transform signals (replace _id with id)
    const transformedSignals = signals.map((signal) => {
      const obj: any = signal.toObject();
      obj.id = obj._id;
      delete obj._id;

      if (obj.botId) {
        obj.bot = {
          id: obj.botId._id,
          name: obj.botId.name,
        };
        delete obj.botId;
      }

      return obj;
    });

     res.status(200).json({
      success: true,
      data: transformedSignals,
      page,
      perPage: limit,
      totalPages,
      totalSignals,
    });
  } catch (error) {
    return next(error);
  }
};


/**
 * Get all signals from bots the user has subscribed to
 * @route GET /api/signals/user
 */
export const getUserSignals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      direction,
      limit = 50,
      page = 1,
      status, // 'opened' or 'closed'
    } = req.query;

    // Get user ID from auth middleware
    const userId = req.user.id;

    // Get all active bot subscriptions for the user
    const userSubscriptions = await BotSubscription.find({
      userId: userId,
      status: "active",
    }).select("botId");

    const activeBotsCount = userSubscriptions.length;

    if (userSubscriptions.length === 0) {
      res.status(200).json({
        status: "success",
        data: [],
        activeBotsCount: 0,
        performanceOverview: {
          totalSignals: 0,
          totalLongSignals: 0,
          totalShortSignals: 0,
          highestProfit: 0,
          highestLoss: 0,
          totalPnL: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
        },
        pagination: {
          currentPage: Number(page),
          totalPages: 0,
          totalSignals: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
      return;
    }

    // Extract bot IDs from subscriptions
    const botIds = userSubscriptions.map((sub) => sub.botId);

    // Build query
    const query: any = { botId: { $in: botIds } };
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    // Status filtering (opened vs closed signals)
    if (status && ["opened", "closed"].includes(status as string)) {
      if (status === "opened") {
        // Opened signals: no exitTime or exitPrice
        query.$or = [
          { exitTime: { $exists: false } },
          { exitTime: null },
          { exitPrice: { $exists: false } },
          { exitPrice: null },
        ];
      } else if (status === "closed") {
        // Closed signals: have both exitTime and exitPrice
        query.exitTime = { $exists: true, $ne: null };
        query.exitPrice = { $exists: true, $ne: null };
      }
    }

    // Add date filtering
    const dateQuery = buildDateQuery(req.query);
    Object.assign(query, dateQuery);

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get signals with pagination
    const signals = await Signal.find(query)
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

    // Get performance overview
    const overview = await getPerformanceOverview(query);

    // Transform response
    const transformedSignals = signals.map((signal) => {
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

      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: transformedSignals,
      activeBotsCount: activeBotsCount,
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

/**
 * Get a specific signal by ID
 * @route GET /api/signals/:id
 */
export const getSignalById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

/**
 * Update a signal by ID
 * @route PUT /api/signals/:id
 */
export const updateSignal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
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
      pairName,
    } = req.body;

    // Check if signal exists
    const existingSignal = await Signal.findById(id);
    if (!existingSignal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    // Validate direction if provided
    if (direction && !["LONG", "SHORT"].includes(direction)) {
      throw new AppError(
        "Direction must be either LONG or SHORT",
        400,
        "invalid-direction"
      );
    }

    // Validate pairName length if provided
    if (pairName && (pairName.length < 3 || pairName.length > 50)) {
      throw new AppError(
        "Pair name must be between 3 and 50 characters",
        400,
        "invalid-pair-name"
      );
    }

    // Prepare update object
    const updateData: any = {};
    if (direction) updateData.direction = direction;
    if (signalTime) updateData.signalTime = new Date(signalTime);
    if (entryTime) updateData.entryTime = new Date(entryTime);
    if (entryPrice !== undefined) updateData.entryPrice = entryPrice;
    if (stoploss !== undefined) updateData.stoploss = stoploss;
    if (target1r !== undefined) updateData.target1r = target1r;
    if (target2r !== undefined) updateData.target2r = target2r;
    if (exitTime) updateData.exitTime = new Date(exitTime);
    if (exitPrice !== undefined) updateData.exitPrice = exitPrice;
    if (exitReason !== undefined) updateData.exitReason = exitReason;
    if (profitLoss !== undefined) updateData.profitLoss = profitLoss;
    if (profitLossR !== undefined) updateData.profitLossR = profitLossR;
    if (trailCount !== undefined) updateData.trailCount = trailCount;
    if (pairName) updateData.pairName = pairName;

    // Update signal
    const signal = await Signal.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("botId", "name")
      .select("-__v");

    if (!signal) {
      throw new AppError(
        "Failed to update signal",
        500,
        "signal-update-failed"
      );
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
      message: "Signal updated successfully",
      data: transformedSignal,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete a signal by ID
 * @route DELETE /api/signals/:id
 */
export const deleteSignal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const signal = await Signal.findByIdAndDelete(id);

    if (!signal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    res.status(200).json({
      status: "success",
      message: "Signal deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all signals for a specific bot
 * @route GET /api/signals/bot/:botId
 */
export const getSignalsByBot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { botId } = req.params;
    const {
      direction,
      limit = 50,
      page = 1,
    } = req.query;

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Build query
    const query: any = { botId };
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    // Convert botId to ObjectId if it's a string (for aggregation compatibility)
    if (query.botId && typeof query.botId === "string") {
      query.botId = new mongoose.Types.ObjectId(query.botId);
    }

    // Add date filtering
    const dateQuery = buildDateQuery(req.query);
    Object.assign(query, dateQuery);

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get signals with pagination
    const signals = await Signal.find(query)
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

    // Get performance overview
    const overview = await getPerformanceOverview(query);

    // Transform response
    const transformedSignals = signals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;
      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: {
        bot: {
          id: bot._id,
          name: bot.name,
        },
        signals: transformedSignals,
        performanceOverview: overview,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalSignals / Number(limit)),
          totalSignals,
          hasNextPage: skip + signals.length < totalSignals,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};