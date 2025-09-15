import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Cards.css'; // Shared card styles

const UserCard = forwardRef(({ user }, ref) => {
  const defaultProfilePic = '/default-profile.png'; // Define a default profile picture path

  // Placeholder link - replace with actual profile route when available
  const profileLink = `/account/${user._id}`; // Corrected path to /account/

  return (
    <div className="search-card user-card" ref={ref}>
      <Link to={profileLink} className="card-link user-card-link">
        <div className="user-card-header">
          <img 
            src={user.profilePicture || defaultProfilePic} 
            alt={`${user.name}'s profile`} 
            className="user-profile-picture"
            onError={(e) => { e.target.onerror = null; e.target.src=defaultProfilePic; }} // Handle image load errors
          />
          <h3 className="card-title user-name">{user.name}</h3>
        </div>
        <div className="card-content user-card-content">
          <p className="user-bio-placeholder">Bio: Not Available</p>
          <div className="user-stats">
            <span className="user-buys">Buys: N/A</span>
            <span className="user-sales">Sales: N/A</span>
          </div>
        </div>
      </Link>
    </div>
  );
});

UserCard.displayName = 'UserCard';

export default UserCard; 