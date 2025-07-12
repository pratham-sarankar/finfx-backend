import "dotenv/config";
import mongoose from "mongoose";
import Bot from "../models/Bot";

/**
 * Migration: Remove Group support from Bot entities
 *
 * This migration:
 * - Removes the groupId field from all bots
 * - Cleans up the database to support direct bot subscriptions
 */
export async function removeGroupSupportMigration() {
  try {
    console.log(
      "Starting migration: Remove Group support from Bot entities..."
    );

    // Get all existing bots
    const bots = await Bot.find({});
    console.log(`Found ${bots.length} existing bots to update`);

    // Use native MongoDB operations to remove groupId field from all bots
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }
    const collection = db.collection("bots");

    const result = await collection.updateMany(
      { groupId: { $exists: true } },
      { $unset: { groupId: 1 } }
    );

    console.log(
      `Successfully removed groupId from ${result.modifiedCount} bots`
    );
    console.log("Migration completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      botsUpdated: result.modifiedCount,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/zyrotech";

  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB");

      await removeGroupSupportMigration();

      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to connect to MongoDB:", error);
      process.exit(1);
    });
}
