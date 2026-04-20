const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("../models/Admin");

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "jack@gmail.com" });
    if (existingAdmin) {
      console.log("Admin already exists with email:", existingAdmin.email);
      process.exit(0);
    }
    
    // Remove old admin if exists
    await Admin.deleteMany({});

    // Create new admin
    const admin = await Admin.create({
      name: "Jack",
      email: "jack@gmail.com",
      password: "jack123", // This will be hashed by the pre-save hook
      role: "admin",
      permissions: [
        "manage_users",
        "manage_courses",
        "view_analytics",
        "manage_payments",
      ],
    });

    console.log("✅ Admin seeded successfully!");
    console.log("Admin Details:");
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Permissions: ${admin.permissions.join(", ")}`);
    console.log("\nYou can now login with:");
    console.log("  Email: jack@gmail.com");
    console.log("  Password: jack123");
    console.log("  Role: admin");

    process.exit(0);
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
};

seedAdmin();
