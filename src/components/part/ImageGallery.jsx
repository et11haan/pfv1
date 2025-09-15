import { useState } from 'react';
import { useProduct } from '../../context/ProductContext';
import UploadImageModal from './UploadImageModal';
import ImageCarouselModal from './ImageCarouselModal';
import './ImageGallery.css';

// Default placeholder image
const placeholderImage = '/Adobe Express - file.png';

const ImageGallery = ({ onUploadClick }) => {
  const { product, allImages: contextAllImages, voteImage, reportImage } = useProduct();
  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const imagesToDisplay = product?.images && product.images.length > 0 
                          ? product.images 
                          : (contextAllImages && contextAllImages.length > 0 ? contextAllImages.slice(0,3) : []);
                          
  const allImagesForCarousel = contextAllImages && contextAllImages.length > 0 ? contextAllImages : imagesToDisplay;

  const hasImages = imagesToDisplay.length > 0;
  const productId = product?._id;

  const handleVote = async (imageId, event) => {
    event.stopPropagation(); // Prevent opening the carousel when clicking vote
    
    // --- Check if imageId is valid ---
    if (!imageId) {
        console.error('handleVote called with invalid imageId:', imageId);
        alert('Could not vote for image: Invalid ID.');
        return;
    }
    // --- End Check ---

    try {
      await voteImage(imageId);
    } catch (error) {
      console.error('Failed to vote for image:', error);
      alert('Failed to vote for image. Please try again later.');
    }
  };

  const handleReport = async (imageId, event) => {
    event.stopPropagation(); // Prevent opening the carousel when clicking report
    
    if (window.confirm('Are you sure you want to report this image as inappropriate?')) {
      try {
        await reportImage(imageId);
      } catch (error) {
        console.error('Failed to report image:', error);
        alert('Failed to report image. Please try again later.');
      }
    }
  };

  const openCarousel = (index) => {
    setSelectedImageIndex(index);
    setShowCarouselModal(true);
  };

  // Function to render a single image item
  const renderImageItem = (image, index, className = "", isMain = false) => {
    if (!image || !image.url) return null;
    return (
      <div 
        key={image._id || index}
        className={`gallery-item ${className}`} 
        onClick={() => openCarousel(index)}
        title="Click to view all images"
      >
        <div className="image-container">
          <img 
            src={image.url} 
            alt={`Part Image ${index + 1}`}
            className={`gallery-image ${isMain ? 'main-image' : 'thumbnail-image'}`}
          />
          <div className="image-overlay">
             {/* Show text only on hover for thumbnails or always for main? */} 
            {/* <span className="view-text">View</span> */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="image-gallery">
      {hasImages ? (
        imagesToDisplay.length === 1 ? (
          // --- Single Image Layout --- 
          <div className="gallery-single">
            {renderImageItem(imagesToDisplay[0], 0, 'single-item', true)}
          </div>
        ) : (
          // --- Multiple Images Layout (e.g., 1 main + 2 thumbs) --- 
          <div className="gallery-grid-dynamic">
            {/* Main Image (Left - 2/3 width) */} 
            <div className="main-image-wrapper">
              {renderImageItem(imagesToDisplay[0], 0, 'main-item', true)}
            </div>
            {/* Thumbnails (Right - 1/3 width, stacked) */} 
            {imagesToDisplay.length > 1 && ( 
              <div className="thumbnail-stack-wrapper">
                {renderImageItem(imagesToDisplay[1], 1, 'thumb-item')}
                {imagesToDisplay.length > 2 && (
                  renderImageItem(imagesToDisplay[2], 2, 'thumb-item')
                )}
                 {/* Optional: Add overlay/button if more than 3 images */} 
                 {imagesToDisplay.length > 3 && (
                   <div className="more-thumbs-overlay" onClick={() => openCarousel(0)}>
                     +{imagesToDisplay.length - 3} more
                   </div>
                 )} 
              </div>
            )}
          </div>
        )
      ) : (
        // --- No Images Placeholder --- 
        <div className="no-images" onClick={onUploadClick} title="Click to add first image">
          <img 
            src={placeholderImage} 
            alt="No images available for this part" 
            className="placeholder-image-file"
          />
          <div className="overlay-text">
             <p>No images yet</p> 
             <span>Click to add first image</span> 
          </div>
        </div>
      )}

      {showCarouselModal && hasImages && (
        <ImageCarouselModal 
          onClose={() => setShowCarouselModal(false)}
          initialIndex={selectedImageIndex}
          images={allImagesForCarousel}
          productId={productId}
        />
      )}
    </div>
  );
};

export default ImageGallery; 