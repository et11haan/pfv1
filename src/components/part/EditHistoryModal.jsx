import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Diff from 'diff';
import { useProduct } from '../../context/ProductContext';
import './EditHistoryModal.css';

// Helper function to render markdown content
const MarkdownContent = ({ content }) => (
  <ReactMarkdown 
    remarkPlugins={[remarkGfm]}
    components={{
      // Ensure tables are rendered with proper styling
      table: ({node, ...props}) => (
        <table className="markdown-table" {...props} />
      ),
      // Style table headers
      th: ({node, ...props}) => (
        <th className="markdown-th" {...props} />
      ),
      // Style table cells
      td: ({node, ...props}) => (
        <td className="markdown-td" {...props} />
      ),
      // Ensure code blocks are properly formatted
      code: ({node, inline, ...props}) => (
        inline ? 
          <code className="markdown-inline-code" {...props} /> :
          <code className="markdown-code-block" {...props} />
      )
    }}
  >
    {content || '*No content available.*'}
  </ReactMarkdown>
);

const renderDiff = (oldText, newText) => {
  if (!oldText && !newText) {
    return <div className="diff-line line-unchanged">No content to compare</div>;
  }

  const changes = Diff.diffLines(oldText || '', newText || '', { newlineIsToken: true });

  return changes.map((part, index) => {
    const className = part.added ? 'line-added' : part.removed ? 'line-removed' : 'line-unchanged';
    // Remove trailing newline from part.value for cleaner rendering within the div
    const lineContent = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;

    // For added/removed lines, always render, even if empty (show placeholder for empty lines)
    if ((part.added || part.removed) && !lineContent) {
      return (
        <div key={index} className={`diff-line ${className}`}>
          <span style={{ opacity: 0.7, fontStyle: 'italic' }}>(empty line)</span>
        </div>
      );
    }

    // For unchanged lines, skip rendering if empty
    if (!lineContent && !part.added && !part.removed) {
      return null;
    }

    return (
      <div key={index} className={`diff-line ${className}`}>
        <MarkdownContent content={lineContent} />
      </div>
    );
  });
};

const EditHistoryModal = ({ isOpen, onClose, creator, initialDescription = '', history = [] }) => {
  const { product } = useProduct();
  const [currentVersionMarkdown, setCurrentVersionMarkdown] = useState('');
  const [reportingEditIndex, setReportingEditIndex] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportingCurrent, setReportingCurrent] = useState(false);

  useEffect(() => {
    // When the modal opens and product is available, update the current version markdown
    if (isOpen && product && product.description_markdown) {
      console.log('Setting current version markdown:', product.description_markdown);
      setCurrentVersionMarkdown(product.description_markdown);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen) {
      console.log('EditHistoryModal opened with:', {
        creator,
        initialDescription,
        historyLength: history.length,
        history,
        currentVersionMarkdown
      });
    }
  }, [isOpen, creator, initialDescription, history, currentVersionMarkdown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Sort history in reverse chronological order (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // --- Report Description Edit Handler ---
  const handleOpenReport = (index) => {
    setReportingEditIndex(index);
    setReportReason('');
    setReportError('');
  };
  const handleCloseReport = () => {
    setReportingEditIndex(null);
    setReportReason('');
    setReportError('');
  };
  const handleSubmitReport = () => {
    if (!reportReason.trim()) {
      setReportError('Please provide a reason for reporting.');
      return;
    }
    // TODO: Implement actual report logic (API call, context, etc.)
    alert('Report submitted for this description edit. Reason: ' + reportReason);
    handleCloseReport();
  };

  // --- Report Current Description Handler ---
  const handleOpenReportCurrent = () => {
    setReportingCurrent(true);
    setReportReason('');
    setReportError('');
  };
  const handleCloseReportCurrent = () => {
    setReportingCurrent(false);
    setReportReason('');
    setReportError('');
  };
  const handleSubmitReportCurrent = () => {
    if (!reportReason.trim()) {
      setReportError('Please provide a reason for reporting.');
      return;
    }
    // TODO: Implement actual report logic (API call, context, etc.)
    alert('Report submitted for the current description. Reason: ' + reportReason);
    handleCloseReportCurrent();
  };

  return (
    <div className="history-modal-backdrop" onClick={handleBackdropClick}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h3 className="history-modal-title">Edit History</h3>
          <button className="history-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="history-modal-body">
          <div className="history-legend">
            <span className="legend-item added">Added Line</span>
            <span className="legend-item removed">Removed Line</span>
          </div>

          {/* Current Version Section */}
          <div className="current-version">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="current-version-title">Current Version</h4>
              <button
                className="report-button description-report-button"
                title="Report current description as inappropriate"
                onClick={handleOpenReportCurrent}
                aria-label="Report current description"
                style={{ marginLeft: '1rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="report-button-text">Report</span>
              </button>
            </div>
            {sortedHistory.length > 0 && (
              <div className="current-version-meta">
                <p>
                  <strong>Last Edited By:</strong> {sortedHistory[0].user || 'Unknown User'}
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(sortedHistory[0].timestamp)}
                </p>
              </div>
            )}
            <div className="current-version-content">
              <MarkdownContent content={currentVersionMarkdown} />
            </div>
            {/* Report Reason Modal for Current Version */}
            {reportingCurrent && (
              <div className="report-modal-backdrop" onClick={handleCloseReportCurrent}>
                <div className="report-modal" onClick={e => e.stopPropagation()}>
                  <h4>Report Current Description</h4>
                  <label htmlFor="report-reason-current">Reason for reporting:</label>
                  <textarea
                    id="report-reason-current"
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Please explain why you are reporting this description..."
                    rows={4}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  />
                  {reportError && <div className="report-error">{reportError}</div>}
                  <div className="report-actions">
                    <button className="history-cancel-button" onClick={handleCloseReportCurrent}>Cancel</button>
                    <button className="report-button description-report-button" style={{ fontWeight: 600, whiteSpace: 'nowrap' }} onClick={handleSubmitReportCurrent}>Submit Report</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Edit History - Newest First */}
          {sortedHistory.length > 0 ? (
            sortedHistory.map((edit, index) => {
              // Get the previous version's text for diff
              const nextText = index === sortedHistory.length - 1 
                ? initialDescription 
                : sortedHistory[index + 1].description_markdown;
              const currentText = edit.description_markdown;

              return (
                <div key={index} className="history-entry">
                  <div className="history-user" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p><strong>Edited By:</strong> {edit.user || 'Unknown User'}</p>
                      <p><strong>Date:</strong> {formatDate(edit.timestamp)}</p>
                    </div>
                    <button
                      className="report-button description-report-button"
                      title="Report this description edit as inappropriate"
                      onClick={() => handleOpenReport(index)}
                      aria-label="Report description edit"
                      style={{ marginLeft: '1rem' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="report-button-text">Report</span>
                    </button>
                  </div>
                  <div className="history-diff">
                    <div className="markdown-content">
                      {renderDiff(nextText, currentText)}
                    </div>
                  </div>
                  {/* Report Reason Modal */}
                  {reportingEditIndex === index && (
                    <div className="report-modal-backdrop" onClick={handleCloseReport}>
                      <div className="report-modal" onClick={e => e.stopPropagation()}>
                        <h4>Report Description Edit</h4>
                        <label htmlFor="report-reason">Reason for reporting:</label>
                        <textarea
                          id="report-reason"
                          value={reportReason}
                          onChange={e => setReportReason(e.target.value)}
                          placeholder="Please explain why you are reporting this edit..."
                          rows={4}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        />
                        {reportError && <div className="report-error">{reportError}</div>}
                        <div className="report-actions">
                          <button className="history-cancel-button" onClick={handleCloseReport}>Cancel</button>
                          <button className="report-button description-report-button" style={{ fontWeight: 600, whiteSpace: 'nowrap' }} onClick={handleSubmitReport}>Submit Report</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            !creator && (
              <div className="history-empty">
                <p>No edit history available for this part.</p>
              </div>
            )
          )}

          {/* Initial Version - Show Last */}
          {creator && (
            <div className="history-entry">
              <div className="history-user">
                <p><strong>Created By:</strong> {creator}</p>
                <p><strong>Initial Version</strong></p>
              </div>
              <div className="history-diff">
                <div className="markdown-content">
                  <MarkdownContent content={initialDescription} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="history-modal-footer">
          <button className="history-cancel-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditHistoryModal; 