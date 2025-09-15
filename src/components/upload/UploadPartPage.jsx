import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Step1Name from './steps/Step1Name';
import Step2Tags from './steps/Step2Tags';
import Step3UploadImage from './steps/Step3UploadImage';
import Step4PartNumbers from './steps/Step4PartNumbers';
import Step5Description from './steps/Step5Description';
import Step6Confirmation from './steps/Step6Confirmation';
import './UploadPartPage.css';

const UploadPartPage = () => {
  const [step, setStep] = useState(1);
  const [partData, setPartData] = useState({
    name: '',
    tags: [],
    imageUrl: '',
    partNumbers: [{ number: '', sourceUrl: '' }],
    description: '',
  });
  const [submissionError, setSubmissionError] = useState(null);
  const [existingPartSlug, setExistingPartSlug] = useState(null);
  const { user, isAuthenticated } = useAuth();

  const nextStep = () => {
    setSubmissionError(null);
    setExistingPartSlug(null);
    setStep(prev => prev + 1);
  };
  const prevStep = () => {
    setSubmissionError(null);
    setExistingPartSlug(null);
    setStep(prev => prev - 1);
  };

  const handleDataChange = (field, value) => {
    setPartData(prev => ({ ...prev, [field]: value }));
  };

  const submitPart = async () => {
    if (!isAuthenticated) {
      window.alert('You must be signed in to upload a part. Please sign in and try again.');
      return;
    }
    console.log("Attempting to submit part data:", partData);
    setSubmissionError(null);
    setExistingPartSlug(null);

    const { imageUrl, ...dataToSubmit } = partData;

    const submissionData = {
      ...dataToSubmit,
      images: imageUrl ? [imageUrl] : []
    };

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || (result.error && result.error.toLowerCase().includes('auth'))) {
          window.alert('You must be signed in to upload a part. Please sign in and try again.');
          return;
        }
        if (response.status === 409 && result.existingSlug) {
          console.error('Submission Error: Duplicate part', result);
          setSubmissionError('A part with this name already exists.');
          setExistingPartSlug(result.existingSlug);
          return;
        } else {
          console.error('Submission Error:', result);
          setSubmissionError(result.error || 'Failed to submit part. Please check the data.');
        }
        return;
      }

      console.log('Part submitted successfully:', result);
      setPartData(prev => ({ ...prev, _id: result._id, slug: result.slug }));
      setStep(6);

    } catch (error) {
      console.error('Network or parsing error submitting part:', error);
      setSubmissionError('An unexpected error occurred. Please try again.');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Name nextStep={nextStep} handleChange={handleDataChange} data={partData} />;
      case 2:
        return <Step2Tags nextStep={nextStep} prevStep={prevStep} handleChange={handleDataChange} data={partData} />;
      case 3:
        return <Step3UploadImage nextStep={nextStep} prevStep={prevStep} handleChange={handleDataChange} data={partData} />;
      case 4:
        return <Step4PartNumbers nextStep={nextStep} prevStep={prevStep} handleChange={handleDataChange} data={partData} />;
      case 5:
        return <Step5Description submitPart={submitPart} prevStep={prevStep} handleChange={handleDataChange} data={partData} />;
      case 6:
        return <Step6Confirmation partData={partData} createdSlug={partData.slug} />;
      default:
        return <Step1Name nextStep={nextStep} handleChange={handleDataChange} data={partData} />;
    }
  };

  return (
    <div className="upload-part-container">
      <div className="upload-part-content">
        {submissionError && (
          <div className="error-message">
            <strong>Error:</strong> {submissionError}
            {existingPartSlug && (
              <div className="error-actions">
                <Link to={`/part/${existingPartSlug}`} className="view-existing-link">
                  View Existing Part
                </Link>
              </div>
            )}
          </div>
        )}
        {renderStep()}
        <div className="wiki-notice">
          <p>ℹ️ This site runs like Wikipedia! All users can edit content to build a shared knowledge base. Spam or intentionally incorrect information may lead to account restrictions.</p>
        </div>
      </div>
    </div>
  );
};

export default UploadPartPage; 