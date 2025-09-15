import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if the user has admin privileges. 
  // This can be based on a role or, in this case, the 'isAdminForTags' array.
  const isAdmin = user && Array.isArray(user.isAdminForTags) && user.isAdminForTags.length > 0;

  if (!isAdmin) {
    // Redirect to home page or a 'not authorized' page if the user is not an admin
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute; 