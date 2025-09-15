import React, { useState } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const Step3UploadImage = ({ nextStep, prevStep, handleChange, data }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const isValidImageUrl = (url) => {
    try {
      new URL(url);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      return imageExtensions.some(ext => url.toLowerCase().endsWith(ext)) ||
             url.toLowerCase().includes('imgur.com');
    } catch (e) {
      return false;
    }
  };

  const handleInputChange = (e) => {
    const url = e.target.value;
    handleChange('imageUrl', url);
    setError('');

    if (!url.trim()) {
      setPreview(null);
      return;
    }

    if (isValidImageUrl(url)) {
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const isNextDisabled = !data.imageUrl || data.imageUrl.trim() === '' || !!error;

  return (
    <div className="upload-step">
      <h2>Step 3: Add Part Image URL</h2>
      <p className="step-description">
        Provide a direct link (URL) to an image of the part. This is required.
      </p>

      <div className="image-url-instructions">
        <strong>How to find an image URL:</strong>
        <ul>
          <li>Find an image online (e.g., Google Images, manufacturer site, forum post).</li>
          <li>Right-click (or long-press on mobile) the image.</li>
          <li>Select "Copy Image Address" or "Copy Image Link".</li>
        </ul>
        <p>
          <strong>Need to upload your own image?</strong> We recommend using{' '}
          <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer">
            Imgur
          </a>. After uploading, copy the "Direct Link".
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="imageUrl">Image URL</label>
        <input
          type="url"
          id="imageUrl"
          value={data.imageUrl || ''}
          onChange={handleInputChange}
          placeholder="https://example.com/image.jpg or https://i.imgur.com/your_image.jpg"
          className="form-control"
          required
        />
        {error && <p className="error-message" style={{ color: 'red', fontSize: '0.9em', marginTop: '5px' }}>{error}</p>}
      </div>

      {preview && (
        <div className="image-preview" style={{ marginTop: '15px', marginBottom: '15px', textAlign: 'center' }}>
          <h4>Preview:</h4>
          <img
            src={preview}
            alt="Image Preview"
            style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px', objectFit: 'contain' }}
            onError={() => {
              setPreview(null);
              setError('Unable to load image preview. Please check the URL or try a different one.');
            }}
          />
        </div>
      )}

      <div className="step-navigation navigation-buttons">
        <button onClick={prevStep} className="button back">
          <FiArrowLeft /> Back
        </button>
        <button 
          onClick={nextStep} 
          className="button next"
          disabled={isNextDisabled}
        >
          Next <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default Step3UploadImage; 