import { useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiPlus, FiTrash2 } from 'react-icons/fi';

const Step3PartNumbers = ({ nextStep, prevStep, handleChange, data }) => {
  const [partNumbers, setPartNumbers] = useState(data.partNumbers || [{ number: '', sourceUrl: '' }]);

  const handlePartNumberChange = (index, field, value) => {
    const updatedPartNumbers = [...partNumbers];
    updatedPartNumbers[index][field] = value;
    setPartNumbers(updatedPartNumbers);
    handleChange('partNumbers', updatedPartNumbers); // Update parent state
  };

  const addPartNumberField = () => {
    const updatedPartNumbers = [...partNumbers, { number: '', sourceUrl: '' }];
    setPartNumbers(updatedPartNumbers);
    handleChange('partNumbers', updatedPartNumbers); // Update parent state
  };

  const removePartNumberField = (index) => {
    // Prevent removing the last field
    if (partNumbers.length <= 1) return;
    const updatedPartNumbers = partNumbers.filter((_, i) => i !== index);
    setPartNumbers(updatedPartNumbers);
    handleChange('partNumbers', updatedPartNumbers); // Update parent state
  };

  // Basic validation: check if at least one part number is entered
  const canProceed = partNumbers.some(pn => pn.number.trim() !== '');

  return (
    <div className="upload-step">
      <h2>Enter Part Numbers</h2>
      <p className="subtext-info">
        Provide known part numbers and where you found them (e.g., a parts catalog URL).
        <br />
        <i>Some parts have multiple numbers (e.g., for different vehicles, revisions, or remanufacturing). Add fields for each known number.</i>
      </p>

      {partNumbers.map((pn, index) => (
        <div key={index} className="part-number-entry">
          <div className="input-group">
            <label htmlFor={`partNumber-${index}`}>Part Number</label>
            <input
              type="text"
              id={`partNumber-${index}`}
              className="input-field"
              value={pn.number}
              onChange={(e) => handlePartNumberChange(index, 'number', e.target.value)}
              placeholder="e.g., 23001434485 or S5D-320Z"
            />
          </div>
          <div className="input-group">
            <label htmlFor={`sourceUrl-${index}`}>Source URL (Optional)</label>
            <input
              type="url" /* Use type="url" for basic validation */
              id={`sourceUrl-${index}`}
              className="input-field"
              value={pn.sourceUrl}
              onChange={(e) => handlePartNumberChange(index, 'sourceUrl', e.target.value)}
              placeholder="e.g., https://www.realoem.com/..."
            />
          </div>
          <button
            type="button"
            onClick={() => removePartNumberField(index)}
            className="remove-part-number-button"
            title="Remove Part Number"
            disabled={partNumbers.length <= 1} // Disable removing if only one field left
          >
            <FiTrash2 />
          </button>
        </div>
      ))}

      <button type="button" onClick={addPartNumberField} className="add-part-number-button">
        <FiPlus /> Add Another Part Number
      </button>

      <div className="navigation-buttons">
        <button className="button back" onClick={prevStep}>
          <FiArrowLeft /> Back
        </button>
        <button className="button next" onClick={nextStep} disabled={!canProceed}>
          Next <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default Step3PartNumbers; 