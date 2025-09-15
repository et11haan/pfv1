import { useState } from 'react';
import { useProduct } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import './styles.css'; // Assuming shared styles

const CreateListingForm = () => {
  const { product, addListing } = useProduct();
  const { user } = useAuth();
  const productId = product?._id;

  const [type, setType] = useState('ask'); // Default to 'ask'
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    console.log('[CreateListingForm] handleSubmit function called!');
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!productId) {
      setError('Cannot create listing: Product ID is missing.');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      setError('Please enter a valid, non-negative price.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter a location.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description.');
      return;
    }

    setIsLoading(true);
    const listingData = {
      productId,
      type,
      price: parseFloat(price),
      location: location.trim(),
      description: description.trim(),
      seller: user ? { name: user.name, profilePicture: user.profilePicture } : { name: 'Anonymous' },
      // image: Optional - add later if needed
    };

    try {
      const response = await fetch('http://localhost:3001/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });

      if (!response.ok) {
        let errorText = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
        } catch (jsonError) {
            // If response is not JSON, use the status text
             errorText = response.statusText || errorText;
        }
        throw new Error(errorText);
      }

      const newListing = await response.json();

      // Add the new listing to the context state
      addListing(newListing);

      // Reset form and show success message
      setType('ask');
      setPrice('');
      setLocation('');
      setDescription('');
      setSuccess(true);
      // Hide success message after a few seconds
      setTimeout(() => setSuccess(false), 3000); 

    } catch (err) {
      console.error("Failed to create listing:", err);
      setError(`Failed to create listing: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-listing-form card-style">
      <h3>Create New Listing</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Listing Type:</label>
          <select value={type} onChange={(e) => setType(e.target.value)} required>
            <option value="ask">Selling (Ask)</option>
            <option value="bid">Buying (Bid)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="listing-price">Price (USD):</label>
          <input
            id="listing-price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 700.00"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="listing-location">Location:</label>
          <input
            id="listing-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., New York, NY"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="listing-description">Description:</label>
          <textarea
            id="listing-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the item..."
            rows="4"
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">Listing created successfully!</p>}

        <button type="submit" className="submit-button" disabled={isLoading || !productId}>
          {isLoading ? 'Submitting...' : 'Create Listing'}
        </button>
         {!productId && <p className="error-message small">Product data not loaded yet.</p>} 
      </form>
    </div>
  );
};

export default CreateListingForm; 