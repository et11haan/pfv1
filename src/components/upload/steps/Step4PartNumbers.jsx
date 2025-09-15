import React from 'react';
import { FiPlus, FiTrash2, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const Step4PartNumbers = ({ nextStep, prevStep, handleChange, data }) => {
  const handlePartNumberChange = (index, field, value) => {
    const newPartNumbers = [...data.partNumbers];
    newPartNumbers[index][field] = value;
    handleChange('partNumbers', newPartNumbers);
  };

  const addPartNumberField = () => {
    handleChange('partNumbers', [...data.partNumbers, { number: '', sourceUrl: '' }]);
  };

  const removePartNumberField = (index) => {
    const newPartNumbers = data.partNumbers.filter((_, i) => i !== index);
    // Ensure at least one field remains
    if (newPartNumbers.length === 0) {
      handleChange('partNumbers', [{ number: '', sourceUrl: '' }]);
    } else {
      handleChange('partNumbers', newPartNumbers);
    }
  };

  return (
    <div className="upload-step">
      <h2>Step 4: Add Part Numbers (Optional)</h2>
      <p className="step-description">
        Enter any known part numbers associated with this part and URLs where they can be verified (e.g., manufacturer page, forum thread, eBay listing).
      </p>

      {data.partNumbers.map((pn, index) => (
        <div key={index} className="part-number-entry">
          <div className="form-group pn-number">
            <label htmlFor={`partNumber-${index}`}>Part Number</label>
            <input
              type="text"
              id={`partNumber-${index}`}
              value={pn.number}
              onChange={(e) => handlePartNumberChange(index, 'number', e.target.value)}
              placeholder="e.g., 11287598833"
              className="form-control"
            />
          </div>
          <div className="form-group pn-source">
            <label htmlFor={`sourceUrl-${index}`}>Source URL (Optional)</label>
            <input
              type="url"
              id={`sourceUrl-${index}`}
              value={pn.sourceUrl}
              onChange={(e) => handlePartNumberChange(index, 'sourceUrl', e.target.value)}
              placeholder="https://example.com/part-source"
              className="form-control"
            />
          </div>
          {data.partNumbers.length > 1 && (
            <button 
              onClick={() => removePartNumberField(index)} 
              className="button-icon remove-pn"
              aria-label="Remove Part Number"
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      ))}

      <button onClick={addPartNumberField} className="button-secondary add-pn">
        <FiPlus /> Add Another Part Number
      </button>

      <div className="navigation-buttons">
        <button onClick={prevStep} className="button back">
          <FiArrowLeft /> Back
        </button>
        <button onClick={nextStep} className="button next">
          Next <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default Step4PartNumbers; 