/**
 * Script to delete all documents from the comments collection in the database.
 * Usage: node wipe-comments.js
 * Requires a valid database connection.
 */
import { connectToDatabase, closeDatabase } from './db/connection.js';

/**
 * Connects to the database and deletes all comments.
 * Logs the process and closes the connection.
 */
async function wipeComments() {
  console.log('[WipeScript] Connecting to database...');
  let db;
  try {
    // Use the existing connectToDatabase function which should return { db }
    const connection = await connectToDatabase();
    db = connection.db; // Assuming connectToDatabase returns an object with a db property
    console.log('[WipeScript] Connected. Accessing comments collection...');

    const commentsCollection = db.collection('comments');
    
    console.log('[WipeScript] Deleting all documents from comments collection...');
    const deleteResult = await commentsCollection.deleteMany({});
    
    console.log(`[WipeScript] Successfully deleted ${deleteResult.deletedCount} comments.`);

  } catch (error) {
    console.error('[WipeScript] Error during comment wipe process:', error);
    process.exitCode = 1; // Indicate failure
  } finally {
    if (db) { // Ensure db object exists before trying to close
      console.log('[WipeScript] Closing database connection...');
      await closeDatabase(); // Use the existing closeDatabase function
      console.log('[WipeScript] Database connection closed.');
    }
  }
}

// Run the wipe function
wipeComments(); 