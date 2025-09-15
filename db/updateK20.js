import { connectToDatabase } from './connection.js';
import { ObjectId } from 'mongodb';

const k20aId = "653bf0a1c3b4e5e6f7d8a5d1";
const markdownDescription = `The Honda K20A is a high-performance 2.0-liter inline-four engine from Honda's K-series family. This JDM-spec engine was specifically designed for the EP3 Civic Type R and DC5 Integra Type R, featuring Honda's advanced i-VTEC system. It is renowned among enthusiasts for its high redline, responsiveness, and potential for modification.

## Key Specifications
* Displacement: 1,998 cc
* Power: Approximately 217-220 horsepower at 8,000 rpm
* Torque: Around 149 lb-ft at 7,000 rpm
* Redline: 8,400 RPM
* Compression Ratio: 11.5:1
* Bore x Stroke: 86mm x 86mm (Square design)

## Features
* Dual overhead camshafts (DOHC)
* i-VTEC system combining VTC (Variable Timing Control) on the intake cam with VTEC
* High-flow intake and exhaust systems designed for performance
* Lightweight aluminum block and cylinder head construction
* Direct ignition system for precise spark timing
* Requires premium fuel (91 octane or higher recommended)

## Common Applications and Swaps
Originally found in the Japanese market versions of:
* 2001-2006 Honda Civic Type R (EP3)
* 2001-2006 Honda Integra Type R (DC5)

It is also an extremely popular choice for engine swaps into older Honda chassis like the Civic EG, EK, and Integra DC2, providing a significant power increase and modern engine technology.`;

async function updateK20Description() {
  try {
    const { db } = await connectToDatabase();
    
    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(k20aId) },
      { 
        $set: { 
          description_markdown: markdownDescription,
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log('Product not found');
      return;
    }

    console.log('Successfully updated K20A description');
    
  } catch (error) {
    console.error('Error updating description:', error);
  }
}

updateK20Description(); 