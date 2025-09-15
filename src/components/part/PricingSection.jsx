import React from 'react';
import PropTypes from 'prop-types';
import './PriceSection.css'; // Note: Reusing PriceSection.css

const PricingSection = ({ lowestAsk, highestBid }) => {
  return (
    <div className="pricing-section-container">
      <div className="price-box lowest-ask">
        <span className="price-label">Lowest Ask</span>
        <span className="price-value">
          {lowestAsk ? `$${lowestAsk.toFixed(2)}` : 'N/A'}
        </span>
      </div>
      <div className="price-box highest-bid">
        <span className="price-label">Highest Bid</span>
        <span className="price-value">
          {highestBid ? `$${highestBid.toFixed(2)}` : 'N/A'}
        </span>
      </div>
      <div className="guarantee-box">
        <h4>100% Money Back Guarantee</h4>
        <p>PartsFlip Guarantee allows users to open a dispute for a refund if the item is not as described.</p>
      </div>
      <div className="support-box">
        <h4>Forum Support</h4>
        <p>Talk to others, gather documentation, and work with others to develop an informational database.</p>
      </div>
    </div>
  );
};

PricingSection.propTypes = {
  lowestAsk: PropTypes.number,
  highestBid: PropTypes.number,
};

export default PricingSection; 