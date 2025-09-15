import { connectToDatabase, closeDatabase } from './connection.js';
import { sampleProducts, sampleListings, sampleComments } from './sampleData.js';
import { ObjectId } from 'mongodb';

async function migrateData() {
  try {
    console.log('Starting migration...');
    const { db } = await connectToDatabase();
    
    // Create collections
    const productsCollection = db.collection('products');
    const listingsCollection = db.collection('listings');
    const commentsCollection = db.collection('comments');
    
    // Clear existing collections
    console.log('Clearing existing collections...');
    await productsCollection.deleteMany({});
    await listingsCollection.deleteMany({});
    await commentsCollection.deleteMany({});
    
    // Insert products
    console.log('Inserting products...');
    const productEntries = Object.entries(sampleProducts);
    for (const [slug, product] of productEntries) {
      const productWithSlug = { 
        ...product,
        _id: new ObjectId(product._id),
        slug 
      };
      await productsCollection.insertOne(productWithSlug);
    }
    
    // Insert listings
    console.log('Inserting listings...');
    const listingEntries = Object.entries(sampleListings);
    for (const [productSlug, listings] of listingEntries) {
      const product = await productsCollection.findOne({ slug: productSlug });
      if (product) {
        const listingsWithProductId = listings.map(listing => ({
          ...listing,
          _id: new ObjectId(listing._id),
          product_id: product._id,
          seller_id: new ObjectId(), // Temporary seller ID for sample data
          status: 'active'
        }));
        await listingsCollection.insertMany(listingsWithProductId);
      }
    }
    
    // Insert comments
    console.log('Inserting comments...');
    const commentEntries = Object.entries(sampleComments);
    for (const [productSlug, comments] of commentEntries) {
      const product = await productsCollection.findOne({ slug: productSlug });
      if (product && comments.length > 0) {
        const commentsWithProductId = comments.map(comment => ({
          ...comment,
          _id: new ObjectId(),
          product_id: product._id,
          user_id: new ObjectId(), // Temporary user ID for sample data
          votes: {
            upvotes: 0,
            downvotes: 0
          }
        }));
        await commentsCollection.insertMany(commentsWithProductId);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run the migration
migrateData(); 