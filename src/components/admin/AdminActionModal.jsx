import React, { useState, useEffect } from 'react';
// import './AdminActionModal.css'; // Create this for styling

const AdminActionModal = ({
  isOpen,
  onClose,
  onSubmit,
  reportId, 
  actionType, // 'change_status_...', 'delete_item', 'delete_mute_user'
  isLoading,
  error,
}) => {
  console.log('[AdminActionModal] Component rendered/re-rendered. Props received - actionType:', actionType, 'reportId:', reportId, 'isOpen:', isOpen);
  const [reason, setReason] = useState('');
  const [muteDuration, setMuteDuration] = useState(1); // Default 1 day

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setMuteDuration(1);
    }
  }, [isOpen, reportId, actionType]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // Reason is always required now for any action through this modal
    if (!reason.trim()) {
      alert('Reason/Note is required for this action.'); // Replace with better error display
      return;
    }
    console.log('[AdminActionModal] handleSubmit - calling onSubmit with actionType:', actionType, 'reportId:', reportId);
    onSubmit(reportId, actionType, reason, actionType === 'delete_mute_user' ? muteDuration : null);
  };

  let title = 'Confirm Action';
  let submitButtonText = 'Confirm Action';
  let reasonLabel = "Reason for action:";
  let reasonPlaceholder = "Provide a clear reason for this moderation action...";

  if (actionType?.startsWith('change_status')) {
    title = 'Change Report Status';
    submitButtonText = 'Update Status';
    reasonLabel = "Admin Note (reason for status change):";
    reasonPlaceholder = "Enter notes regarding the status change (e.g., why it was dismissed, or what action was taken).";
  } else if (actionType === 'delete_item') {
    title = 'Confirm Content Deletion';
    submitButtonText = 'Delete Content & Resolve Report';
    reasonLabel = "Reason for Deletion:";
    // reasonPlaceholder remains the same or can be more specific
  } else if (actionType === 'delete_mute_user') {
    title = 'Confirm Deletion & User Mute';
    submitButtonText = 'Delete, Mute & Resolve Report';
    reasonLabel = "Reason for Deletion & Mute:";
    // reasonPlaceholder remains the same or can be more specific
  }

  const showMuteDuration = actionType === 'delete_mute_user';

  return (
    <div style={styles.overlay} onClick={onClose}> {/* Close on backdrop click */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside modal */}
        <h3 style={styles.title}>{title}</h3>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="adminReason" style={styles.label}>{reasonLabel}</label>
            <textarea
              id="adminReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={styles.textarea}
              rows={4}
              placeholder={reasonPlaceholder}
            />
          </div>

          {showMuteDuration && (
            <div style={styles.formGroup}>
              <label htmlFor="muteDuration" style={styles.label}>Mute duration (1-30 days):</label>
              <input
                id="muteDuration"
                type="number"
                value={muteDuration}
                onChange={(e) => setMuteDuration(parseInt(e.target.value, 10))}
                min="1"
                max="30"
                required
                style={styles.input}
              />
            </div>
          )}

          {error && <p style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</p>}

          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} style={{...styles.button, ...styles.cancelButton}} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" style={{...styles.button, ...styles.confirmButton}} disabled={isLoading}>
              {isLoading ? 'Processing...' : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Basic inline styles - consider moving to a CSS file
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
    fontSize: '1.6em',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: 'bold',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '1em',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '1em',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '25px',
  },
  button: {
    padding: '10px 18px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: '600',
    transition: 'background-color 0.2s ease',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  confirmButton: {
    backgroundColor: '#007bff',
    color: 'white',
  },
};

export default AdminActionModal; 