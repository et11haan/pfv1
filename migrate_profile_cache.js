import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

// Load environment variables
dotenv.config();

async function migrateProfileCacheFields() {
  try {
    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Migration] Connected to MongoDB successfully.');

    // Find all users that don't have the new cache fields
    const usersToUpdate = await User.find({
      $or: [
        { cachedProfilePicture: { $exists: false } },
        { profilePictureLastCached: { $exists: false } }
      ]
    });

    console.log(`[Migration] Found ${usersToUpdate.length} users to update with cache fields.`);

    if (usersToUpdate.length === 0) {
      console.log('[Migration] No users need migration. All users already have cache fields.');
      return;
    }

    // Update users in batches
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < usersToUpdate.length; i += batchSize) {
      const batch = usersToUpdate.slice(i, i + batchSize);
      const userIds = batch.map(user => user._id);

      await User.updateMany(
        { _id: { $in: userIds } },
        {
          $set: {
            cachedProfilePicture: null,
            profilePictureLastCached: null
          }
        }
      );

      updated += batch.length;
      console.log(`[Migration] Updated ${updated}/${usersToUpdate.length} users...`);
    }

    console.log(`[Migration] Successfully updated ${updated} users with cache fields.`);
    console.log('[Migration] Migration completed successfully!');

  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('[Migration] Database connection closed.');
  }
}

// Run the migration
migrateProfileCacheFields(); 