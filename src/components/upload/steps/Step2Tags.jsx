import { useState } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const Step2Tags = ({ nextStep, prevStep, handleChange, data }) => {
  const [tags, setTags] = useState(data.tags || []);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        handleChange('tags', updatedTags);
        setInputValue('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    handleChange('tags', updatedTags);
  };

  return (
    <div className="upload-step">
      <h2>Add Tags</h2>
      <div className="input-group">
        <label htmlFor="tagsInput">Tags (separated by comma or Enter)</label>
        <div className="tags-input-container">
          {tags.map((tag, index) => (
            <span key={index} className="tag-item">
              {tag}
              <button onClick={() => removeTag(tag)} className="remove-tag-button">×</button>
            </span>
          ))}
          <input
            type="text"
            id="tagsInput"
            className="tags-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="e.g., bmw, transmission, e36, 5-speed"
          />
        </div>
      </div>

      <div className="subtext-info">
        <p>Add relevant tags to help others find this part.</p>
        <p>Include: <strong>Manufacturer</strong>, <strong>Part Type</strong>, specific <strong>Vehicle Models/Generations</strong> it fits.</p>
        <p><span className="checkmark">✓</span> bmw, zf, transmission, 5-speed, manual, e36, e46, e39...</p>
        <p><span className="checkmark">✓</span> honda, engine, k-series, k20, vtec, jdm, ep3, dc5...</p>
        <p><span className="xmark">✗</span> part, hot deal, sleeper</p>
      </div>

      <div className="navigation-buttons">
        <button className="button back" onClick={prevStep}>
          <FiArrowLeft /> Back
        </button>
        <button className="button next" onClick={nextStep} disabled={tags.length === 0}>
          Next <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default Step2Tags; 