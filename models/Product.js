import mongoose from 'mongoose';

const partNumberSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true },
  link: { type: String, trim: true } // Optional link
}, { _id: false }); // Don't create separate _id for part numbers

const editHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  description_markdown: { // Store the previous version
    type: String,
    required: true
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true
  },
  tags: {
    type: [String],
    required: true,
    index: true
  },
  part_numbers: [partNumberSchema], // Array of part number objects
  description_markdown: {
    type: String,
    required: true
  },
  description_full_html: {
    type: String,
    required: true
  },
  description_preview_html: {
    type: String,
    required: true
  },
  production_years: {
    start: Number,
    end: Number
  },
  // Images might be handled separately or added here if stored as simple URLs
  // images: [String],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  last_edited_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  initial_description_markdown: String, // Store the first description
  edit_history: [editHistorySchema],
  is_verified: {
    type: Boolean,
    default: false
  },
  // Lowest Ask / Highest Bid - These are dynamic, maybe store/update here or calculate on read
  // lowest_ask: Number,
  // highest_bid: Number,
}, { timestamps: true }); // Adds createdAt and updatedAt

// Add text index for searching
productSchema.index({
  title: 'text',
  tags: 'text',
  'part_numbers.number': 'text', // Index the 'number' field within the array
  slug: 'text'
});

const Product = mongoose.model('Product', productSchema);

export default Product; 