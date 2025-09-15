import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkDatabase() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('parts_marketplace');
    
    // Count documents in collections
    const productsCount = await db.collection('products').countDocuments();
    const listingsCount = await db.collection('listings').countDocuments();
    const commentsCount = await db.collection('comments').countDocuments();
    
    console.log(`Database contains:
- ${productsCount} products
- ${listingsCount} listings
- ${commentsCount} comments`);

    // Get sample data
    const products = await db.collection('products').find().toArray();
    console.log('\nProducts in database:');
    products.forEach(product => {
      console.log(`\n${product.title} (${product.slug}):
- ID: ${product._id}
- Part numbers: ${product.part_numbers.join(', ')}
- Tags: ${product.tags.join(', ')}
- Listings: ${product.lowest_ask ? `Lowest ask: $${product.lowest_ask}, Highest bid: $${product.highest_bid}` : 'None'}`);
    });

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkDatabase(); 