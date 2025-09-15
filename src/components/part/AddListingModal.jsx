import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Modal.css';

const AddListingModal = ({ productId, onClose }) => {
  const [listingType, setListingType] = useState('ask');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic to add the listing will go here
    console.log({
      productId,
      listingType,
      price,
      description,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Listing</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Listing Type</label>
              <select value={listingType} onChange={(e) => setListingType(e.target.value)}>
                <option value="ask">Ask (Selling)</option>
                <option value="bid">Bid (Buying)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price (USD)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about your listing"
                rows="4"
                required
              ></textarea>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Add Listing</button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

AddListingModal.propTypes = {
  productId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AddListingModal; 