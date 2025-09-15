import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parts_marketplace';
const DB_NAME = 'parts_marketplace';

let cachedClient = null;
let cachedDb = null;

/**
 * Connects to the MongoDB database and returns the client and db objects.
 * Uses cached connection if available.
 * @returns {Promise<{ client: MongoClient, db: Db }>}
 * @throws {Error} If connection fails
 */
export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    cachedClient = client;
    cachedDb = db;

    console.log('Successfully connected to MongoDB');
    return { client, db };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Closes the cached MongoDB connection, if open.
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
} 