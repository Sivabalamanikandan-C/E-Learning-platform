#!/usr/bin/env node

/**
 * Cleanup Script: Remove localhost URLs from courses
 * 
 * Usage:
 *   cd server
 *   node cleanup-localhost-urls.js
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Finds courses with localhost URLs in thumbnail
 * 3. Removes or fixes the localhost URLs
 * 4. Reports what was changed
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Course = require("./models/Course");

async function cleanupLocalhostUrls() {
  try {
    console.log("\n🧹 Starting cleanup of localhost URLs...\n");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    // Find courses with localhost URLs
    console.log("🔍 Searching for courses with localhost URLs...");
    const coursesWithLocalhost = await Course.find({
      thumbnail: { $regex: "localhost" },
    });

    if (coursesWithLocalhost.length === 0) {
      console.log("✓ No courses with localhost URLs found!\n");
      console.log("✨ Database is clean.\n");
      return;
    }

    console.log(
      `Found ${coursesWithLocalhost.length} course(s) with localhost URLs:\n`
    );

    // Show what will be cleaned
    coursesWithLocalhost.forEach((course, index) => {
      console.log(`  ${index + 1}. "${course.title}"`);
      console.log(`     Current thumbnail: ${course.thumbnail}`);
      console.log("");
    });

    // Update courses - remove localhost URLs
    console.log("🔧 Removing localhost URLs...");
    const result = await Course.updateMany(
      { thumbnail: { $regex: "localhost" } },
      { $set: { thumbnail: "" } }
    );

    console.log(
      `✓ Updated ${result.modifiedCount} course(s)\n`
    );

    // Verify cleanup
    console.log("✅ Verifying cleanup...");
    const remaining = await Course.find({
      thumbnail: { $regex: "localhost" },
    });

    if (remaining.length === 0) {
      console.log("✓ All localhost URLs removed!\n");
      console.log("✨ Database cleanup complete!\n");
    } else {
      console.log(`⚠️  Warning: ${remaining.length} course(s) still have localhost URLs\n`);
    }

    // Show summary
    console.log("📊 Summary:");
    console.log(`   • Courses processed: ${coursesWithLocalhost.length}`);
    console.log(`   • Localhost URLs removed: ${result.modifiedCount}`);
    console.log(`   • Remaining issues: ${remaining.length}\n`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    console.error("\n⚠️  Make sure:");
    console.error("   1. MongoDB is running");
    console.error("   2. MONGO_URI is set correctly in .env");
    console.error("   3. You're in the server directory\n");
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB\n");
    process.exit(0);
  }
}

// Run the cleanup
cleanupLocalhostUrls();
