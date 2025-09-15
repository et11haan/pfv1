import React, { useState, useEffect, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import CommentInput from './CommentInput';
import CommentList from './CommentList';

/**
 * Comment component for displaying a single comment or reply, including voting, reply, and reporting functionality.
 * Supports nested replies, vote state, and user info display.
 * Used in the Comments section of a product page.
 *
 * Props:
 * @param {object} comment - The comment object (with user, votes, replies, etc)
 * @param {function} voteComment - Function to upvote a comment
 * @param {function} downvoteComment - Function to downvote a comment
 * @param {string|null} replyingTo - ID of the comment currently being replied to
 * @param {function} setReplyingTo - Setter for replyingTo state
 * @param {function} onReplySubmit - Handler for submitting a reply
 * @param {boolean} isReply - Whether this comment is a reply (affects UI)
 * @param {function} handleReportComment - Handler for reporting a comment
 * @param {object} user - The current logged-in user
 * @param {function} fetchReplies - Function to fetch replies for this comment
 * @param {object} ref - React ref for the comment element
 */
const Comment = forwardRef(({
  comment,
  voteComment,
  downvoteComment,
  replyingTo,
  setReplyingTo,
  onReplySubmit,
  isReply = false,
  handleReportComment,
  user,
  fetchReplies
}, ref) => {
  console.log('[Comment Debug] User:', comment.user);
  console.log('[Comment Debug] Created At:', comment.createdAt);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [areRepliesVisible, setAreRepliesVisible] = useState(true);

  const userVote = user && comment.upvotedBy?.includes(user.id) ? 1
                   : user && comment.downvotedBy?.includes(user.id) ? -1
                   : 0;
                   
  const hasReplies = (comment.replyCount !== undefined && comment.replyCount > 0) || (comment.replies && comment.replies.length > 0);
  const numReplies = comment.replyCount ?? comment.replies?.length ?? 0;
  const areRepliesLoaded = comment.replies !== undefined;

  const userName = typeof comment.user === 'object' ? comment.user?.name : comment.user;
  const userProfilePicture = typeof comment.user === 'object' ? comment.user?.profilePicture : undefined;

  const handleUpvote = (e) => {
    e.stopPropagation();
    if (user) voteComment(comment._id);
  };

  const handleDownvote = (e) => {
    e.stopPropagation();
    if (user) downvoteComment(comment._id);
  };

  const handleReplySubmit = (content) => {
    onReplySubmit(content, comment._id);
    setReplyingTo(null);
  };

  const toggleRepliesVisibility = () => {
    const newVisibility = !areRepliesVisible;
    setAreRepliesVisible(newVisibility);
    if (newVisibility && !areRepliesLoaded && comment.replyCount > 0) {
      fetchReplies(comment._id);
    }
  };

  const toggleCollapse = (e) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
        if (!areRepliesVisible) {
            toggleRepliesVisibility();
        }
    }
  };

  let formattedTimestamp = 'Unknown Date';
  const dateValue = comment.createdAt || comment.timestamp;
  if (dateValue) {
    const dateObj = new Date(dateValue);
    if (!isNaN(dateObj.getTime())) {
      formattedTimestamp = dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  // --- Corrected Effect: Fetch replies when appropriate --- 
  useEffect(() => {
    // If replies should be visible, are not loaded yet, and the backend indicates there are replies
    if (areRepliesVisible && !areRepliesLoaded && comment.replyCount > 0) {
      // Check if we are already loading to prevent redundant calls
      if (!comment.isLoadingReplies) { 
          console.log(`[Comment Effect ${comment._id}] Triggering fetchReplies. Visible: ${areRepliesVisible}, Loaded: ${areRepliesLoaded}, Count: ${comment.replyCount}`);
          fetchReplies(comment._id);
      } else {
          console.log(`[Comment Effect ${comment._id}] Skipping fetchReplies, already loading. Visible: ${areRepliesVisible}, Loaded: ${areRepliesLoaded}, Count: ${comment.replyCount}`);
      }
    } else {
        // Log why we are not fetching
        if(comment.replyCount <= 0) console.log(`[Comment Effect ${comment._id}] Not fetching: No replies indicated (Count: ${comment.replyCount})`);
        else if(!areRepliesVisible) console.log(`[Comment Effect ${comment._id}] Not fetching: Replies not visible`);
        else if(areRepliesLoaded) console.log(`[Comment Effect ${comment._id}] Not fetching: Replies already loaded`);
    }
    // Dependencies that determine *if* and *what* to fetch, and the loading state itself
  }, [areRepliesVisible, areRepliesLoaded, comment.replyCount, comment._id, comment.isLoadingReplies]);

  return (
    <div ref={ref} className={`comment-container ${isReply ? 'comment-reply' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {isReply && !isCollapsed && (
          <div 
              className="collapse-line"
              onClick={toggleCollapse}
              title="Collapse thread"
            />
      )}
      
      {isReply && isCollapsed && (
          <button 
            className="expand-button"
            onClick={toggleCollapse}
            title="Expand thread"
          >
             [+]
          </button>
      )}
      
      <div className="comment-votes">
        <button 
          className={`vote-button up ${userVote === 1 ? 'active-up' : ''}`}
          onClick={handleUpvote}
          disabled={!user}
          aria-label="Upvote comment"
          title={userVote === 1 ? "Remove upvote" : "Upvote"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.707 7.707a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0l3 3a.75.75 0 11-1.06 1.06L10 5.81V13.5a.75.75 0 01-1.5 0V5.81L6.767 7.707a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg>
        </button>
        <span className="vote-count" title={`Votes: ${comment.votes ?? 0}`}>{comment.votes ?? 0}</span>
        <button 
          className={`vote-button down ${userVote === -1 ? 'active-down' : ''}`}
          onClick={handleDownvote}
          disabled={!user}
          aria-label="Downvote comment"
          title={userVote === -1 ? "Remove downvote" : "Downvote"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.75a.75.75 0 011.5 0v10.5A.75.75 0 0110 17zM14.293 12.293a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06L10 14.19l2.233-2.233a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="comment-content">
          <div className="comment-header">
             <div className="comment-header-left">
                <img
                  src={userProfilePicture || '/default-profile.png'}
                  alt={userName || 'Anonymous'}
                  className="comment-avatar"
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    // If the primary src fails (even if it's a valid-looking but broken Google URL)
                    // and it's not already the default, set it to default.
                    // Construct the full URL for default-profile.png for comparison
                    const defaultProfileUrl = window.location.origin + '/default-profile.png';
                    if (e.target.src !== defaultProfileUrl) {
                      e.target.onerror = null; // Prevent infinite loop if default also fails
                      e.target.src = '/default-profile.png';
                    }
                  }}
                />
                {comment.user && typeof comment.user === 'object' && comment.user._id ? (
                  <Link to={`/account/${comment.user._id}`} className="comment-author-link">
                    <span className="comment-author">{userName || 'Anonymous'}</span>
                  </Link>
                ) : (
                  <span className="comment-author">{userName || 'Anonymous'}</span>
                )}
                <span className="comment-timestamp">{formattedTimestamp}</span>
             </div>
            <button
                className="report-button comment-report-button"
                title="Report comment as inappropriate"
                onClick={() => handleReportComment(comment._id)}
                aria-label="Report comment"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="report-button-text">Report</span>
              </button>
          </div>

          <p className="comment-text">{comment.text || comment.content}</p>
          
          <div className="comment-actions">
            <button 
              className="reply-button"
              onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
            >
              Reply
            </button>
            {hasReplies && (
              <button 
                className="toggle-replies-button"
                onClick={toggleRepliesVisibility} 
                disabled={comment.isLoadingReplies}
              >
                {comment.isLoadingReplies 
                  ? 'Loading...' 
                  : areRepliesVisible ? `Hide Replies (${numReplies})` : `Show Replies (${numReplies})`
                }
              </button>
            )}
          </div>

          {replyingTo === comment._id && (
            <div className="reply-input-container">
              <CommentInput 
                onSubmit={handleReplySubmit}
                placeholder="Write a reply..."
                user={user}
              />
            </div>
          )}

          {areRepliesVisible && comment.errorLoadingReplies && 
            <div className="comment-error-message">{comment.errorLoadingReplies}</div>
          }
          {areRepliesVisible && areRepliesLoaded && comment.replies && comment.replies.length > 0 && (
            <div className="comment-replies">
                {comment.replies.map(reply => (
                  <Comment
                    key={reply._id}
                    comment={reply}
                    voteComment={voteComment}
                    downvoteComment={downvoteComment}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    onReplySubmit={onReplySubmit}
                    isReply={true}
                    handleReportComment={handleReportComment}
                    user={user}
                    fetchReplies={fetchReplies}
                  />
                ))}
            </div>
          )}
        </div>
       )}
    </div>
  );
});

export default Comment; 