import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useBlog } from '../../context/BlogContext';
import { useAuth } from '../../context/AuthContext';
import './HomepageCard.css'; // Shared CSS
import './TrendingBlogPostCard.css'; // Specific CSS

const TrendingBlogPostCard = forwardRef(({ post }, ref) => {
  const { voteBlogPost, downvoteBlogPost } = useBlog();
  const { user } = useAuth();
  
  const { title, slug, tags, content_preview_html, author_id, createdAt, votes, upvotedBy, downvotedBy } = post;
  
  const author = author_id; // The backend should populate this
  
  const formattedTimestamp = new Date(createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const handleVote = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) voteBlogPost(post._id);
  };
  const handleDownvote = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) downvoteBlogPost(post._id);
  };
  const userVote = user && upvotedBy?.includes(user.id) ? 1 : user && downvotedBy?.includes(user.id) ? -1 : 0;

  return (
    <div className="homepage-card-wrapper" ref={ref}>
      <span className="card-type-label">Trending Blog Post</span>
      <div className="homepage-card blog-post-card">
        <div className="blog-post-header">
          <Link to={`/blog/${slug}`}>
            <h3 className="blog-post-title">{title}</h3>
          </Link>
          <div className="blog-post-tags">
            {tags?.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>

        <div 
          className="blog-content-snippet"
          dangerouslySetInnerHTML={{ __html: content_preview_html || '' }}
        />

        <div className="blog-post-footer">
            <div className="blog-author-info">
                <img src={author?.profilePicture || '/default-profile.png'} alt={author?.name} className="blog-author-avatar" />
                <div className="author-details">
                    <span className="blog-author-name">{author?.name || 'Unknown Author'}</span>
                    <span className="blog-post-timestamp">{formattedTimestamp}</span>
                </div>
            </div>
            <div className="blog-post-actions">
                <div className="vote-controls">
                    <button 
                        className={`vote-button up ${userVote === 1 ? 'active' : ''}`}
                        onClick={handleVote}
                        aria-label="Upvote Post"
                        disabled={!user}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.75a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM8.25 7.5a.75.75 0 010-1.06l1.5-1.5a.75.75 0 011.06 0l1.5 1.5a.75.75 0 11-1.06 1.06L10 6.81l-1.19 1.19a.75.75 0 01-1.06 0z" /></svg>
                    </button>
                    <span className="vote-count">{votes}</span>
                    <button 
                        className={`vote-button down ${userVote === -1 ? 'active' : ''}`}
                        onClick={handleDownvote}
                        aria-label="Downvote Post"
                        disabled={!user}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 16.25a.75.75 0 01-.75-.75V5a.75.75 0 011.5 0v10.5a.75.75 0 01-.75-.75zM8.25 12.5a.75.75 0 011.06 0L10 13.19l1.19-1.19a.75.75 0 111.06 1.06l-1.5 1.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 010-1.06z" /></svg>
                    </button>
                </div>
                <Link to={`/blog/${slug}`} className="read-more-link">
                    Read More &rarr;
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
});

export default TrendingBlogPostCard; 