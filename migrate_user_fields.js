import dotenv from 'dotenv';
dotenv.config();
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = uri.split('/').pop().split('?')[0];

async function migrate() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    // Migrate comments
    const comments = await db.collection('comments').find({}).toArray();
    for (const comment of comments) {
      if (!comment.user_id && comment.user && comment.user.name) {
        // Try to find user by name (or email if available)
        const userDoc = await db.collection('users').findOne({ name: comment.user.name });
        if (userDoc) {
          await db.collection('comments').updateOne(
            { _id: comment._id },
            { $set: { user_id: userDoc._id } }
          );
          console.log(`Set user_id for comment ${comment._id} to ${userDoc._id}`);
        } else {
          console.log(`No user found for comment ${comment._id} with name ${comment.user.name}`);
        }
      }
    }
    // Migrate listings
    const listings = await db.collection('listings').find({}).toArray();
    for (const listing of listings) {
      if (!listing.seller_id && listing.seller && listing.seller.name) {
        const userDoc = await db.collection('users').findOne({ name: listing.seller.name });
        if (userDoc) {
          await db.collection('listings').updateOne(
            { _id: listing._id },
            { $set: { seller_id: userDoc._id } }
          );
          console.log(`Set seller_id for listing ${listing._id} to ${userDoc._id}`);
        } else {
          console.log(`No user found for listing ${listing._id} with name ${listing.seller.name}`);
        }
      }
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.close();
  }
}

migrate(); 