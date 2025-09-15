import { useState, useEffect } from 'react';
import { useProduct } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import UploadImageModal from './UploadImageModal';
import './Modal.css';
import './ImageCarouselModal.css';

// Default placeholder image
const placeholderImage = '/Adobe Express - file.png';

const ImageCarouselModal = ({ onClose, initialIndex = 0 }) => {
  const {
    product,
    allImages,
    voteImage,
    reportImage,
    downvoteImage,
    addImage,
    imageVotes
  } = useProduct();
  const { user } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const images = allImages || [];
  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[currentIndex] : null;
  const currentImageId = currentImage?._id;
  const userVote = currentImageId ? imageVotes[currentImageId] || 0 : 0;
  
  useEffect(() => {
    if (!loading && hasImages && currentIndex >= images.length) {
      setCurrentIndex(images.length > 0 ? images.length - 1 : 0);
    }
    if (!loading && !hasImages && allImages.length === 0 && product?.images?.length === 0) {
        onClose();
    }
  }, [images, currentIndex, hasImages, loading, onClose, allImages, product]);

  const handleNext = () => {
    if (!hasImages) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePrevious = () => {
    if (!hasImages) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  const handleAddImageClick = () => {
    setShowUploadModal(true);
  };

  const handleVote = async () => {
    if (!currentImageId) return;
    setLoading(true);
    setError('');
    try {
      await voteImage(currentImageId);
    } catch (err) {
      console.error('Error up-voting for image:', err);
      setError(`Failed to vote: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (!currentImageId) return;
    setLoading(true);
    setError('');
    try {
      await downvoteImage(currentImageId);
    } catch (err) {
      console.error('Error down-voting for image:', err);
      setError(`Failed to downvote: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!currentImageId) return;
    
    if (window.confirm('Are you sure you want to report this image as inappropriate?')) {
      setLoading(true);
      setError('');
      
      try {
        await reportImage(currentImageId);
      } catch (err) {
        console.error('Error reporting image:', err);
        setError(`Failed to report this image: ${err.message}`);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showUploadModal) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, hasImages, showUploadModal]);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content carousel-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Part Images</h2>
            <div className="modal-header-actions">
              {user && (
                <button 
                  className="upload-image-button"
                  onClick={handleAddImageClick}
                >
                  Add Image
                </button>
              )}
              <button className="close-button" onClick={onClose}>&times;</button>
            </div>
          </div>
          
          <div className="modal-body">
            {hasImages ? (
              <>
                {/* --- Top Actions Bar (Report Button Only) --- */}
                <div className="carousel-top-actions">
                   {/* Keep this div for alignment, or remove if only report button remains */}
                   <div className="vote-container-placeholder" /> 

                  {user && (
                    <button 
                      className="report-button active-report"
                      onClick={handleReport}
                      disabled={loading}
                      title="Report image as inappropriate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                       <span className="report-button-text">Report</span>
                    </button>
                  )}
                </div>
                {/* --- END Top Actions Bar --- */}

                {/* --- Main Carousel Area (Votes + Image + Nav) --- */} 
                <div className="carousel-main-area"> 
                  {/* Vote Controls (Left Side) */} 
                  <div className="carousel-side-votes">
                      <button 
                        className={`vote-button up ${userVote === 1 ? 'active-up' : ''}`}
                        onClick={handleVote}
                        disabled={loading || !user}
                        aria-label="Upvote"
                        title={!user ? "Log in to vote" : (userVote === 1 ? "Remove upvote" : "Upvote Image")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                          <path d="M12 4l8 8h-6v8h-4v-8H4l8-8z"/>
                        </svg>
                      </button>
                      <span className="vote-count" title={`Votes: ${currentImage?.votes || 0}`}>{currentImage?.votes || 0}</span>
                      <button 
                        className={`vote-button down ${userVote === -1 ? 'active-down' : ''}`}
                        onClick={handleDownvote}
                        disabled={loading || !user}
                        aria-label="Downvote"
                        title={!user ? "Log in to vote" : (userVote === -1 ? "Remove downvote" : "Downvote Image")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                          <path d="M12 20l-8-8h6V4h4v8h6l-8 8z"/>
                        </svg>
                      </button>
                  </div>

                  {/* Image and Nav Buttons */} 
                  <div className="carousel-container"> 
                    <button 
                      className="carousel-nav-button prev" 
                      onClick={handlePrevious}
                      disabled={loading || images.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                    
                    <div className="carousel-image-container">
                      {currentImage ? (
                        <img 
                          key={currentImageId}
                          src={currentImage.url} 
                          alt={`${product?.title || 'Part'} - Image ${currentIndex + 1}`}
                          className="carousel-image"
                        />
                      ) : (
                        <div className="no-images-message">Loading image...</div>
                      )}
                    </div>
                    
                    <button 
                      className="carousel-nav-button next" 
                      onClick={handleNext}
                      disabled={loading || images.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
                {/* --- END Main Carousel Area --- */}
                
                <div className="carousel-info">
                  <span className="carousel-counter">
                    Image {currentIndex + 1} of {images.length}
                  </span>
                  <span className="carousel-uploader">
                    Uploaded by: {currentImage?.uploader || 'Unknown'}
                  </span>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                {images.length > 1 && (
                  <div className="carousel-thumbnails">
                    {images.map((image, index) => (
                      <div 
                        key={image._id}
                        className={`carousel-thumbnail ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => handleThumbnailClick(index)}
                      >
                        <img 
                          src={image.url} 
                          alt={`Thumbnail ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-images-message">
                <img 
                  src={placeholderImage} 
                  alt="No images available" 
                  className="placeholder-image-file carousel-placeholder"
                />
                <p>No images available for this part yet.</p>
                <button 
                   className="upload-image-button"
                   onClick={handleAddImageClick}
                   style={{ marginTop: '15px'}}
                 >
                   Add First Image
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showUploadModal && (
        <UploadImageModal onClose={() => setShowUploadModal(false)} />
      )}
    </>
  );
};

export default ImageCarouselModal; 