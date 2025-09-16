import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ConversationList from '../components/messaging/ConversationList';
import ConversationView from '../components/messaging/ConversationView';
import { useAuth } from '../context/AuthContext';

const MessagingPage = () => {
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [errorConversations, setErrorConversations] = useState(null);
  const { user: currentUser, token, loading: authLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = currentUser?.isAdminForTags && currentUser.isAdminForTags.length > 0;

  useEffect(() => {
    console.log('MessagingPage currentUser from useAuth:', currentUser);
    console.log('MessagingPage authLoading:', authLoading);
    console.log('MessagingPage isAuthenticated:', isAuthenticated);
  }, [currentUser, authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log("MessagingPage: Not authenticated, redirecting to login or home.");
      navigate('/');
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  const fetchConversations = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoadingConversations(true);
    setErrorConversations(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      const data = await response.json();
      setConversations(data);
      console.log("MessagingPage: Conversations fetched successfully:", data);
    } catch (error) {
      console.error("MessagingPage: Error fetching conversations:", error);
      setErrorConversations(error.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recipientIdFromUrl = params.get('recipientId');
    if (recipientIdFromUrl) {
      console.log('MessagingPage: Recipient ID from URL:', recipientIdFromUrl);
      const existingConversation = conversations.find(c => c.partner._id === recipientIdFromUrl);
      if (existingConversation) {
        setSelectedConversationId(recipientIdFromUrl); 
      } else {
        setSelectedConversationId(recipientIdFromUrl);
      }
    }
  }, [location.search, conversations]);

  const handleSelectConversation = (partnerId) => {
    console.log("MessagingPage: Selected conversation with partnerId:", partnerId);
    setSelectedConversationId(partnerId);
  };
  
  const handleMessageSent = () => {
    fetchConversations();
  };

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to view messages.</div>;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '30%', borderRight: '1px solid #ccc', paddingRight: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0 }}>Conversations</h2>
          {isAdmin && (
            <Link to="/admin" style={{ textDecoration: 'none', color: '#fff', backgroundColor: '#007bff', padding: '5px 10px', borderRadius: '4px', fontSize: '0.9em' }}>
              Admin Panel
            </Link>
          )}
        </div>
        {loadingConversations && <p>Loading conversations...</p>}
        {errorConversations && <p style={{ color: 'red' }}>Error: {errorConversations}</p>}
        {!loadingConversations && !errorConversations && (
          <ConversationList conversations={conversations} onSelectConversation={handleSelectConversation} selectedConversationId={selectedConversationId}/>
        )}
        {location.search.includes('recipientId') && !conversations.find(c => c.partner._id === new URLSearchParams(location.search).get('recipientId')) && (
          <p style={{marginTop: '10px', color: 'gray'}}>To start a chat with {new URLSearchParams(location.search).get('recipientId')}, select them or send your first message.</p>
        )}
      </div>
      <div style={{ width: '70%', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
        <ConversationView 
            partnerId={selectedConversationId} 
            currentUser={currentUser} 
            onMessageSent={handleMessageSent}
            conversations={conversations}
        />
      </div>
    </div>
  );
};

export default MessagingPage; 