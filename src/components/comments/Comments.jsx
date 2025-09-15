import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import CommentInput from './CommentInput';
import CommentList from './CommentList';
import './styles.css';

/**
 * Comments component for displaying and managing all comments for a product.
 * Handles adding new comments, voting, reporting, infinite scroll, and error display.
 * Uses ProductContext for state and actions.
 */

// Helper function to count all comments including replies
const countTotalComments = (comments) => {
  let count = 0;
  if (!Array.isArray(comments)) {
    return 0;
  }
  comments.forEach(comment => {
    count += 1; // Count the comment itself
    if (comment.replies && comment.replies.length > 0) {
      count += countTotalComments(comment.replies); // Recursively count replies
    }
  });
  return count;
};

const Comments = ({ 
  entityId, 
  entityType, 
  initialComments, 
  total, 
  onComment, 
  onReport, 
  onVote, 
  onDownvote,
  onFetchMore, 
  onFetchReplies,
  isLoading,
  isLoadingMore,
  page,
  totalPages
}) => {
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const displayComments = initialComments || [];

  const observer = useRef();
  const lastCommentElementRef = useCallback(node => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page < totalPages) {
        if (onFetchMore) onFetchMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, onFetchMore, page, totalPages]);

  const handleNewComment = async (text, parentId = null) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setError(null);
    try {
      if (onComment) {
        await onComment(text, parentId);
        setReplyingTo(null); // Close reply box on success
      } else {
        throw new Error("onComment handler is not provided.");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      setError(err.message || "Failed to post comment.");
    }
  };

  // --- Report Comment Handler ---
  const handleReportComment = async (commentId) => {
    if (!user) {
      alert('You must be logged in to report a comment.');
      return;
    }

    const reason = prompt('Please provide a reason for reporting this comment (5-1000 characters):');
    if (!reason) {
      alert('Report cancelled. A reason is required.');
      return;
    }
    if (reason.trim().length < 5 || reason.trim().length > 1000) {
      alert('Invalid reason. Must be between 5 and 1000 characters.');
      return;
    }

    if (window.confirm(`Are you sure you want to report this comment for the following reason?\n\n"${reason}"`)) {
      try {
        const token = localStorage.getItem('authToken'); // Or get from AuthContext if available
        if (!token) {
          alert('Authentication error. Please log in again.');
          return;
        }

        const response = await fetch(`/api/comments/${commentId}/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: reason.trim() }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || `Failed to report comment (HTTP ${response.status})`);
        }

        alert('Comment reported successfully. Our team will review it shortly.');
        // Optionally, you might want to update UI state here if needed

      } catch (err) {
        console.error("Error reporting comment:", err);
        alert(`Failed to report comment: ${err.message}`);
      }
    }
  };

  // Calculate total comment count
  const totalCommentCount = useCallback(() => {
      return countTotalComments(displayComments);
  }, [displayComments]);

  return (
    <div className="comments-section">
      <div className="comments-header">
        <h2>Comments ({total || 0})</h2>
      </div>
      {error && 
        <div className="comment-error-message">
            {error}
        </div>
      }
      <CommentInput onSubmit={handleNewComment} user={user} />
      
      {isLoading && <div className="loading-indicator">Loading comments...</div>}

      {!isLoading && displayComments.length === 0 &&
        <div className="no-comments">Be the first to comment!</div>
      }

      {!isLoading && displayComments.length > 0 && (
        <CommentList 
          comments={displayComments}
          voteComment={onVote}
          downvoteComment={onDownvote}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          onReplySubmit={handleNewComment}
          handleReportComment={onReport}
          user={user}
          fetchReplies={onFetchReplies}
          lastCommentRef={lastCommentElementRef}
        />
      )}

      {isLoadingMore && <div className="loading-indicator">Loading more comments...</div>}

      {!isLoadingMore && !isLoading && page >= totalPages && displayComments.length > 0 &&
        <div className="end-of-comments">No more comments.</div>
      }
    </div>
  );
};

export default Comments; 