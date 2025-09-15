import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './HomepageCard.css'; // Shared CSS

const NewPartCard = forwardRef(({ part }, ref) => {
  
  const { title, slug, tags, description_preview_html, lowest_ask, highest_bid } = part;
  const image = part.images && part.images.length > 0 ? part.images[0] : null;

  return (
    <div className="homepage-card-wrapper" ref={ref}>
      <span className="card-type-label">New Part</span>
      <div className="homepage-card new-part-card">
        <div className="card-top-section">
          <div className="card-top-left">
            {image && (
              <Link to={`/part/${slug}`} className="part-image-link">
                <img src={image.url} alt={title} className="part-image" />
              </Link>
            )}
            <div className="part-details">
              <Link to={`/part/${slug}`}>
                <h3 className="part-title">{title}</h3>
              </Link>
              <div className="part-tags">
                {tags?.slice(0, 4).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>
          </div>
          <div className="card-top-right">
            <div className="price-box ask">
              <div className="price-header">Lowest Ask</div>
              <div className="price-content">
                {lowest_ask ? `$${lowest_ask.toFixed(2)}` : 'N/A'}
              </div>
            </div>
            <div className="price-box bid">
              <div className="price-header">Highest Bid</div>
              <div className="price-content">
                {highest_bid ? `$${highest_bid.toFixed(2)}` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
        <div className="card-bottom-section">
          <div 
            className="description-snippet"
            dangerouslySetInnerHTML={{ __html: description_preview_html || '<p>No description available.</p>' }}
          />
          <Link to={`/part/${slug}`} className="view-part-button">
            View Part
          </Link>
        </div>
      </div>
    </div>
  );
});

export default NewPartCard; 