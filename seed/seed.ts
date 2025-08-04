import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import User from "../src/models/User";
import Bot from "../src/models/Bot";
import Signal from "../src/models/Signal";
import Broker from "../src/models/Broker";
import Package from "../src/models/Package";
import BotPackage from "../src/models/BotPackage";

async function seed() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/zyrotech"
    );
    console.log("Connected to MongoDB");

    // 1. Seed test user
    const testUser = {
      _id: new mongoose.Types.ObjectId("686d338fc39deb504d02331c"),
      email: "test@yopmail.com",
      password: await bcrypt.hash("Test@123", 10),
      fullName: "Test User",
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await User.findOneAndUpdate({ email: testUser.email }, testUser, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
    console.log("Seeded test user");

    // 2. Seed bots
    const bots = [
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5479"),
        name: "Forex",
        description:
          "A high-frequency trading bot focused on global currency pairs. It identifies arbitrage opportunities, monitors geopolitical signals, and automates trades in the foreign exchange market.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Commodities",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5480"),
        name: "Comex",
        description:
          "A smart trading bot optimized for precious metals like gold and silver. It uses supply-demand models, macroeconomic indicators, and trend momentum to generate trading signals.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Commodities",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5483"),
        name: "Crypto",
        description:
          "An AI-powered trading bot specialized in cryptocurrency markets. It adapts to high volatility, leverages sentiment analysis, and executes real-time trades across major digital assets.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Commodities",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5481"),
        name: "US Stocks",
        description:
          "A data-driven trading bot designed for the US equity market. It analyzes financial reports, earnings trends, and market sentiment to execute trades on top-performing stocks.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Currency",
      },
    ];

    const seededBots: any[] = [];
    for (const bot of bots) {
      // Remove groupName from bot data before seeding
      const { groupName, ...botData } = bot;
      const seededBot = await Bot.findOneAndUpdate({ _id: bot._id }, botData, {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      });
      seededBots.push(seededBot);
    }
    console.log("Seeded bots");

    // 3. Seed brokers
    const brokersPath = path.join(__dirname, "data", "brokers.json");
    const brokersData = JSON.parse(fs.readFileSync(brokersPath, "utf8"));

    console.log(`Loading ${brokersData.length} brokers from brokers.json`);

    try {
      await Broker.insertMany(brokersData, { ordered: false });
      console.log("Seeded brokers");
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error, ignore or log
        console.warn("Some brokers already exist, skipping duplicates.");
      } else {
        console.error("Failed to seed brokers:", error);
      }
    }

    // 4. Seed signals
const signalsPath = path.join(__dirname, "data", "signals.json");
const signalsData = JSON.parse(fs.readFileSync(signalsPath, "utf8"));
console.log(`Loading ${signalsData.length} signals from signals.json`);

for (const bot of seededBots) {
  console.log(`Seeding signals for bot: ${bot.name} (${bot._id})`);

  for (const signal of signalsData) {
    const uniqueTradeId = `${signal.tradeId}_${bot.name.replace(/[^a-zA-Z0-9]/g, "")}`;

        const signalData = {
          botId: bot._id,
          tradeId: uniqueTradeId,
          direction: signal.direction,
          pairName: signal.pairName, 
          signalTime: new Date(signal.signalTime),
          entryTime: new Date(signal.entryTime),
          entryPrice: signal.entryPrice,
          stoploss: signal.stoploss,
          target1r: signal.target1r,
          target2r: signal.target2r,
          exitTime: signal.exitTime ? new Date(signal.exitTime) : undefined,
          exitPrice: signal.exitPrice,
          exitReason: signal.exitReason,
          profitLoss: signal.profitLoss,
          profitLossR: signal.profitLossR,
          trailCount: signal.trailCount,
          createdAt: new Date(signal.createdAt),
          updatedAt: new Date(signal.updatedAt),
        };

    try {
      await Signal.findOneAndUpdate(
        { botId: bot._id, tradeId: uniqueTradeId },
        signalData,
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      console.warn(`Failed to seed signal ${uniqueTradeId} for bot ${bot.name}:`, error);
    }
  }

  console.log(`Completed seeding signals for bot: ${bot.name}`);
}

console.log("Seeded signals for all bots");


    // 5. Seed packages from packages.json instead of hardcoded array
    const packagesPath = path.join(__dirname, "data", "packages.json");
    const packagesData = JSON.parse(fs.readFileSync(packagesPath, "utf8"));
    const seededPackages: any[] = [];
    for (const pkg of packagesData) {
      const seededPkg = await Package.findOneAndUpdate(
        { name: pkg.name },
        pkg,
        { upsert: true, setDefaultsOnInsert: true, new: true }
      );
      seededPackages.push(seededPkg);
    }
    console.log("Seeded packages from packages.json");

    // 6. Seed initial BotPackage prices for each bot and package
    // Example price logic: Monthly=100, Quarterly=270, Half Yearly=500, Yearly=900 (can be customized)
    const priceMap: Record<string, number> = {
      "Monthly": 100,
      "Quarterly": 270,
      "Half Yearly": 500,
      "Yearly": 900,
    };
    for (const bot of seededBots) {
      for (const pkg of seededPackages) {
        const price = priceMap[pkg.name] || 100;
        await BotPackage.findOneAndUpdate(
          { botId: bot._id, packageId: pkg._id },
          { botId: bot._id, packageId: pkg._id, price },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }
    console.log("Seeded initial BotPackage prices for each bot");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();


