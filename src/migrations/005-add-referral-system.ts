import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User";
import GlobalSettings from "../models/GlobalSettings";
import { generateUniqueReferralCode, DEFAULT_REFERRAL_POLICY } from "../utils/referralUtils";

/**
 * Migration: Add referral system fields to User schema
 *
 * This migration:
 * - Adds referralCode field to all existing users
 * - Adds referralRewardPolicy field to all existing users  
 * - Creates global default referral policy setting
 * - Ensures all users have unique referral codes
 */
export async function addReferralSystemMigration() {
  try {
    console.log("Starting migration: Add referral system fields...");

    // First, ensure the global default referral policy exists
    const existingGlobalDefault = await GlobalSettings.findOne({ key: 'defaultReferralPolicy' });
    if (!existingGlobalDefault) {
      await GlobalSettings.create({
        key: 'defaultReferralPolicy',
        value: DEFAULT_REFERRAL_POLICY,
        description: 'Default referral reward policy for new users'
      });
      console.log("Created global default referral policy setting");
    } else {
      console.log("Global default referral policy already exists");
    }

    // Get all existing users that don't have referral fields
    const usersWithoutReferral = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: "" },
        { referralRewardPolicy: { $exists: false } },
        { referralRewardPolicy: null }
      ]
    });

    console.log(`Found ${usersWithoutReferral.length} users to update with referral data`);

    if (usersWithoutReferral.length === 0) {
      console.log("No users need referral data updates");
      return {
        success: true,
        totalUsers: 0,
        updatedUsers: 0,
      };
    }

    let updatedCount = 0;
    const batchSize = 10; // Process in small batches to avoid overwhelming the system

    // Process users in batches
    for (let i = 0; i < usersWithoutReferral.length; i += batchSize) {
      const batch = usersWithoutReferral.slice(i, i + batchSize);
      
      const updatePromises = batch.map(async (user) => {
        try {
          const updateData: any = {};

          // Generate referral code if missing
          if (!user.referralCode) {
            updateData.referralCode = await generateUniqueReferralCode();
          }

          // Set referral reward policy if missing
          if (!user.referralRewardPolicy) {
            updateData.referralRewardPolicy = DEFAULT_REFERRAL_POLICY;
          }

          if (Object.keys(updateData).length > 0) {
            console.log(`Updating user ${user.email} with referral data:`, updateData);
            
            const result = await User.findByIdAndUpdate(
              user._id,
              { $set: updateData },
              { new: true, runValidators: false }
            );

            if (result) {
              updatedCount++;
              return result;
            }
          }

          return user;
        } catch (error) {
          console.error(`Failed to update user ${user.email}:`, error);
          throw error;
        }
      });

      await Promise.all(updatePromises);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}`);
    }

    console.log(`Successfully updated ${updatedCount} users with referral data`);
    console.log("Migration completed successfully!");

    return {
      success: true,
      totalUsers: usersWithoutReferral.length,
      updatedUsers: updatedCount,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function to remove referral system fields
 * Use this only if you need to revert the migration
 */
export async function rollbackReferralSystemMigration() {
  try {
    console.log("Starting rollback: Remove referral system fields...");

    // Remove global default referral policy
    await GlobalSettings.deleteOne({ key: 'defaultReferralPolicy' });
    console.log("Removed global default referral policy setting");

    // Remove referral fields from all users
    const result = await User.updateMany(
      {},
      {
        $unset: {
          referralCode: 1,
          referralRewardPolicy: 1,
        },
      }
    );

    console.log(`Successfully removed referral fields from ${result.modifiedCount} users`);
    console.log("Rollback completed successfully!");

    return {
      success: true,
      modifiedUsers: result.modifiedCount,
    };
  } catch (error) {
    console.error("Rollback failed:", error);
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

      const command = process.argv[2];

      if (command === "rollback") {
        await rollbackReferralSystemMigration();
      } else {
        await addReferralSystemMigration();
      }

      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to connect to MongoDB:", error);
      process.exit(1);
    });
}