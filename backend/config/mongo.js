// MongoDB connection — flexible-schema storage for ticket conversation
// threads (messages, attachments) where structure varies ticket-to-ticket,
// unlike the fixed relational shape of the Postgres `tickets` table.
const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/smartdesk";
  await mongoose.connect(uri);
  console.log("[mongo] connected");
}

module.exports = { connectMongo, mongoose };
