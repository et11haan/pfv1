import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBlog } from '../context/BlogContext';
import './CreateEditBlogPostPage.css'; // Import the new CSS

const CreateEditBlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createBlogPost, updateBlogPost, fetchBlogPost, blogPost, loading: blogLoading, error } = useBlog();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]); // Changed to array
  const [currentTag, setCurrentTag] = useState(''); // State for the input field
  const contentRef = useRef(null); // Ref for the content textarea

  const isEditing = Boolean(slug);

  useEffect(() => {
    if (isEditing) {
      fetchBlogPost(slug);
    }
  }, [isEditing, slug, fetchBlogPost]);

  useEffect(() => {
    if (isEditing && blogPost) {
      // Security check: ensure the current user is the author
      if (user && blogPost.author_id._id === user.id) {
        setTitle(blogPost.title);
        setContent(blogPost.content_markdown);
        setTags(blogPost.tags || []); // Ensure tags is an array
      } else if (!authLoading && !blogLoading) {
        // If not the author, redirect away
        navigate('/');
      }
    }
  }, [isEditing, blogPost, user, authLoading, blogLoading, navigate]);

  const handleAddTag = () => {
    const newTag = currentTag.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setCurrentTag(''); // Clear input field
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      handleAddTag();
    }
  };

  const insertMarkdown = (syntaxStart, syntaxEnd = syntaxStart) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    let newText;
    let cursorPos = start + syntaxStart.length;

    if (selectedText) {
      newText = `${beforeText}${syntaxStart}${selectedText}${syntaxEnd}${afterText}`;
      cursorPos = end + syntaxStart.length + syntaxEnd.length;
    } else {
      newText = `${beforeText}${syntaxStart}${syntaxEnd}${afterText}`;
    }

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const insertTable = () => {
    const rows = parseInt(prompt("Enter number of table rows (including header):", "3"), 10);
    const cols = parseInt(prompt("Enter number of table columns:", "2"), 10);

    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
      alert("Invalid table dimensions.");
      return;
    }

    let table = '\\n';
    table += '| ' + Array(cols).fill('Header').join(' | ') + ' |\\n';
    table += '| ' + Array(cols).fill('------').join(' | ') + ' |\\n';
    for (let r = 1; r < rows; r++) {
      table += '| ' + Array(cols).fill('Cell').join(' | ') + ' |\\n';
    }
    table += '\\n';

    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + table + content.substring(textarea.selectionEnd);
    const cursorPos = start + table.length;

    setContent(newText);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const postData = {
      title,
      content,
      tags: tags,
    };

    try {
      let savedPost;
      if (isEditing) {
        const updateData = {
          title,
          content,
          tags,
        };
        savedPost = await updateBlogPost(blogPost._id, updateData);
      } else {
        savedPost = await createBlogPost(postData);
      }
      navigate(`/blog/${savedPost.slug}`);
    } catch (err) {
      // Error is already set in context, just log it
      console.error("Failed to save post:", err);
    }
  };

  if (authLoading || (isEditing && blogLoading)) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="create-edit-page-container">
      <h1>{isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tags">Tags</label>
          <div className="tags-list">
            {tags.map((tag, index) => (
              <div key={index} className="tag">
                {tag}
                <button type="button" className="remove-tag" onClick={() => handleRemoveTag(tag)}>
                  &times;
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            id="tags"
            className="tag-input"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag and press Enter"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content (Markdown supported)</label>
          <div className="markdown-toolbar">
              <button type="button" className="markdown-button" onClick={() => insertMarkdown('**')}>Bold</button>
              <button type="button" className="markdown-button" onClick={() => insertMarkdown('*')}>Italic</button>
              <button type="button" className="markdown-button" onClick={() => insertMarkdown('[', '](url)')}>Link</button>
              <button type="button" className="markdown-button" onClick={() => insertMarkdown('\\n- ', '')}>List Item</button>
              <button type="button" className="markdown-button" onClick={() => insertMarkdown('\\n1. ', '')}>Numbered List</button>
              <button type="button" className="markdown-button" onClick={insertTable}>Table</button>
          </div>
          <textarea
            id="content"
            ref={contentRef}
            className="content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows="15"
          ></textarea>
        </div>
        
        {error && <p className="error-message">Error: {error}</p>}
        
        <button type="submit" disabled={blogLoading} className="submit-button">
          {blogLoading ? 'Saving...' : (isEditing ? 'Update Post' : 'Publish Post')}
        </button>
      </form>
    </div>
  );
};

export default CreateEditBlogPostPage; 