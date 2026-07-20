require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Complaint = require('../models/Complaint');
    const db = mongoose.connection.db;
    const collName = Complaint.collection.collectionName;

    const existing = await db.listCollections({ name: collName }).toArray();
    if (existing.length) {
      console.log(`Collection ${collName} already exists.`);
    } else {
      console.log(`Creating collection: ${collName}`);
      await Complaint.createCollection();
      console.log('Collection created and indexes ensured.');
    }

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Error creating complaint collection:', err);
    process.exit(1);
  }
}

main();
