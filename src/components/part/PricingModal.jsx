import { FiDollarSign, FiX, FiCheck, FiPlus } from 'react-icons/fi';
import ListingDetailsModal from './ListingDetailsModal';
import { useState, useEffect, useRef } from 'react';
import { useProduct } from '../../context/ProductContext';

const ListingCard = ({ listing, onListingClick }) => {
  // Get seller name and profile picture
  const sellerName = typeof listing.seller === 'object' ? listing.seller?.name : listing.seller;
  const sellerProfilePicture = typeof listing.seller === 'object' ? listing.seller?.profilePicture : undefined;

  return (
    <div className="listing-card" onClick={() => onListingClick(listing)}>
      <div className="listing-header">
        <div
          className="listing-avatar"
          style={sellerProfilePicture ? { backgroundImage: `url(${sellerProfilePicture})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        />
        <div className="listing-user-info">
          <h3 className="listing-user-name">
            {sellerName}
            {listing.verified && <FiCheck className="listing-verified" />}
          </h3>
          <p className="listing-location">{listing.location}</p>
        </div>
        <div className="listing-price">
          <div className="listing-price-label">{listing.type === 'ask' ? 'ASKING PRICE' : 'BUYING PRICE'}</div>
          <div className="listing-price-amount">USD {listing.price}</div>
        </div>
      </div>
      <div className="listing-content">
        <div className="listing-image" style={{ backgroundImage: `url(${listing.image})` }} />
        <p className="listing-description">{listing.description}</p>
      </div>
    </div>
  );
};

const PricingModal = ({ isOpen, onClose, title, subtitle, onAddListing, listings = [] }) => {
  const [selectedListing, setSelectedListing] = useState(null);
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [sortType, setSortType] = useState({
    asks: 'low-to-high',
    bids: 'low-to-high'
  });
  const { fetchMoreListings, loading, listings: listingsState } = useProduct();
  const { isLoadingMoreListings } = useProduct();
  const asksLoaderRef = useRef();
  const bidsLoaderRef = useRef();

  const organizedListings = {
    asks: listingsState.items.filter(listing => listing.type === 'ask'),
    bids: listingsState.items.filter(listing => listing.type === 'bid')
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    if (!isOpen) return;
    const asksObserver = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchMoreListings('ask');
    });
    const bidsObserver = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchMoreListings('bid');
    });
    if (asksLoaderRef.current) asksObserver.observe(asksLoaderRef.current);
    if (bidsLoaderRef.current) bidsObserver.observe(bidsLoaderRef.current);
    return () => {
      document.body.classList.remove('modal-open');
      asksObserver.disconnect();
      bidsObserver.disconnect();
    };
  }, [isOpen, fetchMoreListings]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  const handleListingClick = (listing) => {
    setSelectedListing(listing);
  };

  const handleAddListingClick = () => {
    onClose(); // Close the pricing modal
    onAddListing(); // Open the add listing modal
  };

  const handleSortChange = (type, value) => {
    setSortType(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const getSortedListings = (listingsArray, sortValue) => {
    return [...listingsArray].sort((a, b) => {
      switch (sortValue) {
        case 'low-to-high':
          return a.price - b.price;
        case 'high-to-low':
          return b.price - a.price;
        case 'most-recent':
          return b.date - a.date;
        default:
          return 0;
      }
    });
  };

  const handleScroll = (e) => {
    const container = e.target;
    const isScrolled = container.scrollTop > 10;
    container.classList.toggle('scrolled', isScrolled);
  };

  const renderListings = (listingsArray, type, loaderRef) => {
    const sortedListings = getSortedListings(listingsArray, sortType[type]);
    return (
      <div 
        className="listings-scroll-container"
        onScroll={handleScroll}
      >
        {sortedListings.map((listing, index) => (
          <ListingCard
            key={listing._id || index}
            listing={listing}
            onListingClick={handleListingClick}
          />
        ))}
        <div ref={loaderRef} style={{ height: 32 }} />
        {isLoadingMoreListings && <div style={{ textAlign: 'center', padding: '1rem' }}>Loading more...</div>}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="pricing-modal" onClick={handleBackdropClick}>
        <div className="pricing-modal-content">
          <button className="modal-close" onClick={handleCloseClick}>
            <FiX />
          </button>
          <div className="pricing-modal-header">
            <h2 className="pricing-modal-title">{title}</h2>
            <p className="pricing-modal-subtitle">{subtitle}</p>
          </div>
          <div className="pricing-columns">
            <div className="pricing-column">
              <div className="pricing-column-header">
                <div className="pricing-column-title">
                  <FiDollarSign />
                  People Selling Parts
                </div>
                <div className="pricing-sort">
                  Sort By
                  <select 
                    value={sortType.asks}
                    onChange={(e) => handleSortChange('asks', e.target.value)}
                  >
                    <option value="low-to-high">Price: Low to High</option>
                    <option value="high-to-low">Price: High to Low</option>
                    <option value="most-recent">Most Recent</option>
                  </select>
                </div>
              </div>
              <div className="pricing-listings">
                {renderListings(organizedListings.asks, 'asks', asksLoaderRef)}
              </div>
            </div>
            <div className="pricing-column">
              <div className="pricing-column-header">
                <div className="pricing-column-title">
                  <FiDollarSign />
                  People Looking to Buy Parts
                </div>
                <div className="pricing-sort">
                  Sort By
                  <select 
                    value={sortType.bids}
                    onChange={(e) => handleSortChange('bids', e.target.value)}
                  >
                    <option value="low-to-high">Price: Low to High</option>
                    <option value="high-to-low">Price: High to Low</option>
                    <option value="most-recent">Most Recent</option>
                  </select>
                </div>
              </div>
              <div className="pricing-listings">
                {renderListings(organizedListings.bids, 'bids', bidsLoaderRef)}
              </div>
            </div>
          </div>
          <div className="pricing-modal-footer">
            <button 
              className="add-listing-button"
              onClick={handleAddListingClick}
            >
              <FiPlus />
              Add New Listing
            </button>
          </div>
        </div>
      </div>

      <ListingDetailsModal
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        listing={selectedListing}
      />
    </>
  );
};

export default PricingModal; 