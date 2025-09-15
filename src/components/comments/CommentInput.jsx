import { useState } from 'react';

/**
 * CommentInput component for submitting a new comment or reply.
 * Displays user avatar and a textarea for input.
 *
 * Props:
 * @param {function} onSubmit - Handler for submitting the comment text
 * @param {string} placeholder - Placeholder text for the textarea
 * @param {object} user - The current logged-in user (for avatar)
 */
const CommentInput = ({ onSubmit, placeholder = "Type here to reply", user }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (comment.trim()) {
      onSubmit(comment);
      setComment('');
    }
  };

  const profilePicture = user?.profilePicture;
  const userName = user?.name || 'Anonymous';

  return (
    <div className="comment-input-container">
      {profilePicture ? (
        <img
          src={profilePicture}
          alt={userName}
          className="comment-avatar"
          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div className="avatar-placeholder"></div>
      )}
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={placeholder}
          className="comment-textarea"
        />
        <button 
          type="submit" 
          className="post-comment-button"
          disabled={!comment.trim()}
        >
          Post Comment
        </button>
      </form>
    </div>
  );
};

export default CommentInput; 