import { useState } from 'react';
import PricingModal from './PricingModal';
import { useProduct } from '../../context/ProductContext';

const PriceSection = ({ lowestAsk, highestBid, onAddListing }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { listings } = useProduct();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const formatDisplayPrice = (price) => {
    if (price === undefined || price === null) return 'N/A';
    return price.toFixed(2);
  };

  return (
    <>
      <div className="content-container price-section" onClick={handleOpenModal}>
        <h2>Price</h2>
        <p>These are the listings for people currently interested in buying or selling a part.</p>
        <div className="price-box ask">
          <div className="price-header">Lowest Ask</div>
          <div className="price-content">
            <div className="price-amount">
              <span className="currency">$</span>
              <span className="amount">{formatDisplayPrice(lowestAsk)}</span>
              <span className="currency-code">USD</span>
            </div>
          </div>
        </div>
        <div className="price-box bid">
          <div className="price-header">Highest Bid</div>
          <div className="price-content">
            <div className="price-amount">
              <span className="currency">$</span>
              <span className="amount">{formatDisplayPrice(highestBid)}</span>
              <span className="currency-code">USD</span>
            </div>
          </div>
        </div>
        <div className="guarantee-section">
          <div className="guarantee-item">
            <svg className="guarantee-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <strong>100% Money Back Guarantee</strong>
              <p className="guarantee-text">PartsFlip Guarantee allows users to open a dispute for a refund if the item is not as described.</p>
            </div>
          </div>
          
          <div className="guarantee-item">
            <svg className="guarantee-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <strong>Forum Support</strong>
              <p className="guarantee-text">Talk to others, gather documentation, and work with others to develop an informational database.</p>
            </div>
          </div>
        </div>
      </div>

      <PricingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Listings to Buy or Sell"
        subtitle="These are the listings for people currently interested in buying or selling a part. Hover over to contact someone."
        listings={listings}
        onAddListing={onAddListing}
      />
    </>
  );
};

export default PriceSection; 