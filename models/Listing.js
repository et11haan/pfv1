import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product' // Reference the Product model (assuming Product model exists or will be created)
  },
  type: {
    type: String,
    required: true,
    enum: ['ask', 'bid']
  },
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User' // Reference the User model
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: { // Optional image URL
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'sold', 'expired', 'deleted', 'deleted_by_admin'], // Added 'deleted_by_admin'
    default: 'active'
  },
  adminDeletionReason: { 
    type: String, 
    default: null 
  }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Index for faster lookups by product
listingSchema.index({ product_id: 1 });
// Index for faster lookups by seller
listingSchema.index({ seller_id: 1 });

const Listing = mongoose.model('Listing', listingSchema);

export default Listing; 