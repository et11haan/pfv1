/**
 * Mongoose schema for comments on products.
 * Supports nested comments (replies), upvotes/downvotes, and virtual vote count.
 * Used for associating user discussions with products in the marketplace.
 */
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  /**
   * The product this comment is associated with.
   * @type {mongoose.Schema.Types.ObjectId}
   * @required
   */
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Now optional
    ref: 'Product',
    index: true // Index for fetching comments by product
  },
  /**
   * The blog post this comment is associated with.
   * @type {mongoose.Schema.Types.ObjectId}
   */
  blogPostId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Also optional
    ref: 'BlogPost',
    index: true
  },
  /**
   * The user who posted the comment.
   * @type {mongoose.Schema.Types.ObjectId}
   * @required
   */
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
    // No index needed usually, lookups are mostly via product or _id
  },
  /**
   * The parent comment, if this is a reply. Null for top-level comments.
   * @type {mongoose.Schema.Types.ObjectId|null}
   */
  parent_id: { // For nested comments
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment', // Self-reference
    default: null,
    index: true // Index for fetching replies and identifying top-level comments
  },
  /**
   * The text content of the comment.
   * @type {string}
   * @required
   */
  text: { // Changed from 'content' for consistency with previous code
    type: String,
    required: true,
    trim: true
  },
  /**
   * Array of user IDs who upvoted this comment.
   * @type {Array<mongoose.Schema.Types.ObjectId>}
   */
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  /**
   * Array of user IDs who downvoted this comment.
   * @type {Array<mongoose.Schema.Types.ObjectId>}
   */
  downvotedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
  }],
  // --- NEW FIELDS --- 
  votes: {
    type: Number,
    default: 0,
    index: true // Index for sorting by votes
  },
  replyCount: {
    type: Number,
    default: 0
    // No index needed unless specifically querying/sorting by reply count often
  },
  isDeleted: { // For user soft-deletes
    type: Boolean,
    default: false
  },
  deletedAt: { // Timestamp for user soft-deletes
    type: Date
  },
  isDeletedByAdmin: {
    type: Boolean,
    default: false
  }
  // --- END NEW FIELDS ---
}, { timestamps: true });

// Ensure virtuals are included when converting to JSON/Object
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

// Custom validator to ensure that either product_id or blogPostId exists
commentSchema.path('product_id').validate(function(value) {
  return this.product_id || this.blogPostId;
}, 'Either product_id or blogPostId is required.');

commentSchema.path('blogPostId').validate(function(value) {
  return this.product_id || this.blogPostId;
}, 'Either product_id or blogPostId is required.');

/**
 * Index for faster lookups by user.
 */
commentSchema.index({ user_id: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment; 