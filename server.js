import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './db/connection.js';
import { ObjectId } from 'mongodb';
import { JSDOM } from 'jsdom';
import DOMPurify from 'isomorphic-dompurify';
import slugify from 'slugify';
import { marked } from 'marked';
import dotenv from 'dotenv'; // Load environment variables
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose'; // Keep Mongoose
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Add this import
import axios from 'axios'; // Add this import for downloading images
import twilio from 'twilio';
import helmet from 'helmet';

// Import Mongoose Models
import User from './models/User.js';
import Product from './models/Product.js';
import Listing from './models/Listing.js';
import Comment from './models/Comment.js';
import Message from './models/Message.js'; // <-- ADDED IMPORT
import Report from './models/Report.js'; // <-- NEW: Import Report model
import Image from './models/Image.js';
import BlogPost from './models/BlogPost.js'; // <-- NEW: Import BlogPost model

// Import Auth Middleware
import { authenticateToken, requirePhoneVerified } from './middleware/auth.js';
import { requireAdmin } from './middleware/adminAuth.js'; // <-- NEW: Import requireAdmin

// Load environment variables from .env file
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// --- Passport Setup ---
passport.use(new GoogleStrategy.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BACKEND_URL}/api/auth/google/callback` // Full URL for callback
  },
  async (accessToken, refreshToken, profile, done) => {
    // This is the verify callback
    console.log('[Server] Google Profile Received:', profile);
    try {
      const originalProfilePicture = profile.photos?.[0]?.value;
      
      // Find or create user
      const existingUser = await User.findOneAndUpdate(
        { googleId: profile.id },
        { // Update object
          $set: { // For existing users, only update these basic fields on login
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            profilePicture: originalProfilePicture,
            lastLogin: new Date(),
            // DO NOT update isAdminForTags here for existing users
          },
          $setOnInsert: { // For new users (upsert:true), set these fields once
            joinDate: new Date(),
            status: 'pending_verification',
            isAdminForTags: [], // Set to empty array only on insert, assuming default desired state
            // phoneVerified will use schema default (false) on insert
          }
        },
        {
          upsert: true, // Create if doesn't exist
          new: true,    // Return the modified document
          setDefaultsOnInsert: true // Apply schema defaults if a new doc is inserted
        }
      );

      // Cache profile picture asynchronously (don't block OAuth flow)
      if (originalProfilePicture && existingUser._id) {
        // Check if we need to update the cached version
        const shouldUpdateCache = !existingUser.cachedProfilePicture || 
                                !existingUser.profilePictureLastCached ||
                                (Date.now() - existingUser.profilePictureLastCached.getTime()) > (24 * 60 * 60 * 1000); // 24 hours

        if (shouldUpdateCache) {
          // Cache profile picture asynchronously
          ProfilePictureCacheService.getCachedOrDownload(existingUser._id.toString(), originalProfilePicture)
            .then(cachedUrl => {
              // Update user with cached URL
              return User.findByIdAndUpdate(existingUser._id, {
                cachedProfilePicture: cachedUrl,
                profilePictureLastCached: new Date()
              });
            })
            .then(() => {
              console.log(`[Server] Profile picture cached for user ${existingUser._id}`);
            })
            .catch(error => {
              console.error(`[Server] Failed to cache profile picture for user ${existingUser._id}:`, error.message);
            });
        }
      }
      console.log('[Server] User Found/Created:', existingUser);
      return done(null, existingUser);
    } catch (err) {
      console.error('[Server] Error in Google Strategy:', err);
      return done(err, null);
    }
  }
));

// Note: We are not using sessions, so serializeUser/deserializeUser are not strictly needed
// If you were using sessions, you would implement them like this:
// passport.serializeUser((user, done) => { done(null, user.id); });
// passport.deserializeUser(async (id, done) => {
//   try { const user = await User.findById(id); done(null, user); } catch (err) { done(err); }
// });
// --- End Passport Setup ---


// --- Rate Limiting ---
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	message: 'Too many requests from this IP, please try again after 15 minutes',
});

const verificationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 10, // Limit each IP/User to 10 verification attempts per hour
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many verification attempts, please try again later.',
	// keyGenerator: (req) => req.user?.id || req.ip // Key by user ID if available, else IP (Requires modification later)
});

const codeRequestLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	max: 5, // Limit each IP/User to 5 code requests per 5 minutes
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many code requests, please try again shortly.',
	// keyGenerator: (req) => req.user?.id || req.ip
});
// --- End Rate Limiting ---

// --- NEW: Additional per-feature rate limiters ---
const keyByUserOrIp = (req) => req.user?.id || req.ip;

const postCommentLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many comments created from this account. Please try again later.',
	keyGenerator: keyByUserOrIp,
});

const voteLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many votes from this account. Please try again later.',
	keyGenerator: keyByUserOrIp,
});

const messagingSendLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many messages sent. Please slow down.',
	keyGenerator: keyByUserOrIp,
});

const messagingReadLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many messaging reads. Please slow down.',
	keyGenerator: keyByUserOrIp,
});

const listingWriteLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many listing actions. Please try again later.',
	keyGenerator: keyByUserOrIp,
});

const searchLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 60,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many searches. Please try again later.',
	keyGenerator: (req) => req.ip,
});
// --- END NEW ---

// Setup DOMPurify for Node.js
const { window } = new JSDOM('');
const purify = DOMPurify(window);

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false
});

// --- NEW: Helper function to validate URL ---
const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
};
// --- END NEW ---

// Function to generate preview HTML
const generatePreviewHtml = (fullHtml) => {
  let previewHtml = '';
  const firstParagraphMatch = fullHtml.match(/<p>.*?<\/p>/i);
  if (firstParagraphMatch) {
    previewHtml = firstParagraphMatch[0];
  } else {
    const tempDiv = new JSDOM('').window.document.createElement('div');
    tempDiv.innerHTML = fullHtml;
    const text = tempDiv.textContent || '';
    const previewText = text.substring(0, 150).replace(/\s+$/, '');
    previewHtml = `<p>${previewText}${text.length > 150 ? '...' : ''}</p>`;
  }
  return previewHtml;
};

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3001; // Use environment variable or default

// Security headers
app.use(helmet());

// Configure CORS
app.use(cors({
  origin: FRONTEND_URL, // Your frontend URL
  credentials: true // Allow credentials (cookies, authorization headers, etc)
}));

app.use(express.json()); // <-- MOVE TO HERE

// --- Initialize Passport ---
app.use(passport.initialize());
// --- End Initialize Passport ---

// Setup for ES modules (to get __dirname equivalent)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create profile pictures cache directory
const PROFILE_PICS_DIR = path.join(__dirname, 'cache', 'profile-pictures');
if (!fs.existsSync(PROFILE_PICS_DIR)) {
  fs.mkdirSync(PROFILE_PICS_DIR, { recursive: true });
  console.log('[Server] Created profile pictures cache directory:', PROFILE_PICS_DIR);
}

// Static file serving - Add this after app initialization but before routes
app.use('/cache', express.static(path.join(__dirname, 'cache')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// --- TEMP: Debug limiter test endpoint (remove after validation) ---
app.get('/api/_limit-test', searchLimiter, (req, res) => {
	res.json({ ok: true, ts: Date.now() });
});
// --- END TEMP ---

// --- AUTH ROUTES ---

// 1. Initiate Google OAuth flow
app.get('/api/auth/google',
	authLimiter, // Apply rate limiting
	(req, res, next) => {
		// Capture the state from the query parameter
		const state = req.query.state;
		// Pass the state to passport.authenticate options
		const authenticator = passport.authenticate('google', {
			scope: ['profile', 'email'], // Request profile and email info
			session: false, // Don't use sessions
			state: state // Pass the captured state here
		});
		authenticator(req, res, next); // Call the authenticator middleware
	}
);

// 2. Google OAuth Callback
app.get('/api/auth/google/callback',
	authLimiter,
	(req, res, next) => {
		// Retrieve the state passed back from Google
		const state = req.query.state;
		// Pass the state to the authentication middleware
		const authenticator = passport.authenticate('google', {
			failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`, // Frontend route
			session: false, // Don't use sessions
			state: state // Pass state for verification if needed, though usually just used for redirect
		});
		authenticator(req, res, next);
	},
	(req, res) => {
		// Successful authentication from Google.
		// req.user is populated by Passport's verify callback
		console.log('[Server] Google Callback - User Authenticated:', req.user);

		// Retrieve the original URL from the state parameter
		const state = req.query.state; 
		let targetUrl = '/'; // Default redirect URL
		if (state) {
			try {
				// Decode the Base64 state to get the original path
				targetUrl = atob(decodeURIComponent(state));
				// Basic validation: ensure it starts with '/' to prevent open redirect vulnerabilities
				if (!targetUrl.startsWith('/')) {
					console.warn(`[Server] Invalid state received, potential open redirect attempt: ${targetUrl}. Falling back to '/'`);
					targetUrl = '/'; 
				}
				console.log(`[Server] State decoded, targetUrl: ${targetUrl}`);
			} catch (e) {
				console.error('[Server] Error decoding state:', e);
				targetUrl = '/'; // Fallback on error
			}
		}

		const user = req.user; // This is existingUser from findOneAndUpdate

		if (!user) {
			 console.error('[Server] Google Callback - No user object found after authentication.');
			 // Redirect to frontend login page with error
			 return res.redirect(`${FRONTEND_URL}/login?error=auth_failed&targetUrl=${encodeURIComponent(targetUrl)}`);
		}

		// Explicitly fetch the user again to ensure we have the absolute latest isAdminForTags for the JWT
		// This is a bit redundant but ensures data freshness for the token.
		User.findById(user._id).select('isAdminForTags phoneVerified email').lean().then(freshUserFromDB => {
			if (!freshUserFromDB) {
				console.error('[Server] Google Callback - Could not re-fetch user for JWT creation.');
				return res.redirect(`${FRONTEND_URL}/login?error=auth_failed_jwt_creation&targetUrl=${encodeURIComponent(targetUrl)}`);
			}

			if (freshUserFromDB.phoneVerified) {
				// Phone is verified, generate FULL JWT and redirect to original target URL
				const payload = {
					id: user._id, // or freshUserFromDB._id (they are the same)
					googleId: user.googleId,
					email: freshUserFromDB.email, // Use fresh email
					name: user.name,
					profilePicture: user.cachedProfilePicture || user.profilePicture, // Use cached if available
					phoneVerified: true,
					isAdminForTags: freshUserFromDB.isAdminForTags || [] // Use fresh isAdminForTags
				};
				const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }); // Long-lived token
				console.log(`[Server] Phone Verified. Redirecting to ${targetUrl} with JWT. Payload:`, payload);
				// Append token to the target URL
				const redirectUrl = new URL(targetUrl, FRONTEND_URL); // Base URL needed if targetUrl is relative
				redirectUrl.searchParams.set('token', token);
				res.redirect(redirectUrl.toString()); 
			} else {
				// Phone NOT verified, generate TEMPORARY JWT and redirect to verification page
				 const tempPayload = {
					id: user._id, // or freshUserFromDB._id
					googleId: user.googleId,
					email: freshUserFromDB.email, // Use fresh email for temp token too
					name: user.name,
					profilePicture: user.cachedProfilePicture || user.profilePicture, // Use cached if available
					phoneVerified: false,
					isAdminForTags: freshUserFromDB.isAdminForTags || [] // Use fresh isAdminForTags
				};
				const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET, { expiresIn: '15m' }); // Short-lived token
				console.log(`[Server] Phone NOT Verified. Redirecting to /verify-phone with Temp JWT and targetUrl. Payload:`, tempPayload);
				// Redirect to verify-phone page, including the tempToken and the original targetUrl
				res.redirect(`${FRONTEND_URL}/verify-phone?tempToken=${tempToken}&targetUrl=${encodeURIComponent(targetUrl)}`); 
			}
		}).catch(err => {
			console.error('[Server] Google Callback - Error re-fetching user for JWT:', err);
			return res.redirect(`${FRONTEND_URL}/login?error=internal_server_error&targetUrl=${encodeURIComponent(targetUrl)}`);
		});
	}
);

// Placeholder for Phone Verification Routes (To be implemented)
// TODO: Add middleware to protect these routes using the tempToken

// Add Twilio configuration at the top with other imports

// Twilio configuration (add these environment variables)
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilioAccountSid && twilioAuthToken ? 
	twilio(twilioAccountSid, twilioAuthToken) : null;

// Replace the placeholder phone verification routes
app.post('/api/auth/request-phone-code', codeRequestLimiter, async (req, res) => {
	try {
		const { phoneNumber } = req.body;
		const tempToken = req.headers.authorization?.replace('Bearer ', '') || req.body.tempToken;

		if (!tempToken) {
			return res.status(401).json({ message: 'Temporary token required' });
		}

		// Verify tempToken and get user
		const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id).select('+phoneVerificationCode +phoneCodeExpiresAt +phoneVerificationAttempts +lastCodeRequestAt');
		
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Validate phone number format (E.164)
		const phoneRegex = /^\+[1-9]\d{1,14}$/;
		if (!phoneRegex.test(phoneNumber)) {
			return res.status(400).json({ message: 'Invalid phone number format. Use E.164 format (e.g., +15551234567)' });
		}

		// Check rate limiting (prevent spam)
		const now = new Date();
		if (user.lastCodeRequestAt && (now - user.lastCodeRequestAt) < 60000) { // 1 minute cooldown
			return res.status(429).json({ message: 'Please wait 1 minute before requesting another code' });
		}

		// Generate 6-digit verification code
		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Save code to user (hashed for security)
		user.phoneVerificationCode = verificationCode; // In production, hash this
		user.phoneCodeExpiresAt = expiresAt;
		user.phoneVerificationAttempts = 0;
		user.lastCodeRequestAt = now;
		user.phoneNumber = phoneNumber;
		await user.save();

		// Send SMS via Twilio
		if (twilioClient) {
			try {
				await twilioClient.messages.create({
					body: `Your PartsFlip verification code is: ${verificationCode}. Valid for 10 minutes.`,
					from: twilioPhoneNumber,
					to: phoneNumber
				});
				
				console.log(`[Server] SMS sent to ${phoneNumber} for user ${user.id}`);
				res.status(200).json({ message: 'Verification code sent successfully' });
			} catch (twilioError) {
				console.error('[Server] Twilio SMS error:', twilioError);
				res.status(500).json({ message: 'Failed to send SMS. Please try again.' });
			}
		} else {
			// Development mode - just log the code
			console.log(`[DEV] Verification code for ${phoneNumber}: ${verificationCode}`);
			res.status(200).json({ message: 'Verification code sent (check server logs)', devCode: verificationCode });
		}

	} catch (error) {
		console.error('[Server] Request phone code error:', error);
		if (error.name === 'JsonWebTokenError') {
			return res.status(401).json({ message: 'Invalid token' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/auth/verify-phone-code', verificationLimiter, async (req, res) => {
	try {
		const { verificationCode } = req.body;
		const tempToken = req.headers.authorization?.replace('Bearer ', '') || req.body.tempToken;

		if (!tempToken) {
			return res.status(401).json({ message: 'Temporary token required' });
		}

		// Verify tempToken and get user
		const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id).select('+phoneVerificationCode +phoneCodeExpiresAt +phoneVerificationAttempts');
		
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Check if code exists and hasn't expired
		if (!user.phoneVerificationCode || !user.phoneCodeExpiresAt) {
			return res.status(400).json({ message: 'No verification code found. Please request a new code.' });
		}

		if (new Date() > user.phoneCodeExpiresAt) {
			return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
		}

		// Check attempt limits
		if (user.phoneVerificationAttempts >= 5) {
			return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
		}

		// Verify the code
		if (user.phoneVerificationCode !== verificationCode) {
			user.phoneVerificationAttempts += 1;
			await user.save();
			return res.status(400).json({ message: 'Invalid verification code' });
		}

		// Code is valid - mark phone as verified
		user.phoneVerified = true;
		user.phoneVerificationCode = undefined;
		user.phoneCodeExpiresAt = undefined;
		user.phoneVerificationAttempts = 0;
		await user.save();

		// Generate final JWT with phone verification status
		const finalPayload = {
			id: user._id,
			googleId: user.googleId,
			email: user.email,
			name: user.name,
			profilePicture: user.profilePicture,
			phoneVerified: true,
			isAdminForTags: user.isAdminForTags || []
		};

		const finalToken = jwt.sign(finalPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

		console.log(`[Server] Phone verified for user ${user.id}`);
		res.status(200).json({ 
			message: 'Phone number verified successfully',
			token: finalToken,
			user: {
				id: user._id,
				email: user.email,
				name: user.name,
				profilePicture: user.profilePicture,
				phoneVerified: true
			}
		});

	} catch (error) {
		console.error('[Server] Verify phone code error:', error);
		if (error.name === 'JsonWebTokenError') {
			return res.status(401).json({ message: 'Invalid token' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Placeholder for checking auth status
app.get('/api/auth/status', authenticateToken, async (req, res) => {
	// If authenticateToken middleware passes, req.user is populated
	console.log('[Server] /api/auth/status - User from token:', req.user);
	
	if (!req.user?.id) {
		// This case should ideally not happen if authenticateToken works correctly,
		// but adding a check just in case.
		 console.log('[Server] /api/auth/status - No user found after authenticateToken');
		 return res.status(401).json({ 
			isAuthenticated: false, 
			isPhoneVerified: false,
			message: "Invalid or missing token."
		});
	}

	try {
		// Using user data directly from the validated token payload (req.user)
		// req.user should now contain isAdminForTags if the token was generated correctly
		const userData = {
			id: req.user.id,
			googleId: req.user.googleId,
			email: req.user.email,
			name: req.user.name,
			profilePicture: req.user.profilePicture,
			isAdminForTags: req.user.isAdminForTags || [] // <-- ADDED (get from token)
			// You might add other relevant fields here, but avoid sensitive ones
		};

		res.status(200).json({
			isAuthenticated: true,
			isPhoneVerified: req.user.phoneVerified || false, // Get phone status from token
			user: userData 
		});

	} catch (error) {
		console.error('[Server] /api/auth/status - Error fetching user status:', error);
		res.status(500).json({ 
			isAuthenticated: false, 
			isPhoneVerified: false,
			message: "Internal server error while checking status."
		});
	}
});

// Placeholder for logout
app.post('/api/auth/logout', (req, res) => {
	// For JWT, logout is typically handled client-side by deleting the token.
	// Server-side might involve blacklisting the token if needed.
	console.log('[Server] Placeholder: /api/auth/logout');
	res.status(200).json({ message: 'Logged out (client should clear token)' });
});

// --- END AUTH ROUTES ---

// --- MESSAGING ROUTES ---

// Send a new message
app.post('/api/messages', authenticateToken, messagingSendLimiter, async (req, res) => {
	const { receiverId, content } = req.body;
	const senderId = req.user.id; // From authenticated token

	if (!receiverId || !content) {
		return res.status(400).json({ message: 'Receiver ID and content are required.' });
	}

	if (!mongoose.Types.ObjectId.isValid(receiverId)) {
		return res.status(400).json({ message: 'Invalid receiver ID format.' });
	}

	try {
		// Optional: Check if receiver exists
		const receiverExists = await User.findById(receiverId);
		if (!receiverExists) {
			return res.status(404).json({ message: 'Receiver not found.' });
		}

		const message = new Message({
			senderId,
			receiverId,
			content: purify.sanitize(content) // Sanitize content
		});
		await message.save();

		// Populate sender and receiver info for the response (optional, but good for client)
		const populatedMessage = await Message.findById(message._id)
			.populate('senderId', 'name profilePicture')
			.populate('receiverId', 'name profilePicture');

		res.status(201).json(populatedMessage);
	} catch (error) {
		console.error('[Server] Error sending message:', error);
		res.status(500).json({ message: 'Internal server error while sending message.' });
	}
});

// Get list of conversations for the current user
app.get('/api/messages/conversations', authenticateToken, messagingReadLimiter, async (req, res) => {
	const userId = new mongoose.Types.ObjectId(req.user.id);

	try {
		const conversations = await Message.aggregate([
			{
				$match: {
					$or: [{ senderId: userId }, { receiverId: userId }],
				},
			},
			{
				$sort: { createdAt: -1 }, // Sort messages to get the latest one per partner
			},
			{
				$group: {
					_id: {
						$cond: {
							if: { $eq: ['$senderId', userId] },
							then: '$receiverId',
							else: '$senderId',
						},
					},
					lastMessage: { $first: '$$ROOT' }, // Get the whole last message document
					unreadCount: {
						$sum: {
							$cond: [{ $and: [{ $eq: ['$read', false] }, { $eq: ['$receiverId', userId] }] }, 1, 0],
						},
					},
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: '_id', // This _id is the partnerId
					foreignField: '_id',
					as: 'partnerDetails',
				},
			},
			{
				$unwind: '$partnerDetails',
			},
			{
				$project: {
					_id: 0, // Exclude the default group _id
					partner: {
						_id: '$partnerDetails._id',
						name: '$partnerDetails.name',
						profilePicture: '$partnerDetails.profilePicture',
					},
					lastMessage: {
						_id: '$lastMessage._id',
						content: '$lastMessage.content',
						senderId: '$lastMessage.senderId',
						receiverId: '$lastMessage.receiverId',
						createdAt: '$lastMessage.createdAt',
						read: '$lastMessage.read',
					},
					unreadCount: 1,
				},
			},
			{
				$sort: { 'lastMessage.createdAt': -1 }, // Sort conversations by the latest message time
			}
		]);

		const adminTags = req.user.isAdminForTags || [];
		const adminReportConversations = [];

		if (adminTags.length > 0) {
			const reportChecks = adminTags.map(async (tag) => {
				const reportInfo = await Report.findOne({ tags: tag, status: 'open' }).sort({ createdAt: -1 }).lean();
				if (reportInfo) {
					const unreadCount = await Report.countDocuments({ tags: tag, status: 'open' });
					return {
						is_admin_report: true,
						partner: {
							_id: `admin-report-${tag}`,
							name: `admin/${tag}`,
							profilePicture: '/public/icons/admin-icon.png'
						},
						lastMessage: {
							content: `${unreadCount} new report(s) for ${tag}`,
							createdAt: reportInfo.createdAt,
						},
						unreadCount: unreadCount,
					};
				}
				return null;
			});

			const results = await Promise.all(reportChecks);
			adminReportConversations.push(...results.filter(Boolean));
		}

		const allConversations = [...adminReportConversations, ...conversations];
		allConversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));


		res.json(allConversations);
	} catch (error) {
		console.error('[Server] Error fetching conversations:', error);
		res.status(500).json({ message: 'Internal server error while fetching conversations.' });
	}
});

// Get messages between current user and another user (partnerId)
app.get('/api/messages/conversation/:partnerId', authenticateToken, messagingReadLimiter, async (req, res) => {
	const userId = new mongoose.Types.ObjectId(req.user.id);
	const partnerId = new mongoose.Types.ObjectId(req.params.partnerId);

	if (!req.params.partnerId || !mongoose.Types.ObjectId.isValid(req.params.partnerId)) {
		return res.status(400).json({ message: 'Invalid partner ID.' });
	}

	try {
		const messages = await Message.find({
			$or: [
				{ senderId: userId, receiverId: partnerId },
				{ senderId: partnerId, receiverId: userId },
			],
		})
		.sort({ createdAt: 'asc' })
		.populate('senderId', 'name profilePicture')
		.populate('receiverId', 'name profilePicture');

		// Mark messages as read for the current user in this conversation
		await Message.updateMany(
			{ receiverId: userId, senderId: partnerId, read: false },
			{ $set: { read: true } }
		);

		res.json(messages);
	} catch (error) {
		console.error('[Server] Error fetching conversation messages:', error);
		res.status(500).json({ message: 'Internal server error while fetching messages.' });
	}
});

// --- END MESSAGING ROUTES ---

/**
 * @route GET /api/products/:productIdOrSlug
 * @desc Retrieves product info, listings, and paginated, sorted top-level comments (with user and reply info)
 * @query commentsPage, commentsLimit, listingsPage, listingsLimit
 * @returns { product, listings, comments }
 */
// --- API Endpoint to get product data (Returns nested comments) ---
app.get('/api/products/:productIdOrSlug', async (req, res) => {
	const { productIdOrSlug } = req.params;
	const { 
		commentsPage = 1, 
		commentsLimit = 5, 
		listingsPage = 1, 
		listingsLimit = 5 
	} = req.query;
	
	console.log(`[Server] Fetching data for: ${productIdOrSlug}`);

	try {
		console.time('[Perf] Total Endpoint'); // Start total timer
		const { db } = await connectToDatabase();
		
		// --- 1. Find Product ---
		console.time('[Perf] Find Product');
		console.log(`[Server] Searching for product with slug: ${productIdOrSlug}`);
		let product = await db.collection('products').findOne({ slug: productIdOrSlug });
		console.log(`[Server] Product found by slug:`, !!product);
		if (!product && ObjectId.isValid(productIdOrSlug)) {
			console.log(`[Server] Trying to find product by ID: ${productIdOrSlug}`);
			product = await db.collection('products').findOne({ _id: new ObjectId(productIdOrSlug) });
			console.log(`[Server] Product found by ID:`, !!product);
		}
		console.timeEnd('[Perf] Find Product');
		// --- End Find Product ---

		if (!product) {
			console.log(`[Server] No product found`);
			return res.status(404).json({ error: 'Product not found' });
		}
		
		// Log the part_numbers format as stored in the database
		console.log('[Server][GET] Part numbers from DB:', product.part_numbers);
		console.log('[Server][GET] Part numbers type:', typeof product.part_numbers);
		console.log('[Server][GET] Part numbers isArray:', Array.isArray(product.part_numbers));
		if (Array.isArray(product.part_numbers)) {
			product.part_numbers.forEach((pn, idx) => {
				console.log(`[Server][GET] PartNumber[${idx}]:`, pn);
				console.log(`[Server][GET] PartNumber[${idx}] type:`, typeof pn);
			});
		}

		// --- 2. Aggregate Price Stats ---
		console.time('[Perf] Aggregate Price Stats');
		console.log(`[Server] Aggregating price stats for product ID:`, product._id);
		const priceStatsPipeline = [
			{ $match: { product_id: product._id } },
			{
				$group: {
					_id: null, // Group all matched listings
					// Find the minimum price among 'ask' listings
					lowestAsk: { 
						$min: { 
							$cond: { if: { $eq: ['$type', 'ask'] }, then: '$price', else: Infinity } 
						} 
					},
					// Find the maximum price among 'bid' listings
					highestBid: { 
						$max: { 
							$cond: { if: { $eq: ['$type', 'bid'] }, then: '$price', else: -1 } 
						} 
					}
				}
			},
			{
				$project: {
					_id: 0, // Exclude the default _id
					// If lowestAsk remained Infinity, it means no 'ask' listings were found, set to null
					lowestAsk: { $cond: { if: { $eq: ['$lowestAsk', Infinity] }, then: null, else: '$lowestAsk' } },
					// If highestBid remained -1, it means no 'bid' listings were found, set to null
					highestBid: { $cond: { if: { $eq: ['$highestBid', -1] }, then: null, else: '$highestBid' } }
				}
			}
		];

		const priceStatsResult = await db.collection('listings').aggregate(priceStatsPipeline).toArray();
		
		const lowestAsk = priceStatsResult.length > 0 ? priceStatsResult[0].lowestAsk : null;
		const highestBid = priceStatsResult.length > 0 ? priceStatsResult[0].highestBid : null;

		console.timeEnd('[Perf] Aggregate Price Stats');
		console.log(`[Server] Calculated lowestAsk: ${lowestAsk}, highestBid: ${highestBid}`);
		// --- END OPTIMIZED ---

		// --- 3. Fetch Top Images ---
		console.time('[Perf] Fetch Top Images');
		console.log(`[Server] Fetching top images for product ID:`, product._id);
		const topImages = await db.collection('images')
			.find({ product_id: product._id /* REMOVED: reported: { $ne: true } */ })
			.sort({ votes: -1 }) // Sort by votes descending
			.limit(3) // Get top 3
			.toArray();
		console.timeEnd('[Perf] Fetch Top Images');
		console.log(`[Server] Found ${topImages.length} top images`);
		// --- END NEW ---

		// Update product with dynamic values AND images
		product = {
			...product,
			lowest_ask: lowestAsk,
			highest_bid: highestBid,
			images: topImages // Add fetched images here
		};

		// --- 4. Fetch Paginated Listings & Count ---
		console.time('[Perf] Fetch Paginated Listings');
		console.log(`[Server] Fetching listings for product ID:`, product._id);
		const listingsQuery = Listing.find({ product_id: product._id })
			.sort({ timestamp: -1 }) // Use Mongoose 'createdAt'/'updatedAt' if available & preferred
			.skip((parseInt(listingsPage) - 1) * parseInt(listingsLimit))
			.limit(parseInt(listingsLimit))
			.populate('seller_id', 'name profilePicture');

		const listingsRawPromise = listingsQuery.lean().exec();
		const totalListingsPromise = Listing.countDocuments({ product_id: product._id });

		// Run listing fetch and count in parallel
		const [listingsRaw, totalListings] = await Promise.all([listingsRawPromise, totalListingsPromise]);
		console.timeEnd('[Perf] Fetch Paginated Listings'); // Ends after both fetch and count
		// --- End Fetch Paginated Listings & Count ---

		// Map to include 'seller' field for frontend compatibility
		const listings = listingsRaw.map(listing => ({
			...listing,
			seller: listing.seller_id ? {
				_id: listing.seller_id._id,
				name: listing.seller_id.name,
				profilePicture: listing.seller_id.profilePicture
			} : { name: 'Unknown', profilePicture: '/default-profile.png' }
		}));

		console.log(`[Server] Found ${listings.length} listings (Total: ${totalListings})`);
		if (listings.length > 0) {
			console.log('[Server] First listing with populated seller:', listings[0]);
		}

		// --- 5. Fetch Paginated Comments & Count ---
		console.time('[Perf] Fetch Paginated Comments');
		console.log(`[Server] Fetching comments for product ID: ${product._id}, Page: ${commentsPage}, Limit: ${commentsLimit}`);
		const commentsLimitParsed = parseInt(commentsLimit);
		const commentsPageParsed = parseInt(commentsPage);
		const skipAmount = (commentsPageParsed - 1) * commentsLimitParsed;

		const commentsPipeline = [
			// Match only top-level comments for the product
			{ $match: { product_id: product._id, parent_id: null } },
			// Sort by stored votes (desc), then timestamp (desc)
			{ $sort: { votes: -1, createdAt: -1 } }, 
			// Pagination
			{ $skip: skipAmount },
			{ $limit: commentsLimitParsed },
			// Populate user details
			{
				$lookup: {
					from: 'users', // The actual name of the users collection
					localField: 'user_id',
					foreignField: '_id',
					as: 'userDetails'
				}
			},
			// Deconstruct userDetails array and handle missing user
			{
				$unwind: {
					path: '$userDetails',
					preserveNullAndEmptyArrays: true // Keep comments even if user is deleted
				}
			},
			// Shape the final output
			{
				$project: {
					_id: 1,
					product_id: 1,
					parent_id: 1,
					text: 1,
					createdAt: 1, 
					updatedAt: 1, 
					upvotedBy: 1, // Keep for client-side state if needed
					downvotedBy: 1, // Keep for client-side state if needed
					votes: 1, // Use stored field
					replyCount: 1, // Use stored field
					user: { // Combine user details
						_id: '$userDetails._id',
						name: { $ifNull: ['$userDetails.name', 'Unknown User'] },
						profilePicture: { 
							$ifNull: [
								'$userDetails.cachedProfilePicture', 
								'$userDetails.profilePicture', 
								'/default-profile.png'
							] 
						}
					}
					// user_id: 1, // Removed, user object preferred
				}
			}
		];

		const commentsAggregatePromise = db.collection('comments').aggregate(commentsPipeline).toArray();
		const totalCommentsPromise = db.collection('comments').countDocuments({
			product_id: product._id,
			parent_id: null
		});

		// Run comment aggregation and count in parallel
		const [topLevelComments, totalTopLevelComments] = await Promise.all([commentsAggregatePromise, totalCommentsPromise]);
		console.timeEnd('[Perf] Fetch Paginated Comments'); // Ends after both aggregate and count
		// --- End Fetch Paginated Comments & Count ---

		console.log(`[Server] Found ${topLevelComments.length} top-level comments for page ${commentsPageParsed} (Total: ${totalTopLevelComments})`);

		// --- Prepare Response Data (negligible time, not timed) ---
		// Update product object again (this is minor)
		product = {
			...product,
			lowest_ask: lowestAsk,
			highest_bid: highestBid,
			images: topImages // Add fetched images here
		};

		const responseData = {
			product,
			listings: {
				items: listings,
				total: totalListings,
				page: parseInt(listingsPage),
				limit: parseInt(listingsLimit),
				totalPages: Math.ceil(totalListings / parseInt(listingsLimit))
			},
			comments: {
				items: topLevelComments, // Paginated, sorted top-level comments
				total: totalTopLevelComments, // Total count of *top-level* comments
				page: commentsPageParsed,
				limit: commentsLimitParsed,
				totalPages: Math.ceil(totalTopLevelComments / commentsLimitParsed)
			}
		};
		// --- End Prepare Response Data ---

		console.timeEnd('[Perf] Total Endpoint'); // End total timer
		res.json(responseData);
	} catch (error) {
		console.timeEnd('[Perf] Total Endpoint'); // Ensure timer ends even on error
		console.error('Error fetching product data:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});
// --- END API Endpoint to get product data (Returns nested comments) ---

/**
 * @route POST /api/comments
 * @desc Add a new comment or reply to a product. Requires authentication.
 * @body { productId, text, parentId (optional) }
 * @returns { comment object with votes field }
 */
// API Endpoint to add a new comment
app.post('/api/comments', authenticateToken, postCommentLimiter, async (req, res) => {
	const { productId, blogPostId, text, parentId } = req.body;
	const userId = req.user.id;
	const logEntry = `[${new Date().toISOString()}] POST /api/comments\nBody: ${JSON.stringify(req.body)}\n`;
	fs.appendFileSync('comment_post_debug.log', logEntry);
	console.log(`[Server] Received comment submission for product ID: ${productId} or blog post ID: ${blogPostId}`);

	if ((!productId && !blogPostId) || !userId || !text) {
		console.log('[Server] Invalid comment data received:', req.body);
		return res.status(400).json({ error: 'Missing required fields (productId or blogPostId, userId, text)' });
	}

	// Basic validation/sanitization
	const sanitizedText = purify.sanitize(text);
	if (!sanitizedText.trim()) {
		console.log('[Server] Sanitized comment text is empty.');
		return res.status(400).json({ error: 'Comment text cannot be empty after sanitization.' });
	}

	try {
		const { db } = await connectToDatabase();
		
		const commentData = {
			user_id: new ObjectId(userId), // Ensure userId is ObjectId if schema expects it
			text: sanitizedText,
			parent_id: parentId ? new ObjectId(parentId) : null,
			// No need to specify upvotedBy, downvotedBy, votes, replyCount, createdAt, updatedAt
			// Mongoose will handle defaults and timestamps based on the schema.
		};

		if (productId) {
			try {
				const productObjectId = new ObjectId(productId);
				// Use Mongoose model to check for existence for consistency
				const productExists = await Product.countDocuments({ _id: productObjectId });
				if (productExists === 0) {
					console.log(`[Server] Product with ID ${productId} not found for comment.`);
					return res.status(404).json({ error: `Product with ID ${productId} not found.` });
				}
				commentData.product_id = productObjectId;
			} catch (idError) {
				console.log('[Server] Invalid productId format for comment:', productId);
				return res.status(400).json({ error: 'Invalid productId format.' });
			}
		} else if (blogPostId) {
			try {
				const blogPostObjectId = new mongoose.Types.ObjectId(blogPostId);
				// Use Mongoose model to check for existence
				const blogPostExists = await BlogPost.countDocuments({ _id: blogPostObjectId });
				if (blogPostExists === 0) {
					console.log(`[Server] Blog post with ID ${blogPostId} not found for comment.`);
					return res.status(404).json({ error: `Blog post with ID ${blogPostId} not found.` });
				}
				commentData.blogPostId = blogPostObjectId; // Correct field name
			} catch (idError) {
				console.log('[Server] Invalid blogPostId format for comment:', blogPostId);
				return res.status(400).json({ error: 'Invalid blogPostId format.' });
			}
		}

		// --- MODIFIED: Insert comment and update parent reply count if applicable ---
		let session;
		try {
			// Use a transaction if updating parent count to ensure atomicity
			// Mongoose create handles sessions differently or might not need explicit session management
			// if connection options are set. We might need to adjust this if transactions are critical.
			// For now, let's simplify and assume Comment.create handles atomicity or session is managed elsewhere.
			/*
			if (parentId) {
				const client = db.client; // Get underlying client from the connected db object
				session = client.startSession();
				session.startTransaction();
			}
			*/

			// 1. Create the new comment using Mongoose model
			
			// Using Comment.create() which leverages Mongoose schema (including timestamps)
			// Note: Transaction handling might need review if parent update needs to be atomic with creation.
			// Mongoose `create` can accept an array and options like `session`.
			// For a single document, it returns the created document.
			const insertedComment = await Comment.create(commentData); // Use Mongoose Model here

			// const result = await db.collection('comments').insertOne(commentToInsert, { session }); // Old raw driver call
			// const insertedId = result.insertedId; // No longer needed

			// 2. If it's a reply, increment parent's replyCount using Mongoose
			if (parentId) {
				const parentObjectId = new ObjectId(parentId);
				console.log(`[Server] Incrementing replyCount for parent comment: ${parentObjectId}`);
				// Use Mongoose updateOne for consistency
				await Comment.updateOne(
					{ _id: parentObjectId },
					{ $inc: { replyCount: 1 } }
					// { session } // Session needs to be handled correctly with Mongoose if needed
				);
				// Old raw driver call:
				// await db.collection('comments').updateOne(
				// 	{ _id: parentObjectId },
				// 	{ $inc: { replyCount: 1 } },
				// 	{ session }
				// );
			}

			// Commit transaction if started (Needs review with Mongoose create/update)
			/*
			if (session) {
				await session.commitTransaction();
				console.log("[Server] Comment and parent reply count updated within transaction.");
			} else {
				 console.log("[Server] Comment creation processed."); // Adjusted log
			}
			*/
			console.log("[Server] Comment creation/update processed."); // Simplified log

			// 3. Fetch the newly inserted comment to return it (No longer needed, create returns it)
			// const insertedComment = await db.collection('comments').findOne({ _id: insertedId }); // Old fetch

			if (!insertedComment) {
				// This should ideally not happen with Comment.create unless an error was thrown
				console.error("[Server] Failed to create comment or retrieve result.");
				throw new Error("Failed to create comment.");
			}

			console.log('[Server] Comment created successfully via Mongoose:', insertedComment);
			// Need to populate user details manually if not done by default or middleware
			// Let's fetch the user details separately before sending response for consistency
			const populatedComment = await Comment.findById(insertedComment._id).populate('user_id', 'name profilePicture cachedProfilePicture');

			// Map to the structure expected by the frontend (if needed, check API contract)
			 const finalComment = populatedComment ? {
				...populatedComment.toObject(), // Convert Mongoose doc to plain object
				user: populatedComment.user_id ? { // Rename user_id to user
					_id: populatedComment.user_id._id,
					name: populatedComment.user_id.name,
					profilePicture: populatedComment.user_id.cachedProfilePicture || populatedComment.user_id.profilePicture,
				} : { name: 'Unknown User', profilePicture: '/default-profile.png' },
				// Remove user_id field if frontend doesn't expect it
				// user_id: undefined 
			} : insertedComment.toObject(); // Fallback if population fails

			// delete finalComment.user_id; // Clean up if needed

			res.status(201).json(finalComment); // Return the populated comment object

		} catch (error) {
			// If transaction was active, abort it (Needs review)
			/*
			if (session) {
				console.error("[Server] Transaction aborted due to error:", error);
				await session.abortTransaction();
			}
			*/
			// Re-throw error to be caught by the outer catch block - handled below
			// throw error; 
			console.error('[Server] Error creating comment via Mongoose:', error); // Log specific error
			// Ensure specific error handling if needed (e.g., validation errors)
			if (error.name === 'ValidationError') {
				return res.status(400).json({ error: error.message });
			}
			// Throw for the outer catch block
			throw error; 
		} finally {
			// End the session if it was started (Needs review)
			/*
			if (session) {
				session.endSession();
			}
			*/
		}
		// --- END MODIFIED ---

	} catch (error) {
		console.error('Error adding comment:', error);
		res.status(500).json({ error: 'Internal server error while adding comment' });
	}
});

// --- NEW: Comment Voting Endpoints ---

/**
 * @route PUT /api/comments/:commentId/vote
 * @desc Upvote a comment. Requires authentication. Atomically updates upvotedBy/downvotedBy arrays.
 * @param commentId - The ID of the comment to upvote
 * @returns { updated comment object with votes field }
 */
// Vote for a comment (Upvote) - Requires Authentication
app.put('/api/comments/:commentId/vote', authenticateToken, voteLimiter, async (req, res) => {
	const { commentId } = req.params;
	const userId = new ObjectId(req.user.id); // Get user ID from authenticated token
	console.log(`[Server] User ${userId} attempting to vote for comment ID: ${commentId}`);

	try {
		if (!ObjectId.isValid(commentId)) {
			console.log('[Server] Invalid commentId format for vote:', commentId);
			return res.status(400).json({ error: 'Invalid commentId format.' });
		}
		const commentObjectId = new ObjectId(commentId);
		const { db } = await connectToDatabase();

		// --- MODIFIED VOTE LOGIC ---
		// 1. Fetch the current comment state to determine vote delta
		const currentComment = await db.collection('comments').findOne({ _id: commentObjectId });

		if (!currentComment) {
			console.log(`[Server] Comment with ID ${commentId} not found for voting.`);
			return res.status(404).json({ error: `Comment with ID ${commentId} not found.` });
		}

		const isAlreadyUpvoted = currentComment.upvotedBy?.some(id => id.equals(userId));
		const isAlreadyDownvoted = currentComment.downvotedBy?.some(id => id.equals(userId));
		
		let voteDelta = 0;
		const updateOps = {};

		if (isAlreadyUpvoted) {
			// User is cancelling their upvote
			updateOps.$pull = { upvotedBy: userId };
			voteDelta = -1;
			console.log(`[Server] User ${userId} cancelling upvote for comment ${commentId}`);
		} else {
			// User is adding an upvote (or switching from downvote)
			updateOps.$addToSet = { upvotedBy: userId };
			voteDelta = 1; // Starts at +1 for adding the upvote
			if (isAlreadyDownvoted) {
				// User is switching from downvote to upvote
				updateOps.$pull = { downvotedBy: userId };
				voteDelta = 2; // +1 for removing downvote, +1 for adding upvote
				console.log(`[Server] User ${userId} switching downvote to upvote for comment ${commentId}`);
			} else {
				 console.log(`[Server] User ${userId} adding upvote for comment ${commentId}`);
			}
		}
		
		// Add the vote change to the update operations
		if (voteDelta !== 0) {
			updateOps.$inc = { votes: voteDelta };
		} else {
			// Should not happen with this logic, but good practice
			console.log(`[Server] No vote change detected for user ${userId} on comment ${commentId}`);
			// If no change, we could return early, but updating ensures consistency if state was weird
		}

		// 2. Atomically update the comment with vote delta and array changes
		const result = await db.collection('comments').updateOne(
			{ _id: commentObjectId },
			updateOps
		);

		if (result.matchedCount === 0) {
			// Should have been caught by the initial findOne, but double-check
			console.log(`[Server] Comment with ID ${commentId} not found during update.`);
			return res.status(404).json({ error: `Comment with ID ${commentId} not found.` });
		}
		
		// 3. Fetch the updated comment to return the final state
		const updatedComment = await db.collection('comments').findOne({ _id: commentObjectId });

		if (!updatedComment) {
			console.log(`[Server] Could not retrieve updated comment ${commentId} after voting.`);
			// This indicates a potential issue if the update succeeded but fetch failed
			return res.status(500).json({ error: 'Failed to retrieve comment state after update.' }); 
		}
		// --- END MODIFIED VOTE LOGIC ---

		console.log('[Server] Comment voted successfully:', updatedComment);
		res.json(updatedComment); // Return updated comment with calculated votes

	} catch (error) {
		console.error(`[Server] Error voting for comment ${commentId}:`, error);
		res.status(500).json({ error: 'Internal server error while voting for comment' });
	}
});

/**
 * @route PUT /api/comments/:commentId/downvote
 * @desc Downvote a comment. Requires authentication. Atomically updates upvotedBy/downvotedBy arrays.
 * @param commentId - The ID of the comment to downvote
 * @returns { updated comment object with votes field }
 */
// Downvote a comment - Requires Authentication
app.put('/api/comments/:commentId/downvote', authenticateToken, voteLimiter, async (req, res) => {
	const { commentId } = req.params;
	const userId = new ObjectId(req.user.id); // Get user ID from authenticated token
	console.log(`[Server] User ${userId} attempting to downvote comment ID: ${commentId}`);

	try {
		if (!ObjectId.isValid(commentId)) {
			console.log('[Server] Invalid commentId format for downvote:', commentId);
			return res.status(400).json({ error: 'Invalid commentId format.' });
		}
		const commentObjectId = new ObjectId(commentId);
		const { db } = await connectToDatabase();

		// --- MODIFIED DOWNVOTE LOGIC ---
		// 1. Fetch the current comment state to determine vote delta
		const currentComment = await db.collection('comments').findOne({ _id: commentObjectId });

		if (!currentComment) {
			console.log(`[Server] Comment with ID ${commentId} not found for downvoting.`);
			return res.status(404).json({ error: `Comment with ID ${commentId} not found.` });
		}

		const isAlreadyUpvoted = currentComment.upvotedBy?.some(id => id.equals(userId));
		const isAlreadyDownvoted = currentComment.downvotedBy?.some(id => id.equals(userId));
		
		let voteDelta = 0;
		const updateOps = {};

		if (isAlreadyDownvoted) {
			// User is cancelling their downvote
			updateOps.$pull = { downvotedBy: userId };
			voteDelta = 1; // Vote score increases by 1
			 console.log(`[Server] User ${userId} cancelling downvote for comment ${commentId}`);
		} else {
			// User is adding a downvote (or switching from upvote)
			updateOps.$addToSet = { downvotedBy: userId };
			voteDelta = -1; // Starts at -1 for adding the downvote
			if (isAlreadyUpvoted) {
				// User is switching from upvote to downvote
				updateOps.$pull = { upvotedBy: userId };
				voteDelta = -2; // -1 for removing upvote, -1 for adding downvote
				console.log(`[Server] User ${userId} switching upvote to downvote for comment ${commentId}`);
			} else {
				console.log(`[Server] User ${userId} adding downvote for comment ${commentId}`);
			}
		}

		 // Add the vote change to the update operations
		if (voteDelta !== 0) {
			updateOps.$inc = { votes: voteDelta };
		} else {
			console.log(`[Server] No vote change detected for user ${userId} on comment ${commentId} (downvote)`);
		}

		// 2. Atomically update the comment with vote delta and array changes
		const result = await db.collection('comments').updateOne(
			{ _id: commentObjectId },
			updateOps
		);

		if (result.matchedCount === 0) {
			console.log(`[Server] Comment with ID ${commentId} not found during update (downvote).`);
			return res.status(404).json({ error: `Comment with ID ${commentId} not found.` });
		}
		
		// 3. Fetch the updated comment to return the final state
		const updatedComment = await db.collection('comments').findOne({ _id: commentObjectId });

		if (!updatedComment) {
			console.log(`[Server] Could not retrieve updated comment ${commentId} after downvoting.`);
			return res.status(500).json({ error: 'Failed to retrieve comment state after update.' }); 
		}
		// --- END MODIFIED DOWNVOTE LOGIC ---

		console.log('[Server] Comment downvoted successfully:', updatedComment);
		res.json(updatedComment); // Return updated comment with calculated votes

	} catch (error) {
		console.error(`[Server] Error downvoting comment ${commentId}:`, error);
		res.status(500).json({ error: 'Internal server error while downvoting comment' });
	}
});

// --- NEW: Endpoint to soft-delete a user's own comment ---
/**
 * @route DELETE /api/comments/:commentId/by-user
 * @desc Soft delete a comment. Requires authentication and user must be the author.
 * @param commentId - The ID of the comment to delete
 * @returns { message: string } on success, error object otherwise
 */
app.delete('/api/comments/:commentId/by-user', authenticateToken, async (req, res) => {
	const { commentId } = req.params;
	const userIdFromToken = req.user.id; // From JWT payload
	console.log(`[Server] User ${userIdFromToken} attempting to delete comment ID: ${commentId}`);

	if (!mongoose.Types.ObjectId.isValid(commentId)) {
		console.log('[Server] Invalid commentId format for delete:', commentId);
		return res.status(400).json({ error: 'Invalid commentId format.' });
	}
	const commentObjectId = new mongoose.Types.ObjectId(commentId);
	const userObjectId = new mongoose.Types.ObjectId(userIdFromToken);

	try {
		const commentToDelete = await Comment.findById(commentObjectId);

		if (!commentToDelete) {
			console.log(`[Server] Comment with ID ${commentId} not found for deletion.`);
			return res.status(404).json({ error: 'Comment not found.' });
		}

		// Ensure the authenticated user is the author of the comment
		if (!commentToDelete.user_id.equals(userObjectId)) {
			console.log(`[Server] Unauthorized attempt by user ${userIdFromToken} to delete comment ${commentId} owned by ${commentToDelete.user_id}.`);
			return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
		}

		if (commentToDelete.isDeleted) {
			console.log(`[Server] Comment ${commentId} is already deleted.`);
			return res.status(400).json({ error: 'Comment is already deleted.' });
		}

		// Soft delete: Mark as deleted and clear sensitive content
		commentToDelete.isDeleted = true;
		commentToDelete.deletedAt = new Date();
		commentToDelete.text = '[deleted by user]';
		// Potentially clear upvotedBy/downvotedBy arrays if desired for privacy, or keep for historical vote count
		// commentToDelete.upvotedBy = [];
		// commentToDelete.downvotedBy = [];
		// commentToDelete.votes = 0; // Or keep the votes as they were at time of deletion

		await commentToDelete.save();

		// If this comment was a reply, decrement parent's replyCount
		if (commentToDelete.parent_id) {
			await Comment.updateOne(
				{ _id: commentToDelete.parent_id },
				{ $inc: { replyCount: -1 } }
			);
			console.log(`[Server] Decremented replyCount for parent comment: ${commentToDelete.parent_id}`);
		}

		console.log(`[Server] Comment ${commentId} soft-deleted successfully by user ${userIdFromToken}.`);
		res.status(200).json({ message: 'Comment deleted successfully.' });

	} catch (error) {
		console.error(`[Server] Error deleting comment ${commentId}:`, error);
		res.status(500).json({ error: 'Internal server error while deleting comment.' });
	}
});
// --- END NEW Comment Deletion Endpoint ---

/**
 * @route GET /api/comments/:commentId/replies
 * @desc Fetches all replies for a given comment, including user info and reply count for each reply.
 * @param commentId - The ID of the parent comment
 * @returns { array of reply comment objects }
 */
// --- NEW: Endpoint to Fetch Replies for a Comment ---
app.get('/api/comments/:commentId/replies', async (req, res) => {
	const { commentId } = req.params;
	// Add optional pagination if needed later:
	// const { page = 1, limit = 10 } = req.query;
	// const limitParsed = parseInt(limit);
	// const pageParsed = parseInt(page);
	// const skipAmount = (pageParsed - 1) * limitParsed;

	console.log(`[Server] Fetching replies for comment ID: ${commentId}`);

	if (!ObjectId.isValid(commentId)) {
		console.log('[Server] Invalid commentId format for fetching replies:', commentId);
		return res.status(400).json({ error: 'Invalid commentId format.' });
	}
	const parentCommentId = new ObjectId(commentId);

	try {
		const { db } = await connectToDatabase();

		// Optional: Check if parent comment exists
		const parentExists = await db.collection('comments').countDocuments({ _id: parentCommentId });
		if (parentExists === 0) {
			console.log(`[Server] Parent comment with ID ${commentId} not found when fetching replies.`);
			return res.status(404).json({ error: `Parent comment with ID ${commentId} not found.` });
		}

		const repliesPipeline = [
			// Match replies for the given parent
			{ $match: { parent_id: parentCommentId } },
			// Sort replies by stored votes (desc), then timestamp (desc)
			{ $sort: { votes: -1, createdAt: -1 } }, 
			// Optional Pagination
			// { $skip: skipAmount },
			// { $limit: limitParsed },
			// Populate user details
			{
				$lookup: {
					from: 'users',
					localField: 'user_id',
					foreignField: '_id',
					as: 'userDetails'
				}
			},
			// Deconstruct userDetails
			{
				$unwind: {
					path: '$userDetails',
					preserveNullAndEmptyArrays: true
				}
			},
			// Shape the output
			{
				$project: {
					_id: 1,
					product_id: 1,
					parent_id: 1,
					text: 1,
					createdAt: 1,
					updatedAt: 1,
					upvotedBy: 1, // Keep for client-side state if needed
					downvotedBy: 1, // Keep for client-side state if needed
					votes: 1, // Use stored field
					replyCount: 1, // Use stored field
					user: {
						_id: '$userDetails._id',
						name: { $ifNull: ["$userDetails.name", 'Unknown User'] },
						profilePicture: { 
							$ifNull: [
								"$userDetails.cachedProfilePicture", 
								"$userDetails.profilePicture", 
								'/default-profile.png'
							] 
						}
					}
					// replyCount: { $size: '$nestedReplyDocs' }, // Use stored field instead
				}
			}
		];

		const replies = await db.collection('comments').aggregate(repliesPipeline).toArray();

		// Optional: Get total count if paginating replies
		// const totalReplies = await db.collection('comments').countDocuments({ parent_id: parentCommentId });

		console.log(`[Server] Found ${replies.length} replies for comment ${commentId}`);

		// Return just the array of replies
		res.json(replies);

	} catch (error) {
		console.error(`[Server] Error fetching replies for comment ${commentId}:`, error);
		res.status(500).json({ error: 'Internal server error while fetching replies' });
	}
});
// --- END NEW Endpoint --- 

// --- NEW: Endpoint to Report a Comment ---
app.post('/api/comments/:commentId/report', authenticateToken, async (req, res) => {
	const { commentId } = req.params;
	const { reason } = req.body;
	const reporterId = req.user.id; // From authenticated token

	console.log(`[Server] User ${reporterId} attempting to report comment ID: ${commentId}. Reason: ${reason}`);

	if (!mongoose.Types.ObjectId.isValid(commentId)) {
		return res.status(400).json({ error: 'Invalid comment ID format.' });
	}
	if (!reason || typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 1000) {
		return res.status(400).json({ error: 'Reason must be a string between 5 and 1000 characters.' });
	}

	try {
		const commentObjectId = new mongoose.Types.ObjectId(commentId);

		// 1. Fetch the comment to report
		const commentToReport = await Comment.findById(commentObjectId)
			.populate('user_id', 'name email') // Populate commenter details for snapshot
			.populate('product_id', 'title slug tags') // Populate product details for context and TAGS
			.populate('blogPostId', 'title slug tags') // <-- NEW: Populate blog post details & corrected field name
			.lean();

		if (!commentToReport) {
			return res.status(404).json({ error: 'Comment to report not found.' });
		}

		// 2. Check if this user has already submitted an open report for this comment
		const existingOpenReport = await Report.findOne({
			reporterId: new mongoose.Types.ObjectId(reporterId),
			reportedItemId: commentObjectId,
			reportedItemRef: 'Comment',
			status: 'open'
		});

		if (existingOpenReport) {
			return res.status(409).json({ error: 'You have already submitted an open report for this comment.' });
		}

		// 3. Create the report document
		const newReport = new Report({
			reporterId: new mongoose.Types.ObjectId(reporterId),
			reportedItemId: commentObjectId,
			reportedItemRef: 'Comment',
			reason: reason.trim(),
			tags: commentToReport.product_id?.tags || commentToReport.blogPostId?.tags || [], // Use combined tags
			reportedItemSnapshot: {
				text: commentToReport.text,
				commenterName: commentToReport.user_id?.name,
				commenterEmail: commentToReport.user_id?.email,
				parentContentId: commentToReport.product_id?._id || commentToReport.blogPostId?._id,
				parentContentTitle: commentToReport.product_id?.title || commentToReport.blogPostId?.title,
				createdAt: commentToReport.createdAt,
			},
			status: 'open',
		});

		await newReport.save();

		console.log(`[Server] Report ${newReport._id} created for comment ${commentId}`);
		res.status(201).json({ message: 'Comment reported successfully. Our team will review it shortly.', reportId: newReport._id });

	} catch (error) {
		console.error(`[Server] Error reporting comment ${commentId}:`, error);
		if (error.name === 'ValidationError') {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: 'Internal server error while reporting comment.' });
	}
});
// --- END NEW Comment Report Endpoint ---

// API Endpoint to add a new listing
app.post('/api/listings', authenticateToken, listingWriteLimiter, async (req, res) => {
	const { productId, type, price, location, description, image } = req.body;
	const sellerId = req.user.id;
	console.log(`[Server] Received listing submission for product ID: ${productId}`);

	if (!productId || !type || !sellerId || price === undefined || !location || !description) {
		console.log('[Server] Invalid listing data received:', req.body);
		return res.status(400).json({ error: 'Missing required fields (productId, type, sellerId, price, location, description)' });
	}
	if (type !== 'ask' && type !== 'bid') {
		console.log('[Server] Invalid listing type:', type);
		return res.status(400).json({ error: 'Invalid listing type. Must be \'ask\' or \'bid\'.' });
	}
	if (typeof price !== 'number' || price < 0) {
		 console.log('[Server] Invalid listing price:', price);
		return res.status(400).json({ error: 'Invalid price. Must be a non-negative number.' });
	}

	const sanitizedDescription = purify.sanitize(description);
	if (!sanitizedDescription.trim()) {
		console.log('[Server] Sanitized listing description is empty.');
		return res.status(400).json({ error: 'Listing description cannot be empty after sanitization.' });
	}

	try {
		const { db } = await connectToDatabase();
		
		let productObjectId;
		try {
			productObjectId = new ObjectId(productId);
			const productExists = await db.collection('products').findOne({ _id: productObjectId });
			if (!productExists) {
				console.log(`[Server] Product with ID ${productId} not found.`);
				return res.status(404).json({ error: `Product with ID ${productId} not found.` });
			}
		} catch (idError) {
			console.log('[Server] Invalid productId format for listing:', productId);
			return res.status(400).json({ error: 'Invalid productId format.' });
		}

		const newListing = {
			product_id: productObjectId,
			type: type, 
			seller_id: new ObjectId(sellerId),
			price: price,
			location: location,
			description: sanitizedDescription,
			image: image || null, 
			timestamp: new Date(),
			editorUsername: req.user.name
		};

		console.log('[Server] Inserting new listing:', newListing);
		const result = await db.collection('listings').insertOne(newListing);
		const insertedListing = await db.collection('listings').findOne({ _id: result.insertedId });

		console.log('[Server] Listing inserted successfully:', insertedListing);
		res.status(201).json(insertedListing);

	} catch (error) {
		console.error('Error adding listing:', error);
		res.status(500).json({ error: 'Internal server error while adding listing' });
	}
});

// --- NEW: API Endpoint to delete a listing ---
/**
 * @route DELETE /api/listings/:listingId
 * @desc Delete a listing. Requires authentication and user must be the seller.
 * @param listingId - The ID of the listing to delete
 * @returns { message: string } on success, error object otherwise
 */
app.delete('/api/listings/:listingId', authenticateToken, listingWriteLimiter, async (req, res) => {
	const { listingId } = req.params;
	const userId = req.user.id; // Get user ID from authenticated token
	console.log(`[Server] User ${userId} attempting to delete listing ID: ${listingId}`);

	if (!mongoose.Types.ObjectId.isValid(listingId)) {
		console.log('[Server] Invalid listingId format for delete:', listingId);
		return res.status(400).json({ error: 'Invalid listingId format.' });
	}

	const listingObjectId = new mongoose.Types.ObjectId(listingId);
	const userObjectId = new mongoose.Types.ObjectId(userId);

	try {
		// Use Listing model (Mongoose) for deletion
		// findOneAndDelete ensures atomicity and returns the deleted doc (or null)
		const deletedListing = await Listing.findOneAndDelete({
			_id: listingObjectId,
			seller_id: userObjectId // Ensure the authenticated user is the seller
		});

		if (!deletedListing) {
			// Could be listing not found OR user not authorized
			// Check if listing exists to differentiate
			const listingExists = await Listing.findById(listingObjectId);
			if (listingExists) {
				console.log(`[Server] Unauthorized attempt by user ${userId} to delete listing ${listingId}`);
				return res.status(403).json({ error: 'You are not authorized to delete this listing.' });
			} else {
				console.log(`[Server] Listing with ID ${listingId} not found for deletion.`);
				return res.status(404).json({ error: `Listing with ID ${listingId} not found.` });
			}
		}

		console.log(`[Server] Listing ${listingId} deleted successfully by user ${userId}.`);
		res.status(200).json({ message: 'Listing deleted successfully.' });

	} catch (error) {
		console.error(`[Server] Error deleting listing ${listingId}:`, error);
		res.status(500).json({ error: 'Internal server error while deleting listing' });
	}
});
// --- END NEW Endpoint ---

// API Endpoint to add a new Part
app.post('/api/parts', authenticateToken, async (req, res) => { // Added authenticateToken
	const { name, tags, partNumbers, description /*, images */ } = req.body; // Removed creatorUsername, images is also in body but handled separately by client for newPart object
	const creatorNameFromToken = req.user.name; // Get creator's name from token

	console.log('[Server] Received new part submission:');
	// Log what's actually received and who is creating it
	console.log('Body:', req.body);
	console.log('Creator (from token):', creatorNameFromToken);


	// Updated validation: creatorUsername is no longer from body, and creatorNameFromToken will always exist if authenticateToken passes
	if (!name || !tags || !Array.isArray(tags) || tags.length === 0 || !description) {
		console.log('[Server] Invalid part data received (missing name, tags, or description):', req.body);
		return res.status(400).json({ error: 'Missing required fields (name, tags, description)' });
	}

	const sanitizedName = name.trim();
	const sanitizedTags = tags.map(tag => tag.trim().toLowerCase()).filter(Boolean);

	// --- UPDATED partNumbers sanitization ---
	let sanitizedPartNumbers = [];
	if (Array.isArray(partNumbers)) {
		sanitizedPartNumbers = partNumbers
			.map(pn => {
				if (typeof pn === 'object' && pn !== null && typeof pn.number === 'string') {
					const number = pn.number.trim();
					const link = typeof pn.link === 'string' ? pn.link.trim() : undefined; // Sanitize link if present
					if (number) { // Ensure number is not empty after trimming
						return { number, ...(link && { link }) }; // Include link only if it's not empty
					}
				} else if (typeof pn === 'string') {
					// Handle legacy string format if needed during creation (optional)
					const number = pn.trim();
					if (number) return { number };
				}
				return null; // Invalid format
			})
			.filter(Boolean); // Remove null entries
	}
	console.log('[Server] Sanitized part numbers:', sanitizedPartNumbers);
	// --- END UPDATED ---

	if (!sanitizedName || sanitizedTags.length === 0) {
		console.log('[Server] Invalid part data after sanitization.');
		return res.status(400).json({ error: 'Invalid data after sanitization (name/tags).' });
	}

	const slug = slugify(sanitizedName, { lower: true, strict: true, remove: /[*+~.()"'!:@]/g });
	console.log(`[Server] Generated slug: ${slug}`);

	try {
		const { db } = await connectToDatabase();

		const existingPart = await db.collection('products').findOne({ slug: slug });
		if (existingPart) {
			console.log(`[Server] Duplicate slug found: ${slug}`);
			return res.status(409).json({ 
				error: 'A part with a similar name already exists.',
				existingSlug: slug
			});
		}

		const fullHtml = purify.sanitize(marked.parse(description));
		const previewHtml = generatePreviewHtml(fullHtml);
		
		const newPart = {
			title: sanitizedName,
			slug: slug,
			tags: sanitizedTags,
			part_numbers: sanitizedPartNumbers,
			description_markdown: description,
			description_full_html: fullHtml,
			description_preview_html: previewHtml,
			production_years: {},
			images: req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0 && isValidUrl(req.body.images[0]) ? [{ url: req.body.images[0], uploader: creatorNameFromToken, votes: 0, createdAt: new Date() }] : [], // Handle initial image if provided
			created_by: creatorNameFromToken, // Use name from token
			created_at: new Date(),
			updated_at: new Date(),
			initial_description_markdown: description,
			edit_history: [],
			is_verified: false
		};

		console.log('[Server] Inserting new part:', newPart);
		const result = await db.collection('products').insertOne(newPart);
		const insertedPart = await db.collection('products').findOne({ _id: result.insertedId });

		console.log('[Server] Part inserted successfully:', insertedPart);
		res.status(201).json(insertedPart);

	} catch (error) {
		console.error('[Server] Error adding part:', error);
		res.status(500).json({ error: 'Internal server error while adding part' });
	}
});

// API Endpoint to update a product (Handles Markdown)
app.put('/api/products/:productId', async (req, res) => {
	const { productId } = req.params;
	const updateData = req.body;

	console.log(`[Server] Updating product with ID: ${productId}`);
	console.log('[Server] Raw request body:', req.body);
	console.log('[Server] Raw part_numbers from request:', req.body.part_numbers);

	// Initialize updateFields at the start
	const updateFields = {
		updated_at: new Date()
	};
	
	// Check part_numbers specifically
	if (req.body.part_numbers) {
		console.log('[Server] Part numbers type:', typeof req.body.part_numbers);
		console.log('[Server] Part numbers isArray:', Array.isArray(req.body.part_numbers));
		
		// Ensure part_numbers is an array of objects with required properties
		if (Array.isArray(req.body.part_numbers)) {
			updateFields.part_numbers = req.body.part_numbers
				.map(pn => {
					// If it's already a valid object
					if (typeof pn === 'object' && pn !== null && typeof pn.number === 'string') {
						return {
							number: pn.number.trim(),
							...(pn.link && { link: pn.link.trim() })
						};
					}
					// If it's a string (legacy format)
					if (typeof pn === 'string') {
						return { number: pn.trim() };
					}
					return null;
				})
				.filter(Boolean); // Remove any invalid entries
			
			console.log('[Server] Processed part_numbers:', updateFields.part_numbers);
		} else if (typeof req.body.part_numbers === 'string') {
			try {
				// Handle case where part_numbers might be a JSON string
				const parsed = JSON.parse(req.body.part_numbers);
				if (Array.isArray(parsed)) {
					updateFields.part_numbers = parsed
						.map(pn => {
							if (typeof pn === 'object' && pn !== null && typeof pn.number === 'string') {
								return {
									number: pn.number.trim(),
									...(pn.link && { link: pn.link.trim() })
								};
							}
							if (typeof pn === 'string') {
								return { number: pn.trim() };
							}
							return null;
						})
						.filter(Boolean);
				} else {
					console.log('[Server] Parsed part_numbers is not an array');
					updateFields.part_numbers = [];
				}
			} catch (e) {
				console.log('[Server] Failed to parse part_numbers string:', e.message);
				updateFields.part_numbers = [];
			}
		} else {
			console.log('[Server] Invalid part_numbers format, setting to empty array');
			updateFields.part_numbers = [];
		}
	}

	try {
		const { db } = await connectToDatabase();
		
		// Validate product ID
		let productObjectId;
		if (!ObjectId.isValid(productId)) {
			console.log('[Server] Invalid productId format:', productId);
			return res.status(400).json({ error: 'Invalid productId format.' });
		}
		productObjectId = new ObjectId(productId);

		// Check if product exists AND fetch current state for history
		const existingProduct = await db.collection('products').findOne({ _id: productObjectId });
		if (!existingProduct) {
			console.log(`[Server] Product with ID ${productId} not found.`);
			return res.status(404).json({ error: `Product with ID ${productId} not found.` });
		}

		// Prepare history entry if description is changing
		let historyEntry = null;
		if (updateData.description_markdown !== undefined && updateData.editorUsername) {
			historyEntry = {
				user: updateData.editorUsername,
				timestamp: new Date(),
				description_markdown: existingProduct.description_markdown || ''
			};
			console.log('[Server] Prepared history entry:', historyEntry);
		}

		// Handle other fields
		if (updateData.title !== undefined) {
			updateFields.title = updateData.title.trim();
		}
		if (updateData.tags !== undefined) {
			updateFields.tags = Array.isArray(updateData.tags) 
				? updateData.tags.map(tag => String(tag).trim()).filter(Boolean) 
				: [];
		}

		// Handle description update (Markdown)
		if (updateData.description_markdown !== undefined) {
			const markdown = updateData.description_markdown;
			const fullHtml = purify.sanitize(marked.parse(markdown));
			const previewHtml = generatePreviewHtml(fullHtml);

			updateFields.description_markdown = markdown;
			updateFields.description_full_html = fullHtml;
			updateFields.description_preview_html = previewHtml;
		}

		// Handle editor username
		if (updateData.editorUsername) {
			updateFields.last_edited_by = updateData.editorUsername;
		}

		// Perform Update
		const updateOperation = { $set: updateFields };
		if (historyEntry) {
			updateOperation.$push = { edit_history: historyEntry };
		}

		// ADD THIS LOG: Inspect the object directly before stringify
		console.log('[Server] updateFields object before stringify:', updateFields);
		// Existing log:
		console.log('[Server] Final update operation:', JSON.stringify(updateOperation, null, 2));

		const result = await db.collection('products').updateOne(
			{ _id: productObjectId },
			updateOperation
		);

		if (result.matchedCount === 0) {
			return res.status(404).json({ error: 'Product not found during update.' });
		}
		
		// Fetch and return the updated product
		const updatedProduct = await db.collection('products').findOne({ _id: productObjectId });
		console.log('[Server] Updated product part_numbers:', updatedProduct.part_numbers);
		
		res.json(updatedProduct);

	} catch (error) {
		console.error('[Server] Error updating product:', error);
		res.status(500).json({ error: 'Internal server error while updating product' });
	}
});

// --- NEW: Image Management Endpoints ---

// Get all images for a specific product (sorted by votes)
app.get('/api/parts/:productId/images', async (req, res) => {
	const { productId } = req.params;
	console.log(`[Server] Fetching all images for product ID: ${productId}`);

	let productObjectId;
	try {
		if (!ObjectId.isValid(productId)) {
			console.log('[Server] Invalid productId format for images:', productId);
			// Return 400 for invalid ID format
			return res.status(400).json({ error: 'Invalid productId format.' }); 
		}
		productObjectId = new ObjectId(productId);
		const { db } = await connectToDatabase();

		// Check if product exists first (important!)
		const productExists = await db.collection('products').countDocuments({ _id: productObjectId });
		if (productExists === 0) {
			console.log(`[Server] Product with ID ${productId} not found when fetching images.`);
			// Return 404 if the product itself doesn't exist
			return res.status(404).json({ error: `Product with ID ${productId} not found.` });
		}

		// Fetch images for the product
		const images = await db.collection('images')
			.find({ product_id: productObjectId /* REMOVED: reported: { $ne: true } */ })
			.sort({ votes: -1 })
			.toArray();

		console.log(`[Server] Found ${images.length} images for product ID: ${productId}`);

		res.json(images);
	} catch (error) {
		console.error('Error fetching images:', error);
		res.status(500).json({ error: 'Internal server error while fetching images' });
	}
});

// Add image to a product (requires authentication)
app.post('/api/parts/:productId/images', authenticateToken, async (req, res) => {
	const { productId } = req.params;
	const { imageUrl } = req.body;
	console.log(`[Server] Image upload request received:`);
	console.log(`[Server] - Product ID: ${productId}`);
	console.log(`[Server] - Image URL: ${imageUrl}`);
	console.log(`[Server] - User ID: ${req.user.id}`);
	console.log(`[Server] - Headers:`, req.headers);

	if (!imageUrl) {
		console.log('[Server] Missing imageUrl in request body');
		return res.status(400).json({ error: 'Image URL is required.' });
	}

	let productObjectId;
	try {
		if (!ObjectId.isValid(productId)) {
			console.log('[Server] Invalid productId format for adding image:', productId);
			return res.status(400).json({ error: 'Invalid productId format.' });
		}
		productObjectId = new ObjectId(productId);
		const { db } = await connectToDatabase();

		// Check if product exists
		const productExists = await db.collection('products').countDocuments({ _id: productObjectId });
		if (productExists === 0) {
			console.log(`[Server] Product with ID ${productId} not found when adding image.`);
			return res.status(404).json({ error: `Product with ID ${productId} not found.` });
		}

		// Create new image document
		const newImage = {
			product_id: productObjectId,
			url: imageUrl,
			uploader_id: new ObjectId(req.user.id),
			uploader: req.user.name, // Use name from token
			votes: 0,
			upvotedBy: [],
			downvotedBy: [],
			reported: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		// Insert the new image
		const result = await db.collection('images').insertOne(newImage);
		const insertedImage = await db.collection('images').findOne({ _id: result.insertedId });

		console.log('[Server] Image added successfully:', insertedImage);
		res.status(201).json(insertedImage);

	} catch (error) {
		console.error('[Server] Error adding image:', error);
		res.status(500).json({ error: 'Internal server error while adding image' });
	}
});

// --- END NEW Image Management Endpoints ---

// --- NEW: Image Voting & Reporting Endpoints ---

// Upvote an image (requires authentication)
app.put('/api/images/:imageId/vote', authenticateToken, voteLimiter, async (req, res) => {
	const { imageId } = req.params;
	const userId = new ObjectId(req.user.id);
	console.log(`[Server] User ${userId} attempting to vote for image ID: ${imageId}`);

	try {
		if (!ObjectId.isValid(imageId)) {
			return res.status(400).json({ error: 'Invalid imageId format.' });
		}
		const imageObjectId = new ObjectId(imageId);
		const { db } = await connectToDatabase();

		const currentImage = await db.collection('images').findOne({ _id: imageObjectId });

		if (!currentImage) {
			return res.status(404).json({ error: `Image with ID ${imageId} not found.` });
		}

		const isAlreadyUpvoted = currentImage.upvotedBy?.some(id => id.equals(userId));
		const isAlreadyDownvoted = currentImage.downvotedBy?.some(id => id.equals(userId));
		
		let voteDelta = 0;
		const updateOps = {};

		if (isAlreadyUpvoted) {
			updateOps.$pull = { upvotedBy: userId };
			voteDelta = -1;
		} else {
			updateOps.$addToSet = { upvotedBy: userId };
			voteDelta = 1;
			if (isAlreadyDownvoted) {
				updateOps.$pull = { downvotedBy: userId };
				voteDelta = 2; 
			}
		}
		
		if (voteDelta !== 0) {
			updateOps.$inc = { votes: voteDelta };
		}

		const result = await db.collection('images').updateOne({ _id: imageObjectId }, updateOps);

		if (result.matchedCount === 0) {
			return res.status(404).json({ error: `Image with ID ${imageId} not found during update.` });
		}
		
		const updatedImage = await db.collection('images').findOne({ _id: imageObjectId });
		res.json(updatedImage);

	} catch (error) {
		console.error(`[Server] Error voting for image ${imageId}:`, error);
		res.status(500).json({ error: 'Internal server error while voting for image' });
	}
});

// Downvote an image (requires authentication)
app.put('/api/images/:imageId/downvote', authenticateToken, voteLimiter, async (req, res) => {
	const { imageId } = req.params;
	const userId = new ObjectId(req.user.id);
	console.log(`[Server] User ${userId} attempting to downvote image ID: ${imageId}`);

	try {
		if (!ObjectId.isValid(imageId)) {
			return res.status(400).json({ error: 'Invalid imageId format.' });
		}
		const imageObjectId = new ObjectId(imageId);
		const { db } = await connectToDatabase();

		const currentImage = await db.collection('images').findOne({ _id: imageObjectId });

		if (!currentImage) {
			return res.status(404).json({ error: `Image with ID ${imageId} not found.` });
		}

		const isAlreadyUpvoted = currentImage.upvotedBy?.some(id => id.equals(userId));
		const isAlreadyDownvoted = currentImage.downvotedBy?.some(id => id.equals(userId));
		
		let voteDelta = 0;
		const updateOps = {};

		if (isAlreadyDownvoted) {
			updateOps.$pull = { downvotedBy: userId };
			voteDelta = 1; 
		} else {
			updateOps.$addToSet = { downvotedBy: userId };
			voteDelta = -1; 
			if (isAlreadyUpvoted) {
				updateOps.$pull = { upvotedBy: userId };
				voteDelta = -2; 
			}
		}

		if (voteDelta !== 0) {
			updateOps.$inc = { votes: voteDelta };
		}

		const result = await db.collection('images').updateOne({ _id: imageObjectId }, updateOps);

		if (result.matchedCount === 0) {
			return res.status(404).json({ error: `Image with ID ${imageId} not found during update.` });
		}
		
		const updatedImage = await db.collection('images').findOne({ _id: imageObjectId });
		res.json(updatedImage);

	} catch (error) {
		console.error(`[Server] Error downvoting image ${imageId}:`, error);
		res.status(500).json({ error: 'Internal server error while downvoting image' });
	}
});

// Report an image (requires authentication)
app.put('/api/images/:imageId/report', authenticateToken, async (req, res) => {
	const { imageId } = req.params;
	const { reason: providedReason } = req.body; // Get optional reason from request body
	const reporterId = new ObjectId(req.user.id); // User who is reporting
	console.log(`[Server] User ${reporterId} attempting to report image ID: ${imageId}. Reason: ${providedReason || 'Not provided'}`);

	try {
		if (!ObjectId.isValid(imageId)) {
			return res.status(400).json({ error: 'Invalid imageId format.' });
		}
		const imageObjectId = new ObjectId(imageId);
		const { db } = await connectToDatabase(); // Assuming this is how you get db instance

		// 1. Fetch the image to report (to get details for snapshot and ensure it exists)
		const imageToReport = await mongoose.model('Image').findById(imageObjectId)
			.populate({ path: 'productId', select: 'tags' }) // Corrected: 'productId'
			.lean(); // Use Mongoose model, ensure Image model is imported

		if (!imageToReport) {
			return res.status(404).json({ error: `Image with ID ${imageId} not found.` });
		}

		// 2. Check if this user has already reported this specific image and it's still open
		const existingOpenReport = await Report.findOne({
			reporterId: reporterId,
			reportedItemId: imageObjectId,
			reportedItemRef: 'Image',
			status: 'open'
		});

		if (existingOpenReport) {
			return res.status(409).json({ error: 'You have already submitted an open report for this image.' });
		}

		// 3. Determine the reason for the report
		const reasonForReport = (providedReason && providedReason.trim() !== '') ? providedReason.trim() : 'User reported image as inappropriate.';

		// 4. Create the report document
		const newReport = new Report({
			reporterId: reporterId,
			reportedItemId: imageObjectId,
			reportedItemRef: 'Image',
			reason: reasonForReport,
			tags: imageToReport.productId?.tags || [], // Corrected: 'productId'
			reportedItemSnapshot: {
				url: imageToReport.url,
				uploaderId: imageToReport.uploader, // Corrected typo here
				productId: imageToReport.productId, // Corrected: 'productId'
				score: imageToReport.score, // Corrected: 'score'
				// Add any other relevant details from the image model
			},
			status: 'open', // Default status for new reports
		});

		await newReport.save();

		console.log(`[Server] Report ${newReport._id} created for image ${imageId}`);
		res.status(200).json({ message: 'Image reported successfully. Our team will review it shortly.', reportId: newReport._id });

	} catch (error) {
		console.error(`[Server] Error reporting image ${imageId}:`, error);
		if (error.name === 'ValidationError') { // Handle Mongoose validation errors
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: 'Internal server error while reporting image' });
	}
});

// --- END NEW Image Voting & Reporting Endpoints ---

// --- NEW: Unified Search Endpoint ---

/**
 * @route GET /api/search
 * @desc Search for products and users based on a query string.
 * @query q - The search query string.
 * @query page - The page number for pagination (default: 1).
 * @query limit - The number of items per type per page (default: 10).
 * @returns { results: { products: { items, total }, users: { items, total } }, pagination: { currentPage, totalPages, limit } }
 */
app.get('/api/search', searchLimiter, async (req, res) => {
	const { q, page = 1, limit = 10 } = req.query;
	const pageNum = parseInt(page) || 1;
	const limitNum = parseInt(limit) || 10;
	const skipAmount = (pageNum - 1) * limitNum;

	console.log(`[Server] Search request received: q='${q}', page=${pageNum}, limit=${limitNum}`);

	if (!q || typeof q !== 'string' || q.trim() === '') {
		return res.status(400).json({ error: 'Search query \'q\' is required.' });
	}

	const searchQuery = q.trim();

	try {
		// --- Product Search Pipeline ---
		const productSearchPipeline = [
			// 1. Match using text index
			{ $match: { $text: { $search: searchQuery } } },
			// Add score for potential sorting later if needed
			{ $addFields: { score: { $meta: "textScore" } } },
			// 2. Lookup primary image (top voted, non-reported)
			{
				$lookup: {
					from: 'images',
					let: { productId: '$_id' },
					pipeline: [
						{ $match:
							{ $expr:
								{ $and:
									[
										{ $eq: [ '$product_id', '$$productId' ] }, // <-- FIXED FIELD NAME
										{ $ne: [ '$isConcealed', true ] } // Exclude concealed images
									]
								}
							}
						},
						{ $sort: { score: -1, createdAt: -1 } }, // Sort by score, then by creation date
						{ $limit: 1 },
						{ $project: { _id: 0, url: '$url' } },
					],
					as: 'primaryImageLookup'
				}
			},
			// 3. Lookup listings to calculate bid/ask
			{
				$lookup: {
					from: 'listings',
					localField: '_id',
					foreignField: 'product_id',
					as: 'product_listings'
				}
			},
			// 4. Project desired fields and calculate bid/ask
			{
				$project: {
					_id: 1,
					title: 1,
					slug: 1,
					score: 1, // Keep score if sorting by relevance
					primaryImageUrl: { $ifNull: [ { $first: '$primaryImageLookup.url' }, null ] }, // Get URL or null
					// Calculate lowestAsk and highestBid from the looked-up listings
					lowestAsk: {
						$min: {
							$map: {
								input: { $filter: { input: "$product_listings", as: "listing", cond: { $eq: [ "$$listing.type", "ask" ] } } },
								as: "askListing",
								in: "$$askListing.price"
							}
						}
					},
					highestBid: {
						$max: {
							$map: {
								input: { $filter: { input: "$product_listings", as: "listing", cond: { $eq: [ "$$listing.type", "bid" ] } } },
								as: "bidListing",
								in: "$$bidListing.price"
							}
						}
					}
				}
			},
			// Sort by relevance score (optional, default MongoDB text score)
			{ $sort: { score: { $meta: "textScore" } } },
			// Pagination
			{ $skip: skipAmount },
			{ $limit: limitNum },
			// Add result type identifier
			{ $addFields: { resultType: 'product' } }
		];

		// --- User Search Pipeline ---
		const userSearchPipeline = [
			// 1. Match using text index
			{ $match: { $text: { $search: searchQuery } } },
			// Add score
			{ $addFields: { score: { $meta: "textScore" } } },
			// 2. Lookup listings for buy/sell counts
			{
				$lookup: {
					from: 'listings',
					localField: '_id',
					foreignField: 'seller_id',
					as: 'user_listings'
				}
			},
			// 3. Project desired fields and calculate counts
			{
				$project: {
					_id: 1,
					name: 1,
					profilePicture: 1,
					score: 1,
					buysCount: {
						$size: { $filter: { input: "$user_listings", as: "listing", cond: { $eq: [ "$$listing.type", "bid" ] } } }
					},
					salesCount: {
						$size: { $filter: { input: "$user_listings", as: "listing", cond: { $eq: [ "$$listing.type", "ask" ] } } }
					}
				}
			},
			// Sort by relevance score
			{ $sort: { score: { $meta: "textScore" } } },
			// Pagination
			{ $skip: skipAmount },
			{ $limit: limitNum },
			// Add result type identifier
			{ $addFields: { resultType: 'user' } }
		];

		// --- Blog Post Search Pipeline ---
		const blogPostSearchPipeline = [
			{ $match: { $text: { $search: searchQuery }, isDeleted: { $ne: true } } },
			{ $addFields: { score: { $meta: "textScore" } } },
			{
				$lookup: {
					from: 'users',
					localField: 'author_id',
					foreignField: '_id',
					as: 'authorDetails'
				}
			},
			{ $unwind: { path: '$authorDetails', preserveNullAndEmptyArrays: true } },
			{
				$project: {
					_id: 1,
					title: 1,
					slug: 1,
					score: 1,
					preview: '$content_preview_html',
					authorName: { $ifNull: ['$authorDetails.name', 'Unknown Author'] },
					authorProfilePicture: { $ifNull: ['$authorDetails.cachedProfilePicture', '$authorDetails.profilePicture'] },
					createdAt: 1,
				}
			},
			{ $sort: { score: { $meta: "textScore" } } },
			{ $skip: skipAmount },
			{ $limit: limitNum },
			{ $addFields: { resultType: 'blogPost' } }
		];

		// Get total counts for pagination (run separately for efficiency)
		const productTotalPromise = Product.countDocuments({ $text: { $search: searchQuery } });
		const userTotalPromise = User.countDocuments({ $text: { $search: searchQuery } });
		const blogPostTotalPromise = BlogPost.countDocuments({ $text: { $search: searchQuery } });

		// Execute searches and count promises in parallel
		const [productResults, userResults, blogPostResults, productTotal, userTotal, blogPostTotal] = await Promise.all([
			Product.aggregate(productSearchPipeline),
			User.aggregate(userSearchPipeline),
			BlogPost.aggregate(blogPostSearchPipeline),
			productTotalPromise,
			userTotalPromise,
			blogPostTotalPromise
		]);

		console.log(`[Server] Search results: ${productResults.length} products, ${userResults.length} users, ${blogPostResults.length} blog posts`);
		console.log(`[Server] Search totals: ${productTotal} products, ${userTotal} users, ${blogPostTotal} blog posts`);

		// Calculate total pages based on the type with the most results
		const totalResults = Math.max(productTotal, userTotal, blogPostTotal); // Use the max count for overall pagination
		const totalPages = Math.ceil(totalResults / limitNum);

		res.json({
			results: {
				products: {
					items: productResults,
					total: productTotal,
				},
				users: {
					items: userResults,
					total: userTotal,
				},
				blogPosts: {
					items: blogPostResults,
					total: blogPostTotal,
				},
			},
			pagination: {
				currentPage: pageNum,
				totalPages: totalPages,
				limit: limitNum,
				totalProducts: productTotal,
				totalUsers: userTotal,
				totalBlogPosts: blogPostTotal
			}
		});

	} catch (error) {
		console.error('[Server] Error during search:', error);
		// Handle specific MongoDB errors if needed (e.g., index not found)
		res.status(500).json({ error: 'Internal server error during search' });
	}
});

// --- END NEW Search Endpoint ---

// --- NEW: Profile Picture Caching Endpoints ---

/**
 * @route POST /api/cache/profile-pictures/refresh
 * @desc Manually refresh a user's cached profile picture
 * @param userId - The ID of the user whose profile picture to refresh (optional, defaults to current user)
 * @returns { message: string, cachedUrl: string } on success
 */
app.post('/api/cache/profile-pictures/refresh', authenticateToken, async (req, res) => {
	try {
		const targetUserId = req.body.userId || req.user.id; // Default to current user
		
		// Security check: only allow users to refresh their own profile picture unless admin
		if (targetUserId !== req.user.id && !req.user.isAdminForTags?.includes('all')) {
			return res.status(403).json({ error: 'You can only refresh your own profile picture.' });
		}

		const user = await User.findById(targetUserId);
		if (!user) {
			return res.status(404).json({ error: 'User not found.' });
		}

		if (!user.profilePicture) {
			return res.status(400).json({ error: 'User has no profile picture to cache.' });
		}

		// Delete old cached file if it exists
		if (user.cachedProfilePicture) {
			ProfilePictureCacheService.deleteCachedProfilePicture(targetUserId, user.profilePicture);
		}

		// Download and cache new profile picture
		const cachedUrl = await ProfilePictureCacheService.downloadAndCacheProfilePicture(targetUserId, user.profilePicture);

		// Update user record
		await User.findByIdAndUpdate(targetUserId, {
			cachedProfilePicture: cachedUrl,
			profilePictureLastCached: new Date()
		});

		res.json({ 
			message: 'Profile picture cached successfully.',
			cachedUrl: cachedUrl
		});

	} catch (error) {
		console.error('[Server] Error refreshing cached profile picture:', error);
		res.status(500).json({ error: 'Failed to cache profile picture: ' + error.message });
	}
});

/**
 * @route POST /api/cache/profile-pictures/cleanup
 * @desc Clean up old cached profile pictures (admin only)
 * @param maxAgeHours - Maximum age in hours for cache files (optional, defaults to 168 hours = 7 days)
 * @returns { message: string, deletedCount: number } on success
 */
app.post('/api/cache/profile-pictures/cleanup', authenticateToken, requireAdmin, async (req, res) => {
	try {
		const maxAgeHours = parseInt(req.body.maxAgeHours) || 168; // Default 7 days
		const deletedCount = ProfilePictureCacheService.cleanupOldCacheFiles(maxAgeHours);

		res.json({ 
			message: `Cache cleanup completed. Deleted ${deletedCount} old files.`,
			deletedCount: deletedCount
		});

	} catch (error) {
		console.error('[Server] Error during cache cleanup:', error);
		res.status(500).json({ error: 'Cache cleanup failed: ' + error.message });
	}
});

/**
 * @route GET /api/cache/profile-pictures/status
 * @desc Get cache status for current user or specified user
 * @param userId - The ID of the user to check (optional, defaults to current user)
 * @returns Cache status information
 */
app.get('/api/cache/profile-pictures/status', authenticateToken, async (req, res) => {
	try {
		const targetUserId = req.query.userId || req.user.id;
		
		// Security check: only allow users to check their own status unless admin
		if (targetUserId !== req.user.id && !req.user.isAdminForTags?.includes('all')) {
			return res.status(403).json({ error: 'You can only check your own cache status.' });
		}

		const user = await User.findById(targetUserId).select('profilePicture cachedProfilePicture profilePictureLastCached');
		if (!user) {
			return res.status(404).json({ error: 'User not found.' });
		}

		const isCached = user.cachedProfilePicture && ProfilePictureCacheService.isCached(targetUserId, user.profilePicture);
		
		res.json({
			userId: targetUserId,
			hasOriginalProfilePicture: !!user.profilePicture,
			hasCachedProfilePicture: !!user.cachedProfilePicture,
			isCacheFilePresent: isCached,
			lastCached: user.profilePictureLastCached,
			originalUrl: user.profilePicture,
			cachedUrl: user.cachedProfilePicture
		});

	} catch (error) {
		console.error('[Server] Error checking cache status:', error);
		res.status(500).json({ error: 'Failed to check cache status: ' + error.message });
	}
});

// --- END Profile Picture Caching Endpoints ---

// --- NEW: User Activity Profile Endpoint ---
/**
 * @route GET /api/users/:userId/activity
 * @desc Retrieves a user's profile information and their activity (comments, listings, edits, sales, bids).
 * @param userId - The ID of the user whose activity to fetch.
 * @query commentsPage, commentsLimit, listingsPage, listingsLimit, editsPage, editsLimit, salesPage, salesLimit, bidsPage, bidsLimit
 * @returns { userProfile, comments, listings, productEdits, itemsSold, activeBids }
 */
app.get('/api/users/:userId/activity', async (req, res) => {
	const { userId } = req.params;
	const {
		commentsPage = 1, commentsLimit = 5,
		listingsPage = 1, listingsLimit = 5,
		editsPage = 1, editsLimit = 5, // For products edited by the user
		salesPage = 1, salesLimit = 5,   // For items sold by the user
		bidsPage = 1, bidsLimit = 5,     // For active bids made by the user
		blogPostsPage = 1, blogPostsLimit = 5, // For blog posts by the user
	} = req.query;

	console.log(`[Server] Fetching activity for user ID: ${userId}`);

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		console.log('[Server] Invalid userId format for activity:', userId);
		return res.status(400).json({ error: 'Invalid user ID format.' });
	}
	const userObjectId = new mongoose.Types.ObjectId(userId);

	try {
		// 1. Fetch User Profile
		const userProfile = await User.findById(userObjectId)
			.select('name profilePicture cachedProfilePicture joinDate email status') // Select desired fields
			.lean(); // Use .lean() for faster, plain JS objects if not modifying

		// Use cached profile picture if available
		if (userProfile && userProfile.cachedProfilePicture) {
			userProfile.profilePicture = userProfile.cachedProfilePicture;
		}
		// Remove the cachedProfilePicture field from response to keep API clean
		if (userProfile) {
			delete userProfile.cachedProfilePicture;
		}

		if (!userProfile) {
			console.log(`[Server] User profile not found for ID: ${userId}`);
			return res.status(404).json({ error: 'User not found.' });
		}

		// Helper for pagination
		const getPaginatedResults = async (model, query, page, limit, sortOptions = { createdAt: -1 }, populateOptions = null) => {
			const pageNum = parseInt(page) || 1;
			const limitNum = parseInt(limit) || 5;
			const skipAmount = (pageNum - 1) * limitNum;

			let dataQuery = model.find(query)
				.sort(sortOptions)
				.skip(skipAmount)
				.limit(limitNum);

			if (populateOptions) {
				if (Array.isArray(populateOptions)) {
					populateOptions.forEach(pop => dataQuery = dataQuery.populate(pop));
				} else {
					dataQuery = dataQuery.populate(populateOptions);
				}
			}
			
			const items = await dataQuery.lean().exec();
			const totalItems = await model.countDocuments(query);
			
			return {
				items,
				total: totalItems,
				page: pageNum,
				limit: limitNum,
				totalPages: Math.ceil(totalItems / limitNum),
			};
		};

		// 2. Fetch User's Comments (excluding soft-deleted ones from their view)
		const userComments = await getPaginatedResults(
			Comment,
			{ user_id: userObjectId, isDeleted: { $ne: true } }, // Filter out soft-deleted comments
			commentsPage,
			commentsLimit,
			{ createdAt: -1 },
			{ path: 'product_id', select: 'title slug' } // Populate product title and slug
		);

		// 3. Fetch User's Listings (all types, active by default unless status is specified)
		const userListings = await getPaginatedResults(
			Listing,
			{ seller_id: userObjectId, status: 'active' }, // Default to active, or adjust as needed
			listingsPage,
			listingsLimit,
			{ createdAt: -1 }, // Mongoose uses 'createdAt' from timestamps:true
			{ path: 'product_id', select: 'title slug' }
		);
		
		// 4. Fetch Products Edited by User (Summary: product title, slug, last edit by this user)
		// This is more complex as edit_history is an array within Product.
		// For simplicity, we'll list products where this user appears in the edit history.
		// A more sophisticated query could get the latest edit details.
		const editsLimitNum = parseInt(editsLimit) || 5;
		const editsSkipAmount = (parseInt(editsPage) - 1) * editsLimitNum;

		const productsEditedQuery = { 'edit_history.user': userProfile.name }; // Assuming editorUsername is stored as 'name'
		const productsEditedItems = await Product.find(productsEditedQuery)
			.sort({ 'edit_history.timestamp': -1 }) // Attempt to sort by last edit, might need refinement
			.skip(editsSkipAmount)
			.limit(editsLimitNum)
			.select('title slug edit_history') // Select relevant fields
			.lean()
			.exec();
		
		// Filter edit_history to only include edits by the current user for display simplicity
		const filteredProductsEdited = productsEditedItems.map(p => ({
			...p,
			edit_history: p.edit_history.filter(h => h.user === userProfile.name).pop() // Get the most recent edit by this user
		})).filter(p => p.edit_history); // Ensure there's at least one edit by the user

		const totalProductsEdited = await Product.countDocuments(productsEditedQuery);
		
		const productEdits = {
			items: filteredProductsEdited,
			total: totalProductsEdited,
			page: parseInt(editsPage),
			limit: editsLimitNum,
			totalPages: Math.ceil(totalProductsEdited / editsLimitNum)
		};

		// 5. Fetch Items Sold by User
		const itemsSold = await getPaginatedResults(
			Listing,
			{ seller_id: userObjectId, type: 'ask', status: 'sold' },
			salesPage,
			salesLimit,
			{ updatedAt: -1 }, // Sort by when it was last updated (likely when marked sold)
			{ path: 'product_id', select: 'title slug' }
		);

		// 6. Fetch Active Bids by User
		const activeBids = await getPaginatedResults(
			Listing,
			{ seller_id: userObjectId, type: 'bid', status: 'active' },
			bidsPage,
			bidsLimit,
			{ createdAt: -1 },
			{ path: 'product_id', select: 'title slug' }
		);
		
		// 7. Fetch User's Blog Posts
		const userBlogPosts = await getPaginatedResults(
			BlogPost,
			{ author_id: userObjectId, isDeleted: { $ne: true } },
			blogPostsPage,
			blogPostsLimit,
			{ createdAt: -1 }
		);

		res.json({
			userProfile,
			comments: userComments,
			listings: userListings,
			productEdits,
			itemsSold,
			activeBids,
			blogPosts: userBlogPosts,
		});

	} catch (error)
	{
		console.error(`[Server] Error fetching activity for user ${userId}:`, error);
		if (error.name === 'CastError') { // Handle invalid ObjectId format if not caught by initial check
			return res.status(400).json({ error: 'Invalid user ID format.' });
		}
		res.status(500).json({ error: 'Internal server error while fetching user activity.' });
	}
});
// --- END User Activity Profile Endpoint ---

// --- BLOG POST ROUTES ---

// GET a single blog post by slug or ID
app.get('/api/blog-posts/:slugOrId', async (req, res) => {
	const { slugOrId } = req.params;
	const { commentsPage = 1, commentsLimit = 10 } = req.query; // Add pagination params

	console.log(`[Server] Fetching blog post: ${slugOrId} with comments page ${commentsPage}`);
	try {
		let post;
		// Use .lean() for better performance as we're just reading data
		if (mongoose.Types.ObjectId.isValid(slugOrId)) {
			post = await BlogPost.findById(slugOrId).populate('author_id', 'name profilePicture cachedProfilePicture').lean();
		}
		
		if (!post) {
			post = await BlogPost.findOne({ slug: slugOrId }).populate('author_id', 'name profilePicture cachedProfilePicture').lean();
		}

		if (!post || post.isDeleted) {
			return res.status(404).json({ message: 'Blog post not found or has been deleted.' });
		}

		// --- NEW: Fetch and attach comments ---
		const commentsLimitParsed = parseInt(commentsLimit);
		const commentsPageParsed = parseInt(commentsPage);
		const skipAmount = (commentsPageParsed - 1) * commentsLimitParsed;

		const commentsQuery = { blogPostId: post._id, parent_id: null };

		const [comments, totalComments] = await Promise.all([
			Comment.find(commentsQuery)
				.populate('user_id', 'name profilePicture cachedProfilePicture')
				.sort({ votes: -1, createdAt: -1 })
				.skip(skipAmount)
				.limit(commentsLimitParsed)
				.lean(),
			Comment.countDocuments(commentsQuery)
		]);

		// Map user_id to a user object for frontend consistency
		const formattedComments = comments.map(c => ({
			...c,
			user: c.user_id ? {
				_id: c.user_id._id,
				name: c.user_id.name,
				profilePicture: c.user_id.cachedProfilePicture || c.user_id.profilePicture,
			} : { name: 'Unknown User' }
		}));

		const responseData = {
			...post,
			comments: {
				items: formattedComments,
				total: totalComments,
				page: commentsPageParsed,
				limit: commentsLimitParsed,
				totalPages: Math.ceil(totalComments / commentsLimitParsed),
			}
		};
		// --- END NEW ---

		res.json(responseData);
	} catch (error) {
		console.error(`[Server] Error fetching blog post ${slugOrId}:`, error);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// POST a new blog post
app.post('/api/blog-posts', authenticateToken, async (req, res) => {
	const { title, tags, content } = req.body;
	const author_id = req.user.id;

	if (!title || !content) {
		return res.status(400).json({ message: 'Title and content are required.' });
	}

	try {
		const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
		
		// Check for duplicate slug
		const existingPost = await BlogPost.findOne({ slug });
		if (existingPost) {
			return res.status(409).json({ message: 'A blog post with a similar title already exists.', existingSlug: slug });
		}

		const content_full_html = purify.sanitize(marked.parse(content));
		const content_preview_html = generatePreviewHtml(content_full_html);

		const newPost = new BlogPost({
			title: title.trim(),
			slug,
			tags: tags || [],
			content_markdown: content,
			content_full_html,
			content_preview_html,
			author_id: new mongoose.Types.ObjectId(author_id),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await newPost.save();
		
		// Populate author details for the response
		const populatedPost = await BlogPost.findById(newPost._id).populate('author_id', 'name profilePicture');

		res.status(201).json(populatedPost);

	} catch (error) {
		console.error('[Server] Error creating blog post:', error);
		res.status(500).json({ message: 'Internal server error while creating blog post.' });
	}
});

// PUT (update) an existing blog post
app.put('/api/blog-posts/:id', authenticateToken, async (req, res) => {
	const { id } = req.params;
	const { title, tags, content } = req.body;
	const userId = req.user.id;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ message: 'Invalid blog post ID.' });
	}

	try {
		const post = await BlogPost.findById(id);
		if (!post) {
			return res.status(404).json({ message: 'Blog post not found.' });
		}

		// Authorization check: only author can edit
		if (post.author_id.toString() !== userId) {
			// Maybe allow admins to edit too in the future
			return res.status(403).json({ message: 'You are not authorized to edit this post.' });
		}

		const updateFields = { updatedAt: new Date() };

		if (title) {
			updateFields.title = title.trim();
			updateFields.slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
		}
		if (tags) {
			updateFields.tags = tags;
		}
		if (content !== undefined) {
			const fullHtml = purify.sanitize(marked.parse(content));
			updateFields.content_markdown = content;
			updateFields.content_full_html = fullHtml;
			updateFields.content_preview_html = generatePreviewHtml(fullHtml);
		}

		const updatedPost = await BlogPost.findByIdAndUpdate(
			id,
			{ $set: updateFields },
			{ new: true }
		).populate('author_id', 'name profilePicture');

		res.json(updatedPost);

	} catch (error) {
		console.error(`[Server] Error updating blog post ${id}:`, error);
		res.status(500).json({ message: 'Internal server error while updating blog post.' });
	}
});

// --- NEW: Blog Post Voting Endpoints ---

// Upvote a blog post
app.put('/api/blog-posts/:postId/vote', authenticateToken, async (req, res) => {
	const { postId } = req.params;
	const userId = new mongoose.Types.ObjectId(req.user.id);

	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(400).json({ error: 'Invalid post ID format.' });
	}

	try {
		const post = await BlogPost.findById(postId);
		if (!post) {
			return res.status(404).json({ error: 'Blog post not found.' });
		}

		const isAlreadyUpvoted = post.upvotedBy.includes(userId);
		const isAlreadyDownvoted = post.downvotedBy.includes(userId);

		let updateOps = {};
		let voteDelta = 0;

		if (isAlreadyUpvoted) {
			updateOps.$pull = { upvotedBy: userId };
			voteDelta = -1;
		} else {
			updateOps.$addToSet = { upvotedBy: userId };
			voteDelta = 1;
			if (isAlreadyDownvoted) {
				updateOps.$pull = { downvotedBy: userId };
				voteDelta = 2;
			}
		}
		
		if (voteDelta !== 0) {
			updateOps.$inc = { votes: voteDelta };
		}

		const updatedPost = await BlogPost.findByIdAndUpdate(postId, updateOps, { new: true });
		res.json(updatedPost);

	} catch (error) {
		console.error(`[Server] Error upvoting blog post ${postId}:`, error);
		res.status(500).json({ error: 'Internal server error while upvoting blog post.' });
	}
});

// Downvote a blog post
app.put('/api/blog-posts/:postId/downvote', authenticateToken, async (req, res) => {
	const { postId } = req.params;
	const userId = new mongoose.Types.ObjectId(req.user.id);

	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(400).json({ error: 'Invalid post ID format.' });
	}

	try {
		const post = await BlogPost.findById(postId);
		if (!post) {
			return res.status(404).json({ error: 'Blog post not found.' });
		}

		const isAlreadyDownvoted = post.downvotedBy.includes(userId);
		const isAlreadyUpvoted = post.upvotedBy.includes(userId);

		let updateOps = {};
		let voteDelta = 0;

		if (isAlreadyDownvoted) {
			updateOps.$pull = { downvotedBy: userId };
			voteDelta = 1;
		} else {
			updateOps.$addToSet = { downvotedBy: userId };
			voteDelta = -1;
			if (isAlreadyUpvoted) {
				updateOps.$pull = { upvotedBy: userId };
				voteDelta = -2;
			}
		}
		
		if (voteDelta !== 0) {
			updateOps.$inc = { votes: voteDelta };
		}

		const updatedPost = await BlogPost.findByIdAndUpdate(postId, updateOps, { new: true });
		res.json(updatedPost);

	} catch (error) {
		console.error(`[Server] Error downvoting blog post ${postId}:`, error);
		res.status(500).json({ error: 'Internal server error while downvoting blog post.' });
	}
});
// --- END NEW ---

// --- NEW: Homepage Feed Endpoint ---
app.get('/api/homepage-feed', async (req, res) => {
	const { page = 1, limit = 9 } = req.query; // Default limit is 9 (3 of each type)
	const pageNum = parseInt(page, 10);
	const limitNum = parseInt(limit, 10);
	const itemsPerType = Math.max(1, Math.floor(limitNum / 3));

	try {
		const newPartsPromise = Product.aggregate([
			{ $sort: { created_at: -1 } },
			{ $skip: (pageNum - 1) * itemsPerType },
			{ $limit: itemsPerType },
			{
				$lookup: {
					from: 'images',
					let: { productId: '$_id' },
					pipeline: [
						{ $match: { $expr: { $eq: ['$product_id', '$$productId'] } } },
						{ $sort: { votes: -1 } },
						{ $limit: 1 },
					],
					as: 'images',
				},
			},
			{
				$lookup: {
					from: 'listings',
					localField: '_id',
					foreignField: 'product_id',
					as: 'listings',
				},
			},
			{
				$addFields: {
					lowest_ask: { $min: { $map: { input: { $filter: { input: '$listings', as: 'listing', cond: { $eq: ['$$listing.type', 'ask'] } } }, as: 'askListing', in: '$$askListing.price' } } },
					highest_bid: { $max: { $map: { input: { $filter: { input: '$listings', as: 'listing', cond: { $eq: ['$$listing.type', 'bid'] } } }, as: 'bidListing', in: '$$bidListing.price' } } },
				},
			},
			{ $project: { listings: 0 } },
		]);

		const trendingCommentsPromise = Comment.aggregate([
			{ $match: { parent_id: null, isDeleted: { $ne: true }, product_id: { $exists: true, $ne: null } } },
			{ $addFields: { hotnessScore: { $add: [{ $ifNull: ['$votes', 0] }, { $ifNull: ['$replyCount', 0] }] } } },
			{ $sort: { hotnessScore: -1, createdAt: -1 } },
			{ $skip: (pageNum - 1) * itemsPerType },
			{ $limit: itemsPerType },
			{ $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
			{ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'products', localField: 'product_id', foreignField: '_id', as: 'product' } },
			{ $unwind: '$product' },
			{
				$lookup: {
					from: 'listings',
					localField: 'product_id',
					foreignField: 'product_id',
					as: 'listings',
				},
			},
			{
				$lookup: {
					from: 'images',
					let: { productId: '$product_id' },
					pipeline: [
						{ $match: { $expr: { $eq: ['$product_id', '$$productId'] } } },
						{ $sort: { votes: -1 } },
						{ $limit: 1 },
					],
					as: 'productImages',
				},
			},
			{
				$addFields: {
					'product.lowest_ask': { $min: { $map: { input: { $filter: { input: '$listings', as: 'listing', cond: { $eq: ['$$listing.type', 'ask'] } } }, as: 'askListing', in: '$$askListing.price' } } },
					'product.highest_bid': { $max: { $map: { input: { $filter: { input: '$listings', as: 'listing', cond: { $eq: ['$$listing.type', 'bid'] } } }, as: 'bidListing', in: '$$bidListing.price' } } },
				},
			},
			{ $project: { listings: 0 } },
		]);

		const trendingBlogPostsPromise = BlogPost.find({ isDeleted: { $ne: true } })
			.sort({ votes: -1, createdAt: -1 })
			.skip((pageNum - 1) * itemsPerType)
			.limit(itemsPerType)
			.populate('author_id', 'name profilePicture cachedProfilePicture')
			.lean()
			.exec();

		const [newParts, trendingComments, trendingBlogPosts] = await Promise.all([
			newPartsPromise,
			trendingCommentsPromise,
			trendingBlogPostsPromise,
		]);

		const processedComments = trendingComments.map((comment) => {
			if (comment.productImages && comment.productImages.length > 0) {
				comment.product.image = comment.productImages[0];
			}
			delete comment.productImages;
			return comment;
		});

		const combined = [];
		const maxLength = Math.max(newParts.length, processedComments.length, trendingBlogPosts.length);
		for (let i = 0; i < maxLength; i++) {
			if (processedComments[i]) combined.push({ type: 'trending_comment', data: processedComments[i] });
			if (newParts[i]) combined.push({ type: 'new_part', data: newParts[i] });
			if (trendingBlogPosts[i]) combined.push({ type: 'trending_blog_post', data: trendingBlogPosts[i] });
		}

		const totalParts = await Product.countDocuments();
		const totalComments = await Comment.countDocuments({ parent_id: null, isDeleted: { $ne: true } });
		const totalBlogs = await BlogPost.countDocuments({ isDeleted: { $ne: true } });
		const totalItems = totalParts + totalComments + totalBlogs;
		const totalPages = Math.ceil(totalItems / limitNum);
		
		res.json({
			feed: combined,
			pagination: {
				currentPage: pageNum,
				totalPages: totalPages
			}
		});

	} catch (error) {
		console.error('[Server] Error fetching homepage feed:', error);
		res.status(500).json({ error: 'Internal server error fetching homepage feed.' });
	}
});
// --- END NEW ---

// --- ADMIN ROUTES ---
// ... existing code ...


// ... existing code ...

// NEW: POST /api/admin/reports/:reportId/action/delete-item
app.post('/api/admin/reports/:reportId/action/delete-item', authenticateToken, requireAdmin, async (req, res) => {
	const { reportId } = req.params;
	const { adminReason } = req.body; // 'reason' from AdminActionModal submit
	const adminUserId = req.user.id;

	console.log(`[Server][Admin] Action: Delete item for report ${reportId} by admin ${adminUserId}. Reason: ${adminReason}`);

	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		return res.status(400).json({ error: 'Invalid report ID format.' });
	}
	if (!adminReason || typeof adminReason !== 'string' || adminReason.trim().length < 5) {
		return res.status(400).json({ error: 'An admin reason (at least 5 characters) is required for this action.' });
	}

	try {
		const report = await Report.findById(reportId);
		if (!report) {
			return res.status(404).json({ error: 'Report not found.' });
		}
		if (['resolved_action_taken', 'dismissed'].includes(report.status)) {
			// Optionally allow re-processing or return an error/warning
			console.warn(`[Server][Admin] Report ${reportId} is already resolved/dismissed. Proceeding with item deletion if item still exists.`);
		}

		const Model = getModelByRef(report.reportedItemRef);
		if (!Model) {
			await report.updateOne({ status: 'resolved_no_action', adminNotes: `Failed to delete item: Model ${report.reportedItemRef} not found. Original reason: ${adminReason}`, resolvedByAdminId: adminUserId, resolvedAt: new Date() });
			return res.status(400).json({ error: `Reported item type '${report.reportedItemRef}' is not recognized or supported for deletion.` });
		}

		const item = await Model.findById(report.reportedItemId);
		if (!item) {
			// Item already deleted, just update report status
			report.status = 'resolved_action_taken'; // Or 'resolved_no_action' if item was deleted by other means
			report.adminNotes = `Item ID ${report.reportedItemId} not found (already deleted). Action based on report ${reportId}. Admin reason: ${adminReason}`;
			report.resolvedByAdminId = new mongoose.Types.ObjectId(adminUserId);
			report.resolvedAt = new Date();
			await report.save();
			return res.status(200).json({ message: 'Reported item was already deleted. Report updated.', report });
		}

		// Perform deletion based on item type
		// For Comments or Listings, direct deletion or soft-deletion logic might apply
		// This example uses a generic delete. You might need specific logic per model.
		// e.g., for Comment, you might use the existing admin delete comment route or its logic.
		// For Listing, similarly.

		let deleteMessage = '';
		if (report.reportedItemRef === 'Comment') {
			// Assuming soft-delete logic similar to DELETE /api/admin/comments/:commentId
			item.isDeletedByAdmin = true;
			item.text = `[comment deleted by admin due to report ${report._id}: ${adminReason.substring(0,100)}]`;
			item.updatedAt = new Date();
			if (item.parent_id && !item.isDeleted) { 
				await Comment.updateOne({ _id: item.parent_id }, { $inc: { replyCount: -1 } });
			}
			await item.save();
			deleteMessage = 'Comment soft-deleted successfully.';
		} else if (report.reportedItemRef === 'Listing') {
			// Assuming soft-delete logic similar to DELETE /api/admin/listings/:listingId
			item.status = 'deleted_by_admin';
			item.adminDeletionReason = `Deleted due to report ${report._id}: ${adminReason.trim()}`;
			item.updatedAt = new Date();
			await item.save();
			deleteMessage = 'Listing soft-deleted successfully.';
		} else if (report.reportedItemRef === 'Image') {
			// For images, you might mark as 'admin_deleted' or actually remove.
			// Let's assume a soft delete field 'isArchivedByAdmin'
			item.isArchivedByAdmin = true; // Add this field to your Image model if it doesn't exist
			item.adminNotes = `Archived due to report ${report._id}: ${adminReason.trim()}`;
			item.updatedAt = new Date();
			await item.save();
			deleteMessage = 'Image archived successfully.';
		} else if (report.reportedItemRef === 'BlogPost') {
			item.isDeletedByAdmin = true;
			item.content_markdown = `[post deleted by admin due to report ${report._id}: ${adminReason.substring(0,100)}]`;
			item.updatedAt = new Date();
			await item.save();
			deleteMessage = 'Blog Post soft-deleted successfully.';
		} else {
			// For other types or a generic fallback if no specific handling exists
			await Model.findByIdAndDelete(report.reportedItemId);
			deleteMessage = `${report.reportedItemRef} deleted successfully.`;
		}

		report.status = 'resolved_action_taken';
		report.adminNotes = `Action: Deleted ${report.reportedItemRef} (ID: ${report.reportedItemId}). Reason: ${adminReason}`;
		report.resolvedByAdminId = new mongoose.Types.ObjectId(adminUserId);
		report.resolvedAt = new Date();
		await report.save();

		console.log(`[Server][Admin] ${deleteMessage} for report ${reportId}. Report status updated.`);
		res.status(200).json({ message: `${deleteMessage} Report status updated.`, report });

	} catch (error) {
		console.error(`[Server][Admin] Error deleting item for report ${reportId}:`, error);
		// Attempt to update report to 'open' or 'under_review' if action failed mid-way
		try {
			const reportToReopen = await Report.findById(reportId);
			if (reportToReopen && reportToReopen.status !== 'open' && reportToReopen.status !== 'under_review') {
				reportToReopen.status = 'open'; // Or 'under_review'
				reportToReopen.adminNotes = `${reportToReopen.adminNotes || ''} (Action failed: ${error.message}. Re-opened report.)`;
				await reportToReopen.save();
			}
		} catch (reopenError) {
			console.error(`[Server][Admin] Critical: Failed to re-open report ${reportId} after action error:`, reopenError);
		}
		res.status(500).json({ error: 'Internal server error while deleting item and updating report.' });
	}
});

// NEW: POST /api/admin/reports/:reportId/action/delete-item-mute-user
app.post('/api/admin/reports/:reportId/action/delete-item-mute-user', authenticateToken, requireAdmin, async (req, res) => {
	const { reportId } = req.params;
	const { adminReason, muteDurationDays } = req.body; // 'reason' and 'muteDuration' from AdminActionModal
	const adminUserId = req.user.id;

	console.log(`[Server][Admin] Action: Delete item & Mute user for report ${reportId} by admin ${adminUserId}. Reason: ${adminReason}, Mute: ${muteDurationDays} days`);

	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		return res.status(400).json({ error: 'Invalid report ID format.' });
	}
	if (!adminReason || typeof adminReason !== 'string' || adminReason.trim().length < 5) {
		return res.status(400).json({ error: 'An admin reason (at least 5 characters) is required.' });
	}
	if (muteDurationDays && (typeof muteDurationDays !== 'number' || muteDurationDays <= 0 || muteDurationDays > 30)) {
		return res.status(400).json({ error: 'Invalid mute duration. Must be between 1 and 30 days.' });
	}

	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const report = await Report.findById(reportId).session(session);
		if (!report) {
			await session.abortTransaction();
			session.endSession();
			return res.status(404).json({ error: 'Report not found.' });
		}
		if (['resolved_action_taken', 'dismissed'].includes(report.status)) {
			console.warn(`[Server][Admin] Report ${reportId} is already resolved/dismissed. Proceeding with item deletion/mute if applicable.`);
		}

		const Model = getModelByRef(report.reportedItemRef);
		if (!Model) {
			report.status = 'resolved_no_action';
			report.adminNotes = `Failed to act on item: Model ${report.reportedItemRef} not found. Original reason: ${adminReason}`;
			report.resolvedByAdminId = adminUserId;
			report.resolvedAt = new Date();
			await report.save({ session });
			await session.commitTransaction();
			session.endSession();
			return res.status(400).json({ error: `Reported item type '${report.reportedItemRef}' is not recognized.` });
		}

		const item = await Model.findById(report.reportedItemId).session(session);
		let itemOwnerId = null;

		if (!item) {
			report.status = 'resolved_action_taken'; // Item already gone
			report.adminNotes = `Item ID ${report.reportedItemId} not found (already deleted). Mute not applied. Action for report ${reportId}. Admin reason: ${adminReason}`;
			// No user to mute if item is gone, consider this path carefully.
		} else {
			// Determine item owner ID - this is highly model-dependent
			if (report.reportedItemRef === 'Listing') itemOwnerId = item.seller_id;
			else if (report.reportedItemRef === 'Comment') itemOwnerId = item.user_id;
			else if (report.reportedItemRef === 'Image') itemOwnerId = item.uploader_id;
			else if (report.reportedItemRef === 'BlogPost') itemOwnerId = item.author_id;
			// Add other model owner fields as necessary
			// else if (report.reportedItemRef === 'User') itemOwnerId = item._id; // If reporting a user directly

			if (!itemOwnerId && report.reportedItemRef !== 'User') { // If not reporting a user directly, and no owner found on item
				console.warn(`[Server][Admin] Could not determine owner for ${report.reportedItemRef} ID ${item._id} from report ${reportId}. Item will be deleted, user will not be muted.`);
				// Delete item without muting
				// (Duplicating delete logic from above - consider refactoring to a helper)
				if (report.reportedItemRef === 'Comment') {
					item.isDeletedByAdmin = true; item.text = `[comment deleted by admin: ${adminReason.substring(0,100)}]`; item.updatedAt = new Date();
					if (item.parent_id && !item.isDeleted) await Comment.updateOne({ _id: item.parent_id }, { $inc: { replyCount: -1 } }).session(session);
					await item.save({ session });
				} else if (report.reportedItemRef === 'Listing') {
					item.status = 'deleted_by_admin'; item.adminDeletionReason = adminReason; item.updatedAt = new Date();
					await item.save({ session });
				} else if (report.reportedItemRef === 'Image') {
					item.isArchivedByAdmin = true; item.adminNotes = adminReason; item.updatedAt = new Date();
					await item.save({ session });
				} else if (report.reportedItemRef === 'BlogPost') {
					item.isDeletedByAdmin = true;
					item.content_markdown = `[post deleted by admin: ${adminReason.substring(0,100)}]`;
					item.updatedAt = new Date();
					await item.save({ session });
				} else {
					await Model.findByIdAndDelete(report.reportedItemId).session(session);
				}
				report.adminNotes = `Item ${report.reportedItemRef} ID ${report.reportedItemId} deleted. Owner could not be determined for mute. Admin reason: ${adminReason}`;
				report.status = 'resolved_action_taken';
			} else if (itemOwnerId || report.reportedItemRef === 'User') {
				// If reporting a user directly, the itemOwnerId is the reportedItemId itself
				if(report.reportedItemRef === 'User') itemOwnerId = report.reportedItemId;

				// Proceed with item deletion and user mute
				// (Duplicating delete logic - refactor candidate)
				if (report.reportedItemRef !== 'User') { // Don't delete the user's account, just the item
					if (report.reportedItemRef === 'Comment') {
						item.isDeletedByAdmin = true; item.text = `[comment deleted by admin: ${adminReason.substring(0,100)}]`; item.updatedAt = new Date();
						if (item.parent_id && !item.isDeleted) await Comment.updateOne({ _id: item.parent_id }, { $inc: { replyCount: -1 } }).session(session);
						await item.save({ session });
					} else if (report.reportedItemRef === 'Listing') {
						item.status = 'deleted_by_admin'; item.adminDeletionReason = adminReason; item.updatedAt = new Date();
						await item.save({ session });
					} else if (report.reportedItemRef === 'Image') {
						item.isArchivedByAdmin = true; item.adminNotes = adminReason; item.updatedAt = new Date();
						await item.save({ session });
					} else if (report.reportedItemRef === 'BlogPost') {
						item.isDeletedByAdmin = true;
						item.content_markdown = `[post deleted by admin: ${adminReason.substring(0,100)}]`;
						item.updatedAt = new Date();
						await item.save({ session });
					} else {
						await Model.findByIdAndDelete(report.reportedItemId).session(session);
					}
				}

				const userToMute = await User.findById(itemOwnerId).session(session);
				if (!userToMute) {
					report.adminNotes = `Item ${report.reportedItemRef} (ID: ${report.reportedItemId}) deleted. User ${itemOwnerId} for mute not found. Reason: ${adminReason}`;
				} else if (userToMute._id.equals(adminUserId)) {
					report.adminNotes = `Item ${report.reportedItemRef} (ID: ${report.reportedItemId}) deleted. Admin cannot mute self. Reason: ${adminReason}`;
				} else {
					userToMute.isMuted = true;
					userToMute.mutedByAdminId = new mongoose.Types.ObjectId(adminUserId);
					userToMute.mutedReason = `Muted due to report ${report._id}. Original reported content: ${report.reportedItemRef} ID ${report.reportedItemId}. Admin reason: ${adminReason}`;
					userToMute.muteExpiresAt = muteDurationDays ? new Date(Date.now() + muteDurationDays * 24 * 60 * 60 * 1000) : null; // Null for indefinite
					userToMute.updatedAt = new Date();
					await userToMute.save({ session });
					report.adminNotes = `Item ${report.reportedItemRef} (ID: ${report.reportedItemId}) deleted. User ${userToMute.name} (ID: ${itemOwnerId}) muted for ${muteDurationDays || 'indefinite'} days. Reason: ${adminReason}`;
				}
				report.status = 'resolved_action_taken';
			}
		}

		report.resolvedByAdminId = new mongoose.Types.ObjectId(adminUserId);
		report.resolvedAt = new Date();
		await report.save({ session });

		await session.commitTransaction();
		session.endSession();

		console.log(`[Server][Admin] Action 'delete and mute' for report ${reportId} processed. Report status updated.`);
		res.status(200).json({ message: 'Item deleted and user muted (if applicable). Report updated.', report });

	} catch (error) {
		if (session) {
			await session.abortTransaction();
			session.endSession();
		}
		console.error(`[Server][Admin] Error deleting item and muting user for report ${reportId}:`, error);
		// Attempt to update report to 'open' or 'under_review' if action failed mid-way
		try {
			const reportToReopen = await Report.findById(reportId);
			if (reportToReopen && reportToReopen.status !== 'open' && reportToReopen.status !== 'under_review') {
				reportToReopen.status = 'open'; 
				reportToReopen.adminNotes = `${reportToReopen.adminNotes || ''} (Action delete/mute failed: ${error.message}. Re-opened report.)`;
				await reportToReopen.save();
			}
		} catch (reopenError) {
			console.error(`[Server][Admin] Critical: Failed to re-open report ${reportId} after delete/mute action error:`, reopenError);
		}
		res.status(500).json({ error: 'Internal server error during delete item & mute user action.' });
	}
});

// DELETE /api/admin/listings/:listingId - Soft delete a listing by an admin
app.delete('/api/admin/listings/:listingId', authenticateToken, requireAdmin, async (req, res) => {
	const { listingId } = req.params;
	const { reason } = req.body; // Optional reason from admin
	const adminUserId = req.user.id;

	console.log(`[Server][Admin] Admin ${adminUserId} attempting to soft-delete listing ${listingId}. Reason: ${reason}`);

	if (!mongoose.Types.ObjectId.isValid(listingId)) {
		return res.status(400).json({ error: 'Invalid listing ID format.' });
	}

	try {
		const listing = await Listing.findById(listingId);
		if (!listing) {
			return res.status(404).json({ error: 'Listing not found.' });
		}

		if (listing.status === 'deleted_by_admin') {
			return res.status(400).json({ error: 'Listing is already marked as deleted by an admin.' });
		}

		listing.status = 'deleted_by_admin';
		if (reason && typeof reason === 'string') {
			listing.adminDeletionReason = reason.trim();
		}
		listing.updatedAt = new Date(); // Manually update timestamp as it's a soft delete

		await listing.save();

		// Optionally: Create a report or log this admin action
		// For example, if a listing is deleted directly without a prior report:
		// const newReport = new Report({ ... reporterId: adminUserId, reason: `Admin deleted: ${reason}` ... });
		// await newReport.save();

		console.log(`[Server][Admin] Listing ${listingId} soft-deleted by admin ${adminUserId}.`);
		res.status(200).json({ message: 'Listing soft-deleted successfully.', listing });

	} catch (error) {
		console.error(`[Server][Admin] Error soft-deleting listing ${listingId}:`, error);
		if (error.name === 'ValidationError') {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: 'Internal server error while soft-deleting listing.' });
	}
});

// ... existing code ...

// DELETE /api/admin/comments/:commentId - Soft delete a comment by an admin
app.delete('/api/admin/comments/:commentId', authenticateToken, requireAdmin, async (req, res) => {
	const { commentId } = req.params;
	const { reason } = req.body; // Optional reason from admin
	const adminUserId = req.user.id;

	console.log(`[Server][Admin] Admin ${adminUserId} attempting to soft-delete comment ${commentId}. Reason: ${reason}`);

	if (!mongoose.Types.ObjectId.isValid(commentId)) {
		return res.status(400).json({ error: 'Invalid comment ID format.' });
	}

	try {
		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ error: 'Comment not found.' });
		}

		if (comment.isDeletedByAdmin) {
			return res.status(400).json({ error: 'Comment is already marked as deleted by an admin.' });
		}

		comment.isDeletedByAdmin = true;
		comment.text = reason ? `[comment deleted by admin: ${reason.substring(0,100)}]` : '[comment deleted by admin]';
		// comment.upvotedBy = []; // Optional: Clear votes if desired
		// comment.downvotedBy = [];
		// comment.votes = 0;
		comment.updatedAt = new Date(); // Manually update timestamp

		// If the comment being deleted was a reply, we should decrement the parent's replyCount
		// But only if it wasn't already soft-deleted by the user (isDeleted field in your Comment model)
		// Assuming your Comment model has an `isDeleted` field for user deletions.
		// If not, this check might not be necessary, or you always decrement.
		if (comment.parent_id && !comment.isDeleted) { // Check if it was a reply and not already user-deleted
			await Comment.updateOne(
				{ _id: comment.parent_id }, 
				{ $inc: { replyCount: -1 } }
			);
			console.log(`[Server][Admin] Decremented replyCount for parent comment ${comment.parent_id} due to admin deletion of reply ${commentId}`);
		}

		await comment.save();

		// Optionally: Create a report or log this admin action

		console.log(`[Server][Admin] Comment ${commentId} soft-deleted by admin ${adminUserId}.`);
		res.status(200).json({ message: 'Comment soft-deleted successfully.', comment });

	} catch (error) {
		console.error(`[Server][Admin] Error soft-deleting comment ${commentId}:`, error);
		if (error.name === 'ValidationError') {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: 'Internal server error while soft-deleting comment.' });
	}
});

// PUT /api/admin/users/:userId/mute - Mute or Unmute a user
app.put('/api/admin/users/:userId/mute', authenticateToken, requireAdmin, async (req, res) => {
	const { userId } = req.params;
	const { muteAction, durationHours, reason } = req.body; // muteAction: 'mute' or 'unmute'
	const adminUserId = req.user.id;

	console.log(`[Server][Admin] Admin ${adminUserId} attempting to ${muteAction} user ${userId}. Reason: ${reason}, Duration: ${durationHours}h`);

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		return res.status(400).json({ error: 'Invalid user ID format.' });
	}
	if (!['mute', 'unmute'].includes(muteAction)) {
		return res.status(400).json({ error: 'Invalid muteAction. Must be "mute" or "unmute".' });
	}
	if (muteAction === 'mute' && durationHours && (typeof durationHours !== 'number' || durationHours <= 0 || durationHours > (30*24))) { // Max 30 days mute
		return res.status(400).json({ error: 'Invalid durationHours. Must be a positive number (max 720 hours).' });
	}
	if (reason && (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 500)) {
		return res.status(400).json({ error: 'Reason must be a string between 5 and 500 characters.' });
	}
	if (muteAction === 'mute' && !reason) {
		return res.status(400).json({ error: 'A reason is required to mute a user.'});
	}

	try {
		const userToModify = await User.findById(userId);
		if (!userToModify) {
			return res.status(404).json({ error: 'User to modify not found.' });
		}

		// Prevent an admin from muting themselves (though UI should also prevent this)
		if (userToModify._id.equals(adminUserId)) {
			return res.status(400).json({ error: 'Admins cannot mute themselves.' });
		}

		let updateFields = {};
		let message = '';

		if (muteAction === 'mute') {
			if (userToModify.isMuted) {
				// Option: Extend mute or return error. For now, let's allow re-muting to update reason/duration.
				console.log(`[Server][Admin] User ${userId} is already muted. Updating mute details.`);
			}
			updateFields = {
				isMuted: true,
				mutedByAdminId: new mongoose.Types.ObjectId(adminUserId),
				mutedReason: reason.trim(),
				muteExpiresAt: durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null, // null for permanent if duration not given
			};
			message = `User ${userToModify.name} muted successfully.`;
			if (durationHours) message += ` Mute expires in ${durationHours} hours.`;
			else message += ` Mute is indefinite until manually unmuted.`;

		} else { // unmute
			if (!userToModify.isMuted) {
				return res.status(400).json({ error: 'User is not currently muted.' });
			}
			updateFields = {
				isMuted: false,
				mutedByAdminId: null,
				mutedReason: null,
				muteExpiresAt: null,
			};
			message = `User ${userToModify.name} unmuted successfully.`;
		}
		
		updateFields.updatedAt = new Date();

		await User.updateOne({ _id: userId }, { $set: updateFields });
		
		// Fetch the updated user to confirm (optional, but good for response)
		const updatedUser = await User.findById(userId).select('name email isMuted muteExpiresAt mutedReason').lean();

		// Optionally: Send a DM to the user informing them of the mute/unmute action.
		// sendDirectMessage(adminUserId, userId, `You have been ${muteAction}d. Reason: ${reason || 'N/A'}`);

		console.log(`[Server][Admin] ${message}`);
		res.status(200).json({ message, user: updatedUser });

	} catch (error) {
		console.error(`[Server][Admin] Error ${muteAction}ing user ${userId}:`, error);
		if (error.name === 'ValidationError') {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: `Internal server error while ${muteAction}ing user.` });
	}
});

// --- END ADMIN ROUTES ---
// ... existing code ...

// --- Server Startup ---
async function startServer() {
	try {
		// Connect Mongoose to MongoDB Atlas and wait for it
		await mongoose.connect(process.env.MONGODB_URI);
		console.log('[Server] Successfully connected to MongoDB via Mongoose');

		// Start the server only after successful connection
		// Ensure PORT is defined (it should be near the top of your file: const PORT = process.env.PORT || 3001;)
		app.listen(PORT, () => {
			console.log(`[Server] Express server running on http://localhost:${PORT}`);
			console.log(`[Server] Profile picture cache directory: ${PROFILE_PICS_DIR}`);
			
			// Schedule cleanup task to run daily
			setInterval(() => {
				console.log('[Server] Running scheduled profile picture cache cleanup...');
				try {
					ProfilePictureCacheService.cleanupOldCacheFiles(168); // 7 days
				} catch (error) {
					console.error('[Server] Error during scheduled cache cleanup:', error);
				}
			}, 24 * 60 * 60 * 1000); // Run every 24 hours
		});

	} catch (error) {
		console.error('[Server] Error connecting to MongoDB:', error);
		process.exit(1); // Exit if database connection fails
	}
}

// Call the async function to start the server
startServer();

// --- Graceful Shutdown (Optional but Recommended) ---
process.on('SIGINT', async () => {
	console.log('[Server] Received SIGINT. Closing MongoDB connection...');
	if (mongoose.connection.readyState === 1) { // 1 for connected
		await mongoose.connection.close();
		console.log('[Server] MongoDB connection closed.');
	}
	process.exit(0);
});

// --- Helper function to send a direct message (reusable) ---
async function sendDirectMessage(senderId, receiverId, content, relatedReportId = null, subjectHint = null) {
	try {
		if (!senderId || !receiverId || !content) {
			console.error('[Server] sendDirectMessage: Missing sender, receiver, or content.');
			return;
		}
		const senderObjectId = typeof senderId === 'string' ? new mongoose.Types.ObjectId(senderId) : senderId;
		const receiverObjectId = typeof receiverId === 'string' ? new mongoose.Types.ObjectId(receiverId) : receiverId;

		if (!mongoose.Types.ObjectId.isValid(senderObjectId)) return console.error('Invalid senderObjectId for DM', senderObjectId);
		if (!mongoose.Types.ObjectId.isValid(receiverObjectId)) return console.error('Invalid receiverObjectId for DM', receiverObjectId);

		const messageData = {
			senderId: senderObjectId,
			receiverId: receiverObjectId,
			content: content,
		};
		const newMessage = new Message(messageData);
		await newMessage.save();
		console.log(`[Server] Sent DM from ${senderObjectId} to ${receiverObjectId}. Subject hint: ${subjectHint}`);
	} catch (error) {
		console.error(`[Server] Error in sendDirectMessage from ${senderId} to ${receiverId}:`, error);
	}
}
// --- End DM Helper ---

// Helper function to get Mongoose model by name
const getModelByRef = (ref) => {
	if (!ref) return null;
	try {
		return mongoose.model(ref);
	} catch (error) {
		console.error(`[Server] Model ${ref} not found:`, error);
		return null;
	}
};

// Profile Picture Caching Service
class ProfilePictureCacheService {
	static generateCacheFilename(userId, originalUrl) {
		// Extract file extension from original URL or default to jpg
		const urlObj = new URL(originalUrl);
		const pathParts = urlObj.pathname.split('.');
		const extension = pathParts.length > 1 ? pathParts.pop().toLowerCase() : 'jpg';
		
		// Ensure extension is valid image format
		const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
		const finalExtension = validExtensions.includes(extension) ? extension : 'jpg';
		
		return `${userId}.${finalExtension}`;
	}

	static getCachedProfilePicturePath(userId, originalUrl) {
		const filename = this.generateCacheFilename(userId, originalUrl);
		return path.join(PROFILE_PICS_DIR, filename);
	}

	static getCachedProfilePictureUrl(userId, originalUrl) {
		const filename = this.generateCacheFilename(userId, originalUrl);
		return `/cache/profile-pictures/${filename}`;
	}

	static async downloadAndCacheProfilePicture(userId, originalUrl) {
		try {
			console.log(`[ProfileCache] Downloading profile picture for user ${userId} from: ${originalUrl}`);
			
			// Download image
			const response = await axios.get(originalUrl, {
				responseType: 'stream',
				timeout: 10000, // 10 second timeout
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; ProfilePictureCache/1.0)'
				}
			});

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			// Get cache file path
			const cacheFilePath = this.getCachedProfilePicturePath(userId, originalUrl);
			
			// Create write stream
			const writer = fs.createWriteStream(cacheFilePath);
			
			// Pipe the response to file
			response.data.pipe(writer);

			return new Promise((resolve, reject) => {
				writer.on('finish', () => {
					console.log(`[ProfileCache] Successfully cached profile picture for user ${userId}`);
					resolve(this.getCachedProfilePictureUrl(userId, originalUrl));
				});
				
				writer.on('error', (error) => {
					console.error(`[ProfileCache] Error writing profile picture for user ${userId}:`, error);
					// Clean up partial file
					if (fs.existsSync(cacheFilePath)) {
						fs.unlinkSync(cacheFilePath);
					}
					reject(error);
				});
			});

		} catch (error) {
			console.error(`[ProfileCache] Error downloading profile picture for user ${userId}:`, error.message);
			throw error;
		}
	}

	static isCached(userId, originalUrl) {
		const cacheFilePath = this.getCachedProfilePicturePath(userId, originalUrl);
		return fs.existsSync(cacheFilePath);
	}

	static async getCachedOrDownload(userId, originalUrl) {
		try {
			// Check if already cached
			if (this.isCached(userId, originalUrl)) {
				console.log(`[ProfileCache] Using cached profile picture for user ${userId}`);
				return this.getCachedProfilePictureUrl(userId, originalUrl);
			}

			// Not cached, download and cache
			return await this.downloadAndCacheProfilePicture(userId, originalUrl);
		} catch (error) {
			console.error(`[ProfileCache] Failed to get cached profile picture for user ${userId}:`, error.message);
			// Return original URL as fallback
			return originalUrl;
		}
	}

	static deleteCachedProfilePicture(userId, originalUrl) {
		try {
			const cacheFilePath = this.getCachedProfilePicturePath(userId, originalUrl);
			if (fs.existsSync(cacheFilePath)) {
				fs.unlinkSync(cacheFilePath);
				console.log(`[ProfileCache] Deleted cached profile picture for user ${userId}`);
				return true;
			}
			return false;
		} catch (error) {
			console.error(`[ProfileCache] Error deleting cached profile picture for user ${userId}:`, error.message);
			return false;
		}
	}

	// Utility to clean up old cache files (can be called periodically)
	static cleanupOldCacheFiles(maxAgeHours = 168) { // Default 7 days
		try {
			const files = fs.readdirSync(PROFILE_PICS_DIR);
			const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
			const now = Date.now();
			let deletedCount = 0;

			files.forEach(filename => {
				const filePath = path.join(PROFILE_PICS_DIR, filename);
				const stats = fs.statSync(filePath);
				const fileAge = now - stats.mtime.getTime();

				if (fileAge > maxAgeMs) {
					fs.unlinkSync(filePath);
					deletedCount++;
					console.log(`[ProfileCache] Deleted old cache file: ${filename}`);
				}
			});

			console.log(`[ProfileCache] Cleanup completed. Deleted ${deletedCount} old files.`);
			return deletedCount;
		} catch (error) {
			console.error('[ProfileCache] Error during cache cleanup:', error.message);
			return 0;
		}
	}
}

// Static file serving - Add this after app initialization but before routes
app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
	const {
		page = 1,
		limit = 10,
		status,
		itemType,
		tag
	} = req.query;

	console.log(`[Server][Admin] Fetching reports with filters:`, req.query);

	try {
		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		const query = {};
		if (status) {
			query.status = status;
		}
		if (itemType) {
			query.reportedItemRef = itemType;
		}
		
		const adminTags = req.user.isAdminForTags || [];
		if (!adminTags.includes('all')) {
			const tagConditions = [
				{ tags: { $in: adminTags } },
				{ tags: { $exists: false } },
				{ tags: { $size: 0 } }
			];
			
			if (tag) {
				if (!adminTags.includes(tag)) {
					return res.status(403).json({ error: 'You are not authorized to view reports for this tag.' });
				}
				query.$and = [{ tags: tag }];
			} else {
				query.$or = tagConditions;
			}
		} else if (tag) {
			query.tags = tag;
		}


		const reportsQuery = Report.find(query)
			.populate('reporterId', 'name _id')
			.populate('reportedItemId')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limitNum)
			.lean();

		const totalReportsPromise = Report.countDocuments(query);

		const [reportsFromDb, totalReports] = await Promise.all([reportsQuery, totalReportsPromise]);

		const reports = reportsFromDb.map(report => {
			const { reportedItemId, ...rest } = report;
			return {
				...rest,
				reportedItem: reportedItemId,
			};
		});


		res.json({
			reports,
			pagination: {
				currentPage: pageNum,
				totalPages: Math.ceil(totalReports / limitNum),
				totalReports: totalReports,
				limit: limitNum,
			},
		});

	} catch (error) {
		console.error('[Server][Admin] Error fetching reports:', error);
		res.status(500).json({ error: 'Internal server error while fetching reports.' });
	}
});