import React from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiExternalLink } from 'react-icons/fi';

const Step6Confirmation = ({ partData, createdSlug }) => {
  // Use the slug passed from the parent, fallback to generating one if needed (shouldn't happen on success)
  const partSlug = createdSlug || (partData.name ? partData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') : 'new-part');

  return (
    <div className="upload-step confirmation-step">
      <FiCheckCircle className="confirmation-icon" />
      <h2>Part Submitted Successfully!</h2>
      <p className="step-description">
        Your part "<strong>{partData.name}</strong>" has been added to the database.
        It may take a moment for it to appear in search results.
      </p>

      {/* Optional: Display a summary of the submitted data */}
      {/* <div className="submitted-data-summary">
        <h4>Summary:</h4>
        <p><strong>Name:</strong> {partData.name}</p>
        <p><strong>Tags:</strong> {partData.tags.join(', ')}</p>
        Add more fields as needed...
      </div> */}

      <div className="confirmation-actions">
        <Link to={`/part/${partSlug}`} className="button-primary view-part-link">
          View Part Page <FiExternalLink />
        </Link>
        <Link to="/upload-part" className="button-secondary add-another-link">
          Add Another Part
        </Link>
        {/* <Link to="/" className="button-secondary">Go to Homepage</Link> */}
      </div>
    </div>
  );
};

export default Step6Confirmation; 