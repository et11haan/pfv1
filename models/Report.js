import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reportedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  // This 'reportedItemRef' field will store the name of the Model that reportedItemId refers to.
  // e.g., 'Listing', 'Comment', 'User'
  reportedItemRef: {
    type: String,
    required: true,
    enum: ['Listing', 'Comment', 'User', 'Product', 'Image'], // Add other reportable item types as needed
  },
  tags: [{
    type: String,
    index: true,
  }],
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  // Optional: Store a snapshot of key details of the reported item at the time of reporting.
  // This can be useful if the reported item is later edited or deleted.
  // e.g., for a comment: { text: "Offensive comment text", authorName: "OffendingUser" }
  // e.g., for a listing: { title: "Misleading Listing Title", sellerName: "ProblemSeller" }
  reportedItemSnapshot: {
    type: mongoose.Schema.Types.Mixed, // Allows for flexible object structure
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'under_review', 'resolved_action_taken', 'resolved_no_action', 'dismissed'],
    default: 'open',
    index: true,
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  resolvedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  }
}, { 
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
  toObject: { virtuals: true } // Ensure virtuals are included when converting to plain objects
});

// Compound index for efficiently querying reports based on the reported item's ID and its type.
reportSchema.index({ reportedItemId: 1, reportedItemRef: 1 });

// Virtual property to dynamically populate the reported item.
// This allows you to do `report.reportedItem` and Mongoose will fetch
// the Listing, Comment, or User document based on `reportedItemRef` and `reportedItemId`.
reportSchema.virtual('reportedItem', {
  ref: function() {
    return this.reportedItemRef; // Dynamically returns the Model name string
  },
  localField: 'reportedItemId',
  foreignField: '_id',
  justOne: true // We expect to populate a single document
});

const Report = mongoose.model('Report', reportSchema);

export default Report; 