/**
 * MongoDB schema definition for comments (used for direct MongoDB operations, not Mongoose).
 * Supports nested comments, user association, and timestamps.
 * Used in scripts and raw database utilities.
 */
import { ObjectId } from 'mongodb';

export const CommentSchema = {
  _id: { type: ObjectId, required: true }, // Unique comment ID
  product_id: { type: ObjectId, required: true, ref: 'products' }, // Associated product
  user_id: { type: ObjectId, required: true, ref: 'users' }, // Authoring user
  parent_id: { type: ObjectId, ref: 'comments' }, // Parent comment for replies (optional)
  content: { type: String, required: true }, // Comment text
  created_at: { type: Date, default: Date.now }, // Creation timestamp
  updated_at: { type: Date, default: Date.now }, // Last update timestamp
  user: { type: String, required: true }, // Username (for denormalized access)
}; 