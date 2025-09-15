import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function VerifyPhonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Function to get query parameters
  const getQueryParam = (param) => {
    return new URLSearchParams(location.search).get(param);
  };

  const targetUrl = getQueryParam('targetUrl') || '/'; // Get target URL or default to homepage
  const tempToken = getQueryParam('tempToken'); // Get the temp token for API calls

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
  };

  const handleSkip = () => {
    // Navigate back to the target page
    console.log(`Skipping phone verification, navigating to: ${targetUrl}`);
    navigate(targetUrl);
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showMessage('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/request-phone-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Verification code sent successfully!', 'success');
        // In development, show the code in console
        if (data.devCode) {
          console.log('Development code:', data.devCode);
        }
      } else {
        showMessage(data.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error requesting code:', error);
      showMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      showMessage('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-phone-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ verificationCode: verificationCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        // Store the final JWT token
        localStorage.setItem('token', data.token);
        
        // Update auth context if available
        if (window.authContext && window.authContext.setToken) {
          window.authContext.setToken(data.token);
        }
        
        showMessage('Phone number verified successfully!', 'success');
        
        // Navigate to target URL after a short delay
        setTimeout(() => {
          navigate(targetUrl);
        }, 1000);
      } else {
        showMessage(data.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      showMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Verify Your Phone Number</h1>

        <p className="mb-6 text-gray-600 text-center text-sm">
          To ensure account security and enable full features, please verify your phone number. A code will be sent via SMS.
        </p>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Phone Number Input Form */}
        <form onSubmit={handleRequestCode} className="mb-6">
          <div className="mb-4">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (e.g., +15551234567)
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              placeholder="+15551234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>

        {/* Verification Code Input Form */}
        <form onSubmit={handleVerifyCode} className="mb-6">
          <div className="mb-4">
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              id="verificationCode"
              name="verificationCode"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              maxLength="6"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {/* Skip Button */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyPhonePage; 