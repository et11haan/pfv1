import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Cards.css'; // Shared card styles

// Use forwardRef to allow passing ref to the outermost element
const ProductCard = forwardRef(({ product }, ref) => {

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return 'N/A';
    return Math.floor(price); // Remove decimals
  };

  const defaultImageUrl = '/placeholder-image.png'; // Define a default image path

  return (
    <div className="search-card product-card" ref={ref}>
      <Link to={`/part/${product.slug}`} className="card-link">
        <div className="card-image-container">
          <img 
            src={product.primaryImageUrl || defaultImageUrl} 
            alt={product.title} 
            className="card-image" 
            onError={(e) => { e.target.onerror = null; e.target.src=defaultImageUrl; }} // Handle image load errors
          />
        </div>
        <div className="card-content">
          <h3 className="card-title">{product.title}</h3>
          <div className="card-prices-horizontal">
            <div className="price-box price-ask-box">
              <div className="price-header">Lowest Ask</div>
              <div className="price-content">
                ${formatPrice(product.lowestAsk)} <span className="usd-label">USD</span>
              </div>
            </div>
            <div className="price-box price-bid-box">
              <div className="price-header">Highest Bid</div>
              <div className="price-content">
                ${formatPrice(product.highestBid)} <span className="usd-label">USD</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

ProductCard.displayName = 'ProductCard'; // Add display name for DevTools

export default ProductCard; 