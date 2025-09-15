import { useState } from 'react';
import { useProduct } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import './Modal.css';

const UploadImageModal = ({ onClose }) => {
  const { product, addImage } = useProduct();
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  
  const productId = product?._id;

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    setError('');
    
    // Clear preview if URL is empty
    if (!url.trim()) {
      setPreview(null);
      return;
    }
    
    // Show preview if URL appears valid
    if (isValidImageUrl(url)) {
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const isValidImageUrl = (url) => {
    // Basic URL validation
    try {
      new URL(url);
      // Check if URL ends with image extension
      // Note: This is a simple check and doesn't guarantee the URL is an image
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      return imageExtensions.some(ext => url.toLowerCase().endsWith(ext)) || 
             url.includes('imgur.com'); // Consider Imgur URLs valid
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }
    
    if (!isValidImageUrl(imageUrl)) {
      setError('Please enter a valid image URL. Image URLs typically end with .jpg, .jpeg, .png, .gif, or .webp');
      return;
    }
    
    if (!productId) {
      setError('Cannot add image: Product ID not found');
      return;
    }

    if (!user) {
      setError('You must be logged in to add images');
      return;
    }
    
    // Simple test to check if image loads
    const testImage = new Image();
    testImage.onload = async () => {
      try {
        setLoading(true);
        setError('');
        await addImage(productId, imageUrl, user.name);
        onClose();
      } catch (err) {
        console.error('Error adding image:', err);
        setError(err.message || 'Failed to add image. Please try again.');
        setLoading(false);
      }
    };
    
    testImage.onerror = () => {
      setError('The provided URL does not appear to be a valid image. Please check and try again.');
      setLoading(false);
    };
    
    // Test if URL loads as an image
    testImage.src = imageUrl;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content upload-image-modal">
        <div className="modal-header">
          <h2>Add Image</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="upload-instructions">
            <h3>Upload Instructions</h3>
            <p>Please provide a direct URL to an image. For best results:</p>
            <ul>
              <li>Use <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer">Imgur</a> to upload your image and copy the "Direct Link"</li>
              <li>Images should be landscape oriented (wider than tall)</li>
              <li>Maximum file size should be under 5MB</li>
              <li>Supported formats: JPG, PNG, GIF, WebP</li>
            </ul>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="imageUrl">Image URL</label>
              <input
                type="url"
                id="imageUrl"
                value={imageUrl}
                onChange={handleUrlChange}
                placeholder="https://i.imgur.com/example.jpg"
                className={`form-control ${error ? 'input-error' : ''}`}
                disabled={loading}
                required
              />
              {error && <div className="error-message">{error}</div>}
            </div>
            
            {preview && (
              <div className="image-preview">
                <h4>Preview</h4>
                <img 
                  src={preview} 
                  alt="Preview" 
                  onError={() => {
                    setPreview(null);
                    setError('Unable to load image preview. Please check the URL.');
                  }}
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="button-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="button-primary"
                disabled={loading || !imageUrl.trim() || !user}
              >
                {loading ? 'Adding...' : 'Add Image'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadImageModal; 