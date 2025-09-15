import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './HomepageCard.css'; // Shared CSS

const TrendingCommentCard = forwardRef(({ comment }, ref) => {
  
  const { product, text, user, createdAt } = comment;
  const partImage = product.image ? product.image.url : '/path/to/default/image.png';

  const formattedTimestamp = new Date(createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="homepage-card-wrapper" ref={ref}>
      <span className="card-type-label">Trending Comment</span>
      <div className="homepage-card trending-comment-card">
        {/* Top section is identical to NewPartCard */}
        <div className="card-top-section">
          <div className="card-top-left">
            <Link to={`/part/${product.slug}`} className="part-image-link">
              <img src={partImage} alt={product.title} className="part-image" />
            </Link>
            <div className="part-details">
              <Link to={`/part/${product.slug}`}>
                <h3 className="part-title">{product.title}</h3>
              </Link>
              <div className="part-tags">
                {product.tags?.slice(0, 4).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>
          </div>
          <div className="card-top-right">
            <div className="price-box ask">
              <div className="price-header">Lowest Ask</div>
              <div className="price-content">
                {product.lowest_ask ? `$${product.lowest_ask.toFixed(2)}` : 'N/A'}
              </div>
            </div>
            <div className="price-box bid">
              <div className="price-header">Highest Bid</div>
              <div className="price-content">
                {product.highest_bid ? `$${product.highest_bid.toFixed(2)}` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section for the comment */}
        <div className="card-bottom-section comment-section">
            <div className="comment-author-info">
                <img src={user.profilePicture || '/default-profile.png'} alt={user.name} className="comment-author-avatar" />
                <span className="comment-author-name">{user.name}</span>
                <span className="comment-timestamp">&bull; {formattedTimestamp}</span>
            </div>
          <p className="comment-text">{text}</p>
          <Link to={`/part/${product.slug}?comment=${comment._id}`} className="view-comment-link">
            View comment and replies &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
});

export default TrendingCommentCard; 