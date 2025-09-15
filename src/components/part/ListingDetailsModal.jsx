import { FiX, FiCheck, FiTrash2, FiSend, FiFlag } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProduct } from '../../context/ProductContext';

// Confirmation Modal Component
const ConfirmationModal = ({ isVisible, message, onConfirm, onCancel }) => {
  if (!isVisible) return null;
  return (
    <div className="confirmation-modal-overlay">
      <div className="confirmation-modal-popup">
        <p>{message}</p>
        <div className="confirmation-modal-actions">
          <button onClick={onCancel} className="cancel-button">Cancel</button>
          <button onClick={onConfirm} className="confirm-delete-button">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// Inner component that unconditionally calls hooks
const ListingDetailsModalInner = ({ listing, onClose }) => {
  const { user, token } = useAuth();
  const { product, deleteListing } = useProduct();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSendError, setMessageSendError] = useState(null);
  const [messageSendSuccess, setMessageSendSuccess] = useState(false);

  // State for Report Listing Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitError, setReportSubmitError] = useState(null);
  const [reportSubmitSuccess, setReportSubmitSuccess] = useState(false);

  const isOwner = user && listing.seller_id?._id && user.id === listing.seller_id._id.toString();

  // Reset success/error messages when modal re-opens or listing changes
  useEffect(() => {
    setMessageSendSuccess(false);
    setMessageSendError(null);
    setReportSubmitSuccess(false);
    setReportSubmitError(null);
  }, [listing]);

  // Sample photos array - you can replace these URLs with your actual photos
  const photos = [
    'https://images.unsplash.com/photo-1635773054019-29530c0a6872?w=800',
    'https://images.unsplash.com/photo-1619468129361-605ebea04b44?w=800',
    'https://images.unsplash.com/photo-1619468129520-aa20c6d160f8?w=800'
  ];

  // Correctly access seller name, provide fallback
  const sellerName = listing.seller?.name || 'Unknown User';
  const sellerProfilePicture = listing.seller?.profilePicture;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Only close if not showing a sub-modal like delete confirm or report modal
      if (!showDeleteConfirm && !showReportModal) {
        onClose();
      }
    }
  };

  const handleAskForPhotos = () => {
    setMessageInput('Hi, could you please share more photos of this item? Thank you!');
  };

  const handleDeleteConfirm = async () => {
    if (!listing?._id) {
      setDeleteError("Listing ID is missing, cannot delete.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null); // Clear previous errors
    try {
      await deleteListing(listing._id);
      setShowDeleteConfirm(false); 
      onClose(); 
    } catch (error) {
      console.error("Error deleting listing:", error);
      setDeleteError(`Failed to delete listing: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      setReportSubmitError('Reason for reporting cannot be empty.');
      return;
    }
    if (!token || !listing?._id) {
      setReportSubmitError('Cannot submit report. Missing authentication or listing ID.');
      return;
    }

    setIsSubmittingReport(true);
    setReportSubmitError(null);
    setReportSubmitSuccess(false);

    try {
      const response = await fetch(`/api/listings/${listing._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit report (HTTP ${response.status})`);
      }
      
      setReportSubmitSuccess(true);
      setReportReason(''); // Clear reason
      setTimeout(() => {
        setShowReportModal(false); 
        setReportSubmitSuccess(false); // Reset success message after a delay
      }, 2000); // Close modal after 2s

    } catch (error) {
      console.error("Error submitting listing report:", error);
      setReportSubmitError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSendMessageToListingOwner = async () => {
    if (!messageInput.trim()) {
      setMessageSendError("Message cannot be empty.");
      return;
    }
    if (!user || !token) {
      setMessageSendError("You must be logged in to send messages.");
      return;
    }
    if (!listing.seller_id?._id) {
      setMessageSendError("Listing owner information is missing.");
      return;
    }

    setIsSendingMessage(true);
    setMessageSendError(null);
    setMessageSendSuccess(false);

    const partTitle = product?.title || 'this part';
    const buyOrSell = listing.type === 'ask' ? 'sell' : 'buy';
    // Use listing.product_id which should be the ID of the product this listing belongs to.
    // If product.slug is available on the main product object, that's better, otherwise use product._id or listing.product_id.
    const partLink = `/part/${product?.slug || listing.product_id}`; 
    
    const header = `Re: Your listing for "${partTitle}" to ${buyOrSell} for $${listing.price}. (View product: ${window.location.origin}${partLink})`;
    const fullMessage = `${header}\n\n${messageInput}`;

    try {
      const response = await fetch('http://localhost:3001/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: listing.seller_id._id,
          content: fullMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to send message (HTTP ${response.status})`);
      }

      // const sentMessage = await response.json(); // Optional: use if needed
      setMessageInput(''); // Clear input on success
      setMessageSendSuccess(true);
      // Optionally, close modal or show persistent success message
      setTimeout(() => setMessageSendSuccess(false), 3000); // Hide success message after 3s

    } catch (error) {
      console.error("Error sending message:", error);
      setMessageSendError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // JSX for the modal content
  return (
     <div className="listing-details-modal" onClick={handleBackdropClick}>
       <div className="listing-details-content">
         <button className="modal-close" onClick={onClose}>
           <FiX />
         </button>
 
         <div className="listing-details-header">
           <div className="listing-details-user">
             {sellerProfilePicture ? (
                <img src={sellerProfilePicture} alt={sellerName} className="listing-avatar" />
             ) : (
                <div className="listing-avatar" />
             )}
             <div className="listing-user-info">
               <h3 className="listing-user-name">
                 {sellerName}
                 {listing.verified && <FiCheck className="listing-verified" />}
               </h3>
               <p className="listing-location">{listing.location}</p>
             </div>
             {/* Report Button - MOVED HERE, before price block, visible if not owner and user is logged in */}
             {!isOwner && user && (
               <button
                 onClick={() => setShowReportModal(true)}
                 className="report-listing-button"
                 title="Report this listing"
                 style={styles.reportButton} // Style object will be modified
               >
                 <FiFlag style={{ marginRight: '5px' }} /> Report Listing
               </button>
             )}
             <div className="listing-details-price">
               <div className="listing-price-label">
                 {listing.isAsk ? 'ASKING PRICE' : 'BUYING PRICE'}
               </div>
               <div className="listing-price-amount">USD {listing.price}</div>
             </div>
           </div>
         </div>
 
         <div className="listing-details-body">
           <div className="listing-photos">
             <div className="main-photo">
               <img src={photos[selectedPhoto]} alt="Product" />
             </div>
             <div className="photo-thumbnails">
               {photos.slice(0, 2).map((photo, index) => (
                 <div 
                   key={index} 
                   className={`thumbnail ${selectedPhoto === index ? 'selected' : ''}`}
                   onClick={() => setSelectedPhoto(index)}
                 >
                   <img src={photo} alt={`Thumbnail ${index + 1}`} />
                 </div>
               ))}
               <div className="more-photos">
                 <div 
                   className={`thumbnail ${selectedPhoto === 2 ? 'selected' : ''}`}
                   onClick={() => setSelectedPhoto(2)}
                 >
                   <img src={photos[2]} alt="Thumbnail 3" />
                 </div>
                 <div className="more-overlay" onClick={handleAskForPhotos}>
                   <span>ASK FOR MORE PHOTOS...</span>
                 </div>
               </div>
             </div>
           </div>
           <div className="listing-description">
             <p>{listing.description}</p>
           </div>
         </div>
 
         {/* --- Conditional Rendering: Message Box OR Delete Button --- */} 
         {isOwner ? (
           // Render Delete Button if owner
           <div className="owner-actions mt-4 clear-both"> {/* Added clear-both to handle potential float issues */} 
             <button
               className="delete-listing-button"
               onClick={() => setShowDeleteConfirm(true)}
               disabled={isDeleting}
               title="Delete Listing"
             >
               <FiTrash2 style={{ fontSize: '1.3em', marginRight: '0.5em' }} />
               {isDeleting ? 'Deleting...' : 'Delete Listing'}
             </button>
           </div>
         ) : (
           // Render Message Box if not owner
           <div className="listing-message-box">
             <div className="message-header">
               <h3>{sellerName}</h3>
               <p>Your messages will appear here.</p>
             </div>
             <div className="message-input-container">
               <input
                 type="text"
                 placeholder={`Send ${sellerName} a message...`}
                 className="message-input"
                 value={messageInput}
                 onChange={(e) => setMessageInput(e.target.value)}
               />
               <button className="offer-button">$</button>
               <button 
                 className="send-button-green"
                 onClick={handleSendMessageToListingOwner}
                 style={{ marginLeft: '0.5rem' }}
                 disabled={isSendingMessage || !messageInput.trim()}
               >
                {isSendingMessage ? <div className="loader-small" /> : <FiSend />}
               </button>
             </div>
             {messageSendError && <p className="error-message small mt-1">{messageSendError}</p>}
             {messageSendSuccess && <p className="success-message small mt-1">Message sent!</p>}
           </div>
         )}
         {/* --- End Conditional Rendering --- */} 

         <ConfirmationModal
           isVisible={showDeleteConfirm}
           message="Are you sure you want to delete this listing?"
           onConfirm={handleDeleteConfirm}
           onCancel={() => setShowDeleteConfirm(false)}
         />
         {showDeleteConfirm && deleteError && (
             <div className="confirmation-modal-popup error-display">
                <p className="error-message">{deleteError}</p>
             </div>
         )}

        {/* Report Listing Modal */}
        {showReportModal && (
          <div style={styles.reportModalOverlay}>
            <div style={styles.reportModalPopup}>
              <h3>Report Listing</h3>
              <textarea
                placeholder="Please provide a reason for reporting this listing..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                style={styles.reportTextarea}
              />
              {reportSubmitError && <p style={{ color: 'red', fontSize: '0.9em' }}>{reportSubmitError}</p>}
              {reportSubmitSuccess && <p style={{ color: 'green', fontSize: '0.9em' }}>Report submitted successfully!</p>}
              <div style={styles.reportModalActions}>
                <button onClick={() => setShowReportModal(false)} disabled={isSubmittingReport} style={styles.reportCancelButton}>
                  Cancel
                </button>
                <button onClick={handleSubmitReport} disabled={isSubmittingReport || !reportReason.trim()} style={styles.reportSubmitButton}>
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        )}
       </div>
     </div>
  );
};

// Wrapper component that handles conditional rendering
const ListingDetailsModal = ({ isOpen, onClose, listing }) => {
  if (!isOpen || !listing) return null;

  // Render the inner component only when it should be visible
  return <ListingDetailsModalInner listing={listing} onClose={onClose} />;
};

// Add styles for report button and modal (can be moved to CSS)
const styles = {
  reportButton: {
    background: 'transparent',
    border: '1px solid #ffc107',
    color: '#ffc107',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9em',
    alignSelf: 'center', // Added for vertical alignment
    margin: '0 10px', // Added horizontal margin
  },
  reportModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1050, // Higher zIndex than main modal if necessary
  },
  reportModalPopup: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  },
  reportTextarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    marginBottom: '10px',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  reportModalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '15px',
  },
  reportCancelButton: {
    padding: '8px 15px',
    border: '1px solid #6c757d',
    backgroundColor: 'transparent',
    color: '#6c757d',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  reportSubmitButton: {
    padding: '8px 15px',
    border: 'none',
    backgroundColor: '#dc3545', // Use a report-themed color
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
  }
};

export default ListingDetailsModal; 