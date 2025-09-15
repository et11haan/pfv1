import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateData() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Successfully connected to MongoDB');
    
    const db = client.db('parts_marketplace');
    
    // Clear existing collections
    await db.collection('products').deleteMany({});
    await db.collection('listings').deleteMany({});
    await db.collection('comments').deleteMany({});

    // Sample data
    const sampleProducts = {
      'bmw-zf-s5d-320z': {
        title: "BMW ZF S5D - 320Z Transmission",
        part_numbers: ["123456789", "ZF-S5D-320Z"],
        production_years: { start: 1994, end: 2016 },
        tags: ["transmissions", "e36", "bmw", "e39", "e46", "k series swaps", "5-speed", "manual"],
        images: [
          'https://via.placeholder.com/600x400?text=BMW+Transmission+1',
          'https://via.placeholder.com/600x400?text=BMW+Transmission+2',
          'https://via.placeholder.com/600x400?text=BMW+Transmission+3'
        ],
        description_preview_html: "<p>The BMW ZF S5D-320Z is a 5-speed manual transmission manufactured by ZF Friedrichshafen AG. Known for its robust construction and reliability, it's commonly found in E36, E39, and E46 models.</p>",
        description_full_html: "<p>The BMW ZF S5D-320Z is a 5-speed manual transmission manufactured by ZF Friedrichshafen AG. It has been widely used in BMW models such as the E36, E39, and E46 series. Known for its robust construction and reliability, the transmission offers a torque capacity of up to 320 Nm.</p>",
        lowest_ask: 722.00,
        highest_bid: 672.00,
      },
      'honda-k20a-engine': {
        title: "Honda K20A Engine (JDM Civic Type R)",
        part_numbers: ["K20A", "11000-PRC-010"],
        production_years: { start: 2001, end: 2006 },
        tags: ["engine", "honda", "k-series", "k20", "vtec", "jdm", "civic type r", "integra type r", "k-swap"],
        images: [
          'https://via.placeholder.com/600x400?text=Honda+K20A+1',
          'https://via.placeholder.com/600x400?text=Honda+K20A+2'
        ],
        description_preview_html: "<p>The legendary K20A engine from the JDM EP3 Civic Type R and DC5 Integra Type R. High-revving, 2.0L DOHC i-VTEC power.</p>",
        description_full_html: "<p>The Honda K20A is a high-performance 2.0-liter inline-four engine from Honda's K-series family. This JDM-spec engine was specifically designed for the EP3 Civic Type R and DC5 Integra Type R, featuring Honda's advanced i-VTEC system. It is renowned among enthusiasts for its high redline, responsiveness, and potential for modification.</p><h2>Key Specifications</h2><ul><li>Displacement: 1,998 cc</li><li>Power: Approximately 217-220 horsepower at 8,000 rpm</li><li>Torque: Around 149 lb-ft at 7,000 rpm</li><li>Redline: 8,400 RPM</li><li>Compression Ratio: 11.5:1</li><li>Bore x Stroke: 86mm x 86mm (Square design)</li></ul><h2>Features</h2><ul><li>Dual overhead camshafts (DOHC)</li><li>i-VTEC system combining VTC (Variable Timing Control) on the intake cam with VTEC</li><li>High-flow intake and exhaust systems designed for performance</li><li>Lightweight aluminum block and cylinder head construction</li><li>Direct ignition system for precise spark timing</li><li>Requires premium fuel (91 octane or higher recommended)</li></ul><h2>Common Applications and Swaps</h2><p>Originally found in the Japanese market versions of:</p><ul><li>2001-2006 Honda Civic Type R (EP3)</li><li>2001-2006 Honda Integra Type R (DC5)</li></ul><p>It is also an extremely popular choice for engine swaps into older Honda chassis like the Civic EG, EK, and Integra DC2, providing a significant power increase and modern engine technology.</p>",
        lowest_ask: 4500.00,
        highest_bid: 4100.00,
      }
    };

    const sampleListings = {
      'bmw-zf-s5d-320z': [
        { type: 'ask', seller: 'JohnDoe', price: 722, location: 'New York, NY', image: 'https://via.placeholder.com/80?text=Listing1', description: 'Excellent condition, low mileage transmission.' },
        { type: 'bid', seller: 'JaneSmith', price: 672, location: 'Los Angeles, CA', image: 'https://via.placeholder.com/80?text=Listing2', description: 'Looking for a transmission in good condition.' }
      ],
      'honda-k20a-engine': [
        { type: 'ask', seller: 'KSwapKing', price: 4500, location: 'Miami, FL', image: 'https://via.placeholder.com/80?text=K20Listing1', description: 'Complete K20A, JDM import, 70k miles.' },
        { type: 'bid', seller: 'EGHatchFan', price: 4100, location: 'Chicago, IL', image: 'https://via.placeholder.com/80?text=K20Bid1', description: 'Need K20A for swap project.' }
      ]
    };

    // Migrate products
    const products = Object.entries(sampleProducts).map(([slug, product]) => ({
      ...product,
      _id: new ObjectId(),
      slug: slug
    }));
    await db.collection('products').insertMany(products);
    console.log('Products migrated successfully');

    // Migrate listings
    const listings = [];
    for (const [productSlug, productListings] of Object.entries(sampleListings)) {
      const product = products.find(p => p.slug === productSlug);
      if (product) {
        const productListingsWithIds = productListings.map(listing => ({
          ...listing,
          _id: new ObjectId(),
          product_id: product._id
        }));
        listings.push(...productListingsWithIds);
      }
    }
    if (listings.length > 0) {
      await db.collection('listings').insertMany(listings);
      console.log('Listings migrated successfully');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

migrateData(); 