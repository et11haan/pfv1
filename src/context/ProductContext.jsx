import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuth } from './AuthContext';

const ProductContext = createContext();

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};

// --- NEW: localStorage helper functions ---
const LOCAL_STORAGE_IMAGE_VOTES_KEY = 'partsMarketplaceImageVotes';

const getImageVotesFromStorage = () => {
  try {
    const votes = localStorage.getItem(LOCAL_STORAGE_IMAGE_VOTES_KEY);
    return votes ? JSON.parse(votes) : {};
  } catch (error) {
    console.error('Error reading image votes from localStorage:', error);
    return {};
  }
};

const setImageVoteInStorage = (imageId, vote) => { // vote: 1 for up, -1 for down, 0 for none
  try {
    const currentVotes = getImageVotesFromStorage();
    const updatedVotes = { ...currentVotes, [imageId]: vote };
    localStorage.setItem(LOCAL_STORAGE_IMAGE_VOTES_KEY, JSON.stringify(updatedVotes));
  } catch (error) {
    console.error('Error saving image vote to localStorage:', error);
  }
};
// --- END NEW ---

export const ProductProvider = ({ children }) => {
  const [product, setProduct] = useState(null);
  const [listings, setListings] = useState({ items: [], total: 0, page: 1, limit: 5, totalPages: 1 });
  const [comments, setComments] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageVotes, setImageVotes] = useState(getImageVotesFromStorage());
  const { user, token } = useAuth();
  const [priceStats, setPriceStats] = useState({ lowestAsk: null, highestBid: null });

  // --- NEW: Comment Pagination State ---
  const [commentsPage, setCommentsPage] = useState(1);
  const [totalCommentsPages, setTotalCommentsPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [lastFetchedEntityId, setLastFetchedEntityId] = useState(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  // --- END NEW ---
  // --- NEW: Listing Pagination State ---
  const [isLoadingMoreListings, setIsLoadingMoreListings] = useState(false);
  // --- END NEW ---

  useEffect(() => {
    if (product && listings.items.length > 0) {
      const asks = listings.items.filter(listing => listing.type === 'ask');
      const bids = listings.items.filter(listing => listing.type === 'bid');
      
      const lowestAsk = asks.length > 0 
        ? Math.min(...asks.map(listing => listing.price))
        : null;
      
      const highestBid = bids.length > 0
        ? Math.max(...bids.map(listing => listing.price))
        : null;

      setPriceStats({ lowestAsk, highestBid });
    }
  }, [product, listings]);

  const formatPrice = (price) => `$${price.toFixed(2)}`;
  
  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  };

  const parseMarkdown = (markdown) => {
    if (!markdown) return '';
    return DOMPurify.sanitize(marked(markdown));
  };

  const fetchProductData = useCallback(async (productIdOrSlug) => {
    setLoading(true);
    setError(null);
    // Reset states
    setProduct(null);
    setListings({ items: [], total: 0, page: 1, limit: 5, totalPages: 1 });
    setComments(null);
    setCommentsPage(1);
    setTotalCommentsPages(1);
    setTotalComments(0);
    setLastFetchedEntityId(null);
    setImageVotes(getImageVotesFromStorage());
    setIsLoadingComments(false);

    const apiUrl = `/api/products/${productIdOrSlug}`;
    console.log(`[Context] Fetching initial product data from: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[Context] Received initial product data:', data);

      setProduct(data.product);
      setListings({
        items: data.listings.items || [],
        total: data.listings.total,
        page: data.listings.page,
        limit: data.listings.limit,
        totalPages: data.listings.totalPages
      });

      // --- NEW: hydrate initial comments from product endpoint ---
      if (data.comments) {
        setComments(data.comments);
        setCommentsPage(data.comments.page || 1);
        setTotalCommentsPages(data.comments.totalPages || 1);
        setTotalComments(data.comments.total || 0);
        setLastFetchedEntityId(data.product?._id || null);
      } else {
        setComments(null);
        setCommentsPage(1);
        setTotalCommentsPages(1);
        setTotalComments(0);
        setLastFetchedEntityId(null);
      }


      if (data.product?._id) {
        const imageApiUrl = `/api/parts/${data.product._id}/images`;
        console.log(`[Context] Fetching all images from: ${imageApiUrl}`);
        try {
          const imageResponse = await fetch(imageApiUrl);
          if (!imageResponse.ok) {
            console.error(`[Context] Failed to fetch all images: ${imageResponse.status}`);
          } else {
            const imageData = await imageResponse.json();
            console.log('[Context] Received all images data:', imageData);
            setAllImages(imageData || []);
          }
        } catch (imgErr) {
            console.error('[Context] Error fetching all images:', imgErr);
        }
      }

    } catch (err) {
      console.error('[Context] Error fetching initial product data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommentsForProduct = useCallback(async (entityId, page = 1) => {
    if (!entityId) {
      console.log("[ProductContext] fetchCommentsForProduct called with no entityId. Aborting.");
      return;
    }
    // NEW: Check if we are already fetching for this entity
    if (isLoadingComments && lastFetchedEntityId === entityId) {
        console.log(`[ProductContext] Already fetching comments for ${entityId}. Aborting.`);
        return;
    }

    console.log(`[ProductContext] Fetching comments for entity: ${entityId}, page: ${page}`);
    // Distinguish between initial load and load-more for better UI signaling
    if (page > 1) {
      setIsLoadingMoreComments(true);
    } else {
      setIsLoadingComments(true);
    }
    setError(null);

    // If it's a new entity, reset comments state
    if (lastFetchedEntityId !== entityId) {
      console.log(`[ProductContext] New entity detected. Resetting comments state. Old: ${lastFetchedEntityId}, New: ${entityId}`);
      setComments(null);
      setCommentsPage(1);
      setTotalCommentsPages(1);
      setTotalComments(0);
    }
    
    setLastFetchedEntityId(entityId); // Set the entity ID we are fetching for

    try {
      // This endpoint needs to exist and handle pagination for comments
      // Assuming it's part of the product endpoint for now.
      // A more robust solution might have /api/comments?productId=... or similar
      const response = await fetch(`/api/products/${entityId}?commentsPage=${page}&commentsLimit=5`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch comments.');
      }
      const data = await response.json();
      
      console.log('[ProductContext] Received comments data:', data.comments);

      // Append comments if fetching page > 1, otherwise set them
      setComments(prevComments => {
        if (page > 1 && prevComments?.items) {
          // Append and remove duplicates
          const newItems = data.comments.items.filter(newItem => 
            !prevComments.items.some(prevItem => prevItem._id === newItem._id)
          );
          return {
            ...data.comments,
            items: [...prevComments.items, ...newItems]
          };
        }
        return data.comments; // For page 1
      });

      setCommentsPage(data.comments.page);
      setTotalCommentsPages(data.comments.totalPages);
      setTotalComments(data.comments.total);

    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      if (page > 1) {
        setIsLoadingMoreComments(false);
      } else {
        setIsLoadingComments(false);
      }
    }
  }, [isLoadingComments]);

  const fetchMoreComments = useCallback(() => {
    if (isLoadingComments || isLoadingMoreComments || !product?._id || commentsPage >= totalCommentsPages) {
      return;
    }
    // Use lastFetchedEntityId to ensure we're fetching for the correct entity
    fetchCommentsForProduct(lastFetchedEntityId, commentsPage + 1);
  }, [isLoadingComments, isLoadingMoreComments, product?._id, commentsPage, totalCommentsPages, fetchCommentsForProduct, lastFetchedEntityId]);

  const addReplyToState = (comments, newComment) => {
    console.log(`[addReplyToState] Trying to add reply ${newComment._id} to parent ${newComment.parentId}. Input comments:`, comments);

    return comments.map(comment => {
      if (comment._id === newComment.parentId) {
        console.log(`[addReplyToState] Found parent ${comment._id}, adding reply.`);
        return {
          ...comment,
          replies: [...(comment.replies || []), newComment]
        };
      } else if (comment.replies && comment.replies.length > 0) {
        console.log(`[addReplyToState] Checking replies of ${comment._id}`);
        const updatedReplies = addReplyToState(comment.replies, newComment);
        return { ...comment, replies: updatedReplies };
      }
      return comment;
    });
  };

  const updateCommentInState = (comments, commentId, updateFn) => {
    return comments.map(comment => {
      if (comment._id === commentId) {
        return updateFn(comment);
      } else if (comment.replies && comment.replies.length > 0) {
        const updatedReplies = updateCommentInState(comment.replies, commentId, updateFn);
        return { ...comment, replies: updatedReplies };
      }
      return comment;
    });
  };

  const addComment = async (entityId, entityType, user, text, parentId = null) => {
    if (!user) throw new Error("User not authenticated.");

    const body = {
      text,
      parentId,
    };

    if (entityType === 'blogPost') {
      body.blogPostId = entityId;
    } else {
      body.productId = entityId;
    }

    try {
      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post comment.');
      }
      const newComment = await response.json();
      setComments(prev => ({
        ...prev,
        items: parentId ? addReplyToState(prev.items, newComment) : [newComment, ...prev.items]
      }));
      return newComment;
    } catch (err) {
      console.error('[Context] Error adding comment:', err);
      throw err;
    }
  };

  const fetchReplies = useCallback(async (commentId) => {
    // We'll update the state to show a loading indicator for the specific comment's replies
    setComments(prev => ({
      ...prev,
      items: updateCommentInState(prev.items, commentId, c => ({ ...c, isLoadingReplies: true }))
    }));

    try {
      const response = await fetch(`/api/comments/${commentId}/replies`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch replies: ${response.status}`);
      }
      const replies = await response.json();
      
      // Update the comment in the state with the fetched replies
      setComments(prev => ({
        ...prev,
        items: updateCommentInState(prev.items, commentId, c => ({ 
          ...c, 
          replies: replies, 
          areRepliesLoaded: true, // Mark replies as loaded
          isLoadingReplies: false // Hide loading indicator
        }))
      }));
    } catch (err) {
      console.error(`[Context] Error fetching replies for comment ${commentId}:`, err);
      // Optionally handle the error state for the specific comment
      setComments(prev => ({
        ...prev,
        items: updateCommentInState(prev.items, commentId, c => ({ ...c, isLoadingReplies: false, replyError: err.message }))
      }));
    }
  }, []); // Dependencies: updateCommentInState is stable, so this is fine.

  const genericReport = useCallback(async (endpoint, itemId, reason) => {
    if (!token) throw new Error("Authentication required to report.");
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Invalid JSON response from server.' }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  }, [token]);
  
  const reportProduct = (productId, reason) => genericReport(`/api/products/${productId}/report`, productId, reason);
  const reportComment = (commentId, reason) => genericReport(`/api/comments/${commentId}/report`, commentId, reason);
  const reportListing = (listingId, reason) => genericReport(`/api/listings/${listingId}/report`, listingId, reason);
  
  const reportImage = useCallback(async (imageId, reason) => {
    if (!token) throw new Error("Authentication required to report images.");
    const response = await fetch(`/api/images/${imageId}/report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Invalid JSON response from server.' }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
  }, [token]);

  const voteComment = useCallback(async (commentId) => {
    if (!token) throw new Error("Authentication required to vote.");
    const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Invalid JSON response.' }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    const updatedComment = await response.json();
    setComments(prev => ({
        ...prev,
        items: updateCommentInState(prev.items, commentId, c => ({ ...c, votes: updatedComment.votes, upvotedBy: updatedComment.upvotedBy, downvotedBy: updatedComment.downvotedBy }))
    }));
  }, [token]);

  const downvoteComment = useCallback(async (commentId) => {
    if (!token) throw new Error("Authentication required to vote.");
    const response = await fetch(`/api/comments/${commentId}/downvote`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Invalid JSON response.' }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    const updatedComment = await response.json();
    setComments(prev => ({
        ...prev,
        items: updateCommentInState(prev.items, commentId, c => ({ ...c, votes: updatedComment.votes, upvotedBy: updatedComment.upvotedBy, downvotedBy: updatedComment.downvotedBy }))
    }));
  }, [token]);

  const deleteUserComment = useCallback(async (commentId) => {
    if (!token) throw new Error("Authentication required to delete comment.");
    await fetch(`/api/comments/${commentId}/by-user`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    setComments(prev => ({
        ...prev,
        items: updateCommentInState(prev.items, commentId, c => ({ ...c, text: '[deleted by user]', isDeleted: true }))
    }));
  }, [token]);

  // --- NEW: Function to clear product data ---
  const clearProductData = useCallback(() => {
    setProduct(null);
    setComments(null);
    setCommentsPage(1);
    setTotalCommentsPages(1);
    setTotalComments(0);
    setLastFetchedEntityId(null); // <-- NEW: Reset this as well
    setIsLoading(false);
    setError(null);
    console.log('[ProductContext] Cleared product and comments data.');
  }, []);

  const value = {
    product,
    listings,
    comments,
    allImages,
    loading,
    error,
    imageVotes,
    priceStats,
    fetchProductData,
    fetchCommentsForProduct,
    fetchMoreComments,
    fetchReplies,
    addComment,
    reportProduct,
    reportComment,
    reportListing,
    reportImage,
    voteComment,
    downvoteComment,
    deleteUserComment,
    formatPrice,
    truncateText,
    parseMarkdown,
    commentsPage,
    totalCommentsPages,
    isLoadingComments,
    isLoadingMoreComments,
    isLoadingMoreListings,
    clearProductData,
    totalComments,
  };

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}; 