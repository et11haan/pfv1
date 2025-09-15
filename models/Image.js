import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // The 'Part' or 'Product' this image is associated with.
  // Using 'Product' as it is in the Report schema enum.
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Virtual for score
  score: {
    type: Number,
    default: 0
  },
  // Fields for admin moderation
  isConcealed: { 
    type: Boolean, 
    default: false 
  },
  concealedByAdminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for vote score
imageSchema.virtual('voteScore').get(function() {
  return this.upvotes.length - this.downvotes.length;
});

// Middleware to update score before saving
imageSchema.pre('save', function(next) {
  this.score = this.upvotes.length - this.downvotes.length;
  next();
});

// Indexes based on current usage in server.js and potential admin needs
imageSchema.index({ productId: 1, score: -1 }); // For fetching top images for a product
imageSchema.index({ productId: 1, isConcealed: 1 }); // For admin filtering

const Image = mongoose.model('Image', imageSchema);

export default Image; 