import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext'; // Ensure correct path
import { useNavigate } from 'react-router-dom';

// Placeholder: This component will display messages for a given conversationId
// and allow sending new messages.
const ConversationView = ({ partnerId, currentUser, onMessageSent, conversations }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth(); // Get token for API calls
  const messagesEndRef = useRef(null); // For scrolling to bottom
  const navigate = useNavigate();

  const isAdminReportView = partnerId?.startsWith('admin-report-');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll when messages change

  const fetchMessages = useCallback(async () => {
    if (!partnerId || !token || isAdminReportView) {
      setMessages([]); // Clear messages if no partnerId or token
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/messages/conversation/${partnerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      const data = await response.json();
      setMessages(data);
      console.log(`ConversationView: Messages fetched for ${partnerId}:`, data);
    } catch (err) {
      setError(err.message);
      console.error(`ConversationView: Error fetching messages for ${partnerId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [partnerId, token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !partnerId || !token) return;

    try {
      const response = await fetch('http://localhost:3001/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: partnerId, content: newMessage.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to send message: ${response.status}`);
      }
      
      const sentMessage = await response.json();
      setMessages(prevMessages => [...prevMessages, sentMessage]); // Optimistic update
      setNewMessage('');
      if (onMessageSent) {
        onMessageSent(); // Notify parent to refetch conversations
      }
      console.log(`ConversationView: Message sent to ${partnerId}:`, sentMessage);
    } catch (err) {
      setError(err.message); // Display send error to user
      console.error(`ConversationView: Error sending message to ${partnerId}:`, err);
    }
  };

  if (isAdminReportView) {
    const groupName = partnerId.replace('admin-report-', '');
    const reportConvo = conversations?.find(c => c.partner?._id === partnerId);
    const reportCount = reportConvo?.unreadCount || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Admin Reports for '{groupName}'</h3>
            <p style={{ fontSize: '1.1em', color: '#555' }}>You have {reportCount} new content report(s) awaiting review in this category.</p>
            <button
                onClick={() => navigate(`/admin?tag=${groupName}`)}
                style={{ marginTop: '20px', padding: '12px 25px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
            >
                View Reports
            </button>
        </div>
    );
  }

  if (!partnerId) {
    return <div style={{display: 'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#777'}}><p>Select a conversation to view messages.</p></div>;
  }
  if (loading) return <p>Loading messages...</p>;
  
  const renderMessageContent = (content) => {
    const listingRePattern = /^(Re: Your listing for "[^"]+" to (?:sell|buy) for \$\d+(?:\.\d{2})?\. \(View product: (https?:\/\/[^)]+)\))(.*)/s;
    const match = content.match(listingRePattern);

    if (match) {
      const headerText = match[1];
      const productUrl = match[2];
      const bodyText = match[3].trim(); // User's actual message

      // Further extract the "View product: <url>" part to replace it
      const viewProductPattern = /\(View product: https?:\/\/[^)]+\)/;
      const headerWithoutLinkText = headerText.replace(viewProductPattern, '').trim();
      
      return (
        <>
          <div style={{ 
            backgroundColor: '#f0f0f0', // Lighter background for the header
            padding: '8px', 
            borderRadius: '8px', 
            marginBottom: '5px',
            color: '#333' // Darker text for readability on light background
          }}>
            <p style={{margin: 0}}>
              {headerWithoutLinkText} {' '}
              (<a href={productUrl} target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'underline'}}>
                link
              </a>)
            </p>
          </div>
          {bodyText && <p style={{margin: 0}}>{bodyText}</p>}
        </>
      );
    }
    return <p style={{margin:0}}>{content}</p>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{textAlign: 'center', paddingBottom: '10px', borderBottom: '1px solid #eee', margin: '0 0 10px 0'}}>
        Chat with {messages[0]?.senderId?._id === partnerId ? messages[0]?.senderId.name : messages[0]?.receiverId?._id === partnerId ? messages[0]?.receiverId.name : (conversations?.find(c => c.partner?._id === partnerId)?.partner?.name || 'User')}
      </h3>
      {error && <p style={{ color: 'red', textAlign:'center' }}>Error: {error}</p>}
      <div style={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #f0f0f0', marginBottom: '10px', padding: '10px' }}>
        {messages.length === 0 && !loading && <p>No messages yet. Say hello!</p>}
        {messages.map(msg => {
          // console.log(`Message ID: ${msg._id}, Sender ID: ${msg.senderId?._id}, Current User ID: ${currentUser?.id}, Is Current User: ${msg.senderId?._id === currentUser?.id}`);
          
          const isCurrentUserMessage = msg.senderId?._id === currentUser?.id;

          return (
            <div key={msg._id} style={{
              display: 'flex',
              justifyContent: isCurrentUserMessage ? 'flex-end' : 'flex-start',
              marginBottom: '10px',
            }}>
              <div style={{
                padding: '8px 12px',
                borderRadius: '15px',
                backgroundColor: isCurrentUserMessage ? '#007bff' : '#e9e9eb',
                color: isCurrentUserMessage ? 'white' : 'black',
                maxWidth: '70%',
                wordBreak: 'break-word'
              }}>
                {renderMessageContent(msg.content)}
                <div style={{ fontSize: '0.7em', color: isCurrentUserMessage ? '#f0f0f0' : '#555', marginTop: '3px', textAlign: 'right' }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flexGrow: 1, padding: '10px', marginRight: '10px', borderRadius: '20px', border: '1px solid #ccc' }}
          disabled={!partnerId} // Disable if no partner is selected
        />
        <button 
          type="submit" 
          style={{ padding: '10px 15px', borderRadius: '20px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
          disabled={!partnerId || !newMessage.trim()} // Disable if no partner or empty message
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ConversationView; 