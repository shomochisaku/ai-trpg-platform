import React, { useEffect, useRef, useState } from 'react';
import { ChatLogProps } from '../types/message';
import Message from './Message';

const ChatLog: React.FC<ChatLogProps> = ({ 
  messages, 
  currentUserId, 
  autoScroll = true, 
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      setIsUserScrolling(!isAtBottom);
      setShowScrollButton(!isAtBottom && messages.length > 0);
    }
  };

  useEffect(() => {
    if (autoScroll && !isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, autoScroll, isUserScrolling]);

  useEffect(() => {
    // Reset scroll behavior when new messages arrive
    const timer = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const containerStyles: React.CSSProperties = {
    height: '400px',
    maxHeight: '70vh',
    overflow: 'auto',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const scrollButtonStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease',
    zIndex: 10,
  };

  const emptyStateStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center',
  };

  return (
    <div className={className}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: 'bold',
          color: '#374151'
        }}>
          Chat Log
        </h3>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{messages.length} messages</span>
          {autoScroll && (
            <span style={{ 
              backgroundColor: '#10b981', 
              color: 'white', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '10px'
            }}>
              AUTO-SCROLL
            </span>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        style={containerStyles}
        onScroll={handleScroll}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div style={emptyStateStyles}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
              💬
            </div>
            <div style={{ marginBottom: '8px' }}>
              No messages yet
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Start your TRPG adventure!
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message
                key={message.id || index}
                message={message}
                currentUserId={currentUserId}
                className="chat-message"
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            style={scrollButtonStyles}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            ↓
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        borderRadius: '0 0 8px 8px',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center',
      }}>
        {messages.length > 0 && (
          <div>
            Last message: {new Date(messages[messages.length - 1].timestamp).toLocaleString()}
          </div>
        )}
      </div>

      <style>
        {`
          .chat-message {
            scroll-margin-bottom: 20px;
          }
          
          /* Custom scrollbar */
          .chat-container::-webkit-scrollbar {
            width: 8px;
          }
          
          .chat-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          .chat-container::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          .chat-container::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          /* Responsive design */
          @media (max-width: 768px) {
            .chat-container {
              height: 300px;
              padding: 12px;
            }
            
            .chat-message {
              font-size: 13px;
            }
          }
          
          @media (max-width: 480px) {
            .chat-container {
              height: 250px;
              padding: 8px;
            }
            
            .chat-message {
              font-size: 12px;
            }
            
            .chat-message .message-content {
              max-width: 90%;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ChatLog;