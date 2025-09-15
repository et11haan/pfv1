import User from '../models/User.js'; // Adjust path as necessary

/**
 * Middleware to ensure the user is an admin.
 * For now, it checks if the user has any entries in `isAdminForTags`.
 * This can be expanded later for more granular role checks.
 */
export const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required for this action.' });
  }

  try {
    // Fetch the user from the database to get the latest admin status
    // req.user from the JWT might not have the most up-to-date isAdminForTags
    const user = await User.findById(req.user.id).select('isAdminForTags').lean();

    if (!user) {
      return res.status(401).json({ error: 'User not found or invalid token.' });
    }

    // Basic admin check: are they admin for ANY tag?
    if (!user.isAdminForTags || user.isAdminForTags.length === 0) {
      return res.status(403).json({ error: 'Admin privileges required for this action.' });
    }

    // If more specific tag-based permissions are needed for a route,
    // that logic can be added in the route handler itself, or this middleware can be extended.
    // For example, you could pass requiredTags to this middleware:
    // export const requireAdminForTags = (requiredTags = []) => async (req, res, next) => { ... }

    // Attach full admin user object (or relevant parts) to req for use in next handlers if needed
    // req.adminUser = user; 

    next(); // User is an admin
  } catch (error) {
    console.error('[Server][AdminAuthMiddleware] Error checking admin status:', error);
    res.status(500).json({ error: 'Internal server error during admin authorization.' });
  }
};

/**
 * Example for more granular tag-based admin checks if needed later.
 * Not used by default yet.
 */
export const requireAdminForSpecificTags = (requiredTags = []) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!requiredTags || requiredTags.length === 0) {
      // If no specific tags are required, this might mean general admin access, 
      // or it's a misconfiguration. For safety, deny if not handled.
      console.warn('[Server][AdminAuthMiddleware] requireAdminForSpecificTags called with no requiredTags.');
      return res.status(403).json({ error: 'Admin configuration error.' });
    }

    try {
      const user = await User.findById(req.user.id).select('isAdminForTags').lean();
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }

      const hasRequiredTags = requiredTags.every(tag => user.isAdminForTags.includes(tag));

      if (!hasRequiredTags) {
        return res.status(403).json({ error: `Admin privileges for an MSO on tag(s): ${requiredTags.join(', ')} required.` });
      }
      next();
    } catch (error) {
      console.error('[Server][AdminAuthMiddleware] Error checking specific tag admin status:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}; 