import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios'; // We'll need axios or fetch to make API calls

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('authToken')); // Load token from storage
  const [loading, setLoading] = useState(true); // Start loading until we verify the token
  const [isPhoneVerified, setIsPhoneVerified] = useState(false); // Track phone verification status

  // New state for conversations and unread count
  const [conversations, setConversations] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);

  // Define handleLogout earlier, wrapped in useCallback
  const handleLogout = useCallback(() => {
    console.log('[AuthContext] Handling logout');
    setUser(null);
    setToken(null);
    setIsPhoneVerified(false);
    localStorage.removeItem('authToken');
    setConversations([]);
    setTotalUnreadCount(0);
    // window.location.href = '/';
  }, []); // Empty dependency array as it doesn't depend on other states/props here

  useEffect(() => {
    // Function to check for token in URL params on initial load or redirect
    const checkTokenInUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token'); // Check for the final token
      const urlTempToken = urlParams.get('tempToken'); // Check for the temp token

      const tokenToStore = urlToken || urlTempToken; // Prioritize final token
      const isTemp = !!urlTempToken && !urlToken; // Check if it's the temp token

      if (tokenToStore) {
        console.log(`[AuthContext] Token found in URL (${isTemp ? 'temp' : 'final'}):`, tokenToStore);
        setToken(tokenToStore);
        localStorage.setItem('authToken', tokenToStore); // Store it
        
        // Clean the URL (remove token query params)
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('token');
        currentUrl.searchParams.delete('tempToken');
        // Keep other params like targetUrl if needed for VerifyPhonePage
        window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search); 
      } else {
        // If no token is in the URL, we can stop loading for the URL check.
        // The verification effect will handle the case where a token exists in localStorage.
        setLoading(false); 
      }
    };

    checkTokenInUrl();

  }, []); // Run only once on mount

  useEffect(() => {
    // Function to verify the stored token with the backend
    const verifyToken = async () => {
      if (token) {
        console.log('[AuthContext] Verifying token:', token);
        try {
          const response = await axios.get('http://localhost:3001/api/auth/status', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('[AuthContext] Token verification response (FULL DATA):', response.data);
          if (response.data.isAuthenticated) {
            setUser(response.data.user);
            setIsPhoneVerified(response.data.isPhoneVerified);
            // User is authenticated, now fetch conversations (moved here)
          } else {
            // Token is invalid or expired
            handleLogout(); 
          }
        } catch (error) {
          console.error('[AuthContext] Error verifying token:', error);
          handleLogout(); // Clear state on error
        }
      } else {
        // No token, ensure user is null and loading is false
        setUser(null);
        setIsPhoneVerified(false);
        setLoading(false); 
        setConversations([]); 
        setTotalUnreadCount(0);
      }
    };

    verifyToken();

  }, [token, handleLogout]); // Re-run when token changes

  const handleLogin = (newToken) => {
    // This function could be called by VerifyPhonePage upon successful code verification
    console.log('[AuthContext] Handling login with new token:', newToken);
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
    // Verification effect will trigger automatically
  };

  // Function to fetch conversations and calculate unread count
  const fetchUserConversations = useCallback(async () => {
    if (!token || !user) { // Ensure token and user are present
      setConversations([]);
      setTotalUnreadCount(0);
      return;
    }
    console.log('[AuthContext] Fetching user conversations...');
    setLoadingConversations(true);
    setConversationsError(null);
    try {
      const response = await axios.get('http://localhost:3001/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedConversations = response.data;
      setConversations(fetchedConversations);
      let unread = 0;
      fetchedConversations.forEach(convo => {
        if (convo.unreadCount) {
          unread += convo.unreadCount;
        }
      });
      setTotalUnreadCount(unread);
      console.log('[AuthContext] Conversations fetched, total unread:', unread, fetchedConversations);
    } catch (error) {
      console.error('[AuthContext] Error fetching conversations:', error);
      setConversationsError(error.message);
      setTotalUnreadCount(0); // Reset on error
    } finally {
      setLoadingConversations(false);
    }
  }, [token, user]); // Depend on token and user

  // Fetch conversations when user is authenticated and available
  useEffect(() => {
    if (user && token && !loading) { // ensure auth loading is complete and user is set
        fetchUserConversations();
    }
  }, [user, token, loading, fetchUserConversations]);

  const value = {
    user,
    token,
    isAuthenticated: !!user, // True if user object exists
    isPhoneVerified,
    loading,
    login: handleLogin, 
    logout: handleLogout,
    // Conversation related values
    conversations, // Expose conversations if MessagingPage wants to use it
    totalUnreadCount,
    loadingConversations,
    conversationsError,
    fetchUserConversations, // Expose to allow manual refresh if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
}; 