import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Corrected path
import { useLocation } from 'react-router-dom';
// import './AdminPanelPage.css'; // We will create this later
import AdminActionModal from '../components/admin/AdminActionModal';

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30.44); // Average days in month
  const years = Math.round(days / 365.25); // Account for leap years

  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  if (weeks < 5) return `${weeks} weeks ago`; // Up to 4 weeks
  if (months < 12) return `${months} months ago`;
  return `${years} years ago`;
};

const AdminPanelPage = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReports: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    status: 'open', // Default to open reports
    itemType: '',
    page: 1,
    tag: '',
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentActionType, setCurrentActionType] = useState(null); // e.g., 'change_status', 'delete_item', 'delete_mute_user'
  const [modalError, setModalError] = useState(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // New Modal State for Viewing Item Details
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [reportDetailsToShow, setReportDetailsToShow] = useState(null);

  // Check if user is an admin - basic check for now
  // In a real app, this would be more robust, potentially checking specific roles or permissions
  console.log('[AdminPanelPage] User object from useAuth():', user);
  if (user) {
    console.log('[AdminPanelPage] user.isAdminForTags:', user.isAdminForTags);
    console.log('[AdminPanelPage] user.isAdminForTags.length:', user.isAdminForTags?.length);
  }
  const isAdmin = user?.isAdminForTags && user.isAdminForTags.length > 0;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagFromUrl = params.get('tag');
    if (tagFromUrl) {
      setFilters(prev => ({ ...prev, tag: tagFromUrl, page: 1 }));
    }
  }, [location.search]);

  useEffect(() => {
    console.log('[AdminPanelPage] useEffect triggered. AuthLoading:', authLoading, 'User:', user, 'IsAdmin:', isAdmin);
    if (authLoading) return; // Wait for auth to load

    // Add a check for user object itself before checking isAdmin
    if (!user) {
      // User object not yet populated, might still be loading from tempToken
      // setError('Authenticating...'); // Optional: indicate user is being processed
      // setLoading(true); // Keep the page loading spinner if user is not yet available
      return; 
    }

    if (!isAdmin) {
      setError('Access Denied. You do not have permission to view this page.');
      setLoading(false); // This is loading for the page's own data, not auth
      return;
    }
    if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
    }

    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: filters.page,
          limit: pagination.limit,
        });
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.itemType) queryParams.append('itemType', filters.itemType);
        if (filters.tag) queryParams.append('tag', filters.tag);

        const response = await fetch(`/api/admin/reports?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed to fetch reports (HTTP ${response.status})`);
        }
        const data = await response.json();
        setReports(data.reports || []);
        setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalReports: 0, limit: 10 });
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError(err.message);
        setReports([]); // Clear reports on error
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, token, isAdmin, authLoading, filters, pagination.limit]); // Added user to dependency array

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 })); // Reset to page 1 on filter change
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleOpenActionModal = (report, actionType) => {
    setSelectedReport(report);
    setCurrentActionType(actionType);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
    setCurrentActionType(null);
    setModalError(null);
  };

  const handleOpenDetailsModal = (report) => {
    setReportDetailsToShow(report);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setReportDetailsToShow(null);
  };

  const handleAdminActionSubmit = async (reportId, actionType, reason, muteDuration) => {
    if (!token) {
      setModalError("Authentication token not found.");
      return;
    }
    setIsSubmittingAction(true);
    setModalError(null);

    // This is a placeholder. You'll need to implement the actual API calls
    // based on the actionType.
    console.log("Submitting admin action:", { reportId, actionType, reason, muteDuration });

    try {
      let endpoint = '';
      let payload = {};
      let httpMethod = 'POST'; // Or PATCH

      switch (actionType) {
        case 'change_status_under_review':
          endpoint = `/api/admin/reports/${reportId}/status`;
          payload = { status: 'under_review', adminNotes: reason };
          httpMethod = 'PATCH';
          break;
        case 'change_status_resolved_action':
          endpoint = `/api/admin/reports/${reportId}/status`;
          payload = { status: 'resolved_action_taken', adminNotes: reason };
          httpMethod = 'PATCH';
          break;
        case 'change_status_resolved_no_action':
          endpoint = `/api/admin/reports/${reportId}/status`;
          payload = { status: 'resolved_no_action', adminNotes: reason };
          httpMethod = 'PATCH';
          break;
        case 'change_status_dismissed':
          endpoint = `/api/admin/reports/${reportId}/status`;
          payload = { status: 'dismissed', adminNotes: reason };
          httpMethod = 'PATCH';
          break;
        // For 'take_action_delete', 'take_action_delete_mute'
        // These might involve different endpoints or a more complex payload
        // The AdminActionModal currently supports 'delete' and 'delete_mute'
        // which might map to deleting the reported item itself and optionally muting the user.
        // This is distinct from changing the *report's* status.
        // We need to align these action types. For now, let's assume AdminActionModal's
        // 'delete' means "delete reported item and resolve report"
        // 'delete_mute' means "delete reported item, mute user, and resolve report"
        
        // Example: these map to actions in AdminActionModal,
        // but the endpoint structure here is for example only.
        case 'delete_item': // Corresponds to 'delete' in AdminActionModal
          endpoint = `/api/admin/reports/${reportId}/action/delete-item`; // Example endpoint
          payload = { adminReason: reason };
          // This action would also likely set the report status to 'resolved_action_taken'
          break;
        case 'delete_mute_user': // Corresponds to 'delete_mute' in AdminActionModal
          endpoint = `/api/admin/reports/${reportId}/action/delete-item-mute-user`; // Example endpoint
          payload = { adminReason: reason, muteDurationDays: muteDuration };
          // Also sets report status
          break;
        default:
          console.warn("Unknown action type:", actionType);
          setModalError("Unknown action type selected.");
          setIsSubmittingAction(false);
          return;
      }

      const response = await fetch(endpoint, {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to ${actionType.replace(/_/g, ' ')}`);
      }

      // const updatedReport = await response.json(); // Or some confirmation

      // Refresh reports list to show changes
      setReports(prevReports => 
        prevReports.map(r => r._id === reportId ? { ...r, ...payload, status: payload.status || r.status } : r) // Optimistic update
      );
      
      // Or refetch all reports if the action might affect multiple or pagination
      // fetchReports(); 


      handleCloseModal();
    } catch (err) {
      console.error(`Error submitting action ${actionType}:`, err);
      setModalError(err.message || `An error occurred while ${actionType.replace(/_/g, ' ')}.`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (authLoading) {
    return <div className="container mt-5"><p>Loading authentication...</p></div>;
  }

  if (!user || (!isAdmin && !authLoading)) {
    return (
      <div className="container mt-5">
        <h2>Admin Panel</h2>
        <p className="text-danger">Access Denied. You do not have permission to view this page.</p>
      </div>
    );
  }
  
  // Render actual admin panel content if admin
  return (
    <div className="container mt-5 admin-panel-page">
      <h2>Admin Panel - Reports Management</h2>
      
      {filters.tag && (
        <div className="alert alert-info d-flex justify-content-between align-items-center">
          <span>Filtering for tag: <strong>{filters.tag}</strong></span>
          <button onClick={() => setFilters(prev => ({...prev, tag: '', page: 1}))} className="btn btn-sm btn-outline-info">
            Clear Filter
          </button>
        </div>
      )}

      {error && <div className="alert alert-danger">Error: {error}</div>}

      {/* Filters Section - Basic for now */} 
      <div className="row mb-3">
        <div className="col-md-4">
            <label htmlFor="statusFilter" className="form-label">Report Status:</label>
            <select 
                id="statusFilter" 
                name="status" 
                className="form-select"
                value={filters.status}
                onChange={handleFilterChange}
            >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="under_review">Under Review</option>
                <option value="resolved_action_taken">Resolved (Action Taken)</option>
                <option value="resolved_no_action">Resolved (No Action)</option>
                <option value="dismissed">Dismissed</option>
            </select>
        </div>
        <div className="col-md-4">
            <label htmlFor="itemTypeFilter" className="form-label">Item Type:</label>
            <select 
                id="itemTypeFilter" 
                name="itemType" 
                className="form-select"
                value={filters.itemType}
                onChange={handleFilterChange}
            >
                <option value="">All Types</option>
                <option value="Listing">Listing</option>
                <option value="Comment">Comment</option>
                <option value="User">User</option>
                {/* Add Image, Product later */}
            </select>
        </div>
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 && !error ? (
        <p>No reports found matching your criteria.</p>
      ) : (
        <>
          <table className="table table-striped table-hover" style={{ border: '1px solid #ddd', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Reported Item & Snapshot</th>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Type</th>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Reason</th>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Reporter</th>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Status</th>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Created At</th>
                <th style={{ borderRight: '1px solid #ddd', padding: '8px' }}>Times Reported</th>
                <th style={{ padding: '8px' }}>Actions</th> 
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report._id}>
                  <td style={{ verticalAlign: 'top', maxWidth: '300px', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>
                    {report.reportedItem ? (
                        <a 
                            href="#view-item" 
                            onClick={(e) => { e.preventDefault(); handleOpenDetailsModal(report); }}
                            style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}
                        >
                            {report.reportedItem?.title || report.reportedItem?.name || report.reportedItem?.text?.substring(0,50) || report.reportedItemId}
                        </a>
                    ) : (
                        <i 
                            style={{ display: 'block', marginBottom: '5px', cursor: 'pointer' }} 
                            onClick={() => handleOpenDetailsModal(report)}
                        >
                            Item may have been deleted ({report.reportedItemId.slice(-6)}) - Click to see snapshot
                        </i>
                    )}
                    <div style={{ 
                        fontSize: '0.85em', 
                        maxHeight: '100px', 
                        overflowY: 'auto', 
                        whiteSpace: 'pre-wrap', 
                        backgroundColor: '#f8f9fa', 
                        padding: '8px', 
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        marginTop: '5px'
                    }}>
                        {JSON.stringify(report.reportedItemSnapshot, null, 2)}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>{report.reportedItemRef}</td>
                  <td title={report.reason} style={{ verticalAlign: 'top', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>{report.reason}</td>
                  <td style={{ verticalAlign: 'top', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>{report.reporterId?.name || 'N/A'} ({report.reporterId?._id.slice(-4)})</td>
                  <td style={{ verticalAlign: 'top', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>
                    <span className={`badge bg-${report.status === 'open' ? 'danger' : report.status === 'under_review' ? 'warning' : 'success'}`}>
                        {report.status}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'top', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>{formatTimeAgo(report.createdAt)}</td>
                  <td style={{ verticalAlign: 'top', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '8px' }}>
                    {report.reportCount || 'N/A'}
                  </td>
                  <td style={{ verticalAlign: 'top', padding: '8px', borderBottom: '1px solid #ddd' }}> 
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}> {/* Container for direct buttons */}
                        <a 
                            href="#view-details" 
                            onClick={(e) => { e.preventDefault(); handleOpenDetailsModal(report); }}
                            style={{
                                display: 'inline-block',
                                padding: '6px 10px',
                                fontSize: '0.875rem',
                                color: '#007bff', // Bootstrap primary blue for view link
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                textAlign: 'center',
                                borderRadius: '4px',
                            }}
                        >
                            View Reported Item Details
                        </a>
                        
                        {/* Delete Content Button */}
                        <button 
                            onClick={() => handleOpenActionModal(report, 'delete_item')} 
                            style={{
                                backgroundColor: '#FF4D00', /* Updated Red */
                                color: '#fff', 
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                            }}
                        >
                            Delete Content
                        </button>

                        {/* Delete Content & Mute User Button */}
                        <button 
                            onClick={() => handleOpenActionModal(report, 'delete_mute_user')} 
                            style={{
                                backgroundColor: '#FF4D00', /* Updated Red */
                                color: '#fff', 
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                            }}
                        >
                            Delete Content & Mute User
                        </button>

                        {/* Dismiss Report Button */}
                        <button 
                            onClick={() => handleOpenActionModal(report, 'dismissed')} 
                            style={{
                                backgroundColor: '#0ACF83', /* Updated Green */
                                color: '#fff', 
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                            }}
                        >
                            Dismiss Report
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls - Basic */} 
          {pagination.totalPages > 1 && (
            <nav aria-label="Page navigation">
              <ul className="pagination">
                <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)}>Previous</button>
                </li>
                {[...Array(pagination.totalPages).keys()].map(num => (
                  <li key={num + 1} className={`page-item ${pagination.currentPage === num + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(num + 1)}>{num + 1}</button>
                  </li>
                ))}
                <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)}>Next</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}

      <AdminActionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAdminActionSubmit}
        reportId={selectedReport?._id}
        actionType={currentActionType}
        isLoading={isSubmittingAction}
        error={modalError}
      />

      {/* New Details Modal */}
      {isDetailsModalOpen && reportDetailsToShow && (
        <div style={detailsModalStyles.overlay} onClick={handleCloseDetailsModal}>
          <div style={detailsModalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={detailsModalStyles.title}>Reported Item Details</h3>
            <p><strong>Report ID:</strong> {reportDetailsToShow._id}</p>
            <p><strong>Item Type:</strong> {reportDetailsToShow.reportedItemRef}</p>
            <p><strong>Item ID:</strong> {reportDetailsToShow.reportedItemId}</p>
            
            <h4>Live Item Data (if available):</h4>
            {reportDetailsToShow.reportedItem ? (
              <pre style={detailsModalStyles.preBox}>{JSON.stringify(reportDetailsToShow.reportedItem, null, 2)}</pre>
            ) : (
              <p><em>Live item data not available (item may have been deleted or could not be fetched).</em></p>
            )}

            <h4>Snapshot at time of report:</h4>
            <pre style={detailsModalStyles.preBox}>{JSON.stringify(reportDetailsToShow.reportedItemSnapshot, null, 2)}</pre>
            
            <div style={detailsModalStyles.buttonGroup}>
              <button onClick={handleCloseDetailsModal} style={{...styles.button, ...styles.cancelButton}}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Styles for AdminActionModal (retained from previous context if any)
const styles = {
  button: {
    padding: '10px 18px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: '600',
    transition: 'background-color 0.2s ease',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
};

// Basic inline styles for the new Details Modal - consider moving to a CSS file
const detailsModalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay for details
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1050, // Higher z-index than AdminActionModal if they can overlap
  },
  modal: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.25)',
    width: '90%',
    maxWidth: '700px', // Wider for details
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
    fontSize: '1.8em',
    textAlign: 'center',
  },
  preBox: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    padding: '15px',
    maxHeight: '300px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',       
    wordBreak: 'break-all',      
    fontSize: '0.9em',
    marginBottom: '20px',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '25px',
  },
};

export default AdminPanelPage; 