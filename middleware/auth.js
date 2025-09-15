import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Adjust path as needed

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    console.log('[Auth Middleware] No token provided');
    return res.status(401).json({ message: 'Authentication required: No token provided' }); // Unauthorized
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth Middleware] Token decoded:', decoded);

    // Attach user information to the request object
    // We only attach the core identifiers needed by subsequent middleware/routes
    // Avoid attaching the full user document unless necessary
    req.user = {
      id: decoded.id, // User's MongoDB ObjectId as a string
      googleId: decoded.googleId,
      email: decoded.email,
      name: decoded.name,
      phoneVerified: decoded.phoneVerified,
      profilePicture: decoded.profilePicture,
      isAdminForTags: decoded.isAdminForTags || []
    };

    // Optional: Check if user still exists in DB (more secure but adds DB lookup)
    // const userExists = await User.findById(decoded.id);
    // if (!userExists) {
    //   console.log('[Auth Middleware] User from token not found in DB:', decoded.id);
    //   return res.status(403).json({ message: 'Forbidden: User not found' });
    // }

    // Optional: Check for specific roles or permissions if needed
    // if (!req.user.roles.includes('admin')) {
    //  return res.sendStatus(403); // Forbidden
    // }

    next(); // Proceed to the next middleware or route handler

  } catch (err) {
    console.error('[Auth Middleware] Token verification failed:', err.message);
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

// Optional: Middleware to specifically require phone verification
export const requirePhoneVerified = (req, res, next) => {
  if (!req.user || !req.user.phoneVerified) {
    console.log('[Auth Middleware] Phone verification required but not met for user:', req.user?.id);
    return res.status(403).json({ message: 'Forbidden: Phone verification required' });
  }
  next();
}; 