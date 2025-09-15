import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
// import './PastReportsView.css'; // Optional: for specific styling

const PastReportsView = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt' (resolution date), 'createdAt' (report date)
  const [contentTypeFilter, setContentTypeFilter] = useState(''); // '', 'comment', 'listing', 'image'
  const { token } = useAuth();

  const fetchPastReports = useCallback(async (currentPage, currentSortBy, currentContentType) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: 'past',
        page: currentPage,
        limit: 10, 
        sortBy: currentSortBy, // API should handle this; 'updatedAt' for resolution date
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
        throw new Error(errData.error || `Failed to fetch past reports (HTTP ${response.status})`);
      }
      const data = await response.json();
      setReports(prevReports => currentPage === 1 ? data.reports : [...prevReports, ...data.reports]);
      setTotalPages(data.totalPages);
      setPage(currentPage);

    } catch (err) {
      console.error("Error fetching past reports:", err);
      setError(err.message);
      if (currentPage === 1) setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPastReports(1, sortBy, contentTypeFilter);
  }, [fetchPastReports, sortBy, contentTypeFilter]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchPastReports(page + 1, sortBy, contentTypeFilter);
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1); 
  };

  const handleFilterChange = (e) => {
    setContentTypeFilter(e.target.value);
    setPage(1);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ignored': return 'Ignored';
      case 'resolved_deleted': return 'Content Deleted';
      case 'resolved_deleted_muted': return 'Content Deleted & User Muted';
      default: return status;
    }
  };

  return (
    <div className="past-reports-view">
      <h3 style={{ marginBottom: '20px' }}>Past Reports</h3>
      
      <div className="filters-and-sort" style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label htmlFor="pastSortBy" style={{ marginRight: '8px' }}>Sort By: </label>
          <select id="pastSortBy" value={sortBy} onChange={handleSortChange} style={{ padding: '8px', borderRadius: '4px' }}>
            <option value="updatedAt">Resolution Date</option>
            <option value="createdAt">Report Date</option>
            <option value="reportCount">Most Reported</option> {/* Retain if API supports for past too */}
          </select>
        </div>
        <div>
          <label htmlFor="pastContentTypeFilter" style={{ marginRight: '8px' }}>Filter by Type: </label>
          <select id="pastContentTypeFilter" value={contentTypeFilter} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px' }}>
            <option value="">All Types</option>
            <option value="comment">Comments</option>
            <option value="listing">Listings</option>
            <option value="image">Images</option>
          </select>
        </div>
      </div>

      {isLoading && reports.length === 0 && <p>Loading past reports...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && !error && reports.length === 0 && <p>No past reports found.</p>}

      {reports.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {reports.map(report => (
            <li key={report._id} style={styles.reportItem}>
              <h4>Report ID: {report._id} (Original Count: {report.reportCount})</h4>
              <p><strong>Status:</strong> {getStatusLabel(report.status)}</p>
              <p><strong>Type:</strong> {report.contentType}</p>
              <p><strong>Content ID:</strong> {report.contentId}</p>
              <p><strong>Part:</strong> {report.partId?.title || 'N/A'} (Slug: <a href={`/part/${report.partId?.slug}`} target="_blank" rel="noopener noreferrer">{report.partId?.slug || 'N/A'}</a>)</p>
              <p><strong>Originally Reported By:</strong> {report.reportedByUserId?.name || 'Unknown'} ({report.reportedByUserId?.email || 'N/A'})</p>
              <p><strong>Original Reason:</strong> {report.reasonForReporting || 'N/A'}</p>
              <p><strong>Reported At:</strong> {new Date(report.createdAt).toLocaleString()}</p>
              <p><strong>Resolved By:</strong> {report.resolvedByAdminId?.name || 'N/A'} ({report.resolvedByAdminId?.email || 'N/A'})</p>
              <p><strong>Admin Action Reason:</strong> {report.adminActionReason || 'N/A'}</p>
              {report.status === 'resolved_deleted_muted' && <p><strong>Mute Duration:</strong> {report.muteDurationDays} days</p>}
              <p><strong>Resolution Date:</strong> {new Date(report.updatedAt).toLocaleString()}</p>
              <p><strong>Associated Tags at time of report:</strong> {report.associatedTags?.join(', ') || 'N/A'}</p>
            </li>
          ))}
        </ul>
      )}

      {page < totalPages && !isLoading && (
        <button onClick={handleLoadMore} style={styles.loadMoreButton}>
          Load More Reports
        </button>
      )}
      {isLoading && reports.length > 0 && <p>Loading more reports...</p>}
    </div>
  );
};

// Reusing similar styles from NewReportsView for consistency
const styles = {
    reportItem: {
        border: '1px solid #ddd',
        padding: '15px',
        marginBottom: '15px',
        borderRadius: '5px',
        backgroundColor: '#f0f0f0' // Slightly different background for past reports
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
    }
}

export default PastReportsView; 