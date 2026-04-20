require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const SuspensionInquiry = require('../models/SuspensionInquiry');
    const db = mongoose.connection.db;
    const collName = SuspensionInquiry.collection.collectionName;

    const existing = await db.listCollections({ name: collName }).toArray();
    if (existing.length) {
      console.log(`Dropping collection: ${collName}`);
      await db.dropCollection(collName);
    } else {
      console.log(`Collection ${collName} does not exist; skipping drop.`);
    }

    console.log(`Creating collection: ${collName}`);
    await SuspensionInquiry.createCollection();
    console.log('Collection created and indexes ensured.');

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Error resetting suspension collection:', err);
    process.exit(1);
  }
}

main();
