import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true, // Index for searching
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  tags: {
    type: [String],
    index: true, // Index for searching by tags
  },
  author_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content_markdown: {
    type: String,
    required: true,
  },
  content_full_html: {
    type: String,
    required: true,
  },
  content_preview_html: {
    type: String,
    required: true,
  },
  votes: {
    type: Number,
    default: 0,
    index: true,
  },
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  downvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isDeletedByAdmin: {
    type: Boolean,
    default: false,
  },
  edit_history: [
    {
      user: String,
      timestamp: Date,
      content_markdown: String,
    },
  ],
}, { timestamps: true });

// Create a text index for searching title, tags, and content
blogPostSchema.index({ title: 'text', tags: 'text', content_markdown: 'text' });

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

export default BlogPost; 