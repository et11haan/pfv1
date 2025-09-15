/**
 * Script to remove the 'votes' field from all documents in the comments collection.
 * Usage: node scripts/clear_comment_votes.js
 * Requires a valid MongoDB connection string in .env.
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = uri.split('/').pop().split('?')[0]; // crude way to get DB name

/**
 * Connects to the database and removes the 'votes' field from all comments.
 * Logs the number of modified documents.
 */
async function clearVotesField() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const comments = db.collection('comments');
    const result = await comments.updateMany(
      { votes: { $exists: true } },
      { $unset: { votes: "" } }
    );
    console.log(`Removed 'votes' field from ${result.modifiedCount} comments.`);
  } catch (err) {
    console.error('Error clearing votes field:', err);
  } finally {
    await client.close();
  }
}

clearVotesField(); 