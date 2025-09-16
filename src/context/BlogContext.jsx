import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext'; // To get the token for authenticated requests
import axios from 'axios';

const BlogContext = createContext();

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error('useBlog must be used within a BlogProvider');
  }
  return context;
};

export const BlogProvider = ({ children }) => {
  const { token } = useAuth();
  const [blogPost, setBlogPost] = useState(null);
  const [commentsData, setCommentsData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, [token]);

  const fetchBlogPost = useCallback(async (slug) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/blog-posts/${slug}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch blog post.');
      }
      const data = await response.json();
      setBlogPost(data);
      setCommentsData(data.comments || { items: [], total: 0, page: 1, totalPages: 1 });
      return data;
    } catch (err) {
      setError(err.message);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getHeaders, token]);

  const createBlogPost = useCallback(async (postData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/blog-posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(postData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create blog post.');
      }
      const newPost = await response.json();
      return newPost;
    } catch (err) {
      setError(err.message);
      console.error(err);
      throw err; // Re-throw to be caught in the component
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const updateBlogPost = useCallback(async (postId, postData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/blog-posts/${postId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(postData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update blog post.');
      }
      const updatedPost = await response.json();
      setBlogPost(updatedPost); // Update state if viewing this post
      return updatedPost;
    } catch (err) {
      setError(err.message);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);
  
  const postComment = useCallback(async (blogPostId, text, parentId = null) => {
    if (!token) throw new Error("Authentication required to comment.");
    try {
      const response = await fetch(`${API_URL}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          blogPostId,
          text,
          parentId
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to post comment.');
      }
      const newComment = await response.json();
      // Refetch post to get all comments updated
      fetchBlogPost(blogPost.slug); 
      return newComment;
    } catch (err) {
      console.error('Error posting blog comment:', err);
      throw err;
    }
  }, [getHeaders, token, fetchBlogPost, blogPost?.slug]);

  const voteBlogPost = async (postId) => {
    try {
      const res = await axios.put(`${API_URL}/blog-posts/${postId}/vote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update state if the voted post is the one currently in view
      if (blogPost && blogPost._id === postId) {
        setBlogPost(res.data);
      }
    } catch (err) {
      console.error("Error voting for blog post:", err);
      // Handle error display if needed
    }
  };

  const downvoteBlogPost = async (postId) => {
    try {
      const res = await axios.put(`${API_URL}/blog-posts/${postId}/downvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update state if the voted post is the one currently in view
      if (blogPost && blogPost._id === postId) {
        setBlogPost(res.data);
      }
    } catch (err) {
      console.error("Error downvoting for blog post:", err);
      // Handle error display if needed
    }
  };

  // You would also add delete, report, and comment functions here

  const value = {
    blogPost,
    comments: commentsData,
    loading,
    error,
    fetchBlogPost,
    createBlogPost,
    updateBlogPost,
    postComment,
    voteBlogPost,
    downvoteBlogPost,
  };

  return (
    <BlogContext.Provider value={value}>
      {children}
    </BlogContext.Provider>
  );
}; 