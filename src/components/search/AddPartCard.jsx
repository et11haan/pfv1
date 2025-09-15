import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Cards.css'; // Shared card styles

// Use forwardRef to allow passing ref to the outermost element if needed, though unlikely for this card
const AddPartCard = forwardRef((props, ref) => {

  const imageUrl = '/Adobe Express - file.png'; // Path relative to the public folder

  return (
    <div className="search-card add-part-card" ref={ref}>
      <Link to="/upload-part" className="card-link">
        <div className="card-image-container">
          <img 
            src={imageUrl} 
            alt="Upload a new part" 
            className="card-image" 
            // Optional: Add error handling if the image might be missing
            // onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-image.png'; }}
          />
        </div>
        <div className="card-content">
          {/* Use a specific class for the larger title */}
          <h3 className="card-title add-part-card-title">Upload a new part</h3>
          {/* No price boxes needed */}
        </div>
      </Link>
    </div>
  );
});

AddPartCard.displayName = 'AddPartCard'; // Add display name for DevTools

export default AddPartCard; 