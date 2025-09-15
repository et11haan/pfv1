import { useState, useRef, useEffect } from 'react';
import { useProduct } from '../../context/ProductContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiEdit2 } from 'react-icons/fi';
import EditDescriptionModal from './EditDescriptionModal';
import SuccessConfirmationModal from './SuccessConfirmationModal';
import EditHistoryModal from './EditHistoryModal';
import './PartDescription.css';

const PartDescription = ({ descriptionHtml }) => {
  const { product, updateProduct } = useProduct();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Add effect to log when the success modal state changes
  useEffect(() => {
    console.log("[PartDescription] Success modal state changed to:", isSuccessModalOpen);
    if (isSuccessModalOpen) {
      console.log("[PartDescription] Success modal should be visible now");
    }
  }, [isSuccessModalOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      const computedStyle = window.getComputedStyle(contentRef.current);
      const lineHeight = parseInt(computedStyle.lineHeight);
      const maxHeight = lineHeight * 6; // Max height for 6 lines
      const currentScrollHeight = contentRef.current.scrollHeight;
      const shouldTruncate = currentScrollHeight > maxHeight;
      
      if (isTruncated !== shouldTruncate) {
          setIsTruncated(shouldTruncate);
      }
    }
  }, [descriptionHtml, isExpanded, isTruncated]);

  const handleSaveDescription = async (formData) => {
    if (!product || !product._id) {
      console.error("[PartDescription] Product ID is missing, cannot save.");
      // TODO: Show user-friendly error message
      return;
    }

    console.log("[PartDescription] Starting save description process...");
    try {
      // Clean and validate part numbers before sending
      const cleanedPartNumbers = formData.partNumbers
        .map(pn => {
          if (typeof pn === 'object' && pn !== null && typeof pn.number === 'string') {
            const number = pn.number.trim();
            const link = typeof pn.link === 'string' ? pn.link.trim() : undefined;
            if (number) {
              return { number, ...(link && { link }) };
            }
          }
          return null;
        })
        .filter(Boolean);

      console.log("[PartDescription] Cleaned part numbers:", cleanedPartNumbers);

      // Prepare the data for the API
      const updateData = {
        title: formData.title,
        description_markdown: formData.description,
        tags: formData.tags,
        part_numbers: cleanedPartNumbers,
        editorUsername: formData.editorUsername // Use the username passed from the modal
      };

      console.log("[PartDescription] Calling context updateProduct with ID:", product._id, "and data:", updateData);

      // --- CHANGE: Call the context function directly --- 
      // Pass the actual productId and the updateData object
      const updatedProductResult = await updateProduct(product._id, updateData);
      // updateProduct already handles the API call and updates context state
      // It throws an error if the API call fails, which will be caught below.

      console.log("[PartDescription] Context updateProduct successful:", updatedProductResult);

      // Close edit modal and show success modal
      setIsEditModalOpen(false);
      console.log("[PartDescription] Edit modal closed, about to show success modal");
      console.log("[PartDescription] Current success modal state before update:", isSuccessModalOpen);
      
      // Force the state update to be recognized by React
      setTimeout(() => {
        setIsSuccessModalOpen(true);
        console.log("[PartDescription] Success modal state set to true in setTimeout");
      }, 10);
      
    } catch (error) {
      console.error('[PartDescription] Error calling updateProduct:', error);
      // Display error to the user (e.g., using a state variable and displaying it in the modal or page)
      alert(`Failed to update product: ${error.message}`); // Simple alert for now
    }
  };

  return (
    <div className="description-container">
      <h2>Part Description</h2>

      <div 
        ref={contentRef}
        className={`description-content ${isExpanded ? 'expanded' : ''}`}
      >
        <div className="markdown-content">
          {product?.description_markdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {product.description_markdown}
            </ReactMarkdown>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: descriptionHtml || 'Loading description...' }} />
          )}
        </div>
      </div>

      <div className="description-footer">
        {(isTruncated || isExpanded) && (
          <button 
            className="show-more-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        <div className="credits-section">
          <div className="credits-button">
            Description Credits
          </div>
          <div className="credits-content">
            {product ? (
              <>
                <p>
                  Part created by {product.created_by || 'Unknown User'}
                </p>
                {product.last_edited_by ? (
                  <p>
                    Last edited by {product.last_edited_by} on {formatDate(product.updated_at)}
                  </p>
                ) : (
                  <p style={{ fontStyle: 'italic', color: '#666' }}>
                    Parts without edit history can have inaccurate information.
                  </p>
                )}
              </>
            ) : (
              <p>Loading credit information...</p>
            )}
            <div className="credits-actions">
              <button onClick={() => setIsHistoryModalOpen(true)} disabled={!product}> 
                View edits 
              </button> 
              <button
                onClick={() => setIsEditModalOpen(true)}
                disabled={!product}
              >
                <FiEdit2 />
                Edit Description
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditDescriptionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveDescription}
      />

      <SuccessConfirmationModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Changes Submitted"
        message="Your updates to the part description have been saved."
      />

      <EditHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        creator={product?.created_by}
        initialDescription={product?.initial_description_markdown || ''}
        history={product?.edit_history || []}
      />
    </div>
  );
};

export default PartDescription; 