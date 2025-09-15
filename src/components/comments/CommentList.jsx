import Comment from './Comment';

/**
 * CommentList component for rendering a list of Comment components.
 * Handles passing voting, reply, and reporting handlers to each comment.
 * Supports infinite scroll by forwarding ref to the last comment.
 *
 * Props:
 * @param {Array} comments - Array of comment objects
 * @param {function} voteComment - Function to upvote a comment
 * @param {function} downvoteComment - Function to downvote a comment
 * @param {string|null} replyingTo - ID of the comment currently being replied to
 * @param {function} setReplyingTo - Setter for replyingTo state
 * @param {function} onReplySubmit - Handler for submitting a reply
 * @param {function} handleReportComment - Handler for reporting a comment
 * @param {object} user - The current logged-in user
 * @param {function} fetchReplies - Function to fetch replies for a comment
 * @param {object} lastCommentRef - Ref for the last comment (for infinite scroll)
 */
const CommentList = ({ 
  comments, 
  voteComment,
  downvoteComment,
  replyingTo, 
  setReplyingTo, 
  onReplySubmit,
  handleReportComment,
  user,
  fetchReplies,
  lastCommentRef
}) => {
  return (
    <div className="comment-list">
      {Array.isArray(comments) && comments.map((comment, index) => {
        const isLastElement = index === comments.length - 1;
        return (
          <Comment 
            key={comment._id} 
            ref={isLastElement ? lastCommentRef : null}
            comment={comment}
            voteComment={voteComment}
            downvoteComment={downvoteComment}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            onReplySubmit={onReplySubmit}
            handleReportComment={handleReportComment}
            user={user}
            fetchReplies={fetchReplies}
          />
        );
      })}
    </div>
  );
};

export default CommentList; 