import React from 'react';

const Step3UploadImage = ({ nextStep, prevStep, handleChange, data }) => {
  const handleInputChange = (e) => {
    handleChange('imageUrl', e.target.value);
  };

  return (
    <div className="upload-step">
      <h2>Step 2.5: Add Part Image URL (Optional)</h2>
      <p className="step-description">
        Provide a direct link (URL) to an image of the part.
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
        />
      </div>

      <div className="step-navigation">
        <button onClick={prevStep} className="button-secondary">Previous</button>
        <button onClick={nextStep} className="button-primary">Next</button>
      </div>
    </div>
  );
};

export default Step3UploadImage; 