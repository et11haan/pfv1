import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Cards.css'; // Shared card styles

const BlogPostCard = forwardRef(({ post }, ref) => {
  const defaultProfilePic = '/default-profile.png';
  const authorProfileLink = `/account/${post.author_id}`; // Assuming author_id is available

  return (
    <div className="search-card user-card" ref={ref}> {/* Using user-card style as a base */}
      <Link to={`/blog/${post.slug}`} className="card-link">
        <div className="user-card-header">
           <img 
            src={post.authorProfilePicture || defaultProfilePic} 
            alt={`${post.authorName}'s profile`} 
            className="user-profile-picture"
            onError={(e) => { e.target.onerror = null; e.target.src=defaultProfilePic; }}
          />
          <div>
            <h3 className="card-title user-name">{post.title}</h3>
            <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>By {post.authorName}</p>
          </div>
        </div>
        <div className="card-content user-card-content">
          <div 
            className="user-bio-placeholder" 
            dangerouslySetInnerHTML={{ __html: post.preview || '<p>No preview available.</p>' }} 
          />
          <div className="user-stats">
            <span>Posted: {new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </Link>
    </div>
  );
});

BlogPostCard.displayName = 'BlogPostCard';

export default BlogPostCard; 