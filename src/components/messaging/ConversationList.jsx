import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';

// Placeholder: This component will receive a list of conversations and a handler
// to select a conversation.
const ConversationList = ({ conversations, onSelectConversation, selectedConversationId }) => {
  if (!conversations || conversations.length === 0) {
    return <p>No conversations yet.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {conversations.map(convo => {
        if (convo.is_admin_report) {
          const isSelected = convo.partner._id === selectedConversationId;
          return (
            <li
              key={convo.partner._id}
              onClick={() => onSelectConversation(convo.partner._id)}
              style={{
                padding: '10px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#fff0f1' : '#fff9fa',
                borderLeft: '4px solid #dc3545'
              }}
            >
              <div>
                <strong style={{ display: 'flex', alignItems: 'center' }}>
                  <FaShieldAlt style={{ marginRight: '8px', color: '#dc3545', flexShrink: 0 }} />
                  {convo.partner.name}
                </strong>
                {convo.unreadCount > 0 && (
                  <span style={{ marginLeft: '10px', background: '#dc3545', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.8em' }}>
                    {convo.unreadCount}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.9em', color: '#333', margin: '5px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {convo.lastMessage ? convo.lastMessage.content : 'No new reports'}
              </p>
              <small style={{ fontSize: '0.8em', color: '#777' }}>
                {convo.lastMessage ? new Date(convo.lastMessage.createdAt).toLocaleString() : ''}
              </small>
            </li>
          );
        }

        const isSelected = convo.partner._id === selectedConversationId;
        return (
          <li
            key={convo.partner._id}
            onClick={() => onSelectConversation(convo.partner._id)} // Or convo._id if your structure is different
            style={{
              padding: '10px',
              borderBottom: '1px solid #eee',
              cursor: 'pointer',
              backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
              fontWeight: isSelected ? 'bold' : 'normal',
              listStyle: 'none'
            }}
          >
            <div>
              <strong>{convo.partner.name}</strong>
              {convo.unreadCount > 0 && (
                <span style={{ marginLeft: '10px', background: 'red', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.8em' }}>
                  {convo.unreadCount}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.9em', color: isSelected ? '#333' : '#555', margin: '5px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {convo.lastMessage ? convo.lastMessage.content : 'No messages yet'}
            </p>
            <small style={{ fontSize: '0.8em', color: isSelected ? '#555' : '#777' }}>
              {convo.lastMessage ? new Date(convo.lastMessage.createdAt).toLocaleString() : ''}
            </small>
          </li>
        );
      })}
    </ul>
  );
};

export default ConversationList; 