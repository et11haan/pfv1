import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminActionModal from './AdminActionModal';
// import './NewReportsView.css'; // Create this for styling

const NewReportsView = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const { token } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentActionType, setCurrentActionType] = useState(null);
  const fetchReports = useCallback(async (currentPage, currentSortBy, currentContentType) => {
    if (!token) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        status: 'open',
        page: currentPage,
        limit: 10, // Or make this configurable
        sortBy: currentSortBy,
      });
      if (currentContentType) {
        params.append('contentType', currentContentType);
      }

      const response = await fetch(`/api/admin/reports?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to fetch reports (HTTP ${response.status})`);
      }
      const data = await response.json();
      setReports(prevReports => currentPage === 1 ? data.reports : [...prevReports, ...data.reports]);
      setTotalPages(data.totalPages);
      setPage(currentPage); // Update current page state

    } catch (err) {
      console.error("Error fetching new reports:", err);
      setFetchError(err.message);
      setReports([]); // Clear reports on error
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports(1, sortBy, contentTypeFilter); // Fetch on initial load or when sort/filter changes
  }, [fetchReports, sortBy, contentTypeFilter]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchReports(page + 1, sortBy, contentTypeFilter);
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1); // Reset to first page on sort change
    // useEffect will trigger fetchReports
  };

  const handleFilterChange = (e) => {
    setContentTypeFilter(e.target.value);
    setPage(1); // Reset to first page on filter change
    // useEffect will trigger fetchReports
  };
  
  const handleTakeAction = async (reportId, actionType, reason, muteDuration) => {
    console.log('[NewReportsView] handleTakeAction received actionType:', actionType, 'Report ID:', reportId);
    if (!selectedReport) {
      console.error('[NewReportsView] handleTakeAction called without selectedReport.');
      setActionError('No report selected for action.');
      return;
    }
    // Ensure reportId from params matches selectedReport, defensive check
    if (reportId !== selectedReport._id) {
        console.error('[NewReportsView] handleTakeAction reportId mismatch.');
        setActionError('Report ID mismatch. Please try again.');
        return;
    }

    setActionError(null);
    setIsLoading(true); // Use a specific loading state for actions if preferred, here using general isLoading

    let url = '';
    let method = 'POST';
    let body = {};

    switch (actionType) {
      case 'resolve_no_action': // This is for "Dismiss Report"
        url = `/api/admin/reports/${reportId}/status`;
        method = 'PATCH';
        body = { status: 'dismissed', adminNotes: reason }; // Or 'resolved_no_action'
        break;
      case 'delete_item':
        url = `/api/admin/reports/${reportId}/action/delete-item`;
        method = 'POST';
        body = { adminReason: reason };
        break;
      case 'delete_item_mute_user':
        url = `/api/admin/reports/${reportId}/action/delete-item-mute-user`;
        method = 'POST';
        body = { adminReason: reason, muteDurationDays: muteDuration };
        break;
      default:
        setActionError('Unknown action type selected.');
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${actionType}`);
      }

      // Successfully processed action
      setReports(prevReports => prevReports.filter(r => r._id !== reportId)); // Remove report from list
      setIsModalOpen(false);
      setSelectedReport(null);
      // Optionally: show a success message

    } catch (err) {
      console.error(`Error taking action ${actionType} on report ${reportId}:`, err);
      setActionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false); // General loading state
    }
  };

  // Placeholder for action handlers
  const handleIgnoreReport = (reportId) => console.log(`Ignoring report ${reportId}`);
  const handleDeleteReport = (reportId) => console.log(`Deleting content for report ${reportId}`);
  const handleDeleteAndMute = (reportId) => console.log(`Deleting & Muting for report ${reportId}`);


  return (
    <div className="new-reports-view">
      <h3 style={{ marginBottom: '20px' }}>New Reports</h3>
      
      <div className="filters-and-sort" style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div>
          <label htmlFor="sortBy" style={{ marginRight: '8px' }}>Sort By: </label>
          <select id="sortBy" value={sortBy} onChange={handleSortChange} style={{ padding: '8px', borderRadius: '4px' }}>
            <option value="createdAt">Date Reported</option>
            <option value="reportCount">Most Reported</option>
          </select>
        </div>
        <div>
          <label htmlFor="contentTypeFilter" style={{ marginRight: '8px' }}>Filter by Type: </label>
          <select id="contentTypeFilter" value={contentTypeFilter} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px' }}>
            <option value="">All Types</option>
            <option value="Comment">Comments</option>
            <option value="Listing">Listings</option>
            <option value="Image">Images</option>
          </select>
        </div>
      </div>

      {isLoading && reports.length === 0 && <p>Loading reports...</p>}
      {fetchError && <p style={{ color: 'red' }}>Error: {fetchError}</p>}
      {!isLoading && !fetchError && reports.length === 0 && <p>No new reports found.</p>}

      {reports.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {reports.map(report => (
            <li key={report._id} style={styles.reportItem}>
              <h4>Report ID: {report._id}</h4>
              <p><strong>Type:</strong> {report.reportedItemRef}</p>
              <p><strong>Reported Item ID:</strong> <a href="#" onClick={(e) => { e.preventDefault(); setSelectedReport(report); console.log("Reported item clicked:", report.reportedItem); }}>{report.reportedItemId}</a></p>
              <p><strong>Reason:</strong> {report.reason}</p>
              <p><strong>Status:</strong> {report.status}</p>
              <p><strong>Reported By:</strong> {report.reporterId?.name || 'Unknown User'} ({report.reporterId?.email || 'N/A'})</p>
              <p><strong>Reported At:</strong> {new Date(report.createdAt).toLocaleString()}</p>
              
              {report.reportedItem ? (
                <div style={styles.reportedContentPreview}>
                  <strong>Reported Content Preview:</strong>
                  {report.reportedItemRef === 'Comment' && <p><em>Comment:</em> "{report.reportedItem.text?.substring(0, 100) + (report.reportedItem.text?.length > 100 ? '...' : '')}" by {report.reportedItem.user?.name || 'User N/A'}</p>}
                  {report.reportedItemRef === 'Listing' && <p><em>Listing:</em> "{report.reportedItem.description?.substring(0, 100) + (report.reportedItem.description?.length > 100 ? '...' : '')}" by {report.reportedItem.seller_id?.name || 'Seller N/A'}</p>}
                  {report.reportedItemRef === 'Image' && <div><em>Image:</em> <img src={report.reportedItem.url} alt="Reported content" style={{maxWidth: '100px', maxHeight: '100px', display: 'block'}} /> <p>(Uploader: {report.reportedItem.uploader || 'N/A'})</p></div>}
                  {report.reportedItemRef === 'User' && <p><em>User Profile:</em> {report.reportedItem.name} ({report.reportedItem.email})</p>}
                </div>
              ) : report.reportedItemSnapshot ? (
                 <div style={styles.reportedContentPreview}>
                    <strong>Reported Item Snapshot:</strong>
                    <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{JSON.stringify(report.reportedItemSnapshot, null, 2)}</pre>
                 </div>
              ) : (
                <p><em>(Reported item data not available or item may have been deleted)</em></p>
              )}

              <div style={styles.actionsContainer}>
                <button 
                  onClick={() => {
                    setSelectedReport(report);
                    const newActionType = 'resolve_no_action';
                    setCurrentActionType(newActionType);
                    console.log('[NewReportsView] Dismiss Report button clicked, currentActionType set to:', newActionType);
                    setIsModalOpen(true);
                  }} 
                  style={{...styles.actionButton, ...styles.ignoreButton}}
                  title="Mark as resolved with no further action taken on the content or user."
                >
                  Dismiss Report
                </button>
                <button 
                  onClick={() => {
                    setSelectedReport(report);
                    const newActionType = 'delete_item';
                    setCurrentActionType(newActionType);
                    console.log('[NewReportsView] Delete Content button clicked, currentActionType set to:', newActionType);
                    setIsModalOpen(true);
                  }} 
                  style={{...styles.actionButton, ...styles.deleteButton}}
                  disabled={!report.reportedItem}
                  title="Delete the reported content and mark report as resolved."
                >
                  Delete Content
                </button>
                <button 
                  onClick={() => {
                    setSelectedReport(report);
                    const newActionType = 'delete_item_mute_user';
                    setCurrentActionType(newActionType);
                    console.log('[NewReportsView] Delete & Mute button clicked, currentActionType set to:', newActionType);
                    setIsModalOpen(true);
                  }} 
                  style={{...styles.actionButton, ...styles.muteButton}}
                  disabled={!report.reportedItem}
                  title="Delete content, mute the user who posted it, and mark report as resolved."
                >
                  Delete & Mute User
                </button>
              </div>
              {actionError && selectedReport?._id === report._id && <p style={{color: 'red', marginTop: '10px'}}>{actionError}</p>}
            </li>
          ))}
        </ul>
      )}

      {reports.length > 0 && page < totalPages && !isLoading && (
        <button onClick={handleLoadMore} style={styles.loadMoreButton}>
          Load More Reports
        </button>
      )}
      {isLoading && reports.length > 0 && <p>Loading more reports...</p>}

      <AdminActionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReport(null);
          setActionError(null);
        }}
        onSubmit={handleTakeAction}
        reportId={selectedReport?._id}
        actionType={currentActionType}
        isLoading={isLoading} // You might want a specific isLoadingAction state
        error={actionError}
      />
    </div>
  );
};

const styles = {
    reportItem: {
        border: '1px solid #ddd',
        padding: '15px',
        marginBottom: '15px',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9'
    },
    actionsContainer: {
        marginTop: '10px',
        display: 'flex',
        gap: '10px'
    },
    actionButton: {
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    ignoreButton: {
        backgroundColor: '#6c757d',
        color: 'white'
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: 'white'
    },
    muteButton: {
        backgroundColor: '#ffc107',
        color: '#212529'
    },
    loadMoreButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'block',
        margin: '20px auto'
    },
    reportedContentPreview: {
        marginTop: '10px',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9'
    }
}

export default NewReportsView; 