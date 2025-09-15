import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import PartHeader from './PartHeader';
import ImageGallery from './ImageGallery';
import PartDescription from './PartDescription';
import PriceSection from './PriceSection';
import Comments from '../comments/Comments';
import UploadImageModal from './UploadImageModal';
import AddListingModal from './AddListingModal';
import './PartPage.css';

const PartPage = () => {
  const { productIdOrSlug } = useParams();
  const { 
    product, 
    listings, 
    loading, 
    error, 
    fetchProductData, 
    fetchCommentsForProduct, 
    comments,
    totalComments, 
    addComment,
    reportComment,
    voteComment,
    isLoadingMoreComments,
    fetchMoreComments,
    priceStats,
    downvoteComment,
    fetchReplies,
    isLoadingComments,
    commentsPage,
    totalCommentsPages
  } = useProduct();
  const { user } = useAuth(); // Get user from AuthContext
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  
  // --- NEW: Intersection Observer for Lazy Loading Comments ---
  const commentsRef = useRef(null);

  useEffect(() => {
    // Only set up the observer if we have a product and comments have not been fetched yet.
    if (product && !comments) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // When the sentinel comes into view and comments haven't been loaded yet
          if (entry.isIntersecting) {
            console.log('[PartPage] Comments section is visible, fetching comments...');
            fetchCommentsForProduct(productIdOrSlug);
            observer.disconnect(); // Disconnect after fetching
          }
        },
        {
          rootMargin: '200px', // Fetch comments when user is 200px away from the section
        }
      );

      if (commentsRef.current) {
        observer.observe(commentsRef.current);
      }

      return () => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      };
    }
  }, [product, comments, fetchCommentsForProduct, productIdOrSlug]);
  // --- END NEW ---

  useEffect(() => {
    if (productIdOrSlug) {
      fetchProductData(productIdOrSlug);
    }
  }, [fetchProductData, productIdOrSlug]);

  const handlePostComment = async (text, parentId) => {
    if (!user) {
      // Handle not logged in case, e.g., show a modal
      console.log("User must be logged in to comment.");
      return;
    }
    // Call the addComment function from the context
    await addComment(product._id, 'product', user, text, parentId);
    // After commenting, refetch the first page to show the new comment at the top
    fetchCommentsForProduct(product._id, 1);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>No product found for {productIdOrSlug}</div>;

  // Calculate lowest ask and highest bid from listings.items
  const { lowestAsk, highestBid } = priceStats;

  // Format part numbers for PartHeader - create objects with number and link properties
  const formattedPartNumbers = product.part_numbers ? 
    product.part_numbers.map(partNum => {
      // Check if it's already an object with a number and link
      if (typeof partNum === 'object' && partNum.number) {
        return partNum;
      }
      // If it's just a string, create an object with no link
      return { number: partNum, link: '' };
    }) : [];

  return (
    <div className="main-content">
      <PartHeader 
        title={product.title}
        partNumbers={formattedPartNumbers}
        tags={product.tags || []}
      />
      <div className="content-and-price">
        <div className="content-container">
          <div className="image-and-description">
            <ImageGallery onUploadClick={() => setShowUploadModal(true)} />
            <PartDescription descriptionHtml={product.description_full_html} />
          </div>
        </div>
        <div className="price-section-wrapper">
          <PriceSection 
            lowestAsk={lowestAsk}
            highestBid={highestBid}
            onAddListing={() => setShowAddListingModal(true)}
          />
        </div>
      </div>
      <div ref={commentsRef}>
        {/* Show placeholder only before the first fetch attempt */}
        {!comments && !isLoadingComments ? (
          <div className="comments-placeholder">
            <p>Scroll down to load comments...</p>
          </div>
        ) : (
          /* Render Comments component if we have comments, are loading them, or have an empty result */
          <Comments
            entityId={product._id}
            entityType="product"
            initialComments={comments?.items}
            total={totalComments}
            onComment={handlePostComment}
            onReport={reportComment}
            onVote={voteComment}
            onDownvote={downvoteComment}
            onFetchMore={fetchMoreComments}
            onFetchReplies={fetchReplies}
            isLoading={isLoadingComments}
            isLoadingMore={isLoadingMoreComments}
            page={commentsPage}
            totalPages={totalCommentsPages}
          />
        )}
      </div>
      {showUploadModal && (
        <UploadImageModal onClose={() => setShowUploadModal(false)} />
      )}
      {showAddListingModal && (
        <AddListingModal
          isOpen={showAddListingModal}
          onClose={() => setShowAddListingModal(false)}
        />
      )}
    </div>
  );
};

export default PartPage; 