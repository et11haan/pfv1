import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import ImageGallery from '../components/part/ImageGallery';
import PartHeader from '../components/part/PartHeader';
import PartDescription from '../components/part/PartDescription';
import PricingSection from '../components/part/PricingSection';
import Comments from '../components/comments/Comments';
import AddListingModal from '../components/part/AddListingModal';
import './PartPage.css'; // Main layout CSS

const ProductPage = () => {
  const { productIdOrSlug } = useParams();
  const {
    product,
    comments,
    fetchProductData,
    fetchMoreComments,
    addComment,
    voteComment,
    downvoteComment,
    fetchReplies,
    isLoading,
    error,
    isLoadingComments,
    isLoadingMoreComments,
    commentsPage,
    totalCommentsPages,
  } = useProduct();
  const { user } = useAuth();
  const [isAddListingModalOpen, setAddListingModalOpen] = useState(false);

  useEffect(() => {
    if (productIdOrSlug) {
      fetchProductData(productIdOrSlug);
    }
  }, [productIdOrSlug, fetchProductData]);

  const handleAddListing = () => {
    if (!user) {
      // Handle user not logged in case
      alert('Please log in to add a listing.');
      return;
    }
    setAddListingModalOpen(true);
  };

  const handlePostComment = async (text, parentId) => {
    if (!product?._id) return;
    await addComment(product._id, text, parentId);
  };

  if (isLoading) return <div className="loading-indicator">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!product) return <div>Product not found.</div>;

  return (
    <>
      <div className="part-page-container">
        <div className="main-content">
          <PartHeader
            title={product.title}
            tags={product.tags}
            onAddListing={handleAddListing}
          />
          <div className="content-body">
            <div className="left-column">
              <ImageGallery
                images={product.images}
                productId={product._id}
              />
              <PartDescription descriptionHtml={product.description_full_html} />
            </div>
            <div className="right-column">
              <PricingSection
                lowestAsk={product.lowest_ask}
                highestBid={product.highest_bid}
              />
            </div>
          </div>
          <div className="comments-container">
            <Comments
              entityId={product._id}
              entityType="product"
              initialComments={comments?.items}
              total={comments?.total}
              onComment={handlePostComment}
              onVote={voteComment}
              onDownvote={downvoteComment}
              onFetchReplies={fetchReplies}
              onFetchMore={() => fetchMoreComments(product._id)}
              isLoading={isLoadingComments}
              isLoadingMore={isLoadingMoreComments}
              page={commentsPage}
              totalPages={totalCommentsPages}
            />
          </div>
        </div>
      </div>
      {isAddListingModalOpen && (
        <AddListingModal
          productId={product._id}
          onClose={() => setAddListingModalOpen(false)}
        />
      )}
    </>
  );
};

export default ProductPage; 