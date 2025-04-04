import React from 'react';
import './LoadingMessage.scss';

interface LoadingMessageProps {
  message?: string;
  isVisible: boolean;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ 
  message = 'Loading...', 
  isVisible 
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="loading-message-overlay">
      <div className="loading-spinner"></div>
      <div className="loading-text">{message}</div>
    </div>
  );
};

export default LoadingMessage; 