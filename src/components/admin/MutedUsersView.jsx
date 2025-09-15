import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
// import './MutedUsersView.css'; // Optional: for specific styling

const MutedUsersView = () => {
  const [mutedUsers, setMutedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('muteExpiresAt'); // 'muteExpiresAt', 'name'
  const { token } = useAuth();

  const fetchMutedUsers = useCallback(async (currentPage, currentSortBy) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10, 
        sortBy: currentSortBy,
      });

      const response = await fetch(`/api/admin/muted-users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to fetch muted users (HTTP ${response.status})`);
      }
      const data = await response.json();
      setMutedUsers(prevUsers => currentPage === 1 ? data.mutedUsers : [...prevUsers, ...data.mutedUsers]);
      setTotalPages(data.totalPages);
      setPage(currentPage);

    } catch (err) {
      console.error("Error fetching muted users:", err);
      setError(err.message);
      if (currentPage === 1) setMutedUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMutedUsers(1, sortBy);
  }, [fetchMutedUsers, sortBy]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchMutedUsers(page + 1, sortBy);
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1); // Reset to first page on sort change
  };

  return (
    <div className="muted-users-view">
      <h3 style={{ marginBottom: '20px' }}>Currently Muted Users</h3>
      
      <div className="filters-and-sort" style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label htmlFor="mutedSortBy" style={{ marginRight: '8px' }}>Sort By: </label>
          <select id="mutedSortBy" value={sortBy} onChange={handleSortChange} style={{ padding: '8px', borderRadius: '4px' }}>
            <option value="muteExpiresAt">Mute Expiry Date</option>
            <option value="name">User Name</option>
          </select>
        </div>
      </div>

      {isLoading && mutedUsers.length === 0 && <p>Loading muted users...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && !error && mutedUsers.length === 0 && <p>No users are currently muted.</p>}

      {mutedUsers.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {mutedUsers.map(user => (
            <li key={user._id} style={styles.userItem}>
              <h4>{user.name} ({user.email})</h4>
              <p><strong>Mute Expires At:</strong> {new Date(user.muteExpiresAt).toLocaleString()}</p>
              <p><strong>Muted By:</strong> {user.mutedByAdminId?.name || 'N/A'} ({user.mutedByAdminId?.email || 'N/A'})</p>
              <p><strong>Reason for Mute:</strong> {user.mutedReason || 'N/A'}</p>
              {/* Optional: Add button to unmute or adjust mute if that functionality is added later */}
            </li>
          ))}
        </ul>
      )}

      {page < totalPages && !isLoading && (
        <button onClick={handleLoadMore} style={styles.loadMoreButton}>
          Load More Muted Users
        </button>
      )}
      {isLoading && mutedUsers.length > 0 && <p>Loading more users...</p>}
    </div>
  );
};

// Reusing similar styles for consistency
const styles = {
    userItem: {
        border: '1px solid #ddd',
        padding: '15px',
        marginBottom: '15px',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9'
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

export default MutedUsersView; 