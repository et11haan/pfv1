import { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';

// TODO: Replace with actual OpenAI API call setup
const mockOpenAICheck = async (name) => {
  console.log(`Mock OpenAI Check for: ${name}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  // Simple mock validation: Reject if name contains "test" or is very short
  if (name.toLowerCase().includes('test') || name.length < 10) {
    console.log('Mock OpenAI Check: Rejected');
    return false;
  }
  console.log('Mock OpenAI Check: Approved');
  return true;
};

const Step1Name = ({ nextStep, handleChange, data }) => {
  const [name, setName] = useState(data.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    setIsLoading(true);
    setError('');
    const isValid = await mockOpenAICheck(name);
    setIsLoading(false);

    if (isValid) {
      handleChange('name', name);
      nextStep();
    } else {
      setError('Please enter a more descriptive and accurate part name.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500); // Remove shake class after animation
    }
  };

  return (
    <div className={`upload-step ${isShaking ? 'shake' : ''}`}>
      <h2>Enter the name of your part</h2>
      <div className="input-group">
        <label htmlFor="partName">Part Name</label>
        <input
          type="text"
          id="partName"
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., BMW ZF S5D-320Z Transmission"
        />
        {error && <p style={{ color: 'red', fontSize: '0.8rem' }}>{error}</p>}
      </div>

      <div className="subtext-info" style={{ fontSize: 'calc(0.875rem + 1pt)' }}>
        <p><strong>Enter the <i>(Vehicle manufacturer) (Part manufacturer, if applicable) (Part model code)</i> and <i>(Part type)</i></strong></p>
        <p><span className="checkmark">✓</span> BMW ZF S5D-320Z Transmission</p>
        <p><span className="xmark">✗</span> BMW 23001434485 Transmission</p>
        <p style={{ fontSize: '0.875rem' }}><i>The S5D-320Z is the transmission's designation, not the part number - we will get to this later.</i></p>

        <p><strong>If your part doesn't have a manufacturer designation (check, it most likely does!), enter it as: <i>(Vehicle manufacturer) (Applicable vehicle model/generation) (Part type)</i></strong></p>
        <p><span className="checkmark">✓</span> Honda EG Civic Brake Master Cylinder</p>
        <p><span className="xmark">✗</span> Honda 91-95 Brake Master Cylinder</p>

        <p><strong>If your part has been used on multiple vehicles, format it like this:</strong></p>
        <p><span className="checkmark">✓</span> Dodge Dipstick O-ring 92-09</p>
        <p><span className="xmark">✗</span> Dodge Dipstick O-ring multiple vehicles</p>
      </div>

      <div className="navigation-buttons">
        {/* No back button on the first step */}
        <div></div>
        <button
          className="button next"
          onClick={handleNext}
          disabled={!name || isLoading}
        >
          {isLoading ? 'Checking...' : 'Next'}
          {!isLoading && <FiArrowRight />}
        </button>
      </div>
    </div>
  );
};

export default Step1Name; 