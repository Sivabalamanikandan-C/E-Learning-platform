const mongoose = require('mongoose');
const Course = require('../models/Course');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/elearn';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  try {
    const res = await Course.updateMany(
      { 'quiz.availableFrom': { $exists: true } },
      { $unset: { 'quiz.availableFrom': "", 'quiz.availableUntil': "" } }
    );

    console.log('Update result:', res);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
