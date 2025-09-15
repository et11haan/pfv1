import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBlog } from '../context/BlogContext';
import Comments from '../components/comments/Comments';
import './BlogPostPage.css';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blogPost, comments, loading, error, fetchBlogPost, postComment, voteBlogPost, downvoteBlogPost } = useBlog();
  const [showComments, setShowComments] = useState(false);
  const commentsRef = useRef(null);

  useEffect(() => {
    if (slug) {
      fetchBlogPost(slug);
    }
  }, [slug, fetchBlogPost]);

  // Intersection Observer to lazy load comments
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShowComments(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    if (commentsRef.current) {
      observer.observe(commentsRef.current);
    }

    return () => {
      if (commentsRef.current) {
        observer.unobserve(commentsRef.current);
      }
    };
  }, [loading]); // Rerun when loading completes and ref is available

  if (loading && !blogPost) return <div className="loading-container">Loading...</div>;
  if (error) return <div className="error-container">Error: {error}</div>;
  if (!blogPost) return <div className="not-found-container">Blog post not found.</div>;

  const isAuthor = user && user.id === blogPost.author_id?._id;
  const postDate = new Date(blogPost.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine the current user's vote on this post
  const userVote = user && blogPost.upvotedBy?.includes(user.id) ? 1
                 : user && blogPost.downvotedBy?.includes(user.id) ? -1
                 : 0;

  const handleVote = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) voteBlogPost(blogPost._id);
  };

  const handleDownvote = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) downvoteBlogPost(blogPost._id);
  };

  const handlePostComment = async (text, parentId) => {
    await postComment(blogPost._id, text, parentId);
  };

  return (
    <div className="blog-post-page">
      <div className="blog-page-main">
        <div className="blog-votes">
          <button
            className={`vote-button up ${userVote === 1 ? 'active-up' : ''}`}
            onClick={handleVote}
            disabled={!user}
            aria-label="Upvote Post"
            title={userVote === 1 ? 'Remove upvote' : 'Upvote'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.707 7.707a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0l3 3a.75.75 0 11-1.06 1.06L10 5.81V13.5a.75.75 0 01-1.5 0V5.81L6.767 7.707a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg>
          </button>
          <span className="vote-count" title={`Votes: ${blogPost.votes ?? 0}`}>{blogPost.votes ?? 0}</span>
          <button
            className={`vote-button down ${userVote === -1 ? 'active-down' : ''}`}
            onClick={handleDownvote}
            disabled={!user}
            aria-label="Downvote Post"
            title={userVote === -1 ? 'Remove downvote' : 'Downvote'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.75a.75.75 0 011.5 0v10.5A.75.75 0 0110 17zM14.293 12.293a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06L10 14.19l2.233-2.233a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="blog-post-container">
          <h1 className="blog-post-title">{blogPost.title}</h1>
          <div className="blog-post-meta">
            <div className="author-info">
              <img 
                src={blogPost.author_id?.profilePicture || '/default-profile.png'} 
                alt={blogPost.author_id?.name} 
                className="author-avatar"
              />
              <span>By <Link to={`/account/${blogPost.author_id?._id}`} className="author-link">{blogPost.author_id?.name || 'Unknown'}</Link> on {postDate}</span>
            </div>
            {isAuthor && (
              <button onClick={() => navigate(`/blog/edit/${blogPost.slug}`)} className="edit-post-button">
                Edit Post
              </button>
            )}
          </div>
          
          <div className="blog-post-tags">
            {blogPost.tags?.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
          
          <div 
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: blogPost.content_full_html }} 
          />
        </div>
      </div>

      <div className="blog-comments-section" ref={commentsRef}>
        {showComments ? (
          <Comments
            entityId={blogPost._id}
            entityType="blogPost"
            initialComments={comments?.items || []}
            total={comments?.total || 0}
            onComment={handlePostComment}
            onReport={null}
            onVote={null}
            onDownvote={null}
            onFetchMore={null}
            onFetchReplies={null}
            isLoading={loading}
            isLoadingMore={false}
            page={comments?.page || 1}
            totalPages={comments?.totalPages || 1}
          />
        ) : (
          !loading && <div className="comments-placeholder">Loading comments...</div>
        )}
      </div>
    </div>
  );
};

export default BlogPostPage; 