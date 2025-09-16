import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate and Link
import '@fontsource/plus-jakarta-sans';
import Logo from './Logo.png';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook

const Navbar = () => {
  // Get totalUnreadCount and loadingConversations from useAuth
  const { isAuthenticated, user, logout, loading: authLoading, totalUnreadCount, loadingConversations } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const navigate = useNavigate(); // Hook for navigation

  // Debug: Log the user object
  console.log('Auth user:', user);
  console.log('Navbar totalUnreadCount:', totalUnreadCount);
  console.log('Navbar loadingConversations:', loadingConversations);

  // Function to initiate Google OAuth flow
  const handleGoogleLogin = () => {
    // Encode the current path to be used as 'state' in the OAuth flow
    const state = btoa(location.pathname + location.search);
    // Redirect to the backend Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google?state=${encodeURIComponent(state)}`;
  };

  const handleLogoutClick = () => {
    logout(); // Call logout from context
    // Optionally redirect to home after logout
    // window.location.href = '/';
  };

  // Handle search form submission
  const handleSearchSubmit = (event) => {
    event.preventDefault(); // Prevent default form submission
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      // Optionally clear search term after navigation
      // setSearchTerm('');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          <img src={Logo} alt="PartsFlip Logo" className="navbar-logo" />
        </Link>
        
        {/* Wrap search in a form */}
        <form className="search-container" onSubmit={handleSearchSubmit}>
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M15.5 15.5L11 11M7 13C3.686 13 1 10.314 1 7C1 3.686 3.686 1 7 1C10.314 1 13 3.686 13 7C13 10.314 10.314 13 7 13Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input 
            type="text" 
            className="search-bar"
            placeholder="Search for parts, users..."
            value={searchTerm} // Bind value to state
            onChange={(e) => setSearchTerm(e.target.value)} // Update state on change
          />
          {/* Hidden submit button to allow Enter key submission */}
          <button type="submit" style={{ display: 'none' }} aria-hidden="true">Search</button>
        </form>

        <div className="auth-buttons">
          {authLoading ? (
            // Optional: Show a loading indicator while checking auth status
            <div className="text-sm text-gray-500">Loading...</div> 
          ) : isAuthenticated ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Link to="/messages" className="navbar-link" style={{ marginRight: '15px', textDecoration: 'none', color: 'inherit', position: 'relative' }}>
                Messages
                {!loadingConversations && totalUnreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-12px',
                    background: 'red',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '2px 6px',
                    fontSize: '0.75em',
                    lineHeight: '1',
                    minWidth: '18px', // Ensure circle shape for single digit
                    textAlign: 'center'
                  }}>
                    {totalUnreadCount}
                  </span>
                )}
              </Link>
              <Link to="/blog/new" className="navbar-link" style={{ marginRight: '15px', textDecoration: 'none', color: 'inherit' }}>
                Create Post
              </Link>
              <span 
                className="text-sm font-medium mr-3 user-dropdown-trigger"
                style={{ cursor: 'pointer' }}
                onClick={() => setDropdownOpen((open) => !open)}
              >
                Hi, {user?.name?.split(' ')[0]}
              </span>
              {user?.profilePicture && (
                <img 
                  src={user.profilePicture}
                  alt="Profile" 
                  className="profile-picture mr-3"
                  referrerPolicy="no-referrer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDropdownOpen((open) => !open)}
                />
              )}
              {dropdownOpen && (
                <div className="user-dropdown-menu" style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10, minWidth: 120 }}>
                  <Link 
                    to={user ? `/account/${user.id}` : '/login'} 
                    className="user-dropdown-item" // Apply similar styling as logout or create a new class
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                    onClick={() => setDropdownOpen(false)} // Close dropdown on click
                  >
                    My Profile
                  </Link>
                  <button className="auth-button logout" style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { handleLogoutClick(); setDropdownOpen(false); }}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            // User is not logged in
            <>
              <button className="auth-button login" onClick={handleGoogleLogin}>Login</button>
              <button className="auth-button signup" onClick={handleGoogleLogin}>Sign Up</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 