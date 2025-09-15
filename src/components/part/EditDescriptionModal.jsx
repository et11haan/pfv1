import { useState, useEffect, useRef } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useProduct } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import './EditDescriptionModal.css';

const EditDescriptionModal = ({ isOpen, onClose, onSave }) => {
  const { product } = useProduct();
  const { user } = useAuth();
  const textareaRef = useRef(null); // Ref for textarea
  const [formData, setFormData] = useState({
    title: '',
    description: '', // Will hold markdown
    tags: [],
    partNumbers: []
  });
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistorySection, setActiveHistorySection] = useState('');
  const [newTag, setNewTag] = useState({ text: '', isNonOE: false });
  const [newPartNumber, setNewPartNumber] = useState({ 
    number: '', 
    link: ''
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      console.log('[EditModal] Product received:', product); // Log the raw product
      // Prioritize markdown description
      let initialDescription = product.description_markdown || product.description_full_html || '';
      console.log('[EditModal] Initial description (before trim):', initialDescription); // Log before trimming

      // Trim leading <p> and trailing </p> tags
      if (initialDescription.startsWith('<p>')) {
        initialDescription = initialDescription.substring(3);
      }
      if (initialDescription.endsWith('</p>')) {
        initialDescription = initialDescription.substring(0, initialDescription.length - 4);
      }
      // Trim any potential whitespace left after trimming
      initialDescription = initialDescription.trim();
      console.log('[EditModal] Final description for state:', initialDescription); // Log after trimming

      // Map part numbers from array of strings to array of objects (if needed)
      const formattedPartNumbers = product.part_numbers?.map(partNum => {
        // Check if it's already an object with number and link properties
        if (typeof partNum === 'object' && partNum.number) {
          return partNum;
        }
        // If it's a string, create an object with just a number
        return { number: partNum, link: '' };
      }) || [];

      setFormData({
        title: product.title || '',
        description: initialDescription, // Use the processed description
        tags: product.tags || [],
        partNumbers: formattedPartNumbers
      });
    }
  }, [product]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    onSave({ ...formData, editorUsername: user.name });
    onClose();
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleAddTag = () => {
    if (newTag.text.trim()) {
      const tagText = newTag.isNonOE ? `Non-OE: ${newTag.text.trim()}` : newTag.text.trim();
      if (!formData.tags.includes(tagText)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagText]
        });
        setNewTag({ text: '', isNonOE: false });
      }
    }
  };

  const handleAddPartNumber = () => {
    if (newPartNumber.number.trim()) { // Link is optional now?
      setFormData({
        ...formData,
        partNumbers: [...formData.partNumbers, { 
          number: newPartNumber.number.trim(),
          link: newPartNumber.link.trim() // Keep link if entered
        }]
      });
      setNewPartNumber({ number: '', link: '' });
    }
  };

  const handleViewHistory = (section) => {
    setActiveHistorySection(section);
    setShowHistory(true);
  };

  // --- Markdown Helper Functions (Adapted from Step4Description) ---
  const insertMarkdown = (syntaxStart, syntaxEnd = syntaxStart) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);
    const beforeText = formData.description.substring(0, start);
    const afterText = formData.description.substring(end);

    let newText;
    let cursorPos = start + syntaxStart.length;

    if (selectedText) {
      newText = `${beforeText}${syntaxStart}${selectedText}${syntaxEnd}${afterText}`;
      cursorPos = end + syntaxStart.length + syntaxEnd.length;
    } else {
      newText = `${beforeText}${syntaxStart}${syntaxEnd}${afterText}`;
    }

    // Update state directly
    handleInputChange('description', newText);

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

    let table = '\n';
    table += '| ' + Array(cols).fill('Header').join(' | ') + ' |\n';
    table += '| ' + Array(cols).fill('------').join(' | ') + ' |\n';
    for (let r = 1; r < rows; r++) {
      table += '| ' + Array(cols).fill('Cell').join(' | ') + ' |\n';
    }
    table += '\n';

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = formData.description.substring(0, start) + table + formData.description.substring(textarea.selectionEnd);
    const cursorPos = start + table.length;

    handleInputChange('description', newText);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };
  // --- End Markdown Helper Functions ---

  // Truncate URL to show only first 10 characters
  const truncateUrl = (url) => {
    if (!url) return '';
    // Extract domain if it's a URL
    try {
      const domain = new URL(url).hostname;
      return domain.length > 10 ? domain.substring(0, 10) + '...' : domain;
    } catch (e) {
      // If not a valid URL, just truncate the string
      return url.length > 10 ? url.substring(0, 10) + '...' : url;
    }
  };

  const renderEditHistory = () => (
    <div className="history-list">
      <div className="history-item">
        <div className="history-meta">
          <span>Edited by <a href="#">jfrankel55</a> • 2 days ago</span>
          <span>Version 3</span>
        </div>
        <div className="history-change">
          Added information about transmission fluid capacity and weight.
        </div>
      </div>
      <div className="history-item">
        <div className="history-meta">
          <span>Edited by <a href="#">sampoehl</a> • 5 days ago</span>
          <span>Version 2</span>
        </div>
        <div className="history-change">
          Updated torque specifications and added compatibility information.
        </div>
      </div>
      <div className="history-item">
        <div className="history-meta">
          <span>Created by <a href="#">et.haan</a> • 1 week ago</span>
          <span>Version 1</span>
        </div>
        <div className="history-change">
          Initial description created with basic specifications.
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="large-modal">
        <div className="modal-header">
          <h3 className="listing-title">Edit Part Information</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="title-section">
            <h1 className="part-main-title">{product?.title || 'Edit Part'}</h1>
            <div className="title-description">
              <p>
                Correct errors, inform others, and build a database for enthusiasts.
                You are required to be logged in to edit. Your contributions will be
                attached to your account.
              </p>
            </div>
          </div>

          <div className="description-section">
            <h2 className="section-title">Description</h2>
            <p className="help-text">
              Write the part description using markdown. Edit the text below or use the helper buttons.
            </p>

            {/* Markdown Toolbar */}
            <div className="markdown-toolbar">
              <button type="button" className="button markdown-button" onClick={() => insertMarkdown('**')}>Bold</button>
              <button type="button" className="button markdown-button" onClick={() => insertMarkdown('*')}>Italic</button>
              <button type="button" className="button markdown-button" onClick={() => insertMarkdown('[', '](url)')}>Link</button>
              <button type="button" className="button markdown-button" onClick={() => insertMarkdown('\n- ', '')}>List Item</button>
               <button type="button" className="button markdown-button" onClick={() => insertMarkdown('\n1. ', '')}>Numbered List</button>
              <button type="button" className="button markdown-button" onClick={insertTable}>Table</button>
            </div>
            
            <div className="markdown-editor">
              <div className="editor-container">
                <textarea
                  ref={textareaRef} // Add ref
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter description in markdown..."
                  className="markdown-textarea"
                />
              </div>
              
              <div className="preview-container">
                <h3 className="preview-title">Preview</h3>
                <div className="markdown-preview">
                  {/* Use ReactMarkdown with the markdown description from formData */}
                  {console.log('[EditModal] Rendering preview with description:', formData.description)} {/* Log before rendering */}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.description}</ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="history-link-container">
              <a href="#" className="history-link" onClick={(e) => {
                e.preventDefault();
                setActiveHistorySection('description');
                setShowHistory(true);
              }}>
                View Edit History
              </a>
            </div>
          </div>

          <div className="modal-grid">
            <div className="tags-column">
              <h2 className="section-title">Item Tags</h2>
              <p className="help-text">
                Tags involve things such as the chassis, what sort of part it is, and other quick, searchable information important to the buyer.
              </p>
              
              <div className="tags-list">
                {formData.tags.map((tag, index) => {
                  const isNonOE = tag.startsWith('Non-OE:');
                  return (
                    <span 
                      key={index} 
                      className={`tag ${isNonOE ? 'tag-non-oe' : ''}`}
                    >
                      {tag}
                      <button 
                        className="remove-tag"
                        onClick={() => setFormData({
                          ...formData,
                          tags: formData.tags.filter((_, i) => i !== index)
                        })}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <div className="add-tag-form">
                  <input
                    type="text"
                    value={newTag.text}
                    onChange={(e) => setNewTag({ ...newTag, text: e.target.value })}
                    placeholder="Enter new tag"
                    className="tag-input"
                  />
                  <label className="non-oe-checkbox">
                    <input
                      type="checkbox"
                      checked={newTag.isNonOE}
                      onChange={(e) => setNewTag({ ...newTag, isNonOE: e.target.checked })}
                    />
                    Non OE Solution
                  </label>
                  <button className="add-button" onClick={handleAddTag}>Add Tag</button>
                </div>
              </div>
              
              <div className="history-link-container">
                <a href="#" className="history-link" onClick={(e) => {
                  e.preventDefault();
                  setActiveHistorySection('tags');
                  setShowHistory(true);
                }}>
                  View Edit History
                </a>
              </div>
            </div>
            
            <div className="part-numbers-column">
              <h2 className="section-title">Part Numbers</h2>
              <p className="help-text">
                There may be multiple part numbers for a given part. You can list the source of the part number here as well.
              </p>
              
              <div className="part-numbers-container">
                {formData.partNumbers.map((part, index) => (
                  <div key={index} className="part-number-entry">
                    <div className="number">{part.number}</div>
                    {part.link && (
                      <a 
                        href={part.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="part-link"
                      >
                        {truncateUrl(part.link)}
                      </a>
                    )}
                    <button 
                      className="remove-part"
                      onClick={() => setFormData({
                        ...formData,
                        partNumbers: formData.partNumbers.filter((_, i) => i !== index)
                      })}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="add-part-form">
                  <input
                    type="text"
                    value={newPartNumber.number}
                    onChange={(e) => setNewPartNumber({ ...newPartNumber, number: e.target.value })}
                    placeholder="Part number"
                    className="part-input"
                    required
                  />
                  <input
                    type="text"
                    value={newPartNumber.link}
                    onChange={(e) => setNewPartNumber({ ...newPartNumber, link: e.target.value })}
                    placeholder="Link (Optional)"
                    className="part-input"
                  />
                  <button 
                    className="add-button" 
                    onClick={handleAddPartNumber}
                    disabled={!newPartNumber.number.trim()}
                  >
                    Add Part
                  </button>
                </div>
              </div>
              
              <div className="history-link-container">
                <a href="#" className="history-link" onClick={(e) => {
                  e.preventDefault();
                  setActiveHistorySection('partNumbers');
                  setShowHistory(true);
                }}>
                  View Edit History
                </a>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`save-button${!user ? ' visually-disabled' : ''}`}
            >
              Save
            </button>
          </div>
        </div>
        {/* Login Required Modal */}
        {showLoginModal && (
          <div className="login-modal-overlay">
            <div className="login-modal-popup">
              <h3>Login Required</h3>
              <p>You must be logged in to edit the description. Please log in and try again.</p>
              <button className="close-btn" onClick={() => setShowLoginModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditDescriptionModal; 