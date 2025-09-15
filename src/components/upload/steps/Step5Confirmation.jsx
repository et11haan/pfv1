import { Link } from 'react-router-dom';
import { FiCheckCircle, FiList, FiPackage } from 'react-icons/fi';

// Helper to render part numbers list
const renderPartNumbers = (partNumbers) => {
  if (!partNumbers || partNumbers.length === 0 || partNumbers.every(pn => !pn.number)) {
    return <dd>N/A</dd>;
  }
  return (
    <dd>
      <ul>
        {partNumbers.map((pn, index) => pn.number && (
          <li key={index} className="part-number-item">
            {pn.number}
            {pn.sourceUrl && 
              <span style={{ fontSize: '0.8em', marginLeft: '0.5em', color: '#666' }}>
                (<a href={pn.sourceUrl} target="_blank" rel="noopener noreferrer">source</a>)
              </span>}
          </li>
        ))}
      </ul>
    </dd>
  );
};

const Step6Confirmation = ({ partData, createdSlug }) => {
  // Use the slug passed from the parent, fallback to generating one if needed (shouldn't happen on success)
  const partSlug = createdSlug || (partData.name ? partData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') : 'new-part');

  return (
    <div className="upload-step confirmation-step">
      <FiCheckCircle size={48} color="#0ACF83" style={{ alignSelf: 'center', marginBottom: '1rem' }} />
      <h2>Part Submitted Successfully!</h2>
      <p style={{ textAlign: 'center', color: '#555' }}>Your part has been added to the database.</p>

      <div className="confirmation-details">
        <dl>
          <dt>Part Name:</dt>
          <dd>{partData.name || 'N/A'}</dd>

          <dt>Tags:</dt>
          <dd>{partData.tags?.join(', ') || 'N/A'}</dd>

          <dt>Part Numbers:</dt>
          {renderPartNumbers(partData.partNumbers)}

          <dt>Description Preview:</dt>
          <dd style={{ maxHeight: '100px', overflow: 'auto', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>
            {partData.description ? `${partData.description.substring(0, 200)}...` : 'N/A'}
          </dd>
        </dl>
      </div>

      <div className="confirmation-actions">
        <Link to={`/part/${partSlug}`} className="button back">
          <FiPackage /> View Part Page
        </Link>
        <button className="button next" onClick={() => alert('Navigate to Add Listing page...')}> {/* TODO: Implement Add Listing navigation */}
          <FiList /> Add a Listing for this Part
        </button>
      </div>

      <p className="subtext-info" style={{ textAlign: 'center', marginTop: '2rem' }}>
        Remember, newly added parts may not be verified yet. You can help by reviewing and editing information.
      </p>
    </div>
  );
};

export default Step6Confirmation; 