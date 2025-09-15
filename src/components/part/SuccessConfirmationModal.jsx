import { FiX, FiCheckCircle } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import './SuccessConfirmationModal.css';

const SuccessConfirmationModal = ({ isOpen, onClose, title, message }) => {
  console.log('[SuccessModal] Rendering with props:', { isOpen, title, message });
  
  if (!isOpen) {
    console.log('[SuccessModal] Not rendering because isOpen is false');
    return null;
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  console.log('[SuccessModal] Rendering modal content');
  
  const modalContent = (
    <div className="success-modal-backdrop" onClick={handleBackdropClick}>
      <div className="success-modal-content">
        <button className="success-modal-close-btn" onClick={onClose}>
          <FiX />
        </button>
        <div className="success-modal-icon">
          <FiCheckCircle size={50} color="#28a745" />
        </div>
        <h2 className="success-modal-title">{title || 'Success!'}</h2>
        <p className="success-modal-message">
          {message || 'Your changes have been submitted successfully.'}
        </p>
        <button className="success-modal-ok-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
  
  // Use createPortal to render the modal directly into the document body
  return createPortal(modalContent, document.body);
};

export default SuccessConfirmationModal; 