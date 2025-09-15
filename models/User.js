import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true, // Index for faster lookups
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure email is unique across verified users
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  profilePicture: {
    type: String, // URL to the profile picture
  },
  cachedProfilePicture: {
    type: String, // URL to the cached local profile picture
    default: null,
  },
  profilePictureLastCached: {
    type: Date, // When the profile picture was last cached
    default: null,
  },
  isAdminForTags: [{ type: String, default: [] }],
  isMuted: { type: Boolean, default: false, index: true },
  muteExpiresAt: { type: Date, default: null },
  mutedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  mutedReason: { type: String, default: null },
  phoneNumber: {
    type: String, // Store in E.164 format
    trim: true,
    // Consider adding unique: true if a phone number MUST belong to only one user
    // sparse: true, // Allow multiple null/undefined values if not unique
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  // Fields for phone verification process
  phoneVerificationCode: {
    type: String,
    select: false, // Don't send this to the client by default
  },
  phoneCodeExpiresAt: {
    type: Date,
    select: false,
  },
  phoneVerificationAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lastCodeRequestAt: {
    type: Date,
    select: false,
  },
  // Other fields from requirements
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending_verification', 'active', 'suspended', 'deleted'],
    default: 'pending_verification',
  },
  // Add other fields as needed: location, reputationScore, activityHistory, etc.
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Optional: Add index on phoneNumber if you plan to query by it frequently
// userSchema.index({ phoneNumber: 1 });

// Optional: Add index on status
// userSchema.index({ status: 1 });

// Add text index for searching
userSchema.index({ name: 'text', email: 'text' });

const User = mongoose.model('User', userSchema);

export default User; 